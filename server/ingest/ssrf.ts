/**
 * SSRF guard for URL ingestion (O1-3). Commercial bar: a user-supplied URL must
 * never reach loopback, private, link-local, CGNAT or cloud-metadata addresses —
 * including via DNS resolution and redirect hops.
 *
 * Known limitation (documented): resolve-then-fetch leaves a DNS-rebinding
 * TOCTOU window; closing it needs a custom fetch agent that pins the resolved IP.
 */

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const ALLOWED_PORTS = new Set([80, 443, 8080, 8443]);
const MAX_REDIRECTS = 3;

function ipv4Blocked(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true; // unparseable = blocked
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 192 && b === 0) return true; // 192.0.0.0/24
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function ipv6Blocked(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === '::' || lower === '::1') return true; // unspecified + loopback
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true; // fe80::/10
  if (/^f[cd]/.test(lower)) return true; // fc00::/7 unique local
  if (lower.startsWith('::ffff:')) {
    const mapped = lower.slice(7);
    return isIP(mapped) === 4 ? ipv4Blocked(mapped) : true;
  }
  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return ipv4Blocked(ip);
  if (version === 6) return ipv6Blocked(ip);
  return true; // not a literal IP = not expected here
}

export class SsrfError extends Error {}

/** Sync part: scheme and credentials always; port only in strict mode. */
export function assertSafeUrl(url: URL, allowPrivate = false): void {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfError('Only http(s) URLs are supported');
  }
  if (url.username || url.password) {
    throw new SsrfError('URLs with embedded credentials are not allowed');
  }
  if (!allowPrivate) {
    const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
    if (!ALLOWED_PORTS.has(port)) {
      throw new SsrfError(`Port ${port} is not allowed`);
    }
  }
}

/** DNS part: every resolved address must be public (unless explicitly allowed). */
export async function assertResolvableSafe(url: URL, allowPrivate: boolean): Promise<void> {
  if (allowPrivate) return;
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) throw new SsrfError(`Blocked address: ${hostname}`);
    return;
  }
  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new SsrfError(`Cannot resolve host: ${hostname}`);
  }
  if (addresses.length === 0) throw new SsrfError(`Cannot resolve host: ${hostname}`);
  for (const { address } of addresses) {
    if (isBlockedAddress(address)) {
      throw new SsrfError(`Host resolves to a blocked address: ${address}`);
    }
  }
}

export async function assertSafeIngestUrl(rawUrl: string, allowPrivate: boolean): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError('Invalid URL');
  }
  assertSafeUrl(url, allowPrivate);
  await assertResolvableSafe(url, allowPrivate);
  return url;
}

export { MAX_REDIRECTS };
