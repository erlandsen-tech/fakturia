import { NextRequest, NextResponse } from 'next/server';
import { fetchUserRecord, updateUserRecord, deleteUserRecord } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import type { InvoiceWithDetails } from '@/types/database';

// Create Supabase client with service role key to bypass RLS for profile updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    console.log('PUT /api/invoices/[id] - Starting update for invoice:', params.id);
    
    const body = await request.json();
    console.log('Request body received:', body);
    
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
        let value = body[key];
        
        // Handle special cases for different field types
        if (key === 'delivery_time') {
          // Convert empty string to null for timestamp fields
          if (value === '' || value === undefined) {
            value = null;
          }
        } else if (key === 'notes' || key === 'delivery_place') {
          // Convert empty strings to null for text fields
          if (value === '' || value === undefined) {
            value = null;
          }
        } else if (key === 'vat_rate') {
          // Ensure vat_rate is a number
          value = parseFloat(value) || 0;
        }
        
        obj[key] = value;
        return obj;
      }, {} as Record<string, any>);

    console.log('Filtered updates to apply:', updates);

    if (Object.keys(updates).length === 0) {
      console.log('No valid fields to update');
      return NextResponse.json({ 
        message: 'No valid fields to update',
        data: { id: params.id }
      });
    }

    console.log('Calling updateUserRecord...');
    await updateUserRecord('invoices', params.id, updates);
    console.log('updateUserRecord completed successfully');

    return NextResponse.json({ 
      message: 'Invoice updated successfully',
      data: { id: params.id, ...updates }
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
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
      
      // Handle specific database errors
      if (error.message.includes('invalid input syntax for type timestamp')) {
        return NextResponse.json(
          { error: 'Invalid date/time format provided' }, 
          { status: 400 }
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
 * PATCH /api/invoices/[id] - Send invoice (update status to 'sent' and deduct 1 point)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action !== 'send') {
      return NextResponse.json(
        { error: 'Invalid action. Only "send" is supported.' }, 
        { status: 400 }
      );
    }

    // First, fetch the invoice to check its current status and get user_id
    const invoice = await fetchUserRecord(
      'invoices',
      params.id,
      '*'
    );

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found or access denied' }, 
        { status: 404 }
      );
    }

    // Check if invoice can be sent (only draft invoices can be sent)
    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft invoices can be sent' }, 
        { status: 400 }
      );
    }

    // Check if user has enough invoice points
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('invoice_points')
      .eq('id', invoice.user_id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to check invoice points' }, 
        { status: 500 }
      );
    }

    if (!profile || profile.invoice_points < 1) {
      return NextResponse.json(
        { error: 'Insufficient invoice points. You need at least 1 point to send an invoice.' }, 
        { status: 400 }
      );
    }

    // Start a transaction-like operation
    try {
      // Update invoice status to 'sent'
      await updateUserRecord('invoices', params.id, { 
        status: 'sent'
      });

      // Deduct 1 invoice point from user's profile
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          invoice_points: profile.invoice_points - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.user_id);

      if (updateError) {
        console.error('Error updating invoice points:', updateError);
        
        // Try to revert the invoice status back to draft
        try {
          await updateUserRecord('invoices', params.id, { status: 'draft' });
        } catch (revertError) {
          console.error('Failed to revert invoice status:', revertError);
        }
        
        return NextResponse.json(
          { error: 'Failed to deduct invoice points' }, 
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        message: 'Invoice sent successfully and 1 point deducted',
        data: { 
          id: params.id, 
          status: 'sent',
          remaining_points: profile.invoice_points - 1
        }
      });

    } catch (error) {
      console.error('Error in send invoice transaction:', error);
      return NextResponse.json(
        { error: 'Failed to send invoice' }, 
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error sending invoice:', error);
    
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
      { error: 'Failed to send invoice' }, 
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