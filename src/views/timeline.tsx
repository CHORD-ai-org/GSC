import { useEffect, useMemo, useState } from 'react';
import type { ItemDTO } from '../lib/items.ts';
import type { EventDTO, EventAction } from '../lib/events.ts';
import { listEventsFor } from '../services/api.ts';
import { useT } from '../lib/i18n.tsx';
import styles from './views.module.css';

const ACTION_KEY: Partial<Record<EventAction, string>> = {
  created: 'tl.created',
  updated: 'tl.updated',
  status_changed: 'tl.status',
  relation_added: 'tl.relAdded',
  relation_removed: 'tl.relRemoved',
  opened: 'tl.opened',
  proposed: 'tl.proposed',
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function dayLabel(iso: string, t: (k: string, p?: Record<string, string | number>) => string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (dayKey(iso) === today.toISOString().slice(0, 10)) return t('tl.today');
  if (dayKey(iso) === yesterday.toISOString().slice(0, 10)) return t('tl.yesterday');
  return `${d.getMonth() + 1}-${d.getDate()}`;
}

function clockOf(iso: string): string {
  return iso.slice(11, 16);
}

/* V2 (M2) timeline projection: read-only event stream over the current rows.
   Same data, another projection — zero writes, zero copies. */
export function TimelineView({
  rows, onOpenItem,
}: {
  rows: ItemDTO[];
  onOpenItem: (id: string) => void;
}) {
  const t = useT();
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'empty'>('loading');
  const ids = useMemo(() => rows.slice(0, 200).map((r) => r.id), [rows]);
  const idsKey = ids.join(',');
  const titles = useMemo(() => new Map(rows.map((r) => [r.id, r.title])), [rows]);

  useEffect(() => {
    if (!idsKey) {
      setEvents([]);
      setPhase('empty');
      return;
    }
    let cancelled = false;
    setPhase('loading');
    listEventsFor(idsKey.split(','), { limit: 500 })
      .then((r) => {
        if (cancelled) return;
        setEvents(r.events);
        setPhase(r.events.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        if (!cancelled) setPhase('empty');
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const groups = useMemo(() => {
    const out: { day: string; items: EventDTO[] }[] = [];
    for (const e of events) {
      const key = dayKey(e.at);
      const last = out[out.length - 1];
      if (last && last.day === key) last.items.push(e);
      else out.push({ day: key, items: [e] });
    }
    return out;
  }, [events]);

  if (phase === 'loading') return <p className={styles.tlEmpty}>{t('common.loading')}</p>;
  if (phase === 'empty') return <p className={styles.tlEmpty}>{t('tl.empty')}</p>;

  return (
    <div className={styles.timeline}>
      {rows.length > 200 ? <p className={styles.tlEmpty}>{t('tl.capped')}</p> : null}
      {groups.map((g) => (
        <div key={g.day}>
          <div className={styles.tlDay}>{dayLabel(g.items[0].at, t)}</div>
          {g.items.map((e) => (
            <button
              key={e.id}
              type="button"
              className={styles.tlRow}
              onClick={() => onOpenItem(e.item_id)}
            >
              <span className={e.actor === 'agent' ? styles.tlDotA : styles.tlDotU} />
              <span className={styles.tlAction}>{t(ACTION_KEY[e.action] ?? 'tl.updated')}</span>
              <span className={styles.tlTitle}>{titles.get(e.item_id) ?? e.item_id}</span>
              {e.detail ? <span className={styles.tlDetail}>{e.detail}</span> : null}
              <span className={styles.tlTime}>{clockOf(e.at)}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
