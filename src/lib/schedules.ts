export type ScheduleKind = 'folder' | 'web';
export type ScheduleStatus = 'idle' | 'running';

export type ScheduleDTO = {
  id: string;
  name: string;
  kind: ScheduleKind;
  root_path: string;
  url_list: string;
  interval_min: number;
  enabled: boolean;
  status: ScheduleStatus;
  last_run_at: string | null;
  started_at: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type CreateScheduleBody = {
  name: string;
  kind: ScheduleKind;
  root_path?: string;
  url_list?: string;
  interval_min?: number;
  enabled?: boolean;
};

export type UpdateScheduleBody = Partial<CreateScheduleBody> & { status?: ScheduleStatus };

function nonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function validateCreateScheduleBody(value: unknown): value is CreateScheduleBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  if (!nonEmpty(b.name)) return false;
  if (b.kind !== 'folder' && b.kind !== 'web') return false;
  if (b.kind === 'folder' && !nonEmpty(b.root_path)) return false;
  if (b.kind === 'web' && !nonEmpty(b.url_list)) return false;
  if (b.interval_min !== undefined && (typeof b.interval_min !== 'number' || b.interval_min < 1 || b.interval_min > 10080)) return false;
  if (b.enabled !== undefined && typeof b.enabled !== 'boolean') return false;
  return true;
}

export function validateUpdateScheduleBody(value: unknown): value is UpdateScheduleBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  const fields = ['name', 'kind', 'root_path', 'url_list', 'interval_min', 'enabled', 'status'];
  if (Object.keys(b).some((k) => !fields.includes(k))) return false;
  if (b.name !== undefined && !nonEmpty(b.name)) return false;
  if (b.kind !== undefined && b.kind !== 'folder' && b.kind !== 'web') return false;
  if (b.interval_min !== undefined && (typeof b.interval_min !== 'number' || b.interval_min < 1 || b.interval_min > 10080)) return false;
  if (b.enabled !== undefined && typeof b.enabled !== 'boolean') return false;
  if (b.status !== undefined && b.status !== 'idle' && b.status !== 'running') return false;
  return true;
}
