/** G2 batch intake contract (shared by API route, CLI and skills). */

export type IngestGroup = {
  client: 'opencode' | 'codex' | 'workbuddy' | 'manual';
  project: string;
  session_id: string;
  label?: string;
};

export type IngestDoc = {
  title: string;
  content_text: string;
  url?: string;
  author?: string;
  captured_at?: string;
};

export type IngestBatchBody = {
  group: IngestGroup;
  docs: IngestDoc[];
};

const CLIENTS = new Set(['opencode', 'codex', 'workbuddy', 'manual']);

function nonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function validateIngestBatchBody(value: unknown): value is IngestBatchBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  const g = b.group as Record<string, unknown> | undefined;
  if (typeof g !== 'object' || g === null) return false;
  if (!CLIENTS.has(g.client as string)) return false;
  if (!nonEmpty(g.project) || !nonEmpty(g.session_id)) return false;
  if (!Array.isArray(b.docs) || b.docs.length < 1 || b.docs.length > 50) return false;
  return b.docs.every((d) => {
    const doc = d as Record<string, unknown>;
    return nonEmpty(doc.content_text) && (doc.title === undefined || typeof doc.title === 'string');
  });
}
