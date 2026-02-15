import type { Lang } from '../types.js';
import { t } from '../utils/i18n.js';
import type { Page } from './smart.js';

export function buildFindings(lang: Lang, pages: Page[], score: any) {
  const items = score?.breakdown?.items ?? [];

  // For each issue, collect example URLs (capped)
  const byId = new Map<string, string[]>();
  for (const p of pages) {
    for (const id of p.issues ?? []) {
      if (!byId.has(id)) byId.set(id, []);
      const arr = byId.get(id)!;
      if (arr.length < 25) arr.push(p.final_url || p.url);
    }
  }

  const findings = items
    .filter((it: any) => (it.affected_pages ?? 0) > 0)
    .map((it: any) => ({
      id: it.id,
      title: it.title || t(lang, `issue.${it.id}.title`),
      description: it.description || t(lang, `issue.${it.id}.desc`),
      pillar: it.pillar,
      severity: it.severity,
      affected_pages: it.affected_pages,
      ratio: it.ratio,
      penalty: it.penalty,
      weight: it.weight,
      quick_win: !!it.quick_win,
      example_urls: byId.get(it.id) ?? [],
    }));

  const top_issues = findings
    .slice()
    .sort((a, b) => (b.penalty ?? 0) - (a.penalty ?? 0))
    .slice(0, 5)
    .map((f) => f.id);

  const quick_wins = findings
    .filter((f) => f.quick_win)
    .slice()
    .sort((a, b) => (b.penalty ?? 0) - (a.penalty ?? 0))
    .slice(0, 5)
    .map((f) => f.id);

  return { findings, top_issues, quick_wins };
}
