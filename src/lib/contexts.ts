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
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateCreateContextBody(value: unknown): value is CreateContextBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  return nonEmptyString(b.title)
    && nonEmptyString(b.subject)
    && nonEmptyString(b.scope)
    && nonEmptyString(b.purpose);
}

export function validateUpdateContextBody(value: unknown): value is UpdateContextBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  const keys = ['title', 'subject', 'scope', 'purpose'];
  return keys.every((key) => b[key] === undefined || nonEmptyString(b[key]));
}

export function validateAddContextMemberBody(value: unknown): value is AddContextMemberBody {
  if (typeof value !== 'object' || value === null) return false;
  return nonEmptyString((value as Record<string, unknown>).item_id);
}
