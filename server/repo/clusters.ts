import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, or } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { clusterMembers, clusters, clusterShares, items } from '../persistence/schema.ts';
import type {
  ClusterDTO,
  ClusterDetailDTO,
  CreateClusterBody,
  UpdateClusterBody,
} from '../../src/lib/clusters.ts';
import { itemExists } from './items.ts';

type ClusterRow = typeof clusters.$inferSelect;

function toDTO(row: ClusterRow): ClusterDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function sharedClusterIds(db: Database, userId: string): Promise<string[]> {
  const rows = await db.select({ cluster_id: clusterShares.cluster_id })
    .from(clusterShares)
    .where(eq(clusterShares.user_id, userId));
  return rows.map((r) => r.cluster_id);
}

/* U1: list carries member_ids via one batched query (kills the client-side
   getCluster-per-row fan-out the index used to do). */
async function withMembers(db: Database, rows: ClusterRow[]): Promise<ClusterDetailDTO[]> {
  const membersById = new Map<string, string[]>(rows.map((r) => [r.id, []]));
  if (rows.length > 0) {
    const members = await db
      .select({ cluster_id: clusterMembers.cluster_id, item_id: clusterMembers.item_id })
      .from(clusterMembers)
      .where(inArray(clusterMembers.cluster_id, rows.map((r) => r.id)))
      .orderBy(asc(clusterMembers.added_at));
    for (const m of members) membersById.get(m.cluster_id)?.push(m.item_id);
  }
  return rows.map((r) => ({ ...toDTO(r), member_ids: membersById.get(r.id) ?? [] }));
}

export async function listClusters(db: Database, viewerId?: string): Promise<ClusterDetailDTO[]> {
  // B2: scoped list — viewerId filters at the query seam (owner OR shared).
  if (!viewerId) {
    const rows = await db.select().from(clusters).orderBy(asc(clusters.created_at));
    return withMembers(db, rows);
  }
  const shared = await sharedClusterIds(db, viewerId);
  const rows = await db
    .select()
    .from(clusters)
    .where(shared.length > 0 ? or(eq(clusters.owner_id, viewerId), inArray(clusters.id, shared)) : eq(clusters.owner_id, viewerId))
    .orderBy(asc(clusters.created_at));
  return withMembers(db, rows);
}

export async function getCluster(db: Database, id: string): Promise<ClusterDetailDTO | undefined> {
  const [row] = await db.select().from(clusters).where(eq(clusters.id, id)).limit(1);
  if (!row) return undefined;
  const members = await db
    .select({ item_id: clusterMembers.item_id })
    .from(clusterMembers)
    .where(eq(clusterMembers.cluster_id, id))
    .orderBy(asc(clusterMembers.added_at));
  return { ...toDTO(row), member_ids: members.map((m) => m.item_id) };
}

export async function createCluster(db: Database, body: CreateClusterBody, ownerId?: string): Promise<ClusterDTO> {
  const id = `clu_${randomUUID()}`;
  const now = new Date();
  await db.insert(clusters).values({
    id,
    title: body.title,
    description: body.description ?? '',
    owner_id: ownerId ?? 'usr_local',
    created_at: now,
    updated_at: now,
  });
  return toDTO((await db.select().from(clusters).where(eq(clusters.id, id)).limit(1))[0]);
}

export async function clusterOwner(db: Database, id: string): Promise<string | undefined> {
  const [row] = await db.select({ owner_id: clusters.owner_id }).from(clusters).where(eq(clusters.id, id)).limit(1);
  return row?.owner_id;
}

export async function itemOwner(db: Database, id: string): Promise<string | undefined> {
  const [row] = await db.select({ owner_id: items.owner_id }).from(items).where(eq(items.id, id)).limit(1);
  return row?.owner_id;
}

/** Batch owner lookup (N+1 fix): one query for many ids. */
export async function itemOwners(db: Database, ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  const rows = await db.select({ id: items.id, owner_id: items.owner_id }).from(items).where(inArray(items.id, ids));
  for (const r of rows) out.set(r.id, r.owner_id);
  return out;
}

/** Item ids reachable through clusters shared with `userId` (N+1 fix: 2 queries). */
export async function sharedItemIds(db: Database, userId: string): Promise<string[]> {
  const shared = await db
    .select({ cluster_id: clusterShares.cluster_id })
    .from(clusterShares)
    .where(eq(clusterShares.user_id, userId));
  const ids = shared.map((s) => s.cluster_id);
  if (ids.length === 0) return [];
  const members = await db
    .select({ item_id: clusterMembers.item_id })
    .from(clusterMembers)
    .where(inArray(clusterMembers.cluster_id, ids));
  return members.map((m) => m.item_id);
}

export async function updateCluster(
  db: Database,
  id: string,
  body: UpdateClusterBody,
): Promise<ClusterDTO | undefined> {
  const [current] = await db.select().from(clusters).where(eq(clusters.id, id)).limit(1);
  if (!current) return undefined;
  await db
    .update(clusters)
    .set({
      title: body.title ?? current.title,
      description: body.description ?? current.description,
      updated_at: new Date(),
    })
    .where(eq(clusters.id, id));
  return toDTO((await db.select().from(clusters).where(eq(clusters.id, id)).limit(1))[0]);
}

export async function deleteCluster(db: Database, id: string): Promise<boolean> {
  const [current] = await db.select().from(clusters).where(eq(clusters.id, id)).limit(1);
  if (!current) return false;
  await db.delete(clusters).where(eq(clusters.id, id));
  return true;
}

export async function addClusterMember(
  db: Database,
  clusterId: string,
  itemId: string,
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'conflict'; message: string }> {
  const cluster = await getCluster(db, clusterId);
  if (!cluster) return { ok: false, reason: 'not_found', message: 'Cluster not found' };
  if (!(await itemExists(db, itemId))) return { ok: false, reason: 'not_found', message: 'Item not found' };
  if (cluster.member_ids.includes(itemId)) {
    return { ok: false, reason: 'conflict', message: 'Item is already a member' };
  }
  await db.insert(clusterMembers).values({ cluster_id: clusterId, item_id: itemId, added_at: new Date() });
  await db.update(clusters).set({ updated_at: new Date() }).where(eq(clusters.id, clusterId));
  return { ok: true };
}

export async function removeClusterMember(
  db: Database,
  clusterId: string,
  itemId: string,
): Promise<{ ok: true } | { ok: false; reason: 'not_found'; message: string }> {
  const cluster = await getCluster(db, clusterId);
  if (!cluster || !cluster.member_ids.includes(itemId)) {
    return { ok: false, reason: 'not_found', message: 'Membership not found' };
  }
  await db
    .delete(clusterMembers)
    .where(and(eq(clusterMembers.cluster_id, clusterId), eq(clusterMembers.item_id, itemId)));
  await db.update(clusters).set({ updated_at: new Date() }).where(eq(clusters.id, clusterId));
  return { ok: true };
}
