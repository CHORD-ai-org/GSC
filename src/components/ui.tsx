import type { ReactNode } from 'react';
import { useT } from '../lib/i18n.tsx';
import styles from './ui.module.css';

export function Button({
  children,
  onClick,
  primary,
  small,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  small?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      className={`${styles.btn} ${primary ? styles.primary : ''} ${small ? styles.small : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function SectionLabel({ title, count }: { title: string; count?: string }) {
  return (
    <div className={styles.sectionHead}>
      <span className={styles.tick} />
      <span>{title}</span>
      <span className={styles.rule} />
      {count ? <span className={styles.count}>{count}</span> : null}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyTitle}>{title}</div>
      <div>{hint}</div>
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </div>
  );
}

/* P0 INTERACTION_UX_PLAN: card shell for brand-card walls / provider cards. */
export function CardShell({
  selected, onClick, children, className,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const cls = `${styles.cardShell} ${selected ? styles.cardSelected : ''} ${className ?? ''}`;
  return onClick ? (
    <button type="button" className={cls} onClick={onClick}>{children}</button>
  ) : (
    <div className={cls}>{children}</div>
  );
}

/* P2 INTERACTION polish: keyboard hint bar for list pages. */
export function KeyHintBar() {
  const t = useT();
  return (
    <div className={styles.keyHintBar}>
      <span><kbd className={styles.kbd}>↑↓</kbd> {t('keys.nav')}</span>
      <span><kbd className={styles.kbd}>↵</kbd> {t('keys.open')}</span>
      <span><kbd className={styles.kbd}>esc</kbd> {t('keys.back')}</span>
      <span><kbd className={styles.kbd}>Ctrl K</kbd> {t('docs.hotkeys')}</span>
    </div>
  );
}

export function Subhead({ title, count }: { title: string; count?: number }) {
  return (
    <div className={styles.subhead}>
      <span>{title}</span>
      <span className={styles.rule} />
      {count !== undefined ? <span className={styles.count}>{count}</span> : null}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}
