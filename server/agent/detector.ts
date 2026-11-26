/**
 * Detector (Vision §4.2): OBSERVES the existing information space and marks
 * candidates. Output lands in `proposals` (source=detector) for human review —
 * never written into user data.
 */
import type { Database } from '../persistence/client.ts';
import type { ItemDTO } from '../../src/lib/items.ts';
import type { Config } from '../config.ts';
import type { FetchLike } from './llm.ts';
import { chatComplete, extractJson } from './llm.ts';
import { listItems } from '../repo/items.ts';
import { createProposal, listProposals } from '../repo/proposals.ts';
import { listTagDefinitions, listTagValues } from '../repo/tags.ts';
import { suggestMetaTags } from './proposer.ts';

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

export type DetectionReport = {
  dedupe: number; metadata: number; association: number;
  meta_tag: number; discovered: number; candidates: number;
  llm: 'ok' | 'skipped' | 'absent';
};

export type DetectOpts = {
  /** LLM 缝合点配置——缺省时 LLM 维跳过（llm='absent'），规则维照跑。 */
  config?: Config;
  fetchImpl?: FetchLike;
  /** ingest 钩子增量模式：LLM 维只跑这批新增条目。 */
  incremental?: string[];
};

export async function runDetection(db: Database, opts: DetectOpts = {}): Promise<DetectionReport> {
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
  const report: DetectionReport = { dedupe: 0, metadata: 0, association: 0, meta_tag: 0, discovered: 0, candidates: 0, llm: 'absent' };

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

  /* META_TAG_PIPELINE M1/M3：Agent 腿两维（LLM 缝合点；401/缺配置时跳过不阻塞规则维）。 */
  if (!opts.config) return report;
  report.llm = 'ok';
  try {
    const defs = await listTagDefinitions(db);
    const llmIds = opts.incremental && opts.incremental.length ? new Set(opts.incremental) : null;
    const targets = llmIds ? all.filter((i) => llmIds.has(i.id)) : all;
    // meta_tag 建议维：只对「尚无任何已打标定义」的条目建议（已打标的尊重人工结果）
    const tagged = new Set((await listTagValues(db, {})).map((v) => `${v.item_id}:${v.definition_id}`));
    const untagged = targets.filter((i) => !defs.some((d) => tagged.has(`${i.id}:${d.id}`)));
    if (untagged.length > 0) {
      const suggestions = await suggestMetaTags(
        opts.config,
        untagged.slice(0, 12).map((i) => ({ id: i.id, title: i.title, content: (texts.get(i.id) ?? i.title).slice(0, 200) })),
        defs.map((d) => ({ id: d.id, name: d.name })),
        opts.fetchImpl,
      );
      for (const sug of suggestions) {
        const key = relKey('meta_tag', sug.item_id, sug.definition_id);
        if (seen.has(key) || !underCap('meta_tag', sug.item_id)) continue;
        await createProposal(db, {
          kind: 'meta_tag',
          target_id: sug.item_id,
          related_definition_id: sug.definition_id,
          proposed_value: sug.value,
          rationale: sug.why || 'detector meta_tag suggestion',
          source: 'detector',
        });
        seen.add(key);
        report.meta_tag += 1;
      }
    }
    // tag discovery 维：规则候选 → LLM 规范名 → pending_definition（同名跨轮永不重复）
    const candidates = discoverTagCandidates(all, defs, texts);
    report.candidates = candidates.length;
    if (candidates.length > 0) {
      const named = await nameTagCandidates(opts.config, candidates, opts.fetchImpl);
      const localDefs = new Set<string>();
      for (const name of named.slice(0, 8)) {
        const norm = name.trim().toLowerCase();
        if (!norm || norm.length > 20) continue;
        if (localDefs.has(norm)) continue;
        if (pending.some((x) => x.kind === 'pending_definition' && x.proposed_value.toLowerCase() === norm)) continue;
        const rep = all.find((i) => (texts.get(i.id) ?? '').toLowerCase().includes(norm)) ?? all[0];
        if (!rep) continue;
        await createProposal(db, {
          kind: 'pending_definition',
          target_id: rep.id,
          proposed_value: name.trim(),
          rationale: `discovery: “${name.trim()}” appears across ${candidates.find((c) => c.term.toLowerCase() === norm)?.df ?? '?'} items — confirm to create the definition`,
          source: 'detector',
        });
        localDefs.add(norm);
        report.discovered += 1;
      }
    }
  } catch {
    report.llm = 'skipped'; // LLM 不可用：记账，规则维产物保留
  }

  return report;
}

/** discovery 规则步：跨条目高频且未被任何已有定义覆盖的词元（≤8 个）。 */
export function discoverTagCandidates(
  items: ItemDTO[],
  defs: { name: string }[],
  texts: Map<string, string>,
  minDf = 3,
): { term: string; df: number }[] {
  const df = new Map<string, number>();
  const defNames = defs.map((d) => d.name.toLowerCase());
  for (const item of items) {
    for (const t of tokens(texts.get(item.id) ?? '')) {
      if (defNames.some((n) => n.includes(t) || t.includes(n))) continue;
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  return [...df.entries()]
    .filter(([, c]) => c >= minDf)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term, c]) => ({ term, df: c }));
}

/** discovery LLM 步：候选词元 → 规范标签名（合并同义，≤8 个）。 */
async function nameTagCandidates(
  config: Config,
  candidates: { term: string; df: number }[],
  fetchImpl?: FetchLike,
): Promise<string[]> {
  const { content } = await chatComplete(config, [
    { role: 'system', content: 'Merge these frequent terms into canonical tag names (merge synonyms; keep names ≤12 chars; keep the original language). Reply ONLY with JSON {"names":["..."]}.' },
    { role: 'user', content: JSON.stringify(candidates) },
  ], fetchImpl);
  const parsed = extractJson(content) as { names?: unknown } | null;
  return Array.isArray(parsed?.names) ? (parsed.names as unknown[]).map(String).slice(0, 8) : [];
}

/** ingest 钩子（M2）：批采集收尾触发检测，非阻塞；GSC_DETECT_ON_INGEST=0 关闭。 */
export async function maybeDetectOnIngest(db: Database, config: Config | undefined, newIds: string[]): Promise<void> {
  if (process.env.GSC_DETECT_ON_INGEST === '0') return;
  if (newIds.length === 0) return;
  try {
    await runDetection(db, { config, incremental: newIds });
  } catch {
    /* 非阻塞：采集主链不受检测失败影响 */
  }
}
