import { NextRequest, NextResponse } from 'next/server';
import { fetchUserRecord, getAuthenticatedUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { buildEhfInvoice, EhfValidationError } from '@/lib/ehf';

/**
 * GET /api/invoices/[id]/ehf
 *
 * Returns an EHF 3.0 / PEPPOL BIS Billing 3.0 Invoice XML for the given
 * invoice. The response is served as an attachment so the browser downloads
 * it. Filename convention: `EHF_<invoice_number>.xml`.
 *
 * If mandatory EHF fields are missing on the invoice, client, or company
 * settings, returns 422 with a list of missing keys so the UI can guide the
 * user to fill them in.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();

    const invoice = await fetchUserRecord<any>(
      'invoices',
      params.id,
      '*, client:clients(*), items:invoice_items(*)'
    );
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found or access denied' }, { status: 404 });
    }

    const supabase = await createClient();
    const { data: company } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!company) {
      return NextResponse.json({
        error: 'Company settings missing',
        missing: ['company_settings'],
      }, { status: 422 });
    }

    const xml = buildEhfInvoice({
      invoice: {
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        currency: invoice.currency || 'NOK',
        buyer_reference: invoice.buyer_reference,
        payment_reference: invoice.payment_reference,
        notes: invoice.notes,
        lines: (invoice.items || []).map((it: any) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          vat_rate: Number(it.vat_rate ?? invoice.vat_rate ?? 25),
          unit_code: it.unit_code || 'C62',
        })),
      },
      company: {
        name: company.company_name,
        org_number: company.organization_number,
        vat_number: company.vat_number,
        vat_registered: company.vat_registered ?? false,
        tax_exemption_reason: company.tax_exemption_reason ?? null,
        address_line1: company.address_line1,
        address_line2: company.address_line2,
        postal_code: company.postal_code,
        city: company.city,
        country: company.country,
        email: company.email,
        phone: company.phone,
        bank_account: company.bank_account,
      },
      client: {
        name: invoice.client.name,
        company: invoice.client.company,
        org_number: invoice.client.org_number,
        vat_number: invoice.client.vat_number,
        address_line1: invoice.client.address_line1,
        address_line2: invoice.client.address_line2,
        postal_code: invoice.client.postal_code,
        city: invoice.client.city,
        country: invoice.client.country,
        email: invoice.client.email,
        phone: invoice.client.phone,
        peppol_endpoint: invoice.client.peppol_endpoint,
      },
    });

    const filename = `EHF_${(invoice.invoice_number || params.id.slice(0, 8)).replace(/[^A-Za-z0-9_-]/g, '_')}.xml`;
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof EhfValidationError) {
      return NextResponse.json({
        error: 'EHF invoice requires fields that are not yet filled in.',
        missing: error.missing,
      }, { status: 422 });
    }
    console.error('Error generating EHF invoice:', error);
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to generate EHF invoice' }, { status: 500 });
  }
}
