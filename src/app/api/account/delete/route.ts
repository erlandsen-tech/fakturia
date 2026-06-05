import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * POST /api/account/delete
 *
 * GDPR Art.17 erasure. Requires explicit confirmation in the body:
 *   { "confirm": "SLETT" }
 *
 * anonymize_user_account() locks the account: it marks the profile erased and
 * scrubs the seller's own non-required contact fields, but leaves clients and
 * invoices UNALTERED — bokføringsloven §13 requires those to be retained
 * complete for ~5 years (GDPR Art.17(3)(b)). Afterwards we BAN — but do not
 * hard-delete — the auth.users row: profiles and company_settings cascade from
 * it and must survive for the retained invoices, so a CASCADE delete would
 * breach the retention obligation. Banning prevents any further sign-in.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const body = await request.json().catch(() => ({}));
    if (body?.confirm !== 'SLETT') {
      return NextResponse.json(
        { error: 'Bekreftelse mangler. Send { "confirm": "SLETT" } for å bekrefte sletting.' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('anonymize_user_account', { p_user_id: user.id });
    if (error || data?.ok === false) {
      console.error('anonymize_user_account failed:', error);
      return NextResponse.json({ error: 'Kunne ikke slette kontoen. Prøv igjen senere.' }, { status: 500 });
    }

    // Ban the auth user (~100 years) so they can no longer sign in, without
    // cascading away the retained company_settings/profiles rows.
    const admin = getSupabaseAdmin();
    const { error: banError } = await admin.auth.admin.updateUserById(user.id, { ban_duration: '876000h' });
    if (banError) {
      // PII is already anonymized; failing to ban is non-fatal but logged loudly.
      console.error('Failed to ban auth user after anonymization:', banError);
    }

    // End the current session so the now-anonymized account is logged out.
    await supabase.auth.signOut();

    return NextResponse.json({
      message: 'Kontoen din er slettet og innlogging er sperret. Fakturaene dine beholdes uendret i 5 år som loven krever (bokføringsloven §13), og slettes deretter.',
      data,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Kunne ikke slette kontoen.' }, { status: 500 });
  }
}
