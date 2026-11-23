/**
 * GSC Local Dashboard — standalone control console (NOT part of the GSC web app).
 * Serves dashboard/index.html and proxies /api/* to the GSC API (127.0.0.1:8788)
 * so the browser talks to one origin (no CORS). Port 8790.
 */
import { createServer, request as httpRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const API_HOST = '127.0.0.1';
const API_PORT = 8788;
const PORT = Number(process.env.DASHBOARD_PORT ?? 8790);

const server = createServer((req, res) => {
  const url = req.url ?? '/';
  if (url.startsWith('/api/')) {
    const upstream = httpRequest(
      { host: API_HOST, port: API_PORT, path: url, method: req.method, headers: { ...req.headers, host: `${API_HOST}:${API_PORT}` } },
      (resp) => {
        res.writeHead(resp.statusCode ?? 502, resp.headers);
        resp.pipe(res);
      },
    );
    upstream.on('error', () => {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, kind: 'internal', message: 'GSC API unreachable on 8788' }));
    });
    req.pipe(upstream);
    return;
  }
  readFile(path.join(ROOT, 'index.html'))
    .then((buf) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(buf);
    })
    .catch(() => {
      res.writeHead(404);
      res.end('Not found');
    });
});

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`[gsc-dashboard] http://127.0.0.1:${PORT} → api ${API_HOST}:${API_PORT}\n`);
});
