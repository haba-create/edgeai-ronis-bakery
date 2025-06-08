import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FiSave, FiGlobe, FiBell, FiEye, FiMoon } from 'react-icons/fi';

export default function Settings() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', name: 'General', icon: FiGlobe },
    { id: 'notifications', name: 'Notifications', icon: FiBell },
    { id: 'appearance', name: 'Appearance', icon: FiEye },
    { id: 'privacy', name: 'Privacy', icon: FiMoon },
  ];

  return (
    <ProtectedRoute requiredRoles={['client', 'supplier', 'driver', 'admin']}>
      <DashboardLayout 
        title="Settings"
        description="Manage your application preferences"
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
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">General Preferences</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Language</label>
                      <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                        <option>English (UK)</option>
                        <option>English (US)</option>
                        <option>French</option>
                        <option>German</option>
                        <option>Spanish</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Timezone</label>
                      <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                        <option>Europe/London (GMT)</option>
                        <option>America/New_York (EST)</option>
                        <option>Europe/Paris (CET)</option>
                        <option>Asia/Tokyo (JST)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date Format</label>
                      <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                        <option>DD/MM/YYYY</option>
                        <option>MM/DD/YYYY</option>
                        <option>YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Currency</label>
                      <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                        <option>GBP (£)</option>
                        <option>USD ($)</option>
                        <option>EUR (€)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                        <p className="text-sm text-gray-500">Receive important updates via email</p>
                      </div>
                      <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-amber-600">
                        <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                        <p className="text-sm text-gray-500">Get browser notifications for urgent updates</p>
                      </div>
                      <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-amber-600">
                        <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Marketing Communications</h4>
                        <p className="text-sm text-gray-500">Receive product updates and marketing emails</p>
                      </div>
                      <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-gray-200">
                        <span className="translate-x-1 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Appearance Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input type="radio" name="theme" defaultChecked className="h-4 w-4 text-amber-600" />
                          <span className="ml-2 text-sm text-gray-700">Light</span>
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="theme" className="h-4 w-4 text-amber-600" />
                          <span className="ml-2 text-sm text-gray-700">Dark</span>
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="theme" className="h-4 w-4 text-amber-600" />
                          <span className="ml-2 text-sm text-gray-700">System</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Density</label>
                      <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                        <option>Comfortable</option>
                        <option>Compact</option>
                        <option>Spacious</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Animations</h4>
                        <p className="text-sm text-gray-500">Enable interface animations and transitions</p>
                      </div>
                      <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-amber-600">
                        <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Usage Analytics</h4>
                        <p className="text-sm text-gray-500">Help improve the app by sharing usage data</p>
                      </div>
                      <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-amber-600">
                        <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Crash Reports</h4>
                        <p className="text-sm text-gray-500">Automatically send crash reports to help fix bugs</p>
                      </div>
                      <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-amber-600">
                        <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Data Sharing</h4>
                        <p className="text-sm text-gray-500">Share anonymized data with partners</p>
                      </div>
                      <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-gray-200">
                        <span className="translate-x-1 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                      </button>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Data Management</h4>
                      <div className="space-y-2">
                        <button className="text-sm text-amber-600 hover:text-amber-700">
                          Download your data
                        </button>
                        <br />
                        <button className="text-sm text-red-600 hover:text-red-700">
                          Delete your account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-6 flex justify-end">
                <button className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                  <FiSave className="mr-2" />
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}