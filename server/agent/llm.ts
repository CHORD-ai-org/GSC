/**
 * OpenAI-compatible chat-completions adapter (D-052). Config-driven so
 * Xiaomi MiMo (default), Deepseek and local endpoints (llama.cpp / Ollama /
 * LM Studio) all work through `GSC_LLM_BASE_URL`. Fetch is injectable for tests.
 *
 * INTEGRATION_HARDENING (P0-A) — commercial reliability baseline:
 * - every call is bounded by `llmTimeoutMs` (never hangs a request);
 * - transient failures (429 / 5xx / timeout / network) retry with exponential
 *   backoff up to `llmMaxRetries`, then surface as a typed `LlmError`;
 * - provider `usage` (prompt/completion tokens) is captured and exported to
 *   Prometheus counters + a structured log line for cost accounting.
 *
 * MiMo notes (https://mimo.mi.com/docs/zh-CN/api/chat/openai-api):
 * - endpoint https://api.xiaomimimo.com/v1/chat/completions, OpenAI-compatible;
 * - accepts either `Authorization: Bearer` or `api-key` header — we send both;
 * - deep thinking can be disabled with `thinking: { type: 'disabled' }`;
 * - replies may carry `reasoning_content` alongside `content` — we read `content`
 *   only and never surface the reasoning trace.
 */
import type { Config } from '../config.ts';
import { log } from '../log.ts';
import { metrics } from '../metrics.ts';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type LlmUsage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };

export type LlmResult = {
  content: string;
  model: string;
  usage?: LlmUsage;
};

export type LlmErrorKind = 'timeout' | 'rate_limited' | 'auth' | 'provider' | 'contract';

/** Typed provider failure: `retryable` drives the retry loop and downstream handling. */
export class LlmError extends Error {
  readonly kind: LlmErrorKind;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(kind: LlmErrorKind, message: string, retryable: boolean, status?: number) {
    super(message);
    this.name = 'LlmError';
    this.kind = kind;
    this.retryable = retryable;
    this.status = status;
  }
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

function isLocalEndpoint(baseUrl: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/.test(baseUrl);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffMs(attempt: number, base: number): number {
  const exp = base * 2 ** attempt;
  return Math.min(exp, 8000) + Math.floor(Math.random() * 100);
}

function classify(status: number): LlmErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'provider';
  return 'contract';
}

function isRetryable(kind: LlmErrorKind): boolean {
  return kind === 'timeout' || kind === 'rate_limited' || kind === 'provider';
}

/**
 * A single bounded provider call. Bounded twice over: AbortController cancels
 * the real fetch and a Promise.race timeout guarantees a hard ceiling even if a
 * test double ignores the signal. Status → `LlmError` classification happens here.
 */
async function callOnce(
  config: Config,
  messages: ChatMessage[],
  fetchImpl: FetchLike,
): Promise<LlmResult> {
  if (!config.llmApiKey && !isLocalEndpoint(config.llmBaseUrl)) {
    throw new LlmError('auth', 'GSC_LLM_API_KEY is not configured', false);
  }
  const isMimo = config.llmBaseUrl.includes('xiaomimimo.com');
  const controller = new AbortController();
  const startedAt = Date.now();
  let abortTimer: ReturnType<typeof setTimeout>;
  let raceTimer: ReturnType<typeof setTimeout>;
  abortTimer = setTimeout(() => controller.abort(), config.llmTimeoutMs);

  const request = fetchImpl(`${config.llmBaseUrl.replace(/\/$/, '')}/chat/completions`, {
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
    signal: controller.signal,
  });

  let res: Response;
  try {
    res = await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        raceTimer = setTimeout(() => reject(new LlmError('timeout', `LLM call exceeded ${config.llmTimeoutMs}ms`, true)), config.llmTimeoutMs);
      }),
    ]);
  } catch (e) {
    if (e instanceof LlmError) throw e;
    const aborted = e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError');
    throw new LlmError(
      aborted ? 'timeout' : 'provider',
      aborted ? `LLM call exceeded ${config.llmTimeoutMs}ms` : `LLM network error: ${e instanceof Error ? e.message : String(e)}`,
      true,
    );
  } finally {
    // Clear both the abort timer and the race timeout so no timer leaks and
    // keeps the event loop (and test teardown) alive.
    clearTimeout(abortTimer!);
    clearTimeout(raceTimer!);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const kind = classify(res.status);
    throw new LlmError(kind, `LLM HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`, isRetryable(kind), res.status);
  }

  let body: {
    choices?: { message?: { content?: string; reasoning_content?: string } }[];
    model?: string;
    usage?: LlmUsage;
  };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    throw new LlmError('contract', 'LLM returned non-JSON body', false);
  }

  // Only the answer content is used; reasoning_content is never read or logged.
  const content = body.choices?.[0]?.message?.content ?? '';
  const usage = body.usage;
  void startedAt;
  return { content, model: body.model ?? config.llmModel, usage };
}

/** Bounded, retried, metered provider call. */
export async function chatComplete(
  config: Config,
  messages: ChatMessage[],
  fetchImpl: FetchLike = fetch,
): Promise<LlmResult> {
  const maxRetries = config.llmMaxRetries ?? 2;
  let lastErr: LlmError | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const t0 = Date.now();
    try {
      const result = await callOnce(config, messages, fetchImpl);
      const ms = Date.now() - t0;
      metrics.llmRequests.inc({ model: result.model, status: 'ok' });
      metrics.llmDuration.observe({ model: result.model }, ms);
      const usage = result.usage;
      if (usage?.prompt_tokens) metrics.llmTokens.inc({ model: result.model, type: 'prompt' }, usage.prompt_tokens);
      if (usage?.completion_tokens) metrics.llmTokens.inc({ model: result.model, type: 'completion' }, usage.completion_tokens);
      log('info', 'llm.call', {
        model: result.model,
        ms,
        attempt,
        prompt_tokens: usage?.prompt_tokens,
        completion_tokens: usage?.completion_tokens,
      });
      return result;
    } catch (e) {
      const err = e instanceof LlmError ? e : new LlmError('provider', e instanceof Error ? e.message : String(e), true);
      lastErr = err;
      metrics.llmRequests.inc({ model: config.llmModel, status: err.kind });
      if (!err.retryable || attempt === maxRetries) {
        log('error', 'llm.fail', { model: config.llmModel, ms: Date.now() - t0, attempt, kind: err.kind, message: err.message });
        throw err;
      }
      metrics.llmRetries.inc({ model: config.llmModel, reason: err.kind });
      log('warn', 'llm.retry', { model: config.llmModel, attempt, kind: err.kind });
      await sleep(backoffMs(attempt, config.llmRetryBaseMs ?? 400));
    }
  }
  /* istanbul ignore next — loop always returns or throws */
  throw lastErr ?? new LlmError('provider', 'LLM call failed', true);
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
