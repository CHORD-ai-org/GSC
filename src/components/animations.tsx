import { useEffect, useRef, useState } from 'react';
import type { AnimationQuality } from '../lib/prefs.ts';
import styles from './animations.module.css';

type QualityConfig = { cell: number; tint: number; drift: number; dash: number; soft: number };

const CFG: Record<Exclude<AnimationQuality, 'off'>, QualityConfig> = {
  low: { cell: 46, tint: 0, drift: 0, dash: 5, soft: 0 },
  medium: { cell: 34, tint: 150, drift: 0, dash: 7, soft: 0 },
  high: { cell: 27, tint: 210, drift: 1, dash: 8, soft: 0.5 },
  max: { cell: 21, tint: 270, drift: 1, dash: 10, soft: 1 },
};

const BASE_RGB: Record<'light' | 'dark', [number, number, number]> = {
  light: [228, 228, 234],
  dark: [58, 58, 68],
};
const TINT_RGB: Record<'light' | 'dark', [number, number, number]> = {
  light: [214, 148, 240],
  dark: [222, 150, 255],
};

/**
 * Mouse-following dot-grid background (spec board annotation:
 * "拖动鼠标时要有这样的背景动画" with quality Off/Low/Medium/High/Max).
 * Purely decorative: never captures pointer events.
 */
export function DotGridBackground({ quality, theme }: { quality: AnimationQuality; theme: 'light' | 'dark' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (quality === 'off') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cfg = CFG[quality as Exclude<AnimationQuality, 'off'>];
    const baseRgb = BASE_RGB[theme];
    const tintRgb = TINT_RGB[theme];
    const pointer = { x: -9999, y: -9999 };
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };

    const frame = (now: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;
      const angle = (-35 * Math.PI) / 180;
      for (let gy = 0; gy * cfg.cell < h + cfg.cell; gy += 1) {
        for (let gx = 0; gx * cfg.cell < w + cfg.cell; gx += 1) {
          const wave = cfg.soft * Math.sin(gx * 0.55 + gy * 0.8 + t * 0.6) * cfg.cell * 0.22;
          const x = gx * cfg.cell + cfg.cell / 2;
          const y = gy * cfg.cell + cfg.cell / 2 + (cfg.drift ? wave : 0);
          let f = 0;
          if (cfg.tint > 0) {
            const dx = x - pointer.x;
            const dy = y - pointer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            f = Math.max(0, 1 - dist / cfg.tint);
            f = f * f * (3 - 2 * f);
          }
          const len = cfg.dash + f * cfg.dash * 1.7;
          const r = Math.round(baseRgb[0] + (tintRgb[0] - baseRgb[0]) * f);
          const g = Math.round(baseRgb[1] + (tintRgb[1] - baseRgb[1]) * f);
          const b = Math.round(baseRgb[2] + (tintRgb[2] - baseRgb[2]) * f);
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.5 + f * 0.5})`;
          ctx.lineWidth = 2 + f * 1.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(angle) * len, y - Math.sin(angle) * len);
          ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, [quality, theme]);

  if (quality === 'off') return null;
  return <canvas ref={canvasRef} className={styles.bg} aria-hidden="true" />;
}

const COLS = 9;
const ROWS = 5;

/**
 * Mosaic tile sweep played on page switch (spec board annotation:
 * "页面切换时可以使用的动画").
 */
export function MosaicTransition({ playToken, onDone }: { playToken: number; onDone: () => void }) {
  const [token, setToken] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (playToken <= 0) return;
    setToken(playToken);
    const timer = window.setTimeout(() => {
      setToken(0);
      doneRef.current();
    }, 520);
    return () => window.clearTimeout(timer);
  }, [playToken]);

  if (!token) return null;
  const tiles = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      tiles.push(
        <div
          key={`${r}-${c}`}
          className={styles.tile}
          style={{
            animationDelay: `${(r + c) * 22 + ((r * 7 + c * 13) % 5) * 14}ms`,
            backgroundPosition: `${(c * 37) % 100}% ${(r * 53) % 100}%`,
          }}
        />,
      );
    }
  }
  return (
    <div
      className={styles.mosaic}
      key={token}
      style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
      aria-hidden="true"
    >
      {tiles}
    </div>
  );
}
