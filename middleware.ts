import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default clerkMiddleware(async (auth, req) => {
  const session = await auth();
  const userId = session?.userId;
  const url = req.nextUrl;
  const path = url.pathname;

  // Protect /about-you for all users
  if (path.startsWith('/about-you') && !userId) {
    // Clerk's recommended redirect for sign-in
    const signInUrl = new URL('/sign-in', url.origin);
    signInUrl.searchParams.set('redirect_url', url.href);
    return NextResponse.redirect(signInUrl);
  }

  // Special logic for root route
  if (path === '/') {
    // Public: allow access to / for not signed in users
    // Signed in: allow access to / as well
    return NextResponse.next();
  }

  // All other routes: default Clerk behavior
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Protect /about-you always
    '/about-you',
    // Special handling for root route
    '/',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Fallback: Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};