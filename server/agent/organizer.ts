import type { Config } from '../config.ts';
import { chatComplete, extractJson } from './llm.ts';
import type { ChatMessage } from './llm.ts';

export type BlockAssignment = {
  item_id: string;
  cluster_name: string;
  rationale: string;
};

/**
 * G2 organize pass (proposal-generating, D-042): given freshly ingested items
 * and the cluster names already known, suggest a block (cluster) per item.
 * Best-effort — callers treat a throw as "no block proposals this round".
 * Never writes; the caller turns assignments into `cluster` proposals.
 */
export async function proposeBlockAssignment(
  config: Config,
  items: { id: string; title: string; content: string }[],
  knownClusters: string[],
  fetchImpl?: typeof fetch,
): Promise<BlockAssignment[]> {
  const lines = items.map((i, n) => `${n + 1}. [${i.id}] ${i.title} :: ${i.content.slice(0, 200)}`).join('\n');
  const known = knownClusters.length ? knownClusters.join('、') : '（暂无，可建议新名）';
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You organize information into blocks (clusters). Reply ONLY with JSON: '
        + '{"assignments":[{"item":"<id>","cluster":"<block name>","why":"<short reason>"}]}. '
        + 'Group items by topic; reuse an existing cluster name when it fits, otherwise propose a concise new name (≤12 chars preferred). '
        + 'Every item must get exactly one assignment.',
    },
    { role: 'user', content: `已有区块：${known}\n\n待归块条目：\n${lines}` },
  ];
  const result = await chatComplete(config, messages, fetchImpl);
  const parsed = extractJson<{ assignments?: { item?: string; cluster?: string; why?: string }[] }>(result.text);
  const out: BlockAssignment[] = [];
  for (const a of parsed.assignments ?? []) {
    if (a.item && a.cluster) {
      out.push({ item_id: a.item, cluster_name: String(a.cluster).slice(0, 60), rationale: String(a.why ?? '') });
    }
  }
  return out;
}
