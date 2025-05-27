import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import LoadingSpinner from './ui/LoadingSpinner';

// SWR fetcher function
const fetcher = (url: string) => fetch(url).then(res => res.json());

const InventoryView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Fetch all products and categories
  const { data: productsData, error: productsError, isLoading: isLoadingProducts } = useSWR(
    '/api/products', 
    fetcher
  );
  
  const { data: categoriesData, error: categoriesError, isLoading: isLoadingCategories } = useSWR(
    '/api/products?categories=true', 
    fetcher
  );
  
  if (isLoadingProducts || isLoadingCategories) {
    return <LoadingSpinner message="Loading inventory data..." />;
  }
  
  if (productsError || categoriesError) {
    return <div className="p-4 bg-red-100 text-red-800 rounded-md">Error loading inventory data. Please try again.</div>;
  }
  
  const { products } = productsData;
  const { categories } = categoriesData;
  
  // Filter products by category and search term
  const filteredProducts = products.filter((product: any) => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });
  
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleRecordUsage = async (productId: number, amount: number) => {
    try {
      await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'recordConsumption',
          quantity: amount,
          notes: 'Recorded from inventory view'
        }),
      });
      
      // Trigger SWR to revalidate the data
      // This will update the UI with the latest stock levels
      mutate('/api/products');
    } catch (error) {
      console.error('Failed to record usage:', error);
    }
  };
  
  // Sort products by stock status (critical first, then low, then ok)
  const sortedProducts = [...filteredProducts].sort((a: any, b: any) => {
    const stockStatusOrder: { [key: string]: number } = { critical: 0, low: 1, ok: 2 };
    return stockStatusOrder[a.stock_status] - stockStatusOrder[b.stock_status];
  });
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        
        <div className="flex space-x-4">
          <div className="flex items-center">
            <label htmlFor="category" className="mr-2 text-gray-700">Category:</label>
            <select
              id="category"
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Categories</option>
              {categories.map((category: string) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center">
            <label htmlFor="search" className="mr-2 text-gray-700">Search:</label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search products..."
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>
      
      {/* Stock Alerts Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Critical Stock</h3>
          <p className="text-2xl font-bold text-red-600">
            {sortedProducts.filter(p => p.stock_status === 'critical').length}
          </p>
          <p className="text-sm text-red-600">Items need immediate reordering</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-amber-800 mb-2">Low Stock</h3>
          <p className="text-2xl font-bold text-amber-600">
            {sortedProducts.filter(p => p.stock_status === 'low').length}
          </p>
          <p className="text-sm text-amber-600">Items approaching reorder point</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Good Stock</h3>
          <p className="text-2xl font-bold text-green-600">
            {sortedProducts.filter(p => p.stock_status === 'ok').length}
          </p>
          <p className="text-sm text-green-600">Items at optimal levels</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Information
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usage & Thresholds
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status & Alerts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier & Lead Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No products found. Try changing your filters.
                </td>
              </tr>
            ) : (
              sortedProducts.map((product: any) => {
                // Determine stock status styling
                let statusClass = 'bg-green-100 text-green-800';
                if (product.stock_status === 'critical') {
                  statusClass = 'bg-red-100 text-red-800';
                } else if (product.stock_status === 'low') {
                  statusClass = 'bg-amber-100 text-amber-800';
                }

                // Storage temperature icon
                const getStorageIcon = (temp: string) => {
                  switch (temp) {
                    case 'frozen': return '🧊';
                    case 'refrigerated': return '❄️';
                    case 'room_temp': return '🌡️';
                    default: return '📦';
                  }
                };
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            {product.name}
                            {product.kosher_certified && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                ✓ Kosher
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            {getStorageIcon(product.storage_temp)}
                            <span className="ml-1">
                              {product.storage_temp?.replace('_', ' ').toUpperCase()}
                            </span>
                            {product.shelf_life_days && (
                              <span className="ml-2">
                                📅 {product.shelf_life_days}d shelf life
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {product.current_stock} {product.unit}
                      </div>
                      <div className="text-xs text-gray-500">
                        Optimal: {product.optimal_stock} {product.unit}
                      </div>
                      <div className="text-xs text-gray-500">
                        Price: £{product.price?.toFixed(2) || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        Daily usage: {product.daily_usage} {product.unit}
                      </div>
                      <div className="text-xs text-gray-500">
                        Reorder at: {product.reorder_point} {product.unit}
                      </div>
                      <div className="text-xs text-gray-500">
                        Order qty: {product.order_quantity} {product.unit}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass} w-fit`}>
                          {product.stock_status === 'critical' ? '🔴 Critical' : 
                           product.stock_status === 'low' ? '🟡 Low' : '🟢 OK'}
                        </span>
                        <div className="text-xs text-gray-600">
                          {product.days_until_stockout === 0 
                            ? "⚠️ Stockout today!" 
                            : `📊 ${product.days_until_stockout} days left`}
                        </div>
                        {product.current_stock <= product.reorder_point && (
                          <div className="text-xs text-red-600 font-medium">
                            🚨 Reorder needed!
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{product.supplier?.name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">
                        Lead: {product.lead_time} {product.lead_time_unit}
                      </div>
                      <div className="text-xs text-gray-500">
                        Last delivery: {product.last_delivery}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex flex-col space-y-2">
                        <button 
                          onClick={() => {
                            const amount = prompt(`How many ${product.unit} of ${product.name} were used?`);
                            if (amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
                              handleRecordUsage(product.id, parseFloat(amount));
                            }
                          }}
                          className="text-blue-600 hover:text-blue-900 text-xs px-2 py-1 border border-blue-300 rounded hover:bg-blue-50"
                        >
                          📝 Record Usage
                        </button>
                        <button className="text-green-600 hover:text-green-900 text-xs px-2 py-1 border border-green-300 rounded hover:bg-green-50">
                          🛒 Quick Order
                        </button>
                        {product.current_stock <= product.reorder_point && (
                          <button className="text-red-600 hover:text-red-900 text-xs px-2 py-1 border border-red-300 rounded hover:bg-red-50 font-medium">
                            ⚡ Urgent Order
                          </button>
                        )}
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

export default InventoryView;
