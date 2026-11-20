import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './command.module.css';

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
}: {
  open: boolean;
  items: PaletteItem[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[cursor];
      if (item) {
        item.run();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

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
          {filtered.length === 0 ? (
            <div className={styles.empty}>无匹配结果</div>
          ) : grouped.map(([group, list]) => (
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
                    onMouseEnter={() => setCursor(filtered.indexOf(item))}
                    onClick={() => { item.run(); onClose(); }}
                  >
                    {item.icon ? <span className={styles.rowIcon}>{item.icon}</span> : null}
                    <span className={styles.rowLabel}>{item.label}</span>
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
