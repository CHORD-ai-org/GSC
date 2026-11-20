/**
 * On-machine secret store (D-050), encrypted at rest since O1-6 (D-069):
 * values in `.data/secrets.json` are AES-256-GCM ciphertext. The master key
 * comes from `GSC_SECRETS_KEY` (passphrase) or a generated keyfile
 * `.data/secrets.key`. Keyfile protection, not HSM — documented honestly.
 *
 * Legacy plaintext values (written before O1-6) still read; they are
 * re-encrypted the next time the map is written.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type SecretMap = Record<string, string>;

const ENC_PREFIX = 'enc:v1:';
const KEYFILE = 'secrets.key';

function fileFor(dataDir: string): string {
  return path.join(dataDir, 'secrets.json');
}

function masterKey(dataDir: string): Buffer {
  const fromEnv = process.env.GSC_SECRETS_KEY;
  if (fromEnv) {
    // 64-hex = raw key; anything else is a passphrase stretched with scrypt
    return /^[0-9a-fA-F]{64}$/.test(fromEnv)
      ? Buffer.from(fromEnv, 'hex')
      : scryptSync(fromEnv, 'gsc-secrets-v1', 32);
  }
  mkdirSync(dataDir, { recursive: true });
  const keyPath = path.join(dataDir, KEYFILE);
  if (!existsSync(keyPath)) {
    writeFileSync(keyPath, randomBytes(32).toString('hex'), { encoding: 'utf8', mode: 0o600 });
  }
  return Buffer.from(readFileSync(keyPath, 'utf8').trim(), 'hex');
}

function encrypt(key: Buffer, plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

function decrypt(key: Buffer, stored: string): string {
  const [ivB64, tagB64, ctB64] = stored.slice(ENC_PREFIX.length).split(':');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}

function loadMap(dataDir: string): SecretMap {
  try {
    return JSON.parse(readFileSync(fileFor(dataDir), 'utf8')) as SecretMap;
  } catch {
    return {};
  }
}

export function readSecret(dataDir: string, sourceId: string): string {
  const stored = loadMap(dataDir)[sourceId];
  if (stored === undefined) return '';
  if (!stored.startsWith(ENC_PREFIX)) return stored; // legacy plaintext (pre O1-6)
  try {
    return decrypt(masterKey(dataDir), stored);
  } catch {
    return ''; // wrong key or tampered value: fail closed
  }
}

export function writeSecret(dataDir: string, sourceId: string, token: string): void {
  mkdirSync(dataDir, { recursive: true });
  const map = loadMap(dataDir);
  const key = masterKey(dataDir);
  if (token) {
    map[sourceId] = encrypt(key, token);
  } else {
    delete map[sourceId];
  }
  // Re-encrypt any legacy plaintext entries while we are here (migration).
  for (const [id, value] of Object.entries(map)) {
    if (!value.startsWith(ENC_PREFIX)) map[id] = encrypt(key, value);
  }
  writeFileSync(fileFor(dataDir), JSON.stringify(map, null, 2), 'utf8');
}
