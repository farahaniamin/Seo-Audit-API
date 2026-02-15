import { env } from '../env.js';

function ua() {
  const forced = env('USER_AGENT', '');
  if (forced) return forced;
  // Mild UA rotation helps avoid overly-botty fingerprints while staying honest.
  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  ];
  return uas[Math.floor(Math.random() * uas.length)];
}

export async function fetchHtml(url: string, timeoutMs: number, maxBytes: number) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ac.signal, headers: { 'user-agent': ua(), 'accept': 'text/html,*/*' } });
    const ttfb = Date.now() - started;

    const reader = res.body?.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received += value.byteLength;
          if (received > maxBytes) break;
          chunks.push(value);
        }
      }
    }
    const text = chunks.length ? new TextDecoder('utf-8').decode(concat(chunks)) : '';
    const downloadMs = Date.now() - started - ttfb;
    const headers: Record<string,string> = {};
    res.headers.forEach((v,k)=>headers[k.toLowerCase()]=v);

    return {
      status: res.status,
      finalUrl: res.url,
      contentType: res.headers.get('content-type') ?? '',
      headers,
      body: text,
      ttfbMs: ttfb,
      downloadMs
    };
  } finally {
    clearTimeout(t);
  }
}

export async function fetchText(url: string, timeoutMs: number, maxBytes: number) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ac.signal, headers: { 'user-agent': ua() } });
    const reader = res.body?.getReader();
    if (!reader) return { status: res.status, text: '', finalUrl: res.url };
    const decoder = new TextDecoder('utf-8');
    let received = 0;
    let text = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.byteLength;
        if (received > maxBytes) throw new Error('TEXT_TOO_LARGE');
        text += decoder.decode(value, { stream: true });
      }
    }
    text += decoder.decode();
    return { status: res.status, text, finalUrl: res.url };
  } finally {
    clearTimeout(t);
  }
}

function concat(chunks: Uint8Array[]) {
  const total = chunks.reduce((s,c)=>s+c.byteLength,0);
  const out = new Uint8Array(total);
  let o=0;
  for (const c of chunks) { out.set(c,o); o+=c.byteLength; }
  return out;
}
