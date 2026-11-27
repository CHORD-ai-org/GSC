/** U4：oauth_tokens（0018）——provider 级令牌存取。 */
import { eq, and } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import { oauthTokens } from '../persistence/schema.ts';

export type OauthTokenDTO = { provider: string; created_at: string };

export async function saveOauthToken(
  db: Database,
  userId: string,
  provider: string,
  accessToken: string,
  refreshToken?: string,
  scope?: string,
): Promise<void> {
  await db
    .insert(oauthTokens)
    .values({ user_id: userId, provider, access_token: accessToken, refresh_token: refreshToken ?? null, scope: scope ?? null, created_at: new Date() })
    .onConflictDoUpdate({
      target: [oauthTokens.user_id, oauthTokens.provider],
      set: { access_token: accessToken, refresh_token: refreshToken ?? null, created_at: new Date() },
    });
}

export async function hasOauthToken(db: Database, userId: string, provider: string): Promise<boolean> {
  const rows = await db
    .select({ provider: oauthTokens.provider })
    .from(oauthTokens)
    .where(and(eq(oauthTokens.user_id, userId), eq(oauthTokens.provider, provider)))
    .limit(1);
  return rows.length > 0;
}
