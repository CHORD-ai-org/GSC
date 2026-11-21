import { useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from 'react';
import { useT } from '../lib/i18n.tsx';
import { buildTree } from '../lib/canvasModel.ts';
import type { CanvasNode, MemberGroup } from '../lib/canvasModel.ts';
import { layoutTree } from '../lib/canvasLayout.ts';
import type { ItemDTO } from '../lib/items.ts';
import { ITEM_LABELS } from '../lib/items.ts';
import styles from './canvasTree.module.css';

const NODE_W = 184;

type Props = {
  items: ItemDTO[];
  clusters: MemberGroup[];
  contexts: MemberGroup[];
  onOpenItem: (id: string) => void;
};

/**
 * Overview Canvas — Expandable Information Tree (D-079). Navigational projection
 * only: expanding/collapsing mutates nothing; multi-parent objects show as
 * reference nodes (dashed) pointing to their canonical object.
 */
export function CanvasTreeView({ items, clusters, contexts, onOpenItem }: Props) {
  const t = useT();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['root']));
  const [selected, setSelected] = useState('');
  const [pan, setPan] = useState({ x: 56, y: 36 });
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const tree = useMemo(() => buildTree({ items, clusters, contexts }), [items, clusters, contexts]);
  const isExpanded = (id: string) => expanded.has(id);
  const { coords, width, height } = useMemo(() => layoutTree(tree, isExpanded), [tree, expanded]);

  const { visible, edges, parentOf } = useMemo(() => {
    const visible: CanvasNode[] = [];
    const edges: { from: CanvasNode; to: CanvasNode }[] = [];
    const parentOf = new Map<string, CanvasNode>();
    const walk = (n: CanvasNode) => {
      visible.push(n);
      if (expanded.has(n.id)) {
        for (const c of n.children) {
          edges.push({ from: n, to: c });
          parentOf.set(c.id, n);
          walk(c);
        }
      }
    };
    walk(tree);
    return { visible, edges, parentOf };
  }, [tree, expanded]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const label = (n: CanvasNode): string =>
    n.kind === 'root' ? t('canvas.root') : n.kind === 'domain' ? t(`canvas.${n.id}`) : n.label;

  const meta = (n: CanvasNode): string => {
    if (n.kind === 'object' || n.kind === 'reference') return n.itemType ? ITEM_LABELS[n.itemType] : '';
    return n.count !== undefined ? `${n.count}` : '';
  };

  const crumbs: CanvasNode[] = [];
  if (selected) {
    let cur = visible.find((n) => n.id === selected);
    while (cur) {
      crumbs.unshift(cur);
      cur = parentOf.get(cur.id);
    }
  }

  const onMouseDown = (e: ReactMouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onMouseMove = (e: ReactMouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPan({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) });
  };
  const onMouseUp = () => {
    dragRef.current = null;
  };
  const onWheel = (e: ReactWheelEvent) => {
    setZoom((z) => Math.min(2, Math.max(0.4, z * (e.deltaY > 0 ? 0.92 : 1.08))));
  };
  const fit = () => {
    setPan({ x: 56, y: 36 });
    setZoom(1);
    setExpanded(new Set(['root']));
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <div className={styles.crumbs}>
          {crumbs.length === 0 ? (
            <span className={styles.crumb}>{t('canvas.root')}</span>
          ) : (
            crumbs.map((n, i) => (
              <span key={n.id}>
                {i > 0 ? <span className={styles.sep}>/</span> : null}
                <button
                  type="button"
                  className={`${styles.crumb} ${i === crumbs.length - 1 ? styles.current : ''}`}
                  onClick={() => setSelected(n.id)}
                >
                  {label(n)}
                </button>
              </span>
            ))
          )}
        </div>
        <div className={styles.controls}>
          <button type="button" className={styles.ctrl} onClick={fit}>
            {t('canvas.fit')}
          </button>
        </div>
      </div>

      {items.length === 0 && clusters.length === 0 && contexts.length === 0 ? (
        <div className={styles.empty}>{t('canvas.empty')}</div>
      ) : (
        <div
          className={styles.canvas}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          <div className={styles.stage} style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})` }}>
            <svg className={styles.svg} width={width + NODE_W} height={height}>
              {edges.map(({ from, to }) => {
                const a = coords.get(from.id);
                const b = coords.get(to.id);
                if (!a || !b) return null;
                const x1 = a.x + NODE_W;
                const y1 = a.y;
                const x2 = b.x;
                const y2 = b.y;
                const mx = (x1 + x2) / 2;
                return (
                  <path
                    key={`${from.id}->${to.id}`}
                    className={styles.link}
                    d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                  />
                );
              })}
            </svg>
            {visible.map((n) => {
              const c = coords.get(n.id);
              if (!c) return null;
              const sel = selected === n.id;
              return (
                <div
                  key={n.id}
                  className={`${styles.node} ${sel ? styles.selected : ''} ${n.kind === 'reference' ? styles.reference : ''}`}
                  style={{ left: c.x, top: c.y }}
                  onClick={() => {
                    setSelected(n.id);
                    if ((n.kind === 'object' || n.kind === 'reference') && n.itemId) onOpenItem(n.itemId);
                  }}
                >
                  {n.hasChildren ? (
                    <button
                      type="button"
                      className={styles.toggle}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(n.id);
                      }}
                    >
                      {expanded.has(n.id) ? '−' : '+'}
                    </button>
                  ) : (
                    <span className={styles.leaf} />
                  )}
                  <div className={styles.body}>
                    <div className={styles.label}>{label(n)}</div>
                    <div className={styles.meta}>{meta(n)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
