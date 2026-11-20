import { NEWS } from '../lib/news.ts';
import { useI18n, useT } from '../lib/i18n.tsx';
import styles from '../views/views.module.css';

/**
 * Start-page news panel (top-right): a mini-monitor device —
 * bezel shell, dark screen with scanlines, breathing status LED,
 * and a marquee ticker at the bottom. Frontend-only; an external
 * feed source can replace the seed list later.
 */
export function NewsPanel() {
  const t = useT();
  const { lang } = useI18n();

  return (
    <aside className={styles.newsPanel} aria-label={t('news.title')}>
      <div className={styles.newsScreen}>
        <div className={styles.scanlines} aria-hidden="true" />

        <div className={styles.screenBar}>
          <span className={styles.ledDot} aria-hidden="true" />
          <span className={styles.screenLabel}>GSC NEWS</span>
          <span className={styles.screenBlink} aria-hidden="true">▮</span>
          <span className={styles.screenClock}>LIVE</span>
        </div>

        <div className={styles.screenBody}>
          {NEWS.map((item) => (
            <article key={item.id} className={styles.newsItem}>
              <div className={styles.newsDate}>{item.date.slice(5).replace('-', '/')}</div>
              <div>
                <div className={styles.newsItemTitle}>{item.title[lang]}</div>
                <div className={styles.newsSummary}>{item.summary[lang]}</div>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.ticker} aria-hidden="true">
          <div className={styles.tickerTrack}>
            <span>{t('news.foot')} · {t('news.foot')} · {t('news.foot')} · </span>
            <span>{t('news.foot')} · {t('news.foot')} · {t('news.foot')} · </span>
          </div>
        </div>
      </div>

      <div className={styles.newsStand} aria-hidden="true">
        <div className={styles.newsStandNeck} />
        <div className={styles.newsStandBase} />
      </div>
    </aside>
  );
}
