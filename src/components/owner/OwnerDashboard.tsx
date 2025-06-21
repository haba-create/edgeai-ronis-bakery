import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Dashboard from '@/components/Dashboard';
import InventoryView from '@/components/InventoryView';
import OrdersView from '@/components/OrdersView';
import OrderingSchedule from '@/components/OrderingSchedule';
import OwnerChatbot from './OwnerChatbot';
import ActivityLog from '@/components/ActivityLog';
import AgentNotifications from '@/components/AgentNotifications';
import { FiMessageCircle, FiX, FiHome, FiBox, FiShoppingCart, FiCalendar, FiActivity } from 'react-icons/fi';

type ActiveTab = 'dashboard' | 'inventory' | 'orders' | 'schedule' | 'activity';

const OwnerDashboard: React.FC = () => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [showChatbot, setShowChatbot] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Business Dashboard', icon: FiHome },
    { id: 'inventory', label: 'Bakery Supplies', icon: FiBox },
    { id: 'orders', label: 'Supplier Orders', icon: FiShoppingCart },
    { id: 'schedule', label: 'Supply Schedule', icon: FiCalendar },
    { id: 'activity', label: 'Agent Activity', icon: FiActivity },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <InventoryView />;
      case 'orders':
        return <OrdersView />;
      case 'schedule':
        return <OrderingSchedule />;
      case 'activity':
        return <ActivityLog tenantId={1} limit={100} showFilters={true} />;
      default:
        return <Dashboard />;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Bakery Business Overview';
      case 'inventory':
        return 'Bakery Supply Management';
      case 'orders':
        return 'Supplier Purchase Orders';
      case 'schedule':
        return 'Supply Ordering Schedule';
      case 'activity':
        return 'AI Agent Activity Monitor';
      default:
        return 'Bakery Operations Management';
    }
  };

  const getTabDescription = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Monitor bakery business performance, ingredient stock levels, and key operational metrics';
      case 'inventory':
        return 'Track ingredient stock levels, manage bakery supplies, and monitor usage consumption';
      case 'orders':
        return 'Manage supplier purchase orders, ingredient deliveries, and supplier relationships';
      case 'schedule':
        return 'Plan and schedule regular ingredient and supply orders from your suppliers';
      case 'activity':
        return 'Monitor AI agent actions, database changes, and system activities in real-time';
      default:
        return 'Manage your bakery supply chain and operations efficiently';
    }
  };

  return (
    <DashboardLayout 
      title={getTabTitle()}
      description={getTabDescription()}
    >
      <div className="flex h-full">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Bakery Management</h2>
            <p className="text-sm text-gray-500">Supply Chain & Operations</p>
            <p className="text-xs text-gray-400 mt-1">Welcome, {session?.user?.name}</p>
          </div>
          
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id as ActiveTab)}
                      className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {tab.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          
          {/* AI Assistant Button */}
          <div className="p-4 border-t">
            <button
              onClick={() => setShowChatbot(true)}
              className="w-full flex items-center justify-center px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              <FiMessageCircle className="h-5 w-5 mr-2" />
              Supply Chain Assistant
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              AI-powered insights for ingredients, suppliers, and operations
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Owner AI Chatbot */}
      {showChatbot && (
        <div className="fixed inset-0 z-[50] overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowChatbot(false)} />
          <div className="absolute right-4 bottom-4 top-4 w-full max-w-md bg-white rounded-lg shadow-xl">
            <OwnerChatbot onClose={() => setShowChatbot(false)} />
          </div>
        </div>
      )}

      {/* Real-time Agent Notifications */}
      <AgentNotifications 
        position="top-right"
        maxNotifications={3}
        autoHideDelay={10000}
      />
    </DashboardLayout>
  );
};

export default OwnerDashboard;