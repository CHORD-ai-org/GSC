import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApiToken, revokeApiToken, verifyApiToken } from './tokens.ts';

describe('api tokens (D-058)', () => {
  it('mints, verifies by scope, and revokes', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gsc-tokens-'));
    try {
      const read = createApiToken(dir, 'reader', 'read');
      const rw = createApiToken(dir, 'writer', 'rw', 'usr_bob');
      expect(verifyApiToken(dir, read.token)).toEqual({ scope: 'read', userId: 'usr_local' });
      expect(verifyApiToken(dir, rw.token)).toEqual({ scope: 'rw', userId: 'usr_bob' });
      expect(verifyApiToken(dir, 'gsc_wrong')).toBeNull();
      expect(revokeApiToken(dir, read.id)).toBe(true);
      expect(verifyApiToken(dir, read.token)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
