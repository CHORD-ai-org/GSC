import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ItemDTO } from '../lib/items.ts';
import { ITEM_LABELS } from '../lib/items.ts';
import type { ProposalDTO } from '../lib/proposals.ts';
import {
  listProposals, createProposal, resolveProposal, proposeSuggestions,
  getSpatialLayout, putSpatialLayout,
} from '../services/api.ts';
import {
  loadSpatialLayout, saveSpatialLayout, loadSpatialPinned, saveSpatialPinned,
} from '../lib/prefs.ts';
import type { SpatialPos } from '../lib/prefs.ts';
import { useT } from '../lib/i18n.tsx';
import { useToast } from '../components/Toast.tsx';
import styles from './views.module.css';

const CARD_W = 156;
const CARD_H = 62;
const COLS = 4;
const GAP = 26;

const KIND_KEY: Record<string, string> = {
  semantic_name: 'prop.semantic_name',
  classification: 'prop.classification',
  association: 'prop.association',
  cluster: 'prop.cluster',
  metadata: 'prop.metadata',
};

/* V4 (M4) spatial workbench: arrange cards, marquee-select = context boundary,
   explicit delegation, results come back as pending proposals (D-042).
   Scratch layout in localStorage; kept tier (pinned) in spatial_layouts table.
   NOT ink, NOT an infinite canvas, NOT automatic restructuring. */
