import { NextRequest, NextResponse } from 'next/server';
import { fetchUserRecord, updateUserRecord, deleteUserRecord } from '@/lib/auth';
import { createClientSchema } from '@/lib/validations/invoice';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await fetchUserRecord('clients', params.id, '*');
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: client });
  } catch (error) {
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const result = createClientSchema.partial().safeParse(body);
    if (!result.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    await updateUserRecord('clients', params.id, result.data);
    return NextResponse.json({ message: 'Client updated', data: { id: params.id, ...result.data } });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('redirect')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      if (error.message.includes('Unauthorized')) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteUserRecord('clients', params.id);
    return NextResponse.json({ message: 'Client deleted' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('redirect')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      if (error.message.includes('Unauthorized')) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
