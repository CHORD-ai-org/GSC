/**
 * U3: the ItemFields vocabulary — the one module to touch when a field is
 * added (a new storage column is still a migration; that is schema, not
 * vocabulary). Replaces four drifting copies: `server/repo/items.ts`
 * fieldColumns, `App.tsx` fieldLabels + multiline set, `detail.tsx`
 * fieldLabels. Per-type composition (which types use which fields) stays in
 * `lib/items.ts` and is tested against this list.
 */
import type { ItemFields } from './items.ts';

export type FieldKey = keyof ItemFields;
export type FieldLang = 'zh' | 'en';

type FieldDef = { label: { zh: string; en: string }; multiline: boolean };

export const FIELD_DEFS: Record<FieldKey, FieldDef> = {
  content_text: { label: { zh: '正文', en: 'Content' }, multiline: true },
  author: { label: { zh: '作者', en: 'Author' }, multiline: false },
  locator: { label: { zh: '定位', en: 'Locator' }, multiline: false },
  filename: { label: { zh: '文件名', en: 'Filename' }, multiline: false },
  storage_ref: { label: { zh: '存储引用', en: 'Storage ref' }, multiline: false },
  mime_type: { label: { zh: 'MIME 类型', en: 'MIME type' }, multiline: false },
  captured_at: { label: { zh: '采集时间', en: 'Captured at' }, multiline: false },
  measured_at: { label: { zh: '测量时间', en: 'Measured at' }, multiline: false },
  definition: { label: { zh: '定义', en: 'Definition' }, multiline: true },
  notes: { label: { zh: '备注', en: 'Notes' }, multiline: true },
  claim: { label: { zh: '主张', en: 'Claim' }, multiline: true },
  reasoning: { label: { zh: '推理', en: 'Reasoning' }, multiline: true },
  name: { label: { zh: '名称', en: 'Name' }, multiline: false },
  steps: { label: { zh: '步骤', en: 'Steps' }, multiline: true },
  intended_use: { label: { zh: '预期用途', en: 'Intended use' }, multiline: true },
  statement: { label: { zh: '陈述', en: 'Statement' }, multiline: true },
  alternatives: { label: { zh: '备选方案', en: 'Alternatives' }, multiline: true },
  consequences: { label: { zh: '后果', en: 'Consequences' }, multiline: true },
  source_item_id: { label: { zh: '来源条目', en: 'Source item' }, multiline: false },
};

/** Canonical key order — the repo's content-column mapping reads this. */
export const FIELD_KEYS = Object.keys(FIELD_DEFS) as FieldKey[];

export function fieldLabel(key: string, lang: FieldLang): string {
  return FIELD_DEFS[key as FieldKey]?.label[lang] ?? key;
}

export function isMultiline(key: string): boolean {
  return FIELD_DEFS[key as FieldKey]?.multiline ?? false;
}
