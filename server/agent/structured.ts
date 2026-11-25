import type { Config } from '../config.ts';
import { chatComplete, extractJson, type ChatMessage, type FetchLike } from './llm.ts';

/**
 * G7 LLM 任务层（GSC_CHAT_PLAN §1.2）：结构化输出 + 校验 + 修复重试 + 回退。
 * 产物只进提案/计划层，不直写（D-042 不变式）。
 */
export class PlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanError';
  }
}

export type StructuredCallOpts<T> = {
  /** Return the parsed value (typed) or null when invalid. */
  validate: (v: unknown) => T | null;
  /** Repair attempts: feed validation failure back and retry (default 1). */
  repair?: number;
  fetchImpl?: FetchLike;
};

export async function structuredCall<T>(
  config: Config,
  messages: ChatMessage[],
  opts: StructuredCallOpts<T>,
): Promise<T> {
  const repair = opts.repair ?? 1;
  const convo: ChatMessage[] = [...messages];
  for (let attempt = 0; attempt <= repair; attempt += 1) {
    const { content } = await chatComplete(config, convo, opts.fetchImpl);
    let parsed: unknown = null;
    try {
      parsed = extractJson(content);
    } catch {
      parsed = null; // 无 JSON = 违约，走修复环
    }
    const valid = opts.validate(parsed ?? undefined);
    if (valid !== null) return valid;
    if (attempt < repair) {
      convo.push({ role: 'assistant', content });
      convo.push({ role: 'user', content: 'That reply did not satisfy the contract. Reply again with ONLY the required JSON shape.' });
    }
  }
  throw new PlanError('structured output did not satisfy the contract');
}
