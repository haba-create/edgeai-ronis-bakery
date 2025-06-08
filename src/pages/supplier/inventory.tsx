import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FiPackage, FiAlertTriangle, FiEdit2, FiPlus, FiSearch } from 'react-icons/fi';

export default function SupplierInventory() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');

  // Mock inventory data
  const inventory = [
    {
      id: 'SKU-001',
      name: 'Whole Wheat Flour',
      category: 'Flour',
      stock: 450,
      unit: 'kg',
      minStock: 100,
      price: '£1.20',
      status: 'good'
    },
    {
      id: 'SKU-002',
      name: 'Rye Flour',
      category: 'Flour',
      stock: 75,
      unit: 'kg',
      minStock: 50,
      price: '£1.50',
      status: 'low'
    },
    {
      id: 'SKU-003',
      name: 'Sourdough Starter',
      category: 'Ingredients',
      stock: 25,
      unit: 'liters',
      minStock: 20,
      price: '£3.50',
      status: 'good'
    },
    {
      id: 'SKU-004',
      name: 'Sesame Seeds',
      category: 'Seeds',
      stock: 15,
      unit: 'kg',
      minStock: 25,
      price: '£4.00',
      status: 'critical'
    }
  ];

  const getStockStatus = (stock: number, minStock: number) => {
    const percentage = (stock / minStock) * 100;
    if (percentage <= 50) return 'critical';
    if (percentage <= 100) return 'low';
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

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute requiredRoles={['supplier', 'admin']}>
      <DashboardLayout 
        title="Inventory Management"
        description="Track and manage your product inventory"
      >
        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">48</p>
                </div>
                <FiPackage className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-yellow-600">7</p>
                </div>
                <FiAlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">2</p>
                </div>
                <FiAlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inventory Value</p>
                  <p className="text-2xl font-bold text-gray-900">£8,450</p>
                </div>
                <FiPackage className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </div>

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
                  Add Product
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
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.stock} {item.unit}
                        </div>
                        <div className="text-xs text-gray-500">
                          Min: {item.minStock} {item.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.price}/unit
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-amber-600 hover:text-amber-900">
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}