/**
 * MCP Server Integration Layer for edgeai-ronis-bakery
 * Integrates GitHub, HubSpot, and MailTrap MCP servers into the agent system
 */

import { BaseTool, AgentToolRegistry, toolRegistry } from './base-tools';
import { AgentContext, AgentResponse } from './types';
import axios from 'axios';
import { spawn } from 'child_process';
import { logger } from '@/utils/logger';

// MCP Server Configuration
const MCP_CONFIG = {
  hubspot: {
    enabled: true,
    type: 'http' as const,
    url: 'http://localhost:3005',
    transport: 'http'
  },
  mailtrap: {
    enabled: true,
    type: 'http' as const,
    url: 'http://localhost:3006',
    transport: 'http'
  },
  github: {
    enabled: true,
    type: 'stdio' as const,
    dockerImage: 'github-mcp-server:latest',
    transport: 'stdio'
  }
};

/**
 * MCP Server Interface
 */
interface MCPServer {
  name: string;
  type: 'http' | 'stdio';
  url?: string;
  dockerImage?: string;
  enabled: boolean;
}

/**
 * MCP Tool Definition
 */
interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  server: string;
}

/**
 * Base class for MCP-powered tools
 */
export abstract class MCPTool extends BaseTool {
  protected mcpServer: string;
  protected mcpToolName: string;

  constructor(mcpServer: string, mcpToolName: string) {
    super();
    this.mcpServer = mcpServer;
    this.mcpToolName = mcpToolName;
  }

  /**
   * Execute MCP tool via HTTP or stdio transport
   */
  protected async executeMCPTool(args: any): Promise<any> {
    const serverConfig = MCP_CONFIG[this.mcpServer as keyof typeof MCP_CONFIG];
    
    if (!serverConfig || !serverConfig.enabled) {
      throw new Error(`MCP server ${this.mcpServer} is not enabled or configured`);
    }

    if (serverConfig.type === 'http') {
      return await this.executeHTTPTool(serverConfig.url!, args);
    } else {
      return await this.executeStdioTool(serverConfig.dockerImage!, args);
    }
  }

  /**
   * Execute tool via HTTP transport
   */
  private async executeHTTPTool(url: string, args: any): Promise<any> {
    try {
      const response = await axios.post(`${url}/tools/${this.mcpToolName}`, args, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        return response.data.result;
      } else {
        throw new Error(response.data.error || 'MCP tool execution failed');
      }
    } catch (error) {
      logger.error(`HTTP MCP tool execution failed: ${this.mcpServer}/${this.mcpToolName}`, error as Error);
      throw error;
    }
  }

  /**
   * Execute tool via stdio transport (Docker)
   */
  private async executeStdioTool(dockerImage: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const dockerProcess = spawn('docker', [
        'run', '-i', '--rm',
        '-e', `GITHUB_PERSONAL_ACCESS_TOKEN=${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
        dockerImage
      ]);

      let output = '';
      let errorOutput = '';

      dockerProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      dockerProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      dockerProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse MCP response: ${error}`));
          }
        } else {
          reject(new Error(`MCP tool execution failed: ${errorOutput}`));
        }
      });

      // Send the tool call request
      const request = {
        method: 'tools/call',
        params: {
          name: this.mcpToolName,
          arguments: args
        }
      };

      dockerProcess.stdin.write(JSON.stringify(request) + '\n');
      dockerProcess.stdin.end();
    });
  }
}

/**
 * HubSpot CRM Tools
 */
export class HubSpotCreateContactTool extends MCPTool {
  name = 'hubspot_create_contact';
  description = 'Create a new contact in HubSpot CRM';
  parameters = {
    type: 'object' as const,
    properties: {
      email: { type: 'string', description: 'Contact email address' },
      firstName: { type: 'string', description: 'Contact first name' },
      lastName: { type: 'string', description: 'Contact last name' },
      phone: { type: 'string', description: 'Contact phone number' },
      company: { type: 'string', description: 'Contact company name' },
    },
    required: ['email']
  };
  protected allowedRoles = ['admin', 'owner', 'supplier'];

