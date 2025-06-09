import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

// Create Supabase client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature') as string;
  let event: Stripe.Event;

  try {
    // Get the raw body as text first, then convert to buffer
    const body = await request.text();
    const buf = Buffer.from(body, 'utf8');
    
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    
    if (!userId) {
      console.error('No user_id found in session metadata');
      return NextResponse.json({ received: true, error: 'No user_id in metadata' });
    }

    try {
      // First, check if the user profile exists using admin client
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('invoice_points')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user profile:', fetchError);
        return NextResponse.json({ 
          received: true, 
          error: 'Database error while fetching profile' 
        });
      }

      if (!profile) {
        // User profile doesn't exist, create it with 1 invoice point
        console.log(`Creating new profile for user ${userId} with 1 invoice point`);
        const { error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert({ 
            id: userId, 
            invoice_points: 1 
          });

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          return NextResponse.json({ 
            received: true, 
            error: 'Database error while creating profile' 
          });
        }

        console.log(`Profile created for user ${userId} with 1 invoice point`);
      } else {
        // User profile exists, increment points
        const currentPoints: number = profile.invoice_points || 0;
        const newPoints = currentPoints + 1;
        
        console.log(`Current points for user ${userId}: ${currentPoints}`);
        
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ invoice_points: newPoints })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating points:', updateError);
          return NextResponse.json({ 
            received: true, 
            error: 'Database error while updating points' 
          });
        }

        console.log(`Points updated for user ${userId}. New total: ${newPoints}`);
      }
    } catch (error) {
      console.error('Unexpected error processing webhook:', error);
      return NextResponse.json({ 
        received: true, 
        error: 'Unexpected error processing payment' 
      });
    }
  }

  return NextResponse.json({ received: true });
}