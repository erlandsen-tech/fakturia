import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
}

// Bundle packs and subscription price IDs
const BUNDLE_PACKS: Record<string, { invoices: number; amount: number; label: string }> = {
  'pack_5': { invoices: 5, amount: 4900, label: '5-faktura pakke' },
  'pack_10': { invoices: 10, amount: 8900, label: '10-faktura pakke' },
  'pack_25': { invoices: 25, amount: 19900, label: '25-faktura pakke' },
};

// Subscription price IDs (set these in Stripe Dashboard)
const SUBSCRIPTION_PRICES: Record<string, string> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
  growth: process.env.STRIPE_GROWTH_PRICE_ID || 'price_growth',
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
};

export async function POST(request: Request) {
  const stripe = getStripe();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { type, pack } = body;

  // One-time bundle purchase
  if (type === 'pack') {
    const bundle = BUNDLE_PACKS[pack];
    if (!bundle) {
      return NextResponse.json({ error: 'Invalid pack. Use: pack_5, pack_10, pack_25' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'nok',
            product_data: {
              name: bundle.label,
              description: `${bundle.invoices} fakturaer til bruk når du vil.`,
            },
            unit_amount: bundle.amount,
          },
          quantity: 1,
        },
      ],
      success_url: process.env.NEXT_PUBLIC_BASE_URL + '/dashboard?success=1',
      cancel_url: process.env.NEXT_PUBLIC_BASE_URL + '/dashboard?canceled=1',
      metadata: {
        user_id: user.id,
        type: 'pack',
        pack: pack,
        invoices: bundle.invoices.toString(),
      },
    });

    return NextResponse.json({ url: session.url });
  }

  // Subscription
  if (type === 'subscription') {
    const priceId = SUBSCRIPTION_PRICES[body.tier];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid tier. Use: starter, growth, enterprise' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: process.env.NEXT_PUBLIC_BASE_URL + '/dashboard?success=1',
      cancel_url: process.env.NEXT_PUBLIC_BASE_URL + '/dashboard?canceled=1',
      metadata: {
        user_id: user.id,
        type: 'subscription',
        tier: body.tier,
      },
    });

    return NextResponse.json({ url: session.url });
  }

  return NextResponse.json({ error: 'Invalid type. Use: pack or subscription' }, { status: 400 });
}