import { NextResponse } from 'next/server';
import { fetchUserRecord, getAuthenticatedUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/invoices/[id]/clone - Duplicate an invoice as a new draft.
 * Copies client, line items, notes, delivery info, vat_rate. Allocates a new
 * invoice number, sets status='draft', issue_date=today, due_date keeps the
 * original day-offset from issue→due.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();

    const original = await fetchUserRecord<any>(
      'invoices',
      params.id,
      '*, items:invoice_items(*)'
    );
    if (!original) {
      return NextResponse.json({ error: 'Invoice not found or access denied' }, { status: 404 });
    }

    const supabase = await createClient();

    const { data: invoiceNumber, error: numErr } = await supabase.rpc('next_invoice_number', { p_user_id: user.id });
    if (numErr || !invoiceNumber) {
      return NextResponse.json({ error: 'Failed to allocate invoice number' }, { status: 500 });
    }

    const today = new Date();
    const origIssue = new Date(original.issue_date);
    const origDue = new Date(original.due_date);
    const dueOffsetMs = origDue.getTime() - origIssue.getTime();
    const newDue = new Date(today.getTime() + (Number.isFinite(dueOffsetMs) && dueOffsetMs > 0 ? dueOffsetMs : 30 * 24 * 60 * 60 * 1000));

    const { data: newInvoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        client_id: original.client_id,
        invoice_number: invoiceNumber,
        status: 'draft',
        issue_date: today.toISOString(),
        due_date: newDue.toISOString(),
        notes: original.notes ?? null,
        delivery_time: original.delivery_time ?? null,
        delivery_place: original.delivery_place ?? null,
        vat_rate: original.vat_rate,
        subtotal_amount: original.subtotal_amount,
        vat_amount: original.vat_amount,
        total_amount: original.total_amount,
      })
      .select('id, invoice_number')
      .single();

    if (invErr || !newInvoice) {
      console.error('Clone insert failed:', invErr);
      return NextResponse.json({ error: 'Failed to clone invoice' }, { status: 500 });
    }

    const itemsPayload = (original.items || []).map((it: any) => ({
      invoice_id: newInvoice.id,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      amount: it.amount,
      vat_rate: it.vat_rate,
      vat_amount: it.vat_amount,
    }));

    if (itemsPayload.length > 0) {
      const { error: itemsErr } = await supabase.from('invoice_items').insert(itemsPayload);
      if (itemsErr) {
        await supabase.from('invoices').delete().eq('id', newInvoice.id);
        return NextResponse.json({ error: 'Failed to clone invoice items' }, { status: 500 });
      }
    }

    return NextResponse.json({ data: newInvoice }, { status: 201 });
  } catch (error) {
    console.error('Error cloning invoice:', error);
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to clone invoice' }, { status: 500 });
  }
}
