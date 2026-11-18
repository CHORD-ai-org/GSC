export const RELATION_KINDS = [
  'derived_from',
  'references',
  'related_to',
  'supports',
  'challenges',
] as const;

export type RelationKind = (typeof RELATION_KINDS)[number];

export type RelationDTO = {
  id: string;
  kind: RelationKind;
  from_id: string;
  to_id: string;
  note: string;
  created_at: string;
  created_by: 'user' | 'agent' | 'system';
};

export type CreateRelationBody = {
  kind: RelationKind;
  from_id: string;
  to_id: string;
  note?: string;
  created_by?: RelationDTO['created_by'];
};

export function isRelationKind(value: unknown): value is RelationKind {
  return typeof value === 'string' && (RELATION_KINDS as readonly string[]).includes(value);
}

export function validateCreateRelationBody(value: unknown): value is CreateRelationBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  if (!isRelationKind(b.kind)) return false;
  if (typeof b.from_id !== 'string' || b.from_id.length === 0) return false;
  if (typeof b.to_id !== 'string' || b.to_id.length === 0) return false;
  if (b.from_id === b.to_id) return false;
  if (b.note !== undefined && typeof b.note !== 'string') return false;
  if (
    b.created_by !== undefined &&
    !['user', 'agent', 'system'].includes(b.created_by as string)
  ) return false;
  return true;
}
