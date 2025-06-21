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
      limit = '50',
      tenant_id,
      action_type,
      user_role,
      success
    } = req.query;

    // Build dynamic query based on filters
    let query = `
      SELECT 
        tul.id,
        tul.created_at as timestamp,
        u.role as user_role,
        CASE 
          WHEN tul.tool_name = 'execute_dynamic_sql' THEN 'sql_query'
          WHEN tul.tool_name = 'send_email_notification' THEN 'email_sent'
          WHEN tul.tool_name LIKE '%order%' THEN 'order_created'
          WHEN tul.tool_name LIKE '%inventory%' THEN 'inventory_updated'
          WHEN tul.tool_name LIKE '%delivery%' THEN 'delivery_updated'
          ELSE 'tool_execution'
        END as action_type,
        CASE 
          WHEN tul.tool_name = 'execute_dynamic_sql' THEN 
            CASE 
              WHEN tul.parameters LIKE '%SELECT%' THEN 'Executed database query: ' || SUBSTR(tul.parameters, 1, 100) || '...'
              WHEN tul.parameters LIKE '%INSERT%' THEN 'Created new records in database'
              WHEN tul.parameters LIKE '%UPDATE%' THEN 'Updated database records'
              WHEN tul.parameters LIKE '%DELETE%' THEN 'Deleted database records'
              ELSE 'Executed database operation'
            END
          WHEN tul.tool_name = 'send_email_notification' THEN 'Sent email notification'
          ELSE 'Executed tool: ' || tul.tool_name
        END as description,
        CASE 
          WHEN tul.tool_name = 'execute_dynamic_sql' AND tul.parameters LIKE '%FROM %' THEN 
            TRIM(SUBSTR(tul.parameters, INSTR(UPPER(tul.parameters), 'FROM ') + 5, 
                 CASE 
                   WHEN INSTR(UPPER(tul.parameters), ' WHERE') > 0 
                   THEN INSTR(UPPER(tul.parameters), ' WHERE') - INSTR(UPPER(tul.parameters), 'FROM ') - 5
                   WHEN INSTR(UPPER(tul.parameters), ' ORDER') > 0 
                   THEN INSTR(UPPER(tul.parameters), ' ORDER') - INSTR(UPPER(tul.parameters), 'FROM ') - 5
                   WHEN INSTR(UPPER(tul.parameters), ' GROUP') > 0 
                   THEN INSTR(UPPER(tul.parameters), ' GROUP') - INSTR(UPPER(tul.parameters), 'FROM ') - 5
                   ELSE 20
                 END))
          ELSE NULL
        END as table_affected,
        CASE 
          WHEN tul.result LIKE '%changes%' THEN 
            CAST(SUBSTR(tul.result, INSTR(tul.result, '"changes":') + 9, 
                 INSTR(tul.result || ',', ',', INSTR(tul.result, '"changes":')) - INSTR(tul.result, '"changes":') - 9) AS INTEGER)
          WHEN tul.result LIKE '%length%' THEN 
            CAST(SUBSTR(tul.result, INSTR(tul.result, '"length":') + 9, 
                 INSTR(tul.result || ',', ',', INSTR(tul.result, '"length":')) - INSTR(tul.result, '"length":') - 9) AS INTEGER)
          ELSE NULL
        END as records_changed,
        tul.tool_name,
        tul.success,
        CASE 
          WHEN LENGTH(tul.result) < 500 THEN tul.result
          ELSE SUBSTR(tul.result, 1, 500) || '...'
        END as details
      FROM tool_usage_logs tul
      LEFT JOIN users u ON tul.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Add filters
    if (tenant_id) {
      query += ' AND tul.tenant_id = ?';
      params.push(tenant_id);
    }

    if (action_type && action_type !== 'all') {
      switch (action_type) {
        case 'sql_query':
          query += ' AND tul.tool_name = ?';
          params.push('execute_dynamic_sql');
          break;
        case 'email_sent':
          query += ' AND tul.tool_name = ?';
          params.push('send_email_notification');
          break;
        case 'order_created':
          query += ' AND tul.tool_name LIKE ?';
          params.push('%order%');
          break;
        case 'inventory_updated':
          query += ' AND tul.tool_name LIKE ?';
          params.push('%inventory%');
          break;
        case 'delivery_updated':
          query += ' AND tul.tool_name LIKE ?';
          params.push('%delivery%');
          break;
      }
    }

    if (user_role && user_role !== 'all') {
      query += ' AND u.role = ?';
      params.push(user_role);
    }

    if (success && success !== 'all') {
      query += ' AND tul.success = ?';
      params.push(success === 'true' ? 1 : 0);
    }

    query += ' ORDER BY tul.created_at DESC LIMIT ?';
    params.push(parseInt(limit as string));

    const activities = await db.all(query, params);

    // Also get recent email logs
    const emailQuery = `
      SELECT 
        id,
        sent_at as timestamp,
        'email_sent' as action_type,
        'Email sent to ' || recipient_email || ': ' || subject as description,
        'email_logs' as table_affected,
        1 as records_changed,
        'send_email_notification' as tool_name,
        CASE WHEN status = 'sent' THEN 1 ELSE 0 END as success,
        json_object(
          'recipient', recipient_email,
          'subject', subject,
          'status', status,
          'message_id', mailtrap_message_id
        ) as details
      FROM email_logs
      WHERE 1=1
      ${tenant_id ? 'AND tenant_id = ' + tenant_id : ''}
      ORDER BY sent_at DESC
      LIMIT 10
    `;

    const emailActivities = await db.all(emailQuery);

    // Combine and sort activities
    const allActivities = [...activities, ...emailActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, parseInt(limit as string));

    res.status(200).json({
      activities: allActivities,
      total: allActivities.length
    });

  } catch (error) {
    console.error('Activity log error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch activity log',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}