import { describe, expect, it } from 'vitest';
import {
  defaultStatus,
  fieldKeysFor,
  requiredFieldsFor,
  validateCreateItemBody,
  validateUpdateItemBody,
} from './items.ts';
import { validateCreateRelationBody } from './relations.ts';
import { validateCreateContextBody } from './contexts.ts';

describe('item contracts', () => {
  it('accepts a valid concept create body', () => {
    expect(validateCreateItemBody({
      type: 'object.concept',
      title: 'Shared context',
      domain: 'knowledge',
      origin: 'user',
      fields: { definition: 'A persistent view', notes: '' },
    })).toBe(true);
  });

  it('rejects a concept without a definition', () => {
    expect(validateCreateItemBody({
      type: 'object.concept',
      title: 'Shared context',
      fields: {},
    })).toBe(false);
  });

  it('requires claim and source for evidence reference', () => {
    expect(requiredFieldsFor('object.evidencereference')).toEqual(['claim', 'source_item_id']);
  });

  it('uses draft as the default object status', () => {
    expect(defaultStatus('object.decision')).toBe('draft');
  });

  it('exposes typed keys for each object type', () => {
    expect(fieldKeysFor('object.methodology')).toContain('steps');
  });

  it('rejects raw content in update body validation layer', () => {
    expect(validateUpdateItemBody({ title: 'Renamed', status: 'active' })).toBe(true);
    expect(validateUpdateItemBody({ status: 'verified' })).toBe(false);
  });
});

describe('context contracts', () => {
  it('accepts a valid context create body', () => {
    expect(validateCreateContextBody({
      title: 'Knowledge Context',
      subject: 'Design',
      scope: 'MVP',
      purpose: 'Inspect context',
    })).toBe(true);
  });

  it('rejects incomplete context bodies', () => {
    expect(validateCreateContextBody({ title: 'Knowledge Context' })).toBe(false);
  });
});

describe('relation contracts', () => {
  it('accepts a valid relation', () => {
    expect(validateCreateRelationBody({
      kind: 'derived_from', from_id: 'obj_1', to_id: 'raw_1', note: 'p.4',
    })).toBe(true);
  });

  it('rejects self-links and unknown kinds', () => {
    expect(validateCreateRelationBody({ kind: 'related_to', from_id: 'a', to_id: 'a' })).toBe(false);
    expect(validateCreateRelationBody({ kind: 'causes', from_id: 'a', to_id: 'b' })).toBe(false);
  });
});
