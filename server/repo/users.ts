import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { clusterShareEvents, clusterShares, users } from '../persistence/schema.ts';

export type UserDTO = { id: string; name: string; created_at: string };
export type ShareDTO = { cluster_id: string; user_id: string; name: string; role: 'view' | 'add'; created_at: string };

type UserRow = typeof users.$inferSelect;

function toDTO(row: UserRow): UserDTO {
  return { id: row.id, name: row.name, created_at: row.created_at.toISOString() };
}

export async function listUsers(db: Database): Promise<UserDTO[]> {
  const rows = await db.select().from(users).orderBy(asc(users.created_at));
  return rows.map(toDTO);
}

export async function createUser(db: Database, name: string): Promise<UserDTO> {
  const id = `usr_${randomUUID()}`;
  await db.insert(users).values({ id, name, created_at: new Date() });
  return (await db.select().from(users).where(eq(users.id, id)).limit(1)).map(toDTO)[0];
}

export async function deleteUser(db: Database, id: string): Promise<boolean> {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (!row) return false;
  await db.delete(users).where(eq(users.id, id));
  return true;
}

export async function getUser(db: Database, id: string): Promise<UserDTO | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ? toDTO(row) : undefined;
}

export async function listShares(db: Database, clusterId: string): Promise<ShareDTO[]> {
  const rows = await db
    .select({ cluster_id: clusterShares.cluster_id, user_id: clusterShares.user_id, name: users.name, role: clusterShares.role, created_at: clusterShares.created_at })
    .from(clusterShares)
    .leftJoin(users, eq(clusterShares.user_id, users.id))
    .where(eq(clusterShares.cluster_id, clusterId))
    .orderBy(asc(clusterShares.created_at));
  return rows.map((r) => ({
    cluster_id: r.cluster_id,
    user_id: r.user_id,
    name: r.name ?? r.user_id,
    role: r.role as 'view' | 'add',
    created_at: r.created_at.toISOString(),
  }));
}

async function audit(db: Database, clusterId: string, userId: string, role: string, action: string) {
  await db.insert(clusterShareEvents).values({
    id: `sev_${randomUUID()}`,
    cluster_id: clusterId,
    user_id: userId,
    role,
    action,
    at: new Date(),
  });
}

export async function shareCluster(
  db: Database,
  clusterId: string,
  userId: string,
  role: 'view' | 'add',
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'conflict'; message: string }> {
  const all = await db.select().from(clusterShares).where(eq(clusterShares.cluster_id, clusterId));
  if (all.some((s) => s.user_id === userId)) {
    return { ok: false, reason: 'conflict', message: 'Already shared with this user' };
  }
  await db.insert(clusterShares).values({ cluster_id: clusterId, user_id: userId, role, created_at: new Date() });
  await audit(db, clusterId, userId, role, 'granted');
  return { ok: true };
}

export async function revokeShare(db: Database, clusterId: string, userId: string): Promise<boolean> {
  const all = await db.select().from(clusterShares).where(eq(clusterShares.cluster_id, clusterId));
  const target = all.find((s) => s.user_id === userId);
  if (!target) return false;
  await db
    .delete(clusterShares)
    .where(and(eq(clusterShares.cluster_id, clusterId), eq(clusterShares.user_id, userId)));
  await audit(db, clusterId, userId, target.role, 'revoked');
  return true;
}

export async function shareFor(
  db: Database,
  clusterId: string,
  userId: string,
): Promise<'view' | 'add' | null> {
  const all = await db.select().from(clusterShares).where(eq(clusterShares.cluster_id, clusterId));
  const found = all.find((s) => s.user_id === userId);
  return found ? (found.role as 'view' | 'add') : null;
}
