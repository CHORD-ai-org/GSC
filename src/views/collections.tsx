import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ITEM_LABELS, OBJECT_TYPES, RAW_TYPES } from '../lib/items.ts';
import type { ItemDTO } from '../lib/items.ts';
import type { TagDefinitionDTO } from '../lib/tags.ts';
import type { ContextIndexEntry } from './pages.tsx';
import type { ClusterIndexEntry } from './detail.tsx';
import { MemberBadge } from '../components/SemTag.tsx';
import { EmptyState } from '../components/ui.tsx';
import { useToast } from '../components/Toast.tsx';
import { useViewMode, ViewToggle, ViewSwitcher } from '../lib/viewMode.tsx';
import type { ViewMode, SavedView } from '../lib/prefs.ts';
import { loadSavedViews, saveSavedViews } from '../lib/prefs.ts';
import { TimelineView } from './timeline.tsx';
import { RelationsView } from './relations.tsx';
import { SpatialView } from './spatial.tsx';
import { useWindowed } from '../lib/useWindowed.ts';
import { Glyph } from '../components/Glyph.tsx';
import { useRelativeTime, useT } from '../lib/i18n.tsx';
import styles from './views.module.css';

export type ItemBadges = Record<string, { kind: 'cluster' | 'context'; title: string }[]>;

/* 网格视角: shared grid card (glyph + title + badges + time). */
export function GridCard({
  glyph, typeLabel, title, badges, time, onClick,
}: {
  glyph: ReactNode;
  typeLabel: string;
  title: string;
  badges?: { kind: 'cluster' | 'context'; title: string }[];
  time?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.gridCard} onClick={onClick}>
      <div className={styles.gridCardHead}>
        <span className={styles.gridCardGlyph}>{glyph}</span>
        <span className={styles.gridCardType}>{typeLabel}</span>
      </div>
      <div className={styles.gridCardTitle}>{title}</div>
      <div className={styles.gridCardFoot}>
        <span className={styles.gridCardBadges}>
          {(badges ?? []).slice(0, 2).map((b) => <MemberBadge key={`${b.kind}-${b.title}`} kind={b.kind} title={b.title} />)}
        </span>
        {time ? <span>{time}</span> : null}
      </div>
    </button>
  );
}

