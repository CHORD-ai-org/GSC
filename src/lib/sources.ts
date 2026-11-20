export const SOURCE_KINDS = ['web', 'rss', 'file', 'github', 'notion', 'drive', 'x'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_STATUSES = ['connected', 'paused', 'error'] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export const SOURCE_FREQUENCIES = ['manual', 'daily'] as const;
export type SourceFrequency = (typeof SOURCE_FREQUENCIES)[number];

export type SourceDTO = {
  id: string;
  kind: SourceKind;
  label: string;
  scope: string;
  status: SourceStatus;
  frequency: SourceFrequency;
  last_sync_at: string;
  last_error: string;
  created_at: string;
  updated_at: string;
};

export type CreateSourceBody = {
  kind: SourceKind;
  label: string;
  scope?: string;
  frequency?: SourceFrequency;
  token?: string;
};

export type UpdateSourceBody = {
  label?: string;
  scope?: string;
  status?: SourceStatus;
  frequency?: SourceFrequency;
  token?: string;
};

export type SyncResult = { imported: number; skipped: number };

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isSourceKind(value: unknown): value is SourceKind {
  return typeof value === 'string' && (SOURCE_KINDS as readonly string[]).includes(value);
}

export function validateCreateSourceBody(value: unknown): value is CreateSourceBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  return isSourceKind(b.kind)
    && nonEmptyString(b.label)
    && (b.scope === undefined || typeof b.scope === 'string')
    && (b.frequency === undefined || (SOURCE_FREQUENCIES as readonly string[]).includes(b.frequency as string))
    && (b.token === undefined || typeof b.token === 'string');
}

export function validateUpdateSourceBody(value: unknown): value is UpdateSourceBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  return (b.label === undefined || nonEmptyString(b.label))
    && (b.scope === undefined || typeof b.scope === 'string')
    && (b.status === undefined || (SOURCE_STATUSES as readonly string[]).includes(b.status as string))
    && (b.frequency === undefined || (SOURCE_FREQUENCIES as readonly string[]).includes(b.frequency as string))
    && (b.token === undefined || typeof b.token === 'string');
}
