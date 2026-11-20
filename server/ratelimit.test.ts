import { describe, expect, it } from 'vitest';
import { RateLimiter, rateRuleFor, RATE_RULES } from './ratelimit.ts';

describe('rate limiter (O1-5)', () => {
  it('allows bursts up to capacity then throttles with retry hints', () => {
    const limiter = new RateLimiter();
    const rule = { capacity: 3, perMinute: 60 };
    const now = 1_000;
    expect(limiter.take('k', rule, now)).toBeNull();
    expect(limiter.take('k', rule, now)).toBeNull();
    expect(limiter.take('k', rule, now)).toBeNull();
    const wait = limiter.take('k', rule, now);
    expect(wait).not.toBeNull();
    expect(wait!).toBeGreaterThanOrEqual(1);
    // a different key is unaffected
    expect(limiter.take('other', rule, now)).toBeNull();
  });

  it('refills over time', () => {
    const limiter = new RateLimiter();
    const rule = { capacity: 1, perMinute: 60 };
    expect(limiter.take('k', rule, 0)).toBeNull();
    expect(limiter.take('k', rule, 0)).not.toBeNull();
    expect(limiter.take('k', rule, 60_000)).toBeNull(); // full minute later
  });

  it('classifies endpoint classes and exempts reads', () => {
    expect(rateRuleFor('/api/items', 'GET')).toBeUndefined();
    expect(rateRuleFor('/api/items', 'POST')?.name).toBe('write');
    expect(rateRuleFor('/api/ingest/url', 'POST')?.name).toBe('ingest');
    expect(rateRuleFor('/api/agent/detect', 'POST')?.name).toBe('agent');
    expect(RATE_RULES.agent.capacity).toBeLessThan(RATE_RULES.write.capacity);
  });
});
