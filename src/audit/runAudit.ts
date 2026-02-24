import type { AuditCreateRequest, Limits, Profile, Report, WpApiData, FreshnessData, Finding, LighthouseData } from '../types.js';
import { fetchRobots } from './robots.js';
import { discoverSitemaps, sampleSitemapUrls } from './sitemap.js';
import { smartSample } from './smart.js';
import { scoreSite } from './score.js';
import { detectSiteTypeWithWpData } from './siteType.js';
import { buildFindings, buildFreshnessFindings } from './summary.js';
import { buildTelegram } from './telegram.js';
import { inferLang } from '../utils/i18n.js';
import { normalizeUrl as normalizeUrlStrict, isCrawlableUrl, sameHost } from './url.js';
import { fetchWpData, getPriorityUrls } from './wpApi.js';
import { calculateFreshnessScore, formatFreshnessData, getFreshnessRecommendations } from './freshness.js';
import { runLighthouseOnPages, aggregateLighthouseResults } from './lighthouse.js';

function nowIso() { return new Date().toISOString(); }

export function normalizeUrl(u: string): string {
  // Backwards-compatible export: returns a stable, de-duplicated URL string.
  return normalizeUrlStrict(u) || new URL(u).toString();
}

export function buildLimits(profile: Profile, partial?: Partial<Limits>): Limits {
  const smartDefaults: Limits = {
    // Smart mode is sample-based, but should still be representative.
    // Default to 50 pages unless the caller overrides.
    sample_total_pages: Number(process.env.DEFAULT_SAMPLE_TOTAL_PAGES ?? 50),
    request_delay_ms: Number(process.env.DEFAULT_REQUEST_DELAY_MS ?? 1100),
    request_jitter_ms: Number(process.env.DEFAULT_REQUEST_JITTER_MS ?? 900),
    per_host_concurrency: Number(process.env.DEFAULT_PER_HOST_CONCURRENCY ?? 1),
    global_concurrency: Number(process.env.DEFAULT_GLOBAL_CONCURRENCY ?? 4),
    per_page_timeout_ms: 25_000,
    max_html_bytes: 1_800_000,
    max_links_per_page: Number(process.env.DEFAULT_MAX_LINKS_PER_PAGE ?? 250),

    link_check_max: Number(process.env.DEFAULT_LINK_CHECK_MAX ?? 180),
    link_check_delay_ms: Number(process.env.DEFAULT_LINK_CHECK_DELAY_MS ?? 350),
    link_check_jitter_ms: Number(process.env.DEFAULT_LINK_CHECK_JITTER_MS ?? 250),
    link_check_timeout_ms: 12_000,

    sitemap_max_bytes: Number(process.env.SITEMAP_MAX_BYTES ?? 8_000_000),
    sitemap_files_max: Number(process.env.SITEMAP_FILES_MAX ?? 3),
    sitemap_max_urls_per_file: Number(process.env.SITEMAP_MAX_URLS_PER_FILE ?? 20000)
  };

  const fullDefaults: Limits = {
    ...smartDefaults,
    sample_total_pages: 120,
    request_delay_ms: 500,
    request_jitter_ms: 500,
    global_concurrency: 8,
    per_host_concurrency: 2,
    max_links_per_page: Number(process.env.FULL_MAX_LINKS_PER_PAGE ?? 400),
    link_check_max: 400
  };

  const base = profile === 'full' ? fullDefaults : smartDefaults;
  return { ...base, ...partial };
}

