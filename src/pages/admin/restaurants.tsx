import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FiPlus, FiSearch, FiFilter, FiEdit2, FiTrash2, FiEye } from 'react-icons/fi';

export default function AdminRestaurants() {
  const { data: session } = useSession();

  // Mock data for restaurants
  const restaurants = [
    {
      id: 'rb-main',
      name: "Roni's Bakery - Main",
      address: '123 High Street, London',
      manager: 'Sarah Johnson',
      status: 'active',
      orders: 156,
      revenue: '£12,450'
    },
    {
      id: 'rb-belsize',
      name: "Roni's Bakery - Belsize Park",
      address: '45 Belsize Lane, London',
      manager: 'David Cohen',
      status: 'active',
      orders: 98,
      revenue: '£8,230'
    }
  ];

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <DashboardLayout 
        title="Restaurant Management"
        description="Manage all restaurants in the system"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search restaurants..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                <FiFilter className="mr-2" />
                Filter
              </button>
            </div>
            <button className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
              <FiPlus className="mr-2" />
              Add Restaurant
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {restaurants.map((restaurant) => (
                  <tr key={restaurant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{restaurant.name}</div>
                        <div className="text-sm text-gray-500">{restaurant.address}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{restaurant.manager}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {restaurant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{restaurant.orders}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{restaurant.revenue}</td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <button className="text-amber-600 hover:text-amber-900">
                          <FiEye />
                        </button>
                        <button className="text-blue-600 hover:text-blue-900">
                          <FiEdit2 />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}