export function SpatialView({
  page, rows, onOpenItem,
}: {
  page: string;
  rows: ItemDTO[];
  onOpenItem: (id: string) => void;
}) {
  const t = useT();
  const toast = useToast();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Record<string, SpatialPos>>({});
  const [pinned, setPinned] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [proposals, setProposals] = useState<ProposalDTO[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const dragRef = useRef<{ id: string; ox: number; oy: number; moved: boolean } | null>(null);
  const marqueeRef = useRef<{ sx: number; sy: number } | null>(null);
  const marqueeRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const saveTimer = useRef<number>(0);
  const rowsKey = rows.map((r) => r.id).join(',');

  // init: saved scratch + kept overlay, then auto-place the rest (grid)
  useEffect(() => {
    let cancelled = false;
    setPinned(loadSpatialPinned().includes(page));
    void (async () => {
      let kept: Record<string, SpatialPos> = {};
      try {
        const r = await getSpatialLayout(page);
        kept = Object.fromEntries(r.positions.map((p) => [p.item_id, { x: p.x, y: p.y }]));
      } catch { /* scratch only */ }
      if (cancelled) return;
      setLayout((prev) => {
        const next: Record<string, SpatialPos> = { ...loadSpatialLayout(page), ...prev, ...kept };
        let i = 0;
        for (const id of rowsKey.split(',')) {
          if (!id) continue;
          if (!next[id]) {
            next[id] = { x: 24 + (i % COLS) * (CARD_W + GAP), y: 24 + Math.floor(i / COLS) * (CARD_H + GAP) };
            i += 1;
          }
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [page, rowsKey]);

  const reloadProposals = useCallback(async () => {
    try {
      const r = await listProposals('pending');
      const ids = new Set(rowsKey.split(','));
      setProposals(r.proposals.filter((p) => ids.has(p.target_id)));
    } catch { /* panel degrades silently */ }
  }, [rowsKey]);
  useEffect(() => {
    void reloadProposals();
  }, [reloadProposals]);

  const persist = useCallback((next: Record<string, SpatialPos>, itemId?: string) => {
    saveSpatialLayout(page, next);
    if (pinned && itemId && next[itemId]) {
      void putSpatialLayout(page, [{ item_id: itemId, x: Math.round(next[itemId].x), y: Math.round(next[itemId].y) }], false).catch(() => undefined);
    }
  }, [page, pinned]);

  /* ---- card drag (drag <4px = click → open detail) ---- */
  const onCardDown = (e: ReactPointerEvent, id: string) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = layout[id] ?? { x: 0, y: 0 };
    dragRef.current = { id, ox: e.clientX - rect.left - pos.x, oy: e.clientY - rect.top - pos.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onCardMove = (e: ReactPointerEvent) => {
    const d = dragRef.current;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const x = Math.max(0, e.clientX - rect.left - d.ox);
    const y = Math.max(0, e.clientY - rect.top - d.oy);
    const cur = layout[d.id];
    if (cur && Math.abs(cur.x - x) < 4 && Math.abs(cur.y - y) < 4) return;
    d.moved = true;
    setLayout((prev) => ({ ...prev, [d.id]: { x, y } }));
  };
  const onCardUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (!d.moved) {
      onOpenItem(d.id);
      return;
    }
    setLayout((cur) => {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => persist(cur, d.id), 300);
      return cur;
    });
  };

  /* ---- marquee select (background drag) ---- */
  const onWrapDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-card]')) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    marqueeRef.current = { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
    marqueeRectRef.current = null;
    setSel(new Set());
  };
  const onWrapMove = (e: ReactPointerEvent) => {
    const m = marqueeRef.current;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!m || !rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const box = { x: Math.min(m.sx, cx), y: Math.min(m.sy, cy), w: Math.abs(cx - m.sx), h: Math.abs(cy - m.sy) };
    marqueeRectRef.current = box;
    setMarquee(box);
  };
  const onWrapUp = () => {
    const box = marqueeRectRef.current;
    marqueeRef.current = null;
    marqueeRectRef.current = null;
    setMarquee(null);
    if (!box || box.w < 4 || box.h < 4) return;
    const hit = new Set<string>();
    for (const [id, p] of Object.entries(layout)) {
      if (p.x < box.x + box.w && p.x + CARD_W > box.x && p.y < box.y + box.h && p.y + CARD_H > box.y) hit.add(id);
    }
    setSel(hit);
  };

  /* ---- delegation: selected → propose suggestions → pending proposals ---- */
  const delegate = async () => {
    const items = rows.filter((r) => sel.has(r.id));
    if (items.length === 0) return;
    setBusy(true);
    try {
      const res = await proposeSuggestions(items.map((it) => ({
        title: it.title,
        content: String(it.fields.content_text ?? it.fields.definition ?? it.fields.reasoning ?? '').slice(0, 500),
      })));
      const jobs: Promise<unknown>[] = [];
      for (const s of res.suggestions) {
        const target = items[s.index] ?? items[0];
        if (!target) continue;
        if (s.semantic_name) {
          jobs.push(createProposal({
            kind: 'semantic_name', target_id: target.id, proposed_value: s.semantic_name,
            rationale: s.rationale, source: 'agent',
          }).catch(() => undefined));
        }
        if (s.classification) {
          jobs.push(createProposal({
            kind: 'classification', target_id: target.id, proposed_value: s.classification,
            rationale: s.rationale, source: 'agent',
          }).catch(() => undefined));
        }
      }
      await Promise.all(jobs);
      toast(t('spatial.delegated'), 'ok');
      await reloadProposals();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('model.saveFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  /* ---- kept tier: pin layout ---- */
  const pin = async () => {
    try {
      await putSpatialLayout(page, Object.entries(layout).map(([item_id, p]) => ({
        item_id, x: Math.round(p.x), y: Math.round(p.y),
      })), true);
      const pages = new Set(loadSpatialPinned());
      pages.add(page);
      saveSpatialPinned([...pages]);
      setPinned(true);
      toast(t('spatial.pinned'), 'ok');
    } catch (e) {
      toast(e instanceof Error ? e.message : t('model.saveFailed'), 'error');
    }
  };

  const resetLayout = () => {
    const next: Record<string, SpatialPos> = {};
    let i = 0;
    for (const id of rowsKey.split(',')) {
      if (!id) continue;
      next[id] = { x: 24 + (i % COLS) * (CARD_W + GAP), y: 24 + Math.floor(i / COLS) * (CARD_H + GAP) };
      i += 1;
    }
    setLayout(next);
    saveSpatialLayout(page, next);
  };

  const actOnProposal = async (id: string, status: 'accepted' | 'rejected') => {
    try {
      await resolveProposal(id, status);
      toast(t('detail.proposalResolved'), 'ok');
      setProposals((prev) => prev.filter((p) => p.id !== id));
      await reloadProposals();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('model.saveFailed'), 'error');
    }
  };

  const visibleProps = proposals.filter((p) => !hidden.has(p.id));
  const maxBottom = Math.max(200, ...Object.values(layout).map((p) => p.y + CARD_H + 120));

  return (
    <div>
      <div
        ref={wrapRef}
        className={styles.spatWrap}
        style={{ height: maxBottom }}
        onPointerDown={onWrapDown}
        onPointerMove={onWrapMove}
        onPointerUp={onWrapUp}
      >
        {rows.map((item) => {
          const p = layout[item.id] ?? { x: 24, y: 24 };
          return (
            <div
              key={item.id}
              data-card
              className={`${styles.spatCard} ${sel.has(item.id) ? styles.spatPicked : ''}`}
              style={{ left: p.x, top: p.y, width: CARD_W }}
              onPointerDown={(e) => onCardDown(e, item.id)}
              onPointerMove={onCardMove}
              onPointerUp={onCardUp}
            >
              <div className={styles.spatKind}>{ITEM_LABELS[item.type]}</div>
              <div className={styles.spatTitle}>{item.title}</div>
            </div>
          );
        })}
        {/* P1 hygiene: one proposal card per target with +N badge (was one card per proposal). */}
        {[...visibleProps.reduce((m, p) => {
          const l = m.get(p.target_id) ?? [];
          l.push(p);
          m.set(p.target_id, l);
          return m;
        }, new Map<string, ProposalDTO[]>())].map(([targetId, list]) => {
          const base = layout[targetId];
          if (!base) return null;
          const [newest, ...rest] = list;
          const open = expandedTargets.has(targetId);
          const kindLabel = (kind: string) => t((KIND_KEY[kind] ?? 'prop.metadata') as Parameters<typeof t>[0]);
          return (
            <div key={targetId} className={styles.spatProp} style={{ left: base.x + 12, top: base.y + CARD_H + 8 }}>
              <div className={styles.spatPropHead}>
                <span className={styles.propChip}>{kindLabel(newest.kind)}</span>
                <span className={styles.spatPropValue}>{newest.proposed_value}</span>
                {rest.length > 0 ? (
                  <button
                    type="button"
                    className={styles.propBtn}
                    onClick={() => setExpandedTargets((s) => {
                      const next = new Set(s);
                      if (open) next.delete(targetId);
                      else next.add(targetId);
                      return next;
                    })}
                  >
                    +{rest.length}
                  </button>
                ) : null}
              </div>
              <div className={styles.spatPropBtns}>
                <button type="button" className={styles.propBtn} onClick={() => void actOnProposal(newest.id, 'accepted')}>{t('detail.adopt')}</button>
                <button type="button" className={styles.propBtn} onClick={() => void actOnProposal(newest.id, 'rejected')}>{t('detail.reject')}</button>
                <button type="button" className={styles.linkButton} onClick={() => setHidden((s) => new Set(s).add(newest.id))}>{t('detail.defer')}</button>
              </div>
              {open ? rest.map((p) => (
                <div key={p.id} className={styles.spatPropExtra}>
                  <span className={styles.propChip}>{kindLabel(p.kind)}</span>
                  <span className={styles.spatPropValue}>{p.proposed_value}</span>
                  <button type="button" className={styles.propBtn} onClick={() => void actOnProposal(p.id, 'accepted')}>{t('detail.adopt')}</button>
                  <button type="button" className={styles.propBtn} onClick={() => void actOnProposal(p.id, 'rejected')}>{t('detail.reject')}</button>
                  <button type="button" className={styles.linkButton} onClick={() => setHidden((s) => new Set(s).add(p.id))}>{t('detail.defer')}</button>
                </div>
              )) : null}
            </div>
          );
        })}
        {marquee ? (
          <div
            className={styles.spatMarquee}
            style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
          />
        ) : null}
      </div>
      {sel.size > 0 ? (
        <div className={styles.ctxBar}>
          <span>{t('spatial.picked', { n: sel.size })}</span>
          <button type="button" className={styles.linkButton} onClick={() => setSel(new Set())}>{t('spatial.clearSel')}</button>
          <button type="button" className={styles.propBtn} disabled={busy} onClick={() => void delegate()}>
            {busy ? t('common.loading') : t('spatial.delegate')}
          </button>
        </div>
      ) : (
        <div className={styles.ctxBar}>
          <span>{t('spatial.hint')}</span>
          <button type="button" className={styles.linkButton} onClick={() => void pin()}>{pinned ? t('spatial.pinned') : t('spatial.pin')}</button>
          <button type="button" className={styles.linkButton} onClick={resetLayout}>{t('spatial.reset')}</button>
        </div>
      )}
    </div>
  );
}
