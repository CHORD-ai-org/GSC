import type { ReactNode } from 'react';
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

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyTitle}>{title}</div>
      <div>{hint}</div>
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
