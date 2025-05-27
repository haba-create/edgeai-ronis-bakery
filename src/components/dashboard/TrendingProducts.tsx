import React from 'react';
import { ConsumptionTrend } from '@/models/types';

interface TrendingProductsProps {
  trends: ConsumptionTrend[];
}

const TrendingProducts: React.FC<TrendingProductsProps> = ({ trends }) => {
  // Sort trends by absolute percentage change
  const sortedTrends = [...trends].sort((a, b) => 
    Math.abs(b.trend_percentage) - Math.abs(a.trend_percentage)
  ).slice(0, 5); // Show top 5 trending products
  
  return (
    <div className="space-y-4">
      {sortedTrends.length === 0 ? (
        <div className="p-4 bg-gray-100 text-gray-700 rounded-md">
          No significant trends detected in the last 7 days.
        </div>
      ) : (
        <ul className="divide-y">
          {sortedTrends.map(trend => {
            const isIncreasing = trend.trend_direction === 'increasing';
            const isDecreasing = trend.trend_direction === 'decreasing';
            let badgeColor = 'bg-gray-100 text-gray-800';
            let arrowIcon = '→';
            
            if (isIncreasing) {
              badgeColor = 'bg-red-100 text-red-800';
              arrowIcon = '↑';
            } else if (isDecreasing) {
              badgeColor = 'bg-green-100 text-green-800';
              arrowIcon = '↓';
            }
            
            return (
              <li key={trend.product_id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{trend.product_name}</p>
                  <p className="text-sm text-gray-600">
                    {trend.avg_daily_consumption.toFixed(2)} units/day
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full ${badgeColor}`}>
                  <span className="font-bold">{arrowIcon}</span> {Math.abs(trend.trend_percentage).toFixed(1)}%
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TrendingProducts;
