import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';
import { z } from 'zod';

const createKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { user, supabase } : null;
}

/**
 * GET /api/api-keys — List user's API keys (no key material returned)
 */
export async function GET() {
  const ctx = await requireUser();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await ctx.supabase
    .from('api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, expires_at, is_active')
    .eq('user_id', ctx.user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 });
  return NextResponse.json({ data });
}

/**
 * POST /api/api-keys — Create a new API key. Returns full key once.
 * Open to any authenticated user — usage is metered via invoice points.
 */
export async function POST(request: NextRequest) {
  const ctx = await requireUser();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = createKeySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 400 });
  }

  // Generate key: fk_live_<32 hex chars>
  const keySecret = crypto.randomBytes(24).toString('hex');
  const apiKey = `fk_live_${keySecret}`;
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const keyPrefix = apiKey.slice(0, 8); // "fk_live_"

  const { data, error } = await ctx.supabase
    .from('api_keys')
    .insert({
      user_id: ctx.user.id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: result.data.name || null,
    })
    .select('id, name, key_prefix, created_at, is_active')
    .single();

  if (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }

  // Return the plaintext key ONCE — caller must store it.
  return NextResponse.json({ data: { ...data, key: apiKey } }, { status: 201 });
}
