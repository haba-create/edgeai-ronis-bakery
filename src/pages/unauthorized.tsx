import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FiAlertTriangle, FiHome, FiLogOut } from 'react-icons/fi';

export default function Unauthorized() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleGoBack = () => {
    if (session?.user?.role) {
      // Redirect to appropriate dashboard based on role
      switch (session.user.role) {
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
          router.push('/');
      }
    } else {
      router.push('/');
    }
  };

  const handleLogout = async () => {
    await signOut({ 
      redirect: true,
      callbackUrl: '/login'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      <Head>
        <title>Access Denied - Roni&apos;s Bakery</title>
        <meta name="description" content="You don't have permission to access this page" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto h-24 w-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <FiAlertTriangle className="h-12 w-12 text-red-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
            
            <p className="text-gray-600 mb-8">
              You don&apos;t have permission to access this page or workspace. 
              Please contact your administrator if you believe this is an error.
            </p>

            {session && (
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Your Current Access</h3>
                <div className="text-sm text-gray-600">
                  <div><strong>Email:</strong> {session.user?.email}</div>
                  <div><strong>Role:</strong> {session.user?.role?.charAt(0).toUpperCase() + session.user?.role?.slice(1)}</div>
                  {session.user?.tenantName && (
                    <div><strong>Workspace:</strong> {session.user.tenantName}</div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {session ? (
                <>
                  <button
                    onClick={handleGoBack}
                    className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
                  >
                    <FiHome className="h-4 w-4 mr-2" />
                    Go to My Dashboard
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
                  >
                    <FiLogOut className="h-4 w-4 mr-2" />
                    Sign Out & Login as Different User
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
                >
                  Sign In
                </Link>
              )}
              
              <Link
                href="/"
                className="block text-sm text-amber-600 hover:text-amber-500 font-medium"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}