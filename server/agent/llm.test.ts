import { describe, expect, it } from 'vitest';
import { chatComplete, extractJson } from './llm.ts';
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

const MIMO = readConfig({ GSC_LLM_API_KEY: 'test-key' });

describe('MiMo LLM adapter (OpenAI-compatible)', () => {
  it('sends Bearer + api-key headers, model, and disables deep thinking on MiMo', async () => {
    const { fetchImpl, calls } = stubFetch(() => ({ body: { model: 'mimo-v2.6-flash', choices: [{ message: { content: 'OK' } }] } }));
    const result = await chatComplete(MIMO, [{ role: 'user', content: 'ping' }], fetchImpl);
    expect(result.content).toBe('OK');
    expect(calls[0].url).toBe('https://api.xiaomimimo.com/v1/chat/completions');
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
