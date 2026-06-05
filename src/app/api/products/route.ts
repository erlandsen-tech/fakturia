import { NextRequest, NextResponse } from 'next/server';
import { fetchUserData, getAuthenticatedUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { createProductSchema } from '@/lib/validations/invoice';

/**
 * GET /api/products — List the authed user's products
 */
export async function GET() {
  try {
    const products = await fetchUserData('products', '*', { deleted_at: null });
    return NextResponse.json({ data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

/**
 * POST /api/products — Create a product
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const result = createProductSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .insert({ user_id: user.id, ...result.data })
      .select('*')
      .single();

    if (error) {
      console.error('Product insert failed:', error);
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
