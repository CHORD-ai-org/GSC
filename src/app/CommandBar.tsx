import styles from './shell.module.css';

export function CommandBar({
  query,
  onQuery,
  onNew,
  panelOpen,
  onTogglePanel,
}: {
  query: string;
  onQuery: (value: string) => void;
  onNew: () => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
}) {
  return (
    <div className={styles.commandBar}>
      <div className={styles.commandInput}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="搜索或输入操作"
          aria-label="搜索或输入操作"
        />
      </div>
      <button type="button" className={styles.commandButton} onClick={onNew} title="新建" aria-label="新建">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3.5v9M3.5 8h9" /></svg>
      </button>
      <button
        type="button"
        className={`${styles.commandButton} ${panelOpen ? styles.on : ''}`}
        onClick={onTogglePanel}
        title="切换面板"
        aria-label="切换面板"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="3" width="11" height="10" rx="1.5" /><path d="M10 3v10" /></svg>
      </button>
    </div>
  );
}
