import { Hono } from 'hono';
import { z } from 'zod';
import { initDb, insertAudit, getAudit, getReport } from './db.js';
import { envInt } from './env.js';
import { v4 as uuidv4 } from 'uuid';
import type { AuditCreateRequest } from './types.js';
import { inferLang, t } from './utils/i18n.js';
import { renderReportPdf } from './audit/pdf.js';
import { generateHtmlReport } from './audit/htmlReport.js';
import { serve } from '@hono/node-server';
import { validateUrl, checkDomainRateLimit } from './audit/validation.js';
import { performHealthCheck, getSystemMetrics } from './monitoring/health.js';

initDb();

const app = new Hono();

const AuditCreateSchema = z.object({
  url: z.string().min(4),
  profile: z.enum(['smart','full']).optional(),
  limits: z.record(z.any()).optional(),
  user_context: z.record(z.any()).optional()
});

app.get('/healthz', (c)=>c.json({ ok: true }));

app.get('/health', async (c) => {
  const health = await performHealthCheck();
  return c.json(health);
});

app.get('/metrics', (c) => {
  const metrics = getSystemMetrics();
  return c.json(metrics);
});

app.post('/v1/audits', async (c) => {
  const body = await c.req.json().catch(()=>null);
  const parsed = AuditCreateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } }, 400);

  const req = parsed.data as AuditCreateRequest;
  
  // Validate URL
  const validation = validateUrl(req.url);
  if (!validation.valid) {
    return c.json({ error: { code: 'BAD_REQUEST', message: validation.error } }, 400);
  }
  
  // Check domain rate limit
  try {
    const domain = new URL(validation.normalizedUrl!).hostname;
    const rateLimit = checkDomainRateLimit(domain);
    if (!rateLimit.allowed) {
      return c.json({ 
        error: { 
          code: 'RATE_LIMITED', 
          message: `Rate limit exceeded for domain ${domain}. Retry after ${rateLimit.retryAfter} seconds.` 
        } 
      }, 429);
    }
  } catch {
    // Continue if domain extraction fails
  }
  
  const id = uuidv4();

  insertAudit({
    id,
    requested_url: validation.normalizedUrl || req.url,
    profile: req.profile ?? 'smart',
    status: 'queued',
    created_at: new Date().toISOString(),
    limits_json: JSON.stringify(req.limits ?? {}),
    user_context_json: JSON.stringify(req.user_context ?? {})
  });

  return c.json({ audit_id: id, status: 'queued' }, 202);
});

app.get('/v1/audits/:id', (c) => {
  const id = c.req.param('id');
  const row = getAudit(id);
  if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  return c.json({
    audit_id: id,
    url: row.requested_url,
    profile: row.profile,
    status: row.status,
    progress: { stage: row.progress_stage, value: row.progress_value },
    error: row.status === 'failed' ? { code: row.error_code, message: row.error_message } : null,
    created_at: row.created_at,
    started_at: row.started_at,
    finished_at: row.finished_at
  });
});

app.get('/v1/audits/:id/report', (c) => {
  const id = c.req.param('id');
  const rep = getReport(id);
  if (!rep) {
    const row = getAudit(id);
    if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
    return c.json({ error: { code: 'NOT_READY', message: 'Report not ready' } }, 409);
  }
  return c.json(JSON.parse(rep.report_json));
});


app.get('/v1/audits/:id/report.pdf', async (c) => {
  const id = c.req.param('id');
  const lang = inferLang(c.req.query('lang'), c.req.header('accept-language'));

  const rep = getReport(id);
  if (!rep) {
    const row = getAudit(id);
    if (!row) return c.json({ error: { code: 'NOT_FOUND', message: t(lang,'not_found') } }, 404);
    return c.json({ error: { code: 'NOT_READY', message: t(lang,'not_ready') } }, 409);
  }

  const report = JSON.parse(rep.report_json);
  const pdf = await renderReportPdf(report, lang);

  c.header('content-type', 'application/pdf');
  c.header('content-disposition', `attachment; filename="seo-audit-${id}.pdf"`);
  return c.body(pdf);
});

app.get('/v1/audits/:id/telegram', (c) => {
  const id = c.req.param('id');
  const lang = inferLang(c.req.query('lang'), c.req.header('accept-language'));

  const rep = getReport(id);
  if (!rep) {
    const row = getAudit(id);
    if (!row) return c.json({ error: { code: 'NOT_FOUND', message: t(lang,'not_found') } }, 404);
    return c.json({ error: { code: 'NOT_READY', message: t(lang,'not_ready') } }, 409);
  }

  const report = JSON.parse(rep.report_json);
  const text = lang === 'fa' ? report.telegram.text_fa : report.telegram.text_en;

  return c.json({
    audit_id: report.audit_id,
    lang,
    text,
    coverage: report.coverage,
    overall_score: report.scores?.overall,
    pdf_url: `/v1/audits/${report.audit_id}/report.pdf?lang=${lang}`
  });
});

app.get('/v1/audits/:id/report.html', (c) => {
  const id = c.req.param('id');
  const lang = inferLang(c.req.query('lang'), c.req.header('accept-language')) as 'en' | 'fa';

  const rep = getReport(id);
  if (!rep) {
    const row = getAudit(id);
    if (!row) return c.json({ error: { code: 'NOT_FOUND', message: t(lang,'not_found') } }, 404);
    return c.json({ error: { code: 'NOT_READY', message: t(lang,'not_ready') } }, 409);
  }

  const report = JSON.parse(rep.report_json);
  const html = generateHtmlReport(report, lang);

  c.header('Content-Type', 'text/html; charset=utf-8');
  return c.body(html);
});

const port = envInt('PORT', 8787);
console.log(`API listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
