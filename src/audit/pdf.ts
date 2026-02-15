import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import type { Lang, Report } from '../types.js';
import { t, checkTitle } from '../utils/i18n.js';

function fmtRatio(x: number | null | undefined) {
  if (x === null || x === undefined) return '—';
  return (x * 100).toFixed(1) + '%';
}

export async function renderReportPdf(report: Report, lang: Lang): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: 'SEO Audit Report' } });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on('data', (c) => chunks.push(Buffer.from(c)));
  doc.pipe(stream);

  const title = `${t(lang, 'audit_complete')} — ${report.url}`;
  doc.fontSize(18).text(title, { align: 'left' });
  doc.moveDown(0.5);

  doc.fontSize(12).text(`${t(lang, 'score')}: ${report.scores.overall.toFixed(1)}/100`);
  doc.moveDown(0.2);

  const c = report.coverage;
  const ratio = c.checked_ratio ?? (c.estimated_total_pages ? c.checked_pages / c.estimated_total_pages : null);
  doc.fontSize(11).text(
    `${t(lang, 'coverage')}: ${c.mode}  |  ${t(lang, 'checked')}: ${c.checked_pages}  |  ${t(lang, 'discovered')}: ${c.discovered_pages}  |  ${t(lang, 'estimated')}: ${c.estimated_total_pages ?? '—'}  |  ratio: ${fmtRatio(ratio)}  |  ${t(lang, 'link_checks')}: ${c.link_checks}`
  );
  if (c.note) {
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('gray').text(t(lang, 'note_sample'));
    doc.fillColor('black');
  }
  doc.moveDown(0.8);

  // Pillars
  doc.fontSize(14).text('Pillars', { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(11);
  for (const [k, v] of Object.entries(report.scores.pillars)) {
    doc.text(`${k}: ${Number(v).toFixed(1)}/100`);
  }
  doc.moveDown(0.8);

  // Top issues
  doc.fontSize(14).text(t(lang, 'top_issues'), { underline: true });
  doc.moveDown(0.4);
  if (report.top_issues.length === 0) doc.fontSize(11).text('—');
  for (const id of report.top_issues) {
    const f = report.findings.find((x) => x.id === id);
    const aff = f ? `${f.affected_pages}/${f.checked_pages}` : '';
    doc.fontSize(11).text(`• ${id} — ${checkTitle(lang, id)} ${aff ? '(' + aff + ')' : ''}`);
  }
  doc.moveDown(0.6);

  // Findings summary
  doc.fontSize(14).text('Findings', { underline: true });
  doc.moveDown(0.4);
  if (report.findings.length === 0) doc.fontSize(11).text('—');
  for (const f of report.findings) {
    doc.fontSize(11).text(
      `• ${f.id} — ${checkTitle(lang, f.id)} | affected: ${f.affected_pages}/${f.checked_pages} | prevalence: ${fmtRatio(f.prevalence)} | severity: ${f.severity}`
    );
  }
  doc.moveDown(0.8);

  // Per-page details
  doc.fontSize(14).text('Pages checked', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('gray').text('Note: only checked pages are listed here.');
  doc.fillColor('black');
  doc.moveDown(0.4);

  for (const p of report.pages) {
    doc.fontSize(11).text(p.url, { continued: false });
    doc.fontSize(10).fillColor('gray').text(`status: ${p.status} | final: ${p.final_url}`);
    doc.fillColor('black');

    const issues = p.issues?.length ? p.issues.map((id) => `${id} (${checkTitle(lang, id)})`).join(', ') : '—';
    doc.fontSize(10).text(`issues: ${issues}`);

    doc.fontSize(10).text(
      `title: ${p.title ?? '—'} | meta: ${p.meta_desc ? 'yes' : 'no'} | h1: ${p.h1_count} | missing alt: ${p.images_missing_alt} | canonical: ${p.canonical ?? '—'}`
    );
    doc.moveDown(0.6);

    if (doc.y > 760) doc.addPage();
  }

  doc.end();
  await new Promise<void>((resolve) => stream.on('end', () => resolve()));
  return Buffer.concat(chunks);
}
