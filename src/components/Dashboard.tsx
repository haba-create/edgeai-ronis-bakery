import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import useSWR from 'swr';
import StockLevelCard from './dashboard/StockLevelCard';
import OrdersTable from './dashboard/OrdersTable';
import AlertsSection from './dashboard/AlertsSection';
import TrendingProducts from './dashboard/TrendingProducts';
import LoadingSpinner from './ui/LoadingSpinner';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

// SWR fetcher function
const fetcher = (url: string) => fetch(url).then(res => res.json());

const Dashboard: React.FC = () => {
  // Fetch dashboard data with SWR for real-time updates
  const { data, error, isLoading } = useSWR('/api/dashboard', fetcher, {
    refreshInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch additional data for enhanced dashboard
  const { data: productsData } = useSWR('/api/products', fetcher);
  const { data: suppliersData } = useSWR('/api/suppliers', fetcher);
  
  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard data..." />;
  }
  
  if (error) {
    return <div className="p-4 bg-red-100 text-red-800 rounded-md">Error loading dashboard data. Please try again.</div>;
  }
  
  const { alerts, pendingOrders, trends, stats } = data;
  const products = productsData?.products || [];
  const suppliers = suppliersData?.suppliers || [];
  
  // Prepare consumption data for select products
  const highConsumptionProducts = trends
    .sort((a: any, b: any) => b.avg_daily_consumption - a.avg_daily_consumption)
    .slice(0, 6);
    
  const consumptionData = {
    labels: highConsumptionProducts.map((p: any) => p.product_name),
    datasets: [
      {
        label: 'Average Daily Consumption',
        data: highConsumptionProducts.map((p: any) => p.avg_daily_consumption),
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',   // Blue
          'rgba(16, 185, 129, 0.7)',   // Green  
          'rgba(245, 158, 11, 0.7)',   // Yellow
          'rgba(139, 92, 246, 0.7)',   // Purple
          'rgba(236, 72, 153, 0.7)',   // Pink
          'rgba(34, 197, 94, 0.7)',    // Emerald
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(139, 92, 246)',
          'rgb(236, 72, 153)',
          'rgb(34, 197, 94)',
        ],
        borderWidth: 2,
      }
    ],
  };
  
  // Calculate additional metrics
  const totalInventoryValue = products.reduce((sum: number, product: any) => {
    return sum + (product.current_stock * product.price);
  }, 0);

  const lowStockProducts = products.filter((product: any) => 
    product.current_stock <= product.reorder_point
  );

  const criticalStockProducts = products.filter((product: any) => 
    product.current_stock <= product.reorder_point * 0.5
  );

  // Category breakdown
  const categoryBreakdown = products.reduce((acc: Record<string, number>, product: any) => {
    const category = product.category;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const categoryData = {
    labels: Object.keys(categoryBreakdown),
    datasets: [
      {
        label: 'Products by Category',
        data: Object.values(categoryBreakdown),
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',   // Blue
          'rgba(16, 185, 129, 0.7)',   // Green
          'rgba(245, 158, 11, 0.7)',   // Yellow
          'rgba(139, 92, 246, 0.7)',   // Purple
          'rgba(236, 72, 153, 0.7)',   // Pink
          'rgba(34, 197, 94, 0.7)',    // Emerald
          'rgba(249, 115, 22, 0.7)',   // Orange
          'rgba(168, 85, 247, 0.7)',   // Violet
        ],
        borderWidth: 0,
      }
    ],
  };

  // Stock health overview
  const healthyStock = products.length - lowStockProducts.length;
  const stockHealthData = {
    labels: ['Healthy Stock', 'Low Stock', 'Critical Stock'],
    datasets: [
      {
        data: [healthyStock, lowStockProducts.length - criticalStockProducts.length, criticalStockProducts.length],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',    // Green
          'rgba(245, 158, 11, 0.8)',   // Yellow  
          'rgba(239, 68, 68, 0.8)',    // Red
        ],
        borderWidth: 0,
      }
    ],
  };

  // Supplier distribution
  const supplierBreakdown = products.reduce((acc: Record<string, number>, product: any) => {
    const supplier = product.supplier_name || 'Unknown';
    acc[supplier] = (acc[supplier] || 0) + 1;
    return acc;
  }, {});

  const topSuppliers = Object.entries(supplierBreakdown)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5);

  const supplierData = {
    labels: topSuppliers.map(([name]) => name),
    datasets: [
      {
        label: 'Products per Supplier',
        data: topSuppliers.map(([, count]) => count),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
      }
    ],
  };
  
  return (
    <div className="space-y-8">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StockLevelCard 
          title="Total Products" 
          count={products.length} 
          icon="📦" 
          status="good"
          subtitle={`${Object.keys(categoryBreakdown).length} categories`}
        />
        <StockLevelCard 
          title="Inventory Value" 
          count={`£${totalInventoryValue.toLocaleString()}`} 
          icon="💰" 
          status="good"
          subtitle="Current stock value"
        />
        <StockLevelCard 
          title="Critical Items" 
          count={criticalStockProducts.length} 
          icon="⚠️" 
          status={criticalStockProducts.length > 0 ? 'critical' : 'good'}
          subtitle="Need immediate attention"
        />
        <StockLevelCard 
          title="Low Stock Items" 
          count={lowStockProducts.length} 
          icon="📉" 
          status={lowStockProducts.length > 5 ? 'warning' : lowStockProducts.length > 0 ? 'warning' : 'good'}
          subtitle="Below reorder point"
        />
      </div>

      {/* Operational Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StockLevelCard 
          title="Pending Orders" 
          count={stats.pendingOrders} 
          icon="🛒" 
          status="good"
          subtitle="Awaiting delivery"
        />
        <StockLevelCard 
          title="Active Suppliers" 
          count={suppliers.length} 
          icon="🏢" 
          status="good"
          subtitle="Partner suppliers"
        />
        <StockLevelCard 
          title="Expected Deliveries" 
          count={stats.expectedDeliveries} 
          icon="🚚" 
          status="good"
          subtitle="Coming today"
        />
        <StockLevelCard 
          title="Healthy Stock" 
          count={healthyStock} 
          icon="✅" 
          status="good"
          subtitle="Well-stocked items"
        />
      </div>

      {alerts && alerts.length > 0 && (
        <AlertsSection alerts={alerts} />
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="dashboard-card">
          <h2 className="text-xl font-bold mb-4">Stock Health Overview</h2>
          <Doughnut 
            data={stockHealthData} 
            options={{
              responsive: true,
              plugins: {
                legend: { 
                  position: 'bottom',
                  labels: { usePointStyle: true, padding: 20 }
                },
              },
            }} 
          />
          <div className="mt-4 text-center text-sm text-gray-600">
            {healthyStock} of {products.length} products are well-stocked
          </div>
        </div>
        
        <div className="dashboard-card">
          <h2 className="text-xl font-bold mb-4">Product Categories</h2>
          <Doughnut 
            data={categoryData} 
            options={{
              responsive: true,
              plugins: {
                legend: { 
                  position: 'bottom',
                  labels: { 
                    usePointStyle: true, 
                    padding: 15,
                    font: { size: 11 }
                  }
                },
              },
            }} 
          />
          <div className="mt-4 text-center text-sm text-gray-600">
            {Object.keys(categoryBreakdown).length} product categories
          </div>
        </div>

        <div className="dashboard-card">
          <h2 className="text-xl font-bold mb-4">Top Suppliers</h2>
          <Bar 
            data={supplierData} 
            options={{
              responsive: true,
              plugins: {
                legend: { display: false },
              },
              scales: {
                y: { 
                  beginAtZero: true, 
                  title: { display: true, text: 'Products' },
                  ticks: { stepSize: 1 }
                },
                x: {
                  ticks: {
                    maxRotation: 45,
                    minRotation: 45
                  }
                }
              },
            }} 
          />
        </div>
      </div>

      {/* Consumption and Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dashboard-card">
          <h2 className="text-xl font-bold mb-4">Top Product Consumption</h2>
          <Bar 
            data={consumptionData} 
            options={{
              responsive: true,
              plugins: {
                legend: { display: false },
                title: { display: true, text: 'Average Daily Usage (Last 7 Days)' },
              },
              scales: {
                y: { 
                  beginAtZero: true, 
                  title: { display: true, text: 'Units/Day' }
                },
                x: {
                  ticks: {
                    maxRotation: 45,
                    minRotation: 0
                  }
                }
              },
            }} 
          />
        </div>
        
        <div className="dashboard-card">
          <h2 className="text-xl font-bold mb-4">Consumption Trends</h2>
          <TrendingProducts trends={trends} />
        </div>
      </div>

      {/* Orders Section */}
      <div className="dashboard-card">
        <h2 className="text-xl font-bold mb-4">Recent Orders & Deliveries</h2>
        {pendingOrders && pendingOrders.length > 0 ? (
          <OrdersTable orders={pendingOrders} />
        ) : (
          <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 text-green-800 rounded-lg border border-green-200">
            <div className="flex items-center">
              <span className="text-2xl mr-3">✅</span>
              <div>
                <h3 className="font-semibold">All orders up to date!</h3>
                <p className="text-sm text-green-600">No pending orders at this time. Everything is running smoothly.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
