// Agent configuration file
// This would integrate with OpenAI's Agent SDK in a real implementation

interface AgentConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  capabilities: string[];
}

// Configuration for the ordering agent
export const orderingAgentConfig: AgentConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-4-turbo',
  maxTokens: 1024,
  temperature: 0.3,
  capabilities: [
    'inventory_analysis',
    'order_recommendation',
    'supplier_connection',
    'natural_language_understanding'
  ]
};

// Configuration for the delivery tracking agent
export const deliveryAgentConfig: AgentConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: '04-mini',
  maxTokens: 512,
  temperature: 0.2,
  capabilities: [
    'delivery_tracking',
    'order_status_update',
    'natural_language_understanding'
  ]
};

// Helper function to validate agent configuration
export function validateAgentConfig(config: AgentConfig): boolean {
  if (!config.apiKey) {
    console.error('Missing API key in agent configuration');
    return false;
  }
  
  if (!config.model) {
    console.error('Missing model in agent configuration');
    return false;
  }
  
  return true;
}
