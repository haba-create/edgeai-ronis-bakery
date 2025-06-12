import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import ClientApp from '@/components/apps/ClientApp';
import SupplierApp from '@/components/apps/SupplierApp';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Dynamically import DriverApp with no SSR for mobile-specific features
const DriverApp = dynamic(() => import('@/components/apps/DriverApp'), { 
  ssr: false,
  loading: () => <LoadingSpinner />
});

export default function AppsPage() {
  const [activeTab, setActiveTab] = useState<'client' | 'supplier' | 'driver'>('client');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const tabs = [
    { id: 'client', label: '🛒 Customer App', icon: '🛍️' },
    { id: 'supplier', label: '📦 Supplier Portal', icon: '🏪' },
    { id: 'driver', label: '🚗 Driver App', icon: '📱' }
  ];

  return (
    <>
      <Head>
        <title>Roni&apos;s Bakery - Multi-App Demo</title>
        <meta name="description" content="Experience Roni's Bakery from different perspectives" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Tab Navigation */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 py-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex-1 flex items-center justify-center px-4 py-3 rounded-lg
                    text-sm font-medium transition-all duration-200
                    ${activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="mr-2 text-xl">{tab.icon}</span>
                  <span className={isMobile ? 'hidden sm:inline' : ''}>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* App Content */}
        <div className="relative">
          {activeTab === 'client' && <ClientApp />}
          {activeTab === 'supplier' && <SupplierApp />}
          {activeTab === 'driver' && <DriverApp />}
        </div>

        {/* Demo Notice */}
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          <span className="mr-2">🎭</span>
          Demo Mode - Switch between apps to see different perspectives
        </div>
      </div>
    </>
  );
}