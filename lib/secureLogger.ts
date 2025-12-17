// ============================================
// secureLogger.ts - Secure Logging Utility
// ============================================
// Centralized logging that prevents sensitive data exposure
// and integrates with monitoring services in production

// ============================================
// PART 1: TYPE DEFINITIONS
// ============================================

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  [key: string]: any;
}

// ============================================
// PART 2: SENSITIVE DATA PATTERNS
// ============================================

const SENSITIVE_PATTERNS = [
  // Email patterns
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // API keys (various formats)
  /\b[A-Za-z0-9_-]{32,}\b/g,
  // JWT tokens
  /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
  // Credit card numbers
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  // Phone numbers
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  // SSN
  /\b\d{3}-\d{2}-\d{4}\b/g,
  // IP addresses (optional - might be needed for debugging)
  // /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
];

const SENSITIVE_KEYS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'auth',
  'credential',
  'privateKey',
  'private_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
];

// ============================================
// PART 3: REDACTION FUNCTIONS
// ============================================

/**
 * Redact sensitive data from strings
 */
function redactString(str: string): string {
  let redacted = str;

  SENSITIVE_PATTERNS.forEach((pattern) => {
    redacted = redacted.replace(pattern, '[REDACTED]');
  });

  return redacted;
}

/**
 * Redact sensitive data from objects
 */
function redactObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return redactString(obj);
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactObject);
  }

  const redacted: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(sensitiveKey =>
      lowerKey.includes(sensitiveKey.toLowerCase())
    );

    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      redacted[key] = redactObject(value);
    } else if (typeof value === 'string') {
      redacted[key] = redactString(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

// ============================================
// PART 4: LOGGING FUNCTIONS
// ============================================

/**
 * Format log message with context
 */
function formatLogMessage(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (context) {
    const redactedContext = redactObject(context);
    return `${prefix} ${message} ${JSON.stringify(redactedContext)}`;
  }

  return `${prefix} ${message}`;
}

/**
 * Send logs to monitoring service in production
 * Replace with your actual monitoring service (Sentry, LogRocket, etc.)
 */
function sendToMonitoring(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): void {
  // Example: Sentry integration
  // if (window.Sentry) {
  //   if (error) {
  //     Sentry.captureException(error, {
  //       level: level === LogLevel.ERROR ? 'error' : 'warning',
  //       extra: context,
  //     });
  //   } else {
  //     Sentry.captureMessage(message, {
  //       level: level === LogLevel.ERROR ? 'error' : 'info',
  //       extra: context,
  //     });
  //   }
  // }

  // For now, just prevent logging in production
  // Add your monitoring service integration here
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): void {
  const isDev = import.meta.env.DEV;
  const redactedMessage = redactString(message);
  const redactedContext = context ? redactObject(context) : undefined;

  if (isDev) {
    // In development, log to console
    const formattedMessage = formatLogMessage(level, redactedMessage, redactedContext);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        if (error) console.warn(error);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        if (error) console.error(error);
        break;
    }
  } else {
    // In production, send to monitoring service
    if (level === LogLevel.ERROR || level === LogLevel.WARN) {
      sendToMonitoring(level, redactedMessage, redactedContext, error);
    }
  }
}

// ============================================
// PART 5: PUBLIC API
// ============================================

/**
 * Secure Logger
 * Use this instead of console.log throughout the app
 */
export const logger = {
  /**
   * Debug-level logging (development only)
   */
  debug: (message: string, context?: LogContext) => {
    log(LogLevel.DEBUG, message, context);
  },

  /**
   * Info-level logging (development only)
   */
  info: (message: string, context?: LogContext) => {
    log(LogLevel.INFO, message, context);
  },

  /**
   * Warning-level logging (development + production monitoring)
   */
  warn: (message: string, context?: LogContext, error?: Error) => {
    log(LogLevel.WARN, message, context, error);
  },

  /**
   * Error-level logging (development + production monitoring)
   */
  error: (message: string, context?: LogContext, error?: Error) => {
    log(LogLevel.ERROR, message, context, error);
  },

  /**
   * Manually redact sensitive data
   * Useful for testing or custom scenarios
   */
  redact: redactObject,
};

// ============================================
// PART 6: USAGE EXAMPLES
// ============================================

/*
// Basic usage:
import { logger } from '../lib/secureLogger';

// Debug (dev only)
logger.debug('User action', { action: 'click', elementId: 'submit-btn' });

// Info (dev only)
logger.info('Data loaded', { itemCount: 42 });

// Warning (dev + production monitoring)
logger.warn('Slow API response', { endpoint: '/api/data', duration: 5000 });

// Error (dev + production monitoring)
logger.error('Failed to fetch data', { endpoint: '/api/items' }, error);

// Automatic redaction:
logger.info('User logged in', {
  email: 'user@example.com',  // Will be redacted to [REDACTED]
  apiKey: 'sk_test_123456'    // Will be redacted to [REDACTED]
});
*/

export default logger;
