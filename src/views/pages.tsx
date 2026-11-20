import { useMemo, useState } from 'react';
import { Composer } from '../app/Composer.tsx';
import { GscLogo } from '../components/GscLogo.tsx';
import { SectionLabel } from '../components/ui.tsx';
import type { ComposerMode, ModelName, UiPrefs } from '../lib/prefs.ts';
import { ANIMATION_QUALITIES, QUALITY_LABELS, THEMES } from '../lib/prefs.ts';
import type { AnimationQuality, ThemeMode } from '../lib/prefs.ts';
import { ITEM_GLYPHS, ITEM_LABELS, OBJECT_TYPES, RAW_TYPES } from '../lib/items.ts';
import type { ItemDTO } from '../lib/items.ts';
import type { ContextDTO } from '../lib/contexts.ts';
import { TIME_GROUPS, relativeTime, timeGroup } from '../lib/format.ts';
import type { TimeGroup } from '../lib/format.ts';
import { buildActivityDays } from '../lib/activity.ts';
import { ActivityMap } from '../components/ActivityMap.tsx';
import { SemLegend } from '../components/SemTag.tsx';
import type { ReactNode } from 'react';
import type { TagDefinitionDTO } from '../lib/tags.ts';
import styles from './views.module.css';

export type ContextIndexEntry = ContextDTO & { member_ids: string[] };

/* ── Start (the composer home; formerly "Overview") ───────────────────── */