export async function runAudit(req: AuditCreateRequest, auditId: string, onProgress?: (stage: string, value: number)=>void): Promise<Report> {
  const started = Date.now();
  const startedAt = nowIso();

  const profile: Profile = req.profile ?? 'smart';
  const url = normalizeUrl(req.url);
  const origin = new URL(url).origin;
  const limits = buildLimits(profile, req.limits);

  const userLang = req.user_context?.lang ?? 'fa';
  
  // Fetch robots.txt and detect WP API concurrently
  onProgress?.('robots', 0);
  const [robots, wpData] = await Promise.all([
    fetchRobots(origin, limits),
    fetchWpData(origin, limits) // Non-blocking - continues even if WP API unavailable
  ]);
  onProgress?.('robots', 1);

  // Prefer explicit user language, fall back to hints (eg. from robots / headers)
  const lang = inferLang(userLang, robots.text);

  onProgress?.('sitemap', 0);
  const sitemaps = await discoverSitemaps(origin, robots.text, limits);
  // Pull a larger pool from sitemaps so stratified sampling can choose diverse pages.
  const sitemapSamples = sitemaps.found ? await sampleSitemapUrls(sitemaps.sitemap_urls, 200, limits) : [];
  onProgress?.('sitemap', 1);

  // Candidate hygiene: normalize + keep only crawlable, same-host HTML pages.
  // (Smart sampler will also discover links from audited pages.)
  const candidates = Array.from(
    new Set(
      sitemapSamples
        .map((u) => normalizeUrlStrict(u))
        .filter((u): u is string => !!u && isCrawlableUrl(u) && sameHost(url, u))
    )
  );

  // Add priority URLs from WordPress API if available
  let priorityUrls: string[] = [];
  if (wpData.available && wpData.contentItems.length > 0) {
    priorityUrls = getPriorityUrls(wpData.contentItems, 20, 180); // 20 URLs, 6 months threshold
    // Add priority URLs to candidates (they'll be crawled first)
    for (const priorityUrl of priorityUrls) {
      const normalized = normalizeUrlStrict(priorityUrl);
      if (normalized && isCrawlableUrl(normalized) && sameHost(url, normalized)) {
        if (!candidates.includes(normalized)) {
          candidates.unshift(normalized); // Add to beginning for priority
        }
      }
    }
  }

  // Enhanced site type detection using WP API data
  const siteType = detectSiteTypeWithWpData(wpData);

  onProgress?.('crawl', 0);
  const crawl = await smartSample(url, limits, candidates, (n)=>onProgress?.('crawl', n), siteType);
  onProgress?.('crawl', crawl.checked);

  const checked = crawl.pages.length;

  // Link checks: keep it light and polite
  const link_checks = limits.link_check_max;

  // Aggregate totals from per-page issues (computed in smartSample)
  const totals = new Map<string, number>();
  for (const p of crawl.pages) {
    for (const id of p.issues ?? []) {
      totals.set(id, (totals.get(id) ?? 0) + 1);
    }
  }

  // Run Lighthouse on 3 strategic pages for performance metrics
  onProgress?.('lighthouse', 0);
  let lighthouseResults: import('./lighthouse.js').LighthouseResult[] = [];
  let lighthouseData: LighthouseData | undefined;
  
  try {
    lighthouseResults = await runLighthouseOnPages(crawl.pages, origin, (stage, value) => {
      if (stage === 'lighthouse') onProgress?.('lighthouse', value);
    });
    
    const aggregated = aggregateLighthouseResults(lighthouseResults);
    lighthouseData = {
      ...aggregated,
      pages: lighthouseResults.map(r => ({
        url: r.url,
        metrics: r.metrics,
        error: r.error
      }))
    };
    
    // Add Lighthouse issues to totals for scoring
    for (const issueId of aggregated.issues) {
      totals.set(issueId, (totals.get(issueId) ?? 0) + 1);
    }
  } catch (error) {
    console.error('Lighthouse audit failed:', error);
    lighthouseData = undefined;
  }
  onProgress?.('lighthouse', 100);

  // Calculate content freshness from WP API data
  let freshnessData: FreshnessData | undefined;
  let freshnessFindings: Finding[] = [];
  let freshnessScoreData: { score: number; stale_count: number; total_items: number } | undefined;

  if (wpData.available && wpData.contentItems.length > 0) {
    const score = calculateFreshnessScore(wpData.lastModifiedDates, 6);
    freshnessData = {
      ...formatFreshnessData(wpData.contentItems, score),
      recommendations: getFreshnessRecommendations(wpData.contentItems, lang),
    };
    freshnessFindings = buildFreshnessFindings(lang, wpData.contentItems);
    freshnessScoreData = {
      score,
      stale_count: freshnessData.stale_count,
      total_items: wpData.totalItems,
    };
  }

  // Score site with freshness data included
  const scores = scoreSite(crawl.pages as any, totals, lang, siteType, freshnessScoreData);
  const { findings, top_issues: topIssues, quick_wins: quickWins } = buildFindings(lang, crawl.pages as any, scores);

  // Merge freshness findings with regular findings
  const allFindings = [...findings, ...freshnessFindings];

  // Use WP API total if available for better coverage estimation
  const estimatedTotal = wpData.available && wpData.totalItems > 0 
    ? wpData.totalItems 
    : sitemaps.estimated_total_urls;
  const checkedRatio = estimatedTotal && estimatedTotal > 0 ? checked / estimatedTotal : null;

  const coverage = {
    mode: profile === 'smart' ? 'sample' : 'crawl',
    checked_pages: checked,
    discovered_pages: crawl.discovered,
    estimated_total_pages: estimatedTotal,
    checked_ratio: checkedRatio,
    link_checks,
    note: profile === 'smart' ? 'sample-based' : undefined
  } as const;

  const text_fa = buildTelegram('fa', { 
    url, 
    overall: scores.overall_score, 
    coverage, 
    topIssues, 
    quickWins,
    pillars: scores.pillars,
    wpData: wpData.available ? wpData : undefined,
    freshnessData,
    lighthouseData
  });
  const text_en = buildTelegram('en', { 
    url, 
    overall: scores.overall_score, 
    coverage, 
    topIssues, 
    quickWins,
    pillars: scores.pillars,
    wpData: wpData.available ? wpData : undefined,
    freshnessData,
    lighthouseData
  });

  const pages_with_issues = crawl.pages
    .filter((p) => (p.issues?.length ?? 0) > 0)
    .map((p) => ({ url: p.url, issue_ids: p.issues! }));

  // Canonical field name in the public schema
  const pages_by_issue = pages_with_issues;

  const finishedAt = nowIso();
  const report: Report = {
    schema_version: '1.7.0',
    audit_id: auditId,
    url,
    profile,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: Date.now() - started,
    coverage,
    pages: crawl.pages.map((p) => ({
      url: p.url,
      final_url: p.final_url,
      status: p.status,
      title: p.title,
      meta_desc: p.meta_desc,
      canonical: p.canonical,
      meta_robots: p.meta_robots ?? null,
      h1_count: p.h1_count,
      images_missing_alt: p.images_missing_alt,
      issues: (p.issues ?? [])
    })),
    scores: {
      overall: scores.overall_score,
      pillars: scores.pillars,
      site_type: scores.site_type,
      weights: scores.weights
    },
    findings: allFindings,
    top_issues: topIssues,
    quick_wins: quickWins,
    pages_by_issue,
    pages_with_issues,
    telegram: { text: lang === 'fa' ? text_fa : text_en, text_en, text_fa },
    wp_api: wpData.available ? wpData : undefined,
    freshness: freshnessData,
    lighthouse: lighthouseData,
    debug: {
      robots_ok: robots.ok,
      robots_status: robots.status,
      sitemaps,
      wp_api_available: wpData.available,
      priority_urls_count: priorityUrls.length,
      lighthouse_pages: lighthouseResults.length
    }
  };

  return report;
}
