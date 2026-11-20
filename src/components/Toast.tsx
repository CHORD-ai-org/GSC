import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './toast.module.css';

/* P0 INTERACTION_UX_PLAN: replaces "saved" text lines with real feedback.
   Usage: const toast = useToast(); toast('已保存'); — auto-dismiss 1.8s. */

type ToastItem = { id: number; text: string; tone: 'ok' | 'error' };

const ToastCtx = createContext<(text: string, tone?: 'ok' | 'error') => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    const id = ++seq.current;
    setItems((xs) => [...xs, { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 1800);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className={styles.toastWrap} aria-live="polite">
        {items.map((x) => (
          <div key={x.id} className={`${styles.toast} ${x.tone === 'error' ? styles.error : ''}`}>{x.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
