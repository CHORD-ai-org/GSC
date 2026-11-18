export const RAW_TYPES = [
  'raw.document',
  'raw.message',
  'raw.evidence',
  'raw.filecontent',
] as const;

export const OBJECT_TYPES = [
  'object.concept',
  'object.hypothesis',
  'object.methodology',
  'object.decision',
  'object.evidencereference',
] as const;

export const ITEM_TYPES = [...RAW_TYPES, ...OBJECT_TYPES] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
export type RawType = (typeof RAW_TYPES)[number];
export type ObjectType = (typeof OBJECT_TYPES)[number];

export const DOMAINS = ['knowledge', 'work', 'user', 'coworker', 'artifact'] as const;
export type Domain = (typeof DOMAINS)[number];
export const ORIGINS = ['user', 'import', 'agent'] as const;
export type Origin = (typeof ORIGINS)[number];
export const RAW_STATUSES = ['active', 'archived'] as const;
export const OBJECT_STATUSES = ['draft', 'active', 'superseded'] as const;
export type Status = (typeof RAW_STATUSES)[number] | (typeof OBJECT_STATUSES)[number];

export const ITEM_LABELS: Record<ItemType, string> = {
  'raw.document': 'Document',
  'raw.message': 'Message',
  'raw.evidence': 'Evidence',
  'raw.filecontent': 'File content',
  'object.concept': 'Concept',
  'object.hypothesis': 'Hypothesis',
  'object.methodology': 'Methodology',
  'object.decision': 'Decision',
  'object.evidencereference': 'Evidence reference',
};

export const ITEM_GLYPHS: Record<ItemType, string> = {
  'raw.document': 'DO',
  'raw.message': 'MS',
  'raw.evidence': 'EV',
  'raw.filecontent': 'FI',
  'object.concept': 'CO',
  'object.hypothesis': 'HY',
  'object.methodology': 'ME',
  'object.decision': 'DE',
  'object.evidencereference': 'ER',
};

export type ItemFields = {
  content_text?: string;
  author?: string;
  locator?: string;
  filename?: string;
  storage_ref?: string;
  mime_type?: string;
  captured_at?: string;
  measured_at?: string;
  definition?: string;
  notes?: string;
  claim?: string;
  reasoning?: string;
  name?: string;
  steps?: string;
  intended_use?: string;
  statement?: string;
  alternatives?: string;
  consequences?: string;
  source_item_id?: string;
};

export type ItemDTO = {
  id: string;
  type: ItemType;
  title: string;
  domain: Domain;
  origin: Origin;
  source_label: string;
  status: Status;
  created_at: string;
  updated_at: string;
  fields: ItemFields;
};

export type CreateItemBody = {
  type: ItemType;
  title: string;
  domain: Domain;
  origin: Origin;
  source_label?: string;
  fields?: ItemFields;
};

export type UpdateItemBody = {
  title?: string;
  domain?: Domain;
  origin?: Origin;
  source_label?: string;
  status?: Status;
  fields?: ItemFields;
};

const requiredByType: Record<ItemType, readonly (keyof ItemFields)[]> = {
  'raw.document': ['content_text'],
  'raw.message': ['content_text', 'author'],
  'raw.evidence': ['content_text', 'locator'],
  'raw.filecontent': ['filename', 'content_text'],
  'object.concept': ['definition'],
  'object.hypothesis': ['claim'],
  'object.methodology': ['name', 'steps'],
  'object.decision': ['statement', 'reasoning'],
  'object.evidencereference': ['claim', 'source_item_id'],
};

const editableRawFields = new Set<string>(['source_label']);

export function isItemType(value: unknown): value is ItemType {
  return typeof value === 'string' && (ITEM_TYPES as readonly string[]).includes(value);
}

export function isObjectType(type: ItemType): boolean {
  return (OBJECT_TYPES as readonly string[]).includes(type);
}

export function statusesFor(type: ItemType): readonly Status[] {
  return isObjectType(type) ? OBJECT_STATUSES : RAW_STATUSES;
}

export function defaultStatus(type: ItemType): Status {
  return statusesFor(type)[0];
}

export function requiredFieldsFor(type: ItemType): readonly (keyof ItemFields)[] {
  return requiredByType[type];
}

export function editableFieldsFor(type: ItemType): readonly (keyof ItemFields)[] {
  return isObjectType(type)
    ? Object.keys(requiredByType[type]).length > 0
      ? (Object.keys(fieldsForType(type)) as (keyof ItemFields)[])
      : []
    : [];
}

function fieldsForType(type: ItemType): ItemFields {
  const groups: Record<ItemType, ItemFields> = {
    'raw.document': { content_text: '', author: '' },
    'raw.message': { content_text: '', author: '', captured_at: '' },
    'raw.evidence': { content_text: '', locator: '', measured_at: '' },
    'raw.filecontent': { filename: '', content_text: '', storage_ref: '', mime_type: '' },
    'object.concept': { definition: '', notes: '' },
    'object.hypothesis': { claim: '', reasoning: '', notes: '' },
    'object.methodology': { name: '', steps: '', intended_use: '', notes: '' },
    'object.decision': { statement: '', reasoning: '', alternatives: '', consequences: '', notes: '' },
    'object.evidencereference': { claim: '', source_item_id: '', locator: '', notes: '' },
  };
  return groups[type];
}

export function fieldKeysFor(type: ItemType): readonly (keyof ItemFields)[] {
  return Object.keys(fieldsForType(type)) as (keyof ItemFields)[];
}

export function isItemFields(value: unknown): value is ItemFields {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (v) => v === undefined || typeof v === 'string',
  );
}

function nonEmpty(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

export function validateCreateItemBody(value: unknown): value is CreateItemBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  if (!isItemType(b.type) || !nonEmpty(b.title)) return false;
  if (b.domain !== undefined && !(DOMAINS as readonly string[]).includes(b.domain as string)) return false;
  if (b.origin !== undefined && !(ORIGINS as readonly string[]).includes(b.origin as string)) return false;
  if (b.source_label !== undefined && typeof b.source_label !== 'string') return false;
  if (b.fields !== undefined && !isItemFields(b.fields)) return false;
  const fields = (b.fields ?? {}) as ItemFields;
  return requiredFieldsFor(b.type).every((key) => nonEmpty(fields[key]));
}

export function validateUpdateItemBody(value: unknown): value is UpdateItemBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  if (b.title !== undefined && !nonEmpty(b.title)) return false;
  if (b.domain !== undefined && !(DOMAINS as readonly string[]).includes(b.domain as string)) return false;
  if (b.origin !== undefined && !(ORIGINS as readonly string[]).includes(b.origin as string)) return false;
  if (b.source_label !== undefined && typeof b.source_label !== 'string') return false;
  if (b.status !== undefined && !(RAW_STATUSES as readonly string[]).includes(b.status as string)
    && !(OBJECT_STATUSES as readonly string[]).includes(b.status as string)) return false;
  if (b.fields !== undefined && !isItemFields(b.fields)) return false;
  return true;
}

export function itemTextForFilter(item: ItemDTO): string {
  return [
    item.id,
    item.title,
    item.type,
    item.domain,
    item.source_label,
    ...Object.values(item.fields),
  ]
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
    .toLowerCase();
}

export function isRawType(type: ItemType): boolean {
  return !isObjectType(type);
}

export function editableMetadataForRaw(): readonly 'source_label'[] {
  return ['source_label'] as const;
}

export function editableFieldsForUpdate(type: ItemType): readonly (keyof ItemFields)[] {
  return isObjectType(type) ? fieldKeysFor(type) : [];
}

export { editableRawFields };
