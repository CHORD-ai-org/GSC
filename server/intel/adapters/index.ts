/**
 * Source adapters (Web Intelligence §2): one per SourceKind, registered here.
 * Deterministic acquisition only — adapters fetch and normalize, they never
 * call the LLM. Tests inject a fetch-like so no external network is required.
 */
import { assertSafeIngestUrl, MAX_REDIRECTS } from '../../ingest/ssrf.ts';
import { htmlToText } from '../../ingest/html.ts';
import { contentHash, extractHtml, normalizeUrl } from '../extract.ts';
import { fetchGithubIssues } from '../../sync/github.ts';
import type { FetchedDoc, FetchLike, ProbeResult, SourceAdapter, SourceConfig } from './types.ts';

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 10_000;

export async function fetchHtmlSafe(rawUrl: string, fetchImpl: FetchLike): Promise<{ url: string; html: string }> {
  let url = (await assertSafeIngestUrl(rawUrl, false)).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let res: Response | undefined;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      res = await fetchImpl(url, { signal: controller.signal, redirect: 'manual' });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) throw new Error(`Redirect without location (HTTP ${res.status})`);
        res.body?.cancel().catch(() => {});
        url = (await assertSafeIngestUrl(new URL(location, url).toString(), false)).toString();
        continue;
      }
      break;
    }
    if (!res) throw new Error('Fetch produced no response');
    if (!res.ok) throw new Error(`Fetch failed with HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { url: url.toString(), html: buf.subarray(0, MAX_BYTES).toString('utf8') };
  } finally {
    clearTimeout(timer);
  }
}

function xmlTag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m?.[1] ?? '';
}

function parseFeed(xml: string, baseUrl: string): FetchedDoc[] {
  const blocks = xml.match(/<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  const docs: FetchedDoc[] = [];
  for (const block of blocks) {
    const title = htmlToText(xmlTag(block, 'title'));
    const linkRaw = xmlTag(block, 'link') || (block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ?? '');
    const desc = xmlTag(block, 'description') || xmlTag(block, 'summary') || xmlTag(block, 'content');
    const publishedAt = (xmlTag(block, 'pubDate') || xmlTag(block, 'published') || xmlTag(block, 'updated')).trim();
    const author = htmlToText(xmlTag(block, 'author') || xmlTag(block, 'dc:creator'));
    const contentText = htmlToText(desc);
    const url = linkRaw ? normalizeUrl(new URL(linkRaw, baseUrl).toString()) : normalizeUrl(baseUrl);
    docs.push({ externalId: url, url, title, contentText, author, publishedAt, rawHash: contentHash(contentText) });
  }
  return docs;
}

const web: SourceAdapter = {
  kind: 'web',
  async probe(cfg: SourceConfig): Promise<ProbeResult> {
    try {
      await assertSafeIngestUrl(cfg.label, false);
      return { ok: true, message: 'URL is valid and allowed' };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : String(e) };
    }
  },
  async fetch(cfg: SourceConfig, _opts, fetchImpl: FetchLike = fetch): Promise<FetchedDoc[]> {
    const { url, html } = await fetchHtmlSafe(cfg.label, fetchImpl);
    const ex = extractHtml(html, url);
    return [{
      externalId: ex.externalId, url: ex.url, title: ex.title, contentText: ex.contentText,
      author: ex.author, publishedAt: ex.publishedAt, siteName: ex.siteName,
      description: ex.description, metadata: { canonical: ex.canonicalUrl }, rawHash: ex.contentHash,
    }];
  },
};

const rss: SourceAdapter = {
  kind: 'rss',
  async probe(cfg: SourceConfig): Promise<ProbeResult> {
    try {
      await assertSafeIngestUrl(cfg.label, false);
      return { ok: true, message: 'Feed URL is valid' };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : String(e) };
    }
  },
  async fetch(cfg: SourceConfig, _opts, fetchImpl: FetchLike = fetch): Promise<FetchedDoc[]> {
    const { url, html } = await fetchHtmlSafe(cfg.label, fetchImpl);
    return parseFeed(html, url);
  },
};

const file: SourceAdapter = {
  kind: 'file',
  async probe(cfg: SourceConfig): Promise<ProbeResult> {
    return cfg.scope.trim()
      ? { ok: true, message: 'File content present' }
      : { ok: false, message: 'No file content provided' };
  },
  async fetch(cfg: SourceConfig): Promise<FetchedDoc[]> {
    const contentText = cfg.scope.trim();
    const id = `file:${contentHash(contentText).slice(0, 16)}`;
    return [{
      externalId: id, url: id, title: cfg.label || 'Imported file', contentText,
      rawHash: contentHash(contentText), metadata: { format: 'text' },
    }];
  },
};

const github: SourceAdapter = {
  kind: 'github',
  async probe(cfg: SourceConfig): Promise<ProbeResult> {
    return /.+\/.+/.test(cfg.label)
      ? { ok: true, message: 'owner/repo looks valid' }
      : { ok: false, message: 'label must be owner/repo' };
  },
  async fetch(cfg: SourceConfig, _opts, fetchImpl: FetchLike = fetch): Promise<FetchedDoc[]> {
    const issues = await fetchGithubIssues(cfg.token ?? '', cfg.label, fetchImpl);
    return issues.map((issue) => {
      const contentText = issue.body ?? '';
      return {
        externalId: `github:${cfg.label}#${issue.number}`,
        url: issue.html_url,
        title: issue.title,
        contentText,
        author: issue.user?.login ?? '',
        publishedAt: issue.updated_at,
        siteName: 'GitHub',
        metadata: { state: issue.state, number: String(issue.number) },
        rawHash: contentHash(contentText),
      };
    });
  },
};

