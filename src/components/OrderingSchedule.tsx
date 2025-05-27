import React, { useState } from 'react';
import useSWR from 'swr';
import LoadingSpinner from './ui/LoadingSpinner';

// SWR fetcher function
const fetcher = (url: string) => fetch(url).then(res => res.json());

interface ScheduleItem {
  category: string;
  frequency: string;
  orderDay: string;
  cutoffTime: string;
  deliveryTime: string;
  items: string[];
  nextOrderDate: string;
  status: 'upcoming' | 'today' | 'past_due';
}

const OrderingSchedule: React.FC = () => {
  const [selectedSchedule, setSelectedSchedule] = useState<string>('all');
  
  // Fetch products to organize by schedule
  const { data: productsData, error: productsError, isLoading: isLoadingProducts } = useSWR(
    '/api/products', 
    fetcher
  );

  if (isLoadingProducts) {
    return <LoadingSpinner message="Loading ordering schedule..." />;
  }

  if (productsError) {
    return <div className="p-4 bg-red-100 text-red-800 rounded-md">Error loading ordering schedule. Please try again.</div>;
  }

  const { products } = productsData;

  // Define the ordering schedules based on Roni's Bakery requirements
  const orderingSchedules: ScheduleItem[] = [
    {
      category: 'Daily Orders',
      frequency: 'Daily',
      orderDay: 'Every day by 3 PM',
      cutoffTime: '3:00 PM',
      deliveryTime: 'Next morning before 6 AM',
      items: [
        'Fresh bagels (all varieties)',
        'Eggs and milk',
        'Fresh produce (lettuce, tomatoes, cucumbers)',
        'Cooked chicken'
      ],
      nextOrderDate: new Date().toISOString().split('T')[0],
      status: 'today'
    },
    {
      category: 'Twice Weekly',
      frequency: 'Monday & Thursday',
      orderDay: 'Monday & Thursday by 2 PM',
      cutoffTime: '2:00 PM',
      deliveryTime: 'Next day morning',
      items: [
        'Deli meats and fish (smoked salmon, salt beef)',
        'Cheese and dairy products',
        'Fresh produce (non-daily items)',
        'Jewish specialty breads (challah, rye, sourdough)'
      ],
      nextOrderDate: getNextOrderDate(['Monday', 'Thursday']),
      status: getOrderStatus(['Monday', 'Thursday'])
    },
    {
      category: 'Weekly Orders',
      frequency: 'Wednesday',
      orderDay: 'Wednesday for Friday delivery',
      cutoffTime: '5:00 PM Wednesday',
      deliveryTime: 'Friday morning',
      items: [
        'Coffee beans (espresso, filter, decaf)',
        'Tea and beverages',
        'Disposables and packaging',
        'Condiments and seasonings',
        'Cleaning supplies'
      ],
      nextOrderDate: getNextOrderDate(['Wednesday']),
      status: getOrderStatus(['Wednesday'])
    },
    {
      category: 'Monthly Orders',
      frequency: 'First Monday',
      orderDay: 'First Monday of month',
      cutoffTime: '12:00 PM',
      deliveryTime: 'Within 3-5 days',
      items: [
        'Equipment maintenance supplies',
        'Specialty ingredients',
        'Long-shelf-life items',
        'Bulk condiments'
      ],
      nextOrderDate: getFirstMondayOfMonth(),
      status: getOrderStatus([getFirstMondayOfMonth()])
    }
  ];

  // Helper functions
  function getNextOrderDate(days: string[]): string {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const dayMap: { [key: string]: number } = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    
    let nextDate = new Date(today);
    let daysToAdd = 7; // Default to next week
    
    for (const day of days) {
      const targetDay = dayMap[day];
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7; // Next week if day has passed
      if (diff < daysToAdd) daysToAdd = diff;
    }
    
    nextDate.setDate(today.getDate() + daysToAdd);
    return nextDate.toISOString().split('T')[0];
  }

  function getFirstMondayOfMonth(): string {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const firstMonday = new Date(firstDay);
    
    // Find first Monday
    while (firstMonday.getDay() !== 1) {
      firstMonday.setDate(firstMonday.getDate() + 1);
    }
    
    return firstMonday.toISOString().split('T')[0];
  }

  function getOrderStatus(days: string[]): 'upcoming' | 'today' | 'past_due' {
    const today = new Date();
    const currentDay = today.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (days.includes(currentDay)) return 'today';
    return 'upcoming';
  }

  // Filter products by their ordering schedule
  const getProductsBySchedule = (schedule: ScheduleItem) => {
    return products.filter((product: any) => {
      switch (schedule.category) {
        case 'Daily Orders':
          return ['bakery_products', 'dairy', 'produce'].includes(product.category) &&
                 product.lead_time_unit === 'daily';
        case 'Twice Weekly':
          return ['deli', 'specialty_breads'].includes(product.category) &&
                 product.lead_time === 2 && product.lead_time_unit === 'days';
        case 'Weekly Orders':
          return ['coffee', 'beverages', 'disposables', 'condiments', 'cleaning'].includes(product.category) &&
                 product.lead_time === 7;
        case 'Monthly Orders':
          return product.lead_time >= 30 || 
                 ['equipment', 'bulk_items'].includes(product.category);
        default:
          return false;
      }
    });
  };

  const filteredSchedules = selectedSchedule === 'all' 
    ? orderingSchedules 
    : orderingSchedules.filter(s => s.category === selectedSchedule);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Ordering Schedule</h1>
        
        <div className="flex items-center">
          <label htmlFor="schedule" className="mr-2 text-gray-700">Schedule:</label>
          <select
            id="schedule"
            value={selectedSchedule}
            onChange={(e) => setSelectedSchedule(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Schedules</option>
            {orderingSchedules.map((schedule) => (
              <option key={schedule.category} value={schedule.category}>
                {schedule.category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Schedule Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {orderingSchedules.map((schedule) => {
          const statusColors = {
            today: 'bg-red-50 border-red-200 text-red-800',
            upcoming: 'bg-blue-50 border-blue-200 text-blue-800',
            past_due: 'bg-orange-50 border-orange-200 text-orange-800'
          };
          
          return (
            <div 
              key={schedule.category}
              className={`p-4 rounded-lg border ${statusColors[schedule.status]}`}
            >
              <h3 className="font-semibold text-sm">{schedule.category}</h3>
              <p className="text-xs mt-1">{schedule.frequency}</p>
              <p className="text-xs mt-1">Next: {schedule.nextOrderDate}</p>
              <div className="mt-2">
                {schedule.status === 'today' && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                    🔔 Order Today!
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Schedule Cards */}
      <div className="space-y-6">
        {filteredSchedules.map((schedule) => {
          const scheduleProducts = getProductsBySchedule(schedule);
          const lowStockProducts = scheduleProducts.filter((p: any) => 
            p.current_stock <= p.reorder_point
          );
          
          return (
            <div key={schedule.category} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{schedule.category}</h2>
                  <p className="text-gray-600">{schedule.orderDay}</p>
                  <p className="text-sm text-gray-500">
                    Cutoff: {schedule.cutoffTime} • Delivery: {schedule.deliveryTime}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-gray-600">Next Order Date</p>
                  <p className="text-lg font-semibold">{schedule.nextOrderDate}</p>
                  {schedule.status === 'today' && (
                    <span className="inline-block mt-1 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      ⏰ Order Today!
                    </span>
                  )}
                </div>
              </div>
              
              {/* Items to Order */}
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Standard Items:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {schedule.items.map((item, index) => (
                    <div key={index} className="text-sm text-gray-700 flex items-center">
                      <span className="mr-2">•</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Products Needing Reorder */}
              {lowStockProducts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2">
                    🚨 Items Needing Immediate Reorder ({lowStockProducts.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {lowStockProducts.map((product: any) => (
                      <div key={product.id} className="text-sm bg-white p-2 rounded border">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-gray-600">
                          Stock: {product.current_stock} {product.unit} 
                          (Need: {product.order_quantity} {product.unit})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Quick Actions */}
              <div className="mt-4 flex space-x-3">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
                  📋 Create Order List
                </button>
                <button className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700">
                  📧 Email Suppliers
                </button>
                <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50">
                  📊 View History
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderingSchedule;