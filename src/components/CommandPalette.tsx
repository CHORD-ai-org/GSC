import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as api from '../services/api.ts';
import type { SearchHit } from '../services/api.ts';
import styles from './command.module.css';

const RECENT_KEY = 'gsc.search.recent';
function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[]; } catch { return []; }
}
function pushRecent(q: string) {
  try {
    const list = [q, ...loadRecent().filter((x) => x !== q)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

function Highlighted({ text, q }: { text: string; q: string }) {
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0 || !q) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'transparent', color: 'inherit', fontWeight: 700, textDecoration: 'underline' }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

/* P4 INTERACTION_UX_PLAN: global command palette (Ctrl+K).
   Three action kinds: jump to page, open an item, run a command. */

export type PaletteItem = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  run: () => void;
};

export function CommandPalette({
  open,
  items,
  onClose,
  onOpenHit,
  onCreateFromQuery,
}: {
  open: boolean;
  items: PaletteItem[];
  onClose: () => void;
  onOpenHit?: (hit: SearchHit) => void;
  onCreateFromQuery?: (q: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* T201: debounced global search */
  useEffect(() => {
    setRecent(loadRecent());
    const q = query.trim();
    if (q.length < 1) { setHits([]); return; }
    const timer = setTimeout(() => {
      api.search(q).then((r) => setHits(r.hits)).catch(() => setHits([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q) || (i.hint ?? '').toLowerCase().includes(q));
  }, [items, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of filtered) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [filtered]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => { setCursor(0); }, [query]);

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = rows[cursor];
      if (item) {
        item.run();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  /* T201: search hits become first-class palette rows when query is live */
  const searching = query.trim().length > 0;
  const hitItems: PaletteItem[] = hits.map((h) => ({
    id: `hit-${h.id}-${h.kind}`,
    group: h.group === 'items' ? '信息' : h.group === 'objects' ? '对象' : h.group === 'clusters' ? '关联组' : '上下文',
    label: h.title,
    hint: h.snippet,
    run: () => { pushRecent(query.trim()); onOpenHit?.(h); },
  }));
  const createItem: PaletteItem | null = searching && hits.length === 0 ? {
    id: 'hit-create',
    group: '动作',
    label: `新建为信息：“${query.trim()}”`,
    run: () => { pushRecent(query.trim()); onCreateFromQuery?.(query.trim()); },
  } : null;
  const rows: PaletteItem[] = searching
    ? [...hitItems, ...(createItem ? [createItem] : []), ...filtered.slice(0, 6)]
    : (filtered.length ? filtered : recent.map((q) => ({
        id: `recent-${q}`,
        group: '最近搜索',
        label: q,
        run: () => setQuery(q),
      })));

  const groupedRows: [string, PaletteItem[]][] = (() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of rows) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  })();

  let flatIndex = -1;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className={styles.inputRow}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="搜索条目、页面或命令…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className={styles.kbd}>esc</kbd>
        </div>
        <div className={styles.list} ref={listRef}>
          {rows.length === 0 ? (
            <div className={styles.empty}>无匹配结果</div>
          ) : groupedRows.map(([group, list]) => (
            <div key={group}>
              <div className={styles.groupLabel}>{group}</div>
              {list.map((item) => {
                flatIndex += 1;
                const active = flatIndex === cursor;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.row} ${active ? styles.active : ''}`}
                    onMouseEnter={() => setCursor(rows.indexOf(item))}
                    onClick={() => {
                      if (searching && item.id.startsWith('hit-') && item.id !== 'hit-create') pushRecent(query.trim());
                      item.run();
                      onClose();
                    }}
                  >
                    {item.icon ? <span className={styles.rowIcon}>{item.icon}</span> : null}
                    <span className={styles.rowLabel}>{searching ? <Highlighted text={item.label} q={query.trim()} /> : item.label}</span>
                    {item.hint ? <span className={styles.rowHint}>{item.hint}</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className={styles.foot}>
          <span><kbd className={styles.kbd}>↑↓</kbd> 选择</span>
          <span><kbd className={styles.kbd}>↵</kbd> 打开</span>
          <span><kbd className={styles.kbd}>esc</kbd> 关闭</span>
        </div>
      </div>
    </div>
  );
}
