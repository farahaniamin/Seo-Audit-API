import { initDb, claimNextQueued, getAudit, setAuditFailed, setAuditProgress, upsertReport, setAuditDone } from './db.js';
import type { AuditCreateRequest } from './types.js';
import { runAudit } from './audit/runAudit.js';

initDb();

function sleep(ms: number) { return new Promise(r=>setTimeout(r, ms)); }

async function loop() {
  while (true) {
    const next = claimNextQueued();
    if (!next) { await sleep(800); continue; }

    const row = getAudit(next.id);
    if (!row) continue;

    const req: AuditCreateRequest = {
      url: row.requested_url,
      profile: row.profile,
      limits: JSON.parse(row.limits_json ?? '{}'),
      user_context: JSON.parse(row.user_context_json ?? '{}')
    };

    try {
      const report = await runAudit(req, next.id, (stage, value)=>setAuditProgress(next.id, stage, value));
      upsertReport(next.id, JSON.stringify(report), new Date().toISOString());
      setAuditDone(next.id, new Date().toISOString());
    } catch (e:any) {
      setAuditFailed(next.id, new Date().toISOString(), 'AUDIT_FAILED', e?.message ?? 'Unknown error');
    }
  }
}

loop().catch((e)=>{ console.error(e); process.exit(1); });
