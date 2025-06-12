import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Home() {
  const router = useRouter();
  
  // Temporarily disable NextAuth to test Railway deployment
  // TODO: Re-enable after Railway environment variables are set
  
  useEffect(() => {
    // Simple redirect to test page for Railway testing
    if (process.env.NODE_ENV === 'production') {
      router.push('/test');
    } else {
      router.push('/login');
    }
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <Head>
        <title>Roni&apos;s Bakery - Management System</title>
        <meta name="description" content="Multi-tenant management system for Roni&apos;s Bakery" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">🍞</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Roni&apos;s Bakery</h1>
          <p className="text-gray-600 mb-8">
            {process.env.NODE_ENV === 'production' ? 'Testing Railway deployment...' : 'Redirecting to your dashboard...'}
          </p>
          <LoadingSpinner message="Loading..." />
          
          {/* Fallback links */}
          <div className="mt-8 space-y-2">
            <p className="text-sm text-gray-500">If you&apos;re not redirected automatically:</p>
            <div className="space-x-4">
              <Link href="/test" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
                Test Page
              </Link>
              <Link href="/login" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
