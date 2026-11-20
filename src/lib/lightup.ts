/**
 * Light Up pipeline rules (D-047): normalization, rule-based segmentation,
 * and semantic-name suggestion. Pure functions — the review table is the
 * human gate before anything persists.
 */

export type Segment = {
  key: string;
  title: string;
  content: string;
  /** Offset span into the ORIGINAL input text; undefined = no precise reference (never faked). */
  start?: number;
  end?: number;
  /** Where the semantic name came from (three-state provenance, Vision §8). */
  nameOrigin: 'rule' | 'agent' | 'user';
};

export function normalizeText(input: string): string {
  return input
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function suggestTitle(content: string): string {
  const line = content.split('\n').find((l) => l.trim()) ?? '';
  const cleaned = line
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .trim();
  const firstSentence = cleaned.split(/(?<=[.!?。！？])\s+/)[0] || cleaned;
  return firstSentence.length > 80 ? `${firstSentence.slice(0, 79).trimEnd()}…` : firstSentence;
}

function isSplitLine(line: string): boolean {
  return /^#{1,6}\s+\S/.test(line) || /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim());
}

/**
 * Rule-based segmentation: blank-line paragraphs; Markdown headings and
 * horizontal rules start a new chunk; fragments under 80 chars merge into
 * the previous chunk. Short inputs stay a single chunk (fast-path rule).
 */
export function segmentText(input: string): Segment[] {
  const text = normalizeText(input);
  if (!text) return [];
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const merged: string[] = [];
  for (const paragraph of paragraphs) {
    const startsNew = merged.length > 0 && paragraph.split('\n').some(isSplitLine) && paragraph.length >= 80;
    if (startsNew || merged.length === 0) {
      merged.push(paragraph);
    } else if (paragraph.length < 80 && !paragraph.split('\n').some(isSplitLine)) {
      merged[merged.length - 1] = `${merged[merged.length - 1]}\n\n${paragraph}`;
    } else {
      merged.push(paragraph);
    }
  }

  return merged.map((content, index) => {
    // Map each segment back to its span in the original (pre-normalization) text.
    // If the content cannot be located verbatim, offsets stay undefined and the
    // UI must say "no precise reference" instead of faking a highlight.
    const probe = content.split('\n\n')[0].slice(0, 60);
    const at = probe ? input.indexOf(probe) : -1;
    const endAt = at >= 0 ? input.indexOf(content.slice(-60), at) : -1;
    return {
      key: `seg-${index}-${content.length}`,
      title: suggestTitle(content) || `Untitled segment ${index + 1}`,
      content,
      start: at >= 0 ? at : undefined,
      end: at >= 0 && endAt >= 0 ? endAt + content.slice(-60).length : undefined,
      nameOrigin: 'rule' as const,
    };
  });
}

/** Curation (frontend-only): merge selected segments — content in order, name from first, span = union. */
export function mergeSegments(segments: Segment[]): Segment {
  const ordered = [...segments].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  return {
    key: `seg-merged-${first.key}-${last.key}`,
    title: first.title,
    content: ordered.map((s) => s.content).join('\n\n'),
    start: first.start,
    end: last.end,
    nameOrigin: first.nameOrigin,
  };
}

/** Curation (frontend-only): split at a paragraph boundary near `offset` in the segment content. */
export function splitSegment(segment: Segment, offset: number): [Segment, Segment] | undefined {
  const idx = segment.content.indexOf('\n\n', offset - 1);
  const at = idx >= 0 && idx + 2 < segment.content.length ? idx + 2 : undefined;
  if (at === undefined) return undefined;
  const a: Segment = { ...segment, key: `${segment.key}-a`, content: segment.content.slice(0, at).trimEnd() };
  const b: Segment = { ...segment, key: `${segment.key}-b`, content: segment.content.slice(at).trimStart(), title: suggestTitle(segment.content.slice(at)) || `${segment.title} (2)`, nameOrigin: 'rule' };
  return [a, b];
}

export type IntakeSource = {
  label: string;
  kind: 'text' | 'url' | 'clipboard' | 'file';
};

export function isFastPath(text: string): boolean {
  const normalized = normalizeText(text);
  return normalized.length > 0 && normalized.length < 200 && !normalized.includes('\n\n');
}
