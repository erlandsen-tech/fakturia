import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClientSchema } from '@/lib/validations/invoice';

async function authenticateApiKey(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const apiKey = authHeader.slice(7);
  if (!apiKey.startsWith('fk_')) return null;

  const crypto = await import('crypto');
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const keyPrefix = apiKey.slice(0, 8);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('api_keys')
    .select('user_id, is_active')
    .eq('key_hash', keyHash)
    .eq('key_prefix', keyPrefix)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data.user_id;
}

/**
 * GET /api/v1/clients — List clients
 */
export async function GET(request: NextRequest) {
  const userId = await authenticateApiKey(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, email, phone, org_number, address, city, postal_code')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('name');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * POST /api/v1/clients — Create client
 */
export async function POST(request: NextRequest) {
  const userId = await authenticateApiKey(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = createClientSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
      ...result.data,
    })
    .select('id, name, email, org_number')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
