import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface ActivityLogEntry {
  id: number;
  timestamp: string;
  user_role: string;
  action_type: string;
  description: string;
  table_affected?: string;
  records_changed?: number;
  tool_name?: string;
  success: boolean;
  details?: any;
}

interface ActivityLogProps {
  tenantId?: number;
  limit?: number;
  refreshInterval?: number;
  showFilters?: boolean;
}

export default function ActivityLog({ 
  tenantId, 
  limit = 50, 
  refreshInterval = 5000,
  showFilters = true 
}: ActivityLogProps) {
  const { data: session } = useSession();
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action_type: 'all',
    user_role: 'all',
    success: 'all'
  });

  const fetchActivities = async () => {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(tenantId && { tenant_id: tenantId.toString() }),
        ...(filter.action_type !== 'all' && { action_type: filter.action_type }),
        ...(filter.user_role !== 'all' && { user_role: filter.user_role }),
        ...(filter.success !== 'all' && { success: filter.success })
      });

      const response = await fetch(`/api/activity-log?${params}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    
    const interval = setInterval(fetchActivities, refreshInterval);
    return () => clearInterval(interval);
  }, [tenantId, limit, refreshInterval, filter]);

  const getActionIcon = (actionType: string, success: boolean) => {
    const baseClasses = "w-4 h-4 mr-2";
    
    if (!success) {
      return <span className={`${baseClasses} text-red-500`}>❌</span>;
    }

    switch (actionType) {
      case 'sql_query':
        return <span className={`${baseClasses} text-blue-500`}>🔍</span>;
      case 'email_sent':
        return <span className={`${baseClasses} text-green-500`}>📧</span>;
      case 'order_created':
        return <span className={`${baseClasses} text-purple-500`}>🛒</span>;
      case 'inventory_updated':
        return <span className={`${baseClasses} text-orange-500`}>📦</span>;
      case 'delivery_updated':
        return <span className={`${baseClasses} text-yellow-600`}>🚚</span>;
      case 'tool_execution':
        return <span className={`${baseClasses} text-indigo-500`}>🔧</span>;
      default:
        return <span className={`${baseClasses} text-gray-500`}>📝</span>;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
      driver: 'bg-blue-100 text-blue-800',
      supplier: 'bg-green-100 text-green-800',
      customer: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role as keyof typeof colors] || colors.customer}`}>
        {role}
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          <button
            onClick={fetchActivities}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Refresh
          </button>
        </div>
        
        {/* Filters */}
        {showFilters && (
          <div className="mt-4 flex flex-wrap gap-4">
            <select
              value={filter.action_type}
              onChange={(e) => setFilter(prev => ({ ...prev, action_type: e.target.value }))}
              className="text-sm border border-gray-300 rounded px-3 py-1"
            >
              <option value="all">All Actions</option>
              <option value="sql_query">SQL Queries</option>
              <option value="email_sent">Emails</option>
              <option value="order_created">Orders</option>
              <option value="inventory_updated">Inventory</option>
              <option value="delivery_updated">Deliveries</option>
            </select>

            <select
              value={filter.user_role}
              onChange={(e) => setFilter(prev => ({ ...prev, user_role: e.target.value }))}
              className="text-sm border border-gray-300 rounded px-3 py-1"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="driver">Driver</option>
              <option value="supplier">Supplier</option>
              <option value="customer">Customer</option>
            </select>

            <select
              value={filter.success}
              onChange={(e) => setFilter(prev => ({ ...prev, success: e.target.value }))}
              className="text-sm border border-gray-300 rounded px-3 py-1"
            >
              <option value="all">All Results</option>
              <option value="true">Successful</option>
              <option value="false">Failed</option>
            </select>
          </div>
        )}
      </div>

      {/* Activity List */}
      <div className="max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No recent activity found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activities.map((activity) => (
              <div key={activity.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getActionIcon(activity.action_type, activity.success)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 mb-1">
                        {activity.description}
                      </p>
                      
                      {/* Details */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {getRoleBadge(activity.user_role)}
                        
                        {activity.tool_name && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {activity.tool_name}
                          </span>
                        )}
                        
                        {activity.table_affected && (
                          <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded">
                            {activity.table_affected}
                          </span>
                        )}
                        
                        {activity.records_changed && (
                          <span className="text-gray-600">
                            {activity.records_changed} records
                          </span>
                        )}
                      </div>

                      {/* Expandable Details */}
                      {activity.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-500">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(activity.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 ml-4 flex-shrink-0">
                    {formatTimestamp(activity.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}