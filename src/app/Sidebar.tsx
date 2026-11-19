import { GscLogo } from '../components/GscLogo.tsx';
import styles from './shell.module.css';

export type ViewId =
  | 'overview' | 'recently' | 'raw' | 'objects'
  | 'contexts' | 'sync' | 'settings' | 'docs' | 'canvas';

type IconName = 'grid' | 'clock' | 'file' | 'box' | 'layers' | 'sync' | 'gear' | 'book';

function Icon({ name }: { name: IconName }) {
  const common = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'grid':
      return <svg {...common}><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>;
    case 'clock':
      return <svg {...common}><circle cx="8" cy="8" r="6" /><path d="M8 4.6V8l2.4 1.6" /></svg>;
    case 'file':
      return <svg {...common}><path d="M4 2h5l3 3v9H4z" /><path d="M9 2v3h3" /><path d="M6 8.5h4M6 11h4" /></svg>;
    case 'box':
      return <svg {...common}><path d="M8 2l5 2.6v5.8L8 13l-5-2.6V4.6z" /><path d="M3 4.6L8 7.2l5-2.6M8 7.2V13" /></svg>;
    case 'layers':
      return <svg {...common}><path d="M8 2l6 3-6 3-6-3z" /><path d="M2 8.6l6 3 6-3" /></svg>;
    case 'sync':
      return <svg {...common}><path d="M13 6.5A5.2 5.2 0 0 0 3.6 5.2" /><path d="M3 2.8v2.6h2.6" /><path d="M3 9.5a5.2 5.2 0 0 0 9.4 1.3" /><path d="M13 13.2v-2.6h-2.6" /></svg>;
    case 'gear':
      return <svg {...common}><circle cx="8" cy="8" r="2.4" /><path d="M8 2.2v1.6M8 12.2v1.6M2.2 8h1.6M12.2 8h1.6M3.9 3.9l1.1 1.1M11 11l1.1 1.1M12.1 3.9L11 5M5 11l-1.1 1.1" /></svg>;
    case 'book':
      return <svg {...common}><path d="M2.5 3.2c1.8-.8 3.6-.8 5.5.4v9.2c-1.9-1.2-3.7-1.2-5.5-.4z" /><path d="M13.5 3.2c-1.8-.8-3.6-.8-5.5.4v9.2c1.9-1.2 3.7-1.2 5.5-.4z" /></svg>;
  }
}

type NavEntry = { id: ViewId; label: string; icon: IconName };

const GROUPS: { label: string; items: NavEntry[] }[] = [
  { label: 'GENERAL', items: [
    { id: 'overview', label: 'Overview', icon: 'grid' },
    { id: 'recently', label: 'Recently', icon: 'clock' },
  ] },
  { label: 'INFORMATION', items: [
    { id: 'raw', label: 'Raw Information', icon: 'file' },
    { id: 'objects', label: 'Structured Objects', icon: 'box' },
  ] },
  { label: 'ORGANIZATION', items: [
    { id: 'contexts', label: 'Contexts', icon: 'layers' },
    { id: 'sync', label: 'Sync', icon: 'sync' },
  ] },
];

const FOOTER: NavEntry[] = [
  { id: 'settings', label: 'Settings', icon: 'gear' },
  { id: 'docs', label: 'Documentation', icon: 'book' },
];

function NavButton({ entry, active, onNavigate }: { entry: NavEntry; active: boolean; onNavigate: (id: ViewId) => void }) {
  return (
    <button
      type="button"
      className={`${styles.navItem} ${active ? styles.active : ''}`}
      onClick={() => onNavigate(entry.id)}
      aria-current={active ? 'page' : undefined}
    >
      <Icon name={entry.icon} />
      {entry.label}
    </button>
  );
}

export function Sidebar({ view, onNavigate }: { view: ViewId; onNavigate: (id: ViewId) => void }) {
  return (
    <nav className={styles.sidebar}>
      <div className={styles.brand}>
        <GscLogo height={18} />
        <span className={styles.brandName}>GSC</span>
      </div>
      {GROUPS.map((group) => (
        <div className={styles.group} key={group.label}>
          <div className={styles.groupLabel}>{group.label}</div>
          {group.items.map((entry) => (
            <NavButton key={entry.id} entry={entry} active={view === entry.id} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
      <div className={styles.footer}>
        {FOOTER.map((entry) => (
          <NavButton key={entry.id} entry={entry} active={view === entry.id} onNavigate={onNavigate} />
        ))}
      </div>
    </nav>
  );
}
