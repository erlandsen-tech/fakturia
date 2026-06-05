import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Stripe signature verification needs the raw request body and the Node
// runtime — do not switch to request.json() or an edge runtime.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    // Bad/missing signature: Stripe should NOT retry an unsigned request.
    console.error('Webhook signature verification failed:', err);
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  // ---- Idempotency: claim, run side-effects, then mark processed ----------
  // The unique PK (event_id) is the concurrency gate: exactly one INSERT wins.
  // A claimed-but-not-yet-processed row has processed_at NULL. We only treat an
  // event as a true duplicate once processed_at is set, so a transient failure
  // (which deletes its claim) can be safely retried by Stripe and credits once.
  const { error: claimError } = await supabaseAdmin
    .from('stripe_webhook_events')
    .insert({ event_id: event.id, event_type: event.type });

  if (claimError) {
    if (claimError.code === '23505') {
      // Already claimed. Was it actually completed, or is it in-flight/failed?
      const { data: existing, error: selectError } = await supabaseAdmin
        .from('stripe_webhook_events')
        .select('processed_at')
        .eq('event_id', event.id)
        .single();

      if (selectError) {
        console.error('Failed to read existing webhook event:', selectError);
        return new NextResponse('Failed to read event state', { status: 500 });
      }

      if (existing?.processed_at) {
        // True duplicate of a completed event — acknowledge, do nothing.
        return NextResponse.json({ received: true, deduplicated: true });
      }

      // Claimed by another in-flight attempt, or a prior attempt that failed
      // before completing. Do NOT process concurrently — let Stripe retry.
      console.warn(`Webhook ${event.id} is claimed but not processed; asking Stripe to retry.`);
      return new NextResponse('Event in flight, retry later', { status: 409 });
    }
    console.error('Failed to claim webhook event:', claimError);
    return new NextResponse('Failed to record event', { status: 500 });
  }

  // Release the claim so a later Stripe retry can re-run the side-effects.
  // Only deletes the not-yet-processed row, never a completed one.
  const releaseClaim = async () => {
    const { error: delError } = await supabaseAdmin
      .from('stripe_webhook_events')
      .delete()
      .eq('event_id', event.id)
      .is('processed_at', null);
    if (delError) {
      console.error('Failed to release webhook claim:', delError);
    }
  };

  // A transient failure: release the claim and return 5xx so Stripe retries.
  const transientFailure = async (msg: string) => {
    console.error(`Webhook ${event.id} transient failure: ${msg}`);
    await releaseClaim();
    return new NextResponse(msg, { status: 500 });
  };

  // A permanently-unprocessable event: it will never succeed on retry, so drop
  // the claim and acknowledge with 200 (but log loudly).
  const acknowledgeUnprocessable = async (msg: string) => {
    console.error(`Webhook ${event.id} unprocessable, acknowledging: ${msg}`);
    await releaseClaim();
    return NextResponse.json({ received: true, error: msg });
  };

  try {
    // Handle checkout.session.completed (one-time packs + subscriptions)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;

      if (!userId) {
        return await acknowledgeUnprocessable('No user_id in metadata');
      }

      const checkoutType = session.metadata?.type;

      if (checkoutType === 'pack') {
        // Bundle pack purchase — add invoice points
        const invoicesToAdd = parseInt(session.metadata?.invoices || '0', 10);
        if (invoicesToAdd === 0) {
          return await acknowledgeUnprocessable('Invalid pack metadata');
        }

        // Atomic RPC via service role (bypasses the 1.1 revokes).
        const { error } = await supabaseAdmin.rpc('add_invoice_points', {
          p_user_id: userId,
          p_points: invoicesToAdd,
        });

        if (error) {
          // Profile might not exist yet — create it.
          if (error.code === 'PGRST116' || error.message?.includes('not found')) {
            const { error: insertError } = await supabaseAdmin
              .from('profiles')
              .insert({ id: userId, invoice_points: invoicesToAdd });
            if (insertError) {
              return await transientFailure('Failed to create profile');
            }
          } else {
            return await transientFailure('Failed to add points');
          }
        }

        console.log(`Added ${invoicesToAdd} invoice points for user ${userId} (pack: ${session.metadata?.pack})`);

      } else if (checkoutType === 'subscription') {
        // Subscriptions are not a live product. Even if a stray subscription
        // session somehow reaches us, refuse to flip a profile to an "active"
        // tier — that would re-open the unlimited free-send bypass. Gated behind
        // the same ENABLE_SUBSCRIPTIONS flag as the checkout route.
        if (process.env.ENABLE_SUBSCRIPTIONS !== 'true') {
          return await acknowledgeUnprocessable('Subscriptions are disabled');
        }
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
          return await transientFailure('Failed to update subscription');
        }

        console.log(`Activated ${tier} subscription for user ${userId}`);
      }
    }

    // Handle subscription cancellation/deletion
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('subscription_stripe_id', subscription.id);
        if (error) {
          return await transientFailure('Failed to cancel subscription');
        }
        console.log(`Cancelled subscription for user ${userId}`);
      }
    }
  } catch (error) {
    console.error('Unexpected error processing webhook:', error);
    return await transientFailure('Unexpected error');
  }

  // Side-effects succeeded — mark the event processed so future retries dedupe.
  const { error: completeError } = await supabaseAdmin
    .from('stripe_webhook_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('event_id', event.id);
  if (completeError) {
    // Side-effects already ran; if we can't mark processed we must NOT release
    // the claim (that could double-credit on retry). Surface 5xx so Stripe
    // retries — the retry will see the claimed-but-unprocessed row and 409,
    // and an operator can reconcile. Logged loudly.
    console.error(`Webhook ${event.id} side-effects ran but processed_at update failed:`, completeError);
    return new NextResponse('Failed to finalize event', { status: 500 });
  }

  return NextResponse.json({ received: true });
}
