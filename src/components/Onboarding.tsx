import { useState } from 'react';
import { GscLogo } from './GscLogo.tsx';
import { useT } from '../lib/i18n.tsx';
import styles from './onboarding.module.css';

/* T102 Onboarding: 3-screen guided intro + optional Profile Q&A.
   Shown on first launch (localStorage flag) and replayable from Settings. */

const STORAGE_KEY = 'gsc.onboarding.done';

export function isOnboardingDone(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return true; }
}

type Props = {
  onFinish: (profileAnswers: string[]) => void | Promise<void>;
  onSkip: () => void;
  onLoadSample: () => Promise<void>;
};

export function Onboarding({ onFinish, onSkip, onLoadSample }: Props) {
  const t = useT();
  const [step, setStep] = useState(0); // 0..2 intro, 3 profile, 4 done
  const [domain, setDomain] = useState('');
  const [interest, setInterest] = useState('');
  const [style, setStyle] = useState('');
  const [sampleBusy, setSampleBusy] = useState(false);

  const steps = [1, 2, 3, 4];

  function persistDone() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
  }

  async function finish(withProfile: boolean) {
    persistDone();
    const answers = withProfile ? [domain, interest, style].map((s) => s.trim()).filter(Boolean) : [];
    await onFinish(answers);
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.wizard}>
        <div className={styles.head}>
          <GscLogo height={22} />
          <button type="button" className={styles.skip} onClick={() => { persistDone(); onSkip(); }}>{t('ob.skip')}</button>
        </div>

        {step <= 2 ? (
          <div className={styles.body}>
            <div className={styles.kicker}>{t('ob.stepOf', { n: step + 1, m: 3 })}</div>
            <h2 className={styles.title}>{t(`ob.title${step + 1}` as never)}</h2>
            <p className={styles.desc}>{t(`ob.desc${step + 1}` as never)}</p>

            {step === 0 ? (
              <div className={styles.conceptGrid}>
                {(['chunk', 'cluster', 'context', 'tag'] as const).map((c) => (
                  <div key={c} className={styles.conceptCard}>
                    <div className={styles.conceptName}>{t(`ob.c_${c}` as never)}</div>
                    <div className={styles.conceptDesc}>{t(`ob.c_${c}d` as never)}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {step === 1 ? (
              <div className={styles.demoRow}>
                {(['text', 'file', 'url'] as const).map((d) => (
                  <div key={d} className={styles.demoChip}>
                    <span className={styles.demoIcon}>{d === 'text' ? '⌨' : d === 'file' ? '📄' : '🔗'}</span>
                    {t(`ob.d_${d}` as never)}
                  </div>
                ))}
              </div>
            ) : null}

            {step === 2 ? (
              <div className={styles.flowLine}>
                {t('ob.flow')}
              </div>
            ) : null}

            <div className={styles.foot}>
              <button type="button" className={styles.primaryBtn} onClick={() => setStep(step + 1)}>{t('ob.next')}</button>
            </div>
          </div>
        ) : step === 3 ? (
          <div className={styles.body}>
            <div className={styles.kicker}>{t('ob.profileKicker')}</div>
            <h2 className={styles.title}>{t('ob.profileTitle')}</h2>
            <p className={styles.desc}>{t('ob.profileDesc')}</p>
            <div className={styles.qaList}>
              <label className={styles.qa}>
                <span>{t('ob.q1')}</span>
                <input className={styles.qaInput} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder={t('ob.q1ph')} />
              </label>
              <label className={styles.qa}>
                <span>{t('ob.q2')}</span>
                <input className={styles.qaInput} value={interest} onChange={(e) => setInterest(e.target.value)} placeholder={t('ob.q2ph')} />
              </label>
              <label className={styles.qa}>
                <span>{t('ob.q3')}</span>
                <input className={styles.qaInput} value={style} onChange={(e) => setStyle(e.target.value)} placeholder={t('ob.q3ph')} />
              </label>
            </div>
            <div className={styles.foot}>
              <button type="button" className={styles.ghostBtn} onClick={() => void finish(false)}>{t('ob.skipProfile')}</button>
              <button type="button" className={styles.primaryBtn} onClick={() => void finish(true)}>{t('ob.finish')}</button>
            </div>
          </div>
        ) : (
          <div className={styles.body}>
            <h2 className={styles.title}>{t('ob.doneTitle')}</h2>
            <p className={styles.desc}>{t('ob.doneDesc')}</p>
            <div className={styles.foot}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={sampleBusy}
                onClick={async () => {
                  setSampleBusy(true);
                  try { await onLoadSample(); } finally { setSampleBusy(false); }
                  persistDone();
                  await onFinish([]);
                }}
              >
                {sampleBusy ? t('start.loadingSample') : t('ob.loadSample')}
              </button>
              <button type="button" className={styles.ghostBtn} onClick={() => void finish(false)}>{t('ob.startBlank')}</button>
            </div>
          </div>
        )}

        <div className={styles.dots}>
          {steps.map((n) => (
            <span key={n} className={`${styles.dot} ${n <= step + 1 ? styles.dotOn : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
