/**
 * Deterministic frontend tree layout (D-079, vision §7 MVP). Horizontal tidy
 * tree: depth → x, leaves occupy sequential y slots, a parent is centered on its
 * children. Only expanded nodes are laid out (collapsed subtrees stay hidden).
 * Pure: returns a coordinate map, never mutates canonical data or the model.
 */
import type { CanvasNode } from './canvasModel.ts';

export const ROW_H = 44;
export const LEVEL_W = 252;

export type Coords = { x: number; y: number };

export function layoutTree(
  root: CanvasNode,
  isExpanded: (id: string) => boolean,
): { coords: Map<string, Coords>; width: number; height: number } {
  const coords = new Map<string, Coords>();
  let cursor = 0;
  let maxDepth = 0;

  const place = (node: CanvasNode, depth: number): void => {
    if (depth > maxDepth) maxDepth = depth;
    const x = depth * LEVEL_W;
    const kids = isExpanded(node.id) ? node.children : [];
    if (kids.length === 0) {
      coords.set(node.id, { x, y: cursor * ROW_H });
      cursor += 1;
      return;
    }
    for (const k of kids) place(k, depth + 1);
    const first = coords.get(kids[0].id);
    const last = coords.get(kids[kids.length - 1].id);
    coords.set(node.id, { x, y: ((first?.y ?? 0) + (last?.y ?? 0)) / 2 });
  };

  place(root, 0);
  return {
    coords,
    width: (maxDepth + 1) * LEVEL_W,
    height: Math.max(cursor * ROW_H, ROW_H),
  };
}
