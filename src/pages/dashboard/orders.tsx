import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FiPlus, FiSearch, FiFilter, FiEye, FiTruck, FiClock, FiCheckCircle } from 'react-icons/fi';

export default function RestaurantOrders() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('all');

  // Mock orders data
  const orders = [
    {
      id: 'ORD-001',
      supplier: 'Heritage Jewish Breads',
      items: 5,
      total: '£245.50',
      status: 'pending',
      orderDate: '2025-06-08 08:30',
      expectedDelivery: '2025-06-09 06:00',
      products: ['Rye Flour', 'Sourdough Starter', 'Whole Wheat Flour']
    },
    {
      id: 'ORD-002',
      supplier: 'Daily Fresh Dairy',
      items: 3,
      total: '£89.25',
      status: 'confirmed',
      orderDate: '2025-06-08 07:15',
      expectedDelivery: '2025-06-09 07:30',
      products: ['Organic Milk', 'Free Range Eggs', 'Butter']
    },
    {
      id: 'ORD-003',
      supplier: 'Heritage Jewish Breads',
      items: 8,
      total: '£467.20',
      status: 'delivered',
      orderDate: '2025-06-07 14:30',
      expectedDelivery: '2025-06-08 06:00',
      deliveredDate: '2025-06-08 05:45',
      products: ['Various Flours', 'Seeds', 'Additives']
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <FiClock className="h-5 w-5 text-yellow-500" />;
      case 'confirmed':
        return <FiTruck className="h-5 w-5 text-blue-500" />;
      case 'delivered':
        return <FiCheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <FiClock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = activeTab === 'all' 
    ? orders 
    : orders.filter(order => order.status === activeTab);

  return (
    <ProtectedRoute requiredRoles={['client', 'admin']}>
      <DashboardLayout 
        title="Orders"
        description="Manage your orders to suppliers"
      >
        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Orders</p>
                  <p className="text-2xl font-bold text-gray-900">4</p>
                </div>
                <FiClock className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Transit</p>
                  <p className="text-2xl font-bold text-gray-900">2</p>
                </div>
                <FiTruck className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Delivered Today</p>
                  <p className="text-2xl font-bold text-gray-900">8</p>
                </div>
                <FiCheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Spent This Month</p>
                  <p className="text-2xl font-bold text-gray-900">£8,450</p>
                </div>
                <FiTruck className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {['all', 'pending', 'confirmed', 'delivered'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === tab
                          ? 'bg-amber-100 text-amber-700'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search orders..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <button className="p-2 text-gray-600 hover:text-gray-900">
                    <FiFilter />
                  </button>
                  <button className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                    <FiPlus className="mr-2" />
                    New Order
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">#{order.id}</h3>
                        <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="font-medium text-gray-900">{order.supplier}</p>
                          <p>{order.items} items • {order.total}</p>
                        </div>
                        <div>
                          <p>Ordered: {new Date(order.orderDate).toLocaleDateString()}</p>
                          <p>
                            {order.status === 'delivered' 
                              ? `Delivered: ${new Date(order.deliveredDate!).toLocaleDateString()}`
                              : `Expected: ${new Date(order.expectedDelivery).toLocaleDateString()}`
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Products:</p>
                          <p className="truncate">{order.products.join(', ')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {getStatusIcon(order.status)}
                      <button className="text-amber-600 hover:text-amber-900">
                        <FiEye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}