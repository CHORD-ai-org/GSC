/**
 * News announcement model (shared by the server store and the frontend).
 *
 * Announcements are authored by the admin in Settings → 新闻管理 and persisted
 * in the backend (`news.json` under the data dir). The Start page only shows
 * items marked `published`, inside a small dismissible rounded card — so the
 * block is never permanent: once closed it stays gone until new content lands.
 */

export type NewsText = { zh: string; en: string };

export type NewsItem = {
  id: string;
  title: NewsText;
  summary: NewsText;
  published: boolean;
  created_at: string; // ISO
  updated_at: string; // ISO
};

/** Pick the text for the active language, falling back across languages. */
export function pickText(text: NewsText, lang: 'zh' | 'en'): string {
  return text[lang] || text.zh || text.en || '';
}
