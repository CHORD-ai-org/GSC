import { describe, expect, it, beforeAll } from 'vitest';
import { count, eq } from 'drizzle-orm';
import { createDatabase } from '../persistence/client.ts';
import type { Database, DatabaseHandle } from '../persistence/client.ts';
import { migrationSql } from '../persistence/migrate.ts';
import { events, itemContent, items } from '../persistence/schema.ts';
import { createItem, getItem, updateItem } from './items.ts';

let handle: DatabaseHandle;

beforeAll(async () => {
  handle = createDatabase();
  await handle.exec(migrationSql());
});

/**
 * B3 injection harness: wraps a drizzle Database so `insert(events)` throws,
 * standing in for "the last write of the transaction fails". Everything else
 * delegates unchanged; the transaction callback receives the wrapped tx so the
 * interception fires *inside* the transaction and rollback is exercised.
 */
function failingEventsInsert(base: Database): Database {
  const wrap = (target: Record<PropertyKey, unknown>): Record<PropertyKey, unknown> =>
    new Proxy(target, {
      get(t, prop) {
        const value = t[prop];
        if (prop === 'insert') {
          return (table: unknown, ...rest: unknown[]) => {
            if (table === events) throw new Error('injected failure: events insert');
            return (value as (...a: unknown[]) => unknown).call(t, table, ...rest);
          };
        }
        if (prop === 'transaction') {
          return (fn: (tx: unknown) => Promise<unknown>) =>
            (value as (fn2: (tx: unknown) => Promise<unknown>) => Promise<unknown>).call(
              t,
              (tx: unknown) => fn(wrap(tx as Record<string, unknown>)),
            );
        }
        return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(t) : value;
      },
    });
  return wrap(base as unknown as Record<PropertyKey, unknown>) as unknown as Database;
}

async function tableCounts() {
  const [i] = await handle.db.select({ n: count() }).from(items);
  const [c] = await handle.db.select({ n: count() }).from(itemContent);
  const [e] = await handle.db.select({ n: count() }).from(events);
  return { items: Number(i.n), content: Number(c.n), events: Number(e.n) };
}

describe('write atomicity (O1-4/B3 injection tests — the O1-4 acceptance that was never written)', () => {
  it('createItem rolls back item + content when the event insert fails (no orphans)', async () => {
    const before = await tableCounts();
    const failing = failingEventsInsert(handle.db);
    await expect(
      createItem(failing, {
        type: 'raw.document',
        title: 'Orphan probe',
        domain: 'knowledge',
        origin: 'user',
        fields: { content_text: 'should never persist' },
      }),
    ).rejects.toThrow('injected failure');
    expect(await tableCounts()).toEqual(before);
  });

  it('updateItem rolls back title + content updates when the event insert fails (no half-update)', async () => {
    const created = await createItem(handle.db, {
      type: 'raw.document',
      title: 'Before',
      domain: 'knowledge',
      origin: 'user',
      fields: { content_text: 'original body' },
    });
    const failing = failingEventsInsert(handle.db);
    await expect(
      updateItem(failing, created.id, { title: 'After', fields: { content_text: 'changed body' } }),
    ).rejects.toThrow('injected failure');

    const after = await getItem(handle.db, created.id);
    expect(after?.title).toBe('Before');
    expect(after?.fields.content_text).toBe('original body');
    const itemEvents = await handle.db.select().from(events).where(eq(events.item_id, created.id));
    expect(itemEvents).toHaveLength(1); // only the 'created' event
  });
});
