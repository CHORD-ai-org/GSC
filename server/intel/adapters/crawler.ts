import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Database } from '../../persistence/client.ts';
import type { Config } from '../../config.ts';
import type { FetchedDoc } from './types.ts';
import { extractHtml } from '../extract.ts';
import { fetchHtmlSafe } from './index.ts';
import { upsertSnapshot } from '../../repo/snapshots.ts';
import { processSnapshot } from '../pipeline.ts';

const REQUEST_GAP_MS = 2_000; // polite crawl — also what the cloud worker does

/**
 * LOCAL_SIM web schedule: crawl a URL list politely, archive the raw HTML to the
 * crawl volume (provenance, replayable), then feed the extraction through the
 * same Light Up pipeline as capture. Login walls / 4xx are recorded, never
 * forced. Same code path the cloud worker runs.
 */
export async function runWebSchedule(
  db: Database,
  config: Config,
  sched: { id: string; name: string; url_list: string; owner_id: string },
): Promise<{ fetched: number; imported: number; errors: string[] }> {
  const urls = sched.url_list.split('\n').map((s) => s.trim()).filter(Boolean);
  const slug = sched.name.replace(/[^\p{L}\p{N}-]+/gu, '_').slice(0, 40) || 'web';
  const day = new Date().toISOString().slice(0, 10);
  let fetched = 0;
  let imported = 0;
  const errors: string[] = [];
  for (const url of urls) {
    await new Promise((r) => setTimeout(r, REQUEST_GAP_MS));
    try {
      const { url: finalUrl, html } = await fetchHtmlSafe(url, fetch);
      const ex = extractHtml(html, finalUrl);
      const dir = path.join(config.crawlDir, slug, day);
      await mkdir(dir, { recursive: true });
      const base = ex.contentHash.slice(0, 16);
      await writeFile(path.join(dir, `${base}.html`), html, 'utf-8');
      await writeFile(path.join(dir, `${base}.meta.json`), JSON.stringify({
        url: finalUrl, title: ex.title, retrievedAt: new Date().toISOString(), schedule: sched.id,
      }, null, 2), 'utf-8');
      const doc: FetchedDoc = {
        externalId: ex.externalId,
        url: ex.url,
        title: ex.title,
        contentText: ex.contentText,
        author: ex.author,
        publishedAt: ex.publishedAt,
        siteName: ex.siteName,
        description: ex.description,
        metadata: { canonical: ex.canonicalUrl, archive: `${slug}/${day}/${base}.html` },
        rawHash: ex.contentHash,
      };
      fetched += 1;
      const snap = await upsertSnapshot(db, null, doc);
      if (snap.created) {
        await processSnapshot(db, config, doc, { kind: 'web', ownerId: sched.owner_id });
        imported += 1;
      }
    } catch (e) {
      errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { fetched, imported, errors };
}
