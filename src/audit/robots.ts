import { fetchText } from './fetcher.js';
import type { Limits } from '../types.js';

export async function fetchRobots(origin: string, limits: Limits) {
  const url = origin.replace(/\/$/,'') + '/robots.txt';
  try {
    const r = await fetchText(url, limits.per_page_timeout_ms, limits.max_html_bytes);
    return { ok: r.status>=200 && r.status<400, status: r.status, text: r.text };
  } catch (e:any) {
    return { ok: false, status: 0, text: '' };
  }
}
