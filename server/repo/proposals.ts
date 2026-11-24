import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { proposals } from '../persistence/schema.ts';
import { updateItem } from './items.ts';
import { appendEvent } from './events.ts';
import { createRelation } from './relations.ts';
import { addClusterMember, createCluster, listClusters } from './clusters.ts';
import { createTagValue } from './tags.ts';
import type {
  CreateProposalBody,
  ProposalDTO,
  ProposalStatus,
} from '../../src/lib/proposals.ts';

type ProposalRow = typeof proposals.$inferSelect;

function toDTO(row: ProposalRow): ProposalDTO {
  return {
    id: row.id,
    kind: row.kind as ProposalDTO['kind'],
    target_id: row.target_id,
    related_id: row.related_id ?? '',
    related_definition_id: row.related_definition_id ?? undefined,
    proposed_value: row.proposed_value,
    rationale: row.rationale,
    source: row.source as ProposalDTO['source'],
    status: row.status as ProposalStatus,
    created_at: row.created_at.toISOString(),
    resolved_at: row.resolved_at ? row.resolved_at.toISOString() : '',
  };
}

export async function listProposals(db: Database, status?: string): Promise<ProposalDTO[]> {
  const rows = status
    ? await db.select().from(proposals).where(eq(proposals.status, status)).orderBy(desc(proposals.created_at))
    : await db.select().from(proposals).orderBy(desc(proposals.created_at));
  return rows.map(toDTO);
}

export async function getProposal(db: Database, id: string): Promise<ProposalDTO | undefined> {
  const [row] = await db.select().from(proposals).where(eq(proposals.id, id)).limit(1);
  return row ? toDTO(row) : undefined;
}

export async function createProposal(db: Database, body: CreateProposalBody): Promise<ProposalDTO> {
  const id = `prp_${randomUUID()}`;
  const now = new Date();
  await db.insert(proposals).values({
    id,
    kind: body.kind,
    target_id: body.target_id,
    related_id: body.related_id ?? null,
    related_definition_id: body.related_definition_id ?? null,
    proposed_value: body.proposed_value,
    rationale: body.rationale ?? '',
    source: body.source ?? 'agent',
    status: 'pending',
    created_at: now,
    resolved_at: null,
  });
  return (await getProposal(db, id)) as ProposalDTO;
}

export async function resolveProposal(
  db: Database,
  id: string,
  status: 'accepted' | 'rejected',
): Promise<ProposalDTO | undefined> {
  const current = await getProposal(db, id);
  if (!current) return undefined;
  await db
    .update(proposals)
    .set({ status, resolved_at: new Date() })
    .where(eq(proposals.id, id));
  return getProposal(db, id);
}

/**
 * D-054: acceptance applies only well-defined kinds —
 * semantic_name → title update; association → related_to relation;
 * cluster → new Cluster with the target (and related) as members.
 * The rest are review-marked only.
 */
export async function resolveProposalApplying(
  db: Database,
  id: string,
  status: 'accepted' | 'rejected',
): Promise<ProposalDTO | undefined> {
  const existing = await getProposal(db, id);
  if (!existing) return undefined;
  // O1-4: resolve + apply commit or roll back together (no half-applied proposals).
  return db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const resolved = await resolveProposal(t, id, status);
    if (!resolved || status !== 'accepted') return resolved;
    if (existing.kind === 'semantic_name') {
      /* V3 (M3): machine-originated change — actor=agent, flagged with the proposal id. */
      await updateItem(t, existing.target_id, { title: existing.proposed_value }, { actor: 'agent', via: existing.id });
    } else if (existing.kind === 'association' && existing.related_id) {
      await createRelation(t, {
        kind: 'related_to',
        from_id: existing.target_id,
        to_id: existing.related_id,
        note: `proposal ${existing.id}`,
        created_by: 'agent',
      });
    } else if (existing.kind === 'meta_tag' && existing.target_id && existing.related_definition_id) {
      /* META_TAG_V1: related_definition_id = tag definition id, proposed_value = tag value.
         Accepting IS the user confirmation (D-066) → confirmed=1. Idempotent:
         the (definition, item, value, scope) uniqueness absorbs replays.
         Proposal-embedded params are DEFERRED (proposals carry no params channel);
         enrich via the assignment-params API after accept. */
      await createTagValue(t, {
        definition_id: existing.related_definition_id,
        item_id: existing.target_id,
        value: existing.proposed_value,
        scope: 'global',
        confirmed: true,
      }, 'usr_local');
      await appendEvent(t, {
        item_id: existing.target_id,
        actor: 'agent',
        action: 'updated',
        detail: `meta_tag | via proposal ${existing.id}`,
      });
    } else if (existing.kind === 'cluster') {
      /* G2 merge semantics: a same-title cluster already exists → join it as a
         member instead of creating a duplicate block. */
      const known = await listClusters(t);
      const same = known.find((c) => c.title === existing.proposed_value);
      const cluster = same ?? await createCluster(t, {
        title: existing.proposed_value,
        description: `From proposal ${existing.id}`,
      });
      await addClusterMember(t, cluster.id, existing.target_id);
      if (existing.related_id) await addClusterMember(t, cluster.id, existing.related_id);
      await appendEvent(t, {
        item_id: existing.target_id,
        actor: 'agent',
        action: 'updated',
        detail: `cluster | via proposal ${existing.id}`,
      });
    }
    return resolved;
  }) as Promise<ProposalDTO | undefined>;
}
