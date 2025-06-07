/**
 * Agent Tools API Endpoint
 * Returns available tools and capabilities for specific user roles
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getAvailableTools } from '../../agents/agents';

interface ToolsRequest {
  role: string;
}

interface ToolsResponse {
  success: boolean;
  tools?: any[];
  error?: string;
  capabilities?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ToolsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { role } = req.query as { role: string };

    // Validate role parameter
    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Role parameter is required'
      });
    }

    const validRoles = ['client', 'supplier', 'driver', 'admin', 'tenant_admin', 'tenant_manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role specified'
      });
    }

    // Get available tools for the role
    const tools = getAvailableTools(role);
    const capabilities = getCapabilitiesForRole(role);

    res.status(200).json({
      success: true,
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      })),
      capabilities
    });

  } catch (error) {
    console.error('Agent tools error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

/**
 * Get human-readable capabilities for each role
 */
function getCapabilitiesForRole(role: string): string[] {
  switch (role) {
    case 'client':
      return [
        'Monitor inventory levels and stock status',
        'Create and manage purchase orders',
        'Track order history and deliveries', 
        'Generate inventory and sales analytics',
        'Update product consumption records',
        'Receive low stock alerts and predictions'
      ];
    
    case 'supplier':
      return [
        'View and manage pending orders',
        'Update order status and delivery schedules',
        'Assign drivers to deliveries',
        'Track supplier performance metrics',
        'Coordinate delivery logistics',
        'Manage driver availability'
      ];
    
    case 'driver':
      return [
        'View assigned deliveries and routes',
        'Update real-time location and status',
        'Get navigation and route optimization', 
        'Complete deliveries with proof',
        'Track earnings and performance',
        'View delivery history and statistics'
      ];
    
    case 'admin':
      return [
        'Monitor system health and performance',
        'Manage tenant accounts and subscriptions',
        'Create and configure new tenants',
        'Oversee user management across tenants',
        'Generate system-wide analytics',
        'Handle escalations and support issues'
      ];
    
    case 'tenant_admin':
    case 'tenant_manager':
      return [
        'Manage users within your organization',
        'Monitor tenant-specific analytics',
        'View subscription usage and limits',
        'Configure tenant settings',
        'Access performance reports',
        'Coordinate with suppliers and drivers'
      ];
    
    default:
      return [
        'Basic inventory management',
        'Order tracking',
        'Analytics viewing'
      ];
  }
}