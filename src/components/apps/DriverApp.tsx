import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import DriverChatbot from './DriverChatbot';
import { FiNavigation, FiPhone, FiMessageSquare, FiCheckCircle, FiMapPin, FiPackage, FiClock, FiCamera, FiDollarSign, FiTrendingUp } from 'react-icons/fi';
// WebSocket integration temporarily removed for build
import { useSession } from 'next-auth/react';

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
  const { data: session } = useSession();
  // WebSocket functionality temporarily disabled for build
  const connected = true;
  const updateLocation = (lat: number, lng: number, deliveryId?: number) => {};
  const updateDeliveryStatus = (id: number, status: string, data?: any) => {};
  const [currentDelivery, setCurrentDelivery] = useState<Delivery | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [showFullMap, setShowFullMap] = useState(false);
  const [driverStatus, setDriverStatus] = useState<'online' | 'busy' | 'offline'>('online');
  const [locationTracking, setLocationTracking] = useState(false);
  const [showEarnings, setShowEarnings] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [currentScreen, setCurrentScreen] = useState<'main' | 'chat'>('main');
  const [chatMessages, setChatMessages] = useState<Array<{
    text: string, 
    isUser: boolean, 
    timestamp: string,
    suggestedActions?: Array<{type: string, description: string}>,
    metadata?: any
  }>>([
    { text: "👋 Hi! I'm your delivery assistant. How can I help you today?", isUser: false, timestamp: new Date().toISOString() }
  ]);
  const [messageInput, setMessageInput] = useState('');

  // Mock driver info
  const driverInfo = {
    name: "David M.",
    vehicle: "BMW (BK23 ABC)",
    rating: 4.9,
    completedToday: 12,
    earnings: 145.50
  };

  // Start location tracking
  useEffect(() => {
    if (locationTracking && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          updateLocation(
            position.coords.latitude,
            position.coords.longitude,
            currentDelivery?.id ? parseInt(currentDelivery.id) : undefined
          );
        },
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [locationTracking, currentDelivery, updateLocation]);

  // WebSocket functionality temporarily disabled for build

  // Mock deliveries data initialization
  useEffect(() => {
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

  const completeDelivery = async () => {
    if (!currentDelivery) return;
    
    setDeliveries(prev => {
      const updated = prev.map(d => 
        d.id === currentDelivery.id ? { ...d, status: 'completed' as const } : d
      );
      const nextDelivery = updated.find(d => d.status === 'pending');
      setCurrentDelivery(nextDelivery || null);
      return updated;
    });

    // Update WebSocket
    if (currentDelivery) {
      updateDeliveryStatus(parseInt(currentDelivery.id), 'delivered', {
        completedAt: new Date().toISOString()
      });
      
      // Update earnings
      const deliveryEarnings = 5 + (currentDelivery.items * 0.5);
      setTodayEarnings(prev => prev + deliveryEarnings);
    }
  };

  const markArrived = async () => {
    if (!currentDelivery) return;
    setDeliveries(prev => 
      prev.map(d => 
        d.id === currentDelivery.id ? { ...d, status: 'arrived' as const } : d
      )
    );

    // Update WebSocket
    updateDeliveryStatus(parseInt(currentDelivery.id), 'arrived', {
      arrivedAt: new Date().toISOString()
    });
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;

    const userMessage = { text: messageInput, isUser: true, timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, userMessage]);
    setMessageInput('');

    try {
      const response = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageInput,
          role: 'driver',
          tenantId: 1, // Default tenant for demo
          userId: 1 // Working driver user ID
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const botMessage = { 
            text: data.response, 
            isUser: false, 
            timestamp: new Date().toISOString(),
            suggestedActions: data.suggestions?.map((s: string) => ({ type: 'suggestion', description: s })),
            metadata: { tools_used: data.tools_used, usage: data.usage }
          };
          setChatMessages(prev => [...prev, botMessage]);
        } else {
          const errorMessage = { 
            text: data.error || "Sorry, I encountered an error. Please try again.", 
            isUser: false, 
            timestamp: new Date().toISOString() 
          };
          setChatMessages(prev => [...prev, errorMessage]);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = { text: "Sorry, I'm having trouble connecting. Please try again.", isUser: false, timestamp: new Date().toISOString() };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <div className="bg-gray-50 flex flex-col max-w-sm mx-auto border-x border-gray-300 relative min-h-full" style={{ 
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
            <p className="text-xs opacity-90">£{(driverInfo.earnings + todayEarnings).toFixed(2)} earned</p>
          </div>
        </div>
        {/* Connection Status */}
        {!connected && (
          <div className="bg-red-600 px-2 py-1 text-xs text-center mt-2 rounded">
            ⚠️ Offline - Updates may be delayed
          </div>
        )}
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
        {currentScreen === 'chat' ? (
          <div className="h-full flex flex-col">
            {/* Chat Header */}
            <div className="bg-white border-b px-4 py-3 flex items-center">
              <button 
                onClick={() => setCurrentScreen('main')}
                className="mr-3 text-blue-600"
              >
                ← Back
              </button>
              <div>
                <h3 className="font-semibold">Driver Assistant</h3>
                <p className="text-xs text-gray-500">Get help with deliveries</p>
              </div>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs ${msg.isUser ? 'ml-12' : 'mr-12'}`}>
                    <div className={`rounded-lg p-3 ${
                      msg.isUser 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm whitespace-pre-line">{msg.text}</p>
                      <span className={`text-xs ${msg.isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                        {msg.metadata?.aiProvider && (
                          <span className="ml-2">• AI</span>
                        )}
                      </span>
                    </div>
                    
                    {/* Suggested Actions */}
                    {!msg.isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.suggestedActions.slice(0, 3).map((action, actionIdx) => (
                          <button
                            key={actionIdx}
                            className="block w-full text-left text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100"
                            onClick={() => setMessageInput(action.description)}
                          >
                            💡 {action.description}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Chat Input */}
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <button 
                  onClick={sendMessage}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        ) : (
        currentDelivery ? (
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
                  <button 
                    onClick={() => window.location.href = `tel:${currentDelivery.phone}`}
                    className="flex-1 py-3 bg-white border border-gray-300 rounded-lg flex items-center justify-center"
                  >
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
                    I&apos;ve Arrived
                  </button>
                )}

                {currentDelivery.status === 'arrived' && (
                  <div className="space-y-3">
                    <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center">
                      <FiCamera className="mr-2" />
                      Take Photo Proof
                    </button>
                    <button
                      onClick={completeDelivery}
                      className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center"
                    >
                      <FiCheckCircle className="mr-2" />
                      Complete {currentDelivery.type === 'pickup' ? 'Pickup' : 'Delivery'}
                    </button>
                  </div>
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
              You&apos;ve completed all deliveries for now. Great job!
            </p>
            <div className="bg-gray-50 rounded-lg p-4 w-full max-w-sm">
              <h4 className="font-semibold mb-2">Today&apos;s Summary</h4>
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
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t px-4 py-2">
        <div className="flex justify-around">
          <button className="flex flex-col items-center p-2">
            <FiMapPin className="text-blue-600" size={20} />
            <span className="text-xs mt-1">Route</span>
          </button>
          <button 
            onClick={() => setCurrentScreen('chat')}
            className="flex flex-col items-center p-2"
          >
            <FiMessageSquare className={currentScreen === 'chat' ? "text-blue-600" : "text-gray-600"} size={20} />
            <span className="text-xs mt-1">Chat</span>
          </button>
          <button 
            onClick={() => setShowEarnings(!showEarnings)}
            className="flex flex-col items-center p-2"
          >
            <FiDollarSign className={showEarnings ? "text-blue-600" : "text-gray-600"} size={20} />
            <span className="text-xs mt-1">Earnings</span>
          </button>
          <button 
            onClick={() => setLocationTracking(!locationTracking)}
            className="flex flex-col items-center p-2"
          >
            <div className="relative">
              <FiMapPin className={locationTracking ? "text-green-600" : "text-gray-600"} size={20} />
              {locationTracking && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
              )}
            </div>
            <span className="text-xs mt-1">Tracking</span>
          </button>
        </div>
      </div>

      {/* Earnings Overlay */}
      {showEarnings && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6" style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Earnings Summary</h3>
              <button 
                onClick={() => setShowEarnings(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Today&apos;s Earnings</span>
                  <FiTrendingUp className="text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">£{(driverInfo.earnings + todayEarnings).toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">{driverInfo.completedToday} deliveries completed</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">This Week</p>
                  <p className="text-lg font-semibold">£{(driverInfo.earnings * 5.5).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">This Month</p>
                  <p className="text-lg font-semibold">£{(driverInfo.earnings * 22).toFixed(2)}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Base Pay</span>
                  <span className="font-medium">£{(driverInfo.completedToday * 5).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Distance Bonus</span>
                  <span className="font-medium">£{((driverInfo.earnings + todayEarnings) * 0.3).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tips</span>
                  <span className="font-medium">£{((driverInfo.earnings + todayEarnings) * 0.1).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span className="text-green-600">£{(driverInfo.earnings + todayEarnings).toFixed(2)}</span>
                </div>
              </div>
              
              <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold">
                View Detailed Report
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
      
      {/* Phone Bottom */}
      <div className="bg-black h-4 rounded-b-3xl flex items-center justify-center">
        <div className="w-32 h-1 bg-gray-800 rounded-full"></div>
      </div>

      {/* Driver AI Chatbot */}
      <DriverChatbot />
    </div>
  );
}