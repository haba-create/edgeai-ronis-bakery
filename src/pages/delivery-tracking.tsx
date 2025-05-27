import { useState, useEffect } from 'react';
import Head from 'next/head';
import useSWR from 'swr';
import AppHeader from '@/components/AppHeader';
import DeliveryMap from '@/components/DeliveryMap';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface DeliveryTracking {
  id: number;
  order_id: number;
  status: string;
  estimated_arrival: string;
  actual_departure: string;
  actual_arrival: string;
  current_latitude: number;
  current_longitude: number;
  last_location_update: string;
  delivery_notes: string;
  driver_name: string;
  driver_phone: string;
  vehicle_registration: string;
  supplier_name: string;
  order_date: string;
  total_cost: number;
}

export default function DeliveryTracking() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 51.5074, lng: -0.1278 }); // London default

  // Fetch all orders with delivery tracking
  const { data: ordersData } = useSWR('/api/orders', fetcher, { refreshInterval: 30000 });

  // Fetch specific delivery tracking if order selected
  const { data: trackingData } = useSWR(
    selectedOrderId ? `/api/delivery-tracking/${selectedOrderId}` : null,
    fetcher,
    { refreshInterval: 10000 } // More frequent updates for tracking
  );

  const orders = ordersData?.orders || [];
  const tracking = trackingData?.tracking;

  // Filter orders that have delivery tracking
  const ordersWithTracking = orders.filter((order: any) => 
    order.status === 'confirmed' || order.status === 'shipped' || order.status === 'delivered'
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'delayed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleString();
  };

  const calculateETA = (estimatedArrival: string) => {
    if (!estimatedArrival) return 'N/A';
    const eta = new Date(estimatedArrival);
    const now = new Date();
    const diffMs = eta.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffMs < 0) return 'Overdue';
    if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Delivery Tracking - Roni's Bakery</title>
      </Head>

      <AppHeader />

      <main className="max-w-7xl mx-auto py-6 px-4">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Delivery Tracking</h1>
          <p className="text-gray-600">Monitor live delivery status and locations</p>
          <div className="mt-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">Active Deliveries</span>
                <span className="text-2xl font-bold text-blue-600">
                  {ordersWithTracking.filter((o: any) => o.status !== 'delivered').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="mb-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Live Delivery Map - London</h2>
              <p className="text-sm text-gray-600">Track all locations: Client, Suppliers, and Active Drivers</p>
            </div>
            <div className="p-6">
              <DeliveryMap 
                selectedOrderId={selectedOrderId}
                trackingData={tracking}
                className="h-80"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders List */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Orders in Transit</h2>
              </div>
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {ordersWithTracking.map((order: any) => (
                  <div
                    key={order.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedOrderId === order.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">Order #{order.id}</h3>
                        <p className="text-sm text-gray-600">{order.supplier?.name}</p>
                        <p className="text-sm font-medium">£{order.total_cost?.toFixed(2)}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">
                        Expected: {order.expected_delivery ? new Date(order.expected_delivery).toLocaleDateString() : 'TBD'}
                      </p>
                    </div>
                  </div>
                ))}
                {ordersWithTracking.length === 0 && (
                  <div className="p-6 text-center text-gray-500">
                    No orders with delivery tracking found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tracking Details */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">
                  {selectedOrderId ? `Tracking Order #${selectedOrderId}` : 'Select an Order'}
                </h2>
              </div>
              
              {tracking ? (
                <div className="p-6 space-y-6">
                  {/* Driver Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-3">Driver Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium">{tracking.driver_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <span className="font-medium">{tracking.driver_phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vehicle:</span>
                          <span className="font-medium">{tracking.vehicle_registration}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-3">Delivery Status</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tracking.status)}`}>
                            {tracking.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ETA:</span>
                          <span className="font-medium">{calculateETA(tracking.estimated_arrival)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Estimated Arrival:</span>
                          <span className="font-medium">{formatTime(tracking.estimated_arrival)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <h3 className="font-medium mb-3">Delivery Timeline</h3>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full"></div>
                        <div className="ml-3 text-sm">
                          <span className="font-medium">Order Placed</span>
                          <span className="text-gray-500 ml-2">{formatTime(tracking.order_date)}</span>
                        </div>
                      </div>
                      
                      {tracking.actual_departure && (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full"></div>
                          <div className="ml-3 text-sm">
                            <span className="font-medium">Departed</span>
                            <span className="text-gray-500 ml-2">{formatTime(tracking.actual_departure)}</span>
                          </div>
                        </div>
                      )}

                      {tracking.status === 'in_transit' && (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                          <div className="ml-3 text-sm">
                            <span className="font-medium">In Transit</span>
                            {tracking.last_location_update && (
                              <span className="text-gray-500 ml-2">
                                Last update: {formatTime(tracking.last_location_update)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {tracking.actual_arrival ? (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full"></div>
                          <div className="ml-3 text-sm">
                            <span className="font-medium">Delivered</span>
                            <span className="text-gray-500 ml-2">{formatTime(tracking.actual_arrival)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-3 h-3 bg-gray-300 rounded-full"></div>
                          <div className="ml-3 text-sm">
                            <span className="text-gray-500">Expected Delivery</span>
                            <span className="text-gray-500 ml-2">{formatTime(tracking.estimated_arrival)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location Info */}
                  {tracking.current_latitude && tracking.current_longitude && (
                    <div>
                      <h3 className="font-medium mb-3">Current Location</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Latitude:</span>
                            <span className="ml-2 font-mono">{tracking.current_latitude.toFixed(6)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Longitude:</span>
                            <span className="ml-2 font-mono">{tracking.current_longitude.toFixed(6)}</span>
                          </div>
                        </div>
                        {tracking.last_location_update && (
                          <p className="text-xs text-gray-500 mt-2">
                            Last updated: {formatTime(tracking.last_location_update)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delivery Notes */}
                  {tracking.delivery_notes && (
                    <div>
                      <h3 className="font-medium mb-3">Delivery Notes</h3>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-800">{tracking.delivery_notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={() => window.open(`tel:${tracking.driver_phone}`, '_self')}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                    >
                      Call Driver
                    </button>
                    {tracking.current_latitude && tracking.current_longitude && (
                      <button
                        onClick={() => window.open(
                          `https://www.google.com/maps?q=${tracking.current_latitude},${tracking.current_longitude}`,
                          '_blank'
                        )}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                      >
                        View on Map
                      </button>
                    )}
                  </div>
                </div>
              ) : selectedOrderId ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  Loading tracking information...
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  Select an order from the list to view delivery tracking details
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}