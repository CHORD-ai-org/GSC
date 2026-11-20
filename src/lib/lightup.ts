/**
 * Light Up pipeline rules (D-047): normalization, rule-based segmentation,
 * and semantic-name suggestion. Pure functions — the review table is the
 * human gate before anything persists.
 */

export type Segment = {
  key: string;
  title: string;
  content: string;
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

  return merged.map((content, index) => ({
    key: `seg-${index}-${content.length}`,
    title: suggestTitle(content) || `Untitled segment ${index + 1}`,
    content,
  }));
}

export type IntakeSource = {
  label: string;
  kind: 'text' | 'url' | 'clipboard' | 'file';
};

export function isFastPath(text: string): boolean {
  const normalized = normalizeText(text);
  return normalized.length > 0 && normalized.length < 200 && !normalized.includes('\n\n');
}
