import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface AgentNotification {
  id: string;
  timestamp: Date;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  agentRole: string;
  action: string;
  data?: any;
}

interface AgentNotificationsProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxNotifications?: number;
  autoHideDelay?: number;
}

export default function AgentNotifications({ 
  position = 'top-right',
  maxNotifications = 5,
  autoHideDelay = 8000
}: AgentNotificationsProps) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [lastActivityCheck, setLastActivityCheck] = useState(new Date());

  // Position styles
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  // Check for new agent activities
  const checkForNewActivities = async () => {
    try {
      const response = await fetch(`/api/activity-log?limit=10&since=${lastActivityCheck.toISOString()}`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.activities && data.activities.length > 0) {
          const newNotifications = data.activities
            .filter((activity: any) => new Date(activity.timestamp) > lastActivityCheck)
            .map((activity: any) => createNotificationFromActivity(activity))
            .filter(Boolean);

          if (newNotifications.length > 0) {
            setNotifications(prev => {
              const updated = [...newNotifications, ...prev];
              return updated.slice(0, maxNotifications);
            });
            setLastActivityCheck(new Date());
          }
        }
      }
    } catch (error) {
      console.error('Failed to check for new activities:', error);
    }
  };

  // Convert activity to notification
  const createNotificationFromActivity = (activity: any): AgentNotification | null => {
    const id = `${activity.id}-${Date.now()}`;
    const timestamp = new Date(activity.timestamp);
    
    let type: AgentNotification['type'] = 'info';
    let title = '';
    let message = '';

    switch (activity.action_type) {
      case 'sql_query':
        type = activity.success ? 'success' : 'error';
        title = activity.success ? 'Database Query Executed' : 'Database Query Failed';
        message = activity.success 
          ? `Agent executed SQL query and found ${activity.records_changed || 'some'} records`
          : 'Agent database query encountered an error';
        break;

      case 'email_sent':
        type = activity.success ? 'success' : 'error';
        title = activity.success ? 'Email Sent' : 'Email Failed';
        message = activity.success 
          ? 'Agent successfully sent email notification'
          : 'Agent failed to send email notification';
        break;

      case 'order_created':
        type = activity.success ? 'success' : 'warning';
        title = 'Order Created';
        message = activity.success 
          ? 'Agent created a new order successfully'
          : 'Agent order creation had issues';
        break;

      case 'inventory_updated':
        type = activity.success ? 'info' : 'warning';
        title = 'Inventory Updated';
        message = activity.success 
          ? `Agent updated ${activity.records_changed || 'inventory'} items`
          : 'Agent inventory update encountered issues';
        break;

      case 'delivery_updated':
        type = activity.success ? 'info' : 'warning';
        title = 'Delivery Status Updated';
        message = activity.success 
          ? 'Agent updated delivery status'
          : 'Agent delivery update had issues';
        break;

      default:
        type = activity.success ? 'info' : 'error';
        title = 'Agent Action';
        message = activity.description || 'Agent performed an action';
    }

    return {
      id,
      timestamp,
      type,
      title,
      message,
      agentRole: activity.user_role || 'unknown',
      action: activity.action_type,
      data: activity.details ? JSON.parse(activity.details) : null
    };
  };

  // Auto-hide notifications
  useEffect(() => {
    if (notifications.length === 0) return;

    const timeouts = notifications.map(notification => 
      setTimeout(() => {
        removeNotification(notification.id);
      }, autoHideDelay)
    );

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [notifications, autoHideDelay]);

  // Polling for new activities
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(checkForNewActivities, 3000); // Check every 3 seconds
    return () => clearInterval(interval);
  }, [session, lastActivityCheck]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: AgentNotification['type']) => {
    switch (type) {
      case 'success':
        return <span className="text-green-500">✅</span>;
      case 'warning':
        return <span className="text-yellow-500">⚠️</span>;
      case 'error':
        return <span className="text-red-500">❌</span>;
      case 'info':
      default:
        return <span className="text-blue-500">ℹ️</span>;
    }
  };

  const getNotificationStyles = (type: AgentNotification['type']) => {
    const baseStyles = "mb-3 p-4 rounded-lg shadow-lg max-w-sm bg-white border-l-4 transform transition-all duration-300 hover:scale-105";
    
    switch (type) {
      case 'success':
        return `${baseStyles} border-l-green-500`;
      case 'warning':
        return `${baseStyles} border-l-yellow-500`;
      case 'error':
        return `${baseStyles} border-l-red-500`;
      case 'info':
      default:
        return `${baseStyles} border-l-blue-500`;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'driver':
        return 'bg-blue-100 text-blue-800';
      case 'supplier':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {notifications.map((notification) => (
        <div key={notification.id} className={getNotificationStyles(notification.type)}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {getNotificationIcon(notification.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {notification.title}
                  </h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(notification.agentRole)}`}>
                    {notification.agentRole}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-400">
                  {notification.timestamp.toLocaleTimeString()}
                </p>
                
                {/* Expandable details */}
                {notification.data && (
                  <details className="mt-2">
                    <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-500">
                      View Details
                    </summary>
                    <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto max-h-20">
                      {JSON.stringify(notification.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
            
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <span className="text-lg">×</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}