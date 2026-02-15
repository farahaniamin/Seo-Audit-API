import { fetchText } from './fetcher.js';
import type { Limits } from '../types.js';

export type SitemapStats = {
  found: boolean;
  sitemap_urls: string[];
  estimated_total_urls: number | null;
  estimated_is_truncated: boolean;
};

function extractLocs(xml: string): string[] {
  // quick & tolerant: <loc>...</loc>
  const out: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1].trim());
  return out;
}

export async function discoverSitemaps(origin: string, robotsText: string, limits: Limits): Promise<SitemapStats> {
  const urls = new Set<string>();

  // robots references
  const lines = robotsText.split(/\r?\n/);
  for (const l of lines) {
    const m = l.match(/^\s*sitemap\s*:\s*(\S+)/i);
    if (m) urls.add(m[1].trim());
  }

  // common locations
  urls.add(origin.replace(/\/$/,'') + '/sitemap.xml');
  urls.add(origin.replace(/\/$/,'') + '/sitemap_index.xml');

  const sitemap_urls = [...urls];

  // estimate total urls by counting <loc> in up to N sitemaps (safe bytes)
  let estimated_total = 0;
  let truncated = false;
  let anyFound = false;

  const maxFiles = Math.min(limits.sitemap_files_max, sitemap_urls.length);
  for (let i=0;i<maxFiles;i++) {
    try {
      const r = await fetchText(sitemap_urls[i], limits.per_page_timeout_ms, limits.sitemap_max_bytes);
      if (r.status<200 || r.status>=400) continue;
      anyFound = true;

      const locs = extractLocs(r.text);
      // cap per-file to avoid huge memory; still keep the count as "at least"
      if (locs.length > limits.sitemap_max_urls_per_file) {
        truncated = true;
        estimated_total += limits.sitemap_max_urls_per_file;
      } else {
        estimated_total += locs.length;
      }
    } catch {
      continue;
    }
  }

  return {
    found: anyFound,
    sitemap_urls: sitemap_urls,
    estimated_total_urls: anyFound ? estimated_total : null,
    estimated_is_truncated: anyFound ? truncated : false
  };
}

// Sample URLs from sitemaps (diverse indices).
export async function sampleSitemapUrls(sitemapUrls: string[], sampleSize: number, limits: Limits): Promise<string[]> {
  const out: string[] = [];
  const dedup = new Set<string>();
  const maxFiles = Math.min(limits.sitemap_files_max, sitemapUrls.length);

  for (let i=0;i<maxFiles;i++) {
    try {
      const r = await fetchText(sitemapUrls[i], limits.per_page_timeout_ms, limits.sitemap_max_bytes);
      if (r.status<200 || r.status>=400) continue;
      let locs = extractLocs(r.text);
      if (locs.length > limits.sitemap_max_urls_per_file) {
        const step = Math.ceil(locs.length / limits.sitemap_max_urls_per_file);
        locs = locs.filter((_,idx)=> idx%step===0).slice(0, limits.sitemap_max_urls_per_file);
      }
      const pickCount = Math.min(sampleSize, locs.length);
      if (pickCount<=0) continue;

      const indices = pickCount===1 ? [0] : Array.from({length: pickCount},(_,k)=>Math.floor((k*(locs.length-1))/(pickCount-1)));
      for (const idx of indices) {
        const u = locs[idx];
        if (!u) continue;
        if (dedup.has(u)) continue;
        dedup.add(u);
        out.push(u);
      }
    } catch { continue; }
  }
  return out;
}

// Return up to `limit` URLs from sitemaps (best-effort, capped).
export async function listSitemapUrls(sitemapUrls: string[], limit: number, limits: Limits): Promise<string[]> {
  const out: string[] = [];
  const dedup = new Set<string>();
  const maxFiles = Math.min(limits.sitemap_files_max, sitemapUrls.length);

  for (let i = 0; i < maxFiles; i++) {
    if (out.length >= limit) break;
    try {
      const r = await fetchText(sitemapUrls[i], limits.per_page_timeout_ms, limits.sitemap_max_bytes);
      if (r.status < 200 || r.status >= 400) continue;
      let locs = extractLocs(r.text);
      if (locs.length > limits.sitemap_max_urls_per_file) {
        // keep a diverse slice, but still return more than sample mode
        const step = Math.ceil(locs.length / limits.sitemap_max_urls_per_file);
        locs = locs.filter((_, idx) => idx % step === 0).slice(0, limits.sitemap_max_urls_per_file);
      }

      for (const u of locs) {
        if (out.length >= limit) break;
        if (!u) continue;
        if (dedup.has(u)) continue;
        dedup.add(u);
        out.push(u);
      }
    } catch {
      continue;
    }
  }

  return out;
}
