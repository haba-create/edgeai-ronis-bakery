import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FiSave, FiUser, FiTruck, FiBell, FiMapPin } from 'react-icons/fi';

export default function DriverSettings() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', name: 'Profile', icon: FiUser },
    { id: 'vehicle', name: 'Vehicle', icon: FiTruck },
    { id: 'location', name: 'Location', icon: FiMapPin },
    { id: 'notifications', name: 'Notifications', icon: FiBell },
  ];

  return (
    <ProtectedRoute requiredRoles={['driver', 'admin']}>
      <DashboardLayout 
        title="Driver Settings"
        description="Manage your driver profile and preferences"
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
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input
                          type="text"
                          defaultValue="Michael Johnson"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Driver License Number</label>
                        <input
                          type="text"
                          defaultValue="DL123456789"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                        <input
                          type="tel"
                          defaultValue="+44 20 7555 0123"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
                        <input
                          type="tel"
                          defaultValue="+44 20 7555 9876"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Home Address</label>
                        <textarea
                          rows={2}
                          defaultValue="45 Residential Street, London, NW2 3XT"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'vehicle' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Vehicle Make</label>
                        <input
                          type="text"
                          defaultValue="Ford"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Vehicle Model</label>
                        <input
                          type="text"
                          defaultValue="Transit Connect"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Registration Number</label>
                        <input
                          type="text"
                          defaultValue="AB12 CDE"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Vehicle Year</label>
                        <input
                          type="number"
                          defaultValue="2022"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Insurance Policy Number</label>
                        <input
                          type="text"
                          defaultValue="INS123456789"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">MOT Expiry Date</label>
                        <input
                          type="date"
                          defaultValue="2025-08-15"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'location' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Location Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Location Tracking</h4>
                          <p className="text-sm text-gray-500">Allow the system to track your location for delivery optimization</p>
                        </div>
                        <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-amber-600">
                          <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Auto Check-in</h4>
                          <p className="text-sm text-gray-500">Automatically check in when arriving at delivery locations</p>
                        </div>
                        <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-amber-600">
                          <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                        </button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Preferred Work Area</label>
                        <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                          <option>North London</option>
                          <option>South London</option>
                          <option>East London</option>
                          <option>West London</option>
                          <option>Central London</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Maximum Delivery Radius (km)</label>
                        <input
                          type="number"
                          defaultValue="15"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
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
                          <h4 className="text-sm font-medium text-gray-900">New Delivery Assignments</h4>
                          <p className="text-sm text-gray-500">Get notified when new deliveries are assigned</p>
                        </div>
                        <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-amber-600">
                          <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Route Updates</h4>
                          <p className="text-sm text-gray-500">Receive notifications about route changes</p>
                        </div>
                        <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-amber-600">
                          <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Traffic Alerts</h4>
                          <p className="text-sm text-gray-500">Get alerts about traffic conditions on your route</p>
                        </div>
                        <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-gray-200">
                          <span className="translate-x-1 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                        </button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Notification Method</label>
                        <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                          <option>Push Notifications</option>
                          <option>SMS</option>
                          <option>Email</option>
                          <option>All Methods</option>
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