import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isProtectedPage = (pathname: string) =>
  pathname.startsWith('/dashboard') ||
  pathname.startsWith('/invoices') ||
  pathname.startsWith('/clients') ||
  pathname.startsWith('/settings');

const isProtectedApi = (pathname: string) =>
  pathname.startsWith('/api/invoices') ||
  pathname.startsWith('/api/clients') ||
  pathname.startsWith('/api/payments') ||
  pathname.startsWith('/api/create-checkout-session');

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = req.nextUrl;

  if (isProtectedPage(pathname) && !user) {
    const redirectUrl = new URL('/sign-in', req.url);
    redirectUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (isProtectedApi(pathname) && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return res;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(html?|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|pdf)).*)',
    '/(api|trpc)(.*)',
  ],
};
