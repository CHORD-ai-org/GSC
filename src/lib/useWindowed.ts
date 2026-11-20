import { useEffect, useRef, useState } from 'react';

/* T202 progressive rendering: show a window of rows, grow when the
   sentinel scrolls into view. Keeps first paint fast at 500+ rows. */
export function useWindowed<T>(rows: T[], step = 60): { visible: T[]; sentinelRef: React.RefObject<HTMLDivElement | null>; hasMore: boolean } {
  const [shown, setShown] = useState(step);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setShown(step); }, [rows, step]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setShown((n) => (n < rows.length ? Math.min(n + step, rows.length) : n));
      }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [rows.length, step]);

  return { visible: rows.slice(0, shown), sentinelRef, hasMore: shown < rows.length };
}
