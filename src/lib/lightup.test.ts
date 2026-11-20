import { describe, expect, it } from 'vitest';
import { isFastPath, normalizeText, segmentText, mergeSegments, splitSegment } from './lightup.ts';

describe('lightup segmentation rules', () => {
  it('keeps short text as a single chunk and suggests a title', () => {
    const chunks = segmentText('Chunking beats long context.\nIt just works.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].title).toBe('Chunking beats long context.');
    expect(chunks[0].content).toContain('It just works.');
  });

  it('splits on blank-line paragraphs and merges tiny fragments', () => {
    const text = [
      'First paragraph stays long enough on its own to become a chunk, with plenty of words.',
      '',
      'tiny',
      '',
      'Second paragraph is also long enough to stand alone as a chunk here, no doubt about it.',
    ].join('\n');
    const chunks = segmentText(text);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).toContain('tiny');
    expect(chunks[1].content).toContain('Second paragraph');
  });

  it('starts a new chunk at markdown headings', () => {
    const text = [
      'Intro paragraph long enough to be its own chunk without any doubt.',
      '',
      '# Section Two',
      'Body under the heading long enough to matter for the segmentation.',
    ].join('\n');
    const chunks = segmentText(text);
    expect(chunks).toHaveLength(2);
    expect(chunks[1].title).toBe('Section Two');
  });

  it('normalizes line endings, zero-width characters and excess blank lines', () => {
    const text = 'A\u200B line\r\n\r\n\r\n\r\nnext   \nline';
    const normalized = normalizeText(text);
    expect(normalized).toBe('A line\n\nnext\nline');
  });

  it('detects the fast path for short single-paragraph input', () => {
    expect(isFastPath('quick note')).toBe(true);
    expect(isFastPath('a'.repeat(300))).toBe(false);
    expect(isFastPath('para one\n\npara two')).toBe(false);
    expect(isFastPath('   ')).toBe(false);
  });
});

describe('offsets, merge, split (Light Up redesign)', () => {
  it('maps segments back to their span in the original text', () => {
    const text = 'First paragraph talks about alpha and stays long enough to stand alone here without merging.\n\nSecond paragraph covers beta and is also comfortably long enough to be its own separate chunk.';
    const segs = segmentText(text);
    expect(segs).toHaveLength(2);
    for (const seg of segs) {
      expect(seg.start).toBeDefined();
      expect(seg.end).toBeDefined();
      expect(text.slice(seg.start, seg.end)).toContain(seg.content.slice(0, 30));
      expect(seg.nameOrigin).toBe('rule');
    }
    expect(segs[1].start!).toBeGreaterThan(segs[0].start!);
  });

  it('merges segments with union span and first title', () => {
    const a = { key: 'a', title: 'A', content: 'alpha content here', start: 0, end: 18, nameOrigin: 'rule' as const };
    const b = { key: 'b', title: 'B', content: 'beta content here', start: 30, end: 47, nameOrigin: 'rule' as const };
    const m = mergeSegments([a, b]);
    expect(m.title).toBe('A');
    expect(m.content).toContain('alpha');
    expect(m.content).toContain('beta');
    expect(m.start).toBe(0);
    expect(m.end).toBe(47);
  });

  it('splits at paragraph boundary and re-derives the second title', () => {
    const seg = { key: 'k', title: 'T', content: 'first part of the chunk text.\n\nsecond part of the chunk text.', start: 0, end: 60, nameOrigin: 'rule' as const };
    const parts = splitSegment(seg, 25);
    expect(parts).toBeDefined();
    const [a, b] = parts!;
    expect(a.content).toContain('first part');
    expect(b.content).toContain('second part');
    expect(b.title).not.toBe('T');
  });
});
