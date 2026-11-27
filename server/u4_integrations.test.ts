import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createDatabase } from './persistence/client.ts';
import { migrationSql } from './persistence/migrate.ts';
import { readConfig } from './config.ts';
import { ttsSpeak, fishConfigured } from './integrations/fishaudio.ts';
import { authorizeUrl, exchangeCode, newVerifier, xConfigured } from './integrations/xoauth.ts';
import { createUser } from './repo/users.ts';

const config = readConfig({ PGLITE_DIR: './.data/_unused', GSC_LLM_API_KEY: 'k' });
const configFish = readConfig({ PGLITE_DIR: './.data/_unused', GSC_FISH_AUDIO_KEY: 'fk' });

describe('U4：Fish Audio TTS', () => {
  it('未配置如实上报 + 配置后走官方端点', async () => {
    expect(fishConfigured(config)).toBe(false);
    await expect(ttsSpeak(config, '你好')).rejects.toThrow('TTS 未配置');

    let calledUrl = '';
    let calledAuth = '';
    const fetchMock = (async (url: unknown, init?: RequestInit) => {
      calledUrl = String(url);
      calledAuth = String((init?.headers as Record<string, string>).authorization);
      return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'audio/mpeg' } });
    }) as unknown as typeof fetch;
    const audio = await ttsSpeak(configFish, '你好，Tau', fetchMock);
    expect(audio.length).toBe(3);
    expect(calledUrl).toBe('https://api.fish.audio/v1/tts');
    expect(calledAuth).toBe('Bearer fk');
  });
});

describe('U4：X OAuth（PKCE）', () => {
  it('未配置如实上报；授权 URL 含 PKCE；code 换 token 走官方端点', async () => {
    expect(xConfigured(config)).toBe(false);
    const cfgX = readConfig({ PGLITE_DIR: './.data/_unused', GSC_X_CLIENT_ID: 'cid', GSC_X_CLIENT_SECRET: 'sec' });
    expect(xConfigured(cfgX)).toBe(true);
    const verifier = newVerifier();
    const url = authorizeUrl(cfgX, 'http://127.0.0.1:8788/api/auth/x/callback', verifier, 'st1');
    expect(url).toContain('https://x.com/i/oauth2/authorize');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('client_id=cid');

    const fetchMock = (async () => new Response(JSON.stringify({ access_token: 'tok', refresh_token: 'r', scope: 'users.read' }), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch;
    const token = await exchangeCode(cfgX, 'code1', verifier, 'http://127.0.0.1:8788/api/auth/x/callback', fetchMock);
    expect(token.access_token).toBe('tok');
  });

  it('router：status 未配置如实；tts 未配置 → contract 失败', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-u4-'));
    try {
      const handle = createDatabase();
      await handle.exec(migrationSql());
      await createUser(handle.db, 'Ceaser');
      const { createApiRouter } = await import('./router.ts');
      const cfg = readConfig({ PGLITE_DIR: path.join(dir, 'p') });
      const apiRouter = (await import('./router.ts')).createApiRouter(cfg, handle.db);
      async function call(method: string, url: string): Promise<{ status: number; body: string }> {
        const res = { statusCode: 200, body: '', headers: {} as Record<string, string>, setHeader() {}, end(c?: string) { res.body = c ?? ''; } };
        const req = Readable.from(method === 'POST' ? [JSON.stringify({ text: 'hi' })] : ['']) as IncomingMessage;
        req.method = method;
        req.url = url;
        await apiRouter(req, res as unknown as import('node:http').ServerResponse, () => {});
        return { status: res.statusCode, body: res.body };
      }
      const st = await call('GET', '/api/auth/x/status');
      expect(JSON.parse(st.body)).toMatchObject({ ok: true, configured: false, connected: false });
      const tts = await call('POST', '/api/tts');
      expect(tts.status).toBe(502); // internal → 502（本仓库约定）
      expect(JSON.parse(tts.body).message).toContain('TTS 未配置');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
