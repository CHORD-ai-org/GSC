import { describe, expect, it } from 'vitest';
import { isFastPath, normalizeText, segmentText } from './lightup.ts';

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
