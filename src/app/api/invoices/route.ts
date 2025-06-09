import { NextRequest, NextResponse } from 'next/server';
import { fetchUserData } from '@/lib/auth';
import type { InvoiceWithDetails } from '@/types/database';

/**
 * GET /api/invoices - Fetch user's invoices with proper authorization
 */
export async function GET() {
  try {
    const invoices = await fetchUserData<InvoiceWithDetails>(
      'invoices',
      `
        *,
        client:clients(*),
        items:invoice_items(*)
      `
    );

    return NextResponse.json({ 
      data: invoices,
      count: invoices.length 
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch invoices' }, 
      { status: 500 }
    );
  }
} 