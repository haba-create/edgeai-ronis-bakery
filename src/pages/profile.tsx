import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FiSave, FiUser, FiLock, FiShield } from 'react-icons/fi';

export default function Profile() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('personal');

  const tabs = [
    { id: 'personal', name: 'Personal Info', icon: FiUser },
    { id: 'security', name: 'Security', icon: FiShield },
    { id: 'password', name: 'Password', icon: FiLock },
  ];

  return (
    <ProtectedRoute requiredRoles={['client', 'supplier', 'driver', 'admin']}>
      <DashboardLayout 
        title="My Profile"
        description="Manage your personal information and account settings"
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
              {activeTab === 'personal' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-6">
                    <div className="h-20 w-20 bg-amber-100 rounded-full flex items-center justify-center">
                      <FiUser className="h-10 w-10 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{session?.user?.name}</h3>
                      <p className="text-sm text-gray-500">{session?.user?.role}</p>
                      <button className="text-sm text-amber-600 hover:text-amber-700 mt-1">
                        Change photo
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <input
                        type="text"
                        defaultValue={session?.user?.name || ''}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email Address</label>
                      <input
                        type="email"
                        defaultValue={session?.user?.email || ''}
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Role</label>
                      <input
                        type="text"
                        value={session?.user?.role || ''}
                        disabled
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                      </div>
                      <button className="px-4 py-2 text-amber-600 border border-amber-600 rounded-lg hover:bg-amber-50">
                        Enable
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Login Notifications</h4>
                        <p className="text-sm text-gray-500">Get notified when someone logs into your account</p>
                      </div>
                      <button className="relative inline-flex items-center h-6 rounded-full w-11 bg-amber-600">
                        <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform" />
                      </button>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Activity</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Login from London, UK</span>
                          <span>2 hours ago</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Password changed</span>
                          <span>3 days ago</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Login from London, UK</span>
                          <span>1 week ago</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'password' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
                  <div className="max-w-md space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Password</label>
                      <input
                        type="password"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">New Password</label>
                      <input
                        type="password"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                      <input
                        type="password"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>Password requirements:</p>
                      <ul className="list-disc list-inside mt-1">
                        <li>At least 8 characters long</li>
                        <li>Include uppercase and lowercase letters</li>
                        <li>Include at least one number</li>
                        <li>Include at least one special character</li>
                      </ul>
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