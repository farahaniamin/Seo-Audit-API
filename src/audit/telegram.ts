import type { Coverage, Finding, Lang } from '../types.js';
import { t, checkTitle } from '../utils/i18n.js';

function grade(lang: Lang, score: number) {
  if (score >= 90) return t(lang, 'grade_excellent');
  if (score >= 75) return t(lang, 'grade_good');
  if (score >= 60) return t(lang, 'grade_ok');
  return t(lang, 'grade_bad');
}

export function buildTelegram(lang: Lang, args: {
  url: string;
  overall: number;
  coverage: Coverage;
  topIssues: string[];
  quickWins: string[];
}) {
  const c = args.coverage;
  const checked = c.checked_pages;
  const disc = c.discovered_pages;
  const est = c.estimated_total_pages;

  const ratio = (c.checked_ratio ?? (est ? checked/est : (disc ? checked/disc : null)));
  const ratioTxt = ratio !== null && ratio !== undefined ? `${(ratio*100).toFixed(1)}%` : '—';

  const covLine = [
    `${t(lang,'coverage')}: ${c.mode === 'sample' ? 'sample' : 'crawl'}`,
    `${t(lang,'checked')}: ${checked}`,
    `${t(lang,'discovered')}: ${disc}`,
    `${t(lang,'estimated')}: ${est ?? '—'}`,
    `ratio: ${ratioTxt}`,
    `${t(lang,'link_checks')}: ${c.link_checks}`
  ].join(' | ');

  const issues = args.topIssues.length
    ? args.topIssues.map(id=>`- ${id}: ${checkTitle(lang,id)}`).join('\n')
    : '- —';

  const wins = args.quickWins.length
    ? args.quickWins.map(id=>`- ${id}: ${checkTitle(lang,id)}`).join('\n')
    : '- —';

  const note = c.mode === 'sample' ? `\n${t(lang,'note_sample')}` : '';

  return (
    `${t(lang,'audit_complete')}\n` +
    `${args.url}\n\n` +
    `${t(lang,'score')}: ${args.overall.toFixed(1)}/100 (${grade(lang,args.overall)})\n` +
    `${covLine}\n\n` +
    `${t(lang,'top_issues')}:\n${issues}\n\n` +
    `${t(lang,'quick_wins')}:\n${wins}` +
    note
  );
}
