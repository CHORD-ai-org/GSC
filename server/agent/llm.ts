/**
 * OpenAI-compatible chat-completions adapter (D-052). Config-driven so
 * Xiaomi MiMo (default), Deepseek and local endpoints (llama.cpp / Ollama /
 * LM Studio) all work through `GSC_LLM_BASE_URL`. Fetch is injectable for tests.
 *
 * MiMo notes (https://mimo.mi.com/docs/zh-CN/api/chat/openai-api):
 * - endpoint https://api.xiaomimimo.com/v1/chat/completions, OpenAI-compatible;
 * - accepts either `Authorization: Bearer` or `api-key` header — we send both;
 * - deep thinking can be disabled with `thinking: { type: 'disabled' }`;
 * - replies may carry `reasoning_content` alongside `content` — we read `content`
 *   only and never surface the reasoning trace.
 */
import type { Config } from '../config.ts';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type LlmResult = {
  content: string;
  model: string;
};

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

function isLocalEndpoint(baseUrl: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/.test(baseUrl);
}

export async function chatComplete(
  config: Config,
  messages: ChatMessage[],
  fetchImpl: FetchLike = fetch,
): Promise<LlmResult> {
  // Cloud endpoints need a key; local ones (llama.cpp/Ollama) typically do not.
  if (!config.llmApiKey && !isLocalEndpoint(config.llmBaseUrl)) {
    throw new Error('GSC_LLM_API_KEY is not configured');
  }
  const isMimo = config.llmBaseUrl.includes('xiaomimimo.com');
  const res = await fetchImpl(`${config.llmBaseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(config.llmApiKey
        ? { authorization: `Bearer ${config.llmApiKey}`, 'api-key': config.llmApiKey }
        : {}),
    },
    body: JSON.stringify({
      model: config.llmModel,
      messages,
      temperature: 0,
      // MiMo: skip deep thinking for fast, cheap structured suggestions.
      ...(isMimo ? { thinking: { type: 'disabled' } } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`LLM HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }
  const body = (await res.json()) as {
    choices?: { message?: { content?: string; reasoning_content?: string } }[];
    model?: string;
  };
  // Only the answer content is used; reasoning_content is never read or logged.
  const content = body.choices?.[0]?.message?.content ?? '';
  return { content, model: body.model ?? config.llmModel };
}

/** Extract the first JSON object/array from a model reply (tolerates code fences). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start < 0) throw new Error('No JSON in model reply');
  for (let end = candidate.length; end > start; end -= 1) {
    const slice = candidate.slice(start, end).trim();
    if (!slice.endsWith(']') && !slice.endsWith('}')) continue;
    try {
      return JSON.parse(slice);
    } catch {
      /* keep shrinking */
    }
  }
  throw new Error('Malformed JSON in model reply');
}
