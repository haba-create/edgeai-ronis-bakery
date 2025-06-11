const { executeUnifiedAgent } = require('./src/agents/unifiedOpenAIAgent.ts');

async function testDriverAgent() {
  try {
    console.log('Testing Driver Agent...');
    
    const result = await executeUnifiedAgent(
      "How many deliveries do I have?",
      "1000", // driver user ID
      "driver"
    );
    
    console.log('Driver Agent Result:');
    console.log('Response:', result.response);
    console.log('Tool Calls:', result.toolCalls);
    console.log('Metadata:', result.metadata);
    
  } catch (error) {
    console.error('Error testing driver agent:', error);
  }
}

testDriverAgent();