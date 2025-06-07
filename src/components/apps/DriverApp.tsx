import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import DriverChatbot from './DriverChatbot';
import { FiNavigation, FiPhone, FiMessageSquare, FiCheckCircle, FiMapPin, FiPackage, FiClock } from 'react-icons/fi';

// Dynamically import map component
const DriverMap = dynamic(() => import('./DriverMap'), { 
  ssr: false,
  loading: () => <div className="h-full bg-gray-100 animate-pulse" />
});

interface Delivery {
  id: string;
  orderNumber: string;
  type: 'pickup' | 'delivery';
  customerName: string;
  address: string;
  items: number;
  status: 'pending' | 'arrived' | 'completed';
  eta: Date;
  phone: string;
  instructions?: string;
  location: [number, number];
}

export default function DriverApp() {
  const [currentDelivery, setCurrentDelivery] = useState<Delivery | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [showFullMap, setShowFullMap] = useState(false);
  const [driverStatus, setDriverStatus] = useState<'online' | 'busy' | 'offline'>('online');

  // Mock driver info
  const driverInfo = {
    name: "David M.",
    vehicle: "BMW (BK23 ABC)",
    rating: 4.9,
    completedToday: 12,
    earnings: 145.50
  };

  useEffect(() => {
    // Mock deliveries
    const mockDeliveries: Delivery[] = [
      {
        id: '1',
        orderNumber: 'ORD-001',
        type: 'pickup',
        customerName: 'Heritage Jewish Breads',
        address: '42 Industrial Way, N7 9QJ',
        items: 3,
        status: 'pending',
        eta: new Date(Date.now() + 600000),
        phone: '+44 20 7123 4567',
        location: [51.5874, -0.1469]
      },
      {
        id: '2',
        orderNumber: 'ORD-001',
        type: 'delivery',
        customerName: 'Roni\'s Belsize Park',
        address: '15 Belsize Terrace, NW3 4AX',
        items: 3,
        status: 'pending',
        eta: new Date(Date.now() + 1800000),
        phone: '+44 20 7456 7890',
        instructions: 'Use side entrance for deliveries',
        location: [51.5461, -0.1642]
      },
      {
        id: '3',
        orderNumber: 'ORD-003',
        type: 'delivery',
        customerName: 'Roni\'s West Hampstead',
        address: '234 West End Lane, NW6 1LG',
        items: 2,
        status: 'pending',
        eta: new Date(Date.now() + 3600000),
        phone: '+44 20 7789 0123',
        location: [51.5468, -0.1909]
      }
    ];
    
    setDeliveries(mockDeliveries);
    setCurrentDelivery(mockDeliveries[0]);
  }, []);

  const completeDelivery = () => {
    if (!currentDelivery) return;
    
    setDeliveries(prev => {
      const updated = prev.map(d => 
        d.id === currentDelivery.id ? { ...d, status: 'completed' as const } : d
      );
      const nextDelivery = updated.find(d => d.status === 'pending');
      setCurrentDelivery(nextDelivery || null);
      return updated;
    });
  };

  const markArrived = () => {
    if (!currentDelivery) return;
    setDeliveries(prev => 
      prev.map(d => 
        d.id === currentDelivery.id ? { ...d, status: 'arrived' as const } : d
      )
    );
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col max-w-sm mx-auto border-x border-gray-300 relative" style={{ 
      paddingBottom: 'env(safe-area-inset-bottom)',
      minHeight: '667px', // iPhone SE height
      maxHeight: '896px', // iPhone 11 height
      backgroundColor: '#000'
    }}>
      {/* Phone Notch/Top */}
      <div className="bg-black h-6 flex items-center justify-center rounded-t-3xl">
        <div className="w-16 h-1 bg-gray-800 rounded-full"></div>
      </div>
      
      {/* Phone Screen */}
      <div className="flex-1 bg-gray-50 flex flex-col">
      {/* Mobile Status Bar */}
      <div className="bg-blue-600 text-white px-4 py-1 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-medium">📱 Driver</span>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                driverStatus === 'online' ? 'bg-green-400' : 
                driverStatus === 'busy' ? 'bg-yellow-400' : 'bg-gray-400'
              }`} />
              <span className="text-xs">{driverInfo.name}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span>📶</span>
            <span>📶📶📶</span>
            <span>🔋 85%</span>
            <span>2:47 PM</span>
          </div>
        </div>
      </div>
      
      {/* App Header */}
      <div className="bg-blue-700 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              driverStatus === 'online' ? 'bg-green-400' : 
              driverStatus === 'busy' ? 'bg-yellow-400' : 'bg-gray-400'
            }`} />
            <div>
              <p className="font-medium">{driverInfo.name}</p>
              <p className="text-xs opacity-90">{driverInfo.vehicle}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{driverInfo.completedToday} done</p>
            <p className="text-xs opacity-90">£{driverInfo.earnings.toFixed(2)} earned</p>
          </div>
        </div>
      </div>

      {/* Map View */}
      <div className={`relative ${showFullMap ? 'flex-1' : 'h-64'} transition-all`}>
        <DriverMap currentDelivery={currentDelivery} deliveries={deliveries} />
        
        {/* Map Toggle Button */}
        <button
          onClick={() => setShowFullMap(!showFullMap)}
          className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2"
        >
          {showFullMap ? '📍 Show Details' : '🗺️ Full Map'}
        </button>

        {/* Current Navigation */}
        {currentDelivery && (
          <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">
                  {currentDelivery.type === 'pickup' ? 'Pick up from' : 'Deliver to'}
                </p>
                <p className="font-semibold">{currentDelivery.customerName}</p>
                <p className="text-sm text-gray-600">ETA: {currentDelivery.eta.toLocaleTimeString()}</p>
              </div>
              <button className="p-3 bg-blue-600 text-white rounded-lg">
                <FiNavigation size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-white">
        {currentDelivery ? (
          <div className="p-4">
            {/* Current Task Card */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Current Task</h2>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  currentDelivery.type === 'pickup' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {currentDelivery.type === 'pickup' ? '📦 Pickup' : '🚚 Delivery'}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Order #{currentDelivery.orderNumber}</p>
                  <p className="font-medium">{currentDelivery.customerName}</p>
                  <p className="text-sm text-gray-600">{currentDelivery.address}</p>
                </div>

                <div className="flex items-center space-x-4 text-sm">
                  <span className="flex items-center">
                    <FiPackage className="mr-1" />
                    {currentDelivery.items} items
                  </span>
                  <span className="flex items-center">
                    <FiClock className="mr-1" />
                    {Math.round((currentDelivery.eta.getTime() - Date.now()) / 60000)} min
                  </span>
                </div>

                {currentDelivery.instructions && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                    <p className="text-sm text-yellow-800">
                      ⚠️ {currentDelivery.instructions}
                    </p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button className="flex-1 py-3 bg-white border border-gray-300 rounded-lg flex items-center justify-center">
                    <FiPhone className="mr-2" />
                    Call
                  </button>
                  <button className="flex-1 py-3 bg-white border border-gray-300 rounded-lg flex items-center justify-center">
                    <FiMessageSquare className="mr-2" />
                    Message
                  </button>
                </div>

                {currentDelivery.status === 'pending' && (
                  <button
                    onClick={markArrived}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold"
                  >
                    I've Arrived
                  </button>
                )}

                {currentDelivery.status === 'arrived' && (
                  <button
                    onClick={completeDelivery}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center"
                  >
                    <FiCheckCircle className="mr-2" />
                    Complete {currentDelivery.type === 'pickup' ? 'Pickup' : 'Delivery'}
                  </button>
                )}
              </div>
            </div>

            {/* Upcoming Deliveries */}
            <div>
              <h3 className="font-semibold mb-3">Upcoming Tasks</h3>
              <div className="space-y-2">
                {deliveries
                  .filter(d => d.status === 'pending' && d.id !== currentDelivery.id)
                  .map(delivery => (
                    <div key={delivery.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{delivery.customerName}</p>
                          <p className="text-xs text-gray-600">
                            {delivery.type === 'pickup' ? 'Pickup' : 'Delivery'} • {delivery.eta.toLocaleTimeString()}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {Math.round((delivery.eta.getTime() - Date.now()) / 60000)} min
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold mb-2">All Done!</h3>
            <p className="text-gray-600 text-center mb-6">
              You've completed all deliveries for now. Great job!
            </p>
            <div className="bg-gray-50 rounded-lg p-4 w-full max-w-sm">
              <h4 className="font-semibold mb-2">Today's Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Deliveries</span>
                  <span className="font-medium">{driverInfo.completedToday}</span>
                </div>
                <div className="flex justify-between">
                  <span>On-time rate</span>
                  <span className="font-medium text-green-600">98%</span>
                </div>
                <div className="flex justify-between">
                  <span>Earnings</span>
                  <span className="font-medium">£{driverInfo.earnings.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t px-4 py-2">
        <div className="flex justify-around">
          <button className="flex flex-col items-center p-2">
            <FiMapPin className="text-blue-600" size={20} />
            <span className="text-xs mt-1">Route</span>
          </button>
          <button className="flex flex-col items-center p-2">
            <FiPackage className="text-gray-600" size={20} />
            <span className="text-xs mt-1">Tasks</span>
          </button>
          <button className="flex flex-col items-center p-2">
            <FiClock className="text-gray-600" size={20} />
            <span className="text-xs mt-1">History</span>
          </button>
          <button className="flex flex-col items-center p-2">
            <div className="relative">
              <FiMessageSquare className="text-gray-600" size={20} />
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </div>
            <span className="text-xs mt-1">Help</span>
          </button>
        </div>
      </div>

      {/* Chatbot */}
      <DriverChatbot />
      </div>
      
      {/* Phone Bottom */}
      <div className="bg-black h-4 rounded-b-3xl flex items-center justify-center">
        <div className="w-32 h-1 bg-gray-800 rounded-full"></div>
      </div>
    </div>
  );
}