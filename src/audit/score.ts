import type { Lang } from '../types.js';
import { t } from '../utils/i18n.js';
import type { Page } from './smart.js';

type Pillar = 'indexability' | 'crawlability' | 'onpage' | 'technical' | 'freshness';
type Severity = 'critical' | 'high' | 'medium' | 'low';

type IssueDef = {
  id: string;
  pillar: Pillar;
  weight: number;
  severity: Severity;
  quick_win?: boolean;
  max_ratio?: number; // Cap the ratio to prevent false positive explosions
};

// Refined issue definitions with better weighting
const ISSUE_DEFS: IssueDef[] = [
  // Critical issues - major impact
  { id: 'E01', pillar: 'indexability', weight: 25, severity: 'critical', quick_win: true, max_ratio: 1.0 }, // noindex - blocks indexing
  { id: 'E02', pillar: 'crawlability', weight: 20, severity: 'critical', quick_win: true, max_ratio: 1.0 }, // 4xx errors - broken pages
  
  // High impact issues
  { id: 'E06', pillar: 'technical', weight: 12, severity: 'high', quick_win: true, max_ratio: 0.8 }, // canonical mismatch - SEO confusion
  { id: 'F01', pillar: 'onpage', weight: 10, severity: 'high', quick_win: true, max_ratio: 1.0 }, // missing title - crucial for SEO
  { id: 'F04', pillar: 'onpage', weight: 8, severity: 'high', quick_win: true, max_ratio: 1.0 }, // missing meta desc - CTR impact
  
  // Medium impact - technical
  { id: 'E04', pillar: 'crawlability', weight: 4, severity: 'medium', max_ratio: 0.5 }, // redirect chains - REDUCED (was 6, now 4) and capped
  { id: 'F07', pillar: 'onpage', weight: 6, severity: 'medium', quick_win: true, max_ratio: 1.0 }, // missing h1
  { id: 'F08', pillar: 'onpage', weight: 5, severity: 'medium', quick_win: true, max_ratio: 1.0 }, // multiple h1
  
  // Lower impact - accessibility
  { id: 'G01', pillar: 'technical', weight: 5, severity: 'low', quick_win: true, max_ratio: 0.9 }, // missing alt - REDUCED (was 7, now 5)
  
  // Freshness issue (from WP API analysis)
  { id: 'C01', pillar: 'freshness', weight: 15, severity: 'high', max_ratio: 1.0 }, // stale content (>6 months)
  
  // Phase 1: New issues
  { id: 'M01', pillar: 'technical', weight: 12, severity: 'high', quick_win: true, max_ratio: 1.0 }, // Missing mobile viewport - critical for mobile-first indexing
  { id: 'C03', pillar: 'onpage', weight: 8, severity: 'medium', max_ratio: 0.9 }, // Thin content (<300 words) - quality issue
  { id: 'S01', pillar: 'technical', weight: 15, severity: 'critical', quick_win: true, max_ratio: 1.0 }, // Not using HTTPS - security & ranking factor
  { id: 'S02', pillar: 'technical', weight: 10, severity: 'high', quick_win: true, max_ratio: 0.8 }, // Mixed content - security warning
  { id: 'P01', pillar: 'technical', weight: 6, severity: 'medium', max_ratio: 0.7 }, // Slow TTFB (>800ms) - performance issue
];

