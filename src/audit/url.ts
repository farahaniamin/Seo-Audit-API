// Query params that generate near-infinite URL variants and/or shouldn't be crawled for SEO.
const STRIP_QUERY_PARAMS = new Set([
  'add-to-cart',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'wbraid',
  'gbraid',
  'mc_cid',
  'mc_eid',
  'yclid',
  'ref',
]);

const BLOCK_IF_QUERY_HAS = new Set([
  'add-to-cart',
  'preview',
]);

export function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    u.hash = '';

    // Strip noisy params
    for (const k of Array.from(u.searchParams.keys())) {
      if (STRIP_QUERY_PARAMS.has(k.toLowerCase())) u.searchParams.delete(k);
    }

    // Normalize trailing slash (keep root as '/')
    if (u.pathname !== '/' && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }

    // Sort params for stable comparison
    const sp = new URLSearchParams(u.searchParams);
    const entries = Array.from(sp.entries()).sort(([a], [b]) => a.localeCompare(b));
    u.search = '';
    for (const [k, v] of entries) u.searchParams.append(k, v);

    return u.toString();
  } catch {
    return null;
  }
}

const STATIC_EXTENSIONS = new Set([
  '.css', '.js', '.json', '.xml', '.rss', '.atom',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.ogg', '.wav',
  '.woff', '.woff2', '.ttf', '.otf', '.eot'
]);

export function isCrawlableUrl(raw: string): boolean {
  try {
    const u = new URL(raw);

    // Never audit sitemap / feed endpoints as content pages.
    // These frequently have no title/desc/H1 and are not intended to rank.
    const p = u.pathname.toLowerCase();
    if (
      p.endsWith('/sitemap.xml') ||
      p.endsWith('/sitemap_index.xml') ||
      /\/[^/]*-sitemap\.xml$/.test(p) ||
      /\/sitemap\d+\.xml$/.test(p) ||
      p.endsWith('/feed') ||
      p.endsWith('/feed/') ||
      p.endsWith('/rss') ||
      p.endsWith('/rss/')
    ) {
      return false;
    }

    // Skip static assets (CSS, JS, images, fonts, etc.) - not SEO content pages
    const ext = p.substring(p.lastIndexOf('.')).toLowerCase();
    if (ext && ext.includes('.') && STATIC_EXTENSIONS.has(ext)) {
      return false;
    }

    // Skip API endpoints and non-HTML endpoints (WordPress, REST APIs, XML-RPC)
    if (
      p.startsWith('/wp-json/') ||
      p === '/wp-json' ||
      p === '/xmlrpc.php' ||
      p.startsWith('/xmlrpc.php/')
    ) {
      return false;
    }

    for (const k of Array.from(u.searchParams.keys())) {
      if (BLOCK_IF_QUERY_HAS.has(k.toLowerCase())) return false;
    }
    // WordPress previews
    if (u.searchParams.get('preview') === 'true') return false;
    return true;
  } catch {
    return false;
  }
}

export function sameCanonical(a: string, b: string): boolean {
  const na = normalizeUrl(a);
  const nb = normalizeUrl(b);
  return !!na && !!nb && na === nb;
}

export function sameHost(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.origin === ub.origin;
  } catch {
    return false;
  }
}
