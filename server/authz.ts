/**
 * Authorization decision point (B2) — one module answering "what may this
 * viewer do", instead of four hand-copied shapes spread across the router.
 *
 * Policy (D-092): invisible resource → 404 'not found' (hide existence);
 * visible but insufficient role → 403 'forbidden'. Token-scope denials
 * (read-only token writing) are a separate concern and stay 403 upstream.
 *
 * Everything here crosses the same seam callers and tests use: build one
 * Authz per request with `createAuthz(config, db, viewerId)`.
 */
import { eq } from 'drizzle-orm';
import type { Config } from './config.ts';
import type { Database } from './persistence/client.ts';
import { clusterMembers, items } from './persistence/schema.ts';
import { clusterOwner, itemOwner, sharedItemIds } from './repo/clusters.ts';
import { shareFor } from './repo/users.ts';
import { DEFAULT_USER_ID } from './storage/tokens.ts';

export type ClusterRole = 'owner' | 'view' | 'add';

export type Authz = {
  /** default single-user mode: no ownership enforcement */
  unrestricted: boolean;
  viewerId: string;
  /** viewer may see the item (owner, or member of a cluster shared to them) */
  canViewItem(itemId: string): Promise<boolean>;
  /** null = no filtering; otherwise the set of item ids the viewer may see */
  visibleItemIds(): Promise<Set<string> | null>;
  /** null = invisible (deny 404); otherwise the viewer's role on the cluster */
  clusterRole(clusterId: string): Promise<ClusterRole | null>;
  /** null = allowed to write; 'hidden' → deny 404; 'forbidden' → deny 403 */
  itemWriteDenied(itemId: string): Promise<'hidden' | 'forbidden' | null>;
};

export function createAuthz(config: Config, db: Database, viewerId: string): Authz {
  const unrestricted = !config.authRequired && viewerId === DEFAULT_USER_ID;

  async function canViewItem(itemId: string): Promise<boolean> {
    if (unrestricted) return true;
    const owner = await itemOwner(db, itemId);
    if (owner === viewerId) return true;
    const memberships = await db
      .select({ cluster_id: clusterMembers.cluster_id })
      .from(clusterMembers)
      .where(eq(clusterMembers.item_id, itemId));
    for (const m of memberships) {
      if (await shareFor(db, m.cluster_id, viewerId)) return true;
    }
    return false;
  }

  async function visibleItemIds(): Promise<Set<string> | null> {
    if (unrestricted) return null; // null = no filtering
    const visible = new Set<string>();
    // One query for ownership (id + owner only — no content join), one for shares.
    const rows = await db.select({ id: items.id, owner: items.owner_id }).from(items);
    for (const row of rows) {
      if (row.owner === viewerId) visible.add(row.id);
    }
    for (const id of await sharedItemIds(db, viewerId)) visible.add(id);
    return visible;
  }

  async function clusterRole(clusterId: string): Promise<ClusterRole | null> {
    if (unrestricted) return 'owner';
    if ((await clusterOwner(db, clusterId)) === viewerId) return 'owner';
    return (await shareFor(db, clusterId, viewerId)) ?? null;
  }

  async function itemWriteDenied(itemId: string): Promise<'hidden' | 'forbidden' | null> {
    if (unrestricted) return null;
    if ((await itemOwner(db, itemId)) === viewerId) return null;
    return (await canViewItem(itemId)) ? 'forbidden' : 'hidden';
  }

  return { unrestricted, viewerId, canViewItem, visibleItemIds, clusterRole, itemWriteDenied };
}
