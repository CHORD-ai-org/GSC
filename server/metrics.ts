/**
 * Minimal dependency-free Prometheus metrics registry (INTEGRATION_HARDENING P0-B).
 * Supports counters and histograms with labels, rendered to the Prometheus text
 * exposition format. Process gauges (uptime / heap) are computed at render time.
 * The goal is a commercial ops baseline: RED metrics for HTTP and the LLM
 * provider, so /metrics can be scraped by Prometheus / Grafana / a load balancer.
 */

export type Labels = Record<string, string>;

function serialize(labels: Labels): string {
  const keys = Object.keys(labels).sort();
  return keys.map((k) => `${k} ${labels[k]}`).join('|');
}

function escapeLabel(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function fmtLabels(labels: Labels): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return '';
  const inner = keys.map((k) => `${k}="${escapeLabel(labels[k] ?? '')}"`).join(',');
  return `{${inner}}`;
}

class Counter {
  readonly name: string;
  readonly help: string;
  private values = new Map<string, { labels: Labels; value: number }>();

  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  inc(labels: Labels = {}, delta = 1): void {
    const key = serialize(labels);
    const cur = this.values.get(key);
    if (cur) cur.value += delta;
    else this.values.set(key, { labels, value: delta });
  }

  /** Programmatic read (LLM cost accounting). */
  snapshot(): { labels: Labels; value: number }[] {
    return [...this.values.values()].map((c) => ({ labels: c.labels, value: c.value }));
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    if (this.values.size === 0) lines.push(`${this.name} 0`);
    for (const { labels, value } of this.values.values()) {
      lines.push(`${this.name}${fmtLabels(labels)} ${value}`);
    }
    return lines.join('\n');
  }
}

type HistogramCell = { labels: Labels; counts: number[]; sum: number; count: number };

class Histogram {
  readonly name: string;
  readonly help: string;
  readonly buckets: number[];
  private cells = new Map<string, HistogramCell>();

  constructor(name: string, help: string, buckets: number[]) {
    this.name = name;
    this.help = help;
    this.buckets = buckets;
  }

  observe(labels: Labels, value: number): void {
    const key = serialize(labels);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = { labels, counts: new Array(this.buckets.length).fill(0), sum: 0, count: 0 };
      this.cells.set(key, cell);
    }
    cell.sum += value;
    cell.count += 1;
    for (let i = 0; i < this.buckets.length; i += 1) {
      if (value <= this.buckets[i]) cell.counts[i] += 1;
    }
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} histogram`];
    for (const cell of this.cells.values()) {
      for (let i = 0; i < this.buckets.length; i += 1) {
        lines.push(`${this.name}_bucket${fmtLabels({ ...cell.labels, le: String(this.buckets[i]) })} ${cell.counts[i]}`);
      }
      lines.push(`${this.name}_bucket${fmtLabels({ ...cell.labels, le: '+Inf' })} ${cell.count}`);
      lines.push(`${this.name}_sum${fmtLabels(cell.labels)} ${cell.sum}`);
      lines.push(`${this.name}_count${fmtLabels(cell.labels)} ${cell.count}`);
    }
    return lines.join('\n');
  }
}

const HTTP_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
const LLM_BUCKETS = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 20000, 40000];

export const metrics = {
  httpRequests: new Counter('gsc_http_requests_total', 'HTTP requests by method, route and status.'),
  httpDuration: new Histogram('gsc_http_request_duration_ms', 'HTTP request duration in milliseconds.', HTTP_BUCKETS),
  llmRequests: new Counter('gsc_llm_requests_total', 'LLM provider calls by model and outcome.'),
  llmDuration: new Histogram('gsc_llm_request_duration_ms', 'LLM provider call duration in milliseconds.', LLM_BUCKETS),
  llmTokens: new Counter('gsc_llm_tokens_total', 'LLM token usage by model and type (prompt|completion).'),
  llmRetries: new Counter('gsc_llm_retries_total', 'LLM provider retry attempts by model and reason.'),
};

const startedAt = Date.now();

/** Render the full Prometheus text exposition (counters + histograms + process gauges). */
export function renderMetrics(): string {
  const parts = [
    metrics.httpRequests.render(),
    metrics.httpDuration.render(),
    metrics.llmRequests.render(),
    metrics.llmDuration.render(),
    metrics.llmTokens.render(),
    metrics.llmRetries.render(),
    processGauges(),
  ];
  return `${parts.join('\n\n')}\n`;
}

function processGauges(): string {
  const uptime = (Date.now() - startedAt) / 1000;
  const mem = process.memoryUsage();
  return [
    '# HELP gsc_process_uptime_seconds Seconds since the API process started.',
    '# TYPE gsc_process_uptime_seconds gauge',
    `gsc_process_uptime_seconds ${uptime.toFixed(3)}`,
    '# HELP gsc_process_resident_memory_bytes Resident set size in bytes.',
    '# TYPE gsc_process_resident_memory_bytes gauge',
    `gsc_process_resident_memory_bytes ${mem.rss}`,
  ].join('\n');
}

/** Reset all series — for test isolation. */
export function resetMetrics(): void {
  for (const c of [metrics.httpRequests, metrics.llmRequests, metrics.llmTokens, metrics.llmRetries]) {
    (c as unknown as { values: Map<string, unknown> }).values.clear();
  }
  for (const h of [metrics.httpDuration, metrics.llmDuration]) {
    (h as unknown as { cells: Map<string, unknown> }).cells.clear();
  }
}
