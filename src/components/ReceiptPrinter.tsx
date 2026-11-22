import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import s from './receipt.module.css';

/**
 * ReceiptPrinter — a thermal printer that prints a receipt you can tear off.
 *
 * Self-written demo component (see RECEIPT_DEMO_PLAN.md): the paper feeds out
 * of the slot with a slight curl, then the receipt can be dragged up to tear
 * it off (a quick flick tears it too). Behaviour mirrors the public prop
 * description of the React Bits Pro `receipt-printer` component, but this
 * implementation is original, dependency-free, and styled with CSS Modules
 * to match the GSC stack (DECISION_LOG D-005).
 */

export type ReceiptLine =
  | { kind: 'title'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'row'; label: string; value: string }
  | { kind: 'divider' }
  | { kind: 'space' }
  | { kind: 'barcode'; value: string };

export interface ReceiptPrinterHandle {
  /** Print a fresh receipt (re-feeds the paper). */
  print: () => void;
  /** Tear off the current receipt. Queued if the paper is still feeding. */
  tear: () => void;
}

export interface ReceiptPrinterProps {
  /** Name printed at the top. */
  title?: string;
  /** Line under the title. */
  subtitle?: string;
  /** Starting order number, shown as "ORDER #n". */
  order?: number | string;
  /** Your own receipt body instead of items: rows, dividers, barcode, … */
  lines?: ReceiptLine[];
  /** Line printed at the bottom. */
  footer?: string;
  /** Prints a barcode from the order number when `lines` has none. */
  barcode?: boolean;
  /** Prints, tears off and prints the next receipt while in view. */
  autoplay?: boolean;
  /** Milliseconds a finished receipt stays before autoplay tears it off. */
  hold?: number;
  /** Drag the receipt up to tear it off. */
  tearable?: boolean;
  /** Paper width in pixels (the printer is a little wider). */
  width?: number;
  /** How fast the paper feeds out (1 = normal). */
  speed?: number;
  paperColor?: string;
  inkColor?: string;
  printerColor?: string;
  onTear?: () => void;
  onPrinted?: () => void;
}

type Phase = 'idle' | 'feeding' | 'printed' | 'tearing' | 'torn';

/** Drag distance (px, upward) that completes a tear. */
const TEAR_THRESHOLD = -56;
/** Upward flick velocity (px/ms) that completes a tear at any distance. */
const TEAR_FLICK = -0.55;
/** How long the tear-away flight takes. */
const TEAR_MS = 520;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Deterministic bar widths (in 2px units) for a decorative barcode. */
function barcodeBars(value: string): number[] {
  const bars: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    bars.push(1 + (c % 3), 1 + ((c >> 2) % 3), 1 + ((c >> 4) % 2), 1 + ((c >> 6) % 2));
  }
  return bars;
}

/** clip-path polygon for a strip with a straight top and teeth pointing down. */
function zigzagClip(teeth: number): string {
  const pts: string[] = ['0% 0%'];
  const step = 100 / (teeth * 2);
  for (let i = 1; i < teeth * 2; i++) {
    pts.push(`${(step * i).toFixed(2)}% ${i % 2 === 1 ? '100%' : '0%'}`);
  }
  pts.push('100% 0%');
  return `polygon(${pts.join(', ')})`;
}

function renderLine(line: ReceiptLine, key: number) {
  switch (line.kind) {
    case 'title':
      return (
        <div key={key} className={s.rTitle}>
          {line.text}
        </div>
      );
    case 'text':
      return (
        <div key={key} className={s.rText}>
          {line.text}
        </div>
      );
    case 'row':
      return (
        <div key={key} className={s.rRow}>
          <span className={s.rLabel}>{line.label}</span>
          <span className={s.rValue}>{line.value}</span>
        </div>
      );
    case 'divider':
      return <div key={key} className={s.rRule} />;
    case 'space':
      return <div key={key} className={s.rSpace} />;
    case 'barcode':
      return (
        <div key={key} className={s.rBarcode} aria-hidden>
          {barcodeBars(line.value).map((w, j) => (
            <span key={j} className={j % 2 === 0 ? s.bar : s.gap} style={{ width: w * 2 }} />
          ))}
        </div>
      );
  }
}

