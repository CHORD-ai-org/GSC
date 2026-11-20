/**
 * Deterministic content extraction (Web Intelligence §3). No LLM here.
 * Produces a structured Extraction + content hash for dedupe and change
 * detection. Unknown/JS-only pages return status 'unsupported', never a
 * silent partial success.
 */
import { createHash } from 'node:crypto';
import { htmlToText, htmlTitle } from '../ingest/html.ts';

export const EXTRACTOR_VERSION = '1';

export type ExtractionStatus = 'ok' | 'unsupported' | 'failed';

export type Extraction = {
  externalId: string;
  url: string;
  canonicalUrl: string;
  title: string;
  contentText: string;
  author: string;
  publishedAt: string;
  siteName: string;
  description: string;
  contentHash: string;
  extractorVersion: string;
  status: ExtractionStatus;
  error: string;
  retrievedAt: string;
};

export function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid$)/i.test(key)) u.searchParams.delete(key);
    }
    return u.toString();
  } catch {
    return raw.trim();
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function meta(html: string, ...names: string[]): string {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`,
      'i',
    );
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]).trim();
  }
  return '';
}

export type Extracted = Omit<Extraction, 'retrievedAt'>;

export function extractHtml(html: string, url: string): Extracted {
  const norm = normalizeUrl(url);
  const title = meta(html, 'og:title', 'twitter:title') || htmlTitle(html);
  const canonicalRaw = (html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? '').trim();
  const author = meta(html, 'author', 'article:author', 'og:article:author');
  const publishedAt = meta(html, 'article:published_time', 'og:article:published_time', 'date', 'pubdate');
  const siteName = meta(html, 'og:site_name', 'application-name');
  const description = meta(html, 'description', 'og:description', 'twitter:description');
  const contentText = htmlToText(html);
  return {
    externalId: norm,
    url: norm,
    canonicalUrl: canonicalRaw ? normalizeUrl(canonicalRaw) : norm,
    title,
    contentText,
    author,
    publishedAt,
    siteName,
    description,
    contentHash: contentHash(contentText),
    extractorVersion: EXTRACTOR_VERSION,
    status: contentText ? 'ok' : 'unsupported',
    error: contentText ? '' : 'no extractable text (JS-rendered or empty)',
  };
}
