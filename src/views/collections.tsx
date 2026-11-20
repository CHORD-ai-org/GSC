import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ITEM_GLYPHS, ITEM_LABELS, OBJECT_TYPES, RAW_TYPES } from '../lib/items.ts';
import type { ItemDTO } from '../lib/items.ts';
import type { ContextIndexEntry } from './pages.tsx';
import type { ClusterIndexEntry } from './detail.tsx';
import { BadgeRow, MemberBadge } from '../components/SemTag.tsx';
import { relativeTime } from '../lib/format.ts';
import styles from './views.module.css';

export type ItemBadges = Record<string, { kind: 'cluster' | 'context'; title: string }[]>;

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
  if (!badges?.length) return null;
  return (
    <div className={styles.rowBadges}>
      {badges.slice(0, 2).map((b) => <MemberBadge key={`${b.kind}-${b.title}`} kind={b.kind} title={b.title} />)}
    </div>
  );
}

export function RawCollection({
  items, badges, onNew, onSelect,
}: {
  items: ItemDTO[];
  badges?: ItemBadges;
  onNew: () => void;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const rows = useMemo(
    () => items.filter((i) => i.type.startsWith('raw.'))
      .filter((i) => type === 'all' || i.type === type)
      .filter((i) => matches(i, q)),
    [items, q, type],
  );
  return (
    <div className={styles.page}>
      <PageHead
        title="Raw Information"
        count={rows.length}
        action={<button type="button" className={styles.primaryButton} onClick={onNew}>+ Add</button>}
      />
      <p className={styles.pageSub}>Manage original information and its sources.</p>
      <div className={styles.toolbar}>
        <input className={styles.search} placeholder="Search information..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All Types</option>
          {RAW_TYPES.map((t) => <option key={t} value={t}>{ITEM_LABELS[t]}</option>)}
        </select>
      </div>
      <ListHeader cols={['Name', 'Type · Source', 'Updated']} />
      <div className={styles.list}>
        {rows.length === 0 ? (
          <div className={styles.emptyLine}>No raw information yet. Use + Add to capture the first item.</div>
        ) : rows.map((item) => (
          <button key={item.id} type="button" className={styles.listRow} onClick={() => onSelect(item.id)}>
            <span className={styles.rowGlyph}>{ITEM_GLYPHS[item.type]}</span>
            <span className={styles.rowTitle}>{item.title}</span>
            <span className={styles.rowType}>{ITEM_LABELS[item.type]}{item.source_label ? ` · ${item.source_label}` : ''}</span>
            <RowBadges badges={badges?.[item.id]} />
            <span className={styles.rowTime}>{relativeTime(item.updated_at)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const OBJECT_TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'object.concept', label: 'Concepts' },
  { id: 'object.decision', label: 'Decisions' },
  { id: 'object.methodology', label: 'Methodologies' },
  { id: 'object.hypothesis', label: 'Hypotheses' },
];

export function ObjectCollection({
  items, sourceCounts, badges, onNew, onSelect,
}: {
  items: ItemDTO[];
  sourceCounts: Record<string, number>;
  badges?: ItemBadges;
  onNew: () => void;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const rows = useMemo(
    () => items.filter((i) => (OBJECT_TYPES as readonly string[]).includes(i.type))
      .filter((i) => tab === 'all' || i.type === tab)
      .filter((i) => matches(i, q)),
    [items, q, tab],
  );
  return (
    <div className={styles.page}>
      <PageHead
        title="Structured Objects"
        count={rows.length}
        action={<button type="button" className={styles.primaryButton} onClick={onNew}>+ Create</button>}
      />
      <p className={styles.pageSub}>Explore and manage your structured knowledge.</p>
      <div className={styles.toolbar}>
        <input className={styles.search} placeholder="Search objects..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className={styles.tabRow}>
        {OBJECT_TABS.map((t) => (
          <button key={t.id} type="button" className={`${styles.tab} ${tab === t.id ? styles.on : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <ListHeader cols={['Name', 'Type · Sources', 'Updated']} />
      <div className={styles.list}>
        {rows.length === 0 ? (
          <div className={styles.emptyLine}>No structured objects yet. Use + Create to add one.</div>
        ) : rows.map((item) => (
          <button key={item.id} type="button" className={styles.listRow} onClick={() => onSelect(item.id)}>
            <span className={styles.rowGlyph}>{ITEM_GLYPHS[item.type]}</span>
            <span className={styles.rowTitle}>{item.title}</span>
            <span className={styles.rowType}>{ITEM_LABELS[item.type]} · {sourceCounts[item.id] ?? 0} sources</span>
            <RowBadges badges={badges?.[item.id]} />
            <span className={styles.rowTime}>{relativeTime(item.updated_at)}</span>
          </button>
        ))}
      </div>
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
  const [q, setQ] = useState('');
  const rows = useMemo(
    () => clusters.filter((c) => !q.trim()
      || c.title.toLowerCase().includes(q.trim().toLowerCase())
      || c.description.toLowerCase().includes(q.trim().toLowerCase())),
    [clusters, q],
  );
  return (
    <div className={styles.page}>
      <PageHead
        title="Clusters"
        count={rows.length}
        action={<button type="button" className={styles.primaryButton} onClick={onNew}>+ New Cluster</button>}
      />
      <p className={styles.pageSub}>Groups of related information — association, not a view.</p>
      <div className={styles.toolbar}>
        <input className={styles.search} placeholder="Find a cluster..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ListHeader cols={['Name', 'Description', 'Members · Updated']} />
      <div className={styles.list}>
        {rows.length === 0 ? (
          <div className={styles.emptyLine}>No clusters yet. Use + New Cluster to group related Chunks.</div>
        ) : rows.map((c) => (
          <button key={c.id} type="button" className={styles.listRow} onClick={() => onSelect(c.id)}>
            <span className={styles.rowGlyph}>CLU</span>
            <span className={styles.rowTitle}>{c.title}</span>
            <span className={styles.rowType}>{c.description || '—'}</span>
            <span className={styles.rowTime}>{c.member_ids.length} members · {relativeTime(c.updated_at)}</span>
          </button>
        ))}
      </div>
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
  const [q, setQ] = useState('');
  const rows = useMemo(
    () => contexts.filter((c) => !q.trim()
      || c.title.toLowerCase().includes(q.trim().toLowerCase())
      || c.subject.toLowerCase().includes(q.trim().toLowerCase())),
    [contexts, q],
  );
  return (
    <div className={styles.page}>
      <PageHead
        title="Contexts"
        count={rows.length}
        action={<button type="button" className={styles.primaryButton} onClick={onNew}>+ New Context</button>}
      />
      <p className={styles.pageSub}>Organize information into reusable contextual views.</p>
      <div className={styles.toolbar}>
        <input className={styles.search} placeholder="Find a context..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ListHeader cols={['Name', 'Subject · Scope', 'Members · Updated']} />
      <div className={styles.list}>
        {rows.length === 0 ? (
          <div className={styles.emptyLine}>No context views yet. Use + New Context to create one.</div>
        ) : rows.map((c) => (
          <button key={c.id} type="button" className={styles.listRow} onClick={() => onSelect(c.id)}>
            <span className={styles.rowGlyph}>CTX</span>
            <span className={styles.rowTitle}>{c.title}</span>
            <span className={styles.rowType}>{c.subject} · {c.scope}</span>
            <span className={styles.rowTime}>{c.member_ids.length} members · {relativeTime(c.updated_at)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

