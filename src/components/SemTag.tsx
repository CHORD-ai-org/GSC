import type { ReactNode } from 'react';
import styles from './semtag.module.css';

export type SemKind = 'original' | 'confirmed' | 'machine' | 'alert';

const LABELS: Record<SemKind, string> = {
  original: '原文',
  confirmed: '确认',
  machine: '机器',
  alert: '异常',
};

/** State chip (D-055). Color never carries meaning alone — the label is always shown. */
export function SemTag({ kind, label }: { kind: SemKind; label?: string }) {
  return (
    <span className={`${styles.tag} ${styles[kind]}`}>
      <span className={styles.dot} />
      {label ?? LABELS[kind]}
    </span>
  );
}

export function SemLegend() {
  return (
    <div className={styles.legend}>
      {(Object.keys(LABELS) as SemKind[]).map((kind) => (
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
