import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AdminChatbot from '@/components/apps/AdminChatbot';
import { 
  FiUsers, 
  FiBox, 
  FiTruck, 
  FiDollarSign, 
  FiActivity,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiMapPin
} from 'react-icons/fi';

interface Tenant {
  id: string;
  name: string;
  type: 'restaurant' | 'supplier' | 'logistics';
  status: 'active' | 'inactive' | 'maintenance';
  users: number;
  revenue: number;
  orders: number;
  lastActivity: string;
}

interface SystemMetric {
  label: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: string;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([
    {
      label: 'Total Users',
      value: '...',
      change: 0,
      icon: FiUsers,
      color: 'blue'
    },
    {
      label: 'Active Tenants',
      value: '...',
      change: 0,
      icon: FiBox,
      color: 'green'
    },
    {
      label: 'Revenue Today',
      value: '...',
      change: 0,
      icon: FiDollarSign,
      color: 'yellow'
    },
    {
      label: 'Orders Today',
      value: '...',
      change: 0,
      icon: FiActivity,
      color: 'purple'
    }
  ]);
  const [loading, setLoading] = useState(true);

  // Fetch real data from APIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch system metrics and tenants in parallel
        const [metricsResponse, tenantsResponse] = await Promise.all([
          fetch('/api/admin/system-metrics'),
          fetch('/api/admin/tenants')
        ]);

        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          setSystemMetrics([
            {
              label: metricsData.totalUsers.label,
              value: metricsData.totalUsers.value,
              change: metricsData.totalUsers.change,
              icon: FiUsers,
              color: 'blue'
            },
            {
              label: metricsData.activeTenants.label,
              value: metricsData.activeTenants.value,
              change: metricsData.activeTenants.change,
              icon: FiBox,
              color: 'green'
            },
            {
              label: metricsData.totalRevenue.label,
              value: metricsData.totalRevenue.value,
              change: metricsData.totalRevenue.change,
              icon: FiDollarSign,
              color: 'yellow'
            },
            {
              label: metricsData.ordersToday.label,
              value: metricsData.ordersToday.value,
              change: metricsData.ordersToday.change,
              icon: FiActivity,
              color: 'purple'
            }
          ]);
        } else {
          console.error('Failed to fetch system metrics:', await metricsResponse.text());
        }

        if (tenantsResponse.ok) {
          const tenantsData = await tenantsResponse.json();
          setTenants(tenantsData);
        } else {
          console.error('Failed to fetch tenants:', await tenantsResponse.text());
        }
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.role === 'admin') {
      fetchData();
    }
  }, [session]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-red-600 bg-red-100';
      case 'maintenance':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
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

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <DashboardLayout 
        title="System Administration"
        description={`Welcome back, ${session?.user?.name || 'Administrator'}! Monitor and manage the entire system.`}
      >
        <div className="p-6">
          {/* Header with period selector */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">System Overview</h2>
              <p className="text-gray-600">Monitor all tenants and system performance</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  if (session?.user?.role === 'admin') {
                    setLoading(true);
                    // Re-fetch data
                    window.location.reload();
                  }
                }}
                disabled={loading}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>

          {/* System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {systemMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? (
                          <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                        ) : (
                          metric.value
                        )}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg bg-${metric.color}-100`}>
                      <Icon className={`h-6 w-6 text-${metric.color}-600`} />
                    </div>
                  </div>
                  <div className="flex items-center mt-4">
                    {metric.change > 0 ? (
                      <FiTrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : metric.change < 0 ? (
                      <FiTrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    ) : (
                      <div className="h-4 w-4 mr-1" />
                    )}
                    <span className={`text-sm ${
                      metric.change > 0 ? 'text-green-600' : 
                      metric.change < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last period</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Tenant Management */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Tenant Management</h3>
                  <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                    Add Tenant
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {loading ? (
                    // Loading skeleton
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center">
                          <div className="animate-pulse bg-gray-200 h-8 w-8 rounded mr-3"></div>
                          <div>
                            <div className="animate-pulse bg-gray-200 h-4 w-32 rounded mb-2"></div>
                            <div className="flex items-center space-x-4">
                              <div className="animate-pulse bg-gray-200 h-3 w-16 rounded"></div>
                              <div className="animate-pulse bg-gray-200 h-3 w-12 rounded"></div>
                              <div className="animate-pulse bg-gray-200 h-3 w-20 rounded"></div>
                            </div>
                          </div>
                        </div>
                        <div className="animate-pulse bg-gray-200 h-6 w-16 rounded-full"></div>
                      </div>
                    ))
                  ) : tenants.length > 0 ? (
                    tenants.map((tenant) => (
                      <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center">
                          <div className="text-2xl mr-3">{getTenantIcon(tenant.type)}</div>
                          <div>
                            <h4 className="font-medium text-gray-900">{tenant.name}</h4>
                            <div className="flex items-center mt-1 space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <FiUsers className="h-3 w-3 mr-1" />
                                {tenant.users} users
                              </span>
                              <span className="flex items-center">
                                <FiDollarSign className="h-3 w-3 mr-1" />
                                £{(tenant.revenue / 1000).toFixed(1)}K
                              </span>
                              <span className="flex items-center">
                                <FiActivity className="h-3 w-3 mr-1" />
                                {tenant.orders} orders
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(tenant.status)}`}>
                            {tenant.status}
                          </span>
                          <button className="text-gray-400 hover:text-gray-600">
                            <FiActivity className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No tenants found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {/* Service Status */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Services</h4>
                    <div className="space-y-2">
                      {[
                        { name: 'API Gateway', status: 'healthy', uptime: '99.9%' },
                        { name: 'Database', status: 'healthy', uptime: '99.8%' },
                        { name: 'Authentication', status: 'healthy', uptime: '100%' },
                        { name: 'File Storage', status: 'warning', uptime: '98.2%' },
                      ].map((service) => (
                        <div key={service.name} className="flex items-center justify-between py-2">
                          <div className="flex items-center">
                            {service.status === 'healthy' ? (
                              <FiCheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            ) : service.status === 'warning' ? (
                              <FiAlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                            ) : (
                              <FiAlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                            )}
                            <span className="text-sm text-gray-900">{service.name}</span>
                          </div>
                          <span className="text-sm text-gray-500">{service.uptime}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h4>
                    <div className="space-y-2">
                      {[
                        { action: 'New order placed', tenant: "Roni's Bakery - Main", time: '2 minutes ago' },
                        { action: 'Delivery completed', tenant: 'EdgeAI Logistics', time: '5 minutes ago' },
                        { action: 'Inventory updated', tenant: 'Heritage Jewish Breads', time: '12 minutes ago' },
                        { action: 'User login', tenant: "Roni's Bakery - Belsize Park", time: '18 minutes ago' },
                      ].map((activity, index) => (
                        <div key={index} className="flex items-center justify-between py-2">
                          <div>
                            <span className="text-sm text-gray-900">{activity.action}</span>
                            <span className="text-sm text-gray-500 ml-1">in {activity.tenant}</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <FiClock className="h-3 w-3 mr-1" />
                            {activity.time}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-colors">
                <div className="text-center">
                  <FiBox className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-600">Add New Tenant</span>
                </div>
              </button>
              <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-colors">
                <div className="text-center">
                  <FiUsers className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-600">Manage Users</span>
                </div>
              </button>
              <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-colors">
                <div className="text-center">
                  <FiActivity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-600">View Analytics</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
      
      {/* Admin AI Chatbot */}
      <AdminChatbot />
    </ProtectedRoute>
  );
}