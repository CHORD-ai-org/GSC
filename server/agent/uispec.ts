import type { Config } from '../config.ts';
import type { ChatMessage, FetchLike } from './llm.ts';
import { structuredCall } from './structured.ts';

/**
 * G7 UI DSL 生成端（GSC_CHAT_PLAN §1.5 文法的生成侧；解析器在 Step 6）。
 * LLM best-effort —— 产不出退化为模板草稿（不静默失败）。
 */
export type FlowDraft = { dsl_text: string; fallback: boolean };

const SYSTEM = [
  'You author a tiny UI DSL for an onboarding flow. Reply ONLY with the flow text (no markdown fence, no commentary).',
  'Grammar (line-oriented, two-space indent):',
  'flow "<title>"',
  '  review <字段> = <预填值>',
  '  collect <字段>',
  '  choose <字段>: <选项> | <选项>',
  '  confirm write: <提案动作>',
  '  note <说明>',
  'Rules: at most 12 steps; field names ≤20 chars; values ≤200 chars; no scripts, no URLs, no code.',
].join('\n');

export async function generateOnboardingFlow(
  config: Config,
  ctx: { title: string; goal: string; reviewFields: { name: string; value: string }[]; collectFields: string[] },
  fetchImpl?: FetchLike,
): Promise<FlowDraft> {
  const user: ChatMessage = {
    role: 'user',
    content: JSON.stringify(ctx),
  };
  try {
    const { chatComplete } = await import('./llm.ts');
    const { content } = await chatComplete(config, [{ role: 'system', content: SYSTEM }, user], fetchImpl);
    const text = content.replace(/^```[a-z]*\n?|```$/g, '').trim();
    if (text.startsWith('flow ') && text.length <= 4000) return { dsl_text: text, fallback: false };
  } catch {
    /* fall through to template */
  }
  const lines = [`flow "${ctx.title.slice(0, 40)}"`, `  note ${ctx.goal.slice(0, 120)}`];
  for (const f of ctx.reviewFields.slice(0, 8)) lines.push(`  review ${f.name} = ${f.value}`);
  for (const f of ctx.collectFields.slice(0, 8)) lines.push(`  collect ${f}`);
  lines.push('  confirm write: metadata(plan)');
  return { dsl_text: lines.join('\n'), fallback: true };
}