export const ReceiptPrinter = forwardRef<ReceiptPrinterHandle, ReceiptPrinterProps>(function ReceiptPrinter(
  {
    title = 'NORTHSIDE COFFEE',
    subtitle,
    order,
    lines,
    footer = 'Thank you. See you tomorrow.',
    barcode = true,
    autoplay = true,
    hold = 2600,
    tearable = true,
    width = 280,
    speed = 1,
    paperColor = '#F1EFEA',
    inkColor = '#25252A',
    printerColor = '#1E1E22',
    onTear,
    onPrinted,
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const [feedH, setFeedH] = useState(0);
  const [feedMs, setFeedMs] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const paperRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;
  const dragYRef = useRef(0);
  const dragInfoRef = useRef<{ startY: number; lastY: number; lastT: number; v: number } | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const tearAfterPrintRef = useRef(false);
  const cbsRef = useRef({ onTear, onPrinted });
  cbsRef.current = { onTear, onPrinted };

  const zig = useMemo(() => zigzagClip(26), []);
  const body = useMemo(() => {
    if (lines) return lines;
    if (barcode && order != null) return [{ kind: 'barcode', value: String(order) } as ReceiptLine];
    return [];
  }, [lines, barcode, order]);

  const print = useCallback(() => {
    window.clearTimeout(timerRef.current);
    tearAfterPrintRef.current = false;
    const h = paperRef.current?.offsetHeight ?? 0;
    dragYRef.current = 0;
    setDragY(0);
    setPhase('idle');
    setFeedH(0);
    const ms = reduced ? 0 : Math.min(1800, 320 + h * 1.35) / Math.max(0.25, speed);
    timerRef.current = window.setTimeout(() => {
      setFeedMs(ms);
      setFeedH(h);
      setPhase('feeding');
      timerRef.current = window.setTimeout(() => {
        setPhase('printed');
        cbsRef.current.onPrinted?.();
        if (tearAfterPrintRef.current) {
          tearAfterPrintRef.current = false;
          const away = (paperRef.current?.offsetHeight ?? h) + 90;
          dragYRef.current = -away;
          setDragY(-away);
          setPhase('tearing');
          timerRef.current = window.setTimeout(() => {
            setPhase('torn');
            setFeedH(0);
            cbsRef.current.onTear?.();
          }, reduced ? 0 : TEAR_MS);
        }
      }, ms);
    }, 16);
  }, [reduced, speed]);

  const doTear = useCallback(() => {
    const p = phaseRef.current;
    if (p === 'idle' || p === 'tearing' || p === 'torn') return;
    if (p === 'feeding') {
      // still printing — tear as soon as the paper is out
      tearAfterPrintRef.current = true;
      return;
    }
    setDragging(false);
    const away = (paperRef.current?.offsetHeight ?? 320) + 90;
    dragYRef.current = -away;
    setDragY(-away);
    setPhase('tearing');
    timerRef.current = window.setTimeout(() => {
      setPhase('torn');
      setFeedH(0);
      cbsRef.current.onTear?.();
    }, reduced ? 0 : TEAR_MS);
  }, [reduced]);

  useImperativeHandle(ref, () => ({ print, tear: doTear }), [print, doTear]);

  // print the first receipt on mount
  useEffect(() => {
    print();
    return () => window.clearTimeout(timerRef.current);
  }, [print]);

  // keep the clip window in step with the paper (e.g. web font swaps)
  useLayoutEffect(() => {
    const el = paperRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const p = phaseRef.current;
      if (p === 'feeding' || p === 'printed') setFeedH(el.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // autoplay: tear off and print again while in view
  useEffect(() => {
    if (phase !== 'printed' || !autoplay) return;
    const t = window.setTimeout(() => doTear(), Math.max(0, hold));
    return () => window.clearTimeout(t);
  }, [phase, autoplay, hold, doTear]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!tearable || phaseRef.current !== 'printed') return;
    dragInfoRef.current = { startY: e.clientY, lastY: e.clientY, lastT: performance.now(), v: 0 };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragInfoRef.current;
    if (!d) return;
    const now = performance.now();
    if (now > d.lastT) {
      d.v = (e.clientY - d.lastY) / (now - d.lastT);
      d.lastY = e.clientY;
      d.lastT = now;
    }
    const dy = Math.min(0, e.clientY - d.startY);
    dragYRef.current = dy;
    setDragY(dy);
  };
  const onPointerRelease = () => {
    const d = dragInfoRef.current;
    if (!d) return;
    dragInfoRef.current = null;
    setDragging(false);
    if (dragYRef.current <= TEAR_THRESHOLD || d.v <= TEAR_FLICK) {
      doTear();
    } else {
      dragYRef.current = 0;
      setDragY(0);
    }
  };

  const canDrag = tearable && phase === 'printed';
  const paperCls = [
    s.paper,
    phase === 'feeding' ? s.curl : '',
    canDrag ? s.grabbable : '',
    dragging ? s.dragging : '',
    !dragging && phase === 'printed' ? s.spring : '',
    phase === 'tearing' ? s.tearing : '',
  ]
    .filter(Boolean)
    .join(' ');
  const ledCls = [s.led, phase === 'feeding' ? s.ledBlink : '', phase === 'printed' ? s.ledOn : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={s.stage}
      role="group"
      aria-label="Receipt printer"
      style={
        {
          width: width + 28,
          '--paper': paperColor,
          '--ink': inkColor,
          '--printer': printerColor,
        } as CSSProperties
      }
    >
      <div
        className={phase === 'idle' || phase === 'feeding' ? s.feed : `${s.feed} ${s.feedOpen}`}
        style={{ height: feedH, transitionDuration: `${feedMs}ms` }}
      >
        <div
          ref={paperRef}
          className={paperCls}
          style={{
            transform: `translateY(${dragY}px) rotate(${dragY < -8 ? 1.6 : 0}deg)`,
            opacity: phase === 'tearing' ? 0 : 1,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerRelease}
          onPointerCancel={onPointerRelease}
        >
          <div className={s.paperInner}>
            <div className={s.rTitle}>{title}</div>
            {subtitle ? <div className={s.rSub}>{subtitle}</div> : null}
            {order != null ? <div className={s.rSub}>{`Order #${order}`}</div> : null}
            <div className={s.rBody}>{body.map(renderLine)}</div>
            {footer ? <div className={s.rFooter}>{footer}</div> : null}
          </div>
          <div className={s.edge} style={{ clipPath: zig }} />
        </div>
      </div>
      <div className={s.printer}>
        <div className={s.slot} />
        <div className={ledCls} />
        <div className={s.vents} aria-hidden>
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
});
