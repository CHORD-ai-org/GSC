/**
 * In-memory token-bucket rate limiting (O1-5). Per-key (token id or client IP),
 * per-endpoint-class. Single-process only — a multi-instance deployment needs a
 * shared store (documented limitation).
 */

export type RateRule = { capacity: number; perMinute: number };

export const RATE_RULES: Record<'write' | 'ingest' | 'agent', RateRule> = {
  write: { capacity: 60, perMinute: 60 },
  ingest: { capacity: 10, perMinute: 10 },
  agent: { capacity: 5, perMinute: 5 },
};

type Bucket = { tokens: number; updatedAt: number };

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  /** Returns null when allowed, or seconds-to-wait when throttled. */
  take(key: string, rule: RateRule, now = Date.now()): number | null {
    const bucket = this.buckets.get(key) ?? { tokens: rule.capacity, updatedAt: now };
    const refill = ((now - bucket.updatedAt) / 60_000) * rule.perMinute;
    bucket.tokens = Math.min(rule.capacity, bucket.tokens + refill);
    bucket.updatedAt = now;
    if (bucket.tokens < 1) {
      this.buckets.set(key, bucket);
      return Math.max(1, Math.ceil(((1 - bucket.tokens) / rule.perMinute) * 60));
    }
    bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    // opportunistic cleanup so the map does not grow unbounded
    if (this.buckets.size > 10_000) {
      for (const [k, b] of this.buckets) {
        if (now - b.updatedAt > 600_000) this.buckets.delete(k);
      }
    }
    return null;
  }
}

export function rateRuleFor(path: string, method: string): { name: keyof typeof RATE_RULES; rule: RateRule } | undefined {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return undefined; // reads are free
  if (path.startsWith('/api/ingest/')) return { name: 'ingest', rule: RATE_RULES.ingest };
  if (path.startsWith('/api/agent/')) return { name: 'agent', rule: RATE_RULES.agent };
  // SEMANTIC_TITLE_PLAN: title generation spends LLM tokens — agent class.
  if (path.includes('/outline/')) return { name: 'agent', rule: RATE_RULES.agent };
  return { name: 'write', rule: RATE_RULES.write };
}
