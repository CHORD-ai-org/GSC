import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { assertSafeIngestUrl, isBlockedAddress, SsrfError } from './ssrf.ts';
import { fetchUrlText } from './html.ts';

describe('ssrf guard (O1-3)', () => {
  it('classifies address space correctly', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.0.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1']) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
    for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111']) {
      expect(isBlockedAddress(ip), ip).toBe(false);
    }
  });

  it('rejects bad schemes, credentials and ports before any DNS', async () => {
    await expect(assertSafeIngestUrl('ftp://example.com/x', false)).rejects.toBeInstanceOf(SsrfError);
    await expect(assertSafeIngestUrl('http://user:pass@example.com/x', false)).rejects.toBeInstanceOf(SsrfError);
    await expect(assertSafeIngestUrl('http://example.com:22/x', false)).rejects.toBeInstanceOf(SsrfError);
    await expect(assertSafeIngestUrl('not a url', false)).rejects.toBeInstanceOf(SsrfError);
  });

  it('blocks loopback literals in strict mode but allows them with allowPrivate', async () => {
    await expect(assertSafeIngestUrl('http://127.0.0.1:8080/x', false)).rejects.toBeInstanceOf(SsrfError);
    await expect(assertSafeIngestUrl('http://127.0.0.1:8080/x', true)).resolves.toBeInstanceOf(URL);
    await expect(assertSafeIngestUrl('http://169.254.169.254/latest', true)).resolves.toBeInstanceOf(URL); // explicit opt-out covers it
  });

  it('follows redirects but re-validates every hop', async () => {
    const server = createServer((req, res) => {
      if (req.url === '/open-redirect') {
        res.writeHead(302, { location: '/final' });
        res.end();
      } else if (req.url === '/to-ftp') {
        res.writeHead(302, { location: 'ftp://evil.example/x' });
        res.end();
      } else {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html><title>ok</title><body>fine</body></html>');
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    try {
      // happy path: redirect hop is followed and re-checked
      await expect(fetchUrlText(`http://127.0.0.1:${port}/open-redirect`, { allowPrivate: true })).resolves.toMatchObject({ title: 'ok' });
      // per-hop validation: a redirect to a bad scheme is refused even with allowPrivate
      await expect(fetchUrlText(`http://127.0.0.1:${port}/to-ftp`, { allowPrivate: true })).rejects.toBeInstanceOf(SsrfError);
      // strict mode refuses the loopback first hop outright
      await expect(fetchUrlText(`http://127.0.0.1:${port}/open-redirect`, { allowPrivate: false })).rejects.toBeInstanceOf(SsrfError);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
