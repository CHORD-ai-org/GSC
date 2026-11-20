import { useEffect, useRef, useState } from 'react';
import type { AnimationQuality } from '../lib/prefs.ts';
import styles from './animations.module.css';

type QualityConfig = { cell: number; radius: number; drift: number; dash: number; soft: number };

const CFG: Record<Exclude<AnimationQuality, 'off'>, QualityConfig> = {
  low: { cell: 46, radius: 130, drift: 0, dash: 5, soft: 0 },
  medium: { cell: 34, radius: 180, drift: 0, dash: 7, soft: 0 },
  high: { cell: 27, radius: 230, drift: 1, dash: 8, soft: 0.5 },
  max: { cell: 21, radius: 290, drift: 1, dash: 10, soft: 1 },
};

const TINT_RGB: Record<'light' | 'dark', [number, number, number]> = {
  light: [214, 148, 240],
  dark: [222, 150, 255],
};

/**
 * Mouse-following dot-grid background (spec board annotation:
 * "拖动鼠标时要有这样的背景动画" with quality Off/Low/Medium/High/Max).
 *
 * Rest state is EMPTY: nothing renders until the pointer moves inside the
 * window, and only the cells around the cursor fade in. After a short idle
 * period (or when the pointer leaves) the effect fades back to nothing.
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
    const tintRgb = TINT_RGB[theme];
    const pointer = { x: -9999, y: -9999, inside: false, lastMove: 0 };
    let intensity = 0; // 0 = invisible (rest state), 1 = fully shown
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
      pointer.inside = true;
      pointer.lastMove = performance.now();
    };

    const onLeave = () => {
      pointer.inside = false;
    };

    const frame = (now: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Rest state: nothing on screen unless the pointer recently moved inside.
      const active = pointer.inside && now - pointer.lastMove < 2200;
      const target = active ? 1 : 0;
      intensity += (target - intensity) * (target > intensity ? 0.16 : 0.06);
      if (intensity < 0.01) {
        intensity = target === 0 ? 0 : intensity;
        if (intensity === 0) {
          raf = requestAnimationFrame(frame);
          return;
        }
      }

      const t = now / 1000;
      const angle = (-35 * Math.PI) / 180;
      // Only walk the cell neighbourhood around the cursor.
      const minGx = Math.max(0, Math.floor((pointer.x - cfg.radius) / cfg.cell));
      const maxGx = Math.min(Math.ceil(w / cfg.cell), Math.ceil((pointer.x + cfg.radius) / cfg.cell));
      const minGy = Math.max(0, Math.floor((pointer.y - cfg.radius) / cfg.cell));
      const maxGy = Math.min(Math.ceil(h / cfg.cell), Math.ceil((pointer.y + cfg.radius) / cfg.cell));
      for (let gy = minGy; gy <= maxGy; gy += 1) {
        for (let gx = minGx; gx <= maxGx; gx += 1) {
          const wave = cfg.soft * Math.sin(gx * 0.55 + gy * 0.8 + t * 0.6) * cfg.cell * 0.22;
          const x = gx * cfg.cell + cfg.cell / 2;
          const y = gy * cfg.cell + cfg.cell / 2 + (cfg.drift ? wave : 0);
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let f = Math.max(0, 1 - dist / cfg.radius);
          f = f * f * (3 - 2 * f); // smoothstep falloff
          const alpha = f * intensity;
          if (alpha < 0.015) continue; // rest state contributes nothing
          const len = cfg.dash + f * cfg.dash * 1.7;
          const r = Math.round(200 + (tintRgb[0] - 200) * f);
          const g = Math.round(200 + (tintRgb[1] - 200) * f);
          const b = Math.round(200 + (tintRgb[2] - 200) * f);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth = 1.6 + f * 1.6;
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
    document.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
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
