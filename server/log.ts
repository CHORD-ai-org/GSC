/**
 * Structured request logging (Phase 02, spec §8): JSON lines, request-id
 * correlation, and an explicit denylist — bodies, titles and content are
 * NEVER logged.
 */

type Level = 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = new Set(['title', 'content_text', 'text', 'value', 'definition', 'token', 'authorization']);

function scrub(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = SENSITIVE_KEYS.has(k) ? '[redacted]' : v;
  }
  return out;
}

export function log(level: Level, message: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg: message, ...scrub(fields) });
  if (level === 'error') process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

export function logRequest(fields: {
  reqId: string;
  method: string;
  path: string;
  status: number;
  ms: number;
  error?: string;
}): void {
  const level: Level = fields.status >= 500 ? 'error' : fields.status >= 400 ? 'warn' : 'info';
  log(level, 'request', fields);
}
