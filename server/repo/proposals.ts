import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { proposals } from '../persistence/schema.ts';
import { updateItem } from './items.ts';
import { createRelation } from './relations.ts';
import { addClusterMember, createCluster } from './clusters.ts';
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
  const resolved = await resolveProposal(db, id, status);
  if (!resolved || status !== 'accepted') return resolved;
  if (existing.kind === 'semantic_name') {
    await updateItem(db, existing.target_id, { title: existing.proposed_value });
  } else if (existing.kind === 'association' && existing.related_id) {
    await createRelation(db, {
      kind: 'related_to',
      from_id: existing.target_id,
      to_id: existing.related_id,
      note: `proposal ${existing.id}`,
    });
  } else if (existing.kind === 'cluster') {
    const cluster = await createCluster(db, {
      title: existing.proposed_value,
      description: `From proposal ${existing.id}`,
    });
    await addClusterMember(db, cluster.id, existing.target_id);
    if (existing.related_id) await addClusterMember(db, cluster.id, existing.related_id);
  }
  return resolved;
}
