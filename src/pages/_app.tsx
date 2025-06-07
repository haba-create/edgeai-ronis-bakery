import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Enhanced session provider with better error handling and loading states
function AppContent({ Component, pageProps }: { Component: AppProps['Component'], pageProps: AppProps['pageProps'] }) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  // Handle route change loading states
  useEffect(() => {
    const handleStart = () => setIsNavigating(true);
    const handleComplete = () => setIsNavigating(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  // Show loading spinner during navigation
  if (isNavigating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner message="Loading page..." />
      </div>
    );
  }

  return <Component {...pageProps} />;
}

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <SessionProvider 
      session={session}
      // Refetch session every 5 minutes
      refetchInterval={5 * 60}
      // Refetch session when window has focus
      refetchOnWindowFocus={true}
      // Base URL for NextAuth.js
      basePath="/api/auth"
    >
      <AppContent 
        Component={Component} 
        pageProps={pageProps} 
      />
    </SessionProvider>
  );
}
