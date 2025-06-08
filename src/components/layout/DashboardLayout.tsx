import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FiMenu, 
  FiX, 
  FiUser, 
  FiLogOut, 
  FiSettings, 
  FiChevronDown,
  FiBox,
  FiBell,
  FiHome
} from 'react-icons/fi';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  current?: boolean;
}

export default function DashboardLayout({ 
  children, 
  title = 'Dashboard',
  description = 'Manage your operations'
}: DashboardLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Get navigation items based on user role
  const getNavigationItems = (): NavItem[] => {
    const role = session?.user?.role;
    const currentPath = router.pathname;

    switch (role) {
      case 'admin':
        return [
          { name: 'Admin Dashboard', href: '/admin', icon: FiHome, current: currentPath === '/admin' },
          { name: 'All Restaurants', href: '/admin/restaurants', icon: FiBox, current: currentPath === '/admin/restaurants' },
          { name: 'All Suppliers', href: '/admin/suppliers', icon: FiBox, current: currentPath === '/admin/suppliers' },
          { name: 'System Settings', href: '/admin/settings', icon: FiSettings, current: currentPath === '/admin/settings' },
        ];
      case 'supplier':
        return [
          { name: 'Supplier Dashboard', href: '/supplier', icon: FiHome, current: currentPath === '/supplier' },
          { name: 'Orders', href: '/supplier/orders', icon: FiBell, current: currentPath === '/supplier/orders' },
          { name: 'Inventory', href: '/supplier/inventory', icon: FiBox, current: currentPath === '/supplier/inventory' },
          { name: 'Settings', href: '/supplier/settings', icon: FiSettings, current: currentPath === '/supplier/settings' },
        ];
      case 'driver':
        return [
          { name: 'Driver Dashboard', href: '/driver', icon: FiHome, current: currentPath === '/driver' },
          { name: 'Deliveries', href: '/driver/deliveries', icon: FiBell, current: currentPath === '/driver/deliveries' },
          { name: 'Route Map', href: '/driver/map', icon: FiBox, current: currentPath === '/driver/map' },
          { name: 'Settings', href: '/driver/settings', icon: FiSettings, current: currentPath === '/driver/settings' },
        ];
      case 'client':
      default:
        return [
          { name: 'Restaurant Dashboard', href: '/dashboard', icon: FiHome, current: currentPath === '/dashboard' },
          { name: 'Orders', href: '/dashboard/orders', icon: FiBell, current: currentPath === '/dashboard/orders' },
          { name: 'Inventory', href: '/dashboard/inventory', icon: FiBox, current: currentPath === '/dashboard/inventory' },
          { name: 'Settings', href: '/dashboard/settings', icon: FiSettings, current: currentPath === '/dashboard/settings' },
        ];
    }
  };

  const handleLogout = async () => {
    await signOut({ 
      redirect: true,
      callbackUrl: '/login'
    });
  };

  const handleTenantSwitch = () => {
    // In a real app, this would show a tenant selection modal
    router.push('/login');
  };

  const navigation = getNavigationItems();
  const userDisplayName = session?.user?.name || session?.user?.email || 'User';
  const tenantName = session?.user?.tenantName || 'Default Workspace';
  const roleDisplayName = session?.user?.role ? session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1) : 'User';

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{title} - Roni's Bakery Management</title>
        <meta name="description" content={description} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo and Close Button */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center">
              <span className="text-2xl">🍞</span>
              <span className="ml-2 text-lg font-semibold text-gray-900">Roni's Bakery</span>
            </div>
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <FiX className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          {/* Tenant Info */}
          <div className="p-4 border-b bg-gray-50">
            <button
              onClick={handleTenantSwitch}
              className="w-full flex items-center justify-between p-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <FiBox className="h-4 w-4 mr-2" />
                <span className="truncate">{tenantName}</span>
              </div>
              <FiChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    item.current
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="p-4 border-t">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center p-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center flex-1">
                  <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                    <FiUser className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium truncate">{userDisplayName}</div>
                    <div className="text-xs text-gray-500">{roleDisplayName}</div>
                  </div>
                </div>
                <FiChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User dropdown menu */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                  <Link
                    href="/profile"
                    className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FiUser className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FiSettings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <FiLogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64 min-h-screen">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <button
                className="lg:hidden mr-3"
                onClick={() => setSidebarOpen(true)}
              >
                <FiMenu className="h-6 w-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            </div>
            
            {/* Header actions */}
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <FiBell className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}