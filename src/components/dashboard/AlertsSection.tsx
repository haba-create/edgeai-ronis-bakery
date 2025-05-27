import React from 'react';
import { StockAlert } from '@/models/types';

interface AlertsSectionProps {
  alerts: StockAlert[];
}

const AlertsSection: React.FC<AlertsSectionProps> = ({ alerts }) => {
  // Separate alerts by priority
  const highPriorityAlerts = alerts.filter(alert => alert.priority === 'high');
  const mediumPriorityAlerts = alerts.filter(alert => alert.priority === 'medium');
  const lowPriorityAlerts = alerts.filter(alert => alert.priority === 'low');
  
  // Only show critical alerts initially
  const [showAllAlerts, setShowAllAlerts] = React.useState(false);
  
  const displayAlerts = showAllAlerts ? alerts : highPriorityAlerts;
  
  return (
    <div className="dashboard-card bg-amber-50 border border-amber-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center">
          <span className="text-amber-500 mr-2">⚠️</span> 
          Inventory Alerts
        </h2>
        
        {alerts.length > highPriorityAlerts.length && (
          <button 
            onClick={() => setShowAllAlerts(!showAllAlerts)}
            className="text-sm text-amber-700 hover:text-amber-900"
          >
            {showAllAlerts ? 'Show Critical Only' : 'Show All Alerts'}
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {displayAlerts.length === 0 ? (
          <div className="p-3 rounded-md bg-green-100 text-green-800 border border-green-300">
            No critical alerts! All inventory levels are in good shape.
          </div>
        ) : (
          displayAlerts.map(alert => {
            let alertClass = '';
            
            switch(alert.priority) {
              case 'high':
                alertClass = 'bg-red-100 text-red-800 border-red-300';
                break;
              case 'medium':
                alertClass = 'bg-amber-100 text-amber-800 border-amber-300';
                break;
              case 'low':
                alertClass = 'bg-blue-100 text-blue-800 border-blue-300';
                break;
            }
            
            return (
              <div 
                key={alert.product.id}
                className={`p-3 rounded-md border ${alertClass}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{alert.product.name}</h3>
                    <p>
                      Stock: <span className="font-bold">{alert.product.current_stock}</span> {alert.product.unit}s 
                      (Below reorder point of {alert.product.reorder_point})
                    </p>
                    <p className="text-sm">
                      {alert.product.days_until_stockout === 0 
                        ? "Predicted to run out today!" 
                        : `Predicted stockout in ${alert.product.days_until_stockout} days`}
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <span className="text-xs">
                      Order: {alert.recommended_order_quantity} {alert.product.unit}s
                    </span>
                    <button className="brand-button text-sm">
                      Order Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Summary footer */}
        <div className="pt-2 text-sm text-gray-600 border-t border-amber-200">
          <p>
            {highPriorityAlerts.length} critical, {mediumPriorityAlerts.length} warning, 
            and {lowPriorityAlerts.length} low priority alerts
          </p>
        </div>
      </div>
    </div>
  );
};

export default AlertsSection;
