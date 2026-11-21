import { describe, it, expect } from 'vitest';
import { buildTree } from './canvasModel.ts';
import type { CanvasNode } from './canvasModel.ts';
import { layoutTree } from './canvasLayout.ts';
import type { ItemDTO, ItemType } from './items.ts';

function item(id: string, type: ItemType, title: string): ItemDTO {
  return { id, type, title, domain: 'knowledge', origin: 'user', source_label: '', status: 'active', created_at: '', updated_at: '', fields: {} } as ItemDTO;
}

function flatten(node: CanvasNode, acc: CanvasNode[] = []): CanvasNode[] {
  acc.push(node);
  for (const c of node.children) flatten(c, acc);
  return acc;
}

const items = [item('i1', 'raw.document', 'Doc1'), item('i2', 'object.concept', 'Concept1')];
const clusters = [{ id: 'c1', title: 'Cluster1', member_ids: ['i1', 'i2'] }];
const contexts = [{ id: 'x1', title: 'Ctx1', member_ids: ['i1'] }];

describe('canvasModel', () => {
  it('root has four domains', () => {
    const root = buildTree({ items, clusters, contexts });
    expect(root.kind).toBe('root');
    expect(root.children.map((c) => c.id)).toEqual(['raw', 'objects', 'clusters', 'contexts']);
  });

  it('dedupes multi-parent items into a single object + reference nodes', () => {
    const root = buildTree({ items, clusters, contexts });
    const nodes = flatten(root);
    const i1 = nodes.filter((n) => n.label === 'Doc1');
    expect(i1.filter((n) => n.kind === 'object').length).toBe(1);
    expect(i1.filter((n) => n.kind === 'reference').length).toBe(2); // cluster + context
    expect(i1.find((n) => n.kind === 'reference')?.refTargetId).toBe('i1');
  });

  it('omits empty type categories (no fabrication)', () => {
    const root = buildTree({ items: [item('i1', 'raw.document', 'D')], clusters: [], contexts: [] });
    const raw = root.children.find((c) => c.id === 'raw')!;
    expect(raw.children.map((c) => c.itemType)).toEqual(['raw.document']);
  });

  it('reports real counts', () => {
    const root = buildTree({ items, clusters, contexts });
    expect(root.count).toBe(2);
    expect(root.children.find((c) => c.id === 'raw')!.count).toBe(1);
    expect(root.children.find((c) => c.id === 'objects')!.count).toBe(1);
    expect(root.children.find((c) => c.id === 'clusters')!.count).toBe(1);
  });
});

describe('canvasLayout', () => {
  it('assigns coordinates and positive bounds', () => {
    const root = buildTree({ items, clusters, contexts });
    const { coords, width, height } = layoutTree(root, () => true);
    expect(coords.get('root')).toBeDefined();
    expect(coords.size).toBe(flatten(root).length);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it('lays out only expanded nodes when collapsed', () => {
    const root = buildTree({ items, clusters, contexts });
    const none = layoutTree(root, () => false);
    expect(none.coords.size).toBe(1); // only root visible
  });
});
