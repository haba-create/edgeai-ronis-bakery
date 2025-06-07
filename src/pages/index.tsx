import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Dashboard from '@/components/Dashboard';
import ChatInterface from '@/components/ChatInterface';
import AppHeader from '@/components/AppHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import InventoryView from '@/components/InventoryView';
import OrdersView from '@/components/OrdersView';
import OrderingSchedule from '@/components/OrderingSchedule';
import { initDatabase } from '@/utils/db';

export default function Home() {
  const [view, setView] = useState<'dashboard' | 'inventory' | 'orders' | 'schedule' | 'chat'>('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize and seed the database on first load
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize database (only seeds if empty)
        await fetch('/api/seed', { method: 'POST' });
        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setInitError('Failed to initialize the application. Please refresh the page.');
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Roni's Bakery - Inventory Management</title>
        <meta name="description" content="AI-powered inventory management for Roni's Bakery" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <AppHeader />
      
      {/* New Multi-App Experience Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🎭</span>
              <div>
                <h3 className="font-semibold">Experience Roni's from Multiple Perspectives!</h3>
                <p className="text-sm opacity-90">Try our new Customer, Supplier & Driver apps with realistic maps and AI assistants</p>
              </div>
            </div>
            <Link 
              href="/apps"
              className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Try Multi-App Demo →
            </Link>
          </div>
        </div>
      </div>
      
      {/* Client Portal Navigation */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4">
          <nav className="flex space-x-8">
            <button
              onClick={() => setView('dashboard')}
              className={`py-4 px-2 border-b-2 text-sm font-medium ${
                view === 'dashboard'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setView('inventory')}
              className={`py-4 px-2 border-b-2 text-sm font-medium ${
                view === 'inventory'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Inventory
            </button>
            <button
              onClick={() => setView('orders')}
              className={`py-4 px-2 border-b-2 text-sm font-medium ${
                view === 'orders'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setView('schedule')}
              className={`py-4 px-2 border-b-2 text-sm font-medium ${
                view === 'schedule'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Schedule
            </button>
            <button
              onClick={() => setView('chat')}
              className={`py-4 px-2 border-b-2 text-sm font-medium ${
                view === 'chat'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              AI Assistant
            </button>
          </nav>
        </div>
      </div>
      
      <main className="container mx-auto px-4 py-8">
        {isInitializing ? (
          <LoadingSpinner message="Initializing application..." />
        ) : initError ? (
          <div className="p-4 bg-red-100 text-red-800 rounded-md">{initError}</div>
        ) : (
          {
            'dashboard': <Dashboard />,
            'inventory': <InventoryView />,
            'orders': <OrdersView />,
            'schedule': <OrderingSchedule />,
            'chat': <ChatInterface />
          }[view]
        )}
      </main>

      <footer className="container mx-auto p-4 text-center text-gray-500 text-sm">
        Roni's Bakery - Belsize Park | Powered by EdgeAI
      </footer>
    </div>
  );
}
