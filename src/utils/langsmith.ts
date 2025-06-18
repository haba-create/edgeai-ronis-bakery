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
    modelName: 'o4-mini',
    openAIApiKey: process.env.OPENAI_API_KEY,
    maxTokens: 1000,
    callbacks: undefined, // Temporarily disabled due to compatibility issues
  });
}

/**
 * Start a LangSmith trace for a chatbot interaction
 */
export async function startChatbotTrace(
  runName: string,
  request: TracedRequest
): Promise<string | null> {
  // Temporarily disabled due to compatibility issues
  return null;
}

/**
 * Complete a LangSmith trace with response data
 */
export async function completeChatbotTrace(
  runId: string | null,
  response: TracedResponse,
  error?: Error
): Promise<void> {
  // Temporarily disabled due to compatibility issues
  return;
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
  // Temporarily disabled due to compatibility issues
  return;
}

/**
 * Create a traced wrapper for the unified agent using modern traceable
 */
export function createTracedAgent(agentFunction: Function) {
  // Temporarily disabled due to compatibility issues
  return agentFunction;
}

/**
 * Create a traceable function for tool execution
 */
export function createTracedTool(toolName: string, toolFunction: Function) {
  // Temporarily disabled due to compatibility issues
  return toolFunction;
}

/**
 * Log a custom event to LangSmith
 */
export async function logCustomEvent(
  eventName: string,
  eventData: Record<string, any>
): Promise<void> {
  // Temporarily disabled due to compatibility issues
  return;
}