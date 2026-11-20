import { describe, expect, it, beforeEach } from 'vitest';
import { metrics, renderMetrics, resetMetrics } from './metrics.ts';

describe('prometheus metrics registry', () => {
  beforeEach(() => resetMetrics());

  it('renders counters with labels and a zero baseline', () => {
    metrics.httpRequests.inc({ method: 'GET', route: '/api/items', status: '200' });
    metrics.httpRequests.inc({ method: 'GET', route: '/api/items', status: '200' }, 2);
    const text = renderMetrics();
    expect(text).toContain('# TYPE gsc_http_requests_total counter');
    expect(text).toContain('gsc_http_requests_total{method="GET",route="/api/items",status="200"} 3');
    // an untouched counter still exposes a 0 baseline so scrapes don't gap
    expect(text).toContain('gsc_llm_retries_total 0');
  });

  it('renders histogram buckets, sum and count', () => {
    metrics.httpDuration.observe({ method: 'GET', route: '/health' }, 30);
    metrics.httpDuration.observe({ method: 'GET', route: '/health' }, 300);
    const text = renderMetrics();
    expect(text).toContain('# TYPE gsc_http_request_duration_ms histogram');
    expect(text).toContain('gsc_http_request_duration_ms_bucket{le="+Inf",method="GET",route="/health"} 2');
    expect(text).toContain('gsc_http_request_duration_ms_count{method="GET",route="/health"} 2');
    expect(text).toContain('gsc_http_request_duration_ms_sum{method="GET",route="/health"} 330');
  });

  it('exposes process gauges', () => {
    const text = renderMetrics();
    expect(text).toContain('gsc_process_uptime_seconds');
    expect(text).toContain('gsc_process_resident_memory_bytes');
  });

  it('separates label sets into distinct series and resets cleanly', () => {
    metrics.llmTokens.inc({ model: 'a', type: 'prompt' }, 5);
    metrics.llmTokens.inc({ model: 'a', type: 'completion' }, 3);
    const text = renderMetrics();
    expect(text).toContain('gsc_llm_tokens_total{model="a",type="prompt"} 5');
    expect(text).toContain('gsc_llm_tokens_total{model="a",type="completion"} 3');
    resetMetrics();
    expect(renderMetrics()).toContain('gsc_llm_tokens_total 0');
  });
});
