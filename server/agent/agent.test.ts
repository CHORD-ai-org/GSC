import { beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, type DatabaseHandle } from '../persistence/client.ts';
import { migrationSql } from '../persistence/migrate.ts';
import { createItem, getItem, listItems } from '../repo/items.ts';
import { createProposal, listProposals, resolveProposalApplying } from '../repo/proposals.ts';
import { extractJson } from './llm.ts';
import { runDetection, similarity } from './detector.ts';

let handle: DatabaseHandle;

beforeEach(async () => {
  handle = createDatabase();
  await handle.exec(migrationSql());
});

async function addDoc(title: string, content_text: string, source_label = 'src') {
  return createItem(handle.db, {
    type: 'raw.document',
    title,
    domain: 'knowledge',
    origin: 'user',
    source_label,
    fields: { content_text },
  });
}

describe('detector', () => {
  it('flags near-duplicate chunks (100% hit on constructed pairs)', async () => {
    const text = 'Semantic identity is a first-class product concept for every chunk of information in the space.';
    await addDoc('Original', text);
    await addDoc('Duplicate', text);
    await addDoc('Unrelated', 'Totally different content about cooking pasta with tomato sauce and basil.');

    const report = await runDetection(handle.db);
    expect(report.dedupe).toBe(1);

    const dedupe = (await listProposals(handle.db)).filter((p) => p.kind === 'dedupe');
    expect(dedupe).toHaveLength(1);
    expect(dedupe[0].rationale).toContain('similarity');
  });

  it('marks provenance gaps and skips already-pending duplicates', async () => {
    await addDoc('No source', 'content without any provenance label attached to it at all', '');
    const first = await runDetection(handle.db);
    expect(first.metadata).toBe(1);
    const second = await runDetection(handle.db);
    expect(second.metadata).toBe(0); // pending proposal dedupe
    expect(second.dedupe).toBe(0);
  });

  it('computes similarity over word sets', () => {
    expect(similarity('alpha beta gamma', 'alpha beta gamma')).toBe(1);
    expect(similarity('alpha beta', 'gamma delta')).toBe(0);
  });
});

describe('extractJson', () => {
  it('parses fenced and bare JSON replies', () => {
    expect(extractJson('```json\n[{"a":1}]\n```')).toEqual([{ a: 1 }]);
    expect(extractJson('{"b":2}')).toEqual({ b: 2 });
  });
});

describe('proposal acceptance semantics (D-054)', () => {
  it('accepting semantic_name updates the title and records history', async () => {
    const item = await addDoc('Old name', 'body text');
    const proposal = await createProposal(handle.db, {
      kind: 'semantic_name',
      target_id: item.id,
      proposed_value: 'New semantic name',
      source: 'agent',
    });
    await resolveProposalApplying(handle.db, proposal.id, 'accepted');
    const updated = await getItem(handle.db, item.id);
    expect(updated?.title).toBe('New semantic name');
    const still = await listItems(handle.db);
    expect(still).toHaveLength(1);
  });

  it('rejecting leaves data untouched', async () => {
    const item = await addDoc('Keep me', 'body');
    const proposal = await createProposal(handle.db, {
      kind: 'semantic_name',
      target_id: item.id,
      proposed_value: 'Nope',
      source: 'detector',
    });
    await resolveProposalApplying(handle.db, proposal.id, 'rejected');
    expect((await getItem(handle.db, item.id))?.title).toBe('Keep me');
  });
});
