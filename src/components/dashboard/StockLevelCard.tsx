import React from 'react';

interface StockLevelCardProps {
  title: string;
  count: number | string;
  icon: string;
  status?: 'good' | 'warning' | 'critical';
  subtitle?: string;
}

const StockLevelCard: React.FC<StockLevelCardProps> = ({ 
  title, 
  count, 
  icon,
  status = 'good',
  subtitle
}) => {
  const getStatusColor = () => {
    switch(status) {
      case 'warning': return 'bg-amber-100 border-amber-500 text-amber-800';
      case 'critical': return 'bg-red-100 border-red-500 text-red-800';
      case 'good': 
      default: return 'bg-green-100 border-green-500 text-green-800';
    }
  };
  
  return (
    <div className={`dashboard-card border-l-4 ${getStatusColor()}`}>
      <div className="flex items-center">
        <div className="p-3 rounded-full mr-4 text-2xl">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-3xl font-bold">{count}</p>
          {subtitle && (
            <p className="text-sm opacity-75 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockLevelCard;
