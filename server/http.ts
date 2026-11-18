import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ApiError, ApiErrorKind } from '../src/lib/api.ts';
import { apiError, isRecord } from '../src/lib/api.ts';

const MAX_JSON_BYTES = 64 * 1024;

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('content-length', Buffer.byteLength(payload));
  res.setHeader('cache-control', 'no-store');
  res.end(payload);
}

export function sendApiError(res: ServerResponse, error: ApiError): void {
  const status = statusFor(error.kind);
  sendJson(res, status, error);
}

function statusFor(kind: ApiErrorKind): number {
  switch (kind) {
    case 'contract': return 400;
    case 'not_found': return 404;
    case 'duplicate':
    case 'conflict': return 409;
    case 'db_unavailable': return 503;
    case 'internal': return 502;
  }
}

export async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > MAX_JSON_BYTES) throw new Error('body_too_large');
    chunks.push(buf);
  }
  if (size === 0) throw new Error('empty_body');
  const text = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(text);
}

export function envelope(body: unknown): Record<string, unknown> | undefined {
  if (!isRecord(body)) return undefined;
  if (!isRecord(body.item) && !isRecord(body.relation)) return undefined;
  return body as Record<string, unknown>;
}
