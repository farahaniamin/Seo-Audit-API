import type { Page } from './smart.js';

export type RetryConfig = {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,     // Start with 1 second
  maxDelay: 30000,     // Cap at 30 seconds
  backoffMultiplier: 2, // Double the delay each retry
};

/**
 * Calculate delay for retry attempt using exponential backoff
 */
function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  // Network errors
  if (error.message?.includes('network') || 
      error.message?.includes('fetch') ||
      error.message?.includes('timeout') ||
      error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('ETIMEDOUT')) {
    return true;
  }

  // HTTP status codes that are retryable
  if (error.status) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status);
  }

  return false;
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<{ success: boolean; result?: T; error?: Error; attempts: number }> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      const result = await fn();
      return { success: true, result, attempts: attempt + 1 };
    } catch (error: any) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === fullConfig.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        return { success: false, error, attempts: attempt + 1 };
      }

      // Calculate and apply delay
      const delay = calculateRetryDelay(attempt, fullConfig);
      console.log(`Retry ${attempt + 1}/${fullConfig.maxRetries} after ${delay}ms delay...`);
      await sleep(delay);
    }
  }

  return { success: false, error: lastError, attempts: fullConfig.maxRetries + 1 };
}

/**
 * Circuit breaker pattern to stop hitting failing endpoints
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeout: number = 60000, // 1 minute
    private readonly halfOpenMaxCalls: number = 3
  ) {}

  /**
   * Check if circuit is open (failing)
   */
  isOpen(): boolean {
    if (this.state === 'open') {
      // Check if we should try half-open
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
        this.failures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Record a success
   */
  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.failures = 0;
      this.state = 'closed';
    } else {
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  /**
   * Record a failure
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
    } else if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open - too many failures');
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Get current state
   */
  getState(): { state: string; failures: number; lastFailure: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime,
    };
  }
}

// Global circuit breakers per domain
const circuitBreakers: Map<string, CircuitBreaker> = new Map();

/**
 * Get or create circuit breaker for domain
 */
export function getCircuitBreaker(domain: string): CircuitBreaker {
  if (!circuitBreakers.has(domain)) {
    circuitBreakers.set(domain, new CircuitBreaker());
  }
  return circuitBreakers.get(domain)!;
}

/**
 * Auto-throttling for 429 errors
 */
export class AutoThrottler {
  private consecutive429s: number = 0;
  private last429Time: number = 0;
  private currentDelay: number = 0;
  
  private readonly baseDelay: number = 1000;
  private readonly maxDelay: number = 60000; // 1 minute max

  /**
   * Get current delay (increases with consecutive 429s)
   */
  getDelay(): number {
    // Reset if it's been more than 5 minutes since last 429
    if (Date.now() - this.last429Time > 300000) {
      this.consecutive429s = 0;
      this.currentDelay = 0;
    }

    if (this.consecutive429s === 0) {
      return 0;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.consecutive429s - 1),
      this.maxDelay
    );
    
    this.currentDelay = delay;
    return delay;
  }

  /**
   * Record a 429 error
   */
  record429(): void {
    this.consecutive429s++;
    this.last429Time = Date.now();
  }

  /**
   * Record a successful request (reduces throttle)
   */
  recordSuccess(): void {
    if (this.consecutive429s > 0) {
      this.consecutive429s = Math.max(0, this.consecutive429s - 1);
    }
  }

  /**
   * Get current throttle status
   */
  getStatus(): { consecutive429s: number; currentDelay: number; last429Time: number } {
    return {
      consecutive429s: this.consecutive429s,
      currentDelay: this.currentDelay,
      last429Time: this.last429Time,
    };
  }
}

// Global throttlers per domain
const throttlers: Map<string, AutoThrottler> = new Map();

/**
 * Get or create throttler for domain
 */
export function getThrottler(domain: string): AutoThrottler {
  if (!throttlers.has(domain)) {
    throttlers.set(domain, new AutoThrottler());
  }
  return throttlers.get(domain)!;
}

/**
 * Generate partial report from successful pages
 */
export function generatePartialReport(
  successfulPages: Page[],
  failedUrls: string[],
  startTime: number,
  totals: Map<string, number>
): {
  partial: true;
  pages: Page[];
  failedUrls: string[];
  checked: number;
  failed: number;
  coverage: string;
} {
  const checked = successfulPages.length;
  const failed = failedUrls.length;
  const total = checked + failed;
  
  return {
    partial: true,
    pages: successfulPages,
    failedUrls,
    checked,
    failed,
    coverage: `${checked}/${total} pages crawled successfully (${Math.round((checked / total) * 100)}%)`,
  };
}
