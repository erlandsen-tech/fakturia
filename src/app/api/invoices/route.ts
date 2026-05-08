import { NextRequest, NextResponse } from 'next/server';
import { fetchUserData, getAuthenticatedUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { webCreateInvoiceSchema } from '@/lib/validations/invoice';
import type { InvoiceWithDetails } from '@/types/database';

/**
 * GET /api/invoices - List the authed user's invoices
 */
export async function GET() {
  try {
    const invoices = await fetchUserData<InvoiceWithDetails>(
      'invoices',
      `
        *,
        client:clients(*),
        items:invoice_items(*)
      `,
      { deleted_at: null }
    );

    return NextResponse.json({ data: invoices, count: invoices.length });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

/**
 * POST /api/invoices - Create a draft invoice. No point deducted here;
 * deduction happens on PATCH action=send.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const result = webCreateInvoiceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      }, { status: 400 });
    }
    const data = result.data;
    const supabase = await createClient();

    // Verify client belongs to this user (RLS would enforce, but explicit 404 is friendlier)
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', data.client_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const subtotalAmount = data.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const vatAmount = data.items.reduce((s, i) => s + i.quantity * i.unit_price * i.vat_rate / 100, 0);
    const totalAmount = subtotalAmount + vatAmount;

    const { data: invoiceNumber, error: numErr } = await supabase.rpc('next_invoice_number', { p_user_id: user.id });
    if (numErr || !invoiceNumber) {
      return NextResponse.json({ error: 'Failed to allocate invoice number' }, { status: 500 });
    }

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        client_id: data.client_id,
        invoice_number: invoiceNumber,
        status: 'draft',
        issue_date: data.issue_date,
        due_date: data.due_date,
        notes: data.notes ?? null,
        delivery_time: data.delivery_time ?? null,
        delivery_place: data.delivery_place ?? null,
        vat_rate: data.vat_rate,
        subtotal_amount: subtotalAmount,
        vat_amount: vatAmount,
        total_amount: totalAmount,
      })
      .select('id, invoice_number, status, issue_date, due_date, subtotal_amount, vat_amount, total_amount')
      .single();

    if (invErr || !invoice) {
      console.error('Invoice insert failed:', invErr);
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    const itemsPayload = data.items.map((i) => ({
      invoice_id: invoice.id,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
      amount: i.quantity * i.unit_price,
      vat_rate: i.vat_rate,
      vat_amount: i.quantity * i.unit_price * i.vat_rate / 100,
    }));

    const { error: itemsErr } = await supabase.from('invoice_items').insert(itemsPayload);
    if (itemsErr) {
      // Roll back the invoice so we don't leave orphans
      await supabase.from('invoices').delete().eq('id', invoice.id);
      return NextResponse.json({ error: 'Failed to create invoice items' }, { status: 500 });
    }

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
