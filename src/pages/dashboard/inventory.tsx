import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FiPackage, FiAlertTriangle, FiEdit2, FiPlus, FiSearch, FiTrendingDown, FiTrendingUp } from 'react-icons/fi';

export default function RestaurantInventory() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');

  // Mock inventory data
  const inventory = [
    {
      id: 'INV-001',
      name: 'Rye Flour',
      category: 'Flour',
      currentStock: 45,
      unit: 'kg',
      reorderPoint: 20,
      optimalStock: 80,
      lastDelivery: '2025-06-08',
      trend: 'down',
      dailyUsage: 5.2
    },
    {
      id: 'INV-002',
      name: 'Sourdough Starter',
      category: 'Ingredients',
      currentStock: 12,
      unit: 'liters',
      reorderPoint: 10,
      optimalStock: 25,
      lastDelivery: '2025-06-07',
      trend: 'up',
      dailyUsage: 1.8
    },
    {
      id: 'INV-003',
      name: 'Whole Wheat Flour',
      category: 'Flour',
      currentStock: 8,
      unit: 'kg',
      reorderPoint: 15,
      optimalStock: 50,
      lastDelivery: '2025-06-06',
      trend: 'down',
      dailyUsage: 3.5
    },
    {
      id: 'INV-004',
      name: 'Organic Milk',
      category: 'Dairy',
      currentStock: 35,
      unit: 'liters',
      reorderPoint: 20,
      optimalStock: 60,
      lastDelivery: '2025-06-08',
      trend: 'stable',
      dailyUsage: 4.1
    }
  ];

  const getStockStatus = (currentStock: number, reorderPoint: number) => {
    if (currentStock <= reorderPoint * 0.5) return 'critical';
    if (currentStock <= reorderPoint) return 'low';
    return 'good';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-100';
      case 'low':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <FiTrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <FiTrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = inventory.filter(item => getStockStatus(item.currentStock, item.reorderPoint) !== 'good');

  return (
    <ProtectedRoute requiredRoles={['client', 'admin']}>
      <DashboardLayout 
        title="Inventory"
        description="Track and manage your restaurant inventory"
      >
        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">24</p>
                </div>
                <FiPackage className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
                </div>
                <FiAlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Reorder Needed</p>
                  <p className="text-2xl font-bold text-red-600">3</p>
                </div>
                <FiAlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inventory Value</p>
                  <p className="text-2xl font-bold text-gray-900">£2,340</p>
                </div>
                <FiPackage className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          {lowStockItems.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Low Stock Alert</h3>
                  <p className="text-sm text-yellow-700">
                    {lowStockItems.length} items need reordering
                  </p>
                </div>
                <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                  Create Order
                </button>
              </div>
            </div>
          )}

          {/* Inventory Table */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search inventory..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <button className="ml-4 flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                  <FiPlus className="mr-2" />
                  Add Item
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Daily Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Delivery
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInventory.map((item) => {
                    const status = getStockStatus(item.currentStock, item.reorderPoint);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.currentStock} {item.unit}
                          </div>
                          <div className="text-xs text-gray-500">
                            Reorder at: {item.reorderPoint} {item.unit}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            {getTrendIcon(item.trend)}
                            <span className="ml-1">{item.dailyUsage} {item.unit}/day</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(item.lastDelivery).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-amber-600 hover:text-amber-900">
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}