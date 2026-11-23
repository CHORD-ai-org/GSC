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
