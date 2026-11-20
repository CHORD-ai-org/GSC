/**
 * Detector (Vision §4.2): OBSERVES the existing information space and marks
 * candidates. Output lands in `proposals` (source=detector) for human review —
 * never written into user data.
 */
import { eq } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { items, itemContent } from '../persistence/schema.ts';
import { itemTextForFilter } from '../../src/lib/items.ts';
import type { ItemDTO } from '../../src/lib/items.ts';
import { listItems } from '../repo/items.ts';
import { createProposal, listProposals } from '../repo/proposals.ts';

const DEDUPE_THRESHOLD = 0.8;

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length > 2),
  );
}

export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / Math.min(ta.size, tb.size);
}

export type DetectionReport = { dedupe: number; metadata: number; association: number };

export async function runDetection(db: Database): Promise<DetectionReport> {
  const all: ItemDTO[] = await listItems(db);
  const pending = await listProposals(db, 'pending');
  const seen = new Set(pending.map((p) => `${p.kind}:${p.target_id}:${p.related_id}`));
  const report: DetectionReport = { dedupe: 0, metadata: 0, association: 0 };

  const texts = new Map<string, string>();
  for (const item of all) texts.set(item.id, itemTextForFilter(item));

  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      const a = all[i];
      const b = all[j];
      const score = similarity(texts.get(a.id) ?? '', texts.get(b.id) ?? '');
      const key = (kind: string) => [kind, a.id, b.id].join(':');
      if (score >= DEDUPE_THRESHOLD && !seen.has(key('dedupe')) && !seen.has(`dedupe:${b.id}:${a.id}`)) {
        await createProposal(db, {
          kind: 'dedupe',
          target_id: a.id,
          related_id: b.id,
          proposed_value: `${Math.round(score * 100)}% overlap with “${b.title}”`,
          rationale: `text similarity ${score.toFixed(2)} — review for merge or distinction`,
          source: 'detector',
        });
        seen.add(key('dedupe'));
        report.dedupe += 1;
      } else if (score >= 0.4 && score < DEDUPE_THRESHOLD && !seen.has(key('association')) && !seen.has(`association:${b.id}:${a.id}`)) {
        await createProposal(db, {
          kind: 'association',
          target_id: a.id,
          related_id: b.id,
          proposed_value: 'related_to',
          rationale: `shared vocabulary (similarity ${score.toFixed(2)})`,
          source: 'detector',
        });
        seen.add(key('association'));
        report.association += 1;
      }
    }
  }

  for (const item of all) {
    const key = `metadata:${item.id}:`;
    if (!item.source_label && !seen.has(key)) {
      await createProposal(db, {
        kind: 'metadata',
        target_id: item.id,
        proposed_value: 'missing source_label',
        rationale: 'provenance gap — the chunk has no source label',
        source: 'detector',
      });
      seen.add(key);
      report.metadata += 1;
    }
  }

  return report;
}
