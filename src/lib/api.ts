export type ApiOk<T> = { ok: true } & T;

export type ApiErrorKind =
  | 'contract'
  | 'not_found'
  | 'duplicate'
  | 'conflict'
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
    retryable: kind === 'db_unavailable' || kind === 'internal',
  };
}

export function statusForApiError(kind: ApiErrorKind): number {
  switch (kind) {
    case 'contract':
      return 400;
    case 'not_found':
      return 404;
    case 'duplicate':
    case 'conflict':
      return 409;
    case 'db_unavailable':
      return 503;
    case 'internal':
      return 502;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