export function StartView({
  onSubmit,
  onCanvas,
  onOpenFile,
  onLightUp,
}: {
  onSubmit: (payload: { text: string; mode: ComposerMode; model: ModelName; provider: string }) => void | Promise<void>;
  onCanvas: () => void;
  onOpenFile: () => void;
  onLightUp: () => void;
}) {
  return (
    <div className={styles.overview}>
      <GscLogo height={64} className={styles.overviewLogo} />
      <p className={styles.overviewQuestion}>下一步我们添加什么？</p>
      <div className={styles.overviewComposer}>
        <Composer onSubmit={onSubmit} />
      </div>
      <div className={styles.quickActions}>
        <button type="button" className={styles.quickButton} onClick={onLightUp}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 2.5v7M5 6l3-3.5L11 6" /><path d="M3 10.5v2h10v-2" /></svg>
          Light Up
        </button>
        <button type="button" className={styles.quickButton} onClick={onCanvas}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="3" width="11" height="10" rx="1.5" /><path d="M5 8h6" /></svg>
          画布预览
        </button>
        <button type="button" className={styles.quickButton} onClick={onOpenFile}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 2.5h6l3.5 3.5v7.5H3z" /><path d="M9 2.5V6h3.5" /></svg>
          打开文件...
          <span className={styles.quickKey}>Ctrl O</span>
        </button>
      </div>
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
}) {
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
          <h1 className={styles.pageTitle}>Overview</h1>
          <p className={styles.pageSub}>An overview of your Context Space.</p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={onNew}>+ New</button>
      </div>

      <div className={styles.statGrid}>
        <button type="button" className={styles.statCard} onClick={onSeeAll}>
          <span className={styles.statNum}>{rawCount}</span>
          <span className={styles.statLabel}>Information</span>
        </button>
        <button type="button" className={styles.statCard} onClick={onSeeAll}>
          <span className={styles.statNum}>{objCount}</span>
          <span className={styles.statLabel}>Objects</span>
        </button>
        <button type="button" className={styles.statCard} onClick={() => recentContexts[0] && onOpenContext(recentContexts[0].id)}>
          <span className={styles.statNum}>{contexts.length}</span>
          <span className={styles.statLabel}>Contexts</span>
        </button>
      </div>

      <div className={styles.section}>
        <SectionLabel title="Recently Updated" count={`${recent.length}`} />
        <div className={styles.list}>
          {recent.map((item) => (
            <button key={item.id} type="button" className={styles.listRow} onClick={() => onOpenItem(item.id)}>
              <span className={styles.rowGlyph}>{ITEM_GLYPHS[item.type]}</span>
              <span className={styles.rowTitle}>{item.title}</span>
              <span className={styles.rowType}>{ITEM_LABELS[item.type]}</span>
              <span className={styles.rowTime}>{relativeTime(item.updated_at)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <SectionLabel title="Existing Clusters" count={`${clusters.length}`} />
        <div className={styles.list}>
          {recentClusters.length === 0 ? (
            <div className={styles.emptyLine}>No clusters yet. Group related Chunks from Clusters.</div>
          ) : recentClusters.map((c) => (
            <button key={c.id} type="button" className={styles.listRow} onClick={() => onOpenCluster(c.id)}>
              <span className={styles.rowGlyph}>CLU</span>
              <span className={styles.rowTitle}>{c.title}</span>
              <span className={styles.rowType}>{c.member_ids.length} members</span>
              <span className={styles.rowTime}>{relativeTime(c.updated_at)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <SectionLabel title="Organization Activity" count={`本周新增 ${weekItems} 条 · ${weekPending} 条待审`} />
        <SemLegend />
        <div style={{ marginTop: 10 }}>
          <ActivityMap cells={activity} onPickDay={onPickDay} />
        </div>
      </div>

      <div className={styles.section}>
        <SectionLabel title="Review Queue" count={`${pendingProposals.length} pending`} />
        <div className={styles.list}>
          {pendingProposals.length === 0 ? (
            <div className={styles.emptyLine}>没有待审提案。</div>
          ) : pendingProposals.slice(0, 3).map((p) => (
            <button key={p.id} type="button" className={styles.listRow} onClick={onOpenQueue}>
              <span className={styles.rowGlyph}>{p.source === 'detector' ? 'DET' : 'AGT'}</span>
              <span className={styles.rowTitle}>{p.proposed_value}</span>
              <span className={styles.rowType}>{p.kind}</span>
              <span className={styles.rowTime}>待审</span>
            </button>
          ))}
          {pendingProposals.length > 3 ? (
            <button type="button" className={styles.listRow} onClick={onOpenQueue}>
              <span className={styles.rowGlyph}>···</span>
              <span className={styles.rowTitle}>查看全部提案</span>
              <span className={styles.rowType}></span>
              <span className={styles.rowTime}></span>
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.section}>
        <SectionLabel title="Your Contexts" count={`${contexts.length}`} />
        <div className={styles.list}>
          {recentContexts.length === 0 ? (
            <div className={styles.emptyLine}>No contexts yet. Create one from Contexts.</div>
          ) : recentContexts.map((c) => (
            <button key={c.id} type="button" className={styles.listRow} onClick={() => onOpenContext(c.id)}>
              <span className={styles.rowGlyph}>CTX</span>
              <span className={styles.rowTitle}>{c.title}</span>
              <span className={styles.rowType}>{c.member_ids.length} members</span>
              <span className={styles.rowTime}>{relativeTime(c.updated_at)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <SectionLabel title="Meta Tags" count={`${tagSummary.reduce((n, t) => n + t.count, 0)} values`} />
        <div className={styles.list}>
          {tagSummary.length === 0 ? (
            <div className={styles.emptyLine}>No tag values yet. Tag dimensions live in Settings → Meta Tags.</div>
          ) : tagSummary.map((t) => (
            <div key={t.name} className={styles.refRow}>
              <span className={styles.refKind}>dimension</span>
              <span className={styles.kvValue}>{t.name}</span>
              <span className={styles.rowTime}>{t.count} values</span>
            </div>
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
  glyph: string;
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
  const [kind, setKind] = useState<RecentKind>('all');

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
        glyph: ITEM_GLYPHS[item.type],
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
          tag: 'Context',
          glyph: 'CTX',
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

  const tabs: { id: RecentKind; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'information', label: 'Information' },
    { id: 'objects', label: 'Objects' },
    { id: 'contexts', label: 'Contexts' },
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Recently</h1>
      <p className={styles.pageSub}>Return to information you've recently worked with.</p>

      {dayFilter ? (
        <div className={styles.tabRow}>
          <span className={styles.rowType}>筛选日期 {dayFilter}</span>
          <button type="button" className={styles.tab} onClick={onClearDay}>清除 ×</button>
        </div>
      ) : null}

      <div className={styles.tabRow}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.tab} ${kind === t.id ? styles.on : ''}`}
            onClick={() => setKind(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className={styles.emptyLine}>Nothing recent yet. Open an item and it will appear here.</div>
      ) : TIME_GROUPS.filter((g) => grouped.has(g)).map((g) => (
        <div className={styles.section} key={g}>
          <SectionLabel title={g} count={`${grouped.get(g)!.length}`} />
          <div className={styles.list}>
            {grouped.get(g)!.map((row) => (
              <button key={row.key} type="button" className={styles.listRow} onClick={row.open}>
                <span className={styles.rowGlyph}>{row.glyph}</span>
                <span className={styles.rowTitle}>{row.title}</span>
                <span className={styles.rowType}>{row.tag}</span>
                <span className={styles.rowTime}>{row.visited ? '访问' : '修改'} · {relativeTime(row.at)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Settings: secondary navigation ───────────────────────────────────── */

type SettingsSection = 'general' | 'account' | 'data' | 'connections' | 'tags' | 'privacy';

const SETTINGS_NAV: { id: SettingsSection; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'account', label: 'Account' },
  { id: 'data', label: 'Data Management' },
  { id: 'connections', label: 'Connections' },
  { id: 'tags', label: 'Meta Tags' },
  { id: 'privacy', label: 'Privacy' },
];

export function SettingsPage({
  prefs,
  onChange,
  itemCount,
  contextCount,
  onExportJson,
  onExportMarkdown,
  onExportAgent,
  onManageData,
  tagDefinitions,
  onCreateTagDefinition,
  profileBlock,
}: {
  prefs: UiPrefs;
  onChange: (next: UiPrefs) => void;
  itemCount: number;
  contextCount: number;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onExportAgent: () => void;
  onManageData: () => void;
  tagDefinitions: TagDefinitionDTO[];
  onCreateTagDefinition: (name: string, description: string) => Promise<void>;
  profileBlock?: ReactNode;
}) {
  const [section, setSection] = useState<SettingsSection>('general');
  const [newTagName, setNewTagName] = useState('');
  const [newTagDesc, setNewTagDesc] = useState('');

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
            {s.label}
          </button>
        ))}
      </nav>
      <div className={styles.settingsContent}>
        {section === 'general' ? (
          <>
            <h1 className={styles.pageTitle}>General</h1>
            <p className={styles.pageSub}>Workspace preferences, stored on this machine.</p>
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>WORKSPACE NAME</div>
              <input
                className={styles.settingInput}
                value={prefs.workspaceName}
                onChange={(e) => onChange({ ...prefs, workspaceName: e.target.value })}
              />
            </div>
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>LANGUAGE</div>
              <select className={styles.settingInput} value="English" disabled>
                <option>English</option>
              </select>
            </div>
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>INTERFACE</div>
              <div className={styles.settingRow}>
                <div className={styles.settingLabel}>主题</div>
                <div className={styles.qualityRow}>
                  {THEMES.map((t: ThemeMode) => (
                    <button
                      key={t}
                      type="button"
                      className={`${styles.qualityPill} ${prefs.theme === t ? styles.on : ''}`}
                      onClick={() => onChange({ ...prefs, theme: t })}
                    >
                      {t === 'dark' ? 'Dark' : 'Light'}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.settingRow}>
                <div className={styles.settingLabel}>背景动画质量</div>
                <div className={styles.qualityRow}>
                  {ANIMATION_QUALITIES.map((q: AnimationQuality) => (
                    <button
                      key={q}
                      type="button"
                      className={`${styles.qualityPill} ${prefs.quality === q ? styles.on : ''}`}
                      onClick={() => onChange({ ...prefs, quality: q })}
                    >
                      {QUALITY_LABELS[q]}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.settingRow}>
                <div className={styles.settingLabel}>页面切换动画</div>
                <div className={styles.qualityRow}>
                  {([true, false] as const).map((on) => (
                    <button
                      key={String(on)}
                      type="button"
                      className={`${styles.qualityPill} ${prefs.pageTransition === on ? styles.on : ''}`}
                      onClick={() => onChange({ ...prefs, pageTransition: on })}
                    >
                      {on ? 'On' : 'Off'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>DATA</div>
              <button type="button" className={styles.secondaryButton} onClick={onManageData}>Manage stored information</button>
            </div>
          </>
        ) : section === 'account' ? (
          <>
            <h1 className={styles.pageTitle}>Account</h1>
            <p className={styles.pageSub}>Local MVP account.</p>
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>WORKSPACE</div>
              <div className={styles.settingValue}>{prefs.workspaceName}</div>
            </div>
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>PROVIDER</div>
              <div className={styles.settingValue}>{prefs.provider} · default model {prefs.defaultModel}</div>
            </div>
            <div className={styles.hint}>云端账户与权限体系属于后续阶段。</div>
          </>
        ) : section === 'data' ? (
          <>
            <h1 className={styles.pageTitle}>Data Management</h1>
            <p className={styles.pageSub}>Manage stored information.</p>
            <div className={styles.countLine}>items: {itemCount} · contexts: {contextCount}</div>
            <div className={styles.exportGrid}>
              <div className={styles.exportCard}>
                <strong>完整数据</strong>
                <span className={styles.exportName}>gsc-export.json</span>
                <button type="button" className={styles.downloadButton} onClick={onExportJson}>下载</button>
              </div>
              <div className={styles.exportCard}>
                <strong>Markdown 打包</strong>
                <span className={styles.exportName}>gsc-bundle.md</span>
                <button type="button" className={styles.downloadButton} onClick={onExportMarkdown}>下载</button>
              </div>
              <div className={styles.exportCard}>
                <strong>Claude Code / Codex 上下文</strong>
                <span className={styles.exportName}>GSC-CONTEXT.md</span>
                <button type="button" className={styles.downloadButton} onClick={onExportAgent}>下载</button>
              </div>
            </div>
          </>
        ) : section === 'connections' ? (
          <>
            <h1 className={styles.pageTitle}>Connections</h1>
            <p className={styles.pageSub}>How other tools consume GSC.</p>
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>CLAUDE CODE / CODEX</div>
              <div className={styles.settingValue}>通过 GSC-CONTEXT.md 导出文件连接（Sync 页或上方 Data Management 下载）。</div>
            </div>
            <div className={styles.hint}>本地只读端点 /api/v1/ 与 MCP server（npm run mcp）已可用（PLAN-6）；User Profile 输出见 Meta Tags。</div>
          </>
        ) : section === 'tags' ? (
          <>
            <h1 className={styles.pageTitle}>Meta Tags</h1>
            <p className={styles.pageSub}>受控维度定义（D-064）。维度必须先定义才能赋值；取值自由。</p>
            {tagDefinitions.map((d) => (
              <div className={styles.settingBlock} key={d.id}>
                <div className={styles.settingCaption}>{d.name.toUpperCase()}</div>
                <div className={styles.settingValue}>{d.description || '（无描述）'}</div>
              </div>
            ))}
            {profileBlock ? (
              <div className={styles.settingBlock}>
                <div className={styles.settingCaption}>USER PROFILE</div>
                <div className={styles.settingValue}>跨应用输出给外部 Agent 的用户特征（D-066）。只输出已确认的取值。</div>
                {profileBlock}
              </div>
            ) : null}
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>NEW DIMENSION</div>
              <div className={styles.tagForm}>
                <input
                  className={styles.search}
                  placeholder="维度名称"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
                <input
                  className={styles.search}
                  placeholder="含义说明"
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
                  添加维度
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className={styles.pageTitle}>Privacy</h1>
            <p className={styles.pageSub}>Data stays on this machine.</p>
            <div className={styles.settingBlock}>
              <div className={styles.settingCaption}>STORAGE</div>
              <div className={styles.settingValue}>PGlite 本地库 + data/files 文件目录。无云端同步、无遥测。</div>
            </div>
            <div className={styles.hint}>访问记录（Recently 的「访问」标签）只存本机 localStorage，可随时清除。</div>
          </>
        )}
      </div>
    </div>
  );
}

export const OBJECT_TAB_TYPES = OBJECT_TYPES;
export const RAW_TAB_TYPES = RAW_TYPES;
