import type { Config } from '../config.ts';
import type { ChatMessage, FetchLike } from './llm.ts';
import { structuredCall } from './structured.ts';

/**
 * G7 UI DSL 生成端（GSC_CHAT_PLAN §1.5 文法的生成侧；解析器在 Step 6）。
 * LLM best-effort —— 产不出退化为模板草稿（不静默失败）。
 */
export type FlowDraft = { dsl_text: string; fallback: boolean };

const SYSTEM = [
  'You author a tiny UI DSL for a SMOOTH SELECTION onboarding flow. Reply ONLY with the flow text (no markdown fence, no commentary).',
  'The flow title must be a semantic interaction name like "关键信息确认" — never a task name.',
  'Prefer review (prefilled values with keep/edit) and choose (2-4 explicit options). Avoid empty collect-only forms.',
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
  // 兜底也必须是「选择优先」的丝滑流（LLM 401 时同样成立）
  const lines = [
    'flow "关键信息确认"',
    '  review 项目名 = GoatBed',
    '  review 时间范围 = 2026-01..2026-11',
    '  choose 整理范围: 本周新内容 | 全部项目材料 | 最近30天',
    '  choose 整理方式: 按主题 | 按时间线 | 按项目阶段',
    '  collect 排除项',
    '  confirm write: metadata(plan)',
  ];
  return { dsl_text: lines.join('\n'), fallback: true };
}
