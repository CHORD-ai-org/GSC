export function GscLogo({ height = 32, className }: { height?: number; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 32"
      height={height}
      role="img"
      aria-label="GSC"
      fill="currentColor"
      style={{ display: 'block' }}
    >
      {/* G */}
      <rect x="0" y="0" width="28" height="8" />
      <rect x="0" y="0" width="8" height="32" />
      <rect x="0" y="24" width="28" height="8" />
      <rect x="20" y="16" width="8" height="16" />
      <rect x="12" y="16" width="12" height="8" />
      {/* S */}
      <rect x="34" y="0" width="28" height="8" />
      <rect x="34" y="0" width="8" height="16" />
      <rect x="34" y="12" width="28" height="8" />
      <rect x="54" y="12" width="8" height="20" />
      <rect x="34" y="24" width="28" height="8" />
      {/* C */}
      <rect x="68" y="0" width="28" height="8" />
      <rect x="68" y="0" width="8" height="32" />
      <rect x="68" y="24" width="28" height="8" />
    </svg>
  );
}
