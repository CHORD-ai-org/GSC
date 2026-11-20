import { useCallback, useEffect, useState } from 'react';
import * as api from '../services/api.ts';
import type { NewsItem, NewsText } from '../lib/news.ts';
import { pickText } from '../lib/news.ts';
import { useI18n, useT } from '../lib/i18n.tsx';
import { useToast } from './Toast.tsx';
import styles from '../views/views.module.css';

type Draft = { title: NewsText; summary: NewsText; published: boolean };
type EditLang = 'zh' | 'en';

const emptyDraft: Draft = {
  title: { zh: '', en: '' },
  summary: { zh: '', en: '' },
  published: true,
};

/**
 * Settings → 新闻管理 (admin backend). The owner authors the announcements
 * shown on the Start card: create, edit (zh/en), publish/unpublish, delete.
 */
export function NewsAdmin() {
  const t = useT();
  const toast = useToast();
  const { lang } = useI18n();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null); // null = closed, '' = new
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editLang, setEditLang] = useState<EditLang>(lang === 'en' ? 'en' : 'zh');

  const load = useCallback(() => {
    api.listNews().then((r) => setItems(r.news)).catch(() => setItems([]));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  function startNew() {
    setEditingId('');
    setDraft(emptyDraft);
    setEditLang(lang === 'en' ? 'en' : 'zh');
  }

  function startEdit(item: NewsItem) {
    setEditingId(item.id);
    setDraft({ title: { ...item.title }, summary: { ...item.summary }, published: item.published });
    setEditLang(lang === 'en' ? 'en' : 'zh');
  }

  function setTitle(value: string) {
    setDraft((d) => ({ ...d, title: editLang === 'zh' ? { ...d.title, zh: value } : { ...d.title, en: value } }));
  }
  function setSummary(value: string) {
    setDraft((d) => ({ ...d, summary: editLang === 'zh' ? { ...d.summary, zh: value } : { ...d.summary, en: value } }));
  }

  async function save() {
    if (!draft.title.zh.trim() && !draft.title.en.trim()) return;
    if (editingId === '') {
      await api.createNews({ title: draft.title, summary: draft.summary, published: draft.published });
      toast(t('newsAdmin.created'));
    } else if (editingId) {
      await api.updateNews(editingId, { title: draft.title, summary: draft.summary, published: draft.published });
      toast(t('newsAdmin.saved'));
    }
    setEditingId(null);
    setDraft(emptyDraft);
    load();
  }

  async function remove(id: string) {
    if (!window.confirm(t('newsAdmin.deleteConfirm'))) return;
    await api.deleteNews(id);
    toast(t('newsAdmin.deleted'));
    load();
  }

  async function togglePublish(item: NewsItem) {
    await api.updateNews(item.id, { published: !item.published });
    load();
  }

  return (
    <div>
      <div className={styles.settingBlock}>
        <div className={styles.settingCaption}>{t('newsAdmin.list')}</div>
        {items.length === 0 ? (
          <div className={styles.hint}>{t('newsAdmin.empty')}</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className={styles.refRow}>
              <span className={styles.refKind}>{item.published ? t('newsAdmin.live') : t('newsAdmin.draft')}</span>
              <span className={styles.kvValue}>{pickText(item.title, lang)}</span>
              <button type="button" className={styles.secondaryButton} onClick={() => void togglePublish(item)}>
                {item.published ? t('newsAdmin.unpublish') : t('newsAdmin.publish')}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => startEdit(item)}>
                {t('common.edit')}
              </button>
              <button type="button" className={styles.dangerButton} onClick={() => void remove(item.id)}>
                {t('common.delete')}
              </button>
            </div>
          ))
        )}
      </div>

      <div className={styles.settingBlock}>
        <div className={styles.settingCaption}>
          {editingId === '' ? t('newsAdmin.new') : editingId ? t('newsAdmin.edit') : t('newsAdmin.create')}
        </div>

        {editingId === null ? (
          <button type="button" className={styles.primaryButton} onClick={startNew}>
            + {t('newsAdmin.new')}
          </button>
        ) : (
          <div>
            <div className={styles.tagForm} style={{ marginBottom: 12 }}>
              <button
                type="button"
                className={editLang === 'zh' ? styles.primaryButton : styles.secondaryButton}
                onClick={() => setEditLang('zh')}
              >
                中文
              </button>
              <button
                type="button"
                className={editLang === 'en' ? styles.primaryButton : styles.secondaryButton}
                onClick={() => setEditLang('en')}
              >
                English
              </button>
            </div>

            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>{t('newsAdmin.title')}</div>
              <input
                className={styles.settingInput}
                value={draft.title[editLang]}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>{t('newsAdmin.summary')}</div>
              <textarea
                className={styles.settingInput}
                rows={2}
                value={draft.summary[editLang]}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            <div className={styles.tagForm}>
              <label className={styles.hint} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(e) => setDraft((d) => ({ ...d, published: e.target.checked }))}
                />
                {t('newsAdmin.published')}
              </label>
              <button type="button" className={styles.primaryButton} onClick={() => void save()}>
                {t('common.save')}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyDraft);
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
