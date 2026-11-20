import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ITEM_GLYPHS, ITEM_LABELS, OBJECT_TYPES, RAW_TYPES } from '../lib/items.ts';
import type { ItemDTO } from '../lib/items.ts';
import type { ContextIndexEntry } from './pages.tsx';
import type { ClusterIndexEntry } from './detail.tsx';
import { BadgeRow, MemberBadge } from '../components/SemTag.tsx';
import { EmptyState } from '../components/ui.tsx';
import { useToast } from '../components/Toast.tsx';
import { useViewMode, ViewToggle } from '../lib/viewMode.tsx';
import { useWindowed } from '../lib/useWindowed.ts';
import { Glyph } from '../components/Glyph.tsx';
import type { GlyphKind } from '../components/Glyph.tsx';
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

export function RawCollection({
  items, badges, tagDims, tagDimOptions, onNew, onSelect,
}: {
  items: ItemDTO[];
  badges?: ItemBadges;
  tagDims?: Record<string, string[]>;
  tagDimOptions?: string[];
  onNew: () => void;
  onSelect: (id: string) => void;
}) {
  const t = useT();
  const rt = useRelativeTime();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [dim, setDim] = useState('all');
  const [view, setView] = useViewMode('raw');
  const rows = useMemo(
    () => items.filter((i) => i.type.startsWith('raw.'))
      .filter((i) => type === 'all' || i.type === type)
      .filter((i) => dim === 'all' || (tagDims?.[i.id] ?? []).includes(dim))
      .filter((i) => matches(i, q)),
    [items, q, type, dim, tagDims],
  );
  const { visible: winRows, sentinelRef, hasMore } = useWindowed(rows);
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
        <ViewToggle mode={view} onChange={setView} />
      </div>
      {view === 'grid' ? (
        rows.length === 0 ? (
          <EmptyState title={t('raw.empty')} hint={t('raw.emptyHint')} action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('cols.add')}</button>} />
        ) : (
          <div className={styles.gridView}>
            {winRows.map((item) => (
              <GridCard
                key={item.id}
                glyph={<Glyph kind={item.type} />}
                typeLabel={`${ITEM_LABELS[item.type]}${item.source_label ? ` · ${item.source_label}` : ''}`}
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
            {rows.length === 0 ? (
              <EmptyState title={t('raw.empty')} hint={t('raw.emptyHint')} action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('cols.add')}</button>} />
            ) : winRows.map((item) => (
              <div key={item.id} className={styles.rowWrap}>
                <button type="button" className={styles.listRow} onClick={() => onSelect(item.id)}>
                  <span className={styles.rowGlyph}><Glyph kind={item.type} /></span>
                  <span className={styles.rowTitle}>{item.title}</span>
                  <span className={styles.rowTypeWrap}>
                    <span className={styles.rowType}>{ITEM_LABELS[item.type]}{item.source_label ? ` · ${item.source_label}` : ''}</span>
                    <RowBadges badges={badges?.[item.id]} />
                  </span>
                  <span className={styles.rowTime}>{rt(item.updated_at)}</span>
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
  items, sourceCounts, badges, tagDims, tagDimOptions, onNew, onSelect,
}: {
  items: ItemDTO[];
  sourceCounts: Record<string, number>;
  badges?: ItemBadges;
  tagDims?: Record<string, string[]>;
  tagDimOptions?: string[];
  onNew: () => void;
  onSelect: (id: string) => void;
}) {
  const t = useT();
  const rt = useRelativeTime();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [dim, setDim] = useState('all');
  const [view, setView] = useViewMode('objects');
  const rows = useMemo(
    () => items.filter((i) => (OBJECT_TYPES as readonly string[]).includes(i.type))
      .filter((i) => tab === 'all' || i.type === tab)
      .filter((i) => dim === 'all' || (tagDims?.[i.id] ?? []).includes(dim))
      .filter((i) => matches(i, q)),
    [items, q, tab, dim, tagDims],
  );
  const { visible: winRows, sentinelRef, hasMore } = useWindowed(rows);
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
        <ViewToggle mode={view} onChange={setView} />
      </div>
      <div className={styles.tabRow}>
        {OBJECT_TABS.map((tb) => (
          <button key={tb.id} type="button" className={`${styles.tab} ${tab === tb.id ? styles.on : ''}`} onClick={() => setTab(tb.id)}>
            {t(tb.labelKey)}
          </button>
        ))}
      </div>
      {view === 'grid' ? (
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
            {rows.length === 0 ? (
              <EmptyState title={t('obj.empty')} hint={t('obj.emptyHint')} action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('cols.add')}</button>} />
            ) : winRows.map((item) => (
              <div key={item.id} className={styles.rowWrap}>
                <button type="button" className={styles.listRow} onClick={() => onSelect(item.id)}>
                  <span className={styles.rowGlyph}><Glyph kind={item.type} /></span>
                  <span className={styles.rowTitle}>{item.title}</span>
                  <span className={styles.rowTypeWrap}>
                    <span className={styles.rowType}>{ITEM_LABELS[item.type]} · {t('obj.sources', { n: sourceCounts[item.id] ?? 0 })}</span>
                    <RowBadges badges={badges?.[item.id]} />
                  </span>
                  <span className={styles.rowTime}>{rt(item.updated_at)}</span>
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

export function ClusterCollection({
  clusters, onNew, onSelect,
}: {
  clusters: ClusterIndexEntry[];
  onNew: () => void;
  onSelect: (id: string) => void;
}) {
  const t = useT();
  const rt = useRelativeTime();
  const [q, setQ] = useState('');
  const [view, setView] = useViewMode('clusters');
  const rows = useMemo(
    () => clusters.filter((c) => !q.trim()
      || c.title.toLowerCase().includes(q.trim().toLowerCase())
      || c.description.toLowerCase().includes(q.trim().toLowerCase())),
    [clusters, q],
  );
  return (
    <div className={styles.page}>
      <PageHead
        title={t('clu.title')}
        count={rows.length}
        action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('clu.new')}</button>}
      />
      <div className={styles.toolbar}>
        <input className={styles.search} placeholder={t('clu.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <ViewToggle mode={view} onChange={setView} />
      </div>
      {view === 'grid' ? (
        rows.length === 0 ? (
          <EmptyState title={t('clu.empty')} hint={t('clu.emptyHint')} action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('clu.new')}</button>} />
        ) : (
          <div className={styles.gridView}>
            {rows.map((c) => (
              <GridCard
                key={c.id}
                glyph={<Glyph kind="cluster" />}
                typeLabel={t('common.members', { n: c.member_ids.length })}
                title={c.title}
                time={rt(c.updated_at)}
                onClick={() => onSelect(c.id)}
              />
            ))}
          </div>
        )
      ) : (
        <>
          <ListHeader cols={[t('cols.name'), t('cols.desc'), t('cols.membersUpdated')]} />
          <div className={styles.list}>
            {rows.length === 0 ? (
              <EmptyState title={t('clu.empty')} hint={t('clu.emptyHint')} action={<button type="button" className={styles.primaryButton} onClick={onNew}>{t('clu.new')}</button>} />
            ) : rows.map((c) => (
              <button key={c.id} type="button" className={styles.listRow} onClick={() => onSelect(c.id)}>
                <span className={styles.rowGlyph}><Glyph kind="cluster" /></span>
                <span className={styles.rowTitle}>{c.title}</span>
                <span className={styles.rowType}>{c.description || '—'}</span>
                <span className={styles.rowTime}>{t('common.members', { n: c.member_ids.length })} · {rt(c.updated_at)}</span>
              </button>
            ))}
          </div>
        </>
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