/* P2: hover quick actions (open / copy title) — sibling of the row button */
function RowActions({ title, onOpen }: { title: string; onOpen: () => void }) {
  const t = useT();
  const toast = useToast();
  return (
    <div className={styles.rowActions}>
      <button
        type="button"
        className={styles.rowActionButton}
        title={t('keys.openDetail')}
        aria-label={t('keys.openDetail')}
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 3h7v7M13 3L6.5 9.5" /><path d="M11 9.5V13H3V5h3.5" /></svg>
      </button>
      <button
        type="button"
        className={styles.rowActionButton}
        title={t('keys.copyTitle')}
        aria-label={t('keys.copyTitle')}
        onClick={(e) => {
          e.stopPropagation();
          void navigator.clipboard?.writeText(title).then(() => toast(t('keys.copied')));
        }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" /></svg>
      </button>
    </div>
  );
}

function matches(item: ItemDTO, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return item.title.toLowerCase().includes(needle)
    || ITEM_LABELS[item.type].toLowerCase().includes(needle)
    || Object.values(item.fields).some((v) => typeof v === 'string' && v.toLowerCase().includes(needle));
}

/* Source-library helpers (Part 4.2): content preview + clean source attribution.
   Keep raw technical source_label (e.g. sync:web:https://…) out of primary display. */
function previewOf(item: ItemDTO): string {
  const fields = item.fields;
  const text = fields.content_text ?? fields.definition ?? fields.claim ?? fields.statement
    ?? fields.reasoning ?? fields.steps ?? fields.name ?? fields.notes ?? '';
  return text.replace(/\s+/g, ' ').trim().slice(0, 170);
}

function sourceDisplay(item: ItemDTO): string {
  const author = item.fields.author;
  if (typeof author === 'string' && author.trim()) return author.trim();
  const loc = typeof item.fields.locator === 'string' && item.fields.locator ? item.fields.locator : item.source_label;
  const cleaned = loc.replace(/^sync:[a-z]+:/, '');
  try {
    return new URL(cleaned).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function PageHead({ title, count, action }: { title: string; count: number; action: ReactNode }) {
  return (
    <div className={styles.headRow}>
      <h1 className={styles.pageTitle}>{title} <span className={styles.countChip}>{count}</span></h1>
      {action}
    </div>
  );
}

function ListHeader({ cols }: { cols: [string, string, string] }) {
  return (
    <div className={styles.colHeader}>
      <span>{cols[0]}</span>
      <span>{cols[1]}</span>
      <span>{cols[2]}</span>
    </div>
  );
}

function RowBadges({ badges }: { badges?: { kind: 'cluster' | 'context'; title: string }[] }) {
  /* always render the cell so listRow grid columns stay aligned */
  return (
    <div className={styles.rowBadges}>
      {(badges ?? []).slice(0, 2).map((b) => <MemberBadge key={`${b.kind}-${b.title}`} kind={b.kind} title={b.title} />)}
    </div>
  );
}

/* V2 (M2) saved views: named filter+view recipes, local only. */
function SavedViewsMenu({
  page, view, filters, onApply,
}: {
  page: string;
  view: ViewMode;
  filters: { type?: string; domain?: string; q?: string; dim?: string };
  onApply: (v: SavedView) => void;
}) {
  const t = useT();
  const [views, setViews] = useState<SavedView[]>(() => loadSavedViews());
  const [sel, setSel] = useState('');
  return (
    <>
      <select
        className={styles.select}
        value={sel}
        onChange={(e) => {
          setSel(e.target.value);
          const v = views.find((x) => x.id === e.target.value);
          if (v) onApply(v);
        }}
      >
        <option value="">{t('cols.viewLib')}</option>
        {views.filter((v) => v.page === page).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      <button
        type="button"
        className={styles.linkButton}
        onClick={() => {
          const name = window.prompt(t('cols.viewNamePrompt'));
          if (!name) return;
          const next = [...views, { id: Date.now().toString(36), name, page, view, filters }];
          setViews(next);
          saveSavedViews(next);
        }}
      >
        {t('cols.saveView')}
      </button>
      {sel ? (
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => {
            const next = views.filter((v) => v.id !== sel);
            setViews(next);
            saveSavedViews(next);
            setSel('');
          }}
        >
          {t('cols.deleteView')}
        </button>
      ) : null}
    </>
  );
}

/* V1 engagement traces: dual activity bars (blue = you, orange = agent), Ream-style wear. */
export function ActivityBars({ counts }: { counts?: { user: number; agent: number } }) {
  const u = counts?.user ?? 0;
  const a = counts?.agent ?? 0;
  if (u + a === 0) return null;
  const w = (n: number) => `${Math.min(6 + n * 10, 56)}px`;
  return (
    <span className={styles.activityBars} title={u + a === 0 ? '' : `你 ${u} · Agent ${a}`}>
      <span className={styles.activityBarU} style={{ width: w(u) }} />
      <span className={styles.activityBarA} style={{ width: w(a) }} />
    </span>
  );
}

/* GAP-09: loading skeleton — shimmer rows instead of a blank page. */
export function SkeletonRows({ n = 4 }: { n?: number }) {
  return (
    <div className={styles.list} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={styles.skeletonRow}>
          <div className={`${styles.skeletonBar} ${styles.skeletonGlyph}`} />
          <div className={styles.skeletonStack}>
            <div className={`${styles.skeletonBar} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeletonBar} ${styles.skeletonLine}`} />
          </div>
          <div className={`${styles.skeletonBar} ${styles.skeletonTime}`} />
        </div>
      ))}
    </div>
  );
}

