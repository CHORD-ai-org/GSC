/**
 * Detector (Vision §4.2): OBSERVES the existing information space and marks
 * candidates. Output lands in `proposals` (source=detector) for human review —
 * never written into user data.
 */
import type { Database } from '../persistence/client.ts';
import type { ItemDTO } from '../../src/lib/items.ts';
import { listItems } from '../repo/items.ts';
import { createProposal, listProposals } from '../repo/proposals.ts';

const DEDUPE_THRESHOLD = 0.8;

/** Compare title + content only — ids and labels must not dilute similarity. */
function comparableText(item: ItemDTO): string {
  const fields = Object.values(item.fields).filter((v): v is string => typeof v === 'string');
  return [item.title, ...fields].join(' ');
}

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

/**
 * O5-2 candidate gate: only pairs sharing at least one non-ubiquitous token can
 * cross DEDUPE_THRESHOLD. An inverted index enumerates those pairs; tokens whose
 * document frequency exceeds the cap are treated as stopwords and pruned
 * (pairs sharing ONLY such tokens are a documented, deliberate skip).
 */
export function planComparisons(tokenSets: Map<string, Set<string>>): [string, string][] {
  const ids = [...tokenSets.keys()];
  const n = ids.length;
  const postings = new Map<string, string[]>();
  for (const id of ids) {
    for (const token of tokenSets.get(id) ?? []) {
      const list = postings.get(token);
      if (list) list.push(id);
      else postings.set(token, [id]);
    }
  }
  const dfCap = Math.max(2, Math.floor(n * 0.5));
  const pairs = new Set<string>();
  for (const list of postings.values()) {
    if (list.length < 2 || list.length > dfCap) continue;
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        pairs.add(list[i] < list[j] ? `${list[i]}\u0000${list[j]}` : `${list[j]}\u0000${list[i]}`);
      }
    }
  }
  return [...pairs].map((k) => k.split('\u0000') as [string, string]);
}

export type DetectionReport = { dedupe: number; metadata: number; association: number };

export async function runDetection(db: Database): Promise<DetectionReport> {
  const all: ItemDTO[] = await listItems(db);
  const pending = await listProposals(db, 'pending');
  /* P1 hygiene: one key function for both sides of the dedupe check. The old code
     built `metadata:id:null` here but tested `metadata:id:` later — the mismatch made
     the dedupe miss every time and flooded pending on each run. */
  const relKey = (kind: string, target: string, related: string | null | undefined) => `${kind}:${target}:${related ?? ''}`;
  const seen = new Set(pending.map((p) => relKey(p.kind, p.target_id, p.related_id)));
  /* P1 hygiene: per target+kind cap on pending proposals (default 3). */
  const pendingCount = new Map<string, number>();
  for (const p of pending) {
    const k = `${p.kind}:${p.target_id}`;
    pendingCount.set(k, (pendingCount.get(k) ?? 0) + 1);
  }
  const underCap = (kind: string, target: string, cap = 3) => (pendingCount.get(`${kind}:${target}`) ?? 0) < cap;
  const report: DetectionReport = { dedupe: 0, metadata: 0, association: 0 };

  const texts = new Map<string, string>();
  for (const item of all) texts.set(item.id, comparableText(item));

  // O5-2: compare only candidate pairs instead of the full n² sweep
  const tokenSets = new Map<string, Set<string>>();
  for (const item of all) tokenSets.set(item.id, tokens(texts.get(item.id) ?? ''));
  const byId = new Map(all.map((item) => [item.id, item]));
  for (const [idA, idB] of planComparisons(tokenSets)) {
    const a = byId.get(idA);
    const b = byId.get(idB);
    if (!a || !b) continue;
    const score = similarity(texts.get(a.id) ?? '', texts.get(b.id) ?? '');
    const key = (kind: string) => relKey(kind, a.id, b.id);
    if (score >= DEDUPE_THRESHOLD && !seen.has(key('dedupe')) && !seen.has(relKey('dedupe', b.id, a.id)) && underCap('dedupe', a.id)) {
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
    } else if (score >= 0.4 && score < DEDUPE_THRESHOLD && !seen.has(key('association')) && !seen.has(relKey('association', b.id, a.id)) && underCap('association', a.id)) {
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

  for (const item of all) {
    const key = relKey('metadata', item.id, '');
    if (!item.source_label && !seen.has(key) && underCap('metadata', item.id)) {
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
