export type ClusterDTO = {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type ClusterDetailDTO = ClusterDTO & {
  member_ids: string[];
};

export type CreateClusterBody = {
  title: string;
  description?: string;
};

export type UpdateClusterBody = {
  title?: string;
  description?: string;
};

export type AddClusterMemberBody = {
  item_id: string;
};

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateCreateClusterBody(value: unknown): value is CreateClusterBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  return nonEmptyString(b.title)
    && (b.description === undefined || typeof b.description === 'string');
}

export function validateUpdateClusterBody(value: unknown): value is UpdateClusterBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  return (b.title === undefined || nonEmptyString(b.title))
    && (b.description === undefined || typeof b.description === 'string');
}

export function validateAddClusterMemberBody(value: unknown): value is AddClusterMemberBody {
  if (typeof value !== 'object' || value === null) return false;
  return nonEmptyString((value as Record<string, unknown>).item_id);
}
