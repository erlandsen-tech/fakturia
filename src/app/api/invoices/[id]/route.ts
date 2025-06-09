import { NextRequest, NextResponse } from 'next/server';
import { fetchUserRecord, updateUserRecord, deleteUserRecord } from '@/lib/auth';
import type { InvoiceWithDetails } from '@/types/database';

/**
 * GET /api/invoices/[id] - Fetch specific invoice with ownership verification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await fetchUserRecord<InvoiceWithDetails>(
      'invoices',
      params.id,
      `
        *,
        client:clients(*),
        items:invoice_items(*)
      `
    );

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found or access denied' }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ data: invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch invoice' }, 
      { status: 500 }
    );
  }
}

/**
 * PUT /api/invoices/[id] - Update invoice with ownership verification
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Remove any fields that shouldn't be updated by users
    const allowedFields = [
      'issue_date',
      'due_date', 
      'status',
      'notes',
      'delivery_time',
      'delivery_place',
      'vat_rate'
    ];
    
    const updates = Object.keys(body)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {} as Record<string, any>);

    await updateUserRecord('invoices', params.id, updates);

    return NextResponse.json({ 
      message: 'Invoice updated successfully',
      data: { id: params.id, ...updates }
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('redirect')) {
        return NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        );
      }
      
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Access denied' }, 
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update invoice' }, 
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invoices/[id] - Delete invoice with ownership verification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteUserRecord('invoices', params.id);

    return NextResponse.json({ 
      message: 'Invoice deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('redirect')) {
        return NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        );
      }
      
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Access denied' }, 
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete invoice' }, 
      { status: 500 }
    );
  }
} 