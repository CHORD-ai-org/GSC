export type ApiOk<T> = { ok: true } & T;

export type ApiErrorKind =
  | 'contract'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'method_not_allowed'
  | 'conflict'
  | 'duplicate'
  | 'payload_too_large'
  | 'rate_limited'
  | 'db_unavailable'
  | 'internal';

export type ApiError = {
  ok: false;
  kind: ApiErrorKind;
  message: string;
  retryable: boolean;
};

export function apiError(
  kind: ApiErrorKind,
  message: string,
): ApiError {
  return {
    ok: false,
    kind,
    message,
    retryable: kind === 'db_unavailable' || kind === 'internal' || kind === 'rate_limited',
  };
}

export function statusForApiError(kind: ApiErrorKind): number {
  switch (kind) {
    case 'contract':
      return 400;
    case 'unauthorized':
      return 401;
    case 'forbidden':
      return 403;
    case 'not_found':
      return 404;
    case 'method_not_allowed':
      return 405;
    case 'duplicate':
    case 'conflict':
      return 409;
    case 'payload_too_large':
      return 413;
    case 'rate_limited':
      return 429;
    case 'db_unavailable':
      return 503;
    case 'internal':
      return 502;
  }
}

/** Input limits (O1-2): oversized fields are contract errors, not silent truncation. */
export const INPUT_LIMITS = {
  title: 512,
  shortText: 2000,
  fieldValue: 65536,
  longText: 8000,
  scope: 200,
} as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
