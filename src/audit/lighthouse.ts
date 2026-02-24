import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import type { Page } from './smart.js';

export type LighthouseMetrics = {
  performance: number;
  lcp: number | null; // Largest Contentful Paint in ms
  cls: number | null; // Cumulative Layout Shift
  tbt: number | null; // Total Blocking Time in ms
  fcp: number | null; // First Contentful Paint in ms
  speedIndex: number | null;
  opportunities: Array<{
    title: string;
    savings: string;
  }>;
  diagnostics: string[];
};

export type LighthouseResult = {
  url: string;
  metrics: LighthouseMetrics;
  error?: string;
};

async function runLighthouseAudit(url: string): Promise<LighthouseResult> {
  let chrome;
  try {
    // Launch Chrome
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });

    // Run Lighthouse with performance only
    const result = await lighthouse(url, {
      port: chrome.port,
      onlyCategories: ['performance'],
      output: 'json',
      logLevel: 'error'
    });

    if (!result?.lhr) {
      throw new Error('Lighthouse returned no result');
    }

    const lhr = result.lhr;
    const audits = lhr.audits;

    // Extract Core Web Vitals and metrics
    const metrics: LighthouseMetrics = {
      performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      lcp: audits['largest-contentful-paint']?.numericValue ?? null,
      cls: audits['cumulative-layout-shift']?.numericValue ?? null,
      tbt: audits['total-blocking-time']?.numericValue ?? null,
      fcp: audits['first-contentful-paint']?.numericValue ?? null,
      speedIndex: audits['speed-index']?.numericValue ?? null,
      opportunities: [],
      diagnostics: []
    };

    // Extract opportunities (performance improvements)
    const opportunityIds = [
      'render-blocking-resources',
      'unused-css-rules',
      'unused-javascript',
      'modern-image-formats',
      'efficiently-encode-images',
      'offscreen-images',
      'total-byte-weight',
      'uses-long-cache-ttl',
      'dom-size'
    ];

    for (const id of opportunityIds) {
      const audit = audits[id];
      if (audit && audit.score !== null && audit.score < 1) {
        const displayValue = audit.displayValue || '';
        metrics.opportunities.push({
          title: audit.title,
          savings: displayValue
        });
      }
    }

    // Extract diagnostics
    const diagnosticIds = [
      'mainthread-work-breakdown',
      'bootup-time',
      'uses-rel-preconnect',
      'uses-rel-preload',
      'network-rtt',
      'network-server-latency'
    ];

    for (const id of diagnosticIds) {
      const audit = audits[id];
      if (audit && audit.details) {
        metrics.diagnostics.push(`${audit.title}: ${audit.displayValue || 'N/A'}`);
      }
    }

    return { url, metrics };

  } catch (error) {
    return {
      url,
      metrics: {
        performance: 0,
        lcp: null,
        cls: null,
        tbt: null,
        fcp: null,
        speedIndex: null,
        opportunities: [],
        diagnostics: []
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

/**
 * Select 3 strategic pages for Lighthouse audit
 */
function selectPagesForLighthouse(pages: Page[], origin: string): string[] {
  const selected: string[] = [];
  
  // 1. Always include homepage
  const homepage = pages.find(p => {
    const url = new URL(p.url);
    return url.pathname === '/' || url.pathname === '/index.html';
  });
  if (homepage) {
    selected.push(homepage.url);
  }

  // 2. Find best product/service page (if ecommerce)
  const productPage = pages.find(p => {
    const url = new URL(p.url);
    return /(\/product\/|\/products\/|\/shop\/|\/service\/)/i.test(url.pathname);
  });
  if (productPage && !selected.includes(productPage.url)) {
    selected.push(productPage.url);
  }

  // 3. Find category/blog/content page
  const contentPage = pages.find(p => {
    const url = new URL(p.url);
    return /(\/blog\/|\/category\/|\/post\/|\/article\/)/i.test(url.pathname) || 
           /\d{4}\/\d{2}\//.test(url.pathname); // Date-based URLs
  });
  if (contentPage && !selected.includes(contentPage.url)) {
    selected.push(contentPage.url);
  }

  // If we don't have 3 pages, fill with any available pages
  if (selected.length < 3) {
    for (const page of pages) {
      if (!selected.includes(page.url) && selected.length < 3) {
        selected.push(page.url);
      }
    }
  }

  return selected.slice(0, 3);
}

/**
 * Run Lighthouse on 3 strategic pages
 */
export async function runLighthouseOnPages(
  pages: Page[],
  origin: string,
  onProgress?: (stage: string, value: number) => void
): Promise<LighthouseResult[]> {
  const urls = selectPagesForLighthouse(pages, origin);
  const results: LighthouseResult[] = [];

  onProgress?.('lighthouse', 0);

  // Run sequentially to save memory
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    onProgress?.('lighthouse', Math.round(((i) / urls.length) * 100));
    
    const result = await runLighthouseAudit(url);
    results.push(result);
    
    onProgress?.('lighthouse', Math.round(((i + 1) / urls.length) * 100));
  }

  return results;
}

/**
 * Aggregate Lighthouse results into overall metrics
 */
export function aggregateLighthouseResults(results: LighthouseResult[]): {
  performance: number;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  issues: string[];
  opportunities: string[];
} {
  const successful = results.filter(r => !r.error);
  
  if (successful.length === 0) {
    return {
      performance: 0,
      lcp: null,
      cls: null,
      tbt: null,
      issues: ['Lighthouse audit failed on all pages'],
      opportunities: []
    };
  }

  // Calculate averages
  const avgPerformance = Math.round(
    successful.reduce((sum, r) => sum + r.metrics.performance, 0) / successful.length
  );

  const avgLcp = successful.every(r => r.metrics.lcp !== null)
    ? Math.round(successful.reduce((sum, r) => sum + (r.metrics.lcp || 0), 0) / successful.length)
    : null;

  const avgCls = successful.every(r => r.metrics.cls !== null)
    ? successful.reduce((sum, r) => sum + (r.metrics.cls || 0), 0) / successful.length
    : null;

  const avgTbt = successful.every(r => r.metrics.tbt !== null)
    ? Math.round(successful.reduce((sum, r) => sum + (r.metrics.tbt || 0), 0) / successful.length)
    : null;

  // Detect issues based on thresholds
  const issues: string[] = [];
  
  if (avgPerformance < 50) issues.push('L01'); // Poor performance
  if (avgLcp !== null && avgLcp > 2500) issues.push('L02'); // Poor LCP
  if (avgCls !== null && avgCls > 0.1) issues.push('L03'); // Poor CLS
  if (avgTbt !== null && avgTbt > 200) issues.push('L04'); // Poor TBT

  // Collect unique opportunities
  const allOpportunities = new Set<string>();
  for (const result of successful) {
    for (const opp of result.metrics.opportunities) {
      allOpportunities.add(`${opp.title}${opp.savings ? ` (${opp.savings})` : ''}`);
    }
  }

  return {
    performance: avgPerformance,
    lcp: avgLcp,
    cls: avgCls,
    tbt: avgTbt,
    issues,
    opportunities: Array.from(allOpportunities).slice(0, 10) // Top 10 opportunities
  };
}
