import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { format, parseISO } from 'date-fns';
import LoadingSpinner from './ui/LoadingSpinner';
import { PurchaseOrder } from '@/models/types';

// SWR fetcher function
const fetcher = (url: string) => fetch(url).then(res => res.json());

const OrdersView: React.FC = () => {
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'delivered'>('all');
  
  // Fetch orders data
  const { data, error, isLoading } = useSWR('/api/orders', fetcher);
  
  // Fetch recommended orders
  const { data: recommendationsData, error: recommendationsError } = useSWR(
    '/api/orders?recommended=true', 
    fetcher
  );
  
  if (isLoading) {
    return <LoadingSpinner message="Loading orders data..." />;
  }
  
  if (error || recommendationsError) {
    return <div className="p-4 bg-red-100 text-red-800 rounded-md">Error loading orders data. Please try again.</div>;
  }
  
  const { orders } = data;
  const { recommendations } = recommendationsData;
  
  // Filter orders based on selected filter
  const filteredOrders = orders.filter((order: PurchaseOrder) => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'pending') return order.status !== 'delivered' && order.status !== 'cancelled';
    if (orderFilter === 'delivered') return order.status === 'delivered';
    return true;
  });
  
  // Update order status
  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      // Refresh the orders data
      mutate('/api/orders');
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };
  
  // Create a new order from recommendations
  const createOrderFromRecommendation = async (supplierId: number, items: any[]) => {
    try {
      const orderItems = items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      }));
      
      await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplier_id: supplierId,
          items: orderItems,
          notes: 'Created from recommendations'
        }),
      });
      
      // Refresh the orders data
      mutate('/api/orders');
      mutate('/api/orders?recommended=true');
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        
        <div className="flex space-x-4">
          <div className="flex items-center">
            <label htmlFor="filter" className="mr-2 text-gray-700">Show:</label>
            <select
              id="filter"
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending Orders</option>
              <option value="delivered">Delivered Orders</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Recommended Orders Section */}
      {recommendations && Object.keys(recommendations).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Recommended Orders</h2>
          
          <div className="space-y-4">
            {Object.entries(recommendations).map(([supplierId, items]: [string, any]) => {
              const supplier = items[0]?.product.supplier;
              return (
                <div key={supplierId} className="bg-white border border-amber-100 rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{supplier.name}</h3>
                    <button 
                      onClick={() => createOrderFromRecommendation(parseInt(supplierId), items)}
                      className="brand-button text-sm"
                    >
                      Create Order
                    </button>
                  </div>
                  
                  <ul className="text-sm divide-y">
                    {items.map((item: any, index: number) => (
                      <li key={index} className="py-2 flex justify-between">
                        <span>{item.product.name}</span>
                        <span>{item.quantity} {item.product.unit}s</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expected Delivery
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No orders found.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order: PurchaseOrder) => {
                // Determine status styling
                let statusClass = 'bg-gray-100 text-gray-800';
                if (order.status === 'delivered') {
                  statusClass = 'bg-green-100 text-green-800';
                } else if (order.status === 'shipped') {
                  statusClass = 'bg-blue-100 text-blue-800';
                } else if (order.status === 'confirmed') {
                  statusClass = 'bg-amber-100 text-amber-800';
                } else if (order.status === 'cancelled') {
                  statusClass = 'bg-red-100 text-red-800';
                }
                
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{order.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(order.order_date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.supplier?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.expected_delivery ? formatDate(order.expected_delivery) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.total_cost ? `£${order.total_cost.toFixed(2)}` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {order.status === 'pending' && (
                          <button 
                            onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                            className="text-amber-600 hover:text-amber-900"
                          >
                            Confirm
                          </button>
                        )}
                        
                        {order.status === 'confirmed' && (
                          <button 
                            onClick={() => handleStatusUpdate(order.id, 'shipped')}
                            className="text-amber-600 hover:text-amber-900"
                          >
                            Mark Shipped
                          </button>
                        )}
                        
                        {order.status === 'shipped' && (
                          <button 
                            onClick={() => handleStatusUpdate(order.id, 'delivered')}
                            className="text-amber-600 hover:text-amber-900"
                          >
                            Mark Delivered
                          </button>
                        )}
                        
                        {(order.status === 'pending' || order.status === 'confirmed') && (
                          <button 
                            onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        )}
                        
                        <button className="text-blue-600 hover:text-blue-900">
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdersView;
