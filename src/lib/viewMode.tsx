import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type { ViewMode } from './prefs.ts';
import { loadViewMode, saveViewMode } from './prefs.ts';
import styles from '../components/ui.module.css';

/* 网格视角: per-page list ⇄ grid toggle with persisted preference. */
export function useViewMode(page: string): [ViewMode, (m: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => {
    /* CL1：?view=list|grid 深链（可分享视角），无参回落持久化偏好。 */
    const q = new URLSearchParams(window.location.search).get('view');
    if (q === 'list' || q === 'grid' || q === 'relations' || q === 'timeline' || q === 'spatial') return q;
    return loadViewMode(page);
  });
  const change = useCallback((m: ViewMode) => {
    setMode(m);
    saveViewMode(page, m);
  }, [page]);
  return [mode, change];
}

export function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return <ViewSwitcher mode={mode} onChange={onChange} modes={['list', 'grid']} />;
}

/* V2 (M2) multi-projection switcher: list/grid render modes + relations/timeline
   read-only projections + spatial placeholder (V4). */
export function ViewSwitcher({
  mode, onChange, modes = ['list', 'grid', 'relations', 'timeline', 'spatial'],
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
  modes?: ViewMode[];
}) {
  const icons: Record<ViewMode, { title: string; path: ReactNode; disabled?: boolean }> = {
    list: {
      title: '列表',
      path: <path d="M3 4h10M3 8h10M3 12h10" />,
    },
    grid: {
      title: '网格',
      path: <><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="9" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="2.5" y="9" width="4.5" height="4.5" rx="1" /><rect x="9" y="9" width="4.5" height="4.5" rx="1" /></>,
    },
    relations: {
      title: '关系',
      path: <><circle cx="4" cy="4" r="1.8" /><circle cx="12" cy="12" r="1.8" /><path d="M5.5 5.5L10.5 10.5" /></>,
    },
    timeline: {
      title: '时间线',
      path: <><path d="M3 8h10" /><circle cx="5" cy="8" r="1.4" /><circle cx="10.5" cy="8" r="1.4" /><path d="M4 12h8" /></>,
    },
    spatial: {
      title: '空间',
      path: <><rect x="2.5" y="3" width="5" height="4" rx="1" /><rect x="8.5" y="8" width="5" height="5" rx="1" /></>,
    },
  };
  return (
    <div className={styles.viewToggle} role="group" aria-label="view mode">
      {modes.map((m) => (
        <button
          key={m}
          type="button"
          disabled={icons[m].disabled}
          className={`${styles.viewButton} ${mode === m ? styles.on : ''}`}
          aria-label={`${m} view`}
          title={icons[m].title}
          onClick={() => onChange(m)}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">{icons[m].path}</svg>
        </button>
      ))}
    </div>
  );
}
