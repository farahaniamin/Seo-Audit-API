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
