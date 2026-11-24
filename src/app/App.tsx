import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Field, SectionLabel } from '../components/ui.tsx';
import { DotGridBackground, MosaicTransition } from '../components/animations.tsx';
import { Sidebar } from './Sidebar.tsx';
import type { ViewId } from './Sidebar.tsx';
import { useLocation, navigate, replace } from '../lib/router.ts';
import { parsePath, buildPath } from './routes.ts';
import { CommandPalette } from '../components/CommandPalette.tsx';
import type { PaletteItem } from '../components/CommandPalette.tsx';
import { CanvasView, DocsView, SyncView } from '../views/views.tsx';
import { CanvasTreeView } from '../views/CanvasTreeView.tsx';
import type { SourceDTO, SourceFrequency, SourceKind } from '../lib/sources.ts';
import type { ProposalDTO } from '../lib/proposals.ts';
import { OverviewPage, RecentlyPage, SettingsPage, StartView, UserView } from '../views/pages.tsx';
import type { ContextIndexEntry } from '../views/pages.tsx';
import { ContextCollection, ObjectCollection, RawCollection, ClusterCollection } from '../views/collections.tsx';
import { ContextDetailView, ObjectDetailView, RawDetailView, ClusterDetailView } from '../views/detail.tsx';
import { TagEditor } from '../components/TagEditor.tsx';
import { useI18n, useT } from '../lib/i18n.tsx';
import { useToast } from '../components/Toast.tsx';
import type { TagDefinitionDTO, TagValueDTO } from '../lib/tags.ts';
import type { LlmPublicConfig } from '../services/api.ts';
import { createMutationRunner, errorMessageKey, type DataKey } from '../services/dataLayer.ts';
import { fieldLabel, isMultiline } from '../lib/itemFields.ts';
import type { ClusterIndexEntry } from '../views/detail.tsx';
import { LightUpStudio } from '../views/lightup.tsx';
import type { PersistResult } from '../views/lightup.tsx';
import type { Sheet } from '../components/SemanticObjectSheet.tsx';
import {
  DOMAINS,
  ITEM_LABELS,
  ITEM_TYPES,
  OBJECT_TYPES,
  fieldKeysFor,
  isObjectType,
  statusesFor,
} from '../lib/items.ts';
import type { ItemDTO, ItemFields, ItemType } from '../lib/items.ts';
import { RELATION_KINDS } from '../lib/relations.ts';
import type { RelationKind } from '../lib/relations.ts';
import type { ComposerMode, ModelName, UiPrefs } from '../lib/prefs.ts';
import { loadPrefs, savePrefs } from '../lib/prefs.ts';
import { recordVisit, visitMap } from '../lib/visits.ts';
import { loadSampleWorkspace, clearSampleWorkspace } from '../lib/sample.ts';
import { Onboarding, isOnboardingDone } from '../components/Onboarding.tsx';
import { LoginPage } from '../pages/auth/LoginPage.tsx';
import {
  buildAgentContext,
  buildJsonExport,
  buildMarkdownBundle,
  downloadArtifact,
} from '../lib/sync.ts';
import type { ExportSource } from '../lib/sync.ts';
import * as api from '../services/api.ts';
import type { ItemDetailResponse } from '../services/api.ts';
import styles from './app.module.css';

type Panel = 'none' | 'new' | 'edit' | 'link' | 'new-context' | 'edit-context' | 'new-cluster' | 'edit-cluster';
/* U3: field vocabulary single-sourced in lib/itemFields.ts (was fieldLabels + multiline here). */

function metaFrom(item?: ItemDTO) {
  return {
    title: item?.title ?? '',
    domain: item?.domain ?? 'knowledge',
    origin: item?.origin ?? 'user',
    source_label: item?.source_label ?? '',
    status: item?.status ?? 'draft',
  };
}

