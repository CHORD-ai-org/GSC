/**
 * Canvas tree model (D-079, vision §3/§5): a navigational projection of the
 * Information Space. Pure — canonical data is never mutated. A Chunk in several
 * Clusters/Contexts appears once as an `object` node (first path) and as
 * `reference` nodes on other paths (refTargetId, no duplication).
 */
import type { ItemDTO, ItemType } from './items.ts';
import { ITEM_LABELS, OBJECT_TYPES, RAW_TYPES } from './items.ts';

export type CanvasNodeKind = 'root' | 'domain' | 'category' | 'object' | 'reference';

export type CanvasNode = {
  id: string;
  kind: CanvasNodeKind;
  label: string;
  itemType?: ItemType;
  count?: number;
  hasChildren: boolean;
  itemId?: string;
  refTargetId?: string;
  children: CanvasNode[];
};

export type MemberGroup = { id: string; title: string; member_ids: string[] };

export type TreeInput = {
  items: ItemDTO[];
  clusters: MemberGroup[];
  contexts: MemberGroup[];
};

export function buildTree(input: TreeInput): CanvasNode {
  const seen = new Set<string>();
  const byId = new Map(input.items.map((i) => [i.id, i]));

  const itemNode = (item: ItemDTO, pathId: string): CanvasNode => {
    const isRef = seen.has(item.id);
    if (!isRef) seen.add(item.id);
    return {
      id: pathId,
      kind: isRef ? 'reference' : 'object',
      label: item.title,
      itemType: item.type,
      itemId: item.id,
      ...(isRef ? { refTargetId: item.id } : {}),
      hasChildren: false,
      children: [],
    };
  };

  // Categories grouped by actual item type (vision §3: no fabricated empty categories).
  const typeCategories = (types: readonly ItemType[], dom: string): CanvasNode[] =>
    types
      .map((t) => {
        const kids = input.items
          .filter((i) => i.type === t)
          .map((it) => itemNode(it, `${dom}:${t}:${it.id}`));
        return {
          id: `${dom}:${t}`,
          kind: 'category' as const,
          label: ITEM_LABELS[t],
          itemType: t,
          count: kids.length,
          hasChildren: kids.length > 0,
          children: kids,
        };
      })
      .filter((n) => (n.count ?? 0) > 0);

  // Clusters / Contexts: membership containment (member_ids). Members already seen
  // elsewhere become reference nodes.
  const groups = (list: MemberGroup[], dom: string): CanvasNode[] =>
    list.map((g) => {
      const kids = g.member_ids
        .map((mid) => byId.get(mid))
        .filter((it): it is ItemDTO => Boolean(it))
        .map((it) => itemNode(it, `${dom}:${g.id}:${it.id}`));
      return {
        id: `${dom}:${g.id}`,
        kind: 'category' as const,
        label: g.title,
        count: kids.length,
        hasChildren: kids.length > 0,
        children: kids,
      };
    });

  const rawKids = typeCategories(RAW_TYPES, 'raw');
  const objectKids = typeCategories(OBJECT_TYPES, 'objects');
  const clusterKids = groups(input.clusters, 'clusters');
  const contextKids = groups(input.contexts, 'contexts');

  const rawCount = input.items.filter((i) => i.type.startsWith('raw.')).length;
  const objectCount = input.items.filter((i) => i.type.startsWith('object.')).length;

  const domain = (id: string, label: string, count: number, children: CanvasNode[]): CanvasNode => ({
    id,
    kind: 'domain',
    label,
    count,
    hasChildren: children.length > 0,
    children,
  });

  return {
    id: 'root',
    kind: 'root',
    label: 'My Information Space',
    count: input.items.length,
    hasChildren: true,
    children: [
      domain('raw', 'Raw Information', rawCount, rawKids),
      domain('objects', 'Structured Objects', objectCount, objectKids),
      domain('clusters', 'Clusters', input.clusters.length, clusterKids),
      domain('contexts', 'Contexts', input.contexts.length, contextKids),
    ],
  };
}
