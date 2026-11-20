import type { ItemType } from '../lib/items.ts';
import styles from './glyph.module.css';

/* P2 UX_OPTIMIZATION_PLAN: replace two-letter codes (DO/CO/CLU/CTX) with
   real icons. Categories: doc / message / evidence / file / concept /
   hypothesis / method / decision / reference / cluster / context. */
export type GlyphKind = ItemType | 'cluster' | 'context';

function pathFor(kind: GlyphKind): string {
  switch (kind) {
    case 'raw.document': return 'M4 2h5l3 3v9H4z M9 2v3h3 M6 8.5h4M6 11h4';
    case 'raw.message': return 'M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z';
    case 'raw.evidence': return 'M8 2.5v7M5 6.5l3 3 3-3 M3 12.5h10';
    case 'raw.filecontent': return 'M3 2.5h6l3 3v8H3z M6.5 9.5l1.5 1.5 2.5-3';
    case 'object.concept': return 'M8 2l5 2.6v5.8L8 13l-5-2.6V4.6z M3 4.6L8 7.2l5-2.6M8 7.2V13';
    case 'object.hypothesis': return 'M2.5 8a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0z M6 6.5a2 2 0 1 1 4 0 M8 8.5v2';
    case 'object.methodology': return 'M2.5 3.5h3v3h-3z M10.5 3.5h3v3h-3z M2.5 9.5h3v3h-3z M10.5 9.5h3v3h-3z M5.5 5h5M4 6.5v3M12 6.5v3M5.5 11h5';
    case 'object.decision': return 'M3 2.5h10v11H3z M5.5 6h5M5.5 8.5h5M5.5 11h3';
    case 'object.evidencereference': return 'M4 2.5h8v11H4z M6 5h4M6 7.5h4 M2 5.5h2M2 8h2M2 10.5h2';
    case 'cluster': return 'M4.5 4.5m-1.8 0a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 1 0-3.6 0 M11.5 4.5m-1.8 0a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 1 0-3.6 0 M8 11.5m-1.8 0a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 1 0-3.6 0 M5.6 5.8L7 10 M10.4 5.8L9 10';
    case 'context': return 'M8 2l6 3-6 3-6-3z M2 8.6l6 3 6-3';
    default: return 'M3 3h10v10H3z';
  }
}

export function Glyph({ kind, size = 14 }: { kind: GlyphKind; size?: number }) {
  return (
    <svg
      className={styles.glyph}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {pathFor(kind).split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  );
}
