import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/account/export
 *
 * GDPR Art.15 data portability. Returns everything we hold about the
 * authenticated user (profile, company settings, clients, invoices, invoice
 * items) as a downloadable JSON attachment. The export_user_data RPC enforces
 * that the caller can only export their own data (auth.uid() = p_user_id).
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('export_user_data', { p_user_id: user.id });
    if (error) {
      console.error('export_user_data failed:', error);
      return NextResponse.json({ error: 'Kunne ikke eksportere dataene dine.' }, { status: 500 });
    }

    const json = JSON.stringify(data, null, 2);
    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="fakturio-data-export.json"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error exporting account data:', error);
    return NextResponse.json({ error: 'Kunne ikke eksportere dataene dine.' }, { status: 500 });
  }
}
