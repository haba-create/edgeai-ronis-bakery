import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const AppHeader: React.FC = () => {
  const router = useRouter();

  const isActive = (path: string) => router.pathname === path;

  return (
    <header className="bg-amber-800 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-3">
              <span className="text-amber-800 font-bold text-xl">RB</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">Roni&apos;s Bakery</h1>
              <span className="text-sm text-amber-200">Multi-Platform Ordering System</span>
            </div>
          </div>
          
          <nav>
            <ul className="flex space-x-1">
              <li>
                <Link 
                  href="/"
                  className={`px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive('/') 
                      ? 'bg-white text-amber-800' 
                      : 'text-white hover:bg-amber-700'
                  }`}
                >
                  Client Portal
                </Link>
              </li>
              <li>
                <Link 
                  href="/supplier-portal"
                  className={`px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive('/supplier-portal') 
                      ? 'bg-white text-amber-800' 
                      : 'text-white hover:bg-amber-700'
                  }`}
                >
                  Supplier Portal
                </Link>
              </li>
              <li>
                <Link 
                  href="/delivery-tracking"
                  className={`px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive('/delivery-tracking') 
                      ? 'bg-white text-amber-800' 
                      : 'text-white hover:bg-amber-700'
                  }`}
                >
                  Delivery Tracking
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;