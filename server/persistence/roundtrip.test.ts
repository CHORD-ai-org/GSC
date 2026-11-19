import { beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, setDatabase, type DatabaseHandle } from './client.ts';
import { migrationSql } from './migrate.ts';
import { createItem, getItem, listItems, updateItem } from '../repo/items.ts';
import { createRelation, listRelations } from '../repo/relations.ts';
import { listEvents } from '../repo/events.ts';
import {
  addContextMember,
  createContext,
  getContext,
  listContexts,
  removeContextMember,
  updateContext,
} from '../repo/contexts.ts';

let handle: DatabaseHandle;

beforeEach(async () => {
  handle = createDatabase();
  await handle.exec(migrationSql());
  setDatabase(handle);
});

describe('repository round-trip', () => {
  it('creates a raw document and reads it back with a created event', async () => {
    const created = await createItem(handle.db, {
      type: 'raw.document',
      title: 'Paper',
      domain: 'knowledge',
      origin: 'import',
      fields: { content_text: 'Original text', author: 'Author' },
    });
    const found = await getItem(handle.db, created.id);
    expect(found?.fields.content_text).toBe('Original text');
    expect(found?.status).toBe('active');
    const events = await listEvents(handle.db, created.id);
    expect(events.some((e) => e.action === 'created')).toBe(true);
  });

  it('creates a concept with a source relation and shows both sides', async () => {
    const raw = await createItem(handle.db, {
      type: 'raw.document', title: 'Source', domain: 'knowledge', origin: 'import',
      fields: { content_text: 'Text' },
    });
    const concept = await createItem(handle.db, {
      type: 'object.concept', title: 'Concept', domain: 'knowledge', origin: 'user',
      fields: { definition: 'Definition', source_item_id: raw.id },
    });
    const result = await createRelation(handle.db, {
      kind: 'derived_from', from_id: concept.id, to_id: raw.id, note: 'source',
    });
    expect(result.ok).toBe(true);
    const outgoing = await listRelations(handle.db, concept.id);
    const incoming = await listRelations(handle.db, raw.id);
    expect(outgoing.outgoing.some((r) => r.kind === 'derived_from')).toBe(true);
    expect(incoming.incoming.some((r) => r.kind === 'derived_from')).toBe(true);
  });

  it('rejects duplicate relations and multiple derived_from edges', async () => {
    const raw = await createItem(handle.db, {
      type: 'raw.document', title: 'Source', domain: 'knowledge', origin: 'user', fields: { content_text: 'Text' },
    });
    const concept = await createItem(handle.db, {
      type: 'object.concept', title: 'Concept', domain: 'knowledge', origin: 'user', fields: { definition: 'D' },
    });
    const first = await createRelation(handle.db, {
      kind: 'derived_from', from_id: concept.id, to_id: raw.id,
    });
    expect(first.ok).toBe(true);
    const duplicate = await createRelation(handle.db, {
      kind: 'derived_from', from_id: concept.id, to_id: raw.id,
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.reason).toBe('duplicate');
  });

  it('updates object fields but keeps raw content immutable in the update path', async () => {
    const raw = await createItem(handle.db, {
      type: 'raw.document', title: 'Paper', domain: 'knowledge', origin: 'user', fields: { content_text: 'Original' },
    });
    await updateItem(handle.db, raw.id, { title: 'Renamed', source_label: 'p.1' });
    const reread = await getItem(handle.db, raw.id);
    expect(reread?.title).toBe('Renamed');
    expect(reread?.fields.content_text).toBe('Original');
    const all = await listItems(handle.db, { q: 'renamed' });
    expect(all).toHaveLength(1);
  });

  it('creates a context with explicit members and rejects duplicates', async () => {
    const raw = await createItem(handle.db, {
      type: 'raw.document', title: 'Paper', domain: 'knowledge', origin: 'user',
      fields: { content_text: 'Original' },
    });
    const concept = await createItem(handle.db, {
      type: 'object.concept', title: 'Concept', domain: 'knowledge', origin: 'user',
      fields: { definition: 'D' },
    });
    const context = await createContext(handle.db, {
      title: 'Knowledge Context', subject: 'Design', scope: 'MVP', purpose: 'Inspect',
    });
    const first = await addContextMember(handle.db, context.id, raw.id);
    expect(first.ok).toBe(true);
    const second = await addContextMember(handle.db, context.id, raw.id);
    expect(second.ok).toBe(false);
    await addContextMember(handle.db, context.id, concept.id);
    const detail = await getContext(handle.db, context.id);
    expect(detail?.member_ids).toEqual([raw.id, concept.id]);
    const removed = await removeContextMember(handle.db, context.id, raw.id);
    expect(removed.ok).toBe(true);
    expect((await getContext(handle.db, context.id))?.member_ids).toEqual([concept.id]);
    await updateContext(handle.db, context.id, { purpose: 'Evaluate' });
    expect((await listContexts(handle.db))[0].purpose).toBe('Evaluate');
  });
});
