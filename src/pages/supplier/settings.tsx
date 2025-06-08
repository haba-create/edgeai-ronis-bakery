import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FiSave, FiTruck, FiClock, FiBell, FiDollarSign } from 'react-icons/fi';

export default function SupplierSettings() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('business');

  const tabs = [
    { id: 'business', name: 'Business Info', icon: FiTruck },
    { id: 'delivery', name: 'Delivery Settings', icon: FiClock },
    { id: 'notifications', name: 'Notifications', icon: FiBell },
    { id: 'payment', name: 'Payment', icon: FiDollarSign },
  ];

  return (
    <ProtectedRoute requiredRoles={['supplier', 'admin']}>
      <DashboardLayout 
        title="Supplier Settings"
        description="Manage your supplier account settings and preferences"
      >
        <div className="p-6">
          <div className="bg-white rounded-lg shadow">
            {/* Tabs */}
            <div className="border-b">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center py-4 px-1 border-b-2 font-medium text-sm
                        ${activeTab === tab.id
                          ? 'border-amber-500 text-amber-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'business' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Business Name</label>
                        <input
                          type="text"
                          defaultValue="Heritage Jewish Breads"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Registration Number</label>
                        <input
                          type="text"
                          defaultValue="GB123456789"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                        <input
                          type="email"
                          defaultValue="orders@hjb.com"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                        <input
                          type="tel"
                          defaultValue="+44 20 7123 4567"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Business Address</label>
                        <textarea
                          rows={3}
                          defaultValue="123 Bakery Lane, London, NW3 2RG"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'delivery' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Days</label>
                        <div className="space-y-2">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                            <label key={day} className="flex items-center">
                              <input
                                type="checkbox"
                                defaultChecked={!['Saturday', 'Sunday'].includes(day)}
                                className="h-4 w-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">{day}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Delivery Start Time</label>
                          <input
                            type="time"
                            defaultValue="06:00"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Delivery End Time</label>
                          <input
                            type="time"
                            defaultValue="12:00"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Minimum Order Value</label>
                        <div className="mt-1 relative rounded-lg shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">£</span>
                          </div>
                          <input
                            type="number"
                            defaultValue="50"
                            className="pl-7 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">New Orders</h4>
                          <p className="text-sm text-gray-500">Receive notifications for new orders</p>
                        </div>
                        <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-amber-600">
                          <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Order Changes</h4>
                          <p className="text-sm text-gray-500">Get notified when orders are modified</p>
                        </div>
                        <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-amber-600">
                          <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Low Stock Alerts</h4>
                          <p className="text-sm text-gray-500">Alert when inventory is running low</p>
                        </div>
                        <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-gray-200">
                          <span className="translate-x-1 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                        </button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Notification Email</label>
                        <input
                          type="email"
                          defaultValue="notifications@hjb.com"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'payment' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                        <input
                          type="text"
                          defaultValue="Barclays Bank"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Sort Code</label>
                          <input
                            type="text"
                            defaultValue="20-12-34"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Account Number</label>
                          <input
                            type="text"
                            defaultValue="12345678"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">VAT Number</label>
                        <input
                          type="text"
                          defaultValue="GB123456789"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Payment Terms</label>
                        <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                          <option>Net 30</option>
                          <option>Net 15</option>
                          <option>Due on Receipt</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-6 flex justify-end">
                <button className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                  <FiSave className="mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}