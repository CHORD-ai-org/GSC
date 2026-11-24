/**
 * SEMANTIC_TITLE_PLAN (batch B): semantic title generation for outline nodes.
 * One LLM call per sibling group — siblings are generated together with the
 * parent title and confirmed titles as context, which is where naming
 * consistency comes from. Never writes user data: output becomes
 * semantic_name proposals (target_path-scoped).
 */
import type { Config } from '../config.ts';
import { chatComplete, extractJson } from './llm.ts';
import type { ChatMessage } from './llm.ts';

export type TitleRequestNode = { path: string; level: number; text: string };
export type TitleCandidate = { path: string; title: string; rationale: string };

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const SYSTEM_PROMPT = [
  'You are GSC Agent. You write semantic titles (语义总结) for document sections; you never decide.',
  'A title states what the section is ABOUT as an event-style factual phrase (e.g. "导师周会改期至周四 14:00"), never a verbatim quote.',
  'Titles: level 1 at most 80 chars, deeper levels at most 24 chars. Language follows the document language.',
  'Sibling titles must be distinct from each other and from the confirmed titles given.',
  'Reply with a JSON array: [{"path":"1.1","title":"...","rationale":"<short quote from the text as evidence>"}].',
  'No prose outside the JSON.',
].join(' ');

async function callTitler(
  config: Config,
  parentTitle: string | null,
  nodes: TitleRequestNode[],
  confirmedTitles: { path: string; title: string }[],
  fetchImpl: FetchLike,
): Promise<TitleCandidate[]> {
  const user: ChatMessage = {
    role: 'user',
    content: JSON.stringify({
      parent_title: parentTitle,
      confirmed_titles: confirmedTitles,
      nodes: nodes.map((n) => ({ path: n.path, level: n.level, text: n.text.slice(0, 2000) })),
    }),
  };
  const { content } = await chatComplete(config, [{ role: 'system', content: SYSTEM_PROMPT }, user], fetchImpl);
  /* Same contract tolerance as proposer: some models wrap the array in an object. */
  const rawParsed = extractJson(content);
  const parsed = Array.isArray(rawParsed)
    ? rawParsed
    : (rawParsed && typeof rawParsed === 'object'
        ? Object.values(rawParsed).find((v) => Array.isArray(v)) ?? null
        : null);
  if (!Array.isArray(parsed)) throw new Error('Titler reply is not an array');
  const known = new Set(nodes.map((n) => n.path));
  return parsed
    .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    .map((row) => ({
      path: typeof row.path === 'string' ? row.path : '',
      title: typeof row.title === 'string' ? row.title.trim().slice(0, 80) : '',
      rationale: typeof row.rationale === 'string' ? row.rationale : '',
    }))
    .filter((row) => known.has(row.path) && row.title);
}

/**
 * Generate titles for a sibling group. Duplicate titles (vs each other or the
 * confirmed set) get ONE regeneration pass (SEMANTIC_TITLE_PLAN collision
 * policy); still-duplicated paths are dropped — the caller keeps their rule
 * titles ("待改") instead of shipping ambiguous proposals.
 */
export async function suggestTitles(
  config: Config,
  parentTitle: string | null,
  nodes: TitleRequestNode[],
  confirmedTitles: { path: string; title: string }[] = [],
  fetchImpl: FetchLike = fetch,
): Promise<TitleCandidate[]> {
  const first = await callTitler(config, parentTitle, nodes, confirmedTitles, fetchImpl);
  const taken = new Set(confirmedTitles.map((t) => t.title));
  const counts = new Map<string, number>();
  for (const c of first) counts.set(c.title, (counts.get(c.title) ?? 0) + 1);
  // every member of a duplicate cluster regenerates (first-comers are ambiguous too)
  const dupPaths = new Set(
    first
      .filter((c) => taken.has(c.title) || (counts.get(c.title) ?? 0) > 1)
      .map((c) => c.path),
  );
  if (dupPaths.size === 0) return first;
  const retryNodes = nodes.filter((n) => dupPaths.has(n.path));
  const retry = await callTitler(
    config,
    parentTitle,
    retryNodes,
    [...confirmedTitles, ...first.filter((c) => !dupPaths.has(c.path))],
    fetchImpl,
  );
  const taken2 = new Set([...confirmedTitles, ...first.filter((c) => !dupPaths.has(c.path))].map((c) => c.title));
  const final: TitleCandidate[] = first.filter((c) => !dupPaths.has(c.path));
  const seen2 = new Set<string>();
  for (const c of retry) {
    if (taken2.has(c.title) || seen2.has(c.title)) continue; // still duplicate → stay rule ("待改")
    seen2.add(c.title);
    final.push(c);
  }
  return final;
}
