import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readSecret, writeSecret } from './secrets.ts';

describe('secret store encryption (O1-6)', () => {
  it('round-trips values and never writes plaintext to disk', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-secrets-'));
    try {
      writeSecret(dir, 'src_1', 'ghp_super_secret_token');
      expect(readSecret(dir, 'src_1')).toBe('ghp_super_secret_token');
      const raw = readFileSync(path.join(dir, 'secrets.json'), 'utf8');
      expect(raw).not.toContain('ghp_super_secret_token');
      expect(raw).toContain('enc:v1:');
      // keyfile exists and is not the secret
      const key = readFileSync(path.join(dir, 'secrets.key'), 'utf8');
      expect(key).not.toContain('ghp_');
      // delete works
      writeSecret(dir, 'src_1', '');
      expect(readSecret(dir, 'src_1')).toBe('');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads legacy plaintext values and migrates them on write', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-secrets-'));
    try {
      writeFileSync(path.join(dir, 'secrets.json'), JSON.stringify({ old: 'legacy-plain' }), 'utf8');
      expect(readSecret(dir, 'old')).toBe('legacy-plain');
      writeSecret(dir, 'new', 'other');
      expect(readSecret(dir, 'old')).toBe('legacy-plain'); // still readable
      const raw = readFileSync(path.join(dir, 'secrets.json'), 'utf8');
      expect(raw).not.toContain('legacy-plain'); // but re-encrypted
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails closed when the key is wrong', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-secrets-'));
    try {
      writeSecret(dir, 'src', 'value');
      writeFileSync(path.join(dir, 'secrets.key'), '00'.repeat(32), 'utf8'); // swap key
      expect(readSecret(dir, 'src')).toBe('');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
