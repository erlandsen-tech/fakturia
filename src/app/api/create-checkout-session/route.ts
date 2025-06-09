import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';
import { t } from '@/lib/i18n';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // You can make the amount dynamic if you want to support bundles
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'nok',
          product_data: {
            name: t('Invoice Point'),
          },
          unit_amount: 600, // 1.00 i øre
        },
        quantity: 1,
      },
    ],
    success_url: process.env.NEXT_PUBLIC_BASE_URL + '/dashboard?success=1',
    cancel_url: process.env.NEXT_PUBLIC_BASE_URL + '/dashboard?canceled=1',
    metadata: {
      user_id: user.id,
      // You can add more metadata if needed
    },
  });

  return NextResponse.json({ url: session.url });
}