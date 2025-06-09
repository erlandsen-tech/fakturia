import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
    supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set',
    supabase_url_value: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
  });
} 