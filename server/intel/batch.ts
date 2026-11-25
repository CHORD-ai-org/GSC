import type { Database } from '../persistence/client.ts';
import type { Config } from '../config.ts';
import type { IngestBatchBody } from '../../src/lib/ingest.ts';
import type { FetchedDoc } from './adapters/types.ts';
import { upsertSnapshot } from '../repo/snapshots.ts';
import { contentHash } from './extract.ts';
import { processSnapshot } from './pipeline.ts';
import { listSources, createSource } from '../repo/sources.ts';
import { createProposal } from '../repo/proposals.ts';
import { listClusters } from '../repo/clusters.ts';
import { proposeBlockAssignment } from '../agent/organizer.ts';

export type IngestBatchResult = {
  source_id: string;
  imported: number;
  skipped: number;
  block_proposals: number;
};

/**
 * G2 batch intake core (shared by POST /api/ingest/batch and the integrations
 * test probe): group (client×project) → source anchor, docs through the Light Up
 * pipeline (snapshot-idempotent), then a best-effort block-assignment pass that
 * only ever creates `cluster` proposals (D-042).
 */
export async function ingestBatch(
  db: Database,
  config: Config,
  batch: IngestBatchBody,
  ownerId: string,
): Promise<IngestBatchResult> {
  const label = `agent:${batch.group.client}:${batch.group.project}`;
  const existing = await listSources(db, ownerId);
  let source = existing.find((s) => s.kind === 'agent' && s.label === label);
  if (!source) {
    source = await createSource(db, {
      kind: 'agent',
      label,
      scope: `client=${batch.group.client};project=${batch.group.project}`,
    }, ownerId);
  }
  let imported = 0;
  let skipped = 0;
  const newItems: { id: string; title: string; content: string }[] = [];
  for (const [i, doc] of batch.docs.entries()) {
    const rawHash = contentHash(doc.content_text);
    const fetched: FetchedDoc = {
      externalId: `agent:${batch.group.client}:${batch.group.project}:${batch.group.session_id}:${i}`,
      url: doc.url ?? `agent://${batch.group.client}/${batch.group.project}/${batch.group.session_id}`,
      title: doc.title || `session ${batch.group.session_id}`,
      contentText: doc.content_text,
      author: doc.author ?? batch.group.client,
      publishedAt: doc.captured_at,
      rawHash,
      metadata: {
        client: batch.group.client,
        project: batch.group.project,
        session_id: batch.group.session_id,
        captured_at: doc.captured_at ?? new Date().toISOString(),
      },
    };
    const snap = await upsertSnapshot(db, source.id, fetched);
    if (!snap.created) {
      skipped += 1;
      continue;
    }
    const result = await processSnapshot(db, config, fetched, { kind: 'agent', ownerId });
    newItems.push({ id: result.itemId, title: fetched.title, content: doc.content_text });
    imported += 1;
  }

  let blockProposals = 0;
  if (newItems.length > 0) {
    try {
      const known = (await listClusters(db)).map((c) => c.title);
      const assignments = await proposeBlockAssignment(config, newItems, known);
      for (const a of assignments) {
        await createProposal(db, {
          kind: 'cluster',
          target_id: a.item_id,
          proposed_value: a.cluster_name,
          rationale: a.rationale || `block assignment (${batch.group.client})`,
          source: 'agent',
        });
        blockProposals += 1;
      }
    } catch (e) {
      console.error('[ingest] block assignment skipped:', e instanceof Error ? e.message : e);
    }
  }
  return { source_id: source.id, imported, skipped, block_proposals: blockProposals };
}