/** API-backed sources: real HTTP contracts; require a token (storage/secrets). */
function apiAdapter(kind: 'notion' | 'drive' | 'x', endpoint: (cfg: SourceConfig) => string): SourceAdapter {
  return {
    kind,
    async probe(cfg: SourceConfig): Promise<ProbeResult> {
      if (!cfg.token) return { ok: false, message: `${kind} requires an access token` };
      try {
        await assertSafeIngestUrl(endpoint(cfg), false);
        return { ok: true, message: `${kind} endpoint configured` };
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : String(e) };
      }
    },
    async fetch(cfg: SourceConfig, _opts, fetchImpl: FetchLike = fetch): Promise<FetchedDoc[]> {
      if (!cfg.token) throw new Error(`${kind} requires an access token`);
      const res = await fetchImpl(endpoint(cfg), {
        headers: { authorization: `Bearer ${cfg.token}`, accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`${kind} API HTTP ${res.status}`);
      const payload = (await res.json()) as { results?: unknown[]; objects?: unknown[]; data?: unknown[] };
      const rows = payload.results ?? payload.objects ?? payload.data ?? [];
      return rows.map((row, i) => {
        const r = row as Record<string, unknown>;
        const text = String(r.text ?? r.content ?? r.snippet ?? '');
        const title = String(r.title ?? r.name ?? `${kind} item ${i + 1}`);
        return {
          externalId: `${kind}:${String(r.id ?? i)}`,
          url: String(r.url ?? endpoint(cfg)),
          title,
          contentText: text,
          rawHash: contentHash(text),
          metadata: { kind },
        };
      });
    },
  };
}

export const ADAPTERS: Record<string, SourceAdapter> = {
  web,
  rss,
  file,
  github,
  notion: apiAdapter('notion', (c) => c.scope || 'https://api.notion.com/v1/search'),
  drive: apiAdapter('drive', (c) => c.scope || 'https://www.googleapis.com/drive/v3/files'),
  x: apiAdapter('x', (c) => c.scope || 'https://api.twitter.com/2/tweets/search/recent'),
};

export function getAdapter(kind: string): SourceAdapter {
  const adapter = ADAPTERS[kind];
  if (!adapter) throw new Error(`Unsupported source kind: ${kind}`);
  return adapter;
}
