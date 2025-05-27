import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface HeaderProps {
  setView: (view: 'dashboard' | 'inventory' | 'orders' | 'schedule' | 'chat') => void;
  currentView: 'dashboard' | 'inventory' | 'orders' | 'schedule' | 'chat';
}

const Header: React.FC<HeaderProps> = ({ setView, currentView }) => {
  return (
    <header className="bg-amber-800 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-3">
            {/* Logo placeholder - replace with actual logo */}
            <span className="text-amber-800 font-bold text-xl">RB</span>
          </div>
          <h1 className="text-xl font-bold">Roni's Bakery</h1>
          <span className="ml-2 text-sm text-amber-200">Belsize Park</span>
        </div>
        
        <nav>
          <ul className="flex space-x-2">
            <li>
              <button 
                onClick={() => setView('dashboard')} 
                className={`px-3 py-2 rounded-md text-sm ${currentView === 'dashboard' ? 'bg-white text-amber-800' : 'text-white hover:bg-amber-700'}`}
              >
                Dashboard
              </button>
            </li>
            <li>
              <button 
                onClick={() => setView('inventory')} 
                className={`px-3 py-2 rounded-md text-sm ${currentView === 'inventory' ? 'bg-white text-amber-800' : 'text-white hover:bg-amber-700'}`}
              >
                Inventory
              </button>
            </li>
            <li>
              <button 
                onClick={() => setView('orders')} 
                className={`px-3 py-2 rounded-md text-sm ${currentView === 'orders' ? 'bg-white text-amber-800' : 'text-white hover:bg-amber-700'}`}
              >
                Orders
              </button>
            </li>
            <li>
              <button 
                onClick={() => setView('schedule')} 
                className={`px-3 py-2 rounded-md text-sm ${currentView === 'schedule' ? 'bg-white text-amber-800' : 'text-white hover:bg-amber-700'}`}
              >
                Schedule
              </button>
            </li>
            <li>
              <button 
                onClick={() => setView('chat')} 
                className={`px-3 py-2 rounded-md text-sm ${currentView === 'chat' ? 'bg-white text-amber-800' : 'text-white hover:bg-amber-700'}`}
              >
                Assistant
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
