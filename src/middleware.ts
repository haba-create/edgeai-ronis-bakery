import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin routes
    if (path.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // Supplier routes
    if (path.startsWith('/supplier') && !['admin', 'supplier'].includes(token?.role as string)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // Driver routes
    if (path.startsWith('/driver') && !['admin', 'driver'].includes(token?.role as string)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // Dashboard routes (for clients)
    if (path.startsWith('/dashboard') && !['admin', 'client'].includes(token?.role as string)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // Owner routes (for clients)
    if (path.startsWith('/owner') && !['admin', 'client'].includes(token?.role as string)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // Client routes
    if (path.startsWith('/apps') && !['admin', 'client'].includes(token?.role as string)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Protect specific routes
export const config = {
  matcher: [
    '/admin/:path*',
    '/supplier/:path*',
    '/driver/:path*',
    '/dashboard/:path*',
    '/owner/:path*',
    '/apps/:path*',
    '/api/protected/:path*',
  ],
};