import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredTenant?: string;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredTenant,
  redirectTo = '/login',
  fallback
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    setIsLoading(false);

    // Not authenticated
    if (!session) {
      const currentPath = router.asPath;
      const loginUrl = `${redirectTo}?callbackUrl=${encodeURIComponent(currentPath)}`;
      router.push(loginUrl);
      return;
    }

    // Check role permissions
    if (requiredRoles.length > 0 && !requiredRoles.includes(session.user?.role)) {
      // Redirect based on user's actual role
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
          router.push('/login');
      }
      return;
    }

    // Check tenant permissions
    if (requiredTenant && session.user?.tenantId !== requiredTenant) {
      // User doesn't have access to this tenant
      router.push('/unauthorized');
      return;
    }
  }, [session, status, router, requiredRoles, requiredTenant, redirectTo]);

  // Show loading spinner while checking authentication
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner message="Checking authentication..." />
      </div>
    );
  }

  // Not authenticated
  if (!session) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Please sign in to continue.</p>
        </div>
      </div>
    );
  }

  // Check role permissions
  if (requiredRoles.length > 0 && !requiredRoles.includes(session.user?.role)) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Check tenant permissions
  if (requiredTenant && session.user?.tenantId !== requiredTenant) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have access to this workspace.</p>
        </div>
      </div>
    );
  }

  // User is authenticated and authorized
  return <>{children}</>;
}

// Higher-order component version
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}