import { useCallback, useState } from 'react';
import type { ViewMode } from './prefs.ts';
import { loadViewMode, saveViewMode } from './prefs.ts';
import styles from '../components/ui.module.css';

/* 网格视角: per-page list ⇄ grid toggle with persisted preference. */
export function useViewMode(page: string): [ViewMode, (m: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => loadViewMode(page));
  const change = useCallback((m: ViewMode) => {
    setMode(m);
    saveViewMode(page, m);
  }, [page]);
  return [mode, change];
}

export function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className={styles.viewToggle} role="group" aria-label="view mode">
      <button
        type="button"
        className={`${styles.viewButton} ${mode === 'list' ? styles.on : ''}`}
        aria-label="list view"
        title="列表"
        onClick={() => onChange('list')}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 4h10M3 8h10M3 12h10" /></svg>
      </button>
      <button
        type="button"
        className={`${styles.viewButton} ${mode === 'grid' ? styles.on : ''}`}
        aria-label="grid view"
        title="网格"
        onClick={() => onChange('grid')}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="9" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="2.5" y="9" width="4.5" height="4.5" rx="1" /><rect x="9" y="9" width="4.5" height="4.5" rx="1" /></svg>
      </button>
    </div>
  );
}
