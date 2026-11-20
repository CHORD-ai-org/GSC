/**
 * URL ingestion helpers (D-048): fetch-and-preview only. Extraction is a
 * naive HTML → plain-text pass; no OCR, no PDF, no persistence here.
 * SSRF guard (O1-3): every URL — including redirect hops — is validated
 * against private/reserved address space before fetching.
 */

import { assertSafeIngestUrl, MAX_REDIRECTS, SsrfError } from './ssrf.ts';

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

export async function fetchUrlText(rawUrl: string, opts: { allowPrivate?: boolean } = {}): Promise<UrlIngestResult> {
  const allowPrivate = opts.allowPrivate ?? false;
  let url = await assertSafeIngestUrl(rawUrl, allowPrivate);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Manual redirect loop: each hop re-runs the SSRF checks (O1-3).
    let res: Response | undefined;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      res = await fetch(url, { signal: controller.signal, redirect: 'manual' });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) throw new Error(`Redirect without location (HTTP ${res.status})`);
        res.body?.cancel().catch(() => {});
        url = await assertSafeIngestUrl(new URL(location, url).toString(), allowPrivate);
        continue;
      }
      break;
    }
    if (!res) throw new Error('Fetch produced no response');
    if (!res.ok) throw new Error(`Fetch failed with HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const body = buf.subarray(0, MAX_BYTES).toString('utf8');
    const isHtml = /<html|<!doctype html|<body/i.test(body) || (res.headers.get('content-type') ?? '').includes('html');
    return {
      url: url.toString(),
      title: isHtml ? htmlTitle(body) : '',
      text: isHtml ? htmlToText(body) : body.trim(),
    };
  } finally {
    clearTimeout(timer);
  }
}

export { SsrfError };
