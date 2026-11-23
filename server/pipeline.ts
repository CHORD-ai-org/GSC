/**
 * Route pipeline (B1) — the single place that owns the five idioms every
 * route used to hand-copy: body reading + validation (400 contract),
 * idempotent-write wrapping, result sending, typed error mapping, and the
 * method gate (405 + Allow). Route declarations live in router.ts's ROUTES
 * table; KNOWN_ROUTES (and the allowed-methods list) derive from that table,
 * so the route manifest cannot drift from implemented handlers (F9).
 *
 * Handler contract (small interface):
 *   - return `{ status, json }` to send a JSON response;
 *   - return `fail(kind, message)` for errors (status derived from kind);
 *   - return `void` only when the handler already wrote the response raw.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ApiErrorKind } from '../src/lib/api.ts';
import { apiError, statusForApiError } from '../src/lib/api.ts';
import type { Config } from './config.ts';
import { ApiFailure, readJson, sendApiError, sendJson } from './http.ts';
import { idempotentWrite } from './idempotency.ts';
import type { Database } from './persistence/client.ts';
import type { Authz } from './authz.ts';

export type RouteResult = { status: number; json: unknown } | void;

export type RouteCtx = {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  path: string;
  /** regex capture groups of the matched pattern, in order */
  params: string[];
  /** parsed JSON body — present when the op declares `body` or `validate` */
  body: unknown;
  config: Config;
  db: Database;
  secretsDir: string;
  viewerId: string;
  authz: Authz;
};

export type RouteHandler = (ctx: RouteCtx) => Promise<RouteResult> | RouteResult;

/** One method of one route: handler + per-method body/idempotency policy. */
export type RouteOp = {
  method: string;
  handler: RouteHandler;
  /** read the request body (required) before the handler runs */
  body?: boolean;
  /** read + validate the body; invalid → 400 contract with validateMessage */
  validate?: (body: unknown) => boolean;
  validateMessage?: string;
  /** wrap the handler in idempotent-write keyed `METHOD path` */
  idem?: boolean;
};

export type RouteSpec = {
  pattern: RegExp;
  ops: RouteOp[];
};

/** Success result helper. */
export function ok(json: unknown, status = 200): RouteResult {
  return { status, json };
}

/** Error result helper: status is derived from the error kind (O1-1). */
export function fail(kind: ApiErrorKind, message: string): RouteResult {
  return { status: statusForApiError(kind), json: apiError(kind, message) };
}

/** Route manifest derived from the handler table (single source, F9). */
export function knownRoutes(routes: RouteSpec[]): { pattern: RegExp; methods: string[] }[] {
  return routes.map(({ pattern, ops }) => ({ pattern, methods: ops.map((op) => op.method) }));
}

type DispatchBase = {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  path: string;
  config: Config;
  db: Database;
  secretsDir: string;
  viewerId: string;
  authz: Authz;
};

/**
 * Match and run one route. Returns false when no pattern matches the path
 * (caller answers 404). A matching pattern with the wrong method answers
 * 405 + Allow.
 */
export async function dispatch(routes: RouteSpec[], base: DispatchBase): Promise<boolean> {
  for (const route of routes) {
    const match = route.pattern.exec(base.path);
    if (!match) continue;
    const method = base.req.method ?? 'GET';
    const op = route.ops.find((o) => o.method === method);
    if (!op) {
      base.res.setHeader('allow', route.ops.map((o) => o.method).join(', '));
      sendApiError(base.res, apiError('method_not_allowed', `Method ${method} not allowed`));
      return true;
    }
    try {
      let body: unknown;
      if (op.body || op.validate) {
        body = await readJson(base.req);
      }
      if (op.validate && !op.validate(body)) {
        sendApiError(base.res, apiError('contract', op.validateMessage ?? 'Invalid request body'));
        return true;
      }
      const ctx: RouteCtx = { ...base, params: match.slice(1), body };
      if (op.idem) {
        const headers = base.req.headers ?? {};
        const idemKey = typeof headers['idempotency-key'] === 'string' ? headers['idempotency-key'] : undefined;
        const result = await idempotentWrite(base.db, idemKey, `${method} ${base.path}`, body ?? null, async () => {
          const out = await op.handler(ctx);
          /* c8 ignore next */
          if (!out) throw new Error('idempotent route handler must return a result');
          return out;
        });
        sendJson(base.res, result.status, result.json);
      } else {
        const out = await op.handler(ctx);
        if (out) sendJson(base.res, out.status, out.json);
      }
    } catch (error) {
      if (error instanceof ApiFailure) {
        sendApiError(base.res, error.api);
        return true;
      }
      const message = error instanceof Error ? error.message : 'Internal error';
      sendApiError(base.res, apiError('internal', message));
    }
    return true;
  }
  return false;
}
