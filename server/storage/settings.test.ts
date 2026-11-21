import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readConfig } from '../config.ts';
import {
  currentProviderId,
  llmPublicConfig,
  resolveLlmConfig,
  writeLlmApiKey,
  writeLlmSettings,
  writeLocalUserId,
} from './settings.ts';

function tmpDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'gsc-settings-'));
}

describe('LLM settings — per-provider keys + safe merge writes', () => {
  it('writeLlmSettings merges: unrelated keys (local_user_id) survive a settings save', () => {
    const dir = tmpDir();
    writeLocalUserId(dir, 'usr_abc');
    writeLlmSettings(dir, { base_url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' });
    const raw = JSON.parse(readFileSync(path.join(dir, 'settings.json'), 'utf8')) as Record<string, unknown>;
    expect(raw.local_user_id).toBe('usr_abc');
    expect(raw.base_url).toBe('https://api.deepseek.com/v1');
    expect(raw.model).toBe('deepseek-chat');
  });

  it('keeps a separate key slot per provider — switching never wipes another credential', () => {
    const dir = tmpDir();
    writeLlmApiKey(dir, 'mimo-key', 'mimo');
    writeLlmApiKey(dir, 'claude-key', 'claude');
    writeLlmSettings(dir, { provider: 'claude', base_url: 'https://api.anthropic.com/v1' });
    expect(resolveLlmConfig(readConfig({}), dir).llmApiKey).toBe('claude-key');
    writeLlmSettings(dir, { provider: 'mimo', base_url: 'https://token-plan-cn.xiaomimimo.com/v1' });
    expect(resolveLlmConfig(readConfig({}), dir).llmApiKey).toBe('mimo-key');
  });

  it('reports provider + key status through llmPublicConfig and detects provider from the URL', () => {
    const dir = tmpDir();
    writeLlmApiKey(dir, 'sk-ant-secret', 'claude');
    writeLlmSettings(dir, { base_url: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-5' });
    expect(currentProviderId(dir)).toBe('claude');
    const pub = llmPublicConfig(readConfig({}), dir);
    expect(pub.provider).toBe('claude');
    expect(pub.key_set).toBe(true);
    expect(pub.key_hint.startsWith('sk-a')).toBe(true);
    // The claude key must not leak into another provider's effective config.
    writeLlmSettings(dir, { provider: 'openai', base_url: 'https://api.openai.com/v1' });
    expect(llmPublicConfig(readConfig({}), dir)).toMatchObject({ provider: 'openai', key_set: false });
  });

  it('the legacy single-slot key acts as the mimo key (single-slot era migration)', () => {
    const dir = tmpDir();
    writeLlmApiKey(dir, 'legacy-key', 'mimo');
    writeLlmSettings(dir, { base_url: 'https://token-plan-cn.xiaomimimo.com/v1' });
    expect(resolveLlmConfig(readConfig({}), dir).llmApiKey).toBe('legacy-key');
  });
});
