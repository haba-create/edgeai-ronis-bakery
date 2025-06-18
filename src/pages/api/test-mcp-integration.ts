/**
 * Test endpoint for MCP integration in edgeai-ronis-bakery
 * Tests all MCP servers and tools
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { mcpManager } from '@/agents/mcp-integration';
import { healthCheck } from '@/agents/unifiedAgentsSDK';
import { logger } from '@/utils/logger';

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration?: number;
  error?: string;
}

interface TestResponse {
  success: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  results: TestResult[];
  timestamp: string;
}

async function runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    return {
      test: testName,
      status: 'pass',
      message: 'Test passed successfully',
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      test: testName,
      status: 'fail',
      message: 'Test failed',
      duration,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      summary: { total: 0, passed: 0, failed: 1, skipped: 0 },
      results: [{
        test: 'HTTP Method Check',
        status: 'fail',
        message: `Method ${req.method} not allowed`
      }],
      timestamp: new Date().toISOString()
    });
  }

  logger.info('Starting MCP integration tests');

  const results: TestResult[] = [];

  // Test 1: MCP Manager Initialization
  results.push(await runTest('MCP Manager Initialization', async () => {
    const manager = mcpManager;
    const config = manager.getConfiguration();
    
    if (!config || typeof config !== 'object') {
      throw new Error('MCP configuration not available');
    }
    
    return config;
  }));

  // Test 2: MCP Health Check
  results.push(await runTest('MCP Health Check', async () => {
    const health = await mcpManager.healthCheck();
    
    if (!health || typeof health.overall !== 'boolean') {
      throw new Error('Health check returned invalid response');
    }
    
    return health;
  }));

  // Test 3: Unified Agent Health Check
  results.push(await runTest('Unified Agent Health Check', async () => {
    const health = await healthCheck();
    
    if (!health || !health.mcp) {
      throw new Error('Unified agent health check missing MCP information');
    }
    
    return health;
  }));

  // Test 4: MailTrap Server Connectivity
  results.push(await runTest('MailTrap Server Connectivity', async () => {
    const response = await fetch('http://localhost:3006/health');
    
    if (!response.ok) {
      throw new Error(`MailTrap server returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'healthy') {
      throw new Error(`MailTrap server unhealthy: ${data.status}`);
    }
    
    return data;
  }));

  // Test 5: MailTrap Tools List
  results.push(await runTest('MailTrap Tools List', async () => {
    const response = await fetch('http://localhost:3006/tools');
    
    if (!response.ok) {
      throw new Error(`MailTrap tools endpoint returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.tools || !Array.isArray(data.tools) || data.tools.length === 0) {
      throw new Error('MailTrap tools list is empty or invalid');
    }
    
    return data;
  }));

  // Test 6: HubSpot Server Connectivity (if available)
  results.push(await runTest('HubSpot Server Connectivity', async () => {
    try {
      const response = await fetch('http://localhost:3005/health', {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`HubSpot server returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'healthy') {
        throw new Error(`HubSpot server unhealthy: ${data.status}`);
      }
      
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('HubSpot server connection timeout - server may not be running');
      }
      throw error;
    }
  }));

  // Test 7: GitHub Docker Image Check
  results.push(await runTest('GitHub Docker Image Check', async () => {
    // This is a simplified check - in a real environment you'd use docker API
    // For now, we'll just verify the configuration exists
    const config = mcpManager.getConfiguration();
    
    if (!config.github || !config.github.dockerImage) {
      throw new Error('GitHub MCP configuration missing');
    }
    
    return { dockerImage: config.github.dockerImage };
  }));

  // Test 8: MCP Tool Registry Integration
  results.push(await runTest('MCP Tool Registry Integration', async () => {
    const { toolRegistry } = await import('@/agents/base-tools');
    
    // Try to get some MCP tools
    const hubspotTool = toolRegistry.getTool('hubspot_create_contact');
    const mailtrapTool = toolRegistry.getTool('mailtrap_send_email');
    const githubTool = toolRegistry.getTool('github_create_issue');
    
    const foundTools = [hubspotTool, mailtrapTool, githubTool].filter(Boolean);
    
    if (foundTools.length === 0) {
      throw new Error('No MCP tools found in registry');
    }
    
    return { foundMCPTools: foundTools.length };
  }));

  // Calculate summary
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    skipped: results.filter(r => r.status === 'skip').length
  };

  const success = summary.failed === 0;

  logger.info('MCP integration tests completed', {
    success,
    summary,
    totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0)
  });

  res.status(success ? 200 : 500).json({
    success,
    summary,
    results,
    timestamp: new Date().toISOString()
  });
}