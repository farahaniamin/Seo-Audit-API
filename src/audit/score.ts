import type { Lang } from '../types.js';
import { t } from '../utils/i18n.js';
import type { Page } from './smart.js';

type Pillar = 'indexability' | 'crawlability' | 'onpage' | 'technical' | 'structured_data' | 'performance';
type Severity = 'critical' | 'warning' | 'info';

type IssueDef = {
  id: string;
  pillar: Pillar;
  weight: number; // max penalty when ratio ~ 1
  severity: Severity;
  quick_win?: boolean;
};

// Keep focused on high-signal issues we can detect without heavy crawling.
const ISSUE_DEFS: IssueDef[] = [
  { id: 'E01', pillar: 'indexability', weight: 22, severity: 'critical', quick_win: true }, // noindex
  { id: 'E02', pillar: 'crawlability', weight: 16, severity: 'critical', quick_win: true }, // 4xx
  { id: 'E04', pillar: 'crawlability', weight: 6, severity: 'warning' }, // redirect chains
  { id: 'E06', pillar: 'technical', weight: 12, severity: 'warning', quick_win: true }, // canonical mismatch

  { id: 'F01', pillar: 'onpage', weight: 8, severity: 'warning', quick_win: true }, // missing/too short title
  { id: 'F04', pillar: 'onpage', weight: 7, severity: 'warning', quick_win: true }, // missing/too short meta desc
  { id: 'F07', pillar: 'onpage', weight: 6, severity: 'warning', quick_win: true }, // missing h1
  { id: 'F08', pillar: 'onpage', weight: 6, severity: 'warning', quick_win: true }, // multiple h1

  { id: 'G01', pillar: 'technical', weight: 7, severity: 'warning', quick_win: true }, // missing alt
];

const SEVERITY_MULT: Record<Severity, number> = {
  critical: 1.0,
  warning: 0.85,
  info: 0.5,
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function penaltyFor(def: IssueDef, ratio: number) {
  // Coverage scaling:
  // - keep very small coverage mild
  // - penalize widespread issues much harder (common reason scores look "too high")
  const r = clamp01(ratio);
  const scaled = Math.pow(r, 0.65); // boosts high coverage without exploding low coverage
  const ratioFactor = 0.15 + 2.35 * scaled; // ~0.15 .. 2.5
  return def.weight * SEVERITY_MULT[def.severity] * ratioFactor;
}

export type SiteType = 'ecommerce' | 'corporate' | 'content' | 'unknown';

export function scoreSite(pages: Page[], totals: Map<string, number>, lang: Lang, siteType: SiteType = 'unknown') {
  const checked = Math.max(1, pages.length);

  // Compute per-issue stats.
  const items = ISSUE_DEFS.map((def) => {
    const affected = totals.get(def.id) ?? 0;
    const ratio = affected / checked;
    const penalty = penaltyFor(def, ratio);
    return {
      id: def.id,
      pillar: def.pillar,
      severity: def.severity,
      weight: def.weight,
      affected_pages: affected,
      ratio,
      penalty,
      title: t(lang, `issue.${def.id}.title`),
      description: t(lang, `issue.${def.id}.desc`),
      quick_win: !!def.quick_win,
    };
  }).sort((a, b) => b.penalty - a.penalty);

  const pillarPenalty: Record<Pillar, number> = {
    indexability: 0,
    crawlability: 0,
    onpage: 0,
    technical: 0,
    structured_data: 0,
    performance: 0,
  };
  for (const it of items) pillarPenalty[it.pillar] += it.penalty;

  const pillars: Record<Pillar, number> = {
    indexability: Math.max(0, 100 - pillarPenalty.indexability),
    crawlability: Math.max(0, 100 - pillarPenalty.crawlability),
    onpage: Math.max(0, 100 - pillarPenalty.onpage),
    technical: Math.max(0, 100 - pillarPenalty.technical),
    structured_data: 100,
    performance: 100,
  };

  // Weighted overall score (slightly different emphasis for ecommerce vs corporate/content).
  const weights =
    siteType === 'ecommerce'
      ? { indexability: 0.26, crawlability: 0.19, onpage: 0.27, technical: 0.2, performance: 0.08 }
      : siteType === 'corporate'
        ? { indexability: 0.23, crawlability: 0.18, onpage: 0.31, technical: 0.2, performance: 0.08 }
        : { indexability: 0.24, crawlability: 0.19, onpage: 0.29, technical: 0.2, performance: 0.08 };

  const overall =
    pillars.indexability * weights.indexability +
    pillars.crawlability * weights.crawlability +
    pillars.onpage * weights.onpage +
    pillars.technical * weights.technical +
    pillars.performance * weights.performance;

  const total_penalty = items.reduce((s, it) => s + it.penalty, 0);

  return {
    overall_score: Math.round(overall * 10) / 10,
    site_type: siteType,
    weights,
    pillars: {
      indexability: Math.round(pillars.indexability * 10) / 10,
      crawlability: Math.round(pillars.crawlability * 10) / 10,
      onpage: Math.round(pillars.onpage * 10) / 10,
      technical: Math.round(pillars.technical * 10) / 10,
      structured_data: Math.round(pillars.structured_data * 10) / 10,
      performance: Math.round(pillars.performance * 10) / 10,
    },
    breakdown: {
      checked_pages: checked,
      total_penalty: Math.round(total_penalty * 100) / 100,
      items,
    },
  };
}
