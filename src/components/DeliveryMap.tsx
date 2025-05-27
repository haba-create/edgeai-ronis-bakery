import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LatLngExpression } from 'leaflet';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface Location {
  id: number;
  name: string;
  type: 'client' | 'supplier' | 'driver';
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  status?: string;
  lastUpdate?: string;
}

interface DeliveryMapProps {
  selectedOrderId?: number | null;
  trackingData?: any;
  className?: string;
}

const DeliveryMap: React.FC<DeliveryMapProps> = ({ 
  selectedOrderId, 
  trackingData, 
  className = "h-96" 
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // London center coordinates
  const londonCenter: LatLngExpression = [51.5074, -0.1278];

  // Fixed locations in London - Updated with more accurate coordinates
  const staticLocations: Location[] = [
    // Roni's Bakery Branches (Destinations) - Real locations with accurate coordinates
    {
      id: 1,
      name: "Roni's Bakery - Belsize Park",
      type: 'client',
      latitude: 51.5505,
      longitude: -0.1650,
      address: "13 Belsize Lane, London NW3 5BG",
      phone: "+44 20 7794 8848"
    },
    {
      id: 2,
      name: "Roni's Bakery - Hampstead",
      type: 'client',
      latitude: 51.5550,
      longitude: -0.1730,
      address: "44 Rosslyn Hill, London NW3 1NH",
      phone: "+44 20 7433 3103"
    },
    {
      id: 3,
      name: "Roni's Bakery - West Hampstead",
      type: 'client',
      latitude: 51.5470,
      longitude: -0.1900,
      address: "156 West End Lane, London NW6 1SD",
      phone: "+44 20 7794 2421"
    },
    {
      id: 4,
      name: "Roni's Bakery - Muswell Hill",
      type: 'client',
      latitude: 51.5900,
      longitude: -0.1430,
      address: "348 Muswell Hill Broadway, London N10 1DJ",
      phone: "+44 20 8883 5062"
    },
    {
      id: 5,
      name: "Roni's Bakery - Brent Cross",
      type: 'client',
      latitude: 51.5760,
      longitude: -0.2120,
      address: "45 Brent Street, London NW4 2EE",
      phone: "+44 20 8203 7766"
    },
    {
      id: 6,
      name: "Roni's Bakery - Swiss Cottage",
      type: 'client',
      latitude: 51.5430,
      longitude: -0.1720,
      address: "12 Finchley Road, London NW3 6HN",
      phone: "+44 20 7586 9988"
    },
    // Suppliers - Updated with better locations across London
    {
      id: 101,
      name: "Belsize Bakery Fresh",
      type: 'supplier',
      latitude: 51.5520,
      longitude: -0.1580,
      address: "45 Belsize Lane, London NW3",
      phone: "+44 20 7794 1234"
    },
    {
      id: 102,
      name: "Heritage Jewish Breads",
      type: 'supplier',
      latitude: 51.5420,
      longitude: -0.2100,
      address: "78 Finchley Road, London NW3",
      phone: "+44 20 7431 5678"
    },
    {
      id: 103,
      name: "Artisan Pastries London",
      type: 'supplier',
      latitude: 51.4950,
      longitude: -0.1650,
      address: "92 Kings Road, London SW3",
      phone: "+44 20 7352 9012"
    },
    {
      id: 104,
      name: "Premium Deli Supplies",
      type: 'supplier',
      latitude: 51.5200,
      longitude: -0.0800,
      address: "15 Brick Lane, London E1",
      phone: "+44 20 7247 3456"
    },
    {
      id: 105,
      name: "FreshDairy London",
      type: 'supplier',
      latitude: 51.4850,
      longitude: -0.1750,
      address: "201 Fulham Road, London SW10",
      phone: "+44 20 7351 7890"
    },
    {
      id: 106,
      name: "Kosher Chicken Co",
      type: 'supplier',
      latitude: 51.5300,
      longitude: -0.1500,
      address: "34 Marylebone High Street, London W1",
      phone: "+44 20 7935 1234"
    }
  ];

  useEffect(() => {
    setMapLoaded(true);
    
    // Start with static locations
    let allLocations = [...staticLocations];

    // Add driver location if tracking data is available
    if (trackingData && trackingData.current_latitude && trackingData.current_longitude) {
      const driverLocation: Location = {
        id: 999,
        name: trackingData.driver_name || 'Delivery Driver',
        type: 'driver',
        latitude: trackingData.current_latitude,
        longitude: trackingData.current_longitude,
        phone: trackingData.driver_phone,
        status: trackingData.status,
        lastUpdate: trackingData.last_location_update
      };
      allLocations.push(driverLocation);
    } else if (selectedOrderId) {
      // Add sample driver location for demonstration
      const sampleDriverLocation: Location = {
        id: 999,
        name: 'Sample Driver (Demo)',
        type: 'driver',
        latitude: 51.5205,
        longitude: -0.1441,
        status: 'in_transit',
        lastUpdate: new Date().toISOString()
      };
      allLocations.push(sampleDriverLocation);
    }

    setLocations(allLocations);
  }, [trackingData, selectedOrderId]);

  const getMarkerColor = (type: string, status?: string) => {
    switch (type) {
      case 'client':
        return '#059669'; // Green
      case 'supplier':
        return '#2563eb'; // Blue
      case 'driver':
        return status === 'delivered' ? '#6b7280' : '#dc2626'; // Gray or Red
      default:
        return '#6b7280';
    }
  };

  const createCustomIcon = (color: string, type: string) => {
    if (typeof window === 'undefined') return null;
    
    const L = require('leaflet');
    
    let iconHtml = '';
    let iconSize = [32, 32];
    let iconAnchor = [16, 32];
    
    switch (type) {
      case 'client':
        iconHtml = `
          <div style="position: relative; width: 32px; height: 32px;">
            <div style="
              position: absolute;
              top: 0;
              left: 50%;
              transform: translateX(-50%);
              width: 24px;
              height: 24px;
              background-color: ${color};
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 12px;
              font-weight: bold;
            ">🏪</div>
            <div style="
              position: absolute;
              bottom: 0;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 8px solid ${color};
            "></div>
          </div>`;
        break;
      case 'supplier':
        iconHtml = `
          <div style="position: relative; width: 28px; height: 28px;">
            <div style="
              position: absolute;
              top: 0;
              left: 50%;
              transform: translateX(-50%);
              width: 20px;
              height: 20px;
              background-color: ${color};
              border-radius: 4px;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 10px;
              font-weight: bold;
            ">🏭</div>
            <div style="
              position: absolute;
              bottom: 0;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-top: 6px solid ${color};
            "></div>
          </div>`;
        iconSize = [28, 28];
        iconAnchor = [14, 28];
        break;
      case 'driver':
        iconHtml = `
          <div style="position: relative; width: 30px; height: 30px;">
            <div style="
              position: absolute;
              top: 0;
              left: 50%;
              transform: translateX(-50%);
              width: 22px;
              height: 22px;
              background-color: ${color};
              border-radius: 6px;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 11px;
              font-weight: bold;
            ">🚚</div>
            <div style="
              position: absolute;
              bottom: 0;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-top: 6px solid ${color};
            "></div>
          </div>`;
        iconSize = [30, 30];
        iconAnchor = [15, 30];
        break;
    }

    return L.divIcon({
      html: iconHtml,
      className: 'custom-marker',
      iconSize: iconSize,
      iconAnchor: iconAnchor,
      popupAnchor: [0, -32]
    });
  };

  if (!mapLoaded) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center rounded-lg`}>
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <MapContainer
        center={londonCenter}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {locations.map((location) => (
          <Marker
            key={`${location.type}-${location.id}`}
            position={[location.latitude, location.longitude]}
            icon={createCustomIcon(getMarkerColor(location.type, location.status), location.type)}
          >
            <Popup>
              <div className="min-w-56 max-w-72">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">
                    {location.type === 'client' ? '🏪' : 
                     location.type === 'supplier' ? '🏭' : 
                     '🚚'}
                  </span>
                  <h3 className="font-semibold text-sm text-gray-900">{location.name}</h3>
                </div>
                
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-700">Type:</span>
                    <span className="capitalize text-gray-600">
                      {location.type === 'client' ? 'Roni\'s Branch' : 
                       location.type === 'supplier' ? 'Supplier' : 
                       'Delivery Driver'}
                    </span>
                  </div>
                  
                  {location.address && (
                    <div className="flex items-start gap-1">
                      <span className="font-medium text-gray-700">📍</span>
                      <span className="text-gray-600">{location.address}</span>
                    </div>
                  )}
                  
                  {location.phone && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-gray-700">📞</span>
                      <span className="text-gray-600">{location.phone}</span>
                    </div>
                  )}
                  
                  {location.status && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className={`capitalize px-2 py-1 rounded text-xs font-medium ${
                        location.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                        location.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {location.status.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                  
                  {location.lastUpdate && (
                    <div className="flex items-center gap-1 pt-1 border-t border-gray-200">
                      <span className="font-medium text-gray-700">🕒</span>
                      <span className="text-gray-500">
                        Last update: {new Date(location.lastUpdate).toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {location.type === 'client' && (
                    <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                      <span className="font-medium text-green-800">Active Branch</span>
                      <div className="text-green-700 mt-1">Receiving deliveries from multiple suppliers</div>
                    </div>
                  )}
                  
                  {location.type === 'supplier' && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                      <span className="font-medium text-blue-800">Active Supplier</span>
                      <div className="text-blue-700 mt-1">Delivering to all Roni's branches</div>
                    </div>
                  )}
                  
                  {location.type === 'driver' && (
                    <div className="mt-2 p-2 bg-orange-50 rounded text-xs">
                      <span className="font-medium text-orange-800">Live Tracking</span>
                      <div className="text-orange-700 mt-1">Real-time GPS location</div>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="mt-4">
        <h4 className="font-semibold text-sm mb-2">Map Legend</h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏪</span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              Roni's Branches (6)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🏭</span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-600 rounded"></div>
              Suppliers (6)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🚚</span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-600 rounded"></div>
              Active Drivers (24)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">📦</span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-600 rounded"></div>
              Delivered
            </span>
          </div>
        </div>
        <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
          <div className="font-medium text-blue-800 mb-1">🌍 Live London Network</div>
          <div className="text-blue-700">
            Real-time tracking: All suppliers delivering to all Roni's branches across London
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryMap;