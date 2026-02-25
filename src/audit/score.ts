import type { Lang } from '../types.js';
import { t } from '../utils/i18n.js';
import type { Page } from './smart.js';

type Pillar = 'indexability' | 'crawlability' | 'onpage' | 'technical' | 'freshness' | 'performance';
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
  // INDEXABILITY - Critical permissions
  { id: 'E01', pillar: 'indexability', weight: 25, severity: 'critical', quick_win: true, max_ratio: 1.0 }, // noindex meta tag - COMPLETELY blocks indexing
  { id: 'E07', pillar: 'indexability', weight: 20, severity: 'critical', quick_win: true, max_ratio: 1.0 }, // robots.txt blocking - Prevents crawling
  { id: 'E12', pillar: 'indexability', weight: 18, severity: 'high', quick_win: true, max_ratio: 1.0 }, // X-Robots-Tag header - Server-level blocking
  { id: 'E14', pillar: 'indexability', weight: 15, severity: 'high', quick_win: true, max_ratio: 0.8 }, // Cross-domain canonical - Wrong canonical target
  { id: 'E18', pillar: 'indexability', weight: 12, severity: 'high', quick_win: false, max_ratio: 1.0 }, // Password/auth protected - Inaccessible to crawlers
  
  // CRAWLABILITY - Navigation barriers
  { id: 'E02', pillar: 'crawlability', weight: 20, severity: 'critical', quick_win: true, max_ratio: 1.0 }, // 4xx errors - broken pages
  { id: 'E19', pillar: 'crawlability', weight: 15, severity: 'high', quick_win: true, max_ratio: 1.0 }, // Infinite redirect loops - Crawler trap
  { id: 'E04', pillar: 'crawlability', weight: 6, severity: 'medium', max_ratio: 0.5 }, // redirect chains - inefficient crawling
  { id: 'L06', pillar: 'crawlability', weight: 5, severity: 'medium', max_ratio: 1.0 }, // Deep page (>3 levels from homepage)
  
  // High impact issues - ON-PAGE
  { id: 'E06', pillar: 'technical', weight: 12, severity: 'high', quick_win: true, max_ratio: 0.8 }, // canonical mismatch - SEO confusion
  { id: 'F01', pillar: 'onpage', weight: 10, severity: 'high', quick_win: true, max_ratio: 1.0 }, // missing title - crucial for SEO
  { id: 'F04', pillar: 'onpage', weight: 8, severity: 'high', quick_win: true, max_ratio: 1.0 }, // missing meta desc - CTR impact
  
  // Medium impact - technical
  { id: 'F07', pillar: 'onpage', weight: 6, severity: 'medium', quick_win: true, max_ratio: 1.0 }, // missing h1
  { id: 'F08', pillar: 'onpage', weight: 5, severity: 'medium', quick_win: true, max_ratio: 1.0 }, // multiple h1
  
  // Lower impact - accessibility
  { id: 'G01', pillar: 'technical', weight: 5, severity: 'low', quick_win: true, max_ratio: 0.9 }, // missing alt - REDUCED (was 7, now 5)
  
  // Freshness issue (from WP API analysis) - Multiple content types
  { id: 'C01', pillar: 'freshness', weight: 18, severity: 'high', max_ratio: 1.0 }, // Stale blog posts (>3 months) - content marketing critical
  { id: 'C02', pillar: 'freshness', weight: 12, severity: 'medium', max_ratio: 1.0 }, // Stale products (>6 months) - e-commerce
  { id: 'C04', pillar: 'freshness', weight: 8, severity: 'low', max_ratio: 1.0 }, // Stale pages (>12 months) - static content
  { id: 'C05', pillar: 'freshness', weight: 15, severity: 'high', max_ratio: 1.0 }, // Overall site freshness (<50% fresh)
  
  // Phase 1: New issues
  { id: 'M01', pillar: 'technical', weight: 12, severity: 'high', quick_win: true, max_ratio: 1.0 }, // Missing mobile viewport - critical for mobile-first indexing
  { id: 'C03', pillar: 'onpage', weight: 8, severity: 'medium', max_ratio: 0.9 }, // Thin content (<300 words) - quality issue
  { id: 'S01', pillar: 'technical', weight: 15, severity: 'critical', quick_win: true, max_ratio: 1.0 }, // Not using HTTPS - security & ranking factor
  { id: 'S02', pillar: 'technical', weight: 10, severity: 'high', quick_win: true, max_ratio: 0.8 }, // Mixed content - security warning
  { id: 'P01', pillar: 'technical', weight: 6, severity: 'medium', max_ratio: 0.7 }, // Slow TTFB (>800ms) - performance issue
  
  // Phase 2: Lighthouse-based issues
  { id: 'L01', pillar: 'performance', weight: 20, severity: 'critical', max_ratio: 1.0 }, // Poor performance score (<50)
  { id: 'L02', pillar: 'performance', weight: 18, severity: 'high', max_ratio: 1.0 }, // Poor LCP (>2.5s)
  { id: 'L03', pillar: 'performance', weight: 16, severity: 'high', max_ratio: 1.0 }, // Poor CLS (>0.1)
  { id: 'L04', pillar: 'performance', weight: 14, severity: 'medium', max_ratio: 1.0 }, // Poor TBT (>200ms)
  
  // Phase 3: Internal link analysis issues
  { id: 'L05', pillar: 'technical', weight: 12, severity: 'high', quick_win: true, max_ratio: 1.0 }, // Orphan page (0 inbound links)
  { id: 'E13', pillar: 'technical', weight: 10, severity: 'medium', quick_win: true, max_ratio: 0.8 }, // Soft 404s (200 status but "not found" content)
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
  freshnessData?: { score: number; stale_count: number; total_items: number },
  lighthouseScore?: number
) {
  const checked = Math.max(1, pages.length);

  // Calculate freshness penalty if data available
  let freshnessPenalty = 0;
  let freshnessRawScore = 0;
  if (freshnessData && freshnessData.total_items > 0) {
    // Use the actual freshness score from WordPress data (0-100)
    // This is already calculated based on content age distribution
    freshnessRawScore = freshnessData.score;
    
    // Calculate penalty for stale content issue (C01) based on ratio
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
    performance: 0,
  };
  
  for (const it of items) {
    if (it.pillar !== 'freshness') { // Freshness already calculated
      pillarPenalty[it.pillar] += it.penalty;
    }
  }

  // Calculate pillar scores (0-100)
  // Performance uses hybrid scoring: 40% raw Lighthouse + 60% issue penalties
  let performanceScore: number;
  if (lighthouseScore !== undefined && lighthouseScore > 0) {
    // Hybrid formula: 40% raw Lighthouse + 60% penalty-adjusted score
    const penaltyAdjustedScore = Math.max(0, 100 - pillarPenalty.performance);
    performanceScore = (lighthouseScore * 0.4) + (penaltyAdjustedScore * 0.6);
  } else {
    // Fallback to penalty-only if no Lighthouse data
    performanceScore = Math.max(0, 100 - pillarPenalty.performance);
  }

  const pillars: Record<Pillar, number> = {
    indexability: Math.max(0, 100 - pillarPenalty.indexability),
    crawlability: Math.max(0, 100 - pillarPenalty.crawlability),
    onpage: Math.max(0, 100 - pillarPenalty.onpage),
    technical: Math.max(0, 100 - pillarPenalty.technical),
    // Use raw freshness score from WordPress data (calculated based on content age distribution)
    freshness: freshnessData ? freshnessRawScore : 0,
    performance: performanceScore,
  };

  // Dynamic weights based on site type and data availability
  // Better distribution: Technical and Performance get more weight, Indexability/Crawlability reduced
  const baseWeights =
    siteType === 'ecommerce'
      ? { indexability: 0.15, crawlability: 0.12, onpage: 0.20, technical: 0.18, freshness: 0.15, performance: 0.20 }
      : siteType === 'corporate'
        ? { indexability: 0.14, crawlability: 0.11, onpage: 0.22, technical: 0.19, freshness: 0.16, performance: 0.18 }
        : { indexability: 0.15, crawlability: 0.12, onpage: 0.21, technical: 0.18, freshness: 0.15, performance: 0.19 };

  // Adjust weights if freshness data not available
  const weights = { ...baseWeights };
  if (!freshnessData) {
    // Redistribute freshness weight to other pillars proportionally
    const freshnessWeight = weights.freshness;
    weights.freshness = 0;
    const otherPillars = ['indexability', 'crawlability', 'onpage', 'technical', 'performance'] as const;
    const redistributed = freshnessWeight / otherPillars.length;
    otherPillars.forEach(p => weights[p] += redistributed);
  }

  // Calculate weighted overall score
  const overall =
    pillars.indexability * weights.indexability +
    pillars.crawlability * weights.crawlability +
    pillars.onpage * weights.onpage +
    pillars.technical * weights.technical +
    pillars.freshness * weights.freshness +
    pillars.performance * weights.performance;

  // Calculate total penalty excluding C01 (freshness) since freshness pillar uses raw score
  // not penalty-based calculation like other pillars
  const total_penalty = items
    .filter(it => it.id !== 'C01')
    .reduce((s, it) => s + it.penalty, 0) + freshnessPenalty;

  // Calculate grade
  let grade = 'F';
  if (overall >= 90) grade = 'A';
  else if (overall >= 80) grade = 'B';
  else if (overall >= 70) grade = 'C';
  else if (overall >= 60) grade = 'D';

  // Calculate per-pillar penalty totals for transparency
  const pillarPenaltyTotals: Record<Pillar, number> = {
    indexability: 0,
    crawlability: 0,
    onpage: 0,
    technical: 0,
    freshness: freshnessPenalty,
    performance: 0,
  };
  
  for (const it of items) {
    if (it.id !== 'C01') { // Exclude C01 from other pillars since it's freshness-specific
      pillarPenaltyTotals[it.pillar] += it.penalty;
    }
  }

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
      performance: Math.round(pillars.performance * 10) / 10,
    },
    breakdown: {
      checked_pages: checked,
      total_penalty: Math.round(total_penalty * 100) / 100,
      freshness_penalty: Math.round(freshnessPenalty * 100) / 100,
      pillar_penalties: {
        indexability: Math.round(pillarPenaltyTotals.indexability * 100) / 100,
        crawlability: Math.round(pillarPenaltyTotals.crawlability * 100) / 100,
        onpage: Math.round(pillarPenaltyTotals.onpage * 100) / 100,
        technical: Math.round(pillarPenaltyTotals.technical * 100) / 100,
        freshness: Math.round(pillarPenaltyTotals.freshness * 100) / 100,
        performance: Math.round(pillarPenaltyTotals.performance * 100) / 100,
      },
      // Include scoring methodology info
      scoring_methodology: {
        grade_thresholds: {
          A: '90-100 (Excellent)',
          B: '80-89 (Good)',
          C: '70-79 (Fair)',
          D: '60-69 (Needs Work)',
          F: '0-59 (Poor)',
        },
        performance_formula: lighthouseScore && lighthouseScore > 0
          ? `Hybrid: 40% Lighthouse (${lighthouseScore}) + 60% Issue Penalties (${Math.round((100 - pillarPenaltyTotals.performance) * 10) / 10}) = ${Math.round(performanceScore * 10) / 10}`
          : 'Penalty-based: 100 - total penalties',
        freshness_formula: freshnessData
          ? `Raw freshness score: ${freshnessRawScore}/100 (based on content age distribution)`
          : 'Not available (no WordPress data)',
        other_pillars_formula: '100 - total penalties for each pillar',
        overall_formula: 'Weighted average of all 6 pillar scores',
      },
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
