import { describe, expect, it } from 'vitest';
import { chatComplete, extractJson, LlmError } from './llm.ts';
import { readConfig } from '../config.ts';

function stubFetch(handler: (url: string, init?: RequestInit) => { status?: number; body: unknown }) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const { status = 200, body } = handler(url, init);
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  return { fetchImpl, calls };
}

const MIMO = readConfig({ GSC_LLM_API_KEY: 'test-key', GSC_LLM_BASE_URL: 'https://token-plan-cn.xiaomimimo.com/v1' });

describe('MiMo LLM adapter (OpenAI-compatible)', () => {
  it('sends Bearer + api-key headers, model, and disables deep thinking on MiMo', async () => {
    const { fetchImpl, calls } = stubFetch(() => ({ body: { model: 'mimo-v2.6-flash', choices: [{ message: { content: 'OK' } }] } }));
    const result = await chatComplete(MIMO, [{ role: 'user', content: 'ping' }], fetchImpl);
    expect(result.content).toBe('OK');
    expect(calls[0].url).toBe('https://token-plan-cn.xiaomimimo.com/v1/chat/completions');
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer test-key');
    expect(headers['api-key']).toBe('test-key');
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.model).toBe('mimo-v2.6-flash');
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.temperature).toBe(0);
  });

  it('does not send thinking field to non-MiMo endpoints and allows keyless local endpoints', async () => {
    const local = readConfig({ GSC_LLM_BASE_URL: 'http://127.0.0.1:8080/v1', GSC_LLM_MODEL: 'local' });
    const { fetchImpl, calls } = stubFetch(() => ({ body: { choices: [{ message: { content: 'hi' } }] } }));
    await chatComplete(local, [{ role: 'user', content: 'x' }], fetchImpl);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.thinking).toBeUndefined();
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it('rejects cloud endpoints without an API key', async () => {
    const noKey = readConfig({});
    await expect(chatComplete(noKey, [], async () => new Response('{}'))).rejects.toThrow(/GSC_LLM_API_KEY/);
  });

  it('reads content only and tolerates reasoning_content in replies', async () => {
    const { fetchImpl } = stubFetch(() => ({
      body: {
        model: 'mimo-v2.6-pro',
        choices: [{ message: { content: '{"suggestions":[]}', reasoning_content: 'internal trace that must not surface' } }],
      },
    }));
    const result = await chatComplete(MIMO, [{ role: 'user', content: 'x' }], fetchImpl);
    expect(result.content).toBe('{"suggestions":[]}');
    expect(result.content).not.toContain('internal trace');
  });

  it('surfaces HTTP errors with a bounded body snippet', async () => {
    const { fetchImpl } = stubFetch(() => ({ status: 401, body: { error: { message: 'invalid api key' } } }));
    await expect(chatComplete(MIMO, [], fetchImpl)).rejects.toThrow(/LLM HTTP 401/);
  });

  it('extracts JSON from fenced and chatty replies', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here you go: {"b":[2]} hope that helps')).toEqual({ b: [2] });
    expect(() => extractJson('no json here')).toThrow(/No JSON/);
  });
});

describe('LLM reliability (INTEGRATION_HARDENING P0-A)', () => {
  const fast = readConfig({
    GSC_LLM_API_KEY: 'k',
    GSC_LLM_BASE_URL: 'https://token-plan-cn.xiaomimimo.com/v1',
    GSC_LLM_RETRY_BASE_MS: '1',
    GSC_LLM_TIMEOUT_MS: '60',
    GSC_LLM_MAX_RETRIES: '2',
  });

  it('times out a hung provider call and reports a retryable timeout', async () => {
    const hung = async () => new Promise<Response>(() => { /* never settles */ });
    await expect(chatComplete(fast, [{ role: 'user', content: 'x' }], hung)).rejects.toMatchObject({
      name: 'LlmError',
      kind: 'timeout',
      retryable: true,
    });
  });

  it('retries transient 429 then succeeds', async () => {
    let n = 0;
    const fetchImpl = async () => {
      n += 1;
      if (n === 1) return new Response(JSON.stringify({ error: 'rate' }), { status: 429, headers: { 'content-type': 'application/json' } });
      return new Response(JSON.stringify({ model: 'm', choices: [{ message: { content: 'ok' } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    const result = await chatComplete(fast, [{ role: 'user', content: 'x' }], fetchImpl);
    expect(result.content).toBe('ok');
    expect(n).toBe(2);
  });

  it('does not retry a non-retryable auth failure', async () => {
    let n = 0;
    const fetchImpl = async () => {
      n += 1;
      return new Response(JSON.stringify({ error: 'bad key' }), { status: 401, headers: { 'content-type': 'application/json' } });
    };
    await expect(chatComplete(fast, [], fetchImpl)).rejects.toMatchObject({ kind: 'auth', retryable: false });
    expect(n).toBe(1);
  });

  it('captures provider token usage for cost accounting', async () => {
    const { fetchImpl } = stubFetch(() => ({
      body: {
        model: 'mimo-v2.6-pro',
        choices: [{ message: { content: '{}' } }],
        usage: { prompt_tokens: 12, completion_tokens: 7, total_tokens: 19 },
      },
    }));
    const result = await chatComplete(MIMO, [], fetchImpl);
    expect(result.usage).toEqual({ prompt_tokens: 12, completion_tokens: 7, total_tokens: 19 });
  });

  it('exposes a typed LlmError', () => {
    const err = new LlmError('rate_limited', 'slow down', true, 429);
    expect(err.kind).toBe('rate_limited');
    expect(err.retryable).toBe(true);
    expect(err.status).toBe(429);
  });
});
