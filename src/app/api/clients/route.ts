import { NextRequest, NextResponse } from 'next/server';
import { fetchUserData, getAuthenticatedUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { createClientSchema } from '@/lib/validations/invoice';

/**
 * GET /api/clients - List the authed user's clients
 */
export async function GET() {
  try {
    const clients = await fetchUserData('clients', '*', { deleted_at: null });
    return NextResponse.json({ data: clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

/**
 * POST /api/clients - Create a client
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

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
      .insert({ user_id: user.id, ...result.data })
      .select('*')
      .single();

    if (error) {
      console.error('Client insert failed:', error);
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
