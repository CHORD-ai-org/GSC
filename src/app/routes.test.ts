import { describe, it, expect } from 'vitest';
import { parsePath, buildPath, routes } from './routes.ts';

describe('GSC routes', () => {
  it('maps root to start', () => {
    expect(parsePath('/')).toEqual({ view: 'start' });
  });

  it('round-trips item detail deep links', () => {
    const s = parsePath('/raw/itm_123');
    expect(s).toEqual({ view: 'raw', itemId: 'itm_123' });
    expect(buildPath(s)).toBe('/raw/itm_123');
  });

  it('round-trips contexts and clusters detail', () => {
    expect(parsePath('/contexts/ctx_1')).toEqual({ view: 'contexts', contextId: 'ctx_1' });
    expect(buildPath({ view: 'contexts', contextId: 'ctx_1' })).toBe('/contexts/ctx_1');
    expect(parsePath('/clusters/clu_1')).toEqual({ view: 'clusters', clusterId: 'clu_1' });
  });

  it('carries the recent day filter as a query param', () => {
    expect(parsePath('/recently', '?day=2026-11-21')).toEqual({ view: 'recently', day: '2026-11-21' });
    expect(buildPath({ view: 'recently', day: '2026-11-21' })).toBe('/recently?day=2026-11-21');
  });

  it('flags unknown paths as notFound', () => {
    expect(parsePath('/nope').notFound).toBe(true);
    expect(parsePath('/overview/extra').notFound).toBe(true);
  });

  it('builds list paths and encodes ids', () => {
    expect(routes.raw()).toBe('/raw');
    expect(routes.objects('a b')).toBe('/objects/a%20b');
  });
});
