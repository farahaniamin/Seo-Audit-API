import PQueue from 'p-queue';
import { fetchHtml } from './fetcher.js';
import { extractInternalLinks } from './linkcheck.js';
import { extractCanonical, extractH1Count, extractMetaDescription, extractTitle, extractMetaRobots, countImagesMissingAlt, hasViewportMeta, countWords } from './html.js';
import type { Limits } from '../types.js';
import { isCrawlableUrl, normalizeUrl, sameCanonical } from './url.js';
import type { SiteType } from './siteType.js';

export type Page = {
  url: string;
  final_url: string;
  status: number;
  redirect_chain: string[];
  title: string | null;
  meta_desc: string | null;
  canonical: string | null;
  meta_robots: string | null;
  x_robots_tag: string | null;
  h1_count: number;
  images_missing_alt: number;
  links_internal: string[];
  issues?: string[];
  // Phase 1: Quality metrics
  has_viewport?: boolean;
  word_count?: number;
  is_https?: boolean;
  has_mixed_content?: boolean;
  ttfb_ms?: number;
};

function originOf(u: string) {
  const x = new URL(u);
  return x.origin;
}
function sameHostOrigin(a: string, origin: string) {
  try { return new URL(a, origin).origin === origin; } catch { return false; }
}

function sleep(ms: number) { return new Promise(r=>setTimeout(r, ms)); }

function classifyUrl(u: string): 'product' | 'category' | 'blog' | 'page' | 'utility' | 'other' {
  let p = '';
  try { p = new URL(u).pathname.toLowerCase(); } catch { return 'other'; }

  if (/(\/cart\/|\/checkout\/|\/my-account\/|\/login\/|\/register\/|\/wp-admin\/)/.test(p)) return 'utility';
  if (/(\/product\/|\/shop\/|\/products\/)/.test(p)) return 'product';
  if (/(\/product-category\/|\/product_cat\/|\/category\/|\/tag\/)/.test(p)) return 'category';
  if (/(\/blog\/|\/post\/|\/\d{4}\/\d{2}\/)/.test(p)) return 'blog';
  if (/(\/about|\/contact|\/services|\/portfolio|\/team|\/faq)/.test(p)) return 'page';
  return 'other';
}

function pickStratified(urls: string[], limit: number, siteType: SiteType): string[] {
  const buckets: Record<string, string[]> = {
    product: [],
    category: [],
    blog: [],
    page: [],
    utility: [],
    other: [],
  };
  for (const u of urls) buckets[classifyUrl(u)].push(u);

  // Quotas are heuristics; any deficit gets filled from "other" then remaining buckets.
  const quotas =
    siteType === 'ecommerce'
      ? { product: 20, category: 10, blog: 10, page: 6, other: 4, utility: 0 }
      : siteType === 'corporate'
        ? { page: 22, blog: 16, category: 4, other: 8, product: 0, utility: 0 }
        : { page: 16, blog: 16, category: 6, other: 12, product: 0, utility: 0 };

  const out: string[] = [];
  const order: (keyof typeof buckets)[] = ['page', 'product', 'category', 'blog', 'other', 'utility'];

  for (const k of order) {
    const q = (quotas as any)[k] ?? 0;
    for (let i = 0; i < q && buckets[k].length && out.length < limit; i++) out.push(buckets[k].shift()!);
  }

  // Fill remaining in a round-robin to keep diversity.
  while (out.length < limit) {
    let progressed = false;
    for (const k of order) {
      const v = buckets[k].shift();
      if (!v) continue;
      out.push(v);
      progressed = true;
      if (out.length >= limit) break;
    }
    if (!progressed) break;
  }

  return out;
}

