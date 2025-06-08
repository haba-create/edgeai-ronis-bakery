import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      // Not authenticated, redirect to login
      router.push('/login');
      return;
    }

    // Authenticated, redirect to appropriate dashboard based on role
    switch (session.user?.role) {
      case 'admin':
        router.push('/admin');
        break;
      case 'supplier':
        router.push('/supplier');
        break;
      case 'driver':
        router.push('/driver');
        break;
      case 'client':
        router.push('/dashboard');
        break;
      default:
        router.push('/dashboard');
    }
  }, [session, status, router]);

  // Show loading while determining authentication status
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  // This page will redirect users to the appropriate dashboard
  // or login page, so we show a loading state
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <Head>
        <title>Roni's Bakery - Management System</title>
        <meta name="description" content="Multi-tenant management system for Roni's Bakery" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">🍞</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Roni's Bakery</h1>
          <p className="text-gray-600 mb-8">Redirecting to your dashboard...</p>
          <LoadingSpinner message="Loading your workspace..." />
          
          {/* Fallback links in case redirect doesn't work */}
          <div className="mt-8 space-y-2">
            <p className="text-sm text-gray-500">If you're not redirected automatically:</p>
            <div className="space-x-4">
              <Link href="/login" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
                Sign In
              </Link>
              <Link href="/apps" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
                View Demo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
