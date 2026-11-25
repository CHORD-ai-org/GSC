/**
 * GSC Agent (Vision §4.1): interprets and PROPOSES. Never writes user data.
 * Every suggestion carries a rationale and quotes its source text.
 */
import type { Config } from '../config.ts';
import { chatComplete, extractJson } from './llm.ts';
import type { ChatMessage } from './llm.ts';

export type ChunkDraft = { title: string; content: string };

export type ChunkSuggestion = {
  index: number;
  semantic_name: string;
  classification: string;
  rationale: string;
};

const SYSTEM_PROMPT = [
  'You are GSC Agent. You propose organization for information chunks; you never decide.',
  'For each chunk return: a concise semantic_name (max 80 chars, no quotes),',
  'a classification of exactly one of: Document, Message, Evidence, File content, Concept, Hypothesis, Methodology, Decision, Evidence reference,',
  'and a short rationale that quotes a fragment of the original text as evidence.',
  'Reply with a JSON array of objects: [{"index":0,"semantic_name":"...","classification":"...","rationale":"..."}].',
  'No prose outside the JSON.',
].join(' ');

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function suggestForChunks(
  config: Config,
  chunks: ChunkDraft[],
  fetchImpl: FetchLike = fetch,
): Promise<ChunkSuggestion[]> {
  const user: ChatMessage = {
    role: 'user',
    content: JSON.stringify(chunks.map((c, index) => ({ index, text: c.content.slice(0, 2000) }))),
  };
  const { content } = await chatComplete(config, [{ role: 'system', content: SYSTEM_PROMPT }, user], fetchImpl);
  /* Contract tolerance: some models wrap the array in an object ({suggestions:[…]})
     — unwrap the first array value before failing. */
  const rawParsed = extractJson(content);
  const parsed = Array.isArray(rawParsed)
    ? rawParsed
    : (rawParsed && typeof rawParsed === 'object'
        ? Object.values(rawParsed).find((v) => Array.isArray(v)) ?? null
        : null);
  if (!Array.isArray(parsed)) throw new Error('Agent reply is not an array');
  return parsed
    .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    .map((row) => ({
      index: typeof row.index === 'number' ? row.index : -1,
      semantic_name: typeof row.semantic_name === 'string' ? row.semantic_name.slice(0, 80) : '',
      classification: typeof row.classification === 'string' ? row.classification : '',
      rationale: typeof row.rationale === 'string' ? row.rationale : '',
    }))
    .filter((row) => row.index >= 0 && row.semantic_name);
}

export type MetaTagSuggestion = {
  item_id: string;
  /** existing definition id, or `new:<name>` for an invented tag (pending_definition flow) */
  definition_id: string;
  value: string;
  why: string;
  new_name?: string;
};

/**
 * META_TAG_V1 suggest face: choose meta tags FROM the existing definition list;
 * when nothing fits, the model may propose a NEW tag name which surfaces as a
 * pending_definition flow (never auto-created). Best-effort at every level.
 */
export async function suggestMetaTags(
  config: Config,
  items: { id: string; title: string; content: string }[],
  definitions: { id: string; name: string }[],
  fetchImpl: FetchLike = fetch,
): Promise<MetaTagSuggestion[]> {
  if (!items.length) return [];
  const defs = definitions.length
    ? definitions.map((d) => `[${d.id}] ${d.name}`).join('、')
    : '（暂无可选，可建议新名）';
  const lines = items.map((i, n) => `${n + 1}. [${i.id}] ${i.title} :: ${i.content.slice(0, 200)}`).join('\n');
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'Assign meta tags to items. Prefer the given tag definitions (copy the complete id verbatim from [] — never invent or shorten ids). '
        + 'Reply ONLY with JSON: {"tags":[{"item":"<id>","definition":"<tag id>","value":"<short value>","why":"<reason>"}],'
        + '"new_tags":[{"item":"<id>","name":"<new tag name ≤12 chars>","value":"<short value>","why":"<reason>"}]}. '
        + 'Put an assignment in "tags" when an existing definition fits; use "new_tags" ONLY when no existing definition fits and a genuinely new tag name is needed. '
        + 'Skip items that fit nothing. At most 3 tags per item.',
    },
    { role: 'user', content: `标签定义：${defs}\n\n待标注条目：\n${lines}` },
  ];
  const result = await chatComplete(config, messages, fetchImpl);
  const parsed = extractJson(result.content) as {
    tags?: { item?: string; definition?: string; value?: string; why?: string }[];
    new_tags?: { item?: string; name?: string; value?: string; why?: string }[];
  } | null;
  const knownItems = new Set(items.map((i) => i.id));
  const knownDefs = new Set(definitions.map((d) => d.id));
  const out: MetaTagSuggestion[] = [];
  for (const t of parsed?.tags ?? []) {
    if (t.item && t.definition && t.value && knownItems.has(t.item) && knownDefs.has(t.definition)) {
      out.push({ item_id: t.item, definition_id: t.definition, value: String(t.value).slice(0, 200), why: String(t.why ?? '') });
    }
  }
  for (const t of parsed?.new_tags ?? []) {
    const name = String(t.name ?? '').trim().slice(0, 40);
    if (t.item && name && t.value && knownItems.has(t.item)) {
      out.push({
        item_id: t.item,
        definition_id: `new:${name}`,
        new_name: name,
        value: String(t.value).slice(0, 200),
        why: String(t.why ?? ''),
      });
    }
  }
  return out;
}
