import type { ReactNode } from 'react';
import styles from './semtag.module.css';
import { useT } from '../lib/i18n.tsx';

export type SemKind = 'original' | 'confirmed' | 'machine' | 'alert';

const LABEL_KEYS: Record<SemKind, string> = {
  original: 'sem.original',
  confirmed: 'sem.confirmed',
  machine: 'sem.machine',
  alert: 'sem.alert',
};

/** State chip (D-055). Color never carries meaning alone — the label is always shown. */
export function SemTag({ kind, label }: { kind: SemKind; label?: string }) {
  const t = useT();
  return (
    <span className={`${styles.tag} ${styles[kind]}`}>
      <span className={styles.dot} />
      {label ?? t(LABEL_KEYS[kind])}
    </span>
  );
}

export function SemLegend() {
  return (
    <div className={styles.legend}>
      {(Object.keys(LABEL_KEYS) as SemKind[]).map((kind) => (
        <SemTag key={kind} kind={kind} />
      ))}
    </div>
  );
}

/** Neutral membership badge (D-057): identity, not state. */
export function MemberBadge({ kind, title }: { kind: 'cluster' | 'context'; title: string }) {
  return (
    <span className={styles.badge} title={title}>
      {kind === 'cluster' ? '⊕' : '◈'} {title}
    </span>
  );
}

export function BadgeRow({ children }: { children: ReactNode }) {
  return <div className={styles.badgeRow}>{children}</div>;
}