/* GAP-10: bulk tag bar — tag every selected item in one go. */
function BulkTagBar({
  count, tagDefs, onApply, onClear,
}: {
  count: number;
  tagDefs: TagDefinitionDTO[];
  onApply: (definitionId: string, value: string) => Promise<void> | void;
  onClear: () => void;
}) {
  const t = useT();
  const [defId, setDefId] = useState('');
  const [value, setValue] = useState('');
  return (
    <div className={styles.bulkTagBar}>
      <span className={styles.rowType}>{t('cols.selectedN', { n: count })}</span>
      <select className={styles.select} value={defId} onChange={(e) => setDefId(e.target.value)}>
        <option value="">{t('cols.bulkDim')}</option>
        {tagDefs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <input className={styles.search} placeholder={t('cols.bulkValue')} value={value} onChange={(e) => setValue(e.target.value)} />
      <button
        type="button"
        className={styles.primaryButton}
        disabled={!defId || !value.trim()}
        onClick={() => { void onApply(defId, value.trim()); setValue(''); }}
      >
        {t('cols.bulkTag')}
      </button>
      <button type="button" className={styles.linkButton} onClick={onClear}>{t('cols.bulkClear')}</button>
    </div>
  );
}

export function RawCollection({
  items, badges, tagDims, tagDimOptions, tagDefs, loading, activity, onNew, onSelect, onBulkTag,
}: {
  items: ItemDTO[];
  badges?: ItemBadges;
  tagDims?: Record<string, string[]>;
  tagDimOptions?: string[];
  tagDefs?: TagDefinitionDTO[];
  loading?: boolean;
  activity?: Record<string, { user: number; agent: number }>;
  onNew: () => void;
  onSelect: (id: string) => void;
  onBulkTag?: (ids: string[], definitionId: string, value: string) => Promise<void> | void;
}) {
  const t = useT();
  const rt = useRelativeTime();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [dim, setDim] = useState('all');
  const [view, setView] = useViewMode('raw');
  const [pickMode, setPickMode] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const rows = useMemo(
    () => items.filter((i) => i.type.startsWith('raw.'))
      .filter((i) => type === 'all' || i.type === type)
      .filter((i) => dim === 'all' || (tagDims?.[i.id] ?? []).includes(dim))
      .filter((i) => matches(i, q)),
    [items, q, type, dim, tagDims],
  );
  const { visible: winRows, sentinelRef } = useWindowed(rows);
  return (
    <div className={styles.page}>
      <PageHead
        title={t('raw.title')}
        count={rows.length}
        action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('cols.add')}</button>}
      />
      <div className={styles.toolbar}>
        <input className={styles.search} placeholder={t('raw.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">{t('raw.allTypes')}</option>
          {RAW_TYPES.map((t) => <option key={t} value={t}>{ITEM_LABELS[t]}</option>)}
        </select>
        {tagDimOptions && tagDimOptions.length > 0 ? (
          <select className={styles.select} value={dim} onChange={(e) => setDim(e.target.value)}>
            <option value="all">{t('cols.allTags')}</option>
            {tagDimOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : null}
        <button
          type="button"
          className={`${styles.linkButton} ${pickMode ? styles.on : ''}`}
          onClick={() => { setPickMode((v) => !v); setPicked(new Set()); }}
        >
          {t('cols.selectMode')}
        </button>
        <ViewSwitcher mode={view} onChange={setView} />
        <SavedViewsMenu
          page="raw"
          view={view}
          filters={{ type, q, dim }}
          onApply={(v) => { setQ(v.filters.q ?? ''); setType(v.filters.type ?? 'all'); setDim(v.filters.dim ?? 'all'); setView(v.view); }}
        />
      </div>
      {pickMode && picked.size > 0 && tagDefs && onBulkTag ? (
        <BulkTagBar
          count={picked.size}
          tagDefs={tagDefs}
          onApply={async (definitionId, value) => {
            await onBulkTag([...picked], definitionId, value);
            setPicked(new Set());
          }}
          onClear={() => setPicked(new Set())}
        />
      ) : null}
      {view === 'spatial' ? (
        <SpatialView page="raw" rows={rows} onOpenItem={onSelect} />
      ) : view === 'relations' ? (
        <RelationsView rows={rows} allItems={items} onOpenItem={onSelect} />
      ) : view === 'timeline' ? (
        <TimelineView rows={rows} onOpenItem={onSelect} />
      ) : view === 'grid' ? (
        rows.length === 0 ? (
          <EmptyState title={t('raw.empty')} hint={t('raw.emptyHint')} action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('cols.add')}</button>} />
        ) : (
          <div className={styles.gridView}>
            {winRows.map((item) => (
              <GridCard
                key={item.id}
                glyph={<Glyph kind={item.type} />}
                typeLabel={`${ITEM_LABELS[item.type]}${sourceDisplay(item) ? ` · ${sourceDisplay(item)}` : ''}`}
                title={item.title}
                badges={badges?.[item.id]}
                time={rt(item.updated_at)}
                onClick={() => onSelect(item.id)}
              />
            ))}
          </div>
        )
      ) : (
        <>
          <ListHeader cols={[t('cols.name'), t('cols.typeSource'), t('cols.updated')]} />
          <div className={styles.list}>
            {loading ? (
              <SkeletonRows />
            ) : rows.length === 0 ? (
              <EmptyState title={t('raw.empty')} hint={t('raw.emptyHint')} action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('cols.add')}</button>} />
            ) : winRows.map((item) => (
              <div key={item.id} className={styles.rowWrap}>
                <button
                  type="button"
                  className={`${styles.listRow} ${pickMode && picked.has(item.id) ? styles.picked : ''}`}
                  onClick={() => {
                    if (!pickMode) { onSelect(item.id); return; }
                    setPicked((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    });
                  }}
                >
                  <span className={styles.rowGlyph}>
                    {pickMode ? <span className={styles.pickMark}>{picked.has(item.id) ? '✓' : ''}</span> : <Glyph kind={item.type} />}
                  </span>
                  <span className={styles.rowStack}>
                    <span className={styles.rowTitle}>{item.title}</span>
                    {previewOf(item) ? <span className={styles.rowPreview}>{previewOf(item)}</span> : null}
                  </span>
                  <span className={styles.rowTypeWrap}>
                    <span className={styles.rowType}>{ITEM_LABELS[item.type]}{sourceDisplay(item) ? ` · ${sourceDisplay(item)}` : ''}</span>
                    <RowBadges badges={badges?.[item.id]} />
                  </span>
                  <span className={styles.rowTime}><ActivityBars counts={activity?.[item.id]} /><br />{rt(item.updated_at)}</span>
                </button>
                <RowActions title={item.title} onOpen={() => onSelect(item.id)} />
              </div>
            ))}
          </div>
        </>
      )}
      <div ref={sentinelRef} style={{ height: 1 }} />
    </div>
  );
}

