/**
 * Information Processing pipeline (Web Intelligence §4): extracted content →
 * Light Up. Machine output becomes PROPOSALS (source=agent), never silently
 * confirmed. Raw content is preserved with provenance (origin=machine,
 * source_label=sync:<kind>:<id>). Reuses proposer + detector + proposals —
 * no parallel confirmation architecture.
 */
import type { Database } from '../persistence/client.ts';
import type { Config } from '../config.ts';
import { segmentText } from '../../src/lib/lightup.ts';
import { suggestForChunks } from '../agent/proposer.ts';
import { runDetection } from '../agent/detector.ts';
import { createProposal } from '../repo/proposals.ts';
import { createItem } from '../repo/items.ts';
import { upsertSnapshot } from '../repo/snapshots.ts';
import { claimNextTask, reclaimStale, updateTask } from '../repo/tasks.ts';
import { getAdapter } from './adapters/index.ts';
import type { FetchedDoc } from './adapters/types.ts';

const MAX_SEGMENTS = 20;

export type ProcessResult = { itemId: string; proposals: number };

/** Turn one extracted document into a raw item + semantic/classification proposals. */
export async function processSnapshot(
  db: Database,
  config: Config,
  doc: FetchedDoc,
  opts: { kind: string; ownerId?: string },
): Promise<ProcessResult> {
  const sourceLabel = `sync:${opts.kind}:${doc.externalId}`;
  const item = await createItem(
    db,
    {
      type: 'raw.document',
      title: doc.title || doc.url,
      domain: 'knowledge',
      origin: 'import',
      source_label: sourceLabel,
      fields: { content_text: doc.contentText, author: doc.author ?? '', locator: doc.url },
    },
    undefined,
    opts.ownerId,
  );

  let proposals = 0;
  const segments = segmentText(doc.contentText).slice(0, MAX_SEGMENTS);
  if (segments.length) {
    // Proposals are best-effort: raw import already succeeded above, so an LLM
    // failure (not configured / unreachable) must not fail the whole capture.
    try {
      const suggestions = await suggestForChunks(
        config,
        segments.map((s) => ({ title: s.title, content: s.content })),
      );
      for (const s of suggestions) {
        if (s.semantic_name) {
          await createProposal(db, {
            kind: 'semantic_name',
            target_id: item.id,
            proposed_value: s.semantic_name,
            rationale: s.rationale,
            source: 'agent',
          });
          proposals += 1;
        }
        if (s.classification) {
          await createProposal(db, {
            kind: 'classification',
            target_id: item.id,
            proposed_value: s.classification,
            rationale: s.rationale,
            source: 'agent',
          });
          proposals += 1;
        }
      }
    } catch (e) {
      console.error('[intel] proposal generation skipped:', e instanceof Error ? e.message : e);
    }
  }

  try {
    await runDetection(db);
  } catch (e) {
    console.error('[intel] detection skipped:', e instanceof Error ? e.message : e);
  }
  return { itemId: item.id, proposals };
}

export type CaptureOutcome = { fetched: number; imported: number; proposals: number };

/**
 * Worker step for one capture task: adapter fetch → extraction → snapshot →
 * Light Up. Idempotent — re-capturing unchanged content is a no-op at the
 * snapshot layer, so no duplicate items or proposals.
 */
export async function processCaptureTask(
  db: Database,
  config: Config,
  task: { id: string; kind: string; url: string; source_id: string | null },
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>,
  ownerId?: string,
): Promise<CaptureOutcome> {
  const adapter = getAdapter(task.kind);
  const cfg = { label: task.url, scope: task.url };
  const docs = await adapter.fetch(cfg, undefined, fetchImpl);
  let imported = 0;
  let proposals = 0;
  for (const doc of docs) {
    const { created } = await upsertSnapshot(db, task.source_id, doc);
    if (!created) continue; // unchanged content already captured
    const result = await processSnapshot(db, config, doc, { kind: task.kind, ownerId });
    imported += 1;
    proposals += result.proposals;
  }
  return { fetched: docs.length, imported, proposals };
}

export type SourceLike = { id: string; kind: string; label: string; scope: string };

/**
 * Sync entry point for a configured source: adapter fetch → idempotent snapshot
 * → Light Up. Used by `POST /api/sources/:id/sync` for every adapter-backed kind
 * (web / rss / file / notion / drive / x). Deterministic + idempotent — unchanged
 * content is skipped, changed content is captured as a new snapshot version.
 * One bad document never aborts the rest of the sync.
 */
export async function runSourceSync(
  db: Database,
  config: Config,
  source: SourceLike,
  token: string,
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>,
): Promise<{ imported: number; skipped: number }> {
  const adapter = getAdapter(source.kind);
  const cfg = { label: source.label, scope: source.scope, token };
  const docs = await adapter.fetch(cfg, undefined, fetchImpl);
  let imported = 0;
  let skipped = 0;
  for (const doc of docs) {
    try {
      const { created } = await upsertSnapshot(db, source.id, doc);
      if (!created) {
        skipped += 1;
        continue;
      }
      await processSnapshot(db, config, doc, { kind: source.kind });
      imported += 1;
    } catch (e) {
      console.error('[intel] sync doc failed:', doc.externalId, e instanceof Error ? e.message : e);
      skipped += 1;
    }
  }
  return { imported, skipped };
}

/**
 * Capture worker (Web Intelligence §6.3): background drain + interruption recovery.
 * Reclaims stale in-flight tasks (worker crash → re-queued), then claims and
 * processes pending tasks through the idempotent capture pipeline. Each task is
 * marked completed/failed so retries never leave work half-done. Run periodically.
 */
export async function runCaptureWorker(
  db: Database,
  config: Config,
  opts: { staleMs?: number; max?: number } = {},
): Promise<{ reclaimed: number; processed: number; failed: number }> {
  const reclaimed = await reclaimStale(db, opts.staleMs ?? 60_000);
  const max = opts.max ?? 5;
  let processed = 0;
  let failed = 0;
  for (let i = 0; i < max; i += 1) {
    const task = await claimNextTask(db);
    if (!task) break;
    try {
      await processCaptureTask(db, config, task);
      await updateTask(db, task.id, { status: 'completed', stage: 'done', completed: true });
      processed += 1;
    } catch (e) {
      await updateTask(db, task.id, {
        status: 'failed',
        stage: 'error',
        error: e instanceof Error ? e.message : 'capture failed',
      });
      failed += 1;
    }
  }
  return { reclaimed, processed, failed };
}
