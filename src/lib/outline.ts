/**
 * SEMANTIC_TITLE_PLAN (batch A): outline derivation for raw documents —
 * the L1–L4 nodes semantic titles hang on. Pure functions, exact offsets
 * into the input text (slice(start, end) round-trips), ≤4 levels with
 * short-doc adaptation (GOALS G4 待定点①).
 *
 * Two modes:
 *  - heading mode: ≥2 markdown/numbered headings → nested tree (heading
 *    depth clamped to 1–4);
 *  - prose mode: blank-line paragraphs → ≤5 L1 groups, paragraphs as L2.
 */
import { suggestTitle } from './lightup.ts';

export type OutlineNode = {
  /** hierarchical path: '1', '1.2', '1.2.3' */
  path: string;
  level: number;
  /** exact offsets into the input text */
  start: number;
  end: number;
  /** rule-based placeholder title (first-line/first-sentence) */
  ruleTitle: string;
};

export const MAX_LEVEL = 4;

function* scanLines(text: string): Generator<{ line: string; start: number }> {
  let pos = 0;
  for (const line of text.split('\n')) {
    yield { line, start: pos };
    pos += line.length + 1;
  }
}

function headingLevel(line: string): number | null {
  const md = /^#{1,6}\s+\S/.exec(line);
  if (md) return Math.min(md[0].indexOf(' '), MAX_LEVEL);
  const num = /^(\d+(?:\.\d+)*)[.)、]?\s+\S/.exec(line);
  if (num) return Math.min(num[1].split('.').length, MAX_LEVEL);
  return null;
}

function cleanHeading(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\d+(?:\.\d+)*[.)、]?\s+/, '')
    .trim();
}

function headingOutline(input: string): OutlineNode[] {
  const marks: { start: number; end: number; level: number; title: string }[] = [];
  const lines = [...scanLines(input)];
  for (let i = 0; i < lines.length; i += 1) {
    const { line, start } = lines[i];
    const level = headingLevel(line);
    if (level === null) continue;
    const nextStart = i + 1 < lines.length ? lines[i + 1].start : input.length;
    marks.push({ start, end: nextStart, level, title: cleanHeading(line) });
  }
  if (marks.length < 2) return [];
  const counters: number[] = [];
  return marks.map((mark, index) => {
    counters[mark.level - 1] = (counters[mark.level - 1] ?? 0) + 1;
    counters.length = mark.level;
    const path = counters.join('.');
    // node extent = own heading through the line before the next heading
    const end = index + 1 < marks.length ? marks[index + 1].start : input.length;
    return {
      path,
      level: mark.level,
      start: mark.start,
      end: end > mark.start ? end : mark.end,
      ruleTitle: mark.title || suggestTitle(input.slice(mark.start, end)),
    };
  });
}

function paragraphSpans(input: string): { start: number; end: number; text: string }[] {
  const spans: { start: number; end: number; text: string }[] = [];
  const bounds: [number, number][] = [];
  const re = /\n{2,}/g;
  let cursor = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    bounds.push([cursor, m.index]);
    cursor = m.index + m[0].length;
  }
  bounds.push([cursor, input.length]);
  for (const [s, e] of bounds) {
    const raw = input.slice(s, e);
    const text = raw.trim();
    if (!text) continue;
    const lead = raw.length - raw.trimStart().length;
    spans.push({ start: s + lead, end: s + lead + text.length, text });
  }
  return spans;
}

type ProseSpan = { start: number; end: number; text: string; ruleTitle?: string };

/** A heading-only paragraph merges into the NEXT span (it titles that span). */
function mergeHeadingSpans(spans: ProseSpan[]): ProseSpan[] {
  const out: ProseSpan[] = [];
  for (let i = 0; i < spans.length; i += 1) {
    const span = spans[i];
    const singleLine = span.text.split('\n').length === 1;
    if (singleLine && headingLevel(span.text) !== null && i + 1 < spans.length) {
      const next = spans[i + 1];
      out.push({
        start: span.start,
        end: next.end,
        text: `${span.text}\n\n${next.text}`,
        ruleTitle: cleanHeading(span.text),
      });
      i += 1;
    } else {
      out.push(span);
    }
  }
  return out;
}

function proseOutline(input: string): OutlineNode[] {
  const spans = mergeHeadingSpans(paragraphSpans(input));
  if (spans.length === 0) return [];
  // short doc (≤5 paragraphs): one level, one node per paragraph
  if (spans.length <= 5) {
    return spans.map((span, i) => ({
      path: String(i + 1),
      level: 1,
      start: span.start,
      end: span.end,
      ruleTitle: span.ruleTitle || suggestTitle(span.text) || `Paragraph ${i + 1}`,
    }));
  }
  // longer doc: ≤5 L1 groups, paragraphs as L2 children
  const groupSize = Math.ceil(spans.length / 5);
  const nodes: OutlineNode[] = [];
  for (let g = 0; g * groupSize < spans.length; g += 1) {
    const group = spans.slice(g * groupSize, (g + 1) * groupSize);
    const first = group[0];
    const last = group[group.length - 1];
    nodes.push({
      path: String(g + 1),
      level: 1,
      start: first.start,
      end: last.end,
      ruleTitle: suggestTitle(group.map((s) => s.text).join('\n\n')) || `Section ${g + 1}`,
    });
    group.forEach((span, i) => {
      nodes.push({
        path: `${g + 1}.${i + 1}`,
        level: 2,
        start: span.start,
        end: span.end,
        ruleTitle: span.ruleTitle || suggestTitle(span.text) || `Paragraph ${i + 1}`,
      });
    });
  }
  return nodes;
}

/** Derive L1–L4 outline nodes from raw document text. */
export function deriveOutline(input: string): OutlineNode[] {
  if (!input.trim()) return [];
  const headed = headingOutline(input);
  return headed.length >= 2 ? headed : proseOutline(input);
}