export default function App() {
  const t = useT();
  const toast = useToast();
  const location = useLocation();
  const route = parsePath(location.pathname, location.search);
  const [view, setView] = useState<ViewId>(route.view);
  const [mosaicToken, setMosaicToken] = useState(0);
  const [prefs, setPrefs] = useState<UiPrefs>(() => loadPrefs());
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [itemActivity, setItemActivity] = useState<Record<string, { user: number; agent: number }>>({});
  const [loadingItems, setLoadingItems] = useState(true);
  const [contexts, setContexts] = useState<ContextIndexEntry[]>([]);
  const [overviewMode, setOverviewMode] = useState<'overview' | 'canvas'>('overview');
  const [clusters, setClusters] = useState<ClusterIndexEntry[]>([]);
  const [clusterId, setClusterId] = useState(route.clusterId ?? '');
  const [relationIndex, setRelationIndex] = useState<Record<string, { outgoing: { to_id: string; kind: RelationKind }[]; incoming: { from_id: string; kind: RelationKind }[] }>>({});
  const [visits, setVisits] = useState<Record<string, string | undefined>>(() => visitMap());
  const [selectedId, setSelectedId] = useState<string>(route.itemId ?? '');
  const [detail, setDetail] = useState<ItemDetailResponse | undefined>();
  const [contextId, setContextId] = useState(route.contextId ?? '');
  const [panel, setPanel] = useState<Panel>('none');
  const [newType, setNewType] = useState<ItemType>('raw.document');
  const [form, setForm] = useState<Record<string, string>>({});
  /* U1: errors are partitioned by scope (panel or view) — a failure on one
     page no longer stomps the message another page is showing. */
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [canvasQuery, setCanvasQuery] = useState('');
  const [canvasPreviewing, setCanvasPreviewing] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [lightupBusy, setLightupBusy] = useState(false);
  const [sources, setSources] = useState<SourceDTO[]>([]);
  const [sourceBusy, setSourceBusy] = useState(false);
  const [proposals, setProposals] = useState<ProposalDTO[]>([]);
  const [recentDay, setRecentDay] = useState(route.day ?? '');
  const [clusterShares, setClusterShares] = useState<{ user_id: string; name: string; role: 'view' | 'add' }[]>([]);
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinitionDTO[]>([]);
  const [tagValues, setTagValues] = useState<TagValueDTO[]>([]);
  const [llmConfig, setLlmConfig] = useState<LlmPublicConfig | null>(null);
  const [userList, setUserList] = useState<{ id: string; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeScope = panel !== 'none' ? `panel:${panel}` : `view:${view}`;
  const error = errors[activeScope] ?? '';
  useEffect(() => {
    // entering a scope starts clean (matches the old clear-on-panel-change)
    setErrors((prev) => (prev[activeScope] ? { ...prev, [activeScope]: '' } : prev));
  }, [activeScope]);

  /* D-078: URL routing — bidirectional sync. State is seeded from the URL on load
     (deep links). Back/forward (popstate) re-derives state via `location`. State
     changes mirror to the URL (history push) so every view is shareable/bookmarkable. */
  const didInitRef = useRef(false);
  useEffect(() => {
    const r = parsePath(location.pathname, location.search);
    if (r.notFound) return;
    setView(r.view);
    setSelectedId(r.itemId ?? '');
    setContextId(r.contextId ?? '');
    setClusterId(r.clusterId ?? '');
    setRecentDay(r.day ?? '');
  }, [location]);

  useEffect(() => {
    const now = parsePath(window.location.pathname, window.location.search);
    if (now.notFound) return;
    const to = buildPath({ view, itemId: selectedId, contextId, clusterId, day: recentDay });
    const here = window.location.pathname + window.location.search;
    if (to === here) {
      didInitRef.current = true;
      return;
    }
    if (!didInitRef.current) {
      didInitRef.current = true;
      replace(to);
    } else {
      navigate(to);
    }
  }, [view, selectedId, contextId, clusterId, recentDay]);

  /* META_TAG_V1 筛选: group/tag chips over the collections. */
  const [metaFilter, setMetaFilter] = useState<{ group?: string; tag?: string }>({});
  const [metaGroups, setMetaGroups] = useState<{ id: string; key: string; name: string }[]>([]);
  useEffect(() => {
    api.listMetaGroups()
      .then((r) => setMetaGroups(r.groups.map((g) => ({ id: g.id, key: g.key, name: g.name }))))
      .catch(() => undefined);
  }, []);

  const refresh = useCallback(async () => {
    const result = await api.listItems({ group: metaFilter.group, tag: metaFilter.tag });
    setItems(result.items);
    setItemActivity(result.activity ?? {});
    setLoadingItems(false);
  }, [metaFilter]);

  const loadContextIndex = useCallback(async () => {
    // U1: list carries member_ids (batched server-side) — no per-row fetch.
    const list = await api.listContexts();
    setContexts(list.contexts);
  }, []);

  const loadClusterIndex = useCallback(async () => {
    const list = await api.listClusters();
    setClusters(list.clusters);
  }, []);

  const loadSources = useCallback(async () => {
    const list = await api.listSources();
    setSources(list.sources);
  }, []);

  const loadProposals = useCallback(async () => {
    const list = await api.listProposals('pending');
    setProposals(list.proposals);
  }, []);

  const loadShareState = useCallback(async (id: string) => {
    try {
      const [shares, users] = await Promise.all([api.listClusterShares(id), api.listUsers()]);
      setClusterShares(shares.shares.map((s) => ({ user_id: s.user_id, name: s.name, role: s.role })));
      setUserList(users.users.map((u) => ({ id: u.id, name: u.name })));
    } catch {
      setClusterShares([]);
    }
  }, []);

  const loadLlmConfig = useCallback(async () => {
    try {
      const result = await api.getLlmConfig();
      setLlmConfig(result.config);
    } catch {
      setLlmConfig(null);
    }
  }, []);

  const loadTags = useCallback(async () => {
    const [defs, values] = await Promise.all([api.listTagDefinitions(), api.listTagValues()]);
    setTagDefinitions(defs.definitions);
    setTagValues(values.values);
  }, []);

  const loadDetail = useCallback(async (id: string, trace = false) => {
    // `trace` marks the explicit "user opened the detail" action (V1 engagement).
    // Refetches stay pure reads (U1): export and indexing never write events.
    const result = await api.getItem(id, trace ? { trace: true } : {});
    setDetail(result);
  }, []);

  /* U1: one mutation runner — clear → write → reload per the dataLayer rules
     table → error routed to the scope the user is looking at. Replaces 25
     hand-copied try/catch blocks that each picked their own refetches. */
  const reload = useCallback(async (keys: readonly DataKey[]) => {
    await Promise.all(keys.map((key) => {
      switch (key) {
        case 'items': return refresh();
        case 'detail': return selectedId ? loadDetail(selectedId) : Promise.resolve();
        case 'contexts': return loadContextIndex();
        case 'clusters': return loadClusterIndex();
        case 'sources': return loadSources();
        case 'proposals': return loadProposals();
        case 'tags': return loadTags();
        case 'shares': return clusterId ? loadShareState(clusterId) : Promise.resolve();
      }
    }));
  }, [refresh, loadDetail, loadContextIndex, loadClusterIndex, loadSources, loadProposals, loadTags, loadShareState, selectedId, clusterId]);

  const run = useMemo(() => createMutationRunner({
    scope: () => activeScope,
    clearError: (scope) => setErrors((prev) => ({ ...prev, [scope]: '' })),
    showError: (scope, message) => setErrors((prev) => ({ ...prev, [scope]: message })),
    reload,
    describeError: (e) => {
      const key = errorMessageKey(e);
      return key ? t(key) : e instanceof Error ? e.message : t('error.unexpected');
    },
  }), [activeScope, reload, t]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { void loadContextIndex(); }, [loadContextIndex]);
  useEffect(() => { void loadClusterIndex(); }, [loadClusterIndex]);
  useEffect(() => { void loadSources(); }, [loadSources]);
  useEffect(() => { void loadProposals(); }, [loadProposals]);
  useEffect(() => { void loadTags(); }, [loadTags]);
  useEffect(() => { void loadLlmConfig(); }, [loadLlmConfig]);
  useEffect(() => {
    if (clusterId) void loadShareState(clusterId);
    else setClusterShares([]);
  }, [clusterId, loadShareState]);
  useEffect(() => {
    if (!selectedId) { setDetail(undefined); return; }
    void loadDetail(selectedId, true);
  }, [selectedId, loadDetail]);
  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.dataset.density = prefs.density;
  }, [prefs.theme, prefs.density]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const objectItems = items.filter((i) => i.type.startsWith('object.'));
      if (objectItems.length === 0) {
        if (alive) setRelationIndex({});
        return;
      }
      // U1: one batched projection read. Was one getItem per object item (N+1),
      // and those detail fetches polluted engagement counts with fake opens.
      const { relations } = await api.listRelationsFor(objectItems.map((i) => i.id));
      const index: Record<string, { outgoing: { to_id: string; kind: RelationKind }[]; incoming: { from_id: string; kind: RelationKind }[] }> = {};
      for (const item of objectItems) index[item.id] = { outgoing: [], incoming: [] };
      for (const r of relations) {
        if (index[r.from_id]) index[r.from_id].outgoing.push({ to_id: r.to_id, kind: r.kind });
        if (index[r.to_id]) index[r.to_id].incoming.push({ from_id: r.from_id, kind: r.kind });
      }
      if (alive) setRelationIndex(index);
    })();
    return () => { alive = false; };
  }, [items]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sourceCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [id, rel] of Object.entries(relationIndex)) {
      let n = 0;
      for (const r of rel.outgoing) {
        const target = items.find((i) => i.id === r.to_id);
        if (target && target.type.startsWith('raw.')) n += 1;
      }
      out[id] = n;
    }
    return out;
  }, [relationIndex, items]);

  const selected = detail?.item;
  const selectedContext = contexts.find((c) => c.id === contextId);
  const selectedCluster = clusters.find((c) => c.id === clusterId);

  const itemBadges = useMemo(() => {
    const map: Record<string, { kind: 'cluster' | 'context'; title: string }[]> = {};
    const add = (id: string, badge: { kind: 'cluster' | 'context'; title: string }) => {
      map[id] = [...(map[id] ?? []), badge];
    };
    for (const cluster of clusters) {
      for (const id of cluster.member_ids) add(id, { kind: 'cluster', title: cluster.title });
    }
    for (const context of contexts) {
      for (const id of context.member_ids) add(id, { kind: 'context', title: context.title });
    }
    return map;
  }, [clusters, contexts]);

  // PLAN-8: tag-derived indexes for filtering and the overview summary
  const tagDimsByItem = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const v of tagValues) {
      if (!v.item_id) continue;
      const name = tagDefinitions.find((d) => d.id === v.definition_id)?.name ?? v.definition_id;
      map[v.item_id] = [...new Set([...(map[v.item_id] ?? []), name])];
    }
    return map;
  }, [tagValues, tagDefinitions]);

  const tagDimNames = useMemo(
    () => tagDefinitions.map((d) => d.name),
    [tagDefinitions],
  );

  const tagSummary = useMemo(
    () => tagDefinitions.map((d) => ({
      name: d.name,
      count: tagValues.filter((v) => v.definition_id === d.id).length,
    })),
    [tagDefinitions, tagValues],
  );

  function updatePrefs(next: UiPrefs) {
    setPrefs(next);
    savePrefs(next);
  }

  function go(next: ViewId) {
    if (next === view) return;
    if (prefs.pageTransition) setMosaicToken((t) => t + 1);
    setView(next);
  }

  /* P4: Ctrl+K command palette */
  const [paletteOpen, setPaletteOpen] = useState(false);

  /* T102: first-launch onboarding */
  const [onboarding, setOnboarding] = useState(() => !isOnboardingDone());
  const [onboardingReplay, setOnboardingReplay] = useState(false);

  /* T103: local account — created on first launch, gates onboarding */
  const [account, setAccount] = useState<{ id: string; name: string; created_at: string } | null>(null);
  const [, setAccountChecked] = useState(false);
  /* CHORD-family login session (mirrors Thylas' session cookie): gates the app. */
  const [signedIn, setSignedIn] = useState<boolean>(() => {
    try { return localStorage.getItem('gsc.session') !== null; } catch { return false; }
  });
  useEffect(() => {
    void api.listUsers().then((r) => {
      setAccount(r.users?.[0] ?? null);
      setAccountChecked(true);
    }).catch(() => setAccountChecked(true));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const paletteItems = useMemo<PaletteItem[]>(() => {
    const pages: PaletteItem[] = [
      { id: 'pg-start', group: '页面', label: t('nav.start'), hint: 'start', run: () => go('start') },
      { id: 'pg-overview', group: '页面', label: t('nav.overview'), hint: 'overview', run: () => go('overview') },
      { id: 'pg-recently', group: '页面', label: t('nav.recently'), hint: 'recently', run: () => go('recently') },
      { id: 'pg-raw', group: '页面', label: t('nav.raw'), hint: 'raw', run: () => go('raw') },
      { id: 'pg-objects', group: '页面', label: t('nav.objects'), hint: 'objects', run: () => go('objects') },
      { id: 'pg-clusters', group: '页面', label: t('nav.clusters'), hint: 'clusters', run: () => go('clusters') },
      { id: 'pg-contexts', group: '页面', label: t('nav.contexts'), hint: 'contexts', run: () => go('contexts') },
      { id: 'pg-lightup', group: '页面', label: 'Light Up', hint: 'lightup', run: () => go('lightup') },
      { id: 'pg-sync', group: '页面', label: t('nav.sync'), hint: 'sync', run: () => go('sync') },
      { id: 'pg-export', group: '页面', label: t('nav.export'), hint: 'sync', run: () => go('sync') },
      { id: 'pg-settings', group: '页面', label: t('nav.settings'), hint: 'settings', run: () => go('settings') },
      { id: 'pg-docs', group: '页面', label: t('nav.docs'), hint: 'docs', run: () => go('docs') },
    ];
    const commands: PaletteItem[] = [
      { id: 'cmd-new', group: '命令', label: `${t('common.new')} · ${t('nav.raw')}`, hint: 'lightup', run: () => go('lightup') },
      { id: 'cmd-connect', group: '命令', label: t('sync.connectBtn'), hint: 'sync', run: () => go('sync') },
      { id: 'cmd-export', group: '命令', label: t('settings.exportAgent'), hint: 'sync', run: () => go('sync') },
    ];
    const itemResults: PaletteItem[] = items.slice(0, 30).map((item) => ({
      id: `it-${item.id}`,
      group: t('nav.raw'),
      label: item.title,
      hint: ITEM_LABELS[item.type],
      run: () => { openItemInPage(item.id); },
    }));
    return [...commands, ...pages, ...itemResults];
  }, [items, t]);

  function markVisited(id: string) {
    recordVisit(id);
    setVisits(visitMap());
  }

  function selectItem(id: string) {
    setSelectedId(id);
    setPanel('none');
    markVisited(id);
  }

  function openItemInPage(id: string) {
    const item = items.find((i) => i.id === id);
    selectItem(id);
    if (item) go(item.type.startsWith('raw.') ? 'raw' : 'objects');
  }

  function openContextInPage(id: string) {
    setContextId(id);
    setPanel('none');
    markVisited(id);
    go('contexts');
  }

  function openNew(type: ItemType) {
    setPanel('new');
    setNewType(type);
    setForm({ title: '', domain: 'knowledge', origin: 'user', source_label: '', status: statusesFor(type)[0] });
  }

  function openEdit() {
    if (!selected) return;
    setPanel('edit');
    setForm({
      ...metaFrom(selected),
      ...Object.fromEntries(Object.entries(selected.fields).map(([k, v]) => [k, v ?? ''])),
    });
  }

  function setField(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveNew() {
    const created = await run('item.create', async () => {
      const fields: ItemFields = {};
      for (const key of fieldKeysFor(newType)) if (form[key]) fields[key] = form[key];
      const result = await api.createItem({
        type: newType,
        title: form.title,
        domain: form.domain,
        origin: form.origin,
        source_label: form.source_label,
        fields,
      });
      if (!result.item) throw new Error('Unexpected create response');
      return result.item;
    });
    if (!created) return;
    selectItem(created.id);
    go(created.type.startsWith('raw.') ? 'raw' : 'objects');
  }

  async function saveEdit() {
    if (!selected) return;
    const ok = await run('item.update', async () => {
      const fields: ItemFields = {};
      if (isObjectType(selected.type)) {
        for (const key of fieldKeysFor(selected.type)) if (key in form) fields[key] = form[key] ?? '';
      }
      const result = await api.updateItem(selected.id, {
        title: form.title,
        domain: form.domain,
        origin: form.origin,
        source_label: form.source_label,
        status: form.status,
        fields,
      });
      if (!('item' in result)) throw new Error('Unexpected update response');
      return true;
    });
    if (ok) setPanel('none');
  }

  async function saveLink() {
    if (!selected) return;
    const ok = await run('relation.create', async () => {
      const result = await api.createRelation({
        kind: form.kind,
        from_id: selected.id,
        to_id: form.target,
        note: form.note,
      });
      if (!('relation' in result)) throw new Error('Unexpected relation response');
      return true;
    });
    if (ok) setPanel('none');
  }

  async function deleteSelected() {
    if (!selected) return;
    if (!window.confirm(t('confirm.deleteItem'))) return;
    const deletedId = selected.id;
    const ok = await run('item.delete', async () => {
      await api.deleteItem(deletedId);
      return true;
    });
    if (!ok) return;
    setSelectedId('');
    setPanel('none');
    /* T203: 6-second undo window */
    toast(t('trash.deleted'), 'ok', {
      label: t('trash.undo'),
      run: () => {
        void run('item.restore', () => api.restoreItem(deletedId));
      },
    });
  }

  function openNewContext() {
    setPanel('new-context');
    setForm({ title: 'Knowledge Context', subject: '', scope: '', purpose: '' });
  }

  function openNewCluster() {
    setPanel('new-cluster');
    setForm({ title: '', description: '' });
  }

  function openEditCluster() {
    const c = selectedCluster;
    if (!c) return;
    setPanel('edit-cluster');
    setForm({ title: c.title, description: c.description });
  }

  async function saveCluster() {
    const saved = await run(panel === 'edit-cluster' ? 'cluster.update' : 'cluster.create', async () => {
      const body = { title: form.title, description: form.description };
      const result = panel === 'edit-cluster' && clusterId
        ? await api.updateCluster(clusterId, body)
        : await api.createCluster(body);
      if (!result.cluster) throw new Error('Unexpected cluster response');
      return result.cluster;
    });
    if (!saved) return;
    setPanel('none');
    setClusterId(saved.id);
  }

  async function changeClusterMember(action: 'add' | 'remove', itemId: string) {
    if (!clusterId) return;
    await run('cluster.members', () => (action === 'add'
      ? api.addClusterMember(clusterId, itemId)
      : api.removeClusterMember(clusterId, itemId)));
  }

  async function deleteSelectedCluster() {
    if (!selectedCluster) return;
    if (!window.confirm(t('confirm.deleteCluster'))) return;
    const ok = await run('cluster.delete', async () => {
      await api.deleteCluster(selectedCluster.id);
      return true;
    });
    if (ok) setClusterId('');
  }

  function openEditContext() {
    const c = selectedContext;
    if (!c) return;
    setPanel('edit-context');
    setForm({ title: c.title, subject: c.subject, scope: c.scope, purpose: c.purpose });
  }

  async function saveContext() {
    const saved = await run(panel === 'edit-context' ? 'context.update' : 'context.create', async () => {
      const body = {
        title: form.title,
        subject: form.subject,
        scope: form.scope,
        purpose: form.purpose,
      };
      const result = panel === 'edit-context' && contextId
        ? await api.updateContext(contextId, body)
        : await api.createContext(body);
      if (!result.context) throw new Error('Unexpected context response');
      return result.context;
    });
    if (!saved) return;
    setPanel('none');
    setContextId(saved.id);
  }

  async function changeMember(action: 'add' | 'remove', itemId: string) {
    if (!contextId) return;
    await run('context.members', async () => {
      const result = action === 'add'
        ? await api.addContextMember(contextId, itemId)
        : await api.removeContextMember(contextId, itemId);
      if (!result.context) throw new Error('Unexpected member response');
      return true;
    });
  }

  async function onFile(file?: File) {
    if (!file) return;
    const content = await file.text();
    setForm((current) => ({ ...current, filename: file.name, content_text: content }));
  }

  async function importFileObject(file: File) {
    const created = await run('item.create', async () => {
      const content = await file.text();
      const result = await api.createItem({
        type: 'raw.filecontent',
        title: file.name,
        domain: 'artifact',
        origin: 'import',
        source_label: 'file-import',
        fields: { filename: file.name, content_text: content },
      });
      return result.item;
    });
    if (!created) return;
    setSelectedId(created.id);
    setCanvasPreviewing(true);
    if (view !== 'canvas') go('canvas');
  }

  async function submitComposer(payload: { text: string; mode: ComposerMode; model: ModelName; provider: string }) {
    const created = await run('item.create', async () => {
      const title = payload.text.split('\n')[0].slice(0, 80);
      const result = await api.createItem({
        type: 'raw.document',
        title,
        domain: 'user',
        origin: 'user',
        source_label: `composer:${payload.mode} · ${payload.model}`,
        fields: { content_text: payload.text },
      });
      if (!result.item) throw new Error('Unexpected create response');
      return result.item;
    });
    if (created) go('recently');
  }

  async function collectExport(): Promise<ExportSource> {
    const details = await Promise.all(items.map((item) => api.getItem(item.id)));
    return { details, contexts, exportedAt: new Date().toISOString() };
  }

  async function persistSegments(sheets: Sheet[], sourceLabel: string): Promise<PersistResult> {
    setLightupBusy(true);
    const created: PersistResult['created'] = [];
    const failed: PersistResult['failed'] = [];
    try {
      await run('lightup.persist', async () => {
        for (const sheet of sheets) {
          const fields: ItemFields = { content_text: sheet.content };
          if (sheet.type === 'raw.message') fields.author = sheet.author || 'extracted';
          if (sheet.type === 'raw.evidence') fields.locator = sheet.locator || sourceLabel;
          if (sheet.type === 'raw.filecontent') fields.filename = sheet.title;
          try {
            const result = await api.createItem({
              type: sheet.type,
              title: sheet.title || 'Untitled',
              domain: 'knowledge',
              origin: 'user',
              source_label: sourceLabel,
              fields,
            });
            if (result.item) {
              created.push({ id: result.item.id, title: result.item.title, type: result.item.type, source_label: result.item.source_label });
              // Pending tags become real tag values through the existing contract (PLAN-8).
              for (const tag of sheet.tags) {
                const def = tagDefinitions.find((d) => d.name === tag.dim);
                if (def) {
                  await api.createTagValue({ definition_id: def.id, item_id: result.item.id, value: tag.value, confirmed: true });
                }
              }
            }
          } catch (e) {
            failed.push({ key: sheet.key, message: e instanceof Error ? e.message : 'create failed' });
          }
        }
        return true;
      });
    } finally {
      setLightupBusy(false);
    }
    return { created, failed };
  }

  async function proposeForSegments(rows: { title: string; content: string }[]): Promise<{ index: number; semantic_name: string }[]> {
    setLightupBusy(true);
    try {
      const result = await run('agent.propose', async () => {
        const r = await api.proposeSuggestions(rows.map((row) => ({ title: row.title, content: row.content })));
        return r.suggestions.map((s) => ({ index: s.index, semantic_name: s.semantic_name }));
      });
      return result ?? [];
    } finally {
      setLightupBusy(false);
    }
  }

  async function resolveProposalEntry(proposal: ProposalDTO, status: 'accepted' | 'rejected') {
    await run('proposal.resolve', async () => {
      await api.resolveProposal(proposal.id, status);
      return true;
    });
  }

  async function detectNow() {
    setLightupBusy(true);
    try {
      await run('proposal.detect', async () => {
        await api.runDetect();
        return true;
      });
    } finally {
      setLightupBusy(false);
    }
  }

  async function runExport(build: (source: ExportSource) => { filename: string; mime: string; content: string }) {
    setSyncBusy(true);
    try {
      await run('export.run', async () => {
        const source = await collectExport();
        downloadArtifact(build(source));
        return true;
      });
    } finally {
      setSyncBusy(false);
    }
  }

  async function createSourceEntry(body: { kind: SourceKind; label: string; scope: string; frequency: SourceFrequency; token: string }) {
    setSourceBusy(true);
    try {
      await run('source.create', async () => {
        await api.createSource(body);
        return true;
      });
    } finally {
      setSourceBusy(false);
    }
  }

  async function toggleSourcePause(source: SourceDTO) {
    await run('source.update', async () => {
      await api.updateSource(source.id, { status: source.status === 'paused' ? 'connected' : 'paused' });
      return true;
    });
  }

  async function removeSourceEntry(source: SourceDTO) {
    if (!window.confirm(t('sync.disconnectConfirm', { label: source.label }))) return;
    await run('source.delete', async () => {
      await api.deleteSource(source.id);
      return true;
    });
  }

  async function syncSourceEntry(source: SourceDTO) {
    setSourceBusy(true);
    try {
      const ok = await run('source.sync', async () => {
        await api.syncSource(source.id);
        return true;
      });
      // A failed sync may still have touched upstream state — resync the card.
      if (!ok) await loadSources();
    } finally {
      setSourceBusy(false);
    }
  }

  async function setSourceFrequency(source: SourceDTO, frequency: SourceFrequency) {
    await run('source.update', async () => {
      await api.updateSource(source.id, { frequency });
      return true;
    });
  }

  async function shareClusterEntry(name: string, role: 'view' | 'add') {
    if (!clusterId) return;
    await run('share.create', async () => {
      await api.shareCluster(clusterId, { name, role });
      return true;
    });
  }

  async function revokeShareEntry(userId: string) {
    if (!clusterId) return;
    await run('share.revoke', async () => {
      await api.revokeClusterShare(clusterId, userId);
      return true;
    });
  }

  const linkTargets = useMemo(() => {
    if (!selected) return [];
    const kind = form.kind as RelationKind;
    if (kind === 'derived_from') return items.filter((x) => !isObjectType(x.type) && x.id !== selected.id);
    if (kind === 'references') return items.filter((x) => x.id !== selected.id);
    return items.filter((x) => isObjectType(x.type) && x.id !== selected.id);
  }, [form.kind, items, selected]);

  function formPage(content: ReactNode) {
    return (
      <div className={styles.formPage}>
        {content}
      </div>
    );
  }

  async function addTagValue(body: { definition_id: string; value: string; scope: string }, attachToItem = true) {
    await run('tag.value.create', async () => {
      await api.createTagValue(attachToItem && selectedId ? { ...body, item_id: selectedId } : body);
      return true;
    });
  }

  /* GAP-10: bulk tagging — assign one tag value to every picked item. */
  async function bulkTag(ids: string[], definitionId: string, value: string) {
    const ok = await run('tag.value.create', async () => {
      for (const id of ids) {
        await api.createTagValue({ definition_id: definitionId, item_id: id, value, scope: 'global' });
      }
      return true;
    });
    if (ok) toast(t('cols.bulkDone', { n: ids.length }));
  }

  async function confirmTagValue(id: string, confirmed: boolean) {
    await run('tag.value.update', async () => {
      await api.setTagValueConfirmed(id, confirmed);
      return true;
    });
  }

  async function removeTagValue(id: string) {
    await run('tag.value.delete', async () => {
      await api.deleteTagValue(id);
      return true;
    });
  }

  async function saveLlmConfig(patch: { provider?: string; base_url?: string; model?: string; api_key?: string }) {
    const result = await run('llm.update', () => api.updateLlmConfig(patch));
    if (result) setLlmConfig(result.config);
  }

  async function checkLlm() {
    return api.checkLlm();
  }

  async function createTagDef(name: string, description: string, groupIds?: string[]) {
    await run('tag.def.create', async () => {
      await api.createTagDefinition({ name, description, group_ids: groupIds });
      return true;
    });
  }

  function renderItemPage(kind: 'raw' | 'objects') {
    if (panel === 'new') {
      return formPage(
        <NewForm
          type={newType}
          form={form}
          items={items}
          error={error}
          onType={(t) => { setNewType(t); setForm((f) => ({ ...f, status: statusesFor(t)[0] })); }}
          onField={setField}
          onFile={onFile}
          onCancel={() => setPanel('none')}
          onSave={() => void saveNew()}
        />,
      );
    }
    if (selected && panel === 'edit') {
      return formPage(
        <Editor item={selected} form={form} onField={setField} onCancel={() => setPanel('none')} onSave={() => void saveEdit()} />,
      );
    }
    if (selected && panel === 'link') {
      return formPage(
        <Linker form={form} targets={linkTargets} onField={setField} onCancel={() => setPanel('none')} onSave={() => void saveLink()} />,
      );
    }
    if (selectedId) {
      const shared = {
        detail,
        items,
        contextIndex: contexts,
        tags: (
          <TagEditor
            definitions={tagDefinitions}
            values={tagValues.filter((v) => v.item_id === selectedId)}
            onAdd={addTagValue}
            onConfirm={confirmTagValue}
            onDelete={removeTagValue}
          />
        ),
        onBack: () => setSelectedId(''),
        onEdit: openEdit,
        onDelete: () => void deleteSelected(),
        onOpenItem: openItemInPage,
        onOpenContext: openContextInPage,
        onAddToContext: async (contextId: string) => {
          const ok = await run('context.members', async () => {
            await api.addContextMember(contextId, selectedId);
            return true;
          });
          if (ok) toast(t('detail.addedToContext'));
        },
        onRefresh: () => {
          if (selectedId) void loadDetail(selectedId);
        },
      };
      return kind === 'raw' ? <RawDetailView {...shared} /> : <ObjectDetailView {...shared} />;
    }
    return (
      <>
        {metaGroups.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '8px 0' }}>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t('filter.group')}</span>
            <button
              type="button"
              className={!metaFilter.group ? styles.primaryButton : styles.search}
              style={{ fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}
              onClick={() => setMetaFilter({})}
            >
              {t('filter.all')}
            </button>
            {metaGroups.map((g) => (
              <button
                key={g.id}
                type="button"
                className={metaFilter.group === g.id ? styles.primaryButton : styles.search}
                style={{ fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}
                onClick={() => setMetaFilter((f) => ({ group: f.group === g.id ? undefined : g.id }))}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
        {kind === 'raw' ? (
          <RawCollection items={items} badges={itemBadges} tagDims={tagDimsByItem} tagDimOptions={tagDimNames} tagDefs={tagDefinitions} loading={loadingItems} activity={itemActivity} onNew={() => go('lightup')} onSelect={selectItem} onBulkTag={bulkTag} />
        ) : (
          <ObjectCollection items={items} sourceCounts={sourceCounts} badges={itemBadges} tagDims={tagDimsByItem} tagDimOptions={tagDimNames} tagDefs={tagDefinitions} loading={loadingItems} activity={itemActivity} onNew={() => openNew('object.concept')} onSelect={selectItem} onBulkTag={bulkTag} />
        )}
      </>
    );
  }

  function renderLightUpManual() {
    return (
      <NewForm
        type={newType}
        form={form}
        items={items}
        error={error}
        onType={(t) => { setNewType(t); setForm((f) => ({ ...f, status: statusesFor(t)[0] })); }}
        onField={setField}
        onFile={onFile}
        onCancel={() => go('raw')}
        onSave={() => void saveNew()}
      />
    );
  }

  function renderMain() {
    if (route.notFound) {
      return (
        <div className={styles.page}>
          <h1 className={styles.pageTitle}>404</h1>
          <p className={styles.pageSub}>{t('notFound.message')}</p>
          <button type="button" className={styles.primaryButton} onClick={() => navigate('/')}>
            {t('notFound.home')}
          </button>
        </div>
      );
    }
    switch (view) {
      case 'start':
        return (
          <StartView
            onSubmit={submitComposer}
            onCanvas={() => go('canvas')}
            onOpenFile={() => fileInputRef.current?.click()}
            onLightUp={() => go('lightup')}
            onConfigChange={saveLlmConfig}
            llmConfig={llmConfig}
            empty={items.length === 0}
            onLoadSample={async () => {
              await loadSampleWorkspace();
              await refresh();
              await loadClusterIndex();
              await loadContextIndex();
            }}
          />
        );
      case 'overview':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className={styles.pillTrack} style={{ width: 'max-content', margin: '18px 36px 0' }}>
              <button type="button" className={overviewMode === 'overview' ? `${styles.pill} ${styles.on}` : styles.pill} onClick={() => setOverviewMode('overview')}>{t('overview.tabOverview')}</button>
              <button type="button" className={overviewMode === 'canvas' ? `${styles.pill} ${styles.on}` : styles.pill} onClick={() => setOverviewMode('canvas')}>{t('overview.tabCanvas')}</button>
            </div>
            {overviewMode === 'canvas' ? (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', padding: '14px 36px 24px' }}>
                <CanvasTreeView items={items} clusters={clusters} contexts={contexts} onOpenItem={openItemInPage} />
              </div>
            ) : (
              <OverviewPage
                items={items}
                contexts={contexts}
                clusters={clusters}
                pendingProposals={proposals}
                tagSummary={tagSummary}
                onNew={() => go('lightup')}
                onOpenItem={openItemInPage}
                onOpenContext={openContextInPage}
                onOpenCluster={(id) => { setClusterId(id); markVisited(id); go('clusters'); }}
                onOpenQueue={() => go('lightup')}
                onPickDay={(day) => { setRecentDay(day); go('recently'); }}
                onSeeAll={() => go('raw')}
                onResolve={async (id, status) => {
                  await resolveProposalEntry({ id } as ProposalDTO, status);
                }}
              />
            )}
          </div>
        );
      case 'recently':
        return (
          <RecentlyPage
            items={items}
            contexts={contexts}
            visits={visits}
            dayFilter={recentDay}
            onClearDay={() => setRecentDay('')}
            onOpenItem={openItemInPage}
            onOpenContext={openContextInPage}
          />
        );
      case 'raw':
        return renderItemPage('raw');
      case 'objects':
        return renderItemPage('objects');
      case 'lightup':
        return (
          <LightUpStudio
            manualContent={renderLightUpManual()}
            onPreviewUrl={async (u) => {
              const result = await api.ingestUrl(u);
              return { title: result.title, text: result.text, url: result.url };
            }}
            onSubmitSheets={persistSegments}
            onPropose={proposeForSegments}
            proposals={proposals}
            onResolve={resolveProposalEntry}
            onDetect={detectNow}
            tagDefinitions={tagDefinitions}
            onNavigate={(v) => go(v)}
            busy={lightupBusy}
            error={error}
          />
        );
      case 'clusters':
        if (panel === 'new-cluster' || panel === 'edit-cluster') {
          return formPage(
            <ClusterForm
              form={form}
              error={error}
              editing={panel === 'edit-cluster'}
              onField={setField}
              onCancel={() => setPanel('none')}
              onSave={() => void saveCluster()}
            />,
          );
        }
        if (clusterId) {
          return (
            <ClusterDetailView
              detail={selectedCluster}
              items={items}
              shares={clusterShares}
              users={userList}
              onBack={() => setClusterId('')}
              onEdit={openEditCluster}
              onDelete={() => void deleteSelectedCluster()}
              onAdd={(id) => void changeClusterMember('add', id)}
              onRemove={(id) => void changeClusterMember('remove', id)}
              onOpenItem={openItemInPage}
              onShare={shareClusterEntry}
              onRevoke={revokeShareEntry}
            />
          );
        }
        return <ClusterCollection clusters={clusters} onNew={openNewCluster} onSelect={(id) => { setClusterId(id); markVisited(id); }} />;
      case 'contexts':
        if (panel === 'new-context' || panel === 'edit-context') {
          return formPage(
            <ContextForm
              form={form}
              error={error}
              editing={panel === 'edit-context'}
              onField={setField}
              onCancel={() => setPanel('none')}
              onSave={() => void saveContext()}
            />,
          );
        }
        if (contextId) {
          return (
            <ContextDetailView
              detail={selectedContext}
              items={items}
              onBack={() => setContextId('')}
              onEdit={openEditContext}
              onAdd={(id) => void changeMember('add', id)}
              onRemove={(id) => void changeMember('remove', id)}
              onOpenItem={openItemInPage}
            />
          );
        }
        return <ContextCollection contexts={contexts} onNew={openNewContext} onSelect={(id) => { setContextId(id); markVisited(id); }} />;
      case 'canvas':
        return (
          <CanvasView
            items={items}
            query={canvasQuery}
            onQuery={setCanvasQuery}
            selectedId={selectedId}
            panelOpen={canvasPreviewing}
            onTogglePanel={() => setCanvasPreviewing((v) => !v)}
            onNew={() => { go('lightup'); }}
            onOpenFile={() => fileInputRef.current?.click()}
            onPreview={() => setCanvasPreviewing(true)}
            previewing={canvasPreviewing}
            onOpenItem={openItemInPage}
          />
        );
      case 'sync':
        return (
          <SyncView
            sources={sources}
            busy={sourceBusy || syncBusy}
            error={error}
            onCreate={createSourceEntry}
            onTogglePause={toggleSourcePause}
            onDelete={removeSourceEntry}
            onSync={syncSourceEntry}
            onFrequency={setSourceFrequency}
            itemCount={items.length}
            contextCount={contexts.length}
            onExportJson={() => void runExport(buildJsonExport)}
            onExportMarkdown={() => void runExport(buildMarkdownBundle)}
            onExportAgent={() => void runExport(buildAgentContext)}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            prefs={prefs}
            onChange={updatePrefs}
            itemCount={items.length}
            contextCount={contexts.length}
            onExportJson={() => void runExport(buildJsonExport)}
            onExportMarkdown={() => void runExport(buildMarkdownBundle)}
            onExportAgent={() => void runExport(buildAgentContext)}
            onManageData={() => go('sync')}
            onReplayOnboarding={() => { setOnboardingReplay(true); go('start'); }}
            onClearAll={async () => {
              await clearSampleWorkspace();
              await refresh();
              await loadClusterIndex();
              await loadContextIndex();
            }}
            tagDefinitions={tagDefinitions}
            onCreateTagDefinition={createTagDef}
            llmConfig={llmConfig}
            onSaveLlm={saveLlmConfig}
            onCheckLlm={checkLlm}
            profileBlock={
              <TagEditor
                definitions={tagDefinitions.filter((d) => d.id === 'tag_user_profile')}
                values={tagValues.filter((v) => v.definition_id === 'tag_user_profile' && !v.item_id)}
                onAdd={(body) => addTagValue(body, false)}
                onConfirm={confirmTagValue}
                onDelete={removeTagValue}
              />
            }
          />
        );
      case 'user':
        return (
          <UserView
            prefs={prefs}
            onChange={updatePrefs}
            llmConfig={llmConfig}
            itemCount={items.length}
            contextCount={contexts.length}
            onOpenSettings={() => go('settings')}
            account={account}
            onExportBackup={() => void runExport(buildJsonExport)}
            onDeleteAccount={async () => {
              /* clear data first — items hold FKs to the user */
              await clearSampleWorkspace();
              if (account) await api.deleteUser(account.id);
              await refresh();
              await loadClusterIndex();
              await loadContextIndex();
              setAccount(null);
              go('start');
            }}
            profileBlock={
              <TagEditor
                definitions={tagDefinitions.filter((d) => d.id === 'tag_user_profile')}
                values={tagValues.filter((v) => v.definition_id === 'tag_user_profile' && !v.item_id)}
                onAdd={(body) => addTagValue(body, false)}
                onConfirm={confirmTagValue}
                onDelete={removeTagValue}
              />
            }
          />
        );
      case 'docs':
        return <DocsView />;
    }
  }

  return (
    <>
      {view === 'start' ? <DotGridBackground quality={prefs.quality} theme={prefs.theme} /> : null}
      <MosaicTransition playToken={mosaicToken} onDone={() => {}} />
      {!signedIn ? (
        <LoginPage
          onAuthed={async (userId, name) => {
            setSignedIn(true);
            try { localStorage.setItem('gsc.session', userId); } catch { /* session stays in-memory */ }
            setAccount({ id: userId, name, created_at: new Date().toISOString() });
            await loadTags();
          }}
        />
      ) : account && (onboarding || onboardingReplay) ? (
        <Onboarding
          onSkip={() => { setOnboarding(false); setOnboardingReplay(false); }}
          onLoadSample={async () => {
            await loadSampleWorkspace();
            await refresh();
            await loadClusterIndex();
            await loadContextIndex();
          }}
          onFinish={async (answers) => {
            setOnboarding(false);
            setOnboardingReplay(false);
            /* T102: profile answers → User Profile tag values (confirmed on add by human intent) */
            for (const value of answers) {
              try {
                await api.createTagValue({ definition_id: 'tag_user_profile', value, scope: 'global', confirmed: true });
              } catch { /* profile enrichment is best-effort */ }
            }
            await loadTags();
            go('start');
          }}
        />
      ) : null}
      <CommandPalette
        open={paletteOpen}
        items={paletteItems}
        onClose={() => setPaletteOpen(false)}
        onOpenHit={(hit) => {
          if (hit.group === 'clusters') { setClusterId(hit.id); markVisited(hit.id); go('clusters'); }
          else if (hit.group === 'contexts') { openContextInPage(hit.id); }
          else { openItemInPage(hit.id); }
        }}
        onCreateFromQuery={(q) => {
          void submitComposer({ text: q, mode: 'agent', model: 'MiMo', provider: 'Local' });
        }}
      />
      <div className={styles.app}>
        <Sidebar view={view} onNavigate={go} workspaceName={prefs.workspaceName} />
        <main className={styles.main}>
          {error && panel === 'none' ? <div className={styles.errorBar}>{error}</div> : null}
          {renderMain()}
        </main>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,text/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void importFileObject(file);
        }}
      />
    </>
  );
}

function MetadataInputs({
  form, type, onField,
}: { form: Record<string, string>; type: ItemType; onField: (key: string, value: string) => void }) {
  const t = useT();
  return (
    <>
      <Field label={t('form.title')}><input value={form.title ?? ''} onChange={(e) => onField('title', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label={t('form.domain')}>
          <select value={form.domain ?? 'knowledge'} onChange={(e) => onField('domain', e.target.value)}>
            {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label={t('detail.origin')}>
          <select value={form.origin ?? 'user'} onChange={(e) => onField('origin', e.target.value)}>
            {['user', 'import', 'agent'].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      </div>
      <Field label={t('form.sourceLabel')}><input value={form.source_label ?? ''} onChange={(e) => onField('source_label', e.target.value)} /></Field>
      <Field label={t('form.status')}>
        <select value={form.status ?? statusesFor(type)[0]} onChange={(e) => onField('status', e.target.value)}>
          {statusesFor(type).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
    </>
  );
}

function TypedInputs({
  type, form, items, onField, onFile,
}: {
  type: ItemType;
  form: Record<string, string>;
  items: ItemDTO[];
  onField: (key: string, value: string) => void;
  onFile?: (file?: File) => void;
}) {
  const { t, lang } = useI18n();
  return (
    <>
      {type === 'raw.filecontent' && onFile ? (
        <Field label={t('form.importFile')}><input type="file" accept=".txt,.md,text/*" onChange={(e) => void onFile(e.target.files?.[0])} /></Field>
      ) : null}
      {fieldKeysFor(type).filter((key) => key !== 'storage_ref' && key !== 'mime_type').map((key) => (
        <Field key={key} label={`${fieldLabel(key, lang)}${key === 'source_item_id' ? ` · ${t('form.required')}` : ''}`}>
          {key === 'source_item_id' ? (
            <select value={form[key] ?? ''} onChange={(e) => onField(key, e.target.value)}>
              <option value="">{t('form.selectRaw')}</option>
              {items.filter((x) => !isObjectType(x.type)).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
            </select>
          ) : isMultiline(key) ? (
            <textarea value={form[key] ?? ''} onChange={(e) => onField(key, e.target.value)} rows={key === 'content_text' ? 5 : 3} />
          ) : (
            <input value={form[key] ?? ''} onChange={(e) => onField(key, e.target.value)} />
          )}
        </Field>
      ))}
    </>
  );
}

function NewForm({
  type, form, items, onType, onField, onFile, onCancel, onSave,
}: {
  type: ItemType;
  form: Record<string, string>;
  items: ItemDTO[];
  error: string;
  onType: (type: ItemType) => void;
  onField: (key: string, value: string) => void;
  onFile: (file?: File) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const t = useT();
  return (
    <>
      <SectionLabel title={t('form.newItem')} />
      <Field label={t('form.type')}>
        <select value={type} onChange={(e) => onType(e.target.value as ItemType)}>
          <optgroup label={t('form.rawGroup')}>
            {ITEM_TYPES.filter((t) => !OBJECT_TYPES.includes(t as never)).map((t) => <option key={t} value={t}>{ITEM_LABELS[t]}</option>)}
          </optgroup>
          <optgroup label={t('form.objectGroup')}>
            {OBJECT_TYPES.map((t) => <option key={t} value={t}>{ITEM_LABELS[t]}</option>)}
          </optgroup>
        </select>
      </Field>
      <div className={styles.panelTitle}>{ITEM_LABELS[type]}</div>
      <MetadataInputs form={form} type={type} onField={onField} />
      <TypedInputs type={type} form={form} items={items} onField={onField} onFile={onFile} />
      <div className={styles.formActions}>
        <Button primary onClick={onSave}>{t('common.save')}</Button>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </>
  );
}

function Editor({
  item, form, onField, onCancel, onSave,
}: {
  item: ItemDTO;
  form: Record<string, string>;
  onField: (key: string, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const t = useT();
  return (
    <>
      <div className={styles.panelKicker}>{t('form.kickerEdit')} · {item.id}</div>
      <div className={styles.panelTitle}>{item.title}</div>
      <MetadataInputs form={form} type={item.type} onField={onField} />
      {isObjectType(item.type) ? <TypedInputs type={item.type} form={form} items={[]} onField={onField} /> : (
        <div className={styles.note}>{t('form.rawImmutable')}</div>
      )}
      <div className={styles.formActions}>
        <Button primary onClick={onSave}>{t('common.save')}</Button>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </>
  );
}

function Linker({
  form, targets, onField, onCancel, onSave,
}: {
  form: Record<string, string>;
  targets: ItemDTO[];
  onField: (key: string, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const t = useT();
  return (
    <>
      <div className={styles.panelKicker}>{t('form.kickerLink')}</div>
      <div className={styles.panelTitle}>{t('form.addRelation')}</div>
      <Field label={t('form.kind')}>
        <select value={form.kind} onChange={(e) => onField('kind', e.target.value)}>
          {RELATION_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </Field>
      <Field label={t('form.target')}>
        <select value={form.target} onChange={(e) => onField('target', e.target.value)}>
          <option value="">{t('form.select')}</option>
          {targets.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </Field>
      <Field label={t('form.noteOptional')}><input value={form.note ?? ''} onChange={(e) => onField('note', e.target.value)} /></Field>
      <div className={styles.note}>{t('form.stanceNote')}</div>
      <div className={styles.formActions}>
        <Button primary onClick={onSave}>{t('form.saveRelation')}</Button>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </>
  );
}

function ClusterForm({
  form, error, editing, onField, onCancel, onSave,
}: {
  form: Record<string, string>;
  error: string;
  editing: boolean;
  onField: (key: string, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const t = useT();
  return (
    <>
      <SectionLabel title={editing ? t('form.editCluster') : t('form.newCluster')} />
      {error ? <div className={styles.error}>{error}</div> : null}
      <Field label={t('form.title')}><input value={form.title ?? ''} onChange={(e) => onField('title', e.target.value)} /></Field>
      <Field label={t('form.description')}><textarea value={form.description ?? ''} onChange={(e) => onField('description', e.target.value)} rows={3} /></Field>
      <div className={styles.formActions}>
        <Button primary onClick={onSave}>{t('common.save')}</Button>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
      <div className={styles.note}>{t('form.clusterNote')}</div>
    </>
  );
}

function ContextForm({
  form, error, editing, onField, onCancel, onSave,
}: {
  form: Record<string, string>;
  error: string;
  editing: boolean;
  onField: (key: string, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const t = useT();
  return (
    <>
      <SectionLabel title={editing ? t('form.editContext') : t('form.newContext')} />
      {error ? <div className={styles.error}>{error}</div> : null}
      {(['title', 'subject', 'scope', 'purpose'] as const).map((key) => (
        <Field key={key} label={t(`form.${key}`)}>
          {key === 'purpose' ? (
            <textarea value={form[key] ?? ''} onChange={(e) => onField(key, e.target.value)} rows={3} />
          ) : (
            <input value={form[key] ?? ''} onChange={(e) => onField(key, e.target.value)} />
          )}
        </Field>
      ))}
      <div className={styles.formActions}>
        <Button primary onClick={onSave}>{t('common.save')}</Button>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
      <div className={styles.note}>{t('form.contextNote')}</div>
    </>
  );
}
