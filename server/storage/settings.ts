/**
 * Runtime LLM settings (Settings UI → server). The API key NEVER lives here —
 * it goes to the AES-GCM secret store (D-069) under `llm_api_key`. This file
 * only holds non-sensitive provider selection (base URL + model).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Config } from '../config.ts';
import { readSecret, writeSecret } from './secrets.ts';

export type LlmSettings = {
  base_url?: string;
  model?: string;
};

const SETTINGS_FILE = 'settings.json';
const KEY_SECRET_ID = 'llm_api_key';

function settingsPath(dataDir: string): string {
  return path.join(dataDir, SETTINGS_FILE);
}

export function readLlmSettings(dataDir: string): LlmSettings {
  try {
    const parsed = JSON.parse(readFileSync(settingsPath(dataDir), 'utf8')) as LlmSettings;
    return {
      base_url: typeof parsed.base_url === 'string' && parsed.base_url ? parsed.base_url : undefined,
      model: typeof parsed.model === 'string' && parsed.model ? parsed.model : undefined,
    };
  } catch {
    return {};
  }
}

export function writeLlmSettings(dataDir: string, patch: LlmSettings): LlmSettings {
  mkdirSync(dataDir, { recursive: true });
  const current = readLlmSettings(dataDir);
  const next: LlmSettings = {
    base_url: patch.base_url !== undefined ? patch.base_url : current.base_url,
    model: patch.model !== undefined ? patch.model : current.model,
  };
  writeFileSync(settingsPath(dataDir), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

export function hasLlmApiKey(dataDir: string): boolean {
  return Boolean(readSecret(dataDir, KEY_SECRET_ID));
}

export function writeLlmApiKey(dataDir: string, key: string): void {
  writeSecret(dataDir, KEY_SECRET_ID, key);
}

/** Effective provider config: env defaults overlaid with Settings-UI values. */
export function resolveLlmConfig(base: Config, dataDir: string): Config {
  const settings = readLlmSettings(dataDir);
  return {
    ...base,
    llmBaseUrl: settings.base_url ?? base.llmBaseUrl,
    llmModel: settings.model ?? base.llmModel,
    llmApiKey: readSecret(dataDir, KEY_SECRET_ID) || base.llmApiKey,
  };
}

/** Public shape for the Settings UI — the key itself is never returned. */
export function llmPublicConfig(base: Config, dataDir: string): {
  base_url: string;
  model: string;
  key_set: boolean;
  key_hint: string;
} {
  const effective = resolveLlmConfig(base, dataDir);
  const key = effective.llmApiKey;
  return {
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
