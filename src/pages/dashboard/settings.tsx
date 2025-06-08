import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FiSave, FiHome, FiBell, FiUsers, FiClock } from 'react-icons/fi';

export default function RestaurantSettings() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('restaurant');

  const tabs = [
    { id: 'restaurant', name: 'Restaurant', icon: FiHome },
    { id: 'hours', name: 'Operating Hours', icon: FiClock },
    { id: 'staff', name: 'Staff', icon: FiUsers },
    { id: 'notifications', name: 'Notifications', icon: FiBell },
  ];

  return (
    <ProtectedRoute requiredRoles={['client', 'admin']}>
      <DashboardLayout 
        title="Restaurant Settings"
        description="Manage your restaurant settings and preferences"
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
              {activeTab === 'restaurant' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Restaurant Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Restaurant Name</label>
                      <input
                        type="text"
                        defaultValue="Roni's Bakery - Main"
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
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <textarea
                        rows={2}
                        defaultValue="123 High Street, London, NW1 2AB"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'hours' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Operating Hours</h3>
                  <div className="space-y-4">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                      <div key={day} className="grid grid-cols-4 gap-4 items-center">
                        <div className="col-span-1">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              defaultChecked={day !== 'Sunday'}
                              className="h-4 w-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">{day}</span>
                          </label>
                        </div>
                        <div>
                          <input
                            type="time"
                            defaultValue="06:00"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="text-center text-gray-500">to</div>
                        <div>
                          <input
                            type="time"
                            defaultValue="18:00"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Low Stock Alerts</h4>
                        <p className="text-sm text-gray-500">Get notified when inventory is running low</p>
                      </div>
                      <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-amber-600">
                        <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Order Updates</h4>
                        <p className="text-sm text-gray-500">Receive notifications about order status changes</p>
                      </div>
                      <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-amber-600">
                        <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Delivery Notifications</h4>
                        <p className="text-sm text-gray-500">Get alerts when deliveries arrive</p>
                      </div>
                      <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-gray-200">
                        <span className="translate-x-1 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                      </button>
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