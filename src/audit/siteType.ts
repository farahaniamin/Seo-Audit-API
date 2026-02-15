import { fetchHtml } from './fetcher.js';
import type { Limits } from '../types.js';

export type SiteType = 'ecommerce' | 'corporate' | 'content' | 'unknown';

function scoreByUrlPatterns(urls: string[]) {
  let ecommerce = 0;
  let content = 0;
  let corporate = 0;

  for (const raw of urls) {
    let p = '';
    try {
      p = new URL(raw).pathname.toLowerCase();
    } catch {
      continue;
    }

    if (/(\bproduct\b|\/product\/|\/shop\/|\/cart\/|\/checkout\/|\/my-account\/|\/product-category\/)/.test(p)) ecommerce += 2;
    if (/(\/blog\/|\/tag\/|\/category\/|\/\d{4}\/\d{2}\/)/.test(p)) content += 1;
    if (/(\/about|\/contact|\/services|\/portfolio|\/team)/.test(p)) corporate += 1;
  }

  return { ecommerce, content, corporate };
}

export async function detectSiteType(seedUrl: string, candidates: string[], limits: Limits): Promise<SiteType> {
  // Heuristic: mix of HTML signals + URL pattern distribution.
  const byUrls = scoreByUrlPatterns([seedUrl, ...candidates.slice(0, 200)]);

  try {
    const home = await fetchHtml(seedUrl, limits.timeout_ms, limits.max_bytes);
    const html = (home.body || '').toLowerCase();

    // Ecommerce signals
    if (
      html.includes('woocommerce') ||
      html.includes('shopify') ||
      html.includes('add-to-cart') ||
      html.includes('cart') && html.includes('checkout') ||
      html.includes('wp-content/plugins/woocommerce')
    ) {
      byUrls.ecommerce += 4;
    }

    // Content/publisher signals
    if (html.includes('article') && (html.includes('author') || html.includes('post'))) {
      byUrls.content += 2;
    }

    // Corporate/service signals
    if (html.includes('services') || html.includes('about us') || html.includes('تماس') || html.includes('درباره')) {
      byUrls.corporate += 1;
    }
  } catch {
    // ignore
  }

  const max = Math.max(byUrls.ecommerce, byUrls.content, byUrls.corporate);
  if (max < 3) return 'unknown';
  if (max === byUrls.ecommerce) return 'ecommerce';
  if (max === byUrls.content) return 'content';
  return 'corporate';
}