  constructor() {
    super('hubspot', 'create_contact');
  }

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const result = await this.executeMCPTool(args);
    
    // Log the contact creation for audit
    await this.logToolUsage(context, this.name, args, result);
    
    return {
      contactId: result.id,
      email: result.properties.email,
      message: `Contact created successfully with ID: ${result.id}`
    };
  }
}

export class HubSpotSearchContactsTool extends MCPTool {
  name = 'hubspot_search_contacts';
  description = 'Search for contacts in HubSpot CRM';
  parameters = {
    type: 'object' as const,  
    properties: {
      query: { type: 'string', description: 'Search query for contacts' },
      limit: { type: 'number', description: 'Maximum number of results (default 10)' },
    },
    required: ['query']
  };
  protected allowedRoles = ['admin', 'owner', 'supplier'];

  constructor() {
    super('hubspot', 'search_crm');
  }

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const searchArgs = {
      objectType: 'contacts',
      query: args.query,
      limit: args.limit || 10
    };
    
    const result = await this.executeMCPTool(searchArgs);
    
    return {
      contacts: result.results || [],
      total: result.total || 0,
      message: `Found ${result.total || 0} contacts matching "${args.query}"`
    };
  }
}

/**
 * MailTrap Email Tools
 */
export class MailTrapSendEmailTool extends MCPTool {
  name = 'mailtrap_send_email';
  description = 'Send an email via MailTrap';
  parameters = {
    type: 'object' as const,
    properties: {
      to: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            name: { type: 'string' }
          },
          required: ['email']
        },
        description: 'Array of recipients'
      },
      from: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          name: { type: 'string' }
        },
        required: ['email'],
        description: 'Sender information'
      },
      subject: { type: 'string', description: 'Email subject' },
      text: { type: 'string', description: 'Plain text content' },
      html: { type: 'string', description: 'HTML content' },
    },
    required: ['to', 'from', 'subject']
  };
  protected allowedRoles = ['admin', 'owner', 'supplier'];

  constructor() {
    super('mailtrap', 'send_email');
  }

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const result = await this.executeMCPTool(args);
    
    // Log the email sending for audit
    await this.logToolUsage(context, this.name, args, result);
    
    return {
      messageId: result.message_id,
      status: result.status,
      message: `Email sent successfully. Message ID: ${result.message_id}`
    };
  }
}

export class MailTrapGetInboxesTool extends MCPTool {
  name = 'mailtrap_get_inboxes';
  description = 'Get list of MailTrap sandbox inboxes';
  parameters = {
    type: 'object' as const,
    properties: {
      accountId: { type: 'number', description: 'MailTrap account ID (optional)' }
    }
  };
  protected allowedRoles = ['admin', 'owner'];

  constructor() {
    super('mailtrap', 'get_inboxes');
  }

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const result = await this.executeMCPTool(args);
    
    return {
      inboxes: result,
      message: `Found ${result.length} inboxes`
    };
  }
}

/**
 * GitHub Integration Tools
 */
export class GitHubCreateIssueTool extends MCPTool {
  name = 'github_create_issue';
  description = 'Create a new issue in a GitHub repository';
  parameters = {
    type: 'object' as const,
    properties: {
      owner: { type: 'string', description: 'Repository owner' },
      repo: { type: 'string', description: 'Repository name' },
      title: { type: 'string', description: 'Issue title' },
      body: { type: 'string', description: 'Issue description' },
      labels: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'Issue labels'
      }
    },
    required: ['owner', 'repo', 'title']
  };
  protected allowedRoles = ['admin', 'owner'];

  constructor() {
    super('github', 'create_issue');
  }

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const result = await this.executeMCPTool(args);
    
    // Log the issue creation for audit
    await this.logToolUsage(context, this.name, args, result);
    
    return {
      issueNumber: result.number,
      issueUrl: result.html_url,
      message: `Issue #${result.number} created successfully: ${result.html_url}`
    };
  }
}

