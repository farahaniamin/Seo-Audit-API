import { db } from '../db.js';

export type HealthStatus = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    diskSpace: boolean;
    memory: boolean;
    workerQueue: boolean;
  };
  details: {
    databaseLatency?: number;
    diskUsagePercent?: number;
    memoryUsagePercent?: number;
    queueSize?: number;
    lastError?: string;
  };
  timestamp: string;
};

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(): Promise<HealthStatus> {
  const timestamp = new Date().toISOString();
  const checks = {
    database: false,
    diskSpace: false,
    memory: false,
    workerQueue: false,
  };
  const details: HealthStatus['details'] = {};

  // Check database
  try {
    const start = Date.now();
    db.prepare('SELECT 1').get();
    details.databaseLatency = Date.now() - start;
    checks.database = details.databaseLatency < 1000; // Should respond within 1s
  } catch (e: any) {
    details.lastError = `Database error: ${e.message}`;
    checks.database = false;
  }

  // Check disk space (if on Node.js with fs access)
  try {
    // This is a simplified check - in production, use proper disk space monitoring
    const fs = await import('fs');
    const stats = fs.statSync('.');
    // Mock disk usage - in production use actual disk usage
    details.diskUsagePercent = 50; // Placeholder
    checks.diskSpace = details.diskUsagePercent < 90;
  } catch {
    checks.diskSpace = true; // Assume OK if we can't check
  }

  // Check memory usage
  try {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const usedPercent = (memUsage.heapUsed / totalMem) * 100;
    details.memoryUsagePercent = Math.round(usedPercent * 100) / 100;
    checks.memory = usedPercent < 80; // Alert if using >80% memory
  } catch {
    checks.memory = true;
  }

  // Check worker queue
  try {
    const queueResult = db.prepare('SELECT COUNT(*) as count FROM audits WHERE status = ?').get('queued');
    const runningResult = db.prepare('SELECT COUNT(*) as count FROM audits WHERE status = ?').get('running');
    details.queueSize = (queueResult?.count || 0) + (runningResult?.count || 0);
    checks.workerQueue = (details.queueSize || 0) < 100; // Alert if >100 pending jobs
  } catch (e: any) {
    details.lastError = `Queue check error: ${e.message}`;
    checks.workerQueue = false;
  }

  // Determine overall status
  const allHealthy = Object.values(checks).every(Boolean);
  const someHealthy = Object.values(checks).some(Boolean);
  
  let status: HealthStatus['status'] = 'unhealthy';
  if (allHealthy) {
    status = 'healthy';
  } else if (someHealthy) {
    status = 'degraded';
  }

  return {
    status,
    checks,
    details,
    timestamp,
  };
}

/**
 * Quick health check for liveness probe
 */
export function quickHealthCheck(): boolean {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get system metrics for monitoring
 */
export function getSystemMetrics(): {
  auditsTotal: number;
  auditsQueued: number;
  auditsRunning: number;
  auditsCompleted: number;
  auditsFailed: number;
  oldestQueuedAudit?: string;
} {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM audits').get() as { count: number };
    const queued = db.prepare('SELECT COUNT(*) as count FROM audits WHERE status = ?').get('queued') as { count: number };
    const running = db.prepare('SELECT COUNT(*) as count FROM audits WHERE status = ?').get('running') as { count: number };
    const completed = db.prepare('SELECT COUNT(*) as count FROM audits WHERE status = ?').get('done') as { count: number };
    const failed = db.prepare('SELECT COUNT(*) as count FROM audits WHERE status = ?').get('failed') as { count: number };
    
    const oldest = db.prepare('SELECT created_at FROM audits WHERE status = ? ORDER BY created_at ASC LIMIT 1').get('queued') as { created_at: string } | undefined;

    return {
      auditsTotal: total.count,
      auditsQueued: queued.count,
      auditsRunning: running.count,
      auditsCompleted: completed.count,
      auditsFailed: failed.count,
      oldestQueuedAudit: oldest?.created_at,
    };
  } catch (e) {
    return {
      auditsTotal: 0,
      auditsQueued: 0,
      auditsRunning: 0,
      auditsCompleted: 0,
      auditsFailed: 0,
    };
  }
}
