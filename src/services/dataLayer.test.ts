import { afterEach, describe, expect, it } from 'vitest';
import { createMutationRunner, errorMessageKey, keysAfter, type DataKey } from './dataLayer.ts';
import { ApiRequestError, createItem, getItem, listItems } from './api.ts';

describe('U1 invalidation rules', () => {
  it('item.delete refreshes clusters and contexts (stale-badge regression)', () => {
    const keys = keysAfter('item.delete');
    expect(keys).toContain('clusters');
    expect(keys).toContain('contexts');
    expect(keys).toContain('items');
  });

  it('item.restore follows the same membership path as delete', () => {
    expect(keysAfter('item.restore')).toContain('clusters');
    expect(keysAfter('item.restore')).toContain('contexts');
  });

  it('writes that only touch one aggregate refresh nothing else', () => {
    expect(keysAfter('item.create')).toEqual(['items']);
    expect(keysAfter('relation.create')).toEqual(['items', 'detail']);
    expect(keysAfter('tag.value.create')).toEqual(['tags']);
  });

  it('unknown mutations refresh nothing instead of everything', () => {
    expect(keysAfter('no.such.mutation')).toEqual([]);
  });
});

describe('U1 mutation runner', () => {
  function harness() {
    const calls: { cleared: string[]; shown: [string, string][]; reloaded: (readonly DataKey[])[] } = {
      cleared: [], shown: [], reloaded: [],
    };
    const run = createMutationRunner({
      scope: () => 'view:raw',
      clearError: (s) => calls.cleared.push(s),
      showError: (s, m) => calls.shown.push([s, m]),
      reload: async (keys) => { calls.reloaded.push(keys); },
      describeError: (e) => (e instanceof Error ? e.message : 'boom'),
    });
    return { calls, run };
  }

  it('success: returns the result and reloads exactly the rule keys', async () => {
    const { calls, run } = harness();
    const result = await run('item.delete', async () => 'deleted');
    expect(result).toBe('deleted');
    expect(calls.reloaded).toEqual([keysAfter('item.delete')]);
    expect(calls.shown).toEqual([]);
  });

  it('failure: returns undefined and routes the message to the current scope', async () => {
    const { calls, run } = harness();
    const result = await run('item.create', async () => { throw new Error('nope'); });
    expect(result).toBeUndefined();
    expect(calls.shown).toEqual([['view:raw', 'nope']]);
    expect(calls.reloaded).toEqual([]);
  });

  it('runner clears the scope error before running', async () => {
    const { calls, run } = harness();
    await run('item.create', async () => 1);
    expect(calls.cleared).toEqual(['view:raw']);
  });
});

describe('U1 error kind mapping', () => {
  it('keeps the server kind as a translatable key', () => {
    expect(errorMessageKey(new ApiRequestError('rate_limited', 'slow down', true))).toBe('error.rateLimited');
    expect(errorMessageKey(new ApiRequestError('forbidden', 'no'))).toBe('error.forbidden');
  });

  it('falls back to undefined for plain errors (raw message wins)', () => {
    expect(errorMessageKey(new Error('x'))).toBeUndefined();
    expect(errorMessageKey('x')).toBeUndefined();
  });
});

describe('U1 request discipline (real api.ts against a fetch stub)', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = realFetch; });

  function stubFetch() {
    const urls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      return new Response(JSON.stringify({ ok: true, items: [], item: { id: 'i1' }, events: [], relations: { outgoing: [], incoming: [] } }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;
    return urls;
  }

  it('one create + rule reload costs at most 3 requests', async () => {
    const urls = stubFetch();
    const run = createMutationRunner({
      scope: () => 'panel:new',
      clearError: () => {},
      showError: () => { throw new Error('unexpected'); },
      reload: async (keys) => {
        // the real App reloads `items` via listItems (transparent paging)
        if (keys.includes('items')) await listItems({});
      },
      describeError: (e) => String(e),
    });
    await run('item.create', () => createItem({ type: 'raw.document', title: 't', fields: {} }));
    expect(urls.length).toBeLessThanOrEqual(3);
    expect(urls).toHaveLength(2); // POST /api/items + GET /api/items page
  });

  it('plain getItem is side-effect-free; only trace=1 marks an open', async () => {
    const urls = stubFetch();
    await getItem('i1');
    expect(urls[0]).not.toContain('trace');
    await getItem('i1', { trace: true });
    expect(urls[1]).toContain('trace=1');
  });
});
