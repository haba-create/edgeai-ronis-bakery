import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SupplierChatbot from './SupplierChatbot';
import { FiPackage, FiTruck, FiClock, FiCheckCircle, FiAlertCircle, FiDollarSign, FiBarChart2 } from 'react-icons/fi';

// Dynamically import map component
const SupplierMap = dynamic(() => import('./SupplierMap'), { 
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
});

interface Order {
  id: string;
  bakeryBranch: string;
  items: Array<{
    product: string;
    quantity: number;
    unit: string;
  }>;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered';
  requestedDelivery: Date;
  totalValue: number;
  priority: 'standard' | 'urgent';
  driver?: string;
}

export default function SupplierApp() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'analytics'>('orders');
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');

  // Mock supplier data
  const supplierInfo = {
    name: "Heritage Jewish Breads",
    id: "HJB-001",
    rating: 4.9,
    completedOrders: 1523,
    onTimeDelivery: 98.5
  };

  useEffect(() => {
    // Mock orders
    const mockOrders: Order[] = [
      {
        id: 'ORD-001',
        bakeryBranch: 'Belsize Park',
        items: [
          { product: 'Challah Bread', quantity: 20, unit: 'loaves' },
          { product: 'Bagels - Plain', quantity: 50, unit: 'units' },
          { product: 'Rye Bread', quantity: 15, unit: 'loaves' }
        ],
        status: 'preparing',
        requestedDelivery: new Date(Date.now() + 3600000),
        totalValue: 125.50,
        priority: 'urgent',
        driver: 'Michael K.'
      },
      {
        id: 'ORD-002',
        bakeryBranch: 'Hampstead',
        items: [
          { product: 'Challah Bread', quantity: 15, unit: 'loaves' },
          { product: 'Babka', quantity: 10, unit: 'units' }
        ],
        status: 'pending',
        requestedDelivery: new Date(Date.now() + 7200000),
        totalValue: 85.00,
        priority: 'standard'
      },
      {
        id: 'ORD-003',
        bakeryBranch: 'West Hampstead',
        items: [
          { product: 'Bagels - Everything', quantity: 40, unit: 'units' },
          { product: 'Bagels - Sesame', quantity: 40, unit: 'units' }
        ],
        status: 'ready',
        requestedDelivery: new Date(Date.now() + 1800000),
        totalValue: 96.00,
        priority: 'urgent',
        driver: 'Sarah L.'
      }
    ];
    setOrders(mockOrders);
  }, []);

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'pending') return order.status === 'pending';
    if (filter === 'in-progress') return ['confirmed', 'preparing', 'ready'].includes(order.status);
    if (filter === 'completed') return ['dispatched', 'delivered'].includes(order.status);
    return true;
  });

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  const getStatusColor = (status: Order['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-indigo-100 text-indigo-800',
      ready: 'bg-green-100 text-green-800',
      dispatched: 'bg-purple-100 text-purple-800',
      delivered: 'bg-gray-100 text-gray-800'
    };
    return colors[status];
  };

  const getStatusIcon = (status: Order['status']) => {
    const icons = {
      pending: <FiClock />,
      confirmed: <FiCheckCircle />,
      preparing: <FiPackage />,
      ready: <FiCheckCircle />,
      dispatched: <FiTruck />,
      delivered: <FiCheckCircle />
    };
    return icons[status];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{supplierInfo.name}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <span>ID: {supplierInfo.id}</span>
                <span>⭐ {supplierInfo.rating}</span>
                <span>{supplierInfo.completedOrders} orders</span>
                <span>{supplierInfo.onTimeDelivery}% on-time</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm text-gray-600">Today's Revenue</p>
                <p className="text-xl font-bold text-green-600">£1,245.50</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 flex space-x-6 border-t">
          {[
            { id: 'orders', label: 'Active Orders', icon: <FiPackage /> },
            { id: 'inventory', label: 'Inventory', icon: <FiBarChart2 /> },
            { id: 'analytics', label: 'Analytics', icon: <FiDollarSign /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Orders List */}
        <div className="w-1/2 bg-white border-r overflow-auto">
          {activeTab === 'orders' && (
            <>
              {/* Filters */}
              <div className="p-4 border-b">
                <div className="flex space-x-2">
                  {[
                    { id: 'all', label: 'All Orders' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'in-progress', label: 'In Progress' },
                    { id: 'completed', label: 'Completed' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === f.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders */}
              <div className="divide-y">
                {filteredOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedOrder?.id === order.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          Order #{order.id}
                        </h3>
                        <p className="text-sm text-gray-600">{order.bakeryBranch} Branch</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {order.priority === 'urgent' && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            Urgent
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1 ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span>{order.status}</span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 mb-3">
                      {order.items.slice(0, 2).map((item, idx) => (
                        <p key={idx} className="text-sm text-gray-600">
                          {item.quantity} {item.unit} - {item.product}
                        </p>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-sm text-gray-500">
                          +{order.items.length - 2} more items
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Delivery: {order.requestedDelivery.toLocaleTimeString()}
                      </span>
                      <span className="font-semibold">£{order.totalValue.toFixed(2)}</span>
                    </div>

                    {order.driver && (
                      <p className="text-sm text-gray-600 mt-2">
                        Driver: {order.driver}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'inventory' && (
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Current Stock Levels</h3>
              <div className="space-y-3">
                {[
                  { item: 'Challah Bread', stock: 45, unit: 'loaves', status: 'good' },
                  { item: 'Bagels - Plain', stock: 120, unit: 'units', status: 'good' },
                  { item: 'Bagels - Everything', stock: 15, unit: 'units', status: 'low' },
                  { item: 'Rye Bread', stock: 30, unit: 'loaves', status: 'good' },
                  { item: 'Babka', stock: 8, unit: 'units', status: 'critical' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.item}</p>
                      <p className="text-sm text-gray-600">{item.stock} {item.unit}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      item.status === 'good' ? 'bg-green-100 text-green-800' :
                      item.status === 'low' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Today's Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Orders Completed</p>
                  <p className="text-2xl font-bold">23</p>
                  <p className="text-sm text-green-600">+15% vs yesterday</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold">£1,245</p>
                  <p className="text-sm text-green-600">+8% vs yesterday</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Avg Prep Time</p>
                  <p className="text-2xl font-bold">42 min</p>
                  <p className="text-sm text-red-600">+5 min vs target</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">On-Time Rate</p>
                  <p className="text-2xl font-bold">96%</p>
                  <p className="text-sm text-yellow-600">-2% vs target</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Map/Order Details */}
        <div className="flex-1 bg-white">
          {selectedOrder ? (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Order Details - #{selectedOrder.id}</h3>
                <p className="text-sm text-gray-600">{selectedOrder.bakeryBranch} Branch</p>
              </div>
              
              <div className="flex-1 overflow-auto">
                <SupplierMap order={selectedOrder} />
                
                <div className="p-4 space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Order Items</h4>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-2 border-b">
                          <span>{item.product}</span>
                          <span className="font-medium">{item.quantity} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    {selectedOrder.status === 'pending' && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Confirm Order
                      </button>
                    )}
                    {selectedOrder.status === 'confirmed' && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                        className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Start Preparing
                      </button>
                    )}
                    {selectedOrder.status === 'preparing' && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'ready')}
                        className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Mark as Ready
                      </button>
                    )}
                    {selectedOrder.status === 'ready' && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'dispatched')}
                        className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Dispatch Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full">
              <SupplierMap />
            </div>
          )}
        </div>
      </div>

      {/* Chatbot */}
      <SupplierChatbot />
    </div>
  );
}