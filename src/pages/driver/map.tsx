import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FiMapPin, FiNavigation, FiClock, FiTruck, FiRefreshCw } from 'react-icons/fi';

export default function DriverMap() {
  const { data: session } = useSession();
  const [selectedRoute, setSelectedRoute] = useState('optimal');

  // Mock route data
  const routes = [
    {
      id: 'optimal',
      name: 'Optimal Route',
      distance: '12.4 km',
      duration: '35 min',
      stops: 4,
      fuelCost: '£3.20'
    },
    {
      id: 'fastest',
      name: 'Fastest Route',
      distance: '14.8 km',
      duration: '28 min',
      stops: 4,
      fuelCost: '£3.80'
    },
    {
      id: 'shortest',
      name: 'Shortest Route',
      distance: '11.2 km',
      duration: '42 min',
      stops: 4,
      fuelCost: '£2.90'
    }
  ];

  const deliveryStops = [
    {
      id: 1,
      name: "Roni's Bakery - Main",
      address: '123 High Street, London',
      time: '10:30 AM',
      status: 'next',
      items: 8
    },
    {
      id: 2,
      name: "Roni's Bakery - Belsize Park",
      address: '45 Belsize Lane, London',
      time: '11:15 AM',
      status: 'pending',
      items: 5
    },
    {
      id: 3,
      name: "Corner Cafe",
      address: '67 Camden Road, London',
      time: '12:00 PM',
      status: 'pending',
      items: 3
    },
    {
      id: 4,
      name: "The Local Bakery",
      address: '89 Regent Street, London',
      time: '12:45 PM',
      status: 'pending',
      items: 6
    }
  ];

  const getStopStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'next':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-gray-300';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <ProtectedRoute requiredRoles={['driver', 'admin']}>
      <DashboardLayout 
        title="Route Map"
        description="View and optimize your delivery routes"
      >
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Route Options */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Options</h3>
                <div className="space-y-3">
                  {routes.map((route) => (
                    <div
                      key={route.id}
                      onClick={() => setSelectedRoute(route.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedRoute === route.id
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{route.name}</h4>
                        {selectedRoute === route.id && (
                          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Distance:</span>
                          <span>{route.distance}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Duration:</span>
                          <span>{route.duration}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Stops:</span>
                          <span>{route.stops}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fuel Cost:</span>
                          <span>{route.fuelCost}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                  <FiNavigation className="mr-2" />
                  Start Navigation
                </button>
              </div>

              {/* Delivery Stops */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Delivery Stops</h3>
                  <button className="p-2 text-gray-600 hover:text-gray-900">
                    <FiRefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  {deliveryStops.map((stop, index) => (
                    <div key={stop.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${getStopStatusColor(stop.status)}`}>
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{stop.name}</h4>
                          <span className="text-xs text-gray-500">{stop.time}</span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{stop.address}</p>
                        <p className="text-xs text-gray-500">{stop.items} items</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Map Area */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border p-6 h-96 lg:h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Live Map</h3>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg">
                      <FiClock className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg">
                      <FiTruck className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Placeholder for map */}
                <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center relative">
                  <div className="text-center">
                    <FiMapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Interactive Map View</p>
                    <p className="text-sm text-gray-400 mt-1">Map integration would go here</p>
                  </div>
                  
                  {/* Mock route overlay */}
                  <div className="absolute top-4 left-4 bg-white rounded-lg shadow p-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Current Location</span>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow p-3">
                    <div className="text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-600">ETA to next stop:</span>
                        <span className="font-medium">12 min</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Distance:</span>
                        <span className="font-medium">3.2 km</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}