/**
 * Runtime LLM settings (Settings UI → server). The API key NEVER lives here —
 * it goes to the AES-GCM secret store (D-069) under a per-provider id. This
 * file only holds non-sensitive provider selection (provider + base URL + model).
 *
 * Per-provider keys ("different providers require different keys"): each
 * provider keeps its own key slot so switching providers never wipes another
 * provider's credential. The legacy single-slot id `llm_api_key` doubles as the
 * mimo slot (that is what the single-slot era configured).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Config } from '../config.ts';
import { detectProvider, isProviderId, type ProviderId } from '../../src/lib/providers.ts';
import { readSecret, writeSecret } from './secrets.ts';

export type LlmSettings = {
  provider?: string;
  base_url?: string;
  model?: string;
};

const SETTINGS_FILE = 'settings.json';
const KEY_SECRET_ID = 'llm_api_key';

function settingsPath(dataDir: string): string {
  return path.join(dataDir, SETTINGS_FILE);
}

/** Secret-store id for a provider's key. `mimo` maps to the legacy single slot. */
function keySecretId(provider: string): string {
  return provider === 'mimo' ? KEY_SECRET_ID : `${KEY_SECRET_ID}:${provider}`;
}

/** Raw settings record — preserves unknown keys (e.g. local_user_id). */
function readRaw(dataDir: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(settingsPath(dataDir), 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function readLlmSettings(dataDir: string): LlmSettings {
  const parsed = readRaw(dataDir);
  return {
    provider: typeof parsed.provider === 'string' && parsed.provider ? parsed.provider : undefined,
    base_url: typeof parsed.base_url === 'string' && parsed.base_url ? parsed.base_url : undefined,
    model: typeof parsed.model === 'string' && parsed.model ? parsed.model : undefined,
  };
}

/** Merge-write: only patched fields change; every other key in settings.json survives. */
export function writeLlmSettings(dataDir: string, patch: LlmSettings): LlmSettings {
  mkdirSync(dataDir, { recursive: true });
  const current = readLlmSettings(dataDir);
  const next: LlmSettings = {
    provider: patch.provider !== undefined ? patch.provider : current.provider,
    base_url: patch.base_url !== undefined ? patch.base_url : current.base_url,
    model: patch.model !== undefined ? patch.model : current.model,
  };
  const merged = { ...readRaw(dataDir), ...next };
  writeFileSync(settingsPath(dataDir), JSON.stringify(merged, null, 2), 'utf8');
  return next;
}

/** The provider currently selected in settings (explicit choice wins; else URL sniffing). */
export function currentProviderId(dataDir: string): ProviderId {
  const settings = readLlmSettings(dataDir);
  return isProviderId(settings.provider) ? settings.provider : detectProvider(settings.base_url ?? '');
}

export function hasLlmApiKey(dataDir: string, provider?: string): boolean {
  return Boolean(readSecret(dataDir, keySecretId(provider ?? currentProviderId(dataDir))));
}

export function writeLlmApiKey(dataDir: string, key: string, provider?: string): void {
  writeSecret(dataDir, keySecretId(provider ?? currentProviderId(dataDir)), key);
}

/** Effective provider config: env defaults overlaid with Settings-UI values. */
export function resolveLlmConfig(base: Config, dataDir: string): Config {
  const settings = readLlmSettings(dataDir);
  const provider = currentProviderId(dataDir);
  return {
    ...base,
    llmBaseUrl: settings.base_url ?? base.llmBaseUrl,
    llmModel: settings.model ?? base.llmModel,
    llmApiKey: readSecret(dataDir, keySecretId(provider)) || base.llmApiKey,
  };
}

/** Public shape for the Settings UI — the key itself is never returned. */
export function llmPublicConfig(base: Config, dataDir: string): {
  provider: string;
  base_url: string;
  model: string;
  key_set: boolean;
  key_hint: string;
} {
  const effective = resolveLlmConfig(base, dataDir);
  const key = effective.llmApiKey;
  return {
    provider: currentProviderId(dataDir),
    base_url: effective.llmBaseUrl,
    model: effective.llmModel,
    key_set: Boolean(key),
    key_hint: key ? `${key.slice(0, 4)}…${key.slice(-4)}` : '',
  };
}

/* T103 local account: the first created user is bound as the local account.
   owner_id on writes resolves through this binding instead of DEFAULT_USER_ID. */
export function readLocalUserId(dataDir: string): string | undefined {
  try {
    const parsed = JSON.parse(readFileSync(settingsPath(dataDir), 'utf8')) as Record<string, unknown>;
    return typeof parsed.local_user_id === 'string' && parsed.local_user_id ? parsed.local_user_id : undefined;
  } catch {
    return undefined;
  }
}

export function writeLocalUserId(dataDir: string, userId: string): void {
  mkdirSync(dataDir, { recursive: true });
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(readFileSync(settingsPath(dataDir), 'utf8')) as Record<string, unknown>; } catch { /* fresh */ }
  parsed.local_user_id = userId;
  writeFileSync(settingsPath(dataDir), JSON.stringify(parsed, null, 2));
}

export function clearLocalUserId(dataDir: string): void {
  try {
    const parsed = JSON.parse(readFileSync(settingsPath(dataDir), 'utf8')) as Record<string, unknown>;
    delete parsed.local_user_id;
    writeFileSync(settingsPath(dataDir), JSON.stringify(parsed, null, 2));
  } catch { /* nothing to clear */ }
}
