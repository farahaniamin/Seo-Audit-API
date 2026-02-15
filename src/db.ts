import Database from 'better-sqlite3';
import { env } from './env.js';
import type { AuditStatus, Profile } from './types.js';

const dbPath = env('DB_PATH', './data/app.db');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS audits (
    id TEXT PRIMARY KEY,
    requested_url TEXT NOT NULL,
    profile TEXT NOT NULL,
    status TEXT NOT NULL,
    progress_stage TEXT,
    progress_value INTEGER,
    error_code TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    limits_json TEXT,
    user_context_json TEXT
  );

  CREATE TABLE IF NOT EXISTS reports (
    audit_id TEXT PRIMARY KEY,
    report_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  -- Performance indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
  CREATE INDEX IF NOT EXISTS idx_audits_created ON audits(created_at);
  CREATE INDEX IF NOT EXISTS idx_audits_url ON audits(requested_url);
  CREATE INDEX IF NOT EXISTS idx_audits_status_created ON audits(status, created_at);
  `);
}

export function insertAudit(args: {
  id: string;
  requested_url: string;
  profile: Profile;
  status: AuditStatus;
  created_at: string;
  limits_json: string;
  user_context_json: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO audits(id, requested_url, profile, status, created_at, limits_json, user_context_json)
    VALUES (@id,@requested_url,@profile,@status,@created_at,@limits_json,@user_context_json)
  `);
  stmt.run(args);
}

export function setAuditRunning(id: string, started_at: string) {
  db.prepare(`UPDATE audits SET status='running', started_at=? WHERE id=?`).run(started_at, id);
}
export function setAuditProgress(id: string, stage: string, value: number) {
  db.prepare(`UPDATE audits SET progress_stage=?, progress_value=? WHERE id=?`).run(stage, value, id);
}
export function setAuditDone(id: string, finished_at: string) {
  db.prepare(`UPDATE audits SET status='done', finished_at=? WHERE id=?`).run(finished_at, id);
}
export function setAuditFailed(id: string, finished_at: string, code: string, msg: string) {
  db.prepare(`UPDATE audits SET status='failed', finished_at=?, error_code=?, error_message=? WHERE id=?`).run(finished_at, code, msg, id);
}

export function upsertReport(audit_id: string, report_json: string, created_at: string) {
  db.prepare(`INSERT INTO reports(audit_id, report_json, created_at) VALUES (?,?,?)
             ON CONFLICT(audit_id) DO UPDATE SET report_json=excluded.report_json, created_at=excluded.created_at`)
    .run(audit_id, report_json, created_at);
}

export function getAudit(id: string) {
  return db.prepare(`SELECT * FROM audits WHERE id=?`).get(id) as any;
}
export function getReport(id: string) {
  return db.prepare(`SELECT * FROM reports WHERE audit_id=?`).get(id) as any;
}

export function claimNextQueued(): { id: string } | null {
  const row = db.prepare(`SELECT id FROM audits WHERE status='queued' ORDER BY created_at ASC LIMIT 1`).get() as any;
  if (!row) return null;
  // claim
  const ok = db.prepare(`UPDATE audits SET status='running' WHERE id=? AND status='queued'`).run(row.id).changes;
  if (!ok) return null;
  return { id: row.id };
}

/**
 * Delete old audits and their reports (GDPR compliance / data retention)
 * @param maxAgeDays - Delete audits older than this many days (default: 90)
 * @returns Number of audits deleted
 */
export function deleteOldAudits(maxAgeDays: number = 90): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  const cutoffIso = cutoffDate.toISOString();

  // First delete associated reports
  const reportsDeleted = db.prepare(`
    DELETE FROM reports 
    WHERE audit_id IN (
      SELECT id FROM audits WHERE created_at < ?
    )
  `).run(cutoffIso).changes;

  // Then delete old audits
  const auditsDeleted = db.prepare(`
    DELETE FROM audits WHERE created_at < ?
  `).run(cutoffIso).changes;

  console.log(`Data retention cleanup: deleted ${auditsDeleted} audits and ${reportsDeleted} reports (older than ${maxAgeDays} days)`);
  return auditsDeleted;
}

/**
 * Get audit statistics
 */
export function getAuditStats(): {
  total: number;
  queued: number;
  running: number;
  done: number;
  failed: number;
  oldestAudit?: string;
} {
  const total = db.prepare('SELECT COUNT(*) as count FROM audits').get() as { count: number };
  const queued = db.prepare(`SELECT COUNT(*) as count FROM audits WHERE status='queued'`).get() as { count: number };
  const running = db.prepare(`SELECT COUNT(*) as count FROM audits WHERE status='running'`).get() as { count: number };
  const done = db.prepare(`SELECT COUNT(*) as count FROM audits WHERE status='done'`).get() as { count: number };
  const failed = db.prepare(`SELECT COUNT(*) as count FROM audits WHERE status='failed'`).get() as { count: number };
  const oldest = db.prepare('SELECT MIN(created_at) as date FROM audits').get() as { date: string } | undefined;

  return {
    total: total.count,
    queued: queued.count,
    running: running.count,
    done: done.count,
    failed: failed.count,
    oldestAudit: oldest?.date,
  };
}

/**
 * Clean up stale running audits (e.g., after server crash)
 * Resets audits stuck in 'running' state for > 1 hour back to 'queued'
 */
export function cleanupStaleRunningAudits(maxRunningMinutes: number = 60): number {
  const cutoffDate = new Date();
  cutoffDate.setMinutes(cutoffDate.getMinutes() - maxRunningMinutes);
  const cutoffIso = cutoffDate.toISOString();

  const updated = db.prepare(`
    UPDATE audits 
    SET status='queued', started_at=NULL 
    WHERE status='running' AND (started_at < ? OR started_at IS NULL)
  `).run(cutoffIso).changes;

  if (updated > 0) {
    console.log(`Cleaned up ${updated} stale running audits (running > ${maxRunningMinutes} minutes)`);
  }
  return updated;
}