const OBJECT_TABS: { id: string; labelKey: string }[] = [
  { id: 'all', labelKey: 'obj.all' },
  { id: 'object.concept', labelKey: 'obj.concepts' },
  { id: 'object.decision', labelKey: 'obj.decisions' },
  { id: 'object.methodology', labelKey: 'obj.methodologies' },
  { id: 'object.hypothesis', labelKey: 'obj.hypotheses' },
];

export function ObjectCollection({
  items, sourceCounts, badges, tagDims, tagDimOptions, tagDefs, loading, activity, onNew, onSelect, onBulkTag,
}: {
  items: ItemDTO[];
  sourceCounts: Record<string, number>;
  badges?: ItemBadges;
  tagDims?: Record<string, string[]>;
  tagDimOptions?: string[];
  tagDefs?: TagDefinitionDTO[];
  loading?: boolean;
  activity?: Record<string, { user: number; agent: number }>;
  onNew: () => void;
  onSelect: (id: string) => void;
  onBulkTag?: (ids: string[], definitionId: string, value: string) => Promise<void> | void;
}) {
  const t = useT();
  const rt = useRelativeTime();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [dim, setDim] = useState('all');
  const [view, setView] = useViewMode('objects');
  const [pickMode, setPickMode] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const rows = useMemo(
    () => items.filter((i) => (OBJECT_TYPES as readonly string[]).includes(i.type))
      .filter((i) => tab === 'all' || i.type === tab)
      .filter((i) => dim === 'all' || (tagDims?.[i.id] ?? []).includes(dim))
      .filter((i) => matches(i, q)),
    [items, q, tab, dim, tagDims],
  );
  const { visible: winRows, sentinelRef } = useWindowed(rows);
  return (
    <div className={styles.page}>
      <PageHead
        title={t('obj.title')}
        count={rows.length}
        action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('cols.create')}</button>}
      />
      <div className={styles.toolbar}>
        <input className={styles.search} placeholder={t('obj.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        {tagDimOptions && tagDimOptions.length > 0 ? (
          <select className={styles.select} value={dim} onChange={(e) => setDim(e.target.value)}>
            <option value="all">{t('cols.allTags')}</option>
            {tagDimOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : null}
        <button
          type="button"
          className={`${styles.linkButton} ${pickMode ? styles.on : ''}`}
          onClick={() => { setPickMode((v) => !v); setPicked(new Set()); }}
        >
          {t('cols.selectMode')}
        </button>
        <ViewSwitcher mode={view} onChange={setView} />
        <SavedViewsMenu
          page="objects"
          view={view}
          filters={{ type: tab, q, dim }}
          onApply={(v) => { setQ(v.filters.q ?? ''); setTab(v.filters.type ?? 'all'); setDim(v.filters.dim ?? 'all'); setView(v.view); }}
        />
      </div>
      {pickMode && picked.size > 0 && tagDefs && onBulkTag ? (
        <BulkTagBar
          count={picked.size}
          tagDefs={tagDefs}
          onApply={async (definitionId, value) => {
            await onBulkTag([...picked], definitionId, value);
            setPicked(new Set());
          }}
          onClear={() => setPicked(new Set())}
        />
      ) : null}
      <div className={styles.tabRow}>
        {OBJECT_TABS.map((tb) => (
          <button key={tb.id} type="button" className={`${styles.tab} ${tab === tb.id ? styles.on : ''}`} onClick={() => setTab(tb.id)}>
            {t(tb.labelKey)}
          </button>
        ))}
      </div>
      {view === 'spatial' ? (
        <SpatialView page="objects" rows={rows} onOpenItem={onSelect} />
      ) : view === 'relations' ? (
        <RelationsView rows={rows} allItems={items} onOpenItem={onSelect} />
      ) : view === 'timeline' ? (
        <TimelineView rows={rows} onOpenItem={onSelect} />
      ) : view === 'grid' ? (
        rows.length === 0 ? (
          <EmptyState title={t('obj.empty')} hint={t('obj.emptyHint')} action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('cols.add')}</button>} />
        ) : (
          <div className={styles.gridView}>
            {winRows.map((item) => (
              <GridCard
                key={item.id}
                glyph={<Glyph kind={item.type} />}
                typeLabel={`${ITEM_LABELS[item.type]} · ${t('obj.sources', { n: sourceCounts[item.id] ?? 0 })}`}
                title={item.title}
                badges={badges?.[item.id]}
                time={rt(item.updated_at)}
                onClick={() => onSelect(item.id)}
              />
            ))}
          </div>
        )
      ) : (
        <>
          <ListHeader cols={[t('cols.name'), t('cols.typeSources'), t('cols.updated')]} />
          <div className={styles.list}>
            {loading ? (
              <SkeletonRows />
            ) : rows.length === 0 ? (
              <EmptyState title={t('obj.empty')} hint={t('obj.emptyHint')} action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('cols.add')}</button>} />
            ) : winRows.map((item) => (
              <div key={item.id} className={styles.rowWrap}>
                <button
                  type="button"
                  className={`${styles.listRow} ${pickMode && picked.has(item.id) ? styles.picked : ''}`}
                  onClick={() => {
                    if (!pickMode) { onSelect(item.id); return; }
                    setPicked((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    });
                  }}
                >
                  <span className={styles.rowGlyph}>
                    {pickMode ? <span className={styles.pickMark}>{picked.has(item.id) ? '✓' : ''}</span> : <Glyph kind={item.type} />}
                  </span>
                  <span className={styles.rowStack}>
                    <span className={styles.rowTitle}>{item.title}</span>
                    {previewOf(item) ? <span className={styles.rowPreview}>{previewOf(item)}</span> : null}
                  </span>
                  <span className={styles.rowTypeWrap}>
                    <span className={styles.rowType}>{ITEM_LABELS[item.type]} · {t('obj.sources', { n: sourceCounts[item.id] ?? 0 })}</span>
                    <RowBadges badges={badges?.[item.id]} />
                  </span>
                  <span className={styles.rowTime}><ActivityBars counts={activity?.[item.id]} /><br />{rt(item.updated_at)}</span>
                </button>
                <RowActions title={item.title} onOpen={() => onSelect(item.id)} />
              </div>
            ))}
          </div>
        </>
      )}
      <div ref={sentinelRef} style={{ height: 1 }} />
    </div>
  );
}

