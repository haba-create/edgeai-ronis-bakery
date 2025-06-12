import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ClientMapProps {
  order?: any;
}

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

// Custom icons
const createIcon = (emoji: string, size: number = 40) => {
  return L.divIcon({
    html: `<div style="font-size: ${size}px; display: flex; align-items: center; justify-content: center;">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    className: 'custom-div-icon'
  });
};

const homeIcon = createIcon('🏠', 35);
const bakeryIcon = createIcon('🥐', 35);
const driverIcon = createIcon('🛵', 40);

export default function ClientMap({ order }: ClientMapProps) {
  const [driverPosition, setDriverPosition] = useState<[number, number]>([51.5461, -0.1575]);
  const [routePositions, setRoutePositions] = useState<[number, number][]>([]);
  
  // Customer location (Belsize Park area)
  const customerLocation: [number, number] = [51.5461, -0.1642];
  
  // Roni's Bakery location
  const bakeryLocation: [number, number] = [51.5461, -0.1575];

  // Simulate driver movement
  useEffect(() => {
    if (!order || !order.trackingEnabled) return;

    const route: [number, number][] = [
      [51.5461, -0.1575], // Bakery
      [51.5465, -0.1580],
      [51.5470, -0.1590],
      [51.5473, -0.1600],
      [51.5475, -0.1610],
      [51.5472, -0.1620],
      [51.5468, -0.1630],
      [51.5464, -0.1635],
      [51.5461, -0.1642], // Customer
    ];

    setRoutePositions(route);

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < route.length) {
        setDriverPosition(route[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 3000); // Move every 3 seconds

    return () => clearInterval(interval);
  }, [order]);

  return (
    <div className="h-full relative">
      <MapContainer
        center={[51.5461, -0.1608]}
        zoom={15}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Customer Location */}
        <Marker position={customerLocation} icon={homeIcon}>
          <Popup>
            <div className="text-center">
              <h3 className="font-bold">Your Delivery Address</h3>
              <p className="text-sm">123 Belsize Park Gardens</p>
              <p className="text-sm">London NW3 4AA</p>
            </div>
          </Popup>
        </Marker>

        {/* Bakery Location */}
        <Marker position={bakeryLocation} icon={bakeryIcon}>
          <Popup>
            <div className="text-center">
              <h3 className="font-bold">Roni&apos;s Bakery</h3>
              <p className="text-sm">Belsize Park Branch</p>
              <p className="text-sm">Preparing your order...</p>
            </div>
          </Popup>
        </Marker>

        {/* Driver Location (if order is active) */}
        {order && order.trackingEnabled && (
          <>
            <Marker position={driverPosition} icon={driverIcon}>
              <Popup>
                <div className="text-center">
                  <h3 className="font-bold">Your Driver</h3>
                  <p className="text-sm">David M.</p>
                  <p className="text-sm">⭐ 4.9 (523 deliveries)</p>
                  <p className="text-sm text-blue-600">On the way!</p>
                </div>
              </Popup>
            </Marker>

            {/* Delivery Route */}
            {routePositions.length > 0 && (
              <Polyline
                positions={routePositions}
                color="#3B82F6"
                weight={4}
                opacity={0.8}
                dashArray="10, 10"
              />
            )}

            {/* Delivery radius circles */}
            <CircleMarker
              center={customerLocation}
              radius={20}
              fillColor="#3B82F6"
              fillOpacity={0.1}
              stroke={false}
            />
          </>
        )}

        {/* Nearby Roni's branches */}
        {[
          { pos: [51.5524, -0.1766] as [number, number], name: "Hampstead" },
          { pos: [51.5428, -0.1835] as [number, number], name: "West Hampstead" },
        ].map((branch, idx) => (
          <CircleMarker
            key={idx}
            center={branch.pos}
            radius={10}
            fillColor="#gray"
            fillOpacity={0.5}
            color="#gray"
            weight={1}
          >
            <Popup>
              <div className="text-center">
                <p className="text-sm font-medium">Roni&apos;s {branch.name}</p>
                <p className="text-xs text-gray-600">Also available</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Order Status Overlay */}
      {order && (
        <div className="absolute top-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg">Order #{order.id}</h3>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              {order.status === 'preparing' ? '👨‍🍳 Preparing' : '🚚 On the way'}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <span className="text-gray-600 w-24">Driver:</span>
              <span className="font-medium">David M. • BMW (BK23 ABC)</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-gray-600 w-24">ETA:</span>
              <span className="font-medium">{order.estimatedDelivery.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-gray-600 w-24">Distance:</span>
              <span className="font-medium">1.2 km • 8 mins away</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <button className="text-blue-600 text-sm font-medium">
                Call Driver
              </button>
              <button className="text-blue-600 text-sm font-medium">
                Share Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}