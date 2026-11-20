import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { proposals } from '../persistence/schema.ts';
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
