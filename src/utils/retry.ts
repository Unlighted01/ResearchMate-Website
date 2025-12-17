// ============================================
// API RETRY UTILITY
// ============================================
// Handles automatic retries for failed API calls with exponential backoff

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Default retry configuration
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2, // exponential backoff
  retryCondition: (error: any) => {
    // Retry on network errors and 5xx server errors
    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      return true;
    }
    if (error?.status >= 500 && error?.status < 600) {
      return true;
    }
    // Don't retry on client errors (4xx)
    if (error?.status >= 400 && error?.status < 500) {
      return false;
    }
    return true;
  },
  onRetry: () => {},
};

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(options.backoffFactor, attempt - 1);
  return Math.min(delay, options.maxDelay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @example
 * const data = await retryWithBackoff(
 *   async () => await fetch('/api/data').then(r => r.json()),
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts
      if (attempt > opts.maxRetries) {
        break;
      }

      // Check if we should retry this error
      if (!opts.retryCondition(error)) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts);

      if (import.meta.env.DEV) {
        console.warn(`Retry attempt ${attempt}/${opts.maxRetries} after ${delay}ms`, error);
      }

      opts.onRetry(attempt, error);
      await sleep(delay);
    }
  }

  // All retries failed
  throw lastError;
}

/**
 * Wrap a fetch request with retry logic
 *
 * @example
 * const response = await fetchWithRetry('/api/items', {
 *   method: 'GET',
 *   headers: { 'Content-Type': 'application/json' }
 * });
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, init);

    // Treat HTTP errors as failures to retry
    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.response = response;
      throw error;
    }

    return response;
  }, options);
}

/**
 * Supabase query wrapper with retry logic
 *
 * @example
 * const { data, error } = await supabaseWithRetry(
 *   () => supabase.from('items').select('*')
 * );
 */
export async function supabaseWithRetry<T>(
  fn: () => Promise<{ data: T | null; error: any }>,
  options?: RetryOptions
): Promise<{ data: T | null; error: any }> {
  return retryWithBackoff(async () => {
    const result = await fn();

    // If there's an error, throw it to trigger retry
    if (result.error) {
      throw result.error;
    }

    return result;
  }, options);
}

export default retryWithBackoff;
