const path = require('path');

// Mock environment for testing
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-key';

// Test the unified agent
async function testDriverAgent() {
  try {
    // Import the agent after setting up environment
    const { executeUnifiedAgent } = await import('./src/agents/unifiedOpenAIAgent.ts');
    
    console.log('Testing Driver Agent with delivery query...');
    
    const result = await executeUnifiedAgent(
      "How many deliveries do I have?",
      "1000", // driver user ID that we created
      "driver"
    );
    
    console.log('\n=== Driver Agent Test Results ===');
    console.log('Response:', result.response);
    console.log('Tool Calls:', JSON.stringify(result.toolCalls, null, 2));
    console.log('Metadata:', JSON.stringify(result.metadata, null, 2));
    
    // Test earnings query
    console.log('\n\nTesting earnings query...');
    const earningsResult = await executeUnifiedAgent(
      "Show my earnings for today",
      "1000",
      "driver"
    );
    
    console.log('\n=== Driver Earnings Test Results ===');
    console.log('Response:', earningsResult.response);
    console.log('Tool Calls:', JSON.stringify(earningsResult.toolCalls, null, 2));
    
  } catch (error) {
    console.error('Error testing driver agent:', error);
    console.error('Stack:', error.stack);
  }
}

testDriverAgent();