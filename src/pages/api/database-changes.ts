import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getDb } from '@/utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = await getDb();
    const {
      since,
      tables,
      tenant_id
    } = req.query;

    // Since SQLite doesn't have built-in change tracking,
    // we'll check for recent changes in key tables by looking at
    // tool usage logs and email logs

    let changes: any[] = [];

    // Check tool usage logs for recent database operations
    let toolQuery = `
      SELECT 
        'tool_usage_logs' as table_name,
        created_at as last_modified,
        CASE 
          WHEN tool_name = 'execute_dynamic_sql' AND parameters LIKE '%INSERT%' THEN 'insert'
          WHEN tool_name = 'execute_dynamic_sql' AND parameters LIKE '%UPDATE%' THEN 'update'
          WHEN tool_name = 'execute_dynamic_sql' AND parameters LIKE '%DELETE%' THEN 'delete'
          ELSE 'unknown'
        END as change_type,
        COALESCE(
          CAST(SUBSTR(result, INSTR(result, '"changes":') + 9, 
               INSTR(result || ',', ',', INSTR(result, '"changes":')) - INSTR(result, '"changes":') - 9) AS INTEGER),
          1
        ) as affected_rows,
        tool_name,
        parameters
      FROM tool_usage_logs
      WHERE success = 1
        AND tool_name = 'execute_dynamic_sql'
    `;

    const params: any[] = [];

    if (since) {
      toolQuery += ' AND created_at > ?';
      params.push(since);
    } else {
      toolQuery += ' AND created_at > datetime("now", "-5 minutes")';
    }

    if (tenant_id) {
      toolQuery += ' AND tenant_id = ?';
      params.push(tenant_id);
    }

    toolQuery += ' ORDER BY created_at DESC LIMIT 20';

    const toolChanges = await db.all(toolQuery, params);

    // Parse which tables were actually affected from SQL queries
    const parsedChanges = toolChanges.map((change: any) => {
      let actualTable = 'unknown';
      
      if (change.parameters) {
        try {
          const params = JSON.parse(change.parameters);
          const query = params.query || '';
          
          // Extract table name from SQL query
          const upperQuery = query.toUpperCase();
          const patterns = [
            /FROM\s+(\w+)/,
            /INTO\s+(\w+)/,
            /UPDATE\s+(\w+)/,
            /DELETE\s+FROM\s+(\w+)/
          ];
          
          for (const pattern of patterns) {
            const match = upperQuery.match(pattern);
            if (match && match[1]) {
              actualTable = match[1].toLowerCase();
              break;
            }
          }
        } catch (e) {
          // If we can't parse, keep original table name
        }
      }

      return {
        ...change,
        table_name: actualTable
      };
    });

    changes = changes.concat(parsedChanges);

    // Check email logs for recent email activities
    let emailQuery = `
      SELECT 
        'email_logs' as table_name,
        sent_at as last_modified,
        'insert' as change_type,
        1 as affected_rows,
        'send_email_notification' as tool_name,
        subject as parameters
      FROM email_logs
    `;

    const emailParams: any[] = [];

    if (since) {
      emailQuery += ' WHERE sent_at > ?';
      emailParams.push(since);
    } else {
      emailQuery += ' WHERE sent_at > datetime("now", "-5 minutes")';
    }

    if (tenant_id) {
      emailQuery += (since ? ' AND' : ' WHERE') + ' tenant_id = ?';
      emailParams.push(tenant_id);
    }

    emailQuery += ' ORDER BY sent_at DESC LIMIT 10';

    const emailChanges = await db.all(emailQuery, emailParams);
    changes = changes.concat(emailChanges);

    // Filter by specific tables if requested
    if (tables) {
      const tableList = (tables as string).split(',');
      changes = changes.filter(change => 
        tableList.includes(change.table_name) || 
        tableList.includes('all')
      );
    }

    // Sort by timestamp
    changes.sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime());

    // Get summary statistics
    const summary = {
      total_changes: changes.length,
      tables_affected: Array.from(new Set(changes.map(c => c.table_name))),
      change_types: changes.reduce((acc: any, change) => {
        acc[change.change_type] = (acc[change.change_type] || 0) + 1;
        return acc;
      }, {}),
      latest_change: changes.length > 0 ? changes[0].last_modified : null
    };

    res.status(200).json({
      changes: changes.slice(0, 50), // Limit to 50 most recent changes
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database changes error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch database changes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}