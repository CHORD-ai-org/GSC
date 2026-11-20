import { INPUT_LIMITS } from './api.ts';
export type ContextDTO = {
  id: string;
  title: string;
  subject: string;
  scope: string;
  purpose: string;
  created_at: string;
  updated_at: string;
};

export type ContextDetailDTO = ContextDTO & {
  member_ids: string[];
};

export type CreateContextBody = {
  title: string;
  subject: string;
  scope: string;
  purpose: string;
};

export type UpdateContextBody = Partial<CreateContextBody>;

export type AddContextMemberBody = {
  item_id: string;
};

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= INPUT_LIMITS.title;
}

function textWithin(value: unknown, max: number): boolean {
  return value === undefined || (typeof value === 'string' && value.length <= max);
}

export function validateCreateContextBody(value: unknown): value is CreateContextBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  return nonEmptyString(b.title)
    && nonEmptyString(b.subject)
    && nonEmptyString(b.scope)
    && nonEmptyString(b.purpose)
    && textWithin(b.purpose, INPUT_LIMITS.longText);
}

export function validateUpdateContextBody(value: unknown): value is UpdateContextBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  const keys = ['title', 'subject', 'scope', 'purpose'];
  return keys.every((key) => b[key] === undefined || nonEmptyString(b[key]))
    && textWithin(b.purpose, INPUT_LIMITS.longText);
}

export function validateAddContextMemberBody(value: unknown): value is AddContextMemberBody {
  if (typeof value !== 'object' || value === null) return false;
  return nonEmptyString((value as Record<string, unknown>).item_id);
}