const SEVERITY_MULT: Record<Severity, number> = {
  critical: 1.0,
  high: 0.85,
  medium: 0.65,
  low: 0.4,
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function penaltyFor(def: IssueDef, ratio: number) {
  // Apply max_ratio cap to prevent false positive explosions
  const cappedRatio = def.max_ratio ? Math.min(ratio, def.max_ratio) : ratio;
  const r = clamp01(cappedRatio);
  
  // Non-linear scaling: small issues stay small, widespread issues hurt more
  // Using gentler curve (0.75 instead of 0.65) to reduce penalty inflation
  const scaled = Math.pow(r, 0.75);
  const ratioFactor = 0.2 + 2.0 * scaled; // ~0.2 .. 2.2 (reduced from 2.5)
  
  return def.weight * SEVERITY_MULT[def.severity] * ratioFactor;
}

export type SiteType = 'ecommerce' | 'corporate' | 'content' | 'unknown';

export function scoreSite(
  pages: Page[], 
  totals: Map<string, number>, 
  lang: Lang, 
  siteType: SiteType = 'unknown',
  freshnessData?: { score: number; stale_count: number; total_items: number }
) {
  const checked = Math.max(1, pages.length);

  // Calculate freshness penalty if data available
  let freshnessPenalty = 0;
  if (freshnessData && freshnessData.total_items > 0) {
    // Convert freshness score (0-100) to penalty
    // Score of 100 = 0 penalty, Score of 0 = max penalty
    const staleRatio = freshnessData.stale_count / freshnessData.total_items;
    freshnessPenalty = penaltyFor(
      ISSUE_DEFS.find(d => d.id === 'C01')!,
      staleRatio
    );
  }

  // Compute per-issue stats
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
    freshness: freshnessPenalty,
  };
  
  for (const it of items) {
    if (it.pillar !== 'freshness') { // Freshness already calculated
      pillarPenalty[it.pillar] += it.penalty;
    }
  }

  // Calculate pillar scores (0-100)
  const pillars: Record<Pillar, number> = {
    indexability: Math.max(0, 100 - pillarPenalty.indexability),
    crawlability: Math.max(0, 100 - pillarPenalty.crawlability),
    onpage: Math.max(0, 100 - pillarPenalty.onpage),
    technical: Math.max(0, 100 - pillarPenalty.technical),
    freshness: freshnessData ? Math.max(0, 100 - pillarPenalty.freshness) : 0,
  };

  // Dynamic weights based on site type and data availability
  const baseWeights =
    siteType === 'ecommerce'
      ? { indexability: 0.24, crawlability: 0.18, onpage: 0.26, technical: 0.18, freshness: 0.14 }
      : siteType === 'corporate'
        ? { indexability: 0.22, crawlability: 0.17, onpage: 0.28, technical: 0.17, freshness: 0.16 }
        : { indexability: 0.23, crawlability: 0.17, onpage: 0.27, technical: 0.17, freshness: 0.16 };

  // Adjust weights if freshness data not available
  const weights = { ...baseWeights };
  if (!freshnessData) {
    // Redistribute freshness weight to other pillars
    const freshnessWeight = weights.freshness;
    weights.freshness = 0;
    const otherPillars = ['indexability', 'crawlability', 'onpage', 'technical'] as const;
    const redistributed = freshnessWeight / otherPillars.length;
    otherPillars.forEach(p => weights[p] += redistributed);
  }

  // Calculate weighted overall score
  const overall =
    pillars.indexability * weights.indexability +
    pillars.crawlability * weights.crawlability +
    pillars.onpage * weights.onpage +
    pillars.technical * weights.technical +
    pillars.freshness * weights.freshness;

  const total_penalty = items.reduce((s, it) => s + it.penalty, 0) + freshnessPenalty;

  // Calculate grade
  let grade = 'F';
  if (overall >= 90) grade = 'A';
  else if (overall >= 80) grade = 'B';
  else if (overall >= 70) grade = 'C';
  else if (overall >= 60) grade = 'D';

  return {
    overall_score: Math.round(overall * 10) / 10,
    grade,
    site_type: siteType,
    weights,
    pillars: {
      indexability: Math.round(pillars.indexability * 10) / 10,
      crawlability: Math.round(pillars.crawlability * 10) / 10,
      onpage: Math.round(pillars.onpage * 10) / 10,
      technical: Math.round(pillars.technical * 10) / 10,
      freshness: Math.round(pillars.freshness * 10) / 10,
    },
    breakdown: {
      checked_pages: checked,
      total_penalty: Math.round(total_penalty * 100) / 100,
      freshness_penalty: Math.round(freshnessPenalty * 100) / 100,
      items,
    },
  };
}

/**
 * Calculate performance score (placeholder - should be measured)
 * TODO: Implement actual performance metrics (Core Web Vitals, etc.)
 */
export function calculatePerformanceScore(): number {
  // Placeholder - should measure:
  // - LCP (Largest Contentful Paint)
  // - FID (First Input Delay)
  // - CLS (Cumulative Layout Shift)
  // - Page load time
  // - TTFB (Time to First Byte)
  return 0; // Return 0 to indicate not measured
}

/**
 * Calculate structured data score (placeholder - should be validated)
 * TODO: Implement schema validation
 */
export function calculateStructuredDataScore(): number {
  // Placeholder - should validate:
  // - Schema.org markup presence
  // - JSON-LD validity
  // - Required fields for each schema type
  return 0; // Return 0 to indicate not measured
}
