import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default clerkMiddleware(async (auth, req) => {
  const session = await auth();
  const userId = session?.userId;
  const url = req.nextUrl;
  const path = url.pathname;

  // Special logic for root route
  if (path === '/') {
    // Public: allow access to / for not signed in users
    // Signed in: allow access to / as well
    return NextResponse.next();
  }

  // If signed in, block access to sign-in, sign-up, or callback pages
  if (
    userId &&
    (
      path.startsWith('/sign-in') ||
      path.startsWith('/sign-up') ||
      path.startsWith('/callback') ||
      path.startsWith('/(auth)/sign-in') ||
      path.startsWith('/(auth)/sign-up') ||
      path.startsWith('/(auth)/callback')
    )
  ) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // All other routes: default Clerk behavior
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Special handling for root route
    '/',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Fallback: Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};