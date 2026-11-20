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
  }

  await runDetection(db);
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
