import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/invoices(.*)",
  "/clients(.*)",
  "/settings(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    
    // If the user is not signed in, redirect them to the sign-in page
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(html?|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|pdf)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 