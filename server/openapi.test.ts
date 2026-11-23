import { describe, expect, it } from 'vitest';
import { buildOpenApi, routeToPath } from './openapi.ts';
import { KNOWN_ROUTES } from './router.ts';

describe('OpenAPI 3.1 spec (INTEGRATION_HARDENING P1)', () => {
  it('is a valid 3.1 document with security and schemas', () => {
    const spec = buildOpenApi() as Record<string, any>;
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
    expect(spec.components.schemas.ApiError).toBeTruthy();
    expect(spec.components.schemas.CreateItemBody).toBeTruthy();
  });

  it('derives paths from the route registry (items, capture, tokens)', () => {
    const spec = buildOpenApi() as Record<string, any>;
    expect(Object.keys(spec.paths['/api/items'])).toEqual(expect.arrayContaining(['get', 'post']));
    expect(Object.keys(spec.paths['/api/items/{id}'])).toEqual(expect.arrayContaining(['get', 'patch', 'delete']));
    expect(Object.keys(spec.paths['/api/capture'])).toEqual(expect.arrayContaining(['get', 'post']));
    expect(spec.paths['/api/tokens'].post.summary).toMatch(/token/i);
    expect(spec.paths['/healthz']).toBeTruthy();
  });

  it('converts route regexes to OpenAPI path templates', () => {
    expect(routeToPath('\\/api\\/items\\/[^/]+$')).toBe('/api/items/{id}');
    expect(routeToPath('\\/api\\/items\\/([^/]+)$')).toBe('/api/items/{id}');
    expect(routeToPath('\\/api\\/capture$')).toBe('/api/capture');
  });

  it('documents every route in the registry (registry ↔ META alignment, B1)', () => {
    const spec = buildOpenApi() as Record<string, any>;
    for (const { pattern, methods } of KNOWN_ROUTES) {
      const p = routeToPath(pattern.source);
      for (const method of methods) {
        expect(spec.paths[p]?.[method.toLowerCase()], `${method} ${p}`).toBeTruthy();
      }
    }
  });
});
