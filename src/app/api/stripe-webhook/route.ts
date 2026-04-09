import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const supabaseAdmin = getSupabaseAdmin();
  const sig = request.headers.get('stripe-signature') as string;
  let event: Stripe.Event;

  try {
    const body = await request.text();
    const buf = Buffer.from(body, 'utf8');
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  // Handle checkout.session.completed (one-time packs + subscriptions)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;

    if (!userId) {
      console.error('No user_id found in session metadata');
      return NextResponse.json({ received: true, error: 'No user_id in metadata' });
    }

    const checkoutType = session.metadata?.type;

    try {
      if (checkoutType === 'pack') {
        // Bundle pack purchase — add invoice points
        const invoicesToAdd = parseInt(session.metadata?.invoices || '0', 10);
        if (invoicesToAdd === 0) {
          console.error('Invalid invoices count in pack metadata');
          return NextResponse.json({ received: true, error: 'Invalid pack metadata' });
        }

        // Use atomic RPC to add points (avoids race conditions)
        const { data, error } = await supabaseAdmin.rpc('add_invoice_points', {
          p_user_id: userId,
          p_points: invoicesToAdd,
        });

        if (error) {
          // Profile might not exist yet — create it
          if (error.code === 'PGRST116' || error.message?.includes('not found')) {
            const { error: insertError } = await supabaseAdmin
              .from('profiles')
              .insert({ id: userId, invoice_points: invoicesToAdd });
            if (insertError) {
              console.error('Error creating profile:', insertError);
              return NextResponse.json({ received: true, error: 'Failed to create profile' });
            }
          } else {
            console.error('Error adding points:', error);
            return NextResponse.json({ received: true, error: 'Failed to add points' });
          }
        }

        console.log(`Added ${invoicesToAdd} invoice points for user ${userId} (pack: ${session.metadata?.pack})`);

      } else if (checkoutType === 'subscription') {
        // Subscription activation — set tier
        const tier = session.metadata?.tier || 'starter';
        const { error } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userId,
            subscription_tier: tier,
            subscription_status: 'active',
            subscription_stripe_id: session.subscription as string,
          }, { onConflict: 'id' });

        if (error) {
          console.error('Error updating subscription:', error);
          return NextResponse.json({ received: true, error: 'Failed to update subscription' });
        }

        console.log(`Activated ${tier} subscription for user ${userId}`);
      }
    } catch (error) {
      console.error('Unexpected error processing webhook:', error);
      return NextResponse.json({ received: true, error: 'Unexpected error' });
    }
  }

  // Handle subscription cancellation/deletion
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.user_id;

    if (userId) {
      await supabaseAdmin
        .from('profiles')
        .update({ subscription_status: 'cancelled' })
        .eq('subscription_stripe_id', subscription.id);
      console.log(`Cancelled subscription for user ${userId}`);
    }
  }

  return NextResponse.json({ received: true });
}