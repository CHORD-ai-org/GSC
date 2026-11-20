import { describe, it, expect } from 'vitest';
import { matchPath, queryParam } from './router.ts';

describe('router primitives', () => {
  it('extracts path params', () => {
    expect(matchPath('/raw/:id', '/raw/abc')).toEqual({ id: 'abc' });
    expect(matchPath('/a/:x/b/:y', '/a/1/b/2')).toEqual({ x: '1', y: '2' });
  });

  it('returns null when there is no match', () => {
    expect(matchPath('/raw/:id', '/objects/abc')).toBeNull();
    expect(matchPath('/raw/:id', '/raw')).toBeNull();
  });

  it('decodes params', () => {
    expect(matchPath('/raw/:id', '/raw/a%20b')).toEqual({ id: 'a b' });
  });

  it('reads query params', () => {
    expect(queryParam('?day=2026', 'day')).toBe('2026');
    expect(queryParam('', 'day')).toBe('');
  });
});
