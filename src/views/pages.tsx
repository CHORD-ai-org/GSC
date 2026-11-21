import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Composer } from '../app/Composer.tsx';
import { NewsPanel } from '../components/NewsPanel.tsx';
import { GscLogo } from '../components/GscLogo.tsx';
import { SectionLabel } from '../components/ui.tsx';
import { BrandLogo } from '../components/BrandLogo.tsx';
import type { BrandKind } from '../components/BrandLogo.tsx';
import { PROVIDERS, detectProvider, isProviderId, providerProfile, type ProviderId, type ProviderProfile } from '../lib/providers.ts';
import { useToast } from '../components/Toast.tsx';
import type { ComposerMode, ModelName, UiPrefs } from '../lib/prefs.ts';
import { ANIMATION_QUALITIES, DENSITIES, QUALITY_LABELS, THEMES } from '../lib/prefs.ts';
import type { AnimationQuality, ThemeMode, DensityMode } from '../lib/prefs.ts';
import { ITEM_GLYPHS, ITEM_LABELS, OBJECT_TYPES, RAW_TYPES } from '../lib/items.ts';
import type { ItemDTO } from '../lib/items.ts';
import type { ContextDTO } from '../lib/contexts.ts';
import { TIME_GROUPS, TIME_GROUP_KEYS, timeGroup } from '../lib/format.ts';
import type { TimeGroup } from '../lib/format.ts';
import { buildActivityDays } from '../lib/activity.ts';
import { ActivityMap } from '../components/ActivityMap.tsx';
import { SemLegend } from '../components/SemTag.tsx';
import type { ReactNode } from 'react';
import { useI18n, useRelativeTime, useT } from '../lib/i18n.tsx';
import { useViewMode, ViewToggle } from '../lib/viewMode.tsx';
import { GridCard } from './collections.tsx';
import { NewsAdmin } from '../components/NewsAdmin.tsx';
import { Glyph } from '../components/Glyph.tsx';
import type { GlyphKind } from '../components/Glyph.tsx';
import type { TagDefinitionDTO } from '../lib/tags.ts';
import type { LlmPublicConfig } from '../services/api.ts';
import * as api from '../services/api.ts';
import styles from './views.module.css';

export type ContextIndexEntry = ContextDTO & { member_ids: string[] };

/* ── Start (the composer home; formerly "Overview") ───────────────────── */

