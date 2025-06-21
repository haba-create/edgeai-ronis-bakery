import { useEffect, useCallback, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

interface DataRefreshOptions {
  tables?: string[];
  interval?: number;
  onRefresh?: (changedTables: string[]) => void;
  enabled?: boolean;
}

interface DatabaseChange {
  table_name: string;
  last_modified: string;
  change_type: 'insert' | 'update' | 'delete';
  affected_rows: number;
}

/**
 * Hook to monitor database changes and trigger UI refreshes
 * when agents modify data through dynamic SQL or other tools
 */
export function useDataRefresh({
  tables = [],
  interval = 5000,
  onRefresh,
  enabled = true
}: DataRefreshOptions = {}) {
  const { data: session } = useSession();
  const lastCheck = useRef<Date>(new Date());
  const timeoutRef = useRef<NodeJS.Timeout>();

  const checkForChanges = useCallback(async () => {
    if (!enabled || !session) return;

    try {
      const params = new URLSearchParams({
        since: lastCheck.current.toISOString(),
        ...(tables.length > 0 && { tables: tables.join(',') })
      });

      const response = await fetch(`/api/database-changes?${params}`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.changes && data.changes.length > 0) {
          const changedTables: string[] = Array.from(new Set(data.changes.map((c: DatabaseChange) => c.table_name)));
          
          if (onRefresh) {
            onRefresh(changedTables);
          }
          
          // Dispatch custom event for components to listen to
          window.dispatchEvent(new CustomEvent('databaseChanged', {
            detail: {
              tables: changedTables,
              changes: data.changes
            }
          }));
          
          lastCheck.current = new Date();
        }
      }
    } catch (error) {
      console.error('Failed to check for database changes:', error);
    }
  }, [enabled, session, tables, onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    // Initial check
    checkForChanges();

    // Set up polling
    const poll = () => {
      checkForChanges();
      timeoutRef.current = setTimeout(poll, interval);
    };

    timeoutRef.current = setTimeout(poll, interval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, interval, checkForChanges]);

  // Manual refresh function
  const refreshNow = useCallback(() => {
    return checkForChanges();
  }, [checkForChanges]);

  return { refreshNow };
}

/**
 * Hook for specific table monitoring with automatic state updates
 */
export function useTableData<T>(
  tableName: string,
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [fetchFn, ...dependencies]);

  // Listen for database changes
  useEffect(() => {
    const handleDatabaseChange = (event: CustomEvent) => {
      const { tables } = event.detail;
      if (tables.includes(tableName)) {
        fetchData();
      }
    };

    window.addEventListener('databaseChanged', handleDatabaseChange as EventListener);
    return () => {
      window.removeEventListener('databaseChanged', handleDatabaseChange as EventListener);
    };
  }, [tableName, fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for monitoring agent activities in real-time
 */
export function useAgentActivity(options: {
  roles?: string[];
  actions?: string[];
  onActivity?: (activity: any) => void;
} = {}) {
  const { data: session } = useSession();
  const lastActivityId = useRef<number>(0);

  const checkForNewActivity = useCallback(async () => {
    if (!session) return;

    try {
      const params = new URLSearchParams({
        limit: '10',
        since_id: lastActivityId.current.toString()
      });

      if (options.roles && options.roles.length > 0) {
        params.append('user_role', options.roles.join(','));
      }

      if (options.actions && options.actions.length > 0) {
        params.append('action_type', options.actions.join(','));
      }

      const response = await fetch(`/api/activity-log?${params}`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.activities && data.activities.length > 0) {
          const newActivities = data.activities.filter((a: any) => a.id > lastActivityId.current);
          
          if (newActivities.length > 0) {
            lastActivityId.current = Math.max(...newActivities.map((a: any) => a.id));
            
            newActivities.forEach((activity: any) => {
              if (options.onActivity) {
                options.onActivity(activity);
              }
            });

            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('agentActivity', {
              detail: { activities: newActivities }
            }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to check for agent activity:', error);
    }
  }, [session, options]);

  useDataRefresh({
    enabled: !!session,
    interval: 3000,
    onRefresh: checkForNewActivity
  });

  return { checkForNewActivity };
}