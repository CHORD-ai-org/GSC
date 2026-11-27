/**
 * U4：X OAuth 2.0（PKCE）真接入的管线。client id/secret 未配置=未配置状态（屏 1 如实显示）。
 * 授权链：/api/auth/x/start（302 → X 授权页，state+PKCE 存会话缓存）→
 * /api/auth/x/callback（code 换 token，存 oauth_tokens）。
 */
import { createHash, randomBytes } from 'node:crypto';
import type { Config } from '../config.ts';

export function xConfigured(config: Config): boolean {
  return Boolean(config.xClientId && config.xClientSecret);
}

export type XAuthChallenge = { url: string; state: string };

/** 生成授权跳转（PKCE S256）；verifier 由调用方暂存（内存 Map，进程级）。 */
export function authorizeUrl(config: Config, redirectUri: string, verifier: string, state: string): string {
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: config.xClientId,
    redirect_uri: redirectUri,
    state,
    scope: 'users.read tweet.read offline.access',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `https://x.com/i/oauth2/authorize?${q.toString()}`;
}

export function newVerifier(): string {
  return randomBytes(48).toString('base64url');
}

export type XTokenPair = { access_token: string; refresh_token?: string; scope?: string };

export async function exchangeCode(
  config: Config,
  code: string,
  verifier: string,
  redirectUri: string,
  fetchImpl: typeof fetch = fetch,
): Promise<XTokenPair> {
  const res = await fetchImpl('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.xClientId,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`X token HTTP ${res.status}: ${msg.slice(0, 120)}`);
  }
  const d = (await res.json()) as { access_token?: string; refresh_token?: string; scope?: string };
  if (!d.access_token) throw new Error('X token 响应缺少 access_token');
  return { access_token: d.access_token, refresh_token: d.refresh_token, scope: d.scope };
}
