import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './toast.module.css';

/* P0 INTERACTION_UX_PLAN: replaces "saved" text lines with real feedback.
   Usage: const toast = useToast(); toast('已保存'); — auto-dismiss 1.8s. */

type ToastItem = { id: number; text: string; tone: 'ok' | 'error'; actionLabel?: string; onAction?: () => void };

type PushToast = (text: string, tone?: 'ok' | 'error', action?: { label: string; run: () => void }) => void;

const ToastCtx = createContext<PushToast>(() => {});

export function useToast(): PushToast {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback<PushToast>((text, tone = 'ok', action) => {
    const id = ++seq.current;
    setItems((xs) => [...xs, { id, text, tone, actionLabel: action?.label, onAction: action?.run }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), action ? 6000 : 1800);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className={styles.toastWrap} aria-live="polite">
        {items.map((x) => (
          <div key={x.id} className={`${styles.toast} ${x.tone === 'error' ? styles.error : ''}`}>
            {x.text}
            {x.actionLabel ? (
              <button
                type="button"
                className={styles.toastAction}
                onClick={() => { x.onAction?.(); setItems((xs) => xs.filter((i) => i.id !== x.id)); }}
              >
                {x.actionLabel}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
