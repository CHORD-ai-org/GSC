/**
 * Admin-managed news announcements (Settings → 新闻管理 → server).
 *
 * Stored as a JSON file in the data dir (same tier as LLM settings / local
 * account binding): this is configuration authored by the admin, not part of
 * the knowledge graph. First read seeds the file with starter announcements so
 * the Start card is not empty; from then on the admin owns every entry.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { NewsItem, NewsText } from '../../src/lib/news.ts';

const NEWS_FILE = 'news.json';

function newsPath(dataDir: string): string {
  return path.join(dataDir, NEWS_FILE);
}

function iso(day: string): string {
  return `${day}T09:00:00.000Z`;
}

function seed(): NewsItem[] {
  const entries: { id: string; day: string; title: NewsText; summary: NewsText }[] = [
    {
      id: 'n-mimo',
      day: '2026-11-20',
      title: { zh: 'MiMo 模型接入完成', en: 'MiMo model integration complete' },
      summary: {
        zh: 'Agent 语义命名现已由小米 MiMo 驱动，可在 设置 → 模型 配置与测试连通。',
        en: 'Agent semantic naming now runs on Xiaomi MiMo — configure and test it in Settings → Model.',
      },
    },
    {
      id: 'n-lightup',
      day: '2026-11-20',
      title: { zh: 'Light Up 体验重设计上线', en: 'Light Up experience redesign shipped' },
      summary: {
        zh: '捕获 → 理解 → 塑造 → 策展 → 点亮：语义对象表与原文高亮联动。',
        en: 'Capture → Understand → Shape → Curate → Illuminate, with Semantic Object Sheets and source highlighting.',
      },
    },
    {
      id: 'n-i18n',
      day: '2026-11-20',
      title: { zh: '中英双语切换', en: 'Chinese / English language switch' },
      summary: {
        zh: 'Settings → 通用 → 语言 即时切换，全站文案已覆盖。',
        en: 'Switch instantly in Settings → General → Language; the whole UI is covered.',
      },
    },
  ];
  return entries.map((e) => ({
    id: e.id,
    title: e.title,
    summary: e.summary,
    published: true,
    created_at: iso(e.day),
    updated_at: iso(e.day),
  }));
}

function coerceText(v: unknown): NewsText {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    zh: typeof o.zh === 'string' ? o.zh.slice(0, 400) : '',
    en: typeof o.en === 'string' ? o.en.slice(0, 400) : '',
  };
}

export function readNews(dataDir: string): NewsItem[] {
  try {
    const parsed = JSON.parse(readFileSync(newsPath(dataDir), 'utf8')) as unknown;
    if (Array.isArray(parsed)) return parsed as NewsItem[];
    return [];
  } catch {
    // First run: seed so the Start card has content the admin can then edit.
    const initial = seed();
    try {
      mkdirSync(dataDir, { recursive: true });
      writeFileSync(newsPath(dataDir), JSON.stringify(initial, null, 2), 'utf8');
    } catch {
      /* unwritable data dir — return seed in-memory only */
    }
    return initial;
  }
}

export function writeNews(dataDir: string, items: NewsItem[]): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(newsPath(dataDir), JSON.stringify(items, null, 2), 'utf8');
}

function newId(): string {
  return `n_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export type NewsInput = {
  title: unknown;
  summary: unknown;
  published?: unknown;
};

export function createNewsItem(dataDir: string, input: NewsInput): NewsItem {
  const now = new Date().toISOString();
  const item: NewsItem = {
    id: newId(),
    title: coerceText(input.title),
    summary: coerceText(input.summary),
    published: input.published !== false,
    created_at: now,
    updated_at: now,
  };
  writeNews(dataDir, [item, ...readNews(dataDir)]);
  return item;
}

export function updateNewsItem(dataDir: string, id: string, input: NewsInput): NewsItem | undefined {
  const items = readNews(dataDir);
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return undefined;
  const current = items[idx];
  const next: NewsItem = {
    ...current,
    title: input.title !== undefined ? coerceText(input.title) : current.title,
    summary: input.summary !== undefined ? coerceText(input.summary) : current.summary,
    published: input.published !== undefined ? input.published !== false : current.published,
    updated_at: new Date().toISOString(),
  };
  items[idx] = next;
  writeNews(dataDir, items);
  return next;
}

export function deleteNewsItem(dataDir: string, id: string): boolean {
  const items = readNews(dataDir);
  const next = items.filter((i) => i.id !== id);
  if (next.length === items.length) return false;
  writeNews(dataDir, next);
  return true;
}