export class GitHubListRepositoriesTool extends MCPTool {
  name = 'github_list_repositories';
  description = 'List GitHub repositories';
  parameters = {
    type: 'object' as const,
    properties: {
      type: { 
        type: 'string', 
        enum: ['all', 'owner', 'public', 'private'],
        description: 'Repository type filter'
      },
      sort: {
        type: 'string',
        enum: ['created', 'updated', 'pushed', 'full_name'],
        description: 'Sort repositories by'
      },
      per_page: { type: 'number', description: 'Number of repositories per page (max 100)' }
    }
  };
  protected allowedRoles = ['admin', 'owner'];

  constructor() {
    super('github', 'list_repositories');
  }

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const result = await this.executeMCPTool(args);
    
    return {
      repositories: result,
      count: result.length,
      message: `Found ${result.length} repositories`
    };
  }
}

/**
 * MCP Integration Manager
 */
export class MCPIntegrationManager {
  private static instance: MCPIntegrationManager;
  private toolsRegistered = false;

  static getInstance(): MCPIntegrationManager {
    if (!MCPIntegrationManager.instance) {
      MCPIntegrationManager.instance = new MCPIntegrationManager();
    }
    return MCPIntegrationManager.instance;
  }

  /**
   * Register all MCP tools with the global tool registry
   */
  registerMCPTools(): void {
    if (this.toolsRegistered) {
      return; // Already registered
    }

    // HubSpot tools
    if (MCP_CONFIG.hubspot.enabled) {
      toolRegistry.registerTool(new HubSpotCreateContactTool());
      toolRegistry.registerTool(new HubSpotSearchContactsTool());
    }

    // MailTrap tools
    if (MCP_CONFIG.mailtrap.enabled) {
      toolRegistry.registerTool(new MailTrapSendEmailTool());
      toolRegistry.registerTool(new MailTrapGetInboxesTool());
    }

    // GitHub tools
    if (MCP_CONFIG.github.enabled) {
      toolRegistry.registerTool(new GitHubCreateIssueTool());
      toolRegistry.registerTool(new GitHubListRepositoriesTool());
    }

    this.toolsRegistered = true;
    logger.info('MCP tools registered successfully', {
      hubspot: MCP_CONFIG.hubspot.enabled,
      mailtrap: MCP_CONFIG.mailtrap.enabled,
      github: MCP_CONFIG.github.enabled
    });
  }

  /**
   * Health check for all MCP servers
   */
  async healthCheck(): Promise<{
    hubspot: boolean;
    mailtrap: boolean;
    github: boolean;
    overall: boolean;
  }> {
    const results = {
      hubspot: false,
      mailtrap: false,
      github: false,
      overall: false
    };

    // Check HubSpot server
    if (MCP_CONFIG.hubspot.enabled) {
      try {
        const response = await axios.get(`${MCP_CONFIG.hubspot.url}/health`, { timeout: 5000 });
        results.hubspot = response.status === 200;
      } catch (error) {
        logger.warn('HubSpot MCP server health check failed', error as Error);
      }
    }

    // Check MailTrap server
    if (MCP_CONFIG.mailtrap.enabled) {
      try {
        const response = await axios.get(`${MCP_CONFIG.mailtrap.url}/health`, { timeout: 5000 });
        results.mailtrap = response.status === 200;
      } catch (error) {
        logger.warn('MailTrap MCP server health check failed', error as Error);
      }
    }

    // Check GitHub server (Docker image availability)
    if (MCP_CONFIG.github.enabled) {
      try {
        // Simple check - verify Docker image exists
        const { spawn } = require('child_process');
        const dockerCheck = spawn('docker', ['image', 'inspect', MCP_CONFIG.github.dockerImage]);
        
        await new Promise((resolve, reject) => {
          dockerCheck.on('close', (code: number | null) => {
            results.github = code === 0;
            resolve(code);
          });
          dockerCheck.on('error', reject);
        });
      } catch (error) {
        logger.warn('GitHub MCP server health check failed', error as Error);
      }
    }

    results.overall = results.hubspot || results.mailtrap || results.github;
    return results;
  }

  /**
   * Get MCP configuration for debugging
   */
  getConfiguration() {
    return MCP_CONFIG;
  }
}

// Initialize and register MCP tools
const mcpManager = MCPIntegrationManager.getInstance();
mcpManager.registerMCPTools();

export { mcpManager };