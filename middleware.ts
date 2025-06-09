import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes
const isProtectedRoute = (pathname: string) => {
  return pathname.startsWith('/dashboard') ||
         pathname.startsWith('/invoices') ||
         pathname.startsWith('/clients') ||
         pathname.startsWith('/settings');
};

// Define protected API routes
const isProtectedApiRoute = (pathname: string) => {
  return pathname.startsWith('/api/invoices') ||
         pathname.startsWith('/api/clients') ||
         pathname.startsWith('/api/payments');
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect page routes
  if (isProtectedRoute(req.nextUrl.pathname)) {
    if (!session) {
      const redirectUrl = new URL('/sign-in', req.url);
      redirectUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Protect API routes
  if (isProtectedApiRoute(req.nextUrl.pathname)) {
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(html?|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|pdf)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 