import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FiSave, FiShield, FiGlobe, FiMail, FiDatabase, FiDollarSign } from 'react-icons/fi';

export default function AdminSettings() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', name: 'General', icon: FiGlobe },
    { id: 'security', name: 'Security', icon: FiShield },
    { id: 'email', name: 'Email', icon: FiMail },
    { id: 'database', name: 'Database', icon: FiDatabase },
    { id: 'billing', name: 'Billing', icon: FiDollarSign },
  ];

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <DashboardLayout 
        title="System Settings"
        description="Configure system-wide settings and preferences"
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
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">System Name</label>
                        <input
                          type="text"
                          defaultValue="Roni's Bakery Management System"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Default Currency</label>
                        <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                          <option>GBP (£)</option>
                          <option>USD ($)</option>
                          <option>EUR (€)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Timezone</label>
                        <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                          <option>Europe/London</option>
                          <option>America/New_York</option>
                          <option>Asia/Tokyo</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                          <p className="text-sm text-gray-500">Require 2FA for all admin accounts</p>
                        </div>
                        <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-amber-600">
                          <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Session Timeout</h4>
                          <p className="text-sm text-gray-500">Automatically log out inactive users</p>
                        </div>
                        <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
                          <option>30 minutes</option>
                          <option>1 hour</option>
                          <option>2 hours</option>
                          <option>Never</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'email' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Email Configuration</h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">SMTP Server</label>
                        <input
                          type="text"
                          placeholder="smtp.example.com"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Port</label>
                          <input
                            type="text"
                            defaultValue="587"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Encryption</label>
                          <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                            <option>TLS</option>
                            <option>SSL</option>
                            <option>None</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'database' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Database Maintenance</h3>
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Database Status</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Type:</span>
                            <span className="text-gray-900">SQLite</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Size:</span>
                            <span className="text-gray-900">124.5 MB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last Backup:</span>
                            <span className="text-gray-900">2 hours ago</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-4">
                        <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                          Backup Now
                        </button>
                        <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                          Optimize Database
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Billing & Subscription</h3>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-amber-800">
                        Current plan: <strong>Enterprise</strong> - All features unlocked
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Default Billing Currency</label>
                        <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                          <option>GBP (£)</option>
                          <option>USD ($)</option>
                          <option>EUR (€)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                        <input
                          type="number"
                          defaultValue="20"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
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