import { useState } from 'react';
import { GscLogo } from './GscLogo.tsx';
import { useT } from '../lib/i18n.tsx';
import styles from './onboarding.module.css';

/* T103 account setup: first-launch identity creation (name + auto avatar).
   The first user created is bound server-side as the local account. */
export function AccountSetup({ onCreate }: { onCreate: (name: string) => Promise<void> }) {
  const t = useT();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const initial = (name.trim()[0] ?? 'G').toUpperCase();

  return (
    <div className={styles.overlay}>
      <div className={styles.wizard} style={{ width: 'min(420px, 92vw)' }}>
        <div className={styles.head}>
          <GscLogo height={22} />
        </div>
        <div className={styles.body}>
          <h2 className={styles.title}>{t('acc.title')}</h2>
          <p className={styles.desc}>{t('acc.desc')}</p>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 18px' }}>
            <span
              aria-hidden="true"
              style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--accent)', color: 'var(--on-accent)',
                display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 680,
              }}
            >
              {initial}
            </span>
          </div>
          <label className={styles.qa}>
            <span>{t('acc.name')}</span>
            <input
              className={styles.qaInput}
              value={name}
              autoFocus
              placeholder={t('acc.namePh')}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim() && !busy) {
                  setBusy(true);
                  void onCreate(name.trim()).finally(() => setBusy(false));
                }
              }}
            />
          </label>
          <div className={styles.foot}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={!name.trim() || busy}
              onClick={() => {
                setBusy(true);
                void onCreate(name.trim()).finally(() => setBusy(false));
              }}
            >
              {t('acc.create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
