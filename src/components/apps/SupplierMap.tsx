import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SupplierMapProps {
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

const supplierIcon = createIcon('🏭', 40);
const bakeryIcon = createIcon('🥐', 35);
const driverIcon = createIcon('🚚', 40);

export default function SupplierMap({ order }: SupplierMapProps) {
  const [driverPositions, setDriverPositions] = useState<{ [key: string]: [number, number] }>({});
  
  // Supplier location (North London)
  const supplierLocation: [number, number] = [51.5874, -0.1469];
  
  // Roni's Bakery branches
  const bakeryBranches = [
    { name: 'Belsize Park', position: [51.5461, -0.1642] as [number, number], orders: 3 },
    { name: 'Hampstead', position: [51.5567, -0.1768] as [number, number], orders: 2 },
    { name: 'West Hampstead', position: [51.5468, -0.1909] as [number, number], orders: 2 },
    { name: 'Muswell Hill', position: [51.5900, -0.1439] as [number, number], orders: 1 },
    { name: 'Brent Cross', position: [51.5764, -0.2235] as [number, number], orders: 4 },
    { name: 'Swiss Cottage', position: [51.5432, -0.1738] as [number, number], orders: 2 }
  ];

  // Active drivers
  const drivers = [
    { id: '1', name: 'Michael K.', position: [51.5701, -0.1589] as [number, number], status: 'en-route' },
    { id: '2', name: 'Sarah L.', position: [51.5523, -0.1732] as [number, number], status: 'delivering' },
    { id: '3', name: 'David R.', position: [51.5812, -0.1367] as [number, number], status: 'returning' }
  ];

  // Simulate driver movement
  useEffect(() => {
    const interval = setInterval(() => {
      setDriverPositions(prev => {
        const newPositions = { ...prev };
        drivers.forEach(driver => {
          const currentPos = newPositions[driver.id] || driver.position;
          // Random movement simulation
          newPositions[driver.id] = [
            currentPos[0] + (Math.random() - 0.5) * 0.002,
            currentPos[1] + (Math.random() - 0.5) * 0.002
          ];
        });
        return newPositions;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const mapCenter: [number, number] = order 
    ? bakeryBranches.find(b => b.name === order.bakeryBranch)?.position || supplierLocation
    : supplierLocation;

  return (
    <div className="h-96 relative">
      <MapContainer
        center={mapCenter}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Supplier Location */}
        <Marker position={supplierLocation} icon={supplierIcon}>
          <Popup>
            <div className="text-center">
              <h3 className="font-bold">Heritage Jewish Breads</h3>
              <p className="text-sm">Production Facility</p>
              <p className="text-sm text-green-600">14 orders today</p>
            </div>
          </Popup>
        </Marker>

        {/* Bakery Branches */}
        {bakeryBranches.map((branch, idx) => (
          <Marker 
            key={idx} 
            position={branch.position} 
            icon={bakeryIcon}
            opacity={order && order.bakeryBranch === branch.name ? 1 : 0.7}
          >
            <Popup>
              <div className="text-center">
                <h3 className="font-bold">Roni's {branch.name}</h3>
                <p className="text-sm">{branch.orders} active orders</p>
                <p className="text-sm text-blue-600">Next delivery: 2:30 PM</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Active Drivers */}
        {drivers.map(driver => {
          const position = driverPositions[driver.id] || driver.position;
          return (
            <Marker key={driver.id} position={position} icon={driverIcon}>
              <Popup>
                <div className="text-center">
                  <h3 className="font-bold">{driver.name}</h3>
                  <p className="text-sm">Status: {driver.status}</p>
                  <p className="text-sm">3 deliveries remaining</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Routes for selected order */}
        {order && (
          <>
            {/* Route from supplier to bakery */}
            <Polyline
              positions={[
                supplierLocation,
                bakeryBranches.find(b => b.name === order.bakeryBranch)?.position || supplierLocation
              ]}
              color="#3B82F6"
              weight={4}
              opacity={0.6}
            />
            
            {/* Delivery zone circle */}
            <Circle
              center={bakeryBranches.find(b => b.name === order.bakeryBranch)?.position || supplierLocation}
              radius={2000}
              fillColor="#3B82F6"
              fillOpacity={0.1}
              stroke={false}
            />
          </>
        )}

        {/* Supplier coverage area */}
        <Circle
          center={supplierLocation}
          radius={8000}
          fillColor="#10B981"
          fillOpacity={0.05}
          color="#10B981"
          weight={1}
        />
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <h4 className="font-semibold text-sm mb-2">Live Fleet Status</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <span className="mr-2">🚚</span>
            <span>3 drivers active</span>
          </div>
          <div className="flex items-center">
            <span className="mr-2">📦</span>
            <span>14 deliveries today</span>
          </div>
          <div className="flex items-center">
            <span className="mr-2">⏱️</span>
            <span>Avg. delivery: 28 min</span>
          </div>
        </div>
      </div>

      {/* Order specific info */}
      {order && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
          <h4 className="font-semibold text-sm mb-1">Delivery Route</h4>
          <div className="text-xs space-y-1">
            <p>Distance: 4.2 km</p>
            <p>Est. time: 22 minutes</p>
            <p>Driver: {order.driver || 'Assigning...'}</p>
          </div>
        </div>
      )}
    </div>
  );
}