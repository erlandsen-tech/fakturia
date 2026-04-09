import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createInvoiceSchema } from '@/lib/validations/invoice';
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

    // Calculate totals
    const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalVat = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price * item.vat_rate / 100), 0);

    const issueDate = data.issue_date || new Date().toISOString();
    const dueDate = new Date(new Date(issueDate).getTime() + data.due_days * 86400000).toISOString();

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        client_id: clientId,
        status: data.send ? 'sent' : 'draft',
        issue_date: issueDate,
        due_date: dueDate,
        notes: data.notes || null,
        total_amount: totalAmount,
        total_vat: totalVat,
      })
      .select('id, invoice_number, status, issue_date, due_date, total_amount, total_vat')
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
      total: item.quantity * item.unit_price,
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(items);

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to create invoice items' }, { status: 500 });
    }

    // If send=true, deduct point and trigger email
    if (data.send) {
      const { data: deductResult } = await supabase.rpc('deduct_invoice_point', { p_user_id: userId });
      if (deductResult === null) {
        // Not enough points — revert to draft
        await supabase.from('invoices').update({ status: 'draft' }).eq('id', invoice.id);
        return NextResponse.json({
          error: 'Insufficient invoice points. Purchase more or upgrade your plan.',
          invoice_id: invoice.id,
          status: 'draft',
        }, { status: 402 });
      }
      // TODO: Trigger email delivery via Resend
    }

    return NextResponse.json({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      total_amount: invoice.total_amount,
      total_vat: invoice.total_vat,
      items: items,
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
    .select('id, invoice_number, status, issue_date, due_date, total_amount, total_vat, clients(name)')
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
