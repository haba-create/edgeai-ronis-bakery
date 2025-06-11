interface LogContext {
  userId?: string;
  sessionId?: string;
  endpoint?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context?: LogContext;
  error?: Error;
  performance?: {
    duration: number;
    startTime: number;
  };
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private formatLog(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const contextStr = entry.context ? JSON.stringify(entry.context) : '';
    const errorStr = entry.error ? `\nError: ${entry.error.message}\nStack: ${entry.error.stack}` : '';
    const perfStr = entry.performance ? `\nPerformance: ${entry.performance.duration}ms` : '';
    
    return `[${timestamp}] ${entry.level}: ${entry.message}${contextStr ? `\nContext: ${contextStr}` : ''}${errorStr}${perfStr}`;
  }

  private log(level: LogEntry['level'], message: string, context?: LogContext, error?: Error, performance?: LogEntry['performance']) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      performance
    };

    const formattedLog = this.formatLog(entry);
    
    // Always log to console
    switch (level) {
      case 'DEBUG':
        if (this.isDevelopment) console.debug(formattedLog);
        break;
      case 'INFO':
        console.info(formattedLog);
        break;
      case 'WARN':
        console.warn(formattedLog);
        break;
      case 'ERROR':
        console.error(formattedLog);
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('DEBUG', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('INFO', message, context);
  }

  warn(message: string, context?: LogContext, error?: Error) {
    this.log('WARN', message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error) {
    this.log('ERROR', message, context, error);
  }

  // Performance logging
  startTimer(label: string, context?: LogContext): () => void {
    const startTime = Date.now();
    this.debug(`Timer started: ${label}`, context);
    
    return () => {
      const duration = Date.now() - startTime;
      this.log('INFO', `Timer completed: ${label}`, context, undefined, { duration, startTime });
    };
  }

  // API request logging
  apiRequest(method: string, endpoint: string, context?: LogContext) {
    this.info(`API Request: ${method} ${endpoint}`, {
      ...context,
      endpoint,
      method
    });
  }

  apiResponse(method: string, endpoint: string, statusCode: number, duration: number, context?: LogContext) {
    const level = statusCode >= 400 ? 'ERROR' : statusCode >= 300 ? 'WARN' : 'INFO';
    this.log(level, `API Response: ${method} ${endpoint} - ${statusCode}`, {
      ...context,
      endpoint,
      method,
      statusCode
    }, undefined, { duration, startTime: Date.now() - duration });
  }

  // Database logging
  dbQuery(query: string, params?: any[], context?: LogContext) {
    this.debug(`DB Query: ${query}`, {
      ...context,
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      paramCount: params?.length || 0
    });
  }

  dbError(query: string, error: Error, context?: LogContext) {
    this.error(`DB Error: ${query}`, {
      ...context,
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
    }, error);
  }

  // AI Agent logging
  agentRequest(agentType: string, message: string, context?: LogContext) {
    this.info(`AI Agent Request: ${agentType}`, {
      ...context,
      agentType,
      messageLength: message.length,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : '')
    });
  }

  agentResponse(agentType: string, responseLength: number, toolsUsed: number, context?: LogContext) {
    this.info(`AI Agent Response: ${agentType}`, {
      ...context,
      agentType,
      responseLength,
      toolsUsed
    });
  }

  agentError(agentType: string, error: Error, context?: LogContext) {
    this.error(`AI Agent Error: ${agentType}`, {
      ...context,
      agentType
    }, error);
  }

  // Tool execution logging
  toolExecution(toolName: string, parameters: any, context?: LogContext) {
    this.debug(`Tool Execution: ${toolName}`, {
      ...context,
      toolName,
      parameterKeys: Object.keys(parameters || {})
    });
  }

  toolResult(toolName: string, success: boolean, resultSize: number, duration: number, context?: LogContext) {
    const level = success ? 'INFO' : 'ERROR';
    this.log(level, `Tool Result: ${toolName} - ${success ? 'SUCCESS' : 'FAILED'}`, {
      ...context,
      toolName,
      success,
      resultSize
    }, undefined, { duration, startTime: Date.now() - duration });
  }

  // Authentication logging
  authAttempt(method: string, identifier: string, context?: LogContext) {
    this.info(`Auth Attempt: ${method}`, {
      ...context,
      method,
      identifier: identifier.substring(0, 20) + '...'
    });
  }

  authSuccess(userId: string, role: string, context?: LogContext) {
    this.info(`Auth Success: User ${userId}`, {
      ...context,
      userId,
      role
    });
  }

  authFailure(reason: string, context?: LogContext) {
    this.warn(`Auth Failure: ${reason}`, context);
  }

  // Security logging
  securityEvent(event: string, severity: 'LOW' | 'MEDIUM' | 'HIGH', context?: LogContext) {
    const level = severity === 'HIGH' ? 'ERROR' : severity === 'MEDIUM' ? 'WARN' : 'INFO';
    this.log(level, `Security Event: ${event}`, {
      ...context,
      severity,
      securityEvent: event
    });
  }

  // Business logic logging
  businessEvent(event: string, data: any, context?: LogContext) {
    this.info(`Business Event: ${event}`, {
      ...context,
      event,
      dataKeys: Object.keys(data || {})
    });
  }
}

export const logger = new Logger();
export type { LogContext };