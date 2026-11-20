import { useEffect, useState } from 'react';
import * as api from '../services/api.ts';
import type { NewsItem } from '../lib/news.ts';
import { pickText } from '../lib/news.ts';
import { useI18n, useT } from '../lib/i18n.tsx';
import styles from '../views/views.module.css';

const DISMISS_KEY = 'gsc.news.dismissedAt';

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

/**
 * Start-page news card (top-right): a small rounded colour block listing the
 * announcements the admin has published in Settings → 新闻管理. It is NOT
 * permanent — a close button hides it, and it only returns when the admin adds
 * or edits content (anything newer than the last dismissal). With nothing
 * published it does not render at all.
 */
export function NewsPanel() {
  const t = useT();
  const { lang } = useI18n();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [dismissedAt, setDismissedAt] = useState<string | null>(readDismissed);

  useEffect(() => {
    api
      .listNews()
      .then((r) => setItems(r.news.filter((n) => n.published)))
      .catch(() => setItems([]));
  }, []);

  const newest = items.reduce((max, n) => (n.updated_at > max ? n.updated_at : max), '');
  const visible = items.length > 0 && (!dismissedAt || newest > dismissedAt);
  if (!visible) return null;

  function dismiss() {
    const now = new Date().toISOString();
    try {
      localStorage.setItem(DISMISS_KEY, now);
    } catch {
      /* storage unavailable — stay visible this session */
    }
    setDismissedAt(now);
  }

  return (
    <aside className={styles.newsPanel} aria-label={t('news.title')}>
      <div className={styles.newsCard}>
        <div className={styles.newsHead}>
          <span className={styles.newsTag}>{t('news.title')}</span>
          <button type="button" className={styles.newsClose} aria-label={t('news.dismiss')} onClick={dismiss}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <div className={styles.newsList}>
          {items.map((item) => (
            <article key={item.id} className={styles.newsItem}>
              <div className={styles.newsItemTitle}>{pickText(item.title, lang)}</div>
              {pickText(item.summary, lang) ? (
                <div className={styles.newsSummary}>{pickText(item.summary, lang)}</div>
              ) : null}
              <div className={styles.newsDate}>{item.created_at.slice(0, 10)}</div>
            </article>
          ))}
        </div>
      </div>
    </aside>
  );
}
