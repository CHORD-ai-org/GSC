import styles from './activity.module.css';
import { useT } from '../lib/i18n.tsx';
import type { DayCell } from '../lib/activity.ts';
import { SemTag } from './SemTag.tsx';

/**
 * GitHub-contributions-style density map (D-056): 12 weeks, intensity by
 * activity; event segments colored by the semantic dictionary. Click a day
 * to filter Recently.
 */
export function ActivityMap({ cells, onPickDay }: { cells: DayCell[]; onPickDay: (day: string) => void }) {
  const t = useT();
  const max = Math.max(1, ...cells.map((c) => c.total));
  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div>
      <div className={styles.map}>
        {weeks.map((week, wi) => (
          <div className={styles.col} key={wi}>
            {week.map((cell) => (
              <button
                key={cell.day}
                type="button"
                className={styles.cell}
                style={{ opacity: cell.total === 0 ? 0.25 : 0.35 + (cell.total / max) * 0.65 }}
                title={t('activity.tooltip', { day: cell.day, n1: cell.created, n2: cell.updated, n3: cell.pending })}
                onClick={() => onPickDay(cell.day)}
              >
                {cell.created > 0 ? <span className={styles.segCreated} /> : null}
                {cell.updated > 0 ? <span className={styles.segUpdated} /> : null}
                {cell.pending > 0 ? <span className={styles.segPending} /> : null}
                {cell.total === 0 ? <span className={styles.segEmpty} /> : null}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.legendRow}>
        <SemTag kind="original" label={t('activity.added')} />
        <SemTag kind="confirmed" label={t('activity.modified')} />
        <SemTag kind="machine" label={t('activity.pending')} />
        <span className={styles.hint}>{t('activity.hint')}</span>
      </div>
    </div>
  );
}
