import { describe, expect, it } from 'vitest';
import { FIELD_DEFS, FIELD_KEYS, fieldLabel, isMultiline } from './itemFields.ts';
import { ITEM_TYPES, fieldKeysFor, fieldsForType, requiredFieldsFor } from './items.ts';
import { STRINGS } from './strings.ts';

describe('U3 ItemFields vocabulary', () => {
  it('every field has a non-empty zh and en label (missing label = red)', () => {
    for (const key of FIELD_KEYS) {
      const def = FIELD_DEFS[key];
      expect(def.label.zh.trim(), `zh label for ${key}`).not.toBe('');
      expect(def.label.en.trim(), `en label for ${key}`).not.toBe('');
    }
  });

  it('per-type field templates only use vocabulary keys', () => {
    for (const type of ITEM_TYPES) {
      for (const key of fieldKeysFor(type)) {
        expect(FIELD_KEYS, `${type} → ${key}`).toContain(key);
      }
      for (const key of requiredFieldsFor(type)) {
        expect(FIELD_KEYS, `required ${type} → ${key}`).toContain(key);
      }
    }
  });

  it('unknown keys fall back to the key itself, never to a wrong label', () => {
    expect(fieldLabel('no_such_field', 'zh')).toBe('no_such_field');
    expect(fieldLabel('no_such_field', 'en')).toBe('no_such_field');
    expect(isMultiline('no_such_field')).toBe(false);
  });

  it('multiline matches the form behaviour contract', () => {
    expect(isMultiline('content_text')).toBe(true);
    expect(isMultiline('author')).toBe(false);
  });

  it('fieldsForType round-trips through the vocabulary (no orphan keys)', () => {
    const template = fieldsForType('object.decision');
    expect(Object.keys(template).every((k) => FIELD_KEYS.includes(k as never))).toBe(true);
  });
});

describe('U3 i18n coverage', () => {
  it('every STRINGS key carries both zh and en (missing copy = red)', () => {
    for (const [key, entry] of Object.entries(STRINGS)) {
      expect(entry.zh.trim(), `zh copy for ${key}`).not.toBe('');
      expect(entry.en.trim(), `en copy for ${key}`).not.toBe('');
    }
  });
});