export async function smartSample(startUrl: string, limits: Limits, candidates: string[], onProgress?: (n:number)=>void, siteType: SiteType = 'unknown') {
  const seed = normalizeUrl(startUrl) || new URL(startUrl).toString();
  const origin = originOf(seed);

  const selected = new Set<string>();

  function enqueue(raw: string) {
    if (selected.size >= limits.sample_total_pages) return false;
    let abs = '';
    try { abs = new URL(raw, origin).toString(); } catch { return false; }
    const nu = normalizeUrl(abs);
    if (!nu) return false;
    if (!sameHostOrigin(nu, origin)) return false;
    if (!isCrawlableUrl(nu)) return false;
    if (selected.has(nu)) return false;
    selected.add(nu);
    return true;
  }

  // Seed + stratified candidates first (representative sampling).
  selected.add(seed);
  const normCandidates = Array.from(
    new Set(
      candidates
        .map((u) => normalizeUrl(u))
        .filter((u): u is string => !!u && sameHostOrigin(u, origin) && isCrawlableUrl(u) && u !== seed)
    )
  );
  for (const u of pickStratified(normCandidates, Math.max(0, limits.sample_total_pages - 1), siteType)) enqueue(u);

  const queue = new PQueue({ concurrency: Math.max(1, Math.min(limits.global_concurrency, limits.per_host_concurrency)) });
  const pages: Page[] = [];
  const processedUrls = new Set<string>(); // Track URLs already added to prevent duplicates

  async function fetchOne(url: string) {
    const delay = limits.request_delay_ms + Math.floor(Math.random()*limits.request_jitter_ms);
    if (delay>0) await sleep(delay);

    const res = await fetchHtml(url, limits.per_page_timeout_ms, limits.max_html_bytes);
    const html = res.body ?? '';
    const title = html ? extractTitle(html) : null;
    const meta = html ? extractMetaDescription(html) : null;
    const canonical = html ? extractCanonical(html) : null;
    const metaRobots = html ? extractMetaRobots(html) : null;
    const h1 = html ? extractH1Count(html) : 0;
    const missingAlt = html ? countImagesMissingAlt(html) : 0;
    const hasViewport = html ? hasViewportMeta(html) : false;
    const wordCount = html ? countWords(html) : 0;
    
    // Check for mixed content (http links on https page)
    let hasMixedContent = false;
    if (html && res.finalUrl?.startsWith('https://')) {
      const httpLinks = html.match(/href=["']http:\/\//gi);
      if (httpLinks && httpLinks.length > 0) {
        hasMixedContent = true;
      }
    }

    const links_internal = html
      ? extractInternalLinks(html, res.finalUrl ?? url, limits.max_links_per_page)
          .map((u) => normalizeUrl(u))
          .filter((u): u is string => !!u && sameHostOrigin(u, origin) && isCrawlableUrl(u))
      : [];

    // Expand sample intelligently until we hit the requested page budget.
    for (const l of links_internal) enqueue(l);

    const redirect_chain = res.finalUrl && res.finalUrl !== url ? [url, res.finalUrl] : [];

    const page: Page = {
      url,
      final_url: res.finalUrl,
      status: res.status,
      redirect_chain,
      title,
      meta_desc: meta,
      canonical,
      meta_robots: metaRobots,
      x_robots_tag: (res.headers?.['x-robots-tag'] ?? null) as any,
      h1_count: h1,
      images_missing_alt: missingAlt,
      links_internal,
      // Phase 1: Quality metrics
      has_viewport: hasViewport,
      word_count: wordCount,
      is_https: res.finalUrl?.startsWith('https://') ?? false,
      has_mixed_content: hasMixedContent,
      ttfb_ms: res.ttfbMs
    };

    // Issue detection
    const issues: string[] = [];
    const robotsAll = `${page.meta_robots || ''} ${page.x_robots_tag || ''}`.toLowerCase();
    if (robotsAll.includes('noindex')) issues.push('E01');
    if (page.status >= 400) issues.push('E02');
    if ((page.redirect_chain?.length || 0) > 1) issues.push('E04');
    if (page.canonical && !sameCanonical(page.canonical, page.final_url)) issues.push('E06');
    if (!page.title || page.title.trim().length < 10) issues.push('F01');
    if (!page.meta_desc || page.meta_desc.trim().length < 50) issues.push('F04');
    if (page.h1_count === 0) issues.push('F07');
    if (page.h1_count > 1) issues.push('F08');
    if (page.images_missing_alt > 0) issues.push('G01');
    
    // Phase 1: New issues
    if (!page.has_viewport) issues.push('M01'); // Missing mobile viewport
    if ((page.word_count ?? 0) < 300) issues.push('C03'); // Thin content (<300 words)
    if (!page.is_https) issues.push('S01'); // Not using HTTPS
    if (page.has_mixed_content) issues.push('S02'); // Mixed content (http on https)
    if ((page.ttfb_ms ?? 0) > 800) issues.push('P01'); // Slow TTFB (>800ms)
    
    page.issues = issues;

    // Deduplicate: use Set for atomic check (prevents race conditions with concurrent fetches)
    if (!processedUrls.has(page.url)) {
      processedUrls.add(page.url);
      pages.push(page);
      onProgress?.(pages.length);
    }
  }

  // Dynamically enqueue: start with current selected set; during fetch, new URLs may be added.
  const scheduled = new Set<string>();
  function schedulePending() {
    for (const u of selected) {
      if (scheduled.has(u)) continue;
      scheduled.add(u);
      queue.add(() => fetchOne(u));
    }
  }

  schedulePending();
  while (pages.length < limits.sample_total_pages) {
    await queue.onIdle();
    const before = scheduled.size;
    schedulePending();
    if (scheduled.size === before) break; // nothing new discovered
  }
  await queue.onIdle();

  // discovered pages (rough): unique internal links from sampled pages + selected
  const discovered = new Set<string>([...selected]);
  for (const p of pages) for (const l of p.links_internal) discovered.add(l);

  // Phase 3: Build link graph and calculate metrics
  const linkGraph = buildLinkGraph(pages, origin);
  const linkDepths = calculateLinkDepths(pages, linkGraph, seed);
  const inboundCounts = calculateInboundLinks(pages, linkGraph);

  // Add Phase 3 issues
  for (const page of pages) {
    const depth = linkDepths.get(page.url) ?? 999;
    const inbound = inboundCounts.get(page.url) ?? 0;
    const isHomepage = page.url === seed;
    const isReachable = depth !== 999;
    
    // L05: Orphan page (0 inbound links, not homepage)
    if (inbound === 0 && !isHomepage) {
      page.issues = page.issues || [];
      page.issues.push('L05');
    }
    
    // L06: Deep page (>3 levels from homepage, must be reachable)
    // Only flag pages that are actually linked from homepage through >3 hops
    if (isReachable && !isHomepage && depth > 3) {
      page.issues = page.issues || [];
      page.issues.push('L06');
    }
  }

  return { pages, checked: pages.length, discovered: discovered.size, origin };
}

/**
 * Build link graph from crawled pages
 * Returns Map<url, Set<linked_urls>>
 */
function buildLinkGraph(pages: Page[], origin: string): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  
  for (const page of pages) {
    const normalizedUrl = normalizeUrl(page.url) || page.url;
    if (!graph.has(normalizedUrl)) {
      graph.set(normalizedUrl, new Set());
    }
    
    for (const link of page.links_internal) {
      try {
        const normalizedLink = normalizeUrl(link) || link;
        graph.get(normalizedUrl)!.add(normalizedLink);
      } catch {
        // Skip invalid URLs
      }
    }
  }
  
  return graph;
}

/**
 * Calculate link depth (distance from homepage) using BFS
 * Traverses forward from homepage following outbound links
 */
function calculateLinkDepths(pages: Page[], graph: Map<string, Set<string>>, homepage: string): Map<string, number> {
  const depths = new Map<string, number>();
  const visited = new Set<string>();
  
  // Normalize homepage URL
  const normalizedHomepage = normalizeUrl(homepage) || homepage;
  const queue: Array<[string, number]> = [[normalizedHomepage, 0]];
  
  depths.set(normalizedHomepage, 0);
  visited.add(normalizedHomepage);
  
  while (queue.length > 0) {
    const [currentUrl, depth] = queue.shift()!;
    
    // Get all outbound links from current URL and follow them
    const outboundLinks = graph.get(currentUrl);
    if (outboundLinks) {
      for (const targetUrl of outboundLinks) {
        if (!visited.has(targetUrl)) {
          const newDepth = depth + 1;
          depths.set(targetUrl, newDepth);
          visited.add(targetUrl);
          queue.push([targetUrl, newDepth]);
        }
      }
    }
  }
  
  // Set depth for pages not reachable from homepage
  for (const page of pages) {
    const normalizedUrl = normalizeUrl(page.url) || page.url;
    if (!depths.has(normalizedUrl)) {
      depths.set(normalizedUrl, 999); // Unreachable/orphan
    }
  }
  
  return depths;
}

/**
 * Calculate inbound link count for each page
 */
function calculateInboundLinks(pages: Page[], graph: Map<string, Set<string>>): Map<string, number> {
  const inboundCounts = new Map<string, number>();
  
  // Initialize all pages with 0
  for (const page of pages) {
    const normalizedUrl = normalizeUrl(page.url) || page.url;
    inboundCounts.set(normalizedUrl, 0);
  }
  
  // Count inbound links
  for (const [sourceUrl, targets] of graph.entries()) {
    for (const targetUrl of targets) {
      const currentCount = inboundCounts.get(targetUrl) || 0;
      inboundCounts.set(targetUrl, currentCount + 1);
    }
  }
  
  return inboundCounts;
}
