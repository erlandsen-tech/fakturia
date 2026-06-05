import { NextRequest, NextResponse } from 'next/server';
import { fetchUserRecord, updateUserRecord, getAuthenticatedUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { updateInvoiceSchema } from '@/lib/validations/invoice';
import { renderLegacyInvoicePdf } from '@/lib/pdf';
import { sendInvoiceEmail } from '@/lib/email';
import { buildEhfInvoice, EhfValidationError } from '@/lib/ehf';
import type { InvoiceWithDetails } from '@/types/database';

// Point mutations (deduct/refund) run via the service role: the underlying
// add_invoice_points/deduct_invoice_point RPCs are revoked from anon +
// authenticated (migration 20260601120000), so they must not be called through
// the user-context client. Ownership is already verified above via the user
// client + RLS, and user.id is taken from the authenticated session.
function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/invoices/[id] - Fetch specific invoice with ownership verification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await fetchUserRecord<InvoiceWithDetails>(
      'invoices',
      params.id,
      `
        *,
        client:clients(*),
        items:invoice_items(*)
      `
    );

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found or access denied' }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ data: invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch invoice' }, 
      { status: 500 }
    );
  }
}

/**
 * PUT /api/invoices/[id] - Update invoice with ownership verification
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const result = updateInvoiceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    if (Object.keys(result.data).length === 0) {
      return NextResponse.json({ message: 'No valid fields to update', data: { id: params.id } });
    }

    await updateUserRecord('invoices', params.id, result.data);

    return NextResponse.json({
      message: 'Invoice updated successfully',
      data: { id: params.id, ...result.data },
    });
  } catch (error) {
    console.error('Error updating invoice:', error);

    if (error instanceof Error) {
      if (error.message.includes('redirect')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}

/**
 * PATCH /api/invoices/[id] - Send invoice (update status to 'sent' and deduct 1 point)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action !== 'send') {
      return NextResponse.json(
        { error: 'Invalid action. Only "send" is supported.' }, 
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser();

    // Fetch invoice with ownership check (RLS-backed)
    const invoice = await fetchUserRecord<{ status: string; user_id: string }>(
      'invoices',
      params.id,
      'status, user_id'
    );

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found or access denied' }, { status: 404 });
    }

    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot send a paid or cancelled invoice' }, { status: 400 });
    }

    const supabase = await createClient();

    // Idempotency fast-path: an already-sent invoice must not deduct a second
    // point or re-email on a double-click or client retry.
    if (invoice.status === 'sent') {
      return NextResponse.json({
        message: 'Invoice already sent',
        data: { id: params.id, status: 'sent', alreadySent: true },
      });
    }

    // Atomic claim: flip status to 'sent' only if it is not already 'sent'. This
    // UPDATE is the concurrency gate — two simultaneous sends race on it and
    // exactly one claims the row, so the point is deducted at most once. We
    // revert to the original status below if the send cannot complete.
    const { data: claimed } = await supabase
      .from('invoices')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .neq('status', 'sent')
      .select('id')
      .maybeSingle();

    if (!claimed) {
      // Lost the race — another concurrent request already claimed and sent it.
      return NextResponse.json({
        message: 'Invoice already sent',
        data: { id: params.id, status: 'sent', alreadySent: true },
      });
    }

    // Restore the pre-send status if a downstream step fails.
    const revertClaim = async () => {
      await supabase
        .from('invoices')
        .update({ status: invoice.status })
        .eq('id', params.id)
        .eq('user_id', user.id);
    };

    // Unlimited sends only exist for paid subscription tiers, and subscriptions
    // are not a live product. Unless ENABLE_SUBSCRIPTIONS is explicitly on, every
    // send deducts a point — even if a profile row was tampered to
    // active/growth, it cannot mint free sends.
    let isUnlimited = false;
    if (process.env.ENABLE_SUBSCRIPTIONS === 'true') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status')
        .eq('id', user.id)
        .maybeSingle();

      isUnlimited =
        profile?.subscription_status === 'active' &&
        (profile?.subscription_tier === 'growth' || profile?.subscription_tier === 'enterprise');
    }

    if (!isUnlimited) {
      // Atomic deduct via RPC: returns null/undefined if no points to deduct.
      // Routed through the service role (RPC is revoked from authenticated).
      const { data: remaining, error: rpcError } = await getSupabaseAdmin().rpc('deduct_invoice_point', {
        p_user_id: user.id,
      });

      if (rpcError) {
        console.error('Error deducting points:', rpcError);
        await revertClaim();
        return NextResponse.json({ error: 'Failed to deduct invoice points' }, { status: 500 });
      }

      if (remaining === null || remaining === undefined) {
        await revertClaim();
        return NextResponse.json({
          error: 'Insufficient invoice points. Purchase more or upgrade your plan.',
        }, { status: 402 });
      }
    }

    // Render PDF and email it. If anything here fails, refund the point.
    let emailDelivery: { delivered: boolean; reason?: string } = { delivered: false, reason: 'not_attempted' };
    try {
      // Fetch full invoice + items + client + company info for PDF
      const fullInvoice = await fetchUserRecord<any>(
        'invoices',
        params.id,
        '*, client:clients(*), items:invoice_items(*)'
      );

      const { data: company } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const clientEmail: string | null | undefined = fullInvoice?.client?.email;

      if (process.env.RESEND_API_KEY && clientEmail) {
        const pdfBuffer = await renderLegacyInvoicePdf({
          company: {
            name: company?.company_name || 'Mitt firma',
            address: [company?.address_line1, company?.address_line2, company?.postal_code, company?.city, company?.country].filter(Boolean).join(', '),
            orgNumber: company?.organization_number || '',
            email: company?.email || '',
            phone: company?.phone || undefined,
            website: company?.website || undefined,
            bankAccount: company?.bank_account || undefined,
            vatRegistered: company?.vat_registered ?? false,
            vatNumber: company?.vat_number || undefined,
          },
          client: {
            name: fullInvoice.client.name || '',
            address: [fullInvoice.client.address_line1, fullInvoice.client.address_line2].filter(Boolean).join(', '),
            postalCode: fullInvoice.client.postal_code || '',
            city: fullInvoice.client.city || '',
            country: fullInvoice.client.country || 'NO',
          },
          invoice: {
            number: fullInvoice.invoice_number || params.id.slice(0, 8),
            date: fullInvoice.issue_date,
            dueDate: fullInvoice.due_date || undefined,
            items: (fullInvoice.items || []).map((it: any, idx: number) => ({
              number: String(idx + 1),
              description: it.description,
              quantity: Number(it.quantity),
              unit: 'stk',
              unitPrice: Number(it.unit_price),
              amount: Number(it.amount),
              vat: Number(it.vat_rate),
            })),
            notes: fullInvoice.notes || undefined,
            subtotal: Number(fullInvoice.subtotal_amount || 0),
            vat: Number(fullInvoice.vat_amount || 0),
            total: Number(fullInvoice.total_amount || 0),
            currency: 'NOK',
            paymentTerms: fullInvoice.due_date
              ? `Betal til kontoen ovenfor med fakturanummer som merknad. Forfallsdato: ${new Date(fullInvoice.due_date).toLocaleDateString('nb-NO')}.`
              : 'Betal til kontoen ovenfor med fakturanummer som merknad.',
          },
        });

        // Best-effort EHF XML attachment. Skipped silently if buyer/seller
        // metadata is incomplete — the PDF still gets sent.
        let ehfXml: string | null = null;
        try {
          ehfXml = buildEhfInvoice({
            invoice: {
              invoice_number: fullInvoice.invoice_number,
              issue_date: fullInvoice.issue_date,
              due_date: fullInvoice.due_date,
              currency: fullInvoice.currency || 'NOK',
              buyer_reference: fullInvoice.buyer_reference,
              payment_reference: fullInvoice.payment_reference,
              notes: fullInvoice.notes,
              lines: (fullInvoice.items || []).map((it: any) => ({
                description: it.description,
                quantity: Number(it.quantity),
                unit_price: Number(it.unit_price),
                vat_rate: Number(it.vat_rate ?? fullInvoice.vat_rate ?? 25),
                unit_code: it.unit_code || 'C62',
              })),
            },
            company: {
              name: company?.company_name,
              org_number: company?.organization_number,
              vat_number: company?.vat_number,
              vat_registered: company?.vat_registered ?? false,
              tax_exemption_reason: company?.tax_exemption_reason ?? null,
              address_line1: company?.address_line1,
              address_line2: company?.address_line2,
              postal_code: company?.postal_code,
              city: company?.city,
              country: company?.country,
              email: company?.email,
              phone: company?.phone,
              bank_account: company?.bank_account,
            },
            client: {
              name: fullInvoice.client.name,
              company: fullInvoice.client.company,
              org_number: fullInvoice.client.org_number,
              vat_number: fullInvoice.client.vat_number,
              address_line1: fullInvoice.client.address_line1,
              address_line2: fullInvoice.client.address_line2,
              postal_code: fullInvoice.client.postal_code,
              city: fullInvoice.client.city,
              country: fullInvoice.client.country,
              email: fullInvoice.client.email,
              phone: fullInvoice.client.phone,
              peppol_endpoint: fullInvoice.client.peppol_endpoint,
            },
          });
        } catch (ehfErr) {
          if (!(ehfErr instanceof EhfValidationError)) {
            console.error('Unexpected EHF generation failure:', ehfErr);
          }
          ehfXml = null;
        }

        await sendInvoiceEmail({
          to: clientEmail,
          invoiceNumber: fullInvoice.invoice_number || params.id.slice(0, 8),
          companyName: company?.company_name || 'Mitt firma',
          totalLabel: `${Number(fullInvoice.total_amount || 0).toFixed(2)} NOK`,
          pdfBuffer,
          ehfXml,
        });
        emailDelivery = { delivered: true };
      } else {
        emailDelivery = {
          delivered: false,
          reason: !process.env.RESEND_API_KEY ? 'email_not_configured' : 'client_has_no_email',
        };
      }

      // Status was already flipped to 'sent' by the atomic claim above; nothing
      // more to do on success.
    } catch (err) {
      // A thrown Resend error (email.ts now throws on {error}) lands here. The
      // invoice was optimistically claimed as 'sent'; revert it and refund the
      // point so the user can retry cleanly.
      console.error('Send pipeline failed, reverting and refunding point:', err);
      await revertClaim();
      if (!isUnlimited) {
        // Refund via service role (RPC is revoked from authenticated).
        await getSupabaseAdmin().rpc('add_invoice_points', { p_user_id: user.id, p_points: 1 });
      }
      return NextResponse.json({
        error: 'Failed to send invoice. Your point has been refunded.',
        detail: err instanceof Error ? err.message : String(err),
      }, { status: 500 });
    }

    const { data: refreshedProfile } = await supabase
      .from('profiles')
      .select('invoice_points')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({
      message: 'Invoice sent successfully',
      data: {
        id: params.id,
        status: 'sent',
        remaining_points: refreshedProfile?.invoice_points ?? null,
        unlimited: isUnlimited,
        email: emailDelivery,
      },
    });
  } catch (error) {
    console.error('Error sending invoice:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('redirect')) {
        return NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        );
      }
      
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Access denied' }, 
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to send invoice' }, 
      { status: 500 }
    );
  }
}

// bokføringsloven §13: only un-issued drafts may be removed, and even then we
// soft-delete (set deleted_at via the soft_delete_invoice RPC) rather than
// physically DELETE. Issued invoices must be retained 5 years and keep their
// place in the gap-free invoice_number series.
const RETENTION_MESSAGE =
  'Bare kladd-fakturaer kan slettes. Utstedte fakturaer må beholdes i 5 år (bokføringsloven §13).';

/**
 * DELETE /api/invoices/[id] - Soft-delete a draft invoice (ownership + §13 guard)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Friendly 404 if the invoice does not exist or is not owned by the caller.
    const invoice = await fetchUserRecord<{ status: string }>(
      'invoices',
      params.id,
      'status'
    );
    if (!invoice) {
      return NextResponse.json({ error: 'Faktura ikke funnet' }, { status: 404 });
    }

    if (invoice.status !== 'draft') {
      return NextResponse.json({ error: RETENTION_MESSAGE }, { status: 409 });
    }

    const { data, error } = await supabase.rpc('soft_delete_invoice', {
      p_invoice_id: params.id,
    });

    if (error) {
      console.error('Error soft-deleting invoice:', error);
      return NextResponse.json(
        { error: 'Failed to delete invoice' },
        { status: 500 }
      );
    }

    if (data?.ok === false) {
      if (data.error === 'not_draft') {
        return NextResponse.json({ error: RETENTION_MESSAGE }, { status: 409 });
      }
      if (data.error === 'not_found') {
        return NextResponse.json({ error: 'Faktura ikke funnet' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Faktura slettet' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('redirect')) {
        return NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        );
      }
      
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Access denied' }, 
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete invoice' }, 
      { status: 500 }
    );
  }
} 