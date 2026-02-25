import type { Lang, WpContentItem, Finding } from '../types.js';
import { t } from '../utils/i18n.js';
import type { Page } from './smart.js';
import { identifyStaleContent, findThinContentTypes } from './freshness.js';

export function buildFindings(lang: Lang, pages: Page[], score: any) {
  const items = score?.breakdown?.items ?? [];

  // For each issue, collect example URLs (capped)
  const byId = new Map<string, Set<string>>();
  for (const p of pages) {
    for (const id of p.issues ?? []) {
      if (!byId.has(id)) byId.set(id, new Set());
      const set = byId.get(id)!;
      // Normalize URL: remove trailing slash
      const normalizedUrl = (p.final_url || p.url).replace(/\/$/, '');
      if (set.size < 25) set.add(normalizedUrl);
    }
  }
  
  // Convert Sets to Arrays
  const byIdArray = new Map<string, string[]>();
  for (const [id, set] of byId) {
    byIdArray.set(id, Array.from(set));
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
      example_urls: byIdArray.get(it.id) ?? [],
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

/**
 * Build findings from WordPress content freshness analysis
 */
export function buildFreshnessFindings(
  lang: Lang,
  items: WpContentItem[]
): Finding[] {
  const findings: Finding[] = [];
  
  if (!items || items.length === 0) return findings;
  
  const publishedItems = items.filter(i => i.status === 'publish');
  if (publishedItems.length === 0) return findings;
  
  // Find stale content (6+ months)
  const staleItems = identifyStaleContent(items, 6);
  if (staleItems.length > 0) {
    const affectedPages = Math.min(staleItems.length, 100);
    findings.push({
      id: 'C01',
      affected_pages: affectedPages,
      checked_pages: publishedItems.length,
      prevalence: affectedPages / publishedItems.length,
      severity: staleItems.length > publishedItems.length * 0.5 ? 'high' : 'medium',
    });
  }
  
  // Find thin content types
  const thinTypes = findThinContentTypes(items, 5);
  const thinTypeCount = Object.keys(thinTypes).length;
  if (thinTypeCount > 0) {
    const totalTypes = Object.keys(
      publishedItems.reduce((acc, i) => {
        acc[i.type] = true;
        return acc;
      }, {} as Record<string, boolean>)
    ).length;
    
    findings.push({
      id: 'C02',
      affected_pages: thinTypeCount,
      checked_pages: totalTypes,
      prevalence: thinTypeCount / totalTypes,
      severity: 'low',
    });
  }
  
  return findings;
}
