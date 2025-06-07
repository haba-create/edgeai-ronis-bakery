import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface DriverMapProps {
  currentDelivery: any;
  deliveries: any[];
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

const driverIcon = createIcon('🚗', 35);
const pickupIcon = createIcon('📦', 35);
const deliveryIcon = createIcon('📍', 35);
const completedIcon = createIcon('✅', 30);

// Component to auto-center map
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function DriverMap({ currentDelivery, deliveries }: DriverMapProps) {
  const [driverPosition, setDriverPosition] = useState<[number, number]>([51.5701, -0.1589]);
  const [heading, setHeading] = useState(0);

  // Simulate driver movement
  useEffect(() => {
    // Simulate GPS updates
    const interval = setInterval(() => {
      setDriverPosition(prev => [
        prev[0] + (Math.random() - 0.5) * 0.001,
        prev[1] + (Math.random() - 0.5) * 0.001
      ]);
      setHeading(Math.random() * 360);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Generate route to current delivery
  const routePositions: [number, number][] = currentDelivery ? [
    driverPosition,
    currentDelivery.location
  ] : [];

  return (
    <div className="h-full relative">
      <MapContainer
        center={driverPosition}
        zoom={15}
        className="h-full w-full"
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <MapController center={driverPosition} />

        {/* Driver Position */}
        <Marker position={driverPosition} icon={driverIcon}>
          <Popup>
            <div className="text-center">
              <h3 className="font-bold">Your Location</h3>
              <p className="text-sm">Speed: 28 mph</p>
              <p className="text-sm">Heading: {heading.toFixed(0)}°</p>
            </div>
          </Popup>
        </Marker>

        {/* Current Delivery Location */}
        {currentDelivery && (
          <>
            <Marker 
              position={currentDelivery.location} 
              icon={currentDelivery.type === 'pickup' ? pickupIcon : deliveryIcon}
            >
              <Popup>
                <div className="text-center">
                  <h3 className="font-bold">{currentDelivery.customerName}</h3>
                  <p className="text-sm">{currentDelivery.address}</p>
                  <p className="text-sm font-medium">
                    {currentDelivery.type === 'pickup' ? 'Pickup' : 'Delivery'}
                  </p>
                </div>
              </Popup>
            </Marker>

            {/* Route Line */}
            <Polyline
              positions={routePositions}
              color="#3B82F6"
              weight={5}
              opacity={0.8}
            />
          </>
        )}

        {/* Other Deliveries */}
        {deliveries
          .filter(d => d.id !== currentDelivery?.id)
          .map((delivery, idx) => (
            <Marker
              key={delivery.id}
              position={delivery.location}
              icon={
                delivery.status === 'completed' 
                  ? completedIcon 
                  : delivery.type === 'pickup' 
                    ? pickupIcon 
                    : deliveryIcon
              }
              opacity={delivery.status === 'completed' ? 0.5 : 0.7}
            >
              <Popup>
                <div className="text-center">
                  <h3 className="font-bold">{delivery.customerName}</h3>
                  <p className="text-sm">{delivery.address}</p>
                  <p className="text-sm">
                    {delivery.status === 'completed' ? 'Completed' : `ETA: ${delivery.eta.toLocaleTimeString()}`}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Speed and Status Overlay */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <div className="flex items-center space-x-4">
          <div>
            <p className="text-2xl font-bold">28</p>
            <p className="text-xs text-gray-600">mph</p>
          </div>
          <div className="h-12 w-px bg-gray-300"></div>
          <div>
            <p className="text-sm font-medium">0.8 mi</p>
            <p className="text-xs text-gray-600">3 min</p>
          </div>
        </div>
      </div>

      {/* Turn-by-turn Navigation */}
      {currentDelivery && (
        <div className="absolute top-4 right-4 left-4 bg-blue-600 text-white rounded-lg shadow-lg p-4 mx-auto max-w-sm">
          <div className="flex items-center">
            <div className="text-3xl mr-3">↗️</div>
            <div>
              <p className="font-semibold">In 200m, turn right</p>
              <p className="text-sm opacity-90">onto Belsize Avenue</p>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="absolute bottom-20 right-4 flex flex-col space-y-2">
        <button className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50">
          <span className="text-xl">+</span>
        </button>
        <button className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50">
          <span className="text-xl">-</span>
        </button>
        <button className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50">
          <span className="text-xl">📍</span>
        </button>
      </div>
    </div>
  );
}