export function StartView({
  onSubmit,
  onCanvas,
  onOpenFile,
  onLightUp,
  llmConfig,
  empty,
  onLoadSample,
}: {
  onSubmit: (payload: { text: string; mode: ComposerMode; model: ModelName; provider: string }) => void | Promise<void>;
  onCanvas: () => void;
  onOpenFile: () => void;
  onLightUp: () => void;
  llmConfig?: LlmPublicConfig | null;
  empty?: boolean;
  onLoadSample?: () => Promise<void>;
}) {
  const t = useT();
  const [sampleBusy, setSampleBusy] = useState(false);
  return (
    <div className={styles.overview}>
      <NewsPanel />
      <GscLogo height={64} className={styles.overviewLogo} />
      {empty ? (
        <h1 className={styles.valueTitle}>{t('start.valueTitle')}</h1>
      ) : null}
      <div className={styles.overviewComposer}>
        <Composer onSubmit={onSubmit} llmConfig={llmConfig} />
      </div>
      {empty && onLoadSample ? (
        <div className={styles.quickActions}>
          <button
            type="button"
            className={styles.quickButton}
            disabled={sampleBusy}
            onClick={async () => {
              setSampleBusy(true);
              try { await onLoadSample(); } finally { setSampleBusy(false); }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3l2 1.5" /></svg>
            {sampleBusy ? t('start.loadingSample') : t('start.seeExample')}
          </button>
          <button type="button" className={styles.quickButton} onClick={() => document.querySelector('textarea')?.focus()}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 13L13 3M6 3h7v7" /></svg>
            {t('start.startNow')}
          </button>
        </div>
      ) : (
        <div className={styles.quickActions}>
          <button type="button" className={styles.quickButton} onClick={onLightUp}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 2.5v7M5 6l3-3.5L11 6" /><path d="M3 10.5v2h10v-2" /></svg>
            Light Up
          </button>
          <button type="button" className={styles.quickButton} onClick={onCanvas}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="3" width="11" height="10" rx="1.5" /><path d="M5 8h6" /></svg>
            {t('start.canvasPreview')}
          </button>
          <button type="button" className={styles.quickButton} onClick={onOpenFile}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 2.5h6l3.5 3.5v7.5H3z" /><path d="M9 2.5V6h3.5" /></svg>
            {t('start.openFile')}
            <span className={styles.quickKey}>Ctrl O</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Overview: entry to the Context Space ─────────────────────────────── */

export function OverviewPage({
  items,
  contexts,
  clusters,
  pendingProposals,
  tagSummary,
  onNew,
  onOpenItem,
  onOpenContext,
  onOpenCluster,
  onOpenQueue,
  onPickDay,
  onSeeAll,
  onResolve,
}: {
  items: ItemDTO[];
  contexts: ContextIndexEntry[];
  clusters: (ContextIndexEntry | { id: string; title: string; description: string; created_at: string; updated_at: string; member_ids: string[] })[];
  pendingProposals: { id: string; kind: string; proposed_value: string; source: string; created_at: string }[];
  tagSummary: { name: string; count: number }[];
  onNew: () => void;
  onOpenItem: (id: string) => void;
  onOpenContext: (id: string) => void;
  onOpenCluster: (id: string) => void;
  onOpenQueue: () => void;
  onPickDay: (day: string) => void;
  onSeeAll: () => void;
  onResolve: (id: string, status: 'accepted' | 'rejected') => Promise<void>;
}) {
  const t = useT();
  const rt = useRelativeTime();
  const [view, setView] = useViewMode('overview');
  const rawCount = items.filter((i) => i.type.startsWith('raw.')).length;
  const objCount = items.filter((i) => i.type.startsWith('object.')).length;
  const recent = useMemo(
    () => [...items].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6),
    [items],
  );
  const recentClusters = useMemo(
    () => [...clusters].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 4),
    [clusters],
  );
  const recentContexts = useMemo(
    () => [...contexts].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 4),
    [contexts],
  );
  const activity = useMemo(() => buildActivityDays(items, pendingProposals), [items, pendingProposals]);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekItems = items.filter((i) => i.created_at >= weekStart.toISOString()).length;
  const weekPending = pendingProposals.length;
  return (
    <div className={styles.page}>
      <div className={styles.headRow}>
        <div>
          <h1 className={styles.pageTitle}>{t('nav.overview')}</h1>
        </div>
        <button type="button" className={styles.primaryButton} onClick={onNew}>+ {t('common.new')}</button>
      </div>

      <div className={styles.statGrid}>
        <button type="button" className={styles.statCard} onClick={onSeeAll}>
          <span className={styles.statNum}>{rawCount}</span>
          <span className={styles.statLabel}>{t('overview.info')}</span>
        </button>
        <button type="button" className={styles.statCard} onClick={onSeeAll}>
          <span className={styles.statNum}>{objCount}</span>
          <span className={styles.statLabel}>{t('overview.objects')}</span>
        </button>
        <button type="button" className={styles.statCard} onClick={() => recentContexts[0] && onOpenContext(recentContexts[0].id)}>
          <span className={styles.statNum}>{contexts.length}</span>
          <span className={styles.statLabel}>{t('nav.contexts')}</span>
        </button>
      </div>

      {/* Review queue: proposal cards with inline ✓/✗ (P3) */}
      {pendingProposals.length > 0 ? (
        <div className={styles.section}>
          <SectionLabel title={t('overview.queue')} count={t('overview.pendingCount', { n: pendingProposals.length })} />
          <div className={styles.proposalGrid}>
            {pendingProposals.slice(0, 3).map((p) => (
              <div key={p.id} className={styles.proposalCard}>
                <div className={styles.proposalMain}>
                  <span className={styles.proposalKind}>{p.kind}</span>
                  <span className={styles.proposalValue}>{p.proposed_value}</span>
                  <span className={styles.proposalMeta}>{p.source === 'detector' ? 'DET' : 'AGT'} · {rt(p.created_at)}</span>
                </div>
                <div className={styles.proposalActions}>
                  <button type="button" className={styles.acceptButton} aria-label="accept" onClick={() => void onResolve(p.id, 'accepted')}>✓</button>
                  <button type="button" className={styles.rejectButton} aria-label="reject" onClick={() => void onResolve(p.id, 'rejected')}>✕</button>
                </div>
              </div>
            ))}
            {pendingProposals.length > 3 ? (
              <button type="button" className={styles.proposalMore} onClick={onOpenQueue}>{t('overview.viewAll')}</button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Recent: the single listRow-style section kept on this page (P3) */}
      <div className={styles.section}>
        <div className={styles.sectionHeadRow}>
          <SectionLabel title={t('overview.recent')} count={`${recent.length}`} />
          <ViewToggle mode={view} onChange={setView} />
        </div>
        {view === 'grid' ? (
          <div className={styles.gridView}>
            {recent.map((item) => (
              <GridCard
                key={item.id}
                glyph={<Glyph kind={item.type} />}
                typeLabel={ITEM_LABELS[item.type]}
                title={item.title}
                time={rt(item.updated_at)}
                onClick={() => onOpenItem(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className={styles.list}>
            {recent.map((item) => (
              <button key={item.id} type="button" className={styles.listRow} onClick={() => onOpenItem(item.id)}>
                <span className={styles.rowGlyph}><Glyph kind={item.type} /></span>
                <span className={styles.rowTitle}>{item.title}</span>
                <span className={styles.rowType}>{ITEM_LABELS[item.type]}</span>
                <span className={styles.rowTime}>{rt(item.updated_at)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clusters + Contexts: badge clouds instead of repeated list rows (P3) */}
      <div className={styles.section}>
        <SectionLabel title={t('overview.clusters')} count={`${clusters.length}`} />
        <div className={styles.badgeCloud}>
          {recentClusters.length === 0 ? (
            <div className={styles.emptyLine}>{t('overview.noClusters')}</div>
          ) : recentClusters.map((c) => (
            <button key={c.id} type="button" className={styles.cloudChip} onClick={() => onOpenCluster(c.id)}>
              <span className={styles.cloudGlyph}>CLU</span>
              {c.title}
              <span className={styles.cloudCount}>{c.member_ids.length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <SectionLabel title={t('overview.activity')} count={t('overview.weekCount', { n: weekItems, m: weekPending })} />
        <SemLegend />
        <div style={{ marginTop: 10 }}>
          <ActivityMap cells={activity} onPickDay={onPickDay} />
        </div>
      </div>

      <div className={styles.section}>
        <SectionLabel title={t('overview.contexts')} count={`${contexts.length}`} />
        <div className={styles.badgeCloud}>
          {recentContexts.length === 0 ? (
            <div className={styles.emptyLine}>{t('overview.noContexts')}</div>
          ) : recentContexts.map((c) => (
            <button key={c.id} type="button" className={styles.cloudChip} onClick={() => onOpenContext(c.id)}>
              <span className={styles.cloudGlyph}>CTX</span>
              {c.title}
              <span className={styles.cloudCount}>{c.member_ids.length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Meta tags: tag cloud (P3) */}
      <div className={styles.section}>
        <SectionLabel title={t('overview.metaTags')} count={t('overview.values', { n: tagSummary.reduce((n, x) => n + x.count, 0) })} />
        <div className={styles.badgeCloud}>
          {tagSummary.length === 0 ? (
            <div className={styles.emptyLine}>{t('overview.noTags')}</div>
          ) : tagSummary.map((entry) => (
            <span key={entry.name} className={`${styles.cloudChip} ${styles.cloudStatic}`}>
              {entry.name}
              <span className={styles.cloudCount}>{entry.count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Recently: time-grouped continuity ────────────────────────────────── */

type RecentKind = 'all' | 'information' | 'objects' | 'contexts';

type RecentRow = {
  key: string;
  title: string;
  tag: string;
  glyph: GlyphKind;
  at: string;
  visited: boolean;
  open: () => void;
};

export function RecentlyPage({
  items,
  contexts,
  visits,
  dayFilter,
  onClearDay,
  onOpenItem,
  onOpenContext,
}: {
  items: ItemDTO[];
  contexts: ContextIndexEntry[];
  visits: Record<string, string | undefined>;
  dayFilter: string;
  onClearDay: () => void;
  onOpenItem: (id: string) => void;
  onOpenContext: (id: string) => void;
}) {
  const t = useT();
  const rt = useRelativeTime();
  const [kind, setKind] = useState<RecentKind>('all');
  const [view, setView] = useViewMode('recently');

  const rows = useMemo(() => {
    const out: RecentRow[] = [];
    for (const item of items) {
      if (kind === 'information' && !item.type.startsWith('raw.')) continue;
      if (kind === 'objects' && !item.type.startsWith('object.')) continue;
      if (kind === 'contexts') continue;
      const visitedAt = visits[item.id];
      const useVisit = Boolean(visitedAt && visitedAt > item.updated_at);
      const at = useVisit ? (visitedAt as string) : item.updated_at;
      if (dayFilter && !at.startsWith(dayFilter) && !item.created_at.startsWith(dayFilter)) continue;
      out.push({
        key: item.id,
        title: item.title,
        tag: ITEM_LABELS[item.type],
        glyph: item.type,
        at,
        visited: useVisit,
        open: () => onOpenItem(item.id),
      });
    }
    if (kind === 'all' || kind === 'contexts') {
      for (const c of contexts) {
        const visitedAt = visits[c.id];
        const useVisit = Boolean(visitedAt && visitedAt > c.updated_at);
        const at = useVisit ? (visitedAt as string) : c.updated_at;
        if (dayFilter && !at.startsWith(dayFilter) && !c.created_at.startsWith(dayFilter)) continue;
        out.push({
          key: c.id,
          title: c.title,
          tag: t('common.context'),
          glyph: 'context' as GlyphKind,
          at,
          visited: useVisit,
          open: () => onOpenContext(c.id),
        });
      }
    }
    return out.sort((a, b) => b.at.localeCompare(a.at));
  }, [items, contexts, visits, kind, dayFilter, onOpenItem, onOpenContext]);

  const grouped = useMemo(() => {
    const map = new Map<TimeGroup, RecentRow[]>();
    for (const row of rows) {
      const g = timeGroup(row.at);
      const list = map.get(g) ?? [];
      list.push(row);
      map.set(g, list);
    }
    return map;
  }, [rows]);

  const tabs: { id: RecentKind; labelKey: string }[] = [
    { id: 'all', labelKey: 'recently.all' },
    { id: 'information', labelKey: 'recently.information' },
    { id: 'objects', labelKey: 'recently.objects' },
    { id: 'contexts', labelKey: 'recently.contexts' },
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>{t('nav.recently')}</h1>

      {dayFilter ? (
        <div className={styles.tabRow}>
          <span className={styles.rowType}>{t('recently.dayFilter', { day: dayFilter })}</span>
          <button type="button" className={styles.tab} onClick={onClearDay}>{t('recently.clear')}</button>
        </div>
      ) : null}

      <div className={styles.tabRow}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${kind === tab.id ? styles.on : ''}`}
            onClick={() => setKind(tab.id)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <ViewToggle mode={view} onChange={setView} />
      </div>

      {rows.length === 0 ? (
        <div className={styles.emptyLine}>{t('recently.empty')}</div>
      ) : view === 'grid' ? (
        TIME_GROUPS.filter((g) => grouped.has(g)).map((g) => (
          <div className={styles.section} key={g}>
            <SectionLabel title={t(TIME_GROUP_KEYS[g])} count={`${grouped.get(g)!.length}`} />
            <div className={styles.gridView}>
              {grouped.get(g)!.map((row) => (
                <GridCard
                  key={row.key}
                  glyph={<Glyph kind={row.glyph} />}
                  typeLabel={row.tag}
                  title={row.title}
                  time={`${row.visited ? t('recently.visited') : t('recently.modified')} · ${rt(row.at)}`}
                  onClick={row.open}
                />
              ))}
            </div>
          </div>
        ))
      ) : TIME_GROUPS.filter((g) => grouped.has(g)).map((g) => (
        <div className={styles.section} key={g}>
          <SectionLabel title={t(TIME_GROUP_KEYS[g])} count={`${grouped.get(g)!.length}`} />
          <div className={styles.list}>
            {grouped.get(g)!.map((row, ri, arr) => {
              const sameTime = ri > 0 && rt(arr[ri - 1].at) === rt(row.at);
              return (
                <button key={row.key} type="button" className={styles.listRow} onClick={row.open}>
                  <span className={styles.rowGlyph}><Glyph kind={row.glyph} /></span>
                  <span className={styles.rowTitle}>{row.title}</span>
                  <span className={styles.rowType}>{row.tag}</span>
                  <span className={styles.rowTime}>{row.visited ? t('recently.visited') : t('recently.modified')}{sameTime ? '' : ` · ${rt(row.at)}`}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Settings: secondary navigation ───────────────────────────────────── */

/* T301 — Token / Agent access management (GAP-04): see, create, revoke PATs. */
function TokenSection() {
  const t = useT();
  const [tokens, setTokens] = useState<api.TokenSummary[]>([]);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'read' | 'rw'>('rw');
  const [fresh, setFresh] = useState('');
  const load = useCallback(() => {
    void api.listTokens().then((r) => setTokens(r.tokens)).catch(() => setTokens([]));
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className={styles.settingBlock}>
      <div className={styles.settingCaption}>{t('settings.tokens')}</div>
      <div className={styles.addRow}>
        <input className={styles.settingInput} placeholder={t('settings.tokenName')} value={name} onChange={(e) => setName(e.target.value)} />
        <select className={styles.select} value={scope} onChange={(e) => setScope(e.target.value as 'read' | 'rw')}>
          <option value="rw">rw</option>
          <option value="read">read</option>
        </select>
        <button type="button" className={styles.primaryButton} onClick={() => {
          if (!name.trim()) return;
          void api.createToken(name.trim(), scope).then((r) => { setFresh(r.token); setName(''); load(); });
        }}>{t('settings.tokenCreate')}</button>
      </div>
      {fresh ? <div className={styles.settingValue}>{t('settings.tokenCreated')} <code>{fresh}</code></div> : null}
      {tokens.length === 0 ? <div className={styles.hint}>{t('settings.tokenEmpty')}</div> : (
        <div className={styles.list}>
          {tokens.map((tok) => (
            <div className={styles.listRow} key={tok.id}>
              <span className={styles.rowTitle}>{tok.name}</span>
              <span className={styles.rowType}>{tok.scope} · {tok.userId}</span>
              <span className={styles.rowTime}>{tok.created_at ? tok.created_at.slice(0, 10) : '—'}</span>
              <button type="button" className={styles.removeButton} onClick={() => { void api.revokeToken(tok.id).then(load); }}>{t('settings.tokenRevoke')}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type SettingsSection = 'general' | 'account' | 'data' | 'connections' | 'model' | 'tags' | 'news' | 'privacy';

const SETTINGS_NAV: { id: SettingsSection; labelKey: string }[] = [
  { id: 'general', labelKey: 'settings.general' },
  { id: 'account', labelKey: 'settings.account' },
  { id: 'data', labelKey: 'settings.data' },
  { id: 'connections', labelKey: 'settings.connections' },
  { id: 'model', labelKey: 'settings.model' },
  { id: 'tags', labelKey: 'settings.tags' },
  { id: 'news', labelKey: 'settings.news' },
  { id: 'privacy', labelKey: 'settings.privacy' },
];

/* T203 trash panel (Settings → 数据) */
function TrashPanel() {
  const t = useT();
  const toast = useToast();
  const [items, setItems] = useState<ItemDTO[]>([]);
  const load = useCallback(() => {
    void api.listTrash().then((r) => setItems(r.items)).catch(() => setItems([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className={styles.settingBlock}>
      <div className={styles.settingCaption}>{t('trash.title')}</div>
      {items.length === 0 ? (
        <div className={styles.hint}>{t('trash.empty')}</div>
      ) : items.map((item) => (
        <div key={item.id} className={styles.refRow}>
          <span className={styles.refKind}>{ITEM_LABELS[item.type]}</span>
          <span className={styles.kvValue}>{item.title}</span>
          <button type="button" className={styles.secondaryButton} onClick={() => {
            void api.restoreItem(item.id).then(() => { toast(t('trash.restored')); load(); });
          }}>{t('trash.restore')}</button>
          <button type="button" className={styles.dangerButton} onClick={() => {
            if (window.confirm(t('trash.purgeConfirm'))) {
              void api.purgeItem(item.id).then(() => { toast(t('trash.purged')); load(); });
            }
          }}>{t('trash.purge')}</button>
        </div>
      ))}
    </div>
  );
}

export function SettingsPage({
  prefs,
  onChange,
  itemCount,
  contextCount,
  onExportJson,
  onExportMarkdown,
  onExportAgent,
  onManageData,
  onReplayOnboarding,
  onClearAll,
  tagDefinitions,
  onCreateTagDefinition,
  profileBlock,
  llmConfig,
  onSaveLlm,
  onCheckLlm,
}: {
  prefs: UiPrefs;
  onChange: (next: UiPrefs) => void;
  itemCount: number;
  contextCount: number;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onExportAgent: () => void;
  onManageData: () => void;
  onReplayOnboarding?: () => void;
  onClearAll?: () => Promise<void>;
  tagDefinitions: TagDefinitionDTO[];
  onCreateTagDefinition: (name: string, description: string) => Promise<void>;
  profileBlock?: ReactNode;
  llmConfig?: LlmPublicConfig | null;
  onSaveLlm: (patch: { provider?: string; base_url?: string; model?: string; api_key?: string }) => Promise<void>;
  onCheckLlm: () => Promise<{ model: string; ms: number; reply: string }>;
}) {
  const { lang, setLang, t } = useI18n();
  const toast = useToast();
  const [section, setSection] = useState<SettingsSection>('general');
  const [newTagName, setNewTagName] = useState('');
  const [newTagDesc, setNewTagDesc] = useState('');
  const saveTimer = useRef<number | undefined>(undefined);

  /* debounced "已保存" toast — every prefs change saves instantly already (P2) */
  function changePrefs(next: UiPrefs) {
    onChange(next);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => toast(t('common.savedToast')), 600);
  }

  return (
    <div className={styles.settingsLayout}>
      <nav className={styles.settingsNav}>
        {SETTINGS_NAV.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`${styles.settingsNavItem} ${section === s.id ? styles.on : ''}`}
            onClick={() => setSection(s.id)}
          >
            {t(s.labelKey)}
          </button>
        ))}
      </nav>
      <div className={styles.settingsContent}>
        {section === 'general' ? (
          <>
            <h1 className={styles.pageTitle}>{t('settings.general')}</h1>
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>{t('settings.workspaceName')}</div>
              <input
                className={styles.settingInput}
                value={prefs.workspaceName}
                onChange={(e) => changePrefs({ ...prefs, workspaceName: e.target.value })}
              />
            </div>
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>{t('settings.language')}</div>
              <select className={styles.settingInput} value={lang} onChange={(e) => setLang(e.target.value === 'en' ? 'en' : 'zh')}>
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>{t('settings.interface')}</div>
              <div className={styles.settingRow}>
                <div className={styles.settingLabel}>{t('settings.theme')}</div>
                <div className={styles.qualityRow}>
                  {THEMES.map((t: ThemeMode) => (
                    <button
                      key={t}
                      type="button"
                      className={`${styles.qualityPill} ${prefs.theme === t ? styles.on : ''}`}
                      onClick={() => changePrefs({ ...prefs, theme: t })}
                    >
                      {t === 'dark' ? 'Dark' : 'Light'}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.settingRow}>
                <div className={styles.settingLabel}>{t('settings.density')}</div>
                <div className={styles.qualityRow}>
                  {DENSITIES.map((d: DensityMode) => (
                    <button
                      key={d}
                      type="button"
                      className={`${styles.qualityPill} ${prefs.density === d ? styles.on : ''}`}
                      onClick={() => changePrefs({ ...prefs, density: d })}
                    >
                      {t(d === 'compact' ? 'settings.densityCompact' : 'settings.densityComfortable')}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.settingRow}>
                <div className={styles.settingLabel}>{t('settings.animQuality')}</div>
                <div className={styles.qualityRow}>
                  {ANIMATION_QUALITIES.map((q: AnimationQuality) => (
                    <button
                      key={q}
                      type="button"
                      className={`${styles.qualityPill} ${prefs.quality === q ? styles.on : ''}`}
                      onClick={() => changePrefs({ ...prefs, quality: q })}
                    >
                      {QUALITY_LABELS[q]}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.settingRow}>
                <div className={styles.settingLabel}>{t('settings.pageTransition')}</div>
                <div className={styles.qualityRow}>
                  {([true, false] as const).map((on) => (
                    <button
                      key={String(on)}
                      type="button"
                      className={`${styles.qualityPill} ${prefs.pageTransition === on ? styles.on : ''}`}
                      onClick={() => changePrefs({ ...prefs, pageTransition: on })}
                    >
                      {on ? t('common.on') : t('common.off')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>{t('settings.data2')}</div>
              <button type="button" className={styles.secondaryButton} onClick={onManageData}>{t('settings.manageData')}</button>
              {onReplayOnboarding ? (
                <button type="button" className={styles.secondaryButton} style={{ marginLeft: 8 }} onClick={onReplayOnboarding}>{t('ob.replay')}</button>
              ) : null}
              {onClearAll ? (
                <button
                  type="button"
                  className={styles.dangerButton}
                  style={{ marginLeft: 8 }}
                  onClick={() => {
                    if (window.confirm(t('ob.clearConfirm'))) void onClearAll();
                  }}
                >
                  {t('ob.clearAll')}
                </button>
              ) : null}
            </div>
          </>
        ) : section === 'account' ? (
          <>
            <h1 className={styles.pageTitle}>{t('settings.account')}</h1>
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>{t('settings.workspace')}</div>
              <div className={styles.settingValue}>{prefs.workspaceName}</div>
            </div>
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>{t('settings.provider')}</div>
              <div className={styles.settingValue}>{t('settings.providerLine', { provider: prefs.provider, model: prefs.defaultModel })}</div>
            </div>
          </>
        ) : section === 'data' ? (
          <>
            <h1 className={styles.pageTitle}>{t('settings.data')}</h1>
            <div className={styles.countLine}>items: {itemCount} · contexts: {contextCount}</div>
            <div className={styles.exportGrid}>
              <div className={styles.exportCard}>
                <strong>{t('settings.exportFull')}</strong>
                <span className={styles.exportName}>gsc-export.json</span>
                <button type="button" className={styles.downloadButton} onClick={onExportJson}>{t('common.download')}</button>
              </div>
              <div className={styles.exportCard}>
                <strong>{t('settings.exportMd')}</strong>
                <span className={styles.exportName}>gsc-bundle.md</span>
                <button type="button" className={styles.downloadButton} onClick={onExportMarkdown}>{t('common.download')}</button>
              </div>
              <div className={styles.exportCard}>
                <strong>{t('settings.exportAgent')}</strong>
                <span className={styles.exportName}>GSC-CONTEXT.md</span>
                <button type="button" className={styles.downloadButton} onClick={onExportAgent}>{t('common.download')}</button>
              </div>
            </div>
            <TrashPanel />
          </>
        ) : section === 'connections' ? (
          <>
            <h1 className={styles.pageTitle}>{t('settings.connections')}</h1>
            <TokenSection />
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>CLAUDE CODE / CODEX</div>
              <div className={styles.settingValue}>{t('settings.connClaude')}</div>
            </div>
          </>
        ) : section === 'model' ? (
          <ModelSection llmConfig={llmConfig} onSave={onSaveLlm} onCheck={onCheckLlm} />
        ) : section === 'tags' ? (
          <>
            <h1 className={styles.pageTitle}>{t('settings.tags')}</h1>
            {tagDefinitions.map((d) => (
              <div className={styles.settingBlock} key={d.id}>
                <div className={styles.settingCaption}>{d.name.toUpperCase()}</div>
                <div className={styles.settingValue}>{d.description || t('settings.noDesc')}</div>
              </div>
            ))}
            {profileBlock ? (
              <div className={styles.settingBlock}>
                <div className={styles.settingCaption}>USER PROFILE</div>
                <div className={styles.settingValue}>{t('settings.userProfile')}</div>
                {profileBlock}
              </div>
            ) : null}
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>{t('settings.newDimension')}</div>
              <div className={styles.tagForm}>
                <input
                  className={styles.search}
                  placeholder={t('settings.dimName')}
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
                <input
                  className={styles.search}
                  placeholder={t('settings.dimDesc')}
                  value={newTagDesc}
                  onChange={(e) => setNewTagDesc(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={!newTagName.trim()}
                  onClick={() => {
                    const name = newTagName.trim();
                    if (!name) return;
                    setNewTagName('');
                    setNewTagDesc('');
                    void onCreateTagDefinition(name, newTagDesc.trim());
                  }}
                >
                  {t('settings.addDimension')}
                </button>
              </div>
            </div>
          </>
        ) : section === 'news' ? (
          <>
            <h1 className={styles.pageTitle}>{t('settings.news')}</h1>
            <NewsAdmin />
          </>
        ) : (
          <>
            <h1 className={styles.pageTitle}>{t('settings.privacy')}</h1>
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>{t('settings.storage')}</div>
              <div className={styles.settingValue}>{t('settings.storageValue')}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Settings → Model. "Different providers require different things": the picked
 * provider drives its own endpoint, model presets, per-provider key slot, key
 * format hint and auth note. Base URL is editable for every provider so regional
 * or proxy endpoints work; each provider keeps its own API key.
 */
function ModelSection({
  llmConfig,
  onSave,
  onCheck,
}: {
  llmConfig?: LlmPublicConfig | null;
  onSave: (patch: { provider?: string; base_url?: string; model?: string; api_key?: string }) => Promise<void>;
  onCheck: () => Promise<{ model: string; ms: number; reply: string }>;
}) {
  const t = useT();
  const toast = useToast();
  const [provider, setProvider] = useState<ProviderId>(() =>
    isProviderId(llmConfig?.provider) ? (llmConfig!.provider as ProviderId) : detectProvider(llmConfig?.base_url ?? ''),
  );
  const profile = providerProfile(provider);
  const [baseUrl, setBaseUrl] = useState(llmConfig?.base_url ?? '');
  const [model, setModel] = useState(llmConfig?.model ?? '');
  const [apiKey, setApiKey] = useState('');
  const [keyOpen, setKeyOpen] = useState(false);
  const [keySet, setKeySet] = useState(Boolean(llmConfig?.key_set));
  const [keyHint, setKeyHint] = useState(llmConfig?.key_hint ?? '');
  const [checking, setChecking] = useState(false);
  const [checkLine, setCheckLine] = useState('');
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);

  /* llmConfig refreshes after every save — keep per-provider key status in sync */
  useEffect(() => {
    if (!llmConfig) return;
    setKeySet(llmConfig.key_set);
    setKeyHint(llmConfig.key_hint);
  }, [llmConfig]);

  /* debounced auto-save — no Save button (P2 INTERACTION_UX_PLAN) */
  function queueSave(patch: { provider?: string; base_url?: string; model?: string; api_key?: string }) {
    setDirty(true);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await onSave(patch);
        setDirty(false);
        toast(t('common.savedToast'));
      } catch (e) {
        setDirty(false);
        toast(e instanceof Error ? e.message : t('model.saveFailed'), 'error');
      }
    }, 700);
  }

  function pickProvider(p: ProviderProfile) {
    setProvider(p.id);
    setKeyOpen(false);
    // The new provider has its own key slot; status refreshes from the save response.
    setKeySet(false);
    setKeyHint('');
    const nextBase = p.id === 'custom' ? '' : p.defaultBase;
    setBaseUrl(nextBase);
    const firstModel = p.models[0] ?? '';
    setModel(firstModel);
    queueSave({ provider: p.id, base_url: nextBase || undefined, model: firstModel || undefined });
  }

  async function check() {
    setChecking(true);
    setCheckLine('');
    try {
      const r = await onCheck();
      setCheckLine(t('model.checkOk', { model: r.model, ms: r.ms, reply: r.reply }));
    } catch (e) {
      setCheckLine(e instanceof Error ? `✗ ${e.message}` : t('model.checkFail'));
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <h1 className={styles.pageTitle}>{t('settings.model')}</h1>

      <div className={styles.settingBlock}>
        <div className={styles.settingCaption}>{t('model.providerPick')}</div>
        <div className={styles.providerRow}>
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`${styles.providerCard} ${provider === p.id ? styles.on : ''}`}
              onClick={() => pickProvider(p)}
            >
              {p.brand ? <BrandLogo kind={p.brand} size={22} /> : <span className={styles.providerGlyph}>⚙</span>}
              <span className={styles.providerName}>{t(p.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.settingBlock}>
        <div className={styles.settingCaption}>{t('model.baseUrl')}</div>
        <div className={styles.keyRow}>
          <input
            className={styles.settingInput}
            value={baseUrl}
            placeholder={profile.defaultBase || t('model.customBaseHint')}
            onChange={(e) => { setBaseUrl(e.target.value); queueSave({ base_url: e.target.value }); }}
          />
          {profile.defaultBase && baseUrl !== profile.defaultBase ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => { setBaseUrl(profile.defaultBase); queueSave({ base_url: profile.defaultBase }); }}
            >
              {t('model.resetBase')}
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.settingBlock}>
        <div className={styles.settingCaption}>{t('model.model')}</div>
        <input
          className={styles.settingInput}
          value={model}
          placeholder={profile.models[0] ?? ''}
          onChange={(e) => { setModel(e.target.value); queueSave({ model: e.target.value }); }}
        />
        {profile.models.length > 0 ? (
          <div className={styles.modelChipRow}>
            {profile.models.map((m) => (
              <button
                key={m}
                type="button"
                className={`${styles.modelChip} ${model === m ? styles.on : ''}`}
                onClick={() => { setModel(m); queueSave({ model: m }); }}
              >
                {m}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.settingBlock}>
        <div className={styles.settingCaption}>{t('model.apiKey')}</div>
        {keySet && !keyOpen ? (
          <div className={styles.keyRow}>
            <span className={styles.keyBadge}>🔑 {t('model.keySetShort', { hint: keyHint })}</span>
            <button type="button" className={styles.secondaryButton} onClick={() => setKeyOpen(true)}>{t('model.changeKey')}</button>
          </div>
        ) : (
          <input
            className={styles.settingInput}
            type="password"
            value={apiKey}
            placeholder={keySet ? t('model.keySet', { hint: keyHint }) : t('model.keyPlaceholder')}
            onChange={(e) => setApiKey(e.target.value)}
            onBlur={() => {
              if (apiKey.trim()) {
                queueSave({ api_key: apiKey.trim() });
                setApiKey('');
                setKeyOpen(false);
              }
            }}
            autoComplete="off"
          />
        )}
        <div className={styles.settingValue}>
          {profile.keyExample ? t('model.keyFormat', { fmt: profile.keyExample }) : null}
          {profile.consoleUrl ? (
            <>
              {profile.keyExample ? ' · ' : ''}
              <a className={styles.plainLink} href={profile.consoleUrl} target="_blank" rel="noreferrer">{t('model.getKey')}</a>
            </>
          ) : null}
        </div>
      </div>

      {profile.noteKey ? <div className={styles.settingValue}>{t(profile.noteKey)}</div> : null}

      <div className={styles.settingRow}>
        <button type="button" className={styles.secondaryButton} disabled={checking} onClick={() => void check()}>
          {checking ? t('model.testing') : t('model.test')}
        </button>
        {dirty ? <span className={styles.settingValue}>…</span> : null}
      </div>
      {checkLine ? (
        <div className={`${styles.checkLine} ${checkLine.startsWith('✓') ? styles.checkOk : styles.checkFail}`}>{checkLine}</div>
      ) : null}
    </>
  );
}

/* ── User page: account card + preferences + User Profile (左下角 user 入口) ── */

export function UserView({
  prefs,
  onChange,
  llmConfig,
  profileBlock,
  itemCount,
  contextCount,
  onOpenSettings,
  account,
  onExportBackup,
  onDeleteAccount,
}: {
  prefs: UiPrefs;
  onChange: (next: UiPrefs) => void;
  llmConfig?: LlmPublicConfig | null;
  profileBlock?: ReactNode;
  itemCount: number;
  contextCount: number;
  onOpenSettings: () => void;
  account?: { id: string; name: string; created_at: string } | null;
  onExportBackup?: () => void;
  onDeleteAccount?: () => Promise<void>;
}) {
  const t = useT();
  const toast = useToast();
  const { lang, setLang } = useI18n();
  const initial = ((account?.name ?? prefs.workspaceName).trim()[0] ?? 'G').toUpperCase();

  return (
    <div className={styles.page}>
      <div className={styles.userHero}>
        <span className={styles.userHeroAvatar} aria-hidden="true">{initial}</span>
        <div>
          <h1 className={styles.pageTitle}>{prefs.workspaceName}</h1>
        </div>
      </div>

      <div className={styles.section}>
        <SectionLabel title={t('user.account')} />
        {account ? (
          <div className={styles.settingBlock}>
            <div className={styles.settingCaption}>{t('acc.card')}</div>
            <div className={styles.settingValue}>{account.name} · {t('acc.createdAt', { date: account.created_at.slice(0, 10) })} · {t('acc.localAccount')}</div>
            {onDeleteAccount ? (
              <button
                type="button"
                className={styles.dangerButton}
                style={{ marginTop: 10 }}
                onClick={() => {
                  if (!window.confirm(t('acc.deleteConfirm1'))) return;
                  onExportBackup?.();
                  if (window.confirm(t('acc.deleteConfirm2'))) {
                    void onDeleteAccount().then(() => toast(t('acc.deleted')));
                  }
                }}
              >
                {t('acc.deleteAccount')}
              </button>
            ) : null}
          </div>
        ) : null}
        <div className={styles.userCardGrid}>
          <div className={styles.settingBlock}>
            <div className={styles.settingCaption}>{t('user.workspace')}</div>
            <input
              className={styles.settingInput}
              value={prefs.workspaceName}
              onChange={(e) => onChange({ ...prefs, workspaceName: e.target.value })}
            />
          </div>
          <div className={styles.settingBlock}>
            <div className={styles.settingCaption}>{t('settings.provider')}</div>
            <div className={styles.settingValue}>
              {llmConfig?.model
                ? t('user.modelLine', { model: llmConfig.model, base: llmConfig.base_url })
                : t('model.keyMissing')}
            </div>
          </div>
          <div className={styles.settingBlock}>
            <div className={styles.settingCaption}>{t('user.storage')}</div>
            <div className={styles.settingValue}>{t('user.storageValue')}</div>
            <div className={styles.hint} style={{ marginTop: 6 }}>items: {itemCount} · contexts: {contextCount}</div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <SectionLabel title={t('user.preferences')} />
        <div className={styles.settingRow}>
          <div className={styles.settingLabel}>{t('settings.theme')}</div>
          <div className={styles.qualityRow}>
            {THEMES.map((m: ThemeMode) => (
              <button
                key={m}
                type="button"
                className={`${styles.qualityPill} ${prefs.theme === m ? styles.on : ''}`}
                onClick={() => onChange({ ...prefs, theme: m })}
              >
                {m === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.settingRow}>
          <div className={styles.settingLabel}>{t('settings.language')}</div>
          <div className={styles.qualityRow}>
            {(['zh', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                className={`${styles.qualityPill} ${lang === l ? styles.on : ''}`}
                onClick={() => setLang(l)}
              >
                {l === 'zh' ? '中文' : 'English'}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.settingRow}>
          <button type="button" className={styles.secondaryButton} onClick={onOpenSettings}>{t('user.openSettings')}</button>
        </div>
      </div>

      {profileBlock ? (
        <div className={styles.section}>
          <SectionLabel title={t('user.profile')} />
          {profileBlock}
        </div>
      ) : null}
    </div>
  );
}

export const OBJECT_TAB_TYPES = OBJECT_TYPES;
export const RAW_TAB_TYPES = RAW_TYPES;
