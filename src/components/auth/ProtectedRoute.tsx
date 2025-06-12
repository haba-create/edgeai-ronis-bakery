import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { logger } from '@/utils/logger';

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
    const logContext = {
      currentPath: router.asPath,
      requiredRoles,
      requiredTenant,
      userRole: session?.user?.role,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    };

    if (status === 'loading') {
      logger.debug('ProtectedRoute: Auth status loading', logContext);
      return;
    }

    logger.debug('ProtectedRoute: Checking authentication', logContext);

    // Not authenticated
    if (!session) {
      logger.authFailure('No session found for protected route', logContext);
      const currentPath = router.asPath;
      const loginUrl = `${redirectTo}?callbackUrl=${encodeURIComponent(currentPath)}`;
      logger.info('Redirecting to login', { ...logContext, loginUrl });
      router.push(loginUrl);
      return;
    }

    // Check role permissions - only redirect if user is trying to access wrong dashboard
    if (requiredRoles.length > 0 && !requiredRoles.includes(session.user?.role)) {
      logger.authFailure('User role not authorized for route', {
        ...logContext,
        userRole: session.user?.role,
        requiredRoles,
        hasAccess: false
      });
      
      // Only redirect if we're not already on the login page
      if (!router.asPath.includes('/login')) {
        // Redirect based on user's actual role
        let redirectPath = '/login';
        switch (session.user?.role) {
          case 'admin':
            redirectPath = '/admin';
            break;
          case 'supplier':
            redirectPath = '/supplier';
            break;
          case 'driver':
            redirectPath = '/driver';
            break;
          case 'client':
            redirectPath = '/dashboard';
            break;
        }
        
        logger.info('Redirecting user to appropriate dashboard', {
          ...logContext,
          redirectPath,
          reason: 'role_mismatch'
        });
        
        router.push(redirectPath);
      }
      return;
    }

    // Check tenant permissions
    if (requiredTenant && session.user?.tenantId !== requiredTenant) {
      logger.authFailure('User tenant not authorized for route', {
        ...logContext,
        userTenant: session.user?.tenantId,
        requiredTenant
      });
      router.push('/unauthorized');
      return;
    }

    // If we reach here, user is authenticated and authorized
    setIsLoading(false);
    logger.authSuccess(session.user?.id || 'unknown', session.user?.role || 'unknown', {
      ...logContext,
      accessGranted: true
    });
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
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
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
          <p className="text-gray-600">You don&apos;t have access to this workspace.</p>
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