/* CLUSTERS_UI_PLAN CL1：书架墙（spine）+ Gallery 网格（Thylas 封面系统语言）。 */

const COVER_TINTS = [
  { bg: '#EDF1F6', fg: '#4b6b8f' },
  { bg: '#EFF3E9', fg: '#6b8f4b' },
  { bg: '#F6EFE7', fg: '#8f6b4b' },
  { bg: '#F1EDF6', fg: '#6b4b8f' },
];

function coverTint(id: string): { bg: string; fg: string } {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COVER_TINTS[h % COVER_TINTS.length];
}

/** 符号自动分派（Thylas 画笔规则：24 viewBox/stroke 1.2/fill none/currentColor）：成员多=点阵、中=双叠方块、少=书架三横线。 */
function CoverSymbol({ members }: { members: number }) {
  const common = { width: 56, height: 56, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (members >= 10) {
    const pts: number[] = [4, 12, 20];
    return (
      <svg {...common}>
        {pts.map((y) => pts.map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" fill="currentColor" stroke="none" />))}
      </svg>
    );
  }
  if (members >= 3) {
    return (
      <svg {...common}>
        <rect x="3.5" y="7" width="10.5" height="10.5" rx="1.5" />
        <rect x="10" y="4.5" width="10.5" height="10.5" rx="1.5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M5 5.5h14M5 12h14M5 18.5h14" />
    </svg>
  );
}

/** 7 日活动密度条（真实事件桶）。 */
function DensityStrip({ days, color, height = 18 }: { days: number[]; color: string; height?: number }) {
  const max = Math.max(1, ...days);
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'flex-end', height }} aria-hidden="true">
      {days.map((d, i) => (
        <span key={i} style={{ width: 4, height: Math.max(2, Math.round((d / max) * (height - 2))), borderRadius: 2, background: color, opacity: 0.35 + 0.65 * (d / max) }} />
      ))}
    </span>
  );
}

export function ClusterCollection({
  clusters, onNew, onSelect, pendingProposals = [],
}: {
  clusters: ClusterIndexEntry[];
  onNew: () => void;
  onSelect: (id: string) => void;
  pendingProposals?: { id: string; kind: string; target_id: string; related_id?: string | null }[];
}) {
  const t = useT();
  const rt = useRelativeTime();
  const [q, setQ] = useState('');
  const [view, setView] = useViewMode('clusters');
  const [sort, setSort] = useState<'active' | 'members' | 'name'>('active');
  const [density, setDensity] = useState<Record<string, number[]>>({});

  const rows = useMemo(() => {
    const filtered = clusters.filter((c) => !q.trim()
      || c.title.toLowerCase().includes(q.trim().toLowerCase())
      || c.description.toLowerCase().includes(q.trim().toLowerCase()));
    const sorted = [...filtered];
    if (sort === 'active') sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    else if (sort === 'members') sorted.sort((a, b) => b.member_ids.length - a.member_ids.length);
    else sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
    return sorted;
  }, [clusters, q, sort]);

  /* 待裁决红点：proposals 与 cluster 直接相关（related_id=cluster 或 target=cluster）。 */
  const pendingC = useMemo(() => {
    const set = new Set<string>();
    for (const p of pendingProposals) {
      if (p.kind === 'cluster' && p.related_id) set.add(p.related_id);
      if (p.related_id) set.add(p.related_id);
      set.add(p.target_id);
    }
    return set;
  }, [pendingProposals]);

  /* 7 日密度：成员事件一次批取（≤200 id）→ 按 cluster 聚合。 */
  const idsKey = useMemo(() => [...new Set(rows.flatMap((c) => c.member_ids))].slice(0, 200).join(','), [rows]);
  useEffect(() => {
    if (!idsKey) { setDensity({}); return; }
    const ids = idsKey.split(',');
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    void import('../services/api.ts').then(({ listEventsFor }) =>
      listEventsFor(ids, { since, limit: 500 }).then((r) => {
        const perItem = new Map<string, number[]>();
        for (const e of r.events) {
          const day = Math.floor((Date.now() - new Date(e.at).getTime()) / 86400_000);
          if (day < 0 || day > 6) continue;
          const arr = perItem.get(e.item_id) ?? [0, 0, 0, 0, 0, 0, 0];
          arr[6 - day] += 1;
          perItem.set(e.item_id, arr);
        }
        const out: Record<string, number[]> = {};
        for (const c of clusters) {
          const agg = [0, 0, 0, 0, 0, 0, 0];
          for (const id of c.member_ids) {
            const arr = perItem.get(id);
            if (arr) for (let i = 0; i < 7; i += 1) agg[i] += arr[i];
          }
          out[c.id] = agg;
        }
        setDensity(out);
      })).catch(() => undefined);
  }, [idsKey, clusters]);

  const SORTS: { id: 'active' | 'members' | 'name'; label: string }[] = [
    { id: 'active', label: '最近活跃' },
    { id: 'members', label: '成员数' },
    { id: 'name', label: '名称' },
  ];

  return (
    <div className={styles.page}>
      <PageHead
        title={t('clu.title')}
        count={rows.length}
        action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('clu.new')}</button>}
      />
      <div className={styles.toolbar}>
        <input className={styles.search} placeholder={t('clu.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className={styles.pillTrack} style={{ marginLeft: 10 }}>
          {SORTS.map((x) => (
            <button key={x.id} type="button" className={`${styles.pill} ${sort === x.id ? styles.on : ''}`} onClick={() => setSort(x.id)}>{x.label}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <ViewToggle mode={view} onChange={setView} />
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t('clu.empty')} hint={t('clu.emptyHint')} action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('clu.new')}</button>} />
      ) : view === 'grid' ? (
        /* 网格视角：Gallery 封面卡（语义底色+自绘符号+状态点+密度条） */
        <div className={styles.coverGrid}>
          {rows.map((c) => {
            const tint = coverTint(c.id);
            return (
              <button key={c.id} type="button" className={styles.coverCard} onClick={() => onSelect(c.id)}>
                <span className={styles.coverTop} style={{ background: tint.bg, color: tint.fg }}>
                  {pendingC.has(c.id) ? <span className={styles.coverDot} title="有待裁决提案" /> : null}
                  <span className={styles.coverSymbol}><CoverSymbol members={c.member_ids.length} /></span>
                  <span className={styles.coverDensity}><DensityStrip days={density[c.id] ?? [0, 0, 0, 0, 0, 0, 0]} color={tint.fg} /></span>
                </span>
                <span className={styles.coverBody}>
                  <span className={styles.coverTitle}>{c.title}</span>
                  <span className={styles.coverSummary}>{c.description || '还没有描述。'}</span>
                  <span className={styles.coverMeta}>{c.member_ids.length} 成员 · {rt(c.updated_at)}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* 书架墙：书脊卡（色脊+密度+红点） */
        <div className={styles.shelfWall}>
          {rows.map((c) => {
            const tint = coverTint(c.id);
            return (
              <button key={c.id} type="button" className={styles.spineCard} onClick={() => onSelect(c.id)}>
                <span className={styles.spineEdge} style={{ background: tint.fg }} />
                <span className={styles.spineBody}>
                  <span className={styles.spineTitle}>{c.title}</span>
                  <span className={styles.spineDesc}>{c.description || '还没有描述。'}</span>
                  <span className={styles.coverMeta}>{c.member_ids.length} 成员 · 创建于 {c.created_at.slice(0, 7)} · {rt(c.updated_at)}</span>
                </span>
                <span className={styles.spineSide}>
                  {pendingC.has(c.id) ? <span className={styles.coverDot} title="有待裁决提案" /> : null}
                  <DensityStrip days={density[c.id] ?? [0, 0, 0, 0, 0, 0, 0]} color={tint.fg} />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ContextCollection({
  contexts, onNew, onSelect,
}: {
  contexts: ContextIndexEntry[];
  onNew: () => void;
  onSelect: (id: string) => void;
}) {
  const t = useT();
  const rt = useRelativeTime();
  const [q, setQ] = useState('');
  const [view, setView] = useViewMode('contexts');
  const rows = useMemo(
    () => contexts.filter((c) => !q.trim()
      || c.title.toLowerCase().includes(q.trim().toLowerCase())
      || c.subject.toLowerCase().includes(q.trim().toLowerCase())),
    [contexts, q],
  );
  return (
    <div className={styles.page}>
      <PageHead
        title={t('ctx.title')}
        count={rows.length}
        action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('ctx.new')}</button>}
      />
      <div className={styles.toolbar}>
        <input className={styles.search} placeholder={t('ctx.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <ViewToggle mode={view} onChange={setView} />
      </div>
      {view === 'grid' ? (
        rows.length === 0 ? (
          <EmptyState title={t('ctx.empty')} hint={t('ctx.emptyHint')} action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('ctx.new')}</button>} />
        ) : (
          <div className={styles.gridView}>
            {rows.map((c) => (
              <GridCard
                key={c.id}
                glyph={<Glyph kind="context" />}
                typeLabel={`${c.subject} · ${c.scope}`}
                title={c.title}
                time={t('common.members', { n: c.member_ids.length })}
                onClick={() => onSelect(c.id)}
              />
            ))}
          </div>
        )
      ) : (
        <>
          <ListHeader cols={[t('cols.name'), t('cols.subjectScope'), t('cols.updated')]} />
          <div className={styles.list}>
            {rows.length === 0 ? (
              <EmptyState title={t('ctx.empty')} hint={t('ctx.emptyHint')} action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('ctx.new')}</button>} />
            ) : rows.map((c) => (
              <button key={c.id} type="button" className={styles.listRow} onClick={() => onSelect(c.id)}>
                <span className={styles.rowGlyph}><Glyph kind="context" /></span>
                <span className={styles.rowTitle}>{c.title}</span>
                <span className={styles.rowType}>{c.subject} · {c.scope}</span>
                <span className={styles.rowTime}>{t('common.members', { n: c.member_ids.length })} · {rt(c.updated_at)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

