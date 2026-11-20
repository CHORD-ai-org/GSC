/**
 * Meta Tag three-layer contract (PLAN-8, Vision §5.4, D-064).
 * Layer 1: tag definitions (controlled, must exist before assignment).
 * Layer 2: tag values (free strings, attached to items).
 * Layer 3: scope — where a value is valid ('global' | 'project:<name>' | 'context:<id>').
 */

export type TagDefinitionDTO = {
  id: string;
  name: string;
  description: string;
  created_at: string;
};

export type TagValueDTO = {
  id: string;
  definition_id: string;
  item_id: string;
  value: string;
  scope: string;
  confirmed: boolean;
  owner_id: string;
  created_at: string;
};

export const TAG_SCOPES = ['global'] as const;
export const SCOPE_PREFIXES = ['project:', 'context:'] as const;

export function isValidScope(scope: unknown): scope is string {
  if (typeof scope !== 'string' || !scope) return false;
  if (scope === 'global') return true;
  return SCOPE_PREFIXES.some((prefix) => scope.startsWith(prefix) && scope.length > prefix.length);
}

export type CreateTagDefinitionBody = { name: string; description?: string };
export type CreateTagValueBody = {
  definition_id: string;
  item_id?: string;
  value: string;
  scope?: string;
  confirmed?: boolean;
};

export function validateCreateTagDefinitionBody(body: unknown): body is CreateTagDefinitionBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  // O1-2 limits: name ≤ 200, description ≤ 2000
  return typeof b.name === 'string' && b.name.trim().length > 0 && b.name.length <= 200
    && (b.description === undefined || (typeof b.description === 'string' && b.description.length <= 2000));
}

export function validateCreateTagValueBody(body: unknown): body is CreateTagValueBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (typeof b.definition_id !== 'string' || !b.definition_id) return false;
  if (typeof b.value !== 'string' || !b.value.trim() || b.value.length > 2000) return false; // O1-2
  if (b.item_id !== undefined && typeof b.item_id !== 'string') return false;
  if (b.scope !== undefined && (!isValidScope(b.scope) || b.scope.length > 200)) return false; // O1-2
  return true;
}

export const PROFILE_DEFINITION_ID = 'tag_user_profile';
export const PROFILE_DEFINITION_NAME = 'User Profile';

/** The six Vision §5.4 dimensions, pre-seeded at migration time (D-064). */
export const PRESET_TAG_DEFINITIONS: { id: string; name: string; description: string }[] = [
  { id: 'tag_thinking_style', name: 'Thinking Style', description: 'How a person approaches reasoning and problem-solving' },
  { id: PROFILE_DEFINITION_ID, name: PROFILE_DEFINITION_NAME, description: 'Characteristics, preferences and working context of the user' },
  { id: 'tag_expertise', name: 'Expertise', description: 'Areas of knowledge or demonstrated experience' },
  { id: 'tag_interest', name: 'Interest', description: 'Subjects a user is interested in' },
  { id: 'tag_methodology', name: 'Methodology', description: 'Approaches or methods used to accomplish work' },
  { id: 'tag_project_association', name: 'Project Association', description: 'The project or activity an information unit relates to' },
];
