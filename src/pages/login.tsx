import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signIn, useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { FiEye, FiEyeOff, FiUser, FiLock, FiBox, FiChevronDown } from 'react-icons/fi';

interface Tenant {
  id: string;
  name: string;
  type: 'restaurant' | 'supplier' | 'logistics';
  logo?: string;
}

interface User {
  email: string;
  name: string;
  role: 'client' | 'supplier' | 'driver' | 'admin';
  tenants: Tenant[];
}

export default function Login() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'login' | 'tenant-selection'>('login');
  const [userTenants, setUserTenants] = useState<Tenant[]>([]);
  const [userInfo, setUserInfo] = useState<User | null>(null);

  // Mock user database for demo purposes
  const mockUsers: User[] = [
    {
      email: 'admin@ronisbakery.com',
      name: 'Admin User',
      role: 'admin',
      tenants: [
        { id: 'rb-main', name: "Roni's Bakery - Main", type: 'restaurant' },
        { id: 'rb-belsize', name: "Roni's Bakery - Belsize Park", type: 'restaurant' },
        { id: 'hjb-supplier', name: 'Heritage Jewish Breads', type: 'supplier' },
        { id: 'logistics-main', name: 'EdgeAI Logistics', type: 'logistics' }
      ]
    },
    {
      email: 'owner@ronisbakery.com',
      name: 'Restaurant Owner',
      role: 'client',
      tenants: [
        { id: 'rb-main', name: "Roni's Bakery - Main", type: 'restaurant' },
        { id: 'rb-belsize', name: "Roni's Bakery - Belsize Park", type: 'restaurant' }
      ]
    },
    {
      email: 'supplier@hjb.com',
      name: 'Heritage Breads Manager',
      role: 'supplier',
      tenants: [
        { id: 'hjb-supplier', name: 'Heritage Jewish Breads', type: 'supplier' }
      ]
    },
    {
      email: 'driver@edgeai.com',
      name: 'Delivery Driver',
      role: 'driver',
      tenants: [
        { id: 'logistics-main', name: 'EdgeAI Logistics', type: 'logistics' }
      ]
    }
  ];

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session) {
      redirectToDashboard(session.user?.role, selectedTenant);
    }
  }, [status, session]);

  const redirectToDashboard = (role: string, tenantId?: string) => {
    const callbackUrl = router.query.callbackUrl as string;
    
    if (callbackUrl) {
      router.push(callbackUrl);
      return;
    }

    switch (role) {
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
  };

  const handleInitialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Find user in mock database
      const user = mockUsers.find(u => u.email === email);
      
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Simple password check (in real app, this would be handled by NextAuth)
      if (password !== 'password123') {
        throw new Error('Invalid credentials');
      }

      setUserInfo(user);
      setUserTenants(user.tenants);

      // If user has multiple tenants, show tenant selection
      if (user.tenants.length > 1) {
        setStep('tenant-selection');
      } else {
        // Single tenant, proceed with sign in
        setSelectedTenant(user.tenants[0].id);
        await performSignIn(user, user.tenants[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelection = async () => {
    if (!selectedTenant || !userInfo) {
      setError('Please select a tenant');
      return;
    }

    setLoading(true);
    try {
      await performSignIn(userInfo, selectedTenant);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const performSignIn = async (user: User, tenantId: string) => {
    const result = await signIn('credentials', {
      email: user.email,
      password: 'password123',
      tenantId,
      redirect: false,
    });

    if (result?.error) {
      throw new Error(result.error);
    }

    if (result?.ok) {
      redirectToDashboard(user.role, tenantId);
    }
  };

  const getTenantIcon = (type: string) => {
    switch (type) {
      case 'restaurant':
        return '🍞';
      case 'supplier':
        return '🚛';
      case 'logistics':
        return '📦';
      default:
        return '🏢';
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <Head>
        <title>Sign In - Roni's Bakery Management System</title>
        <meta name="description" content="Sign in to access your Roni's Bakery management dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="text-6xl mb-4">🍞</div>
            <h2 className="text-3xl font-bold text-gray-900">
              Welcome to Roni's Bakery
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Multi-tenant management system
            </p>
          </div>

          {/* Login Form */}
          {step === 'login' && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <form className="space-y-6" onSubmit={handleInitialLogin}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link href="/auth/register" className="font-medium text-amber-600 hover:text-amber-500">
                    Create one here
                  </Link>
                </p>
              </div>

              {/* Demo Credentials */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Demo Credentials:</h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Admin:</strong> admin@ronisbakery.com</div>
                  <div><strong>Owner:</strong> owner@ronisbakery.com</div>
                  <div><strong>Supplier:</strong> supplier@hjb.com</div>
                  <div><strong>Driver:</strong> driver@edgeai.com</div>
                  <div className="mt-2"><strong>Password:</strong> password123</div>
                </div>
              </div>
            </div>
          )}

          {/* Tenant Selection */}
          {step === 'tenant-selection' && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-6">
                <FiBox className="mx-auto h-12 w-12 text-amber-600 mb-2" />
                <h3 className="text-xl font-semibold text-gray-900">Select Your Workspace</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Welcome back, {userInfo?.name}! Choose which workspace to access.
                </p>
              </div>

              <div className="space-y-3">
                {userTenants.map((tenant) => (
                  <label
                    key={tenant.id}
                    className={`relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTenant === tenant.id
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tenant"
                      value={tenant.id}
                      checked={selectedTenant === tenant.id}
                      onChange={(e) => setSelectedTenant(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center flex-1">
                      <div className="text-2xl mr-3">{getTenantIcon(tenant.type)}</div>
                      <div>
                        <div className="font-medium text-gray-900">{tenant.name}</div>
                        <div className="text-sm text-gray-500 capitalize">{tenant.type}</div>
                      </div>
                    </div>
                    {selectedTenant === tenant.id && (
                      <div className="text-amber-600">
                        <FiChevronDown className="h-5 w-5" />
                      </div>
                    )}
                  </label>
                ))}
              </div>

              {error && (
                <div className="mt-4 rounded-lg bg-red-50 p-4 border border-red-200">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="mt-6 flex space-x-4">
                <button
                  type="button"
                  onClick={() => setStep('login')}
                  className="flex-1 py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleTenantSelection}
                  disabled={!selectedTenant || loading}
                  className="flex-1 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Accessing...
                    </div>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}