export function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  return strip(m[1]).slice(0, 300);
}
export function extractMetaDescription(html: string): string | null {
  const m = html.match(/<meta[^>]+name=["']description["'][^>]*>/i);
  if (!m) return null;
  const c = m[0].match(/content=["']([^"']+)["']/i);
  return c ? strip(c[1]).slice(0, 400) : null;
}
export function extractCanonical(html: string): string | null {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  if (!m) return null;
  const h = m[0].match(/href=["']([^"']+)["']/i);
  return h ? strip(h[1]) : null;
}

export function extractMetaRobots(html: string): string | null {
  const m = html.match(/<meta[^>]+name=["']robots["'][^>]*>/i);
  if (!m) return null;
  const c = m[0].match(/content=["']([^"']+)["']/i);
  return c ? strip(c[1]).trim().toLowerCase() : null;
}
export function extractH1Count(html: string): number {
  return (html.match(/<h1\b/gi) ?? []).length;
}
export function countImagesMissingAlt(html: string): number {
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  let missing=0;
  for (const tag of imgs) {
    const alt = tag.match(/\balt=["']([^"']*)["']/i);
    if (!alt) { missing++; continue; }
    const val = alt[1].trim();
    if (val === '') missing++; // treat empty as missing (strict)
  }
  return missing;
}

function strip(s: string) {
  return s.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
}

export function hasViewportMeta(html: string): boolean {
  // Check for viewport meta tag
  const viewportMatch = html.match(/<meta[^>]+name=["']viewport["'][^>]*>/i);
  return !!viewportMatch;
}

export function countWords(html: string): number {
  // Extract text content
  const text = strip(html);
  // Count words (split by whitespace and filter empty strings)
  const words = text.split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

export function extractJsonLd(html: string): string[] {
  // Extract all JSON-LD structured data
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const scripts: string[] = [];
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    scripts.push(match[1].trim());
  }
  return scripts;
}
