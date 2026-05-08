import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createInvoiceSchema } from '@/lib/validations/invoice';
import { renderLegacyInvoicePdf } from '@/lib/pdf';
import { sendInvoiceEmail } from '@/lib/email';
import crypto from 'crypto';

// Rate limiting (simple in-memory, use Redis/Upstash for production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // requests per minute
const RATE_WINDOW = 60_000; // 1 minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

async function authenticateApiKey(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const apiKey = authHeader.slice(7);
  if (!apiKey.startsWith('fk_')) return null;

  // Hash the key to compare against stored hashes
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const keyPrefix = apiKey.slice(0, 8);

  // Look up API key in database
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('api_keys')
    .select('user_id, is_active')
    .eq('key_hash', keyHash)
    .eq('key_prefix', keyPrefix)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', keyHash);

  return data.user_id;
}

/**
 * POST /api/v1/invoices — Create invoice via AI API
 */
export async function POST(request: NextRequest) {
  // Auth
  const userId = await authenticateApiKey(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized. Use Bearer token with valid API key.' }, { status: 401 });
  }

  // Rate limit
  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
  }

  // Validate input
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = createInvoiceSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  const data = result.data;
  const supabase = await createClient();

  try {
    // Create or find client
    let clientId: string;
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .eq('name', data.client_name)
      .maybeSingle();

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: userId,
          name: data.client_name,
          email: data.client_email || null,
          org_number: data.client_org_number || null,
          address: data.client_address || null,
        })
        .select('id')
        .single();

      if (clientError || !newClient) {
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
      }
      clientId = newClient.id;
    }

    // Calculate totals (NOK øre)
    const subtotalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const vatAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price * item.vat_rate / 100), 0);
    const totalAmount = subtotalAmount + vatAmount;

    const issueDate = data.issue_date || new Date().toISOString();
    const dueDate = new Date(new Date(issueDate).getTime() + data.due_days * 86400000).toISOString();

    // Allocate invoice number atomically (per-user sequence)
    const { data: invoiceNumber, error: numberError } = await supabase.rpc('next_invoice_number', { p_user_id: userId });
    if (numberError || !invoiceNumber) {
      return NextResponse.json({ error: 'Failed to allocate invoice number' }, { status: 500 });
    }

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        client_id: clientId,
        invoice_number: invoiceNumber,
        status: data.send ? 'sent' : 'draft',
        issue_date: issueDate,
        due_date: dueDate,
        notes: data.notes || null,
        subtotal_amount: subtotalAmount,
        vat_amount: vatAmount,
        total_amount: totalAmount,
      })
      .select('id, invoice_number, status, issue_date, due_date, subtotal_amount, vat_amount, total_amount')
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    // Create invoice items
    const items = data.items.map(item => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
      vat_amount: item.quantity * item.unit_price * item.vat_rate / 100,
      amount: item.quantity * item.unit_price,
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(items);

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to create invoice items' }, { status: 500 });
    }

    // If send=true, deduct point + render PDF + email
    let emailDelivery: { delivered: boolean; reason?: string } | null = null;
    if (data.send) {
      const { data: deductResult } = await supabase.rpc('deduct_invoice_point', { p_user_id: userId });
      if (deductResult === null || deductResult === undefined) {
        await supabase.from('invoices').update({ status: 'draft' }).eq('id', invoice.id);
        return NextResponse.json({
          error: 'Insufficient invoice points. Purchase more.',
          invoice_id: invoice.id,
          status: 'draft',
        }, { status: 402 });
      }

      try {
        if (process.env.RESEND_API_KEY && data.client_email) {
          const { data: company } = await supabase
            .from('company_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          const pdfBuffer = await renderLegacyInvoicePdf({
            company: {
              name: company?.company_name || 'Mitt firma',
              address: [company?.address_line1, company?.address_line2, company?.postal_code, company?.city, company?.country].filter(Boolean).join(', '),
              orgNumber: company?.organization_number || '',
              email: company?.email || '',
              phone: company?.phone || undefined,
              website: company?.website || undefined,
            },
            client: {
              name: data.client_name,
              address: data.client_address || '',
              postalCode: '',
              city: '',
              country: 'Norge',
            },
            invoice: {
              number: invoice.invoice_number || invoice.id.slice(0, 8),
              date: invoice.issue_date,
              items: items.map((it, idx) => ({
                number: String(idx + 1),
                description: it.description,
                quantity: Number(it.quantity),
                unit: 'stk',
                unitPrice: Number(it.unit_price),
                amount: Number(it.amount),
                vat: Number(it.vat_rate),
              })),
              notes: data.notes,
              subtotal: Number(invoice.subtotal_amount || 0),
              vat: Number(invoice.vat_amount || 0),
              total: Number(invoice.total_amount || 0),
              currency: 'NOK',
              paymentTerms: `Betales innen ${new Date(invoice.due_date).toLocaleDateString('nb-NO')}`,
            },
          });

          await sendInvoiceEmail({
            to: data.client_email,
            invoiceNumber: invoice.invoice_number || invoice.id.slice(0, 8),
            companyName: company?.company_name || 'Mitt firma',
            totalLabel: `${Number(invoice.total_amount || 0).toFixed(2)} NOK`,
            pdfBuffer,
          });
          emailDelivery = { delivered: true };
        } else {
          emailDelivery = {
            delivered: false,
            reason: !process.env.RESEND_API_KEY ? 'email_not_configured' : 'client_has_no_email',
          };
        }
      } catch (emailErr) {
        console.error('Email delivery failed (refunding point):', emailErr);
        await supabase.rpc('add_invoice_points', { p_user_id: userId, p_points: 1 });
        await supabase.from('invoices').update({ status: 'draft' }).eq('id', invoice.id);
        return NextResponse.json({
          error: 'Failed to deliver invoice. Point refunded.',
          invoice_id: invoice.id,
          status: 'draft',
        }, { status: 502 });
      }
    }

    return NextResponse.json({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      subtotal_amount: invoice.subtotal_amount,
      vat_amount: invoice.vat_amount,
      total_amount: invoice.total_amount,
      items: items,
      ...(emailDelivery && { email: emailDelivery }),
    }, { status: 201 });

  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/v1/invoices — List invoices via AI API
 */
export async function GET(request: NextRequest) {
  const userId = await authenticateApiKey(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const status = searchParams.get('status');

  let query = supabase
    .from('invoices')
    .select('id, invoice_number, status, issue_date, due_date, subtotal_amount, vat_amount, total_amount, clients(name)')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
