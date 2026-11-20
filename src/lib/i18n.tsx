/**
 * Minimal zero-dependency i18n (D-077): a language context + flat dictionary.
 * Keys are namespaced ('nav.start'); values pair zh/en. `t` interpolates {name}
 * placeholders and falls back to zh then to the key itself.
 */
import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { STRINGS } from './strings.ts';
import { relativeTime } from './format.ts';
import { loadPrefs, savePrefs } from './prefs.ts';

export type Lang = 'zh' | 'en';

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const entry = STRINGS[key];
  let text = entry ? (entry[lang] ?? entry.zh) : key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
    }
  }
  return text;
}

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue>({
  lang: 'zh',
  setLang: () => {},
  t: (key, vars) => translate('zh', key, vars),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => loadPrefs().language);

  const value = useMemo<I18nValue>(() => ({
    lang,
    setLang: (next: Lang) => {
      setLangState(next);
      savePrefs({ ...loadPrefs(), language: next });
    },
    t: (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
  }), [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

/** Convenience: t only (most call sites). */
export function useT(): I18nValue['t'] {
  return useContext(I18nContext).t;
}

/** Language-bound relative time formatter. */
export function useRelativeTime(): (iso: string) => string {
  const { lang } = useContext(I18nContext);
  return (iso: string) => relativeTime(iso, lang);
}
