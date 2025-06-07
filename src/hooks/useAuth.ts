import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useCallback } from 'react';

export interface UseAuthReturn {
  session: any;
  user: any;
  loading: boolean;
  isAuthenticated: boolean;
  tenantId: string | undefined;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: string[]) => boolean;
  belongsToTenant: (supplierId: number) => boolean;
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();
  const router = useRouter();
  const loading = status === 'loading';
  const isAuthenticated = !!session;

  const login = useCallback(async (email: string, password: string) => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error(result.error);
    }

    // Redirect based on user role
    if (result?.ok && session?.user) {
      switch (session.user.role) {
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'supplier':
          router.push('/supplier-portal');
          break;
        case 'driver':
          router.push('/driver/dashboard');
          break;
        case 'client':
          router.push('/apps');
          break;
        default:
          router.push('/');
      }
    }
  }, [router, session]);

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    router.push('/');
  }, [router]);

  const hasRole = useCallback((roles: string[]) => {
    if (!session?.user?.role) return false;
    return roles.includes(session.user.role);
  }, [session]);

  const belongsToTenant = useCallback((supplierId: number) => {
    if (!session?.user) return false;
    
    // Admins can access all tenants
    if (session.user.role === 'admin') return true;
    
    // Check if user belongs to the specific supplier
    return session.user.supplierId === supplierId;
  }, [session]);

  return {
    session,
    user: session?.user,
    loading,
    isAuthenticated,
    tenantId: session?.user?.tenantId,
    login,
    logout,
    hasRole,
    belongsToTenant,
  };
}