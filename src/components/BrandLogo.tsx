import styles from './brand.module.css';

/* P0 INTERACTION_UX_PLAN: real third-party logos (public/brands/*.svg).
   Monochrome SVGs tinted by per-brand CSS variables — theme-aware. */
export type BrandKind = 'github' | 'notion' | 'googledrive' | 'x' | 'mimo' | 'deepseek';

export const BRAND_LABELS: Record<BrandKind, string> = {
  github: 'GitHub',
  notion: 'Notion',
  googledrive: 'Google Drive',
  x: 'X',
  mimo: 'Xiaomi MiMo',
  deepseek: 'DeepSeek',
};

export function BrandLogo({ kind, size = 20, className }: { kind: BrandKind; size?: number; className?: string }) {
  return (
    <span
      className={`${styles.logo} ${className ?? ''}`}
      data-brand={kind}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url(/brands/${kind}.svg)`,
        maskImage: `url(/brands/${kind}.svg)`,
      }}
      role="img"
      aria-label={BRAND_LABELS[kind]}
    />
  );
}
