/**
 * Start-page news feed. Entries are curated product news (real events) —
 * an external feed source can replace or extend this list later.
 */

export type NewsItem = {
  id: string;
  date: string; // ISO date
  title: { zh: string; en: string };
  summary: { zh: string; en: string };
};

export const NEWS: NewsItem[] = [
  {
    id: 'n-mimo',
    date: '2026-11-20',
    title: { zh: 'MiMo 模型接入完成', en: 'MiMo model integration complete' },
    summary: {
      zh: 'Agent 语义命名现已由小米 MiMo 驱动，可在 设置 → 模型 配置与测试连通。',
      en: 'Agent semantic naming now runs on Xiaomi MiMo — configure and test it in Settings → Model.',
    },
  },
  {
    id: 'n-lightup',
    date: '2026-11-20',
    title: { zh: 'Light Up 体验重设计上线', en: 'Light Up experience redesign shipped' },
    summary: {
      zh: '捕获 → 理解 → 塑造 → 策展 → 点亮：语义对象表与原文高亮联动。',
      en: 'Capture → Understand → Shape → Curate → Illuminate, with Semantic Object Sheets and source highlighting.',
    },
  },
  {
    id: 'n-i18n',
    date: '2026-11-20',
    title: { zh: '中英双语切换', en: 'Chinese / English language switch' },
    summary: {
      zh: 'Settings → 通用 → 语言 即时切换，全站文案已覆盖。',
      en: 'Switch instantly in Settings → General → Language; the whole UI is covered.',
    },
  },
  {
    id: 'n-hardening',
    date: '2026-11-20',
    title: { zh: '后端加固：幂等与备份恢复', en: 'Backend hardening: idempotency & backup' },
    summary: {
      zh: '重复提交不再产生重复条目；db:backup / db:restore 恢复演练通过。',
      en: 'Duplicate submissions no longer create duplicates; db:backup / db:restore verified by drill.',
    },
  },
  {
    id: 'n-dark',
    date: '2026-11-19',
    title: { zh: '深色模式与官方 Logo', en: 'Dark mode & official logo' },
    summary: {
      zh: '双主题全站适配，官方 GSC 标识已矢量化接入。',
      en: 'Full dual-theme support; the official GSC mark is now vectorized in-product.',
    },
  },
];
