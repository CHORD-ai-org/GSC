import { GscLogo } from '../components/GscLogo.tsx';
import { useT } from '../lib/i18n.tsx';
import styles from './shell.module.css';

export type ViewId =
  | 'start' | 'overview' | 'recently' | 'raw' | 'objects' | 'lightup'
  | 'clusters' | 'contexts' | 'sync' | 'settings' | 'docs' | 'canvas' | 'user';

type IconName = 'home' | 'grid' | 'clock' | 'file' | 'box' | 'cluster' | 'layers' | 'sync' | 'export' | 'gear' | 'book' | 'user';

function Icon({ name }: { name: IconName }) {
  const common = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home':
      return <svg {...common}><path d="M2.5 7.5L8 2.8l5.5 4.7V13H2.5z" /><path d="M6.2 13V9.2h3.6V13" /></svg>;
    case 'grid':
      return <svg {...common}><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>;
    case 'clock':
      return <svg {...common}><circle cx="8" cy="8" r="6" /><path d="M8 4.6V8l2.4 1.6" /></svg>;
    case 'file':
      return <svg {...common}><path d="M4 2h5l3 3v9H4z" /><path d="M9 2v3h3" /><path d="M6 8.5h4M6 11h4" /></svg>;
    case 'box':
      return <svg {...common}><path d="M8 2l5 2.6v5.8L8 13l-5-2.6V4.6z" /><path d="M3 4.6L8 7.2l5-2.6M8 7.2V13" /></svg>;
    case 'cluster':
      return <svg {...common}><circle cx="4.5" cy="5" r="2" /><circle cx="11.5" cy="5" r="2" /><circle cx="8" cy="11.5" r="2" /><path d="M6 6.2L7.2 9.7M10 6.2L8.8 9.7" /></svg>;
    case 'layers':
      return <svg {...common}><path d="M8 2l6 3-6 3-6-3z" /><path d="M2 8.6l6 3 6-3" /></svg>;
    case 'sync':
      return <svg {...common}><path d="M13 6.5A5.2 5.2 0 0 0 3.6 5.2" /><path d="M3 2.8v2.6h2.6" /><path d="M3 9.5a5.2 5.2 0 0 0 9.4 1.3" /><path d="M13 13.2v-2.6h-2.6" /></svg>;
    case 'export':
      return <svg {...common}><path d="M8 2.5v7M5 6.5l3 3 3-3" /><path d="M3 10.5v2h10v-2" /></svg>;
    case 'gear':
      return <svg {...common}><circle cx="8" cy="8" r="2.4" /><path d="M8 2.2v1.6M8 12.2v1.6M2.2 8h1.6M12.2 8h1.6M3.9 3.9l1.1 1.1M11 11l1.1 1.1M12.1 3.9L11 5M5 11l-1.1 1.1" /></svg>;
    case 'book':
      return <svg {...common}><path d="M2.5 3.2c1.8-.8 3.6-.8 5.5.4v9.2c-1.9-1.2-3.7-1.2-5.5-.4z" /><path d="M13.5 3.2c-1.8-.8-3.6-.8-5.5.4v9.2c1.9-1.2 3.7-1.2 5.5-.4z" /></svg>;
    case 'user':
      return <svg {...common}><circle cx="8" cy="5.5" r="2.5" /><path d="M3 13.5c0-2.2 2.2-3.5 5-3.5s5 1.3 5 3.5" /></svg>;
  }
}

type NavEntry = { id: ViewId; labelKey: string; icon: IconName };

const GROUPS: { labelKey: string; items: NavEntry[] }[] = [
  { labelKey: 'nav.general', items: [
    { id: 'start', labelKey: 'nav.start', icon: 'home' },
    { id: 'overview', labelKey: 'nav.overview', icon: 'grid' },
    { id: 'recently', labelKey: 'nav.recently', icon: 'clock' },
  ] },
  { labelKey: 'nav.information', items: [
    { id: 'raw', labelKey: 'nav.raw', icon: 'file' },
    { id: 'objects', labelKey: 'nav.objects', icon: 'box' },
  ] },
  { labelKey: 'nav.organization', items: [
    { id: 'clusters', labelKey: 'nav.clusters', icon: 'cluster' },
    { id: 'contexts', labelKey: 'nav.contexts', icon: 'layers' },
    { id: 'sync', labelKey: 'nav.sync', icon: 'sync' },
  ] },
];

const FOOTER: NavEntry[] = [
  { id: 'settings', labelKey: 'nav.settings', icon: 'gear' },
  { id: 'docs', labelKey: 'nav.docs', icon: 'book' },
];

/* 左下角 user 入口（avatar chip）→ 用户页 */
function UserChip({ active, workspaceName, onNavigate }: { active: boolean; workspaceName: string; onNavigate: (id: ViewId) => void }) {
  const t = useT();
  const initial = (workspaceName.trim()[0] ?? 'G').toUpperCase();
  return (
    <button
      type="button"
      className={`${styles.userChip} ${active ? styles.active : ''}`}
      onClick={() => onNavigate('user')}
      aria-current={active ? 'page' : undefined}
    >
      <span className={styles.userAvatar} aria-hidden="true">{initial}</span>
      <span className={styles.userChipText}>
        <span className={styles.userChipName}>{workspaceName}</span>
        <span className={styles.userChipSub}>{t('user.localAccount')}</span>
      </span>
    </button>
  );
}

function NavButton({ entry, active, onNavigate }: { entry: NavEntry; active: boolean; onNavigate: (id: ViewId) => void }) {
  const t = useT();
  return (
    <button
      type="button"
      className={`${styles.navItem} ${active ? styles.active : ''}`}
      onClick={() => onNavigate(entry.id)}
      aria-current={active ? 'page' : undefined}
    >
      <Icon name={entry.icon} />
      {t(entry.labelKey)}
    </button>
  );
}

export function Sidebar({ view, onNavigate, workspaceName }: { view: ViewId; onNavigate: (id: ViewId) => void; workspaceName: string }) {
  const t = useT();
  return (
    <nav className={styles.sidebar}>
      <div className={styles.brand}>
        <GscLogo height={18} />
      </div>
      {GROUPS.map((group) => (
        <div className={styles.group} key={group.labelKey}>
          <div className={styles.groupLabel}>{t(group.labelKey)}</div>
          {group.items.map((entry) => (
            <NavButton key={entry.id} entry={entry} active={view === entry.id} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
      <div className={styles.footer}>
        <UserChip active={view === 'user'} workspaceName={workspaceName} onNavigate={onNavigate} />
        {FOOTER.map((entry) => (
          <NavButton key={entry.id} entry={entry} active={view === entry.id} onNavigate={onNavigate} />
        ))}
      </div>
    </nav>
  );
}
