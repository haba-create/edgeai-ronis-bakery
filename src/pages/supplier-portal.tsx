import { useState, useEffect } from 'react';
import Head from 'next/head';
import useSWR from 'swr';
import AppHeader from '@/components/AppHeader';
import SupplierChatInterface from '@/components/SupplierChatInterface';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Order {
  id: number;
  order_date: string;
  status: string;
  total_cost: number;
  expected_delivery: string;
  notes: string;
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
    product_name: string;
  }>;
  delivery_status?: string;
  driver_name?: string;
  driver_phone?: string;
}

interface Driver {
  id: number;
  name: string;
  phone: string;
  vehicle_registration: string;
  active_deliveries: number;
}

export default function SupplierPortal() {
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(1); // Default to first supplier
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', notes: '', driverId: '', estimatedDelivery: '' });

  // Fetch suppliers for selection
  const { data: suppliersData } = useSWR('/api/suppliers', fetcher);
  
  // Fetch orders for selected supplier
  const { data: ordersData, mutate: mutateOrders } = useSWR(
    selectedSupplierId ? `/api/supplier-orders/${selectedSupplierId}` : null, 
    fetcher,
    { refreshInterval: 30000 }
  );

  // Fetch drivers for the supplier
  const { data: driversData } = useSWR(
    selectedSupplierId ? `/api/drivers?supplierId=${selectedSupplierId}` : null, 
    fetcher
  );

  const orders = ordersData?.orders || [];
  const suppliers = suppliersData?.suppliers || [];
  const drivers = driversData?.drivers || [];

  const updateOrderStatus = async () => {
    if (!selectedOrder) return;

    try {
      const response = await fetch(`/api/supplier-orders/${selectedSupplierId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          status: statusUpdate.status,
          notes: statusUpdate.notes,
          driverId: statusUpdate.driverId ? parseInt(statusUpdate.driverId) : undefined,
          estimatedDelivery: statusUpdate.estimatedDelivery
        })
      });

      if (response.ok) {
        alert('Order status updated successfully!');
        mutateOrders(); // Refresh orders
        setSelectedOrder(null);
        setStatusUpdate({ status: '', notes: '', driverId: '', estimatedDelivery: '' });
      } else {
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error updating order status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Supplier Portal - Order Management</title>
      </Head>

      <AppHeader />
      
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">Supplier Portal</h1>
          <p className="text-gray-600">Manage your orders and deliveries</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 px-4">
        {/* Supplier Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Supplier
          </label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
            className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {suppliers.map((supplier: any) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Orders ({orders.length})</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {orders.map((order: Order) => (
                <div
                  key={order.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedOrder?.id === order.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">Order #{order.id}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(order.order_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm font-medium">£{order.total_cost?.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      {order.delivery_status && (
                        <p className="text-xs text-gray-500 mt-1">
                          Delivery: {order.delivery_status}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      {order.items.length} items
                    </p>
                    {order.driver_name && (
                      <p className="text-xs text-blue-600">
                        Driver: {order.driver_name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Details & Status Update */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                {selectedOrder ? `Order #${selectedOrder.id} Details` : 'Select an Order'}
              </h2>
            </div>
            
            {selectedOrder ? (
              <div className="p-6 space-y-6">
                {/* Order Info */}
                <div>
                  <h3 className="font-medium mb-3">Order Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Order Date:</p>
                      <p>{new Date(selectedOrder.order_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Cost:</p>
                      <p className="font-medium">£{selectedOrder.total_cost?.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Current Status:</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-600">Expected Delivery:</p>
                      <p>{selectedOrder.expected_delivery ? new Date(selectedOrder.expected_delivery).toLocaleDateString() : 'TBD'}</p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-medium mb-3">Items Ordered</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.product_name}</span>
                        <span>{item.quantity} × £{item.unit_price?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Update Form */}
                <div>
                  <h3 className="font-medium mb-3">Update Order Status</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={statusUpdate.status}
                        onChange={(e) => setStatusUpdate(prev => ({ ...prev, status: e.target.value }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select status...</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    {(statusUpdate.status === 'confirmed' || statusUpdate.status === 'shipped') && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assign Driver
                          </label>
                          <select
                            value={statusUpdate.driverId}
                            onChange={(e) => setStatusUpdate(prev => ({ ...prev, driverId: e.target.value }))}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select driver...</option>
                            {drivers.map((driver: Driver) => (
                              <option key={driver.id} value={driver.id}>
                                {driver.name} ({driver.vehicle_registration}) - {driver.active_deliveries} active
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estimated Delivery
                          </label>
                          <input
                            type="datetime-local"
                            value={statusUpdate.estimatedDelivery}
                            onChange={(e) => setStatusUpdate(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={statusUpdate.notes}
                        onChange={(e) => setStatusUpdate(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Add any notes about this status update..."
                      />
                    </div>

                    <button
                      onClick={updateOrderStatus}
                      disabled={!statusUpdate.status}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Update Order Status
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                Select an order from the list to view details and update status
              </div>
            )}
          </div>

          {/* AI Assistant */}
          <div className="bg-white shadow rounded-lg">
            <div className="h-96">
              <SupplierChatInterface 
                supplierId={selectedSupplierId}
                supplierName={suppliers.find((s: any) => s.id === selectedSupplierId)?.name || 'Supplier'}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}