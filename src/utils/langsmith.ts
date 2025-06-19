import { Client } from 'langsmith';
import { traceable } from 'langsmith/traceable';
import { ChatOpenAI } from '@langchain/openai';
import { CallbackManager } from '@langchain/core/callbacks/manager';

// Initialize LangSmith client
const langsmithClient = process.env.LANGSMITH_TRACING === 'true' ? new Client({
  apiUrl: process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com',
  apiKey: process.env.LANGSMITH_API_KEY,
}) : null;

export interface TracedRequest {
  userId: string;
  userRole: string;
  message: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface TracedResponse {
  response: string;
  toolCalls?: any[];
  executedTools?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a traced ChatOpenAI instance for LangSmith monitoring
 */
export function createTracedChatModel() {
  if (!process.env.LANGSMITH_TRACING || process.env.LANGSMITH_TRACING !== 'true') {
    return null;
  }

  return new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    openAIApiKey: process.env.OPENAI_API_KEY,
    maxTokens: 1000,
  });
}

/**
 * Start a LangSmith trace for a chatbot interaction
 */
export async function startChatbotTrace(
  runName: string,
  request: TracedRequest
): Promise<string | null> {
  if (!langsmithClient || !process.env.LANGSMITH_TRACING) {
    return null;
  }

  try {
    const run = await langsmithClient.createRun({
      name: runName,
      run_type: 'chain',
      inputs: {
        userId: request.userId,
        userRole: request.userRole,
        message: request.message,
        sessionId: request.sessionId,
        metadata: request.metadata
      },
      project_name: process.env.LANGSMITH_PROJECT || 'ronis-bakery-chatbot'
    }) as any;
    return run?.id || null;
  } catch (error) {
    console.warn('Failed to start LangSmith trace:', error);
    return null;
  }
}

/**
 * Complete a LangSmith trace with response data
 */
export async function completeChatbotTrace(
  runId: string | null,
  response: TracedResponse,
  error?: Error
): Promise<void> {
  if (!langsmithClient || !runId) {
    return;
  }

  try {
    await langsmithClient.updateRun(runId, {
      outputs: {
        response: response.response,
        toolCalls: response.toolCalls,
        executedTools: response.executedTools,
        metadata: response.metadata
      },
      error: error?.message,
      end_time: Date.now()
    });
  } catch (error) {
    console.warn('Failed to complete LangSmith trace:', error);
  }
}

/**
 * Trace a tool execution within a chatbot interaction
 */
export async function traceToolExecution(
  parentRunId: string | null,
  toolName: string,
  toolArgs: any,
  toolResult: any,
  error?: Error
): Promise<void> {
  if (!langsmithClient || !parentRunId) {
    return;
  }

  try {
    await langsmithClient.createRun({
      name: `tool_${toolName}`,
      run_type: 'tool',
      inputs: toolArgs,
      outputs: toolResult,
      parent_run_id: parentRunId,
      error: error?.message,
      project_name: process.env.LANGSMITH_PROJECT || 'ronis-bakery-chatbot'
    } as any);
  } catch (error) {
    console.warn('Failed to trace tool execution:', error);
  }
}

/**
 * Create a traced wrapper for the unified agent using modern traceable
 */
export function createTracedAgent(agentFunction: any) {
  if (!process.env.LANGSMITH_TRACING || process.env.LANGSMITH_TRACING !== 'true') {
    return agentFunction;
  }

  return traceable(agentFunction as any, {
    name: 'unified-agent',
    project_name: process.env.LANGSMITH_PROJECT || 'ronis-bakery-chatbot'
  });
}

/**
 * Create a traceable function for tool execution
 */
export function createTracedTool(toolName: string, toolFunction: any) {
  if (!process.env.LANGSMITH_TRACING || process.env.LANGSMITH_TRACING !== 'true') {
    return toolFunction;
  }

  return traceable(toolFunction as any, {
    name: `tool_${toolName}`,
    project_name: process.env.LANGSMITH_PROJECT || 'ronis-bakery-chatbot'
  });
}

/**
 * Log a custom event to LangSmith
 */
export async function logCustomEvent(
  eventName: string,
  eventData: Record<string, any>
): Promise<void> {
  if (!langsmithClient) {
    return;
  }

  try {
    await langsmithClient.createRun({
      name: eventName,
      run_type: 'chain',
      inputs: eventData,
      project_name: process.env.LANGSMITH_PROJECT || 'ronis-bakery-chatbot'
    } as any);
  } catch (error) {
    console.warn('Failed to log custom event:', error);
  }
}