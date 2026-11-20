import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { clusterMembers, clusters } from '../persistence/schema.ts';
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

export async function listClusters(db: Database): Promise<ClusterDTO[]> {
  const rows = await db.select().from(clusters).orderBy(asc(clusters.created_at));
  return rows.map(toDTO);
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

export async function createCluster(db: Database, body: CreateClusterBody): Promise<ClusterDTO> {
  const id = `clu_${randomUUID()}`;
  const now = new Date();
  await db.insert(clusters).values({
    id,
    title: body.title,
    description: body.description ?? '',
    created_at: now,
    updated_at: now,
  });
  return toDTO((await db.select().from(clusters).where(eq(clusters.id, id)).limit(1))[0]);
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
