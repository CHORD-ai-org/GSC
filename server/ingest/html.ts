/**
 * URL ingestion helpers (D-048): fetch-and-preview only. Extraction is a
 * naive HTML → plain-text pass; no OCR, no PDF, no persistence here.
 */

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 10_000;

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function htmlTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? htmlToText(match[1]).split('\n')[0].trim() : '';
}

export type UrlIngestResult = {
  url: string;
  title: string;
  text: string;
};

export async function fetchUrlText(rawUrl: string): Promise<UrlIngestResult> {
  const url = new URL(rawUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are supported');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`Fetch failed with HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const body = buf.subarray(0, MAX_BYTES).toString('utf8');
    const isHtml = /<html|<!doctype html|<body/i.test(body) || (res.headers.get('content-type') ?? '').includes('html');
    return {
      url: res.url || url.toString(),
      title: isHtml ? htmlTitle(body) : '',
      text: isHtml ? htmlToText(body) : body.trim(),
    };
  } finally {
    clearTimeout(timer);
  }
}
