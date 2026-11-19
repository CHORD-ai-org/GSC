import { describe, expect, it } from 'vitest';
import { buildAgentContext, buildJsonExport, buildMarkdownBundle } from './sync.ts';
import type { ItemDetailBundle, ExportSource } from './sync.ts';

function fixture(): ExportSource {
  const doc: ItemDetailBundle = {
    item: {
      id: 'itm_doc1', type: 'raw.document', title: 'Paper on chunking', domain: 'knowledge',
      origin: 'import', source_label: 'arxiv', status: 'active',
      created_at: '2026-11-18T10:00:00Z', updated_at: '2026-11-18T11:00:00Z',
      fields: { content_text: 'Chunking beats long context.' },
    },
    relations: { outgoing: [], incoming: [
      { id: 'rel1', kind: 'derived_from', from_id: 'itm_con1', to_id: 'itm_doc1', note: '', created_at: '2026-11-18T11:00:00Z', created_by: 'user' },
    ] },
    events: [{ id: 'evt1', item_id: 'itm_doc1', at: '2026-11-18T10:00:00Z', actor: 'user', action: 'created', detail: 'created' }],
  };
  const concept: ItemDetailBundle = {
    item: {
      id: 'itm_con1', type: 'object.concept', title: 'Context window', domain: 'knowledge',
      origin: 'user', source_label: '', status: 'draft',
      created_at: '2026-11-18T10:05:00Z', updated_at: '2026-11-18T10:05:00Z',
      fields: { definition: 'The span of tokens a model can attend to.' },
    },
    relations: { outgoing: [
      { id: 'rel1', kind: 'derived_from', from_id: 'itm_con1', to_id: 'itm_doc1', note: '', created_at: '2026-11-18T11:00:00Z', created_by: 'user' },
    ], incoming: [] },
    events: [],
  };
  return {
    details: [doc, concept],
    contexts: [{ id: 'ctx1', title: 'Knowledge Context', subject: 'chunking', scope: 'mvp', purpose: 'evaluation', created_at: '', updated_at: '', member_ids: ['itm_doc1', 'itm_con1'] }],
    exportedAt: '2026-11-19T00:00:00Z',
  };
}

describe('sync export builders', () => {
  it('json export round-trips items and contexts', () => {
    const artifact = buildJsonExport(fixture());
    expect(artifact.filename).toBe('gsc-export.json');
    const parsed = JSON.parse(artifact.content) as { format: string; items: unknown[]; contexts: unknown[] };
    expect(parsed.format).toBe('gsc-export');
    expect(parsed.items).toHaveLength(2);
    expect(parsed.contexts).toHaveLength(1);
  });

  it('markdown bundle lists index, relations and history', () => {
    const artifact = buildMarkdownBundle(fixture());
    expect(artifact.filename).toBe('gsc-bundle.md');
    expect(artifact.content).toContain('# GSC Bundle');
    expect(artifact.content).toContain('Paper on chunking');
    expect(artifact.content).toContain('derived_from ← itm_con1');
    expect(artifact.content).toContain('## Context views');
  });

  it('agent context targets Claude Code / Codex usage', () => {
    const artifact = buildAgentContext(fixture());
    expect(artifact.filename).toBe('GSC-CONTEXT.md');
    expect(artifact.content).toContain('Claude Code / Codex');
    expect(artifact.content).toContain('## Structured objects');
    expect(artifact.content).toContain('The span of tokens a model can attend to.');
    expect(artifact.content).toContain('Chunking beats long context.');
    expect(artifact.content).toContain('members: Paper on chunking, Context window');
  });
});
