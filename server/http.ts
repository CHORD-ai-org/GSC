import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ApiError, ApiErrorKind } from '../src/lib/api.ts';
import { apiError, isRecord, statusForApiError } from '../src/lib/api.ts';

const MAX_JSON_BYTES = 64 * 1024;

/** Typed failure that maps to a specific API error (O1-1). Plain Errors still map to internal. */
export class ApiFailure extends Error {
  readonly api: ApiError;

  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.name = 'ApiFailure';
    this.api = apiError(kind, message);
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('content-length', Buffer.byteLength(payload));
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('referrer-policy', 'no-referrer');
  res.end(payload);
}

export function sendApiError(res: ServerResponse, error: ApiError): void {
  const status = statusForApiError(error.kind);
  sendJson(res, status, error);
}

export async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > MAX_JSON_BYTES) {
      // 413, not 5xx: the client sent too much (O1-1)
      throw new ApiFailure('payload_too_large', `Body exceeds ${MAX_JSON_BYTES} bytes`);
    }
    chunks.push(buf);
  }
  if (size === 0) throw new ApiFailure('contract', 'Empty request body');
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    // 400, not 502: malformed JSON is a client error (O1-1)
    throw new ApiFailure('contract', 'Malformed JSON body');
  }
}

export function envelope(body: unknown): Record<string, unknown> | undefined {
  if (!isRecord(body)) return undefined;
  if (!isRecord(body.item) && !isRecord(body.relation)) return undefined;
  return body as Record<string, unknown>;
}
