import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FiPlus, FiSearch, FiFilter, FiEdit2, FiTrash2, FiEye, FiTruck } from 'react-icons/fi';

export default function AdminSuppliers() {
  const { data: session } = useSession();

  // Mock data for suppliers
  const suppliers = [
    {
      id: 'hjb-1',
      name: 'Heritage Jewish Breads',
      contact: 'David Goldberg',
      email: 'david@hjb.com',
      status: 'active',
      products: 45,
      rating: 4.8
    },
    {
      id: 'gs-1',
      name: 'Green Solutions Packaging',
      contact: 'Emma Wilson',
      email: 'emma@greensolutions.com',
      status: 'active',
      products: 23,
      rating: 4.6
    },
    {
      id: 'df-1',
      name: 'Daily Fresh Dairy',
      contact: 'Michael Brown',
      email: 'michael@dailyfresh.com',
      status: 'active',
      products: 38,
      rating: 4.9
    }
  ];

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <DashboardLayout 
        title="Supplier Management"
        description="Manage all suppliers in the system"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
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
              Add Supplier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                      <FiTruck className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
                      <p className="text-sm text-gray-500">{supplier.contact}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    {supplier.status}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Email:</span>
                    <span className="text-gray-900">{supplier.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Products:</span>
                    <span className="text-gray-900">{supplier.products}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Rating:</span>
                    <div className="flex items-center">
                      <span className="text-gray-900 mr-1">{supplier.rating}</span>
                      <span className="text-yellow-400">★</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="flex-1 px-3 py-2 text-sm text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                    View Details
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <FiEdit2 className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600">
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}