import { useEffect, useMemo, useState } from 'react';
import type { ItemDTO } from '../lib/items.ts';
import type { RelationDTO } from '../lib/relations.ts';
import { listRelationsFor, listProposals } from '../services/api.ts';
import { useT } from '../lib/i18n.tsx';
import styles from './views.module.css';

const NODE_W = 150;
const NODE_H = 38;
const GAP_X = 28;
const GAP_Y = 56;
const COLS = 4;

type Placed = { id: string; x: number; y: number; title: string; focus: boolean };

function short(title: string): string {
  return title.length > 11 ? `${title.slice(0, 11)}…` : title;
}

/* V2 (M2) relations projection: deterministic layered SVG layout (NOT a graph
   database, NOT force-directed). Read-only — building an edge stays on the
   proposal path. Dashed edges are pending association proposals. */
export function RelationsView({
  rows, allItems, onOpenItem,
}: {
  rows: ItemDTO[];
  allItems: ItemDTO[];
  onOpenItem: (id: string) => void;
}) {
  const t = useT();
  const [edges, setEdges] = useState<RelationDTO[]>([]);
  const [dashed, setDashed] = useState<{ from: string; to: string }[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'empty'>('loading');
  const ids = useMemo(() => rows.slice(0, 200).map((r) => r.id), [rows]);
  const idsKey = ids.join(',');

  useEffect(() => {
    if (!idsKey) {
      setEdges([]);
      setPhase('empty');
      return;
    }
    let cancelled = false;
    setPhase('loading');
    Promise.all([
      listRelationsFor(idsKey.split(',')),
      listProposals('pending').catch(() => ({ ok: true as const, proposals: [] })),
    ])
      .then(([rel, props]) => {
        if (cancelled) return;
        const idSet = new Set(idsKey.split(','));
        const dashedEdges = props.proposals
          .filter((p) => p.kind === 'association' && idSet.has(p.target_id) && typeof p.related_id === 'string' && idSet.has(p.related_id))
          .map((p) => ({ from: p.target_id, to: p.related_id as string }));
        setEdges(rel.relations);
        setDashed(dashedEdges);
        setPhase(rel.relations.length > 0 || dashedEdges.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        if (!cancelled) setPhase('empty');
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const layout = useMemo(() => {
    const focusIds = ids;
    const external = new Set<string>();
    for (const e of edges) {
      if (!focusIds.includes(e.from_id)) external.add(e.from_id);
      if (!focusIds.includes(e.to_id)) external.add(e.to_id);
    }
    // rows > 40: keep only nodes touched by an edge
    const touched = new Set<string>([...external]);
    for (const e of edges) {
      touched.add(e.from_id);
      touched.add(e.to_id);
    }
    const shownFocus = focusIds.length > 40 ? focusIds.filter((id) => touched.has(id)) : focusIds;
    const titleOf = (id: string): string =>
      allItems.find((i) => i.id === id)?.title ?? t('rel.unknown');
    const placed: Placed[] = [];
    shownFocus.forEach((id, i) => {
      placed.push({
        id,
        x: 20 + (i % COLS) * (NODE_W + GAP_X),
        y: 34 + Math.floor(i / COLS) * (NODE_H + GAP_Y),
        title: short(titleOf(id)),
        focus: true,
      });
    });
    const extList = [...external];
    const baseY = 34 + Math.ceil(shownFocus.length / COLS) * (NODE_H + GAP_Y) + 30;
    extList.forEach((id, i) => {
      placed.push({
        id,
        x: 20 + (i % COLS) * (NODE_W + GAP_X),
        y: baseY + Math.floor(i / COLS) * (NODE_H + GAP_Y),
        title: short(titleOf(id)),
        focus: false,
      });
    });
    const pos = new Map(placed.map((p) => [p.id, p]));
    const width = Math.min(COLS, Math.max(shownFocus.length, extList.length, 1)) * (NODE_W + GAP_X) + 40;
    const height = baseY + Math.ceil(extList.length / COLS) * (NODE_H + GAP_Y) + 30;
    return { placed, pos, width, height, extCount: extList.length };
  }, [ids, edges, allItems, t]);

  if (phase === 'loading') return <p className={styles.tlEmpty}>{t('common.loading')}</p>;
  if (phase === 'empty') return <p className={styles.tlEmpty}>{t('rel.empty')}</p>;

  const { placed, pos, width, height, extCount } = layout;
  return (
    <div className={styles.relWrap}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('rel.title')}>
        {edges.map((e) => {
          const a = pos.get(e.from_id);
          const b = pos.get(e.to_id);
          if (!a || !b) return null;
          return (
            <g key={e.id}>
              <line x1={a.x + NODE_W / 2} y1={a.y + NODE_H / 2} x2={b.x + NODE_W / 2} y2={b.y + NODE_H / 2} stroke="#B4B2A9" strokeWidth="1" />
              <text x={(a.x + b.x) / 2 + NODE_W / 2} y={(a.y + b.y) / 2 + NODE_H / 2 - 4} textAnchor="middle" fontSize="10" fill="#888780">{e.kind}</text>
            </g>
          );
        })}
        {dashed.map((d, i) => {
          const a = pos.get(d.from);
          const b = pos.get(d.to);
          if (!a || !b) return null;
          return (
            <line key={`d-${i}`} x1={a.x + NODE_W / 2} y1={a.y + NODE_H / 2} x2={b.x + NODE_W / 2} y2={b.y + NODE_H / 2} stroke="#AFA9EC" strokeWidth="1" strokeDasharray="4 3" />
          );
        })}
        {placed.map((p) => (
          <g key={p.id} className={styles.relNode} onClick={() => onOpenItem(p.id)} style={{ cursor: 'pointer' }}>
            <rect
              x={p.x}
              y={p.y}
              width={NODE_W}
              height={NODE_H}
              rx="8"
              fill={p.focus ? '#EEEDFE' : '#F1EFE8'}
              stroke={p.focus ? '#AFA9EC' : '#B4B2A9'}
              strokeWidth="0.5"
            />
            <text x={p.x + NODE_W / 2} y={p.y + NODE_H / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize="12" fill={p.focus ? '#3C3489' : '#444441'}>{p.title}</text>
          </g>
        ))}
      </svg>
      {extCount > 0 ? <p className={styles.tlEmpty}>{t('rel.legend')}</p> : null}
    </div>
  );
}
