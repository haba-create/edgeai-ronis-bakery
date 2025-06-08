import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FiTruck, FiMapPin, FiClock, FiCheckCircle, FiNavigation, FiPhone } from 'react-icons/fi';

export default function DriverDeliveries() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('active');

  // Mock deliveries data
  const deliveries = [
    {
      id: 'DEL-001',
      orderId: 'ORD-1234',
      restaurant: "Roni's Bakery - Main",
      address: '123 High Street, London, NW1 2AB',
      items: 8,
      status: 'active',
      estimatedTime: '10:30 AM',
      distance: '2.5 km',
      phone: '+44 20 7123 4567'
    },
    {
      id: 'DEL-002',
      orderId: 'ORD-1235',
      restaurant: "Roni's Bakery - Belsize Park",
      address: '45 Belsize Lane, London, NW3 4YZ',
      items: 5,
      status: 'active',
      estimatedTime: '11:00 AM',
      distance: '4.2 km',
      phone: '+44 20 7987 6543'
    },
    {
      id: 'DEL-003',
      orderId: 'ORD-1233',
      restaurant: "Roni's Bakery - Main",
      address: '123 High Street, London, NW1 2AB',
      items: 12,
      status: 'completed',
      completedTime: '09:45 AM',
      distance: '2.5 km',
      phone: '+44 20 7123 4567'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDeliveries = activeTab === 'all' 
    ? deliveries 
    : deliveries.filter(delivery => delivery.status === activeTab);

  return (
    <ProtectedRoute requiredRoles={['driver', 'admin']}>
      <DashboardLayout 
        title="My Deliveries"
        description="Manage your delivery routes and orders"
      >
        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Deliveries</p>
                  <p className="text-2xl font-bold text-gray-900">3</p>
                </div>
                <FiTruck className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed Today</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                </div>
                <FiCheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Distance</p>
                  <p className="text-2xl font-bold text-gray-900">45.2 km</p>
                </div>
                <FiMapPin className="h-8 w-8 text-purple-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. Delivery Time</p>
                  <p className="text-2xl font-bold text-gray-900">22 min</p>
                </div>
                <FiClock className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Delivery List */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center space-x-4">
                {['all', 'active', 'completed'].map((tab) => (
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
            </div>

            <div className="divide-y divide-gray-200">
              {filteredDeliveries.map((delivery) => (
                <div key={delivery.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{delivery.restaurant}</h3>
                        <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(delivery.status)}`}>
                          {delivery.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <FiMapPin className="h-4 w-4 mr-2" />
                          {delivery.address}
                        </div>
                        <div className="flex items-center">
                          <FiClock className="h-4 w-4 mr-2" />
                          {delivery.status === 'active' 
                            ? `Estimated: ${delivery.estimatedTime}` 
                            : `Completed: ${delivery.completedTime}`}
                        </div>
                        <div className="flex items-center">
                          <FiTruck className="h-4 w-4 mr-2" />
                          {delivery.items} items • {delivery.distance}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <div className="text-sm text-gray-500">#{delivery.orderId}</div>
                      {delivery.status === 'active' && (
                        <>
                          <button className="flex items-center px-3 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700">
                            <FiNavigation className="mr-2 h-4 w-4" />
                            Navigate
                          </button>
                          <button className="flex items-center px-3 py-2 text-gray-700 bg-white border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                            <FiPhone className="mr-2 h-4 w-4" />
                            Call
                          </button>
                        </>
                      )}
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