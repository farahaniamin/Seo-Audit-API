import { createHash } from 'crypto';
import { envInt } from '../env.js';

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class ReportCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL: number;

  constructor() {
    // Default TTL: 1 hour (3600000 ms)
    this.defaultTTL = envInt('CACHE_TTL_MS', 3600000);
    
    // Start cleanup interval
    setInterval(() => this.cleanup(), 300000); // Clean every 5 minutes
  }

  /**
   * Generate cache key from URL and profile
   */
  private generateKey(url: string, profile: string): string {
    const normalized = url.toLowerCase().trim();
    return createHash('md5').update(`${normalized}:${profile}`).digest('hex');
  }

  /**
   * Get cached report
   */
  get<T>(url: string, profile: string): T | undefined {
    const key = this.generateKey(url, profile);
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set cached report
   */
  set<T>(url: string, profile: string, value: T, ttlMs?: number): void {
    const key = this.generateKey(url, profile);
    const ttl = ttlMs || this.defaultTTL;
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Check if report exists in cache
   */
  has(url: string, profile: string): boolean {
    const key = this.generateKey(url, profile);
    const entry = this.cache.get(key);

    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear specific cache entry
   */
  clear(url: string, profile: string): void {
    const key = this.generateKey(url, profile);
    this.cache.delete(key);
  }

  /**
   * Clear all cached reports
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    memoryUsageEstimate: string;
  } {
    const totalEntries = this.cache.size;
    // Rough estimate: ~10KB per report
    const estimatedBytes = totalEntries * 10000;
    const estimatedMB = (estimatedBytes / 1024 / 1024).toFixed(2);
    
    return {
      totalEntries,
      memoryUsageEstimate: `${estimatedMB} MB (estimated)`,
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }
}

// Singleton instance
export const reportCache = new ReportCache();

/**
 * Rate limiter per domain to avoid overwhelming sites
 */
export class DomainRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(
    maxRequests: number = 10,    // Max requests per window
    windowMs: number = 60000     // 1 minute window
  ) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed for domain
   */
  canMakeRequest(domain: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const requests = this.requests.get(domain) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      const oldestRequest = validRequests[0];
      const retryAfterMs = this.windowMs - (now - oldestRequest);
      return { allowed: false, retryAfterMs };
    }
    
    return { allowed: true };
  }

  /**
   * Record a request for domain
   */
  recordRequest(domain: string): void {
    const now = Date.now();
    const requests = this.requests.get(domain) || [];
    
    // Add new request and filter old ones
    requests.push(now);
    this.requests.set(
      domain,
      requests.filter(time => now - time < this.windowMs)
    );
  }

  /**
   * Get current request count for domain
   */
  getRequestCount(domain: string): number {
    const now = Date.now();
    const requests = this.requests.get(domain) || [];
    return requests.filter(time => now - time < this.windowMs).length;
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.requests.clear();
  }
}

// Global domain rate limiter
export const domainRateLimiter = new DomainRateLimiter();

/**
 * Enhanced progress tracking with detailed information
 */
export class ProgressTracker {
  private startTime: number = Date.now();
  private stages: Map<string, { start: number; end?: number }> = new Map();
  private currentStage: string = 'init';
  private issuesFound: number = 0;
  private pagesCompleted: string[] = [];
  private pagesFailed: string[] = [];

  /**
   * Start a new stage
   */
  startStage(stage: string): void {
    this.currentStage = stage;
    this.stages.set(stage, { start: Date.now() });
  }

  /**
   * End current stage
   */
  endStage(stage?: string): void {
    const stageName = stage || this.currentStage;
    const stageData = this.stages.get(stageName);
    if (stageData) {
      stageData.end = Date.now();
    }
  }

  /**
   * Record completed page
   */
  recordPageComplete(url: string, issueCount: number): void {
    this.pagesCompleted.push(url);
    this.issuesFound += issueCount;
  }

  /**
   * Record failed page
   */
  recordPageFailed(url: string): void {
    this.pagesFailed.push(url);
  }

  /**
   * Get current progress
   */
  getProgress(currentPage?: string): {
    stage: string;
    pagesCompleted: number;
    pagesFailed: number;
    totalProcessed: number;
    issuesFound: number;
    elapsedTimeMs: number;
    currentPage?: string;
  } {
    return {
      stage: this.currentStage,
      pagesCompleted: this.pagesCompleted.length,
      pagesFailed: this.pagesFailed.length,
      totalProcessed: this.pagesCompleted.length + this.pagesFailed.length,
      issuesFound: this.issuesFound,
      elapsedTimeMs: Date.now() - this.startTime,
      currentPage,
    };
  }

  /**
   * Get detailed stats
   */
  getStats(): {
    stages: Record<string, { duration: number }>;
    totalDuration: number;
    successRate: number;
  } {
    const stageStats: Record<string, { duration: number }> = {};
    
    for (const [name, data] of this.stages) {
      if (data.end) {
        stageStats[name] = { duration: data.end - data.start };
      }
    }

    const total = this.pagesCompleted.length + this.pagesFailed.length;
    const successRate = total > 0 ? (this.pagesCompleted.length / total) * 100 : 0;

    return {
      stages: stageStats,
      totalDuration: Date.now() - this.startTime,
      successRate: Math.round(successRate * 100) / 100,
    };
  }
}
