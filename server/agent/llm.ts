/**
 * OpenAI-compatible chat-completions adapter (D-052). Config-driven so
 * Deepseek (default) and local endpoints (llama.cpp / Ollama / LM Studio)
 * all work through `GSC_LLM_BASE_URL`. Fetch is injectable for tests.
 */
import type { Config } from '../config.ts';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type LlmResult = {
  content: string;
  model: string;
};

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function chatComplete(
  config: Config,
  messages: ChatMessage[],
  fetchImpl: FetchLike = fetch,
): Promise<LlmResult> {
  if (!config.llmApiKey && config.llmBaseUrl.includes('deepseek.com')) {
    throw new Error('GSC_LLM_API_KEY is not configured');
  }
  const res = await fetchImpl(`${config.llmBaseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(config.llmApiKey ? { authorization: `Bearer ${config.llmApiKey}` } : {}),
    },
    body: JSON.stringify({ model: config.llmModel, messages, temperature: 0 }),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[]; model?: string };
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
