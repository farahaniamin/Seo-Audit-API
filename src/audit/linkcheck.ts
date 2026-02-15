import PQueue from 'p-queue';
import type { Limits } from '../types.js';
function sleep(ms: number) { return new Promise(r=>setTimeout(r, ms)); }

export async function verifyLinks(origin: string, pages: { url: string; links_internal: string[] }[], limits: Limits) {
  const links = new Set<string>();
  for (const p of pages) for (const l of p.links_internal) links.add(l);

  const arr = [...links].slice(0, limits.link_check_max);
  const queue = new PQueue({ concurrency: Math.max(1, limits.global_concurrency) });

  let checked = 0;

  async function head(u: string) {
    const delay = limits.link_check_delay_ms + Math.floor(Math.random()*limits.link_check_jitter_ms);
    if (delay>0) await sleep(delay);

    const ac = new AbortController();
    const t = setTimeout(()=>ac.abort(), limits.link_check_timeout_ms);
    try {
      // use HEAD then fallback GET if needed
      let res = await fetch(u, { method: 'HEAD', redirect: 'follow', signal: ac.signal });
      if (res.status === 405 || res.status === 403) {
        res = await fetch(u, { method: 'GET', redirect: 'follow', signal: ac.signal });
      }
      return res.status;
    } catch { return 0; }
    finally { clearTimeout(t); }
  }

  const statuses: number[] = [];
  for (const u of arr) {
    await queue.add(async ()=>{
      const s = await head(u);
      statuses.push(s);
      checked++;
    });
  }
  await queue.onIdle();

  return { checked, statuses };
}

// Extract internal (same-origin) links from an HTML document.
// Lightweight regex-based approach to avoid heavy HTML parsers.
export function extractInternalLinks(html: string, baseUrl: string, maxLinksPerPage = 250): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return out;
  }

  const hrefRe = /<(?:a|link)\b[^>]*?\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi;
  const srcRe = /<(?:img|script)\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi;

  const push = (raw: string) => {
    if (!raw) return;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:') || trimmed.startsWith('javascript:')) return;
    let u: URL;
    try {
      u = new URL(trimmed, base);
    } catch {
      return;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
    if (u.origin !== base.origin) return;
    u.hash = '';
    const s = u.toString();
    if (seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };

  const scan = (re: RegExp) => {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      push(m[1] || m[2] || m[3] || '');
      if (out.length >= maxLinksPerPage) break;
    }
  };

  scan(hrefRe);
  if (out.length < maxLinksPerPage) scan(srcRe);

  return out;
}
