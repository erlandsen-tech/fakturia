import { NextRequest, NextResponse } from 'next/server';
import { fetchUserRecord, updateUserRecord, deleteUserRecord } from '@/lib/auth';
import { createProductSchema } from '@/lib/validations/invoice';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await fetchUserRecord('products', params.id, '*');
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: product });
  } catch (error) {
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const result = createProductSchema.partial().safeParse(body);
    if (!result.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    await updateUserRecord('products', params.id, result.data);
    return NextResponse.json({ message: 'Product updated', data: { id: params.id, ...result.data } });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('redirect')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      if (error.message.includes('Unauthorized')) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteUserRecord('products', params.id);
    return NextResponse.json({ message: 'Product deleted' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('redirect')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      if (error.message.includes('Unauthorized')) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
