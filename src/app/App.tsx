import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Field, SectionLabel } from '../components/ui.tsx';
import { DotGridBackground, MosaicTransition } from '../components/animations.tsx';
import { Sidebar } from './Sidebar.tsx';
import type { ViewId } from './Sidebar.tsx';
import { CanvasView, DocsView, ExportView, SyncView } from '../views/views.tsx';
import type { SourceDTO, SourceFrequency, SourceKind } from '../lib/sources.ts';
import { OverviewPage, RecentlyPage, SettingsPage, StartView } from '../views/pages.tsx';
import type { ContextIndexEntry } from '../views/pages.tsx';
import { ContextCollection, ObjectCollection, RawCollection, ClusterCollection } from '../views/collections.tsx';
import { ContextDetailView, ObjectDetailView, RawDetailView, ClusterDetailView } from '../views/detail.tsx';
import type { ClusterIndexEntry } from '../views/detail.tsx';
import { LightUpView } from '../views/lightup.tsx';
import type { SegmentRow } from '../views/lightup.tsx';
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

const fieldLabels: Record<string, string> = {
  content_text: 'Content', author: 'Author', locator: 'Locator', filename: 'Filename',
  storage_ref: 'Storage ref', mime_type: 'MIME type', captured_at: 'Captured at',
  measured_at: 'Measured at', definition: 'Definition', notes: 'Notes', claim: 'Claim',
  reasoning: 'Reasoning', name: 'Name', steps: 'Steps', intended_use: 'Intended use',
  statement: 'Statement', alternatives: 'Alternatives', consequences: 'Consequences',
  source_item_id: 'Source item',
};

const multiline = new Set(['content_text', 'definition', 'notes', 'claim', 'reasoning', 'steps', 'intended_use', 'statement', 'alternatives', 'consequences']);

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
  const [view, setView] = useState<ViewId>('start');
  const [mosaicToken, setMosaicToken] = useState(0);
  const [prefs, setPrefs] = useState<UiPrefs>(() => loadPrefs());
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [contexts, setContexts] = useState<ContextIndexEntry[]>([]);
  const [clusters, setClusters] = useState<ClusterIndexEntry[]>([]);
  const [clusterId, setClusterId] = useState('');
  const [relationIndex, setRelationIndex] = useState<Record<string, { outgoing: { to_id: string; kind: RelationKind }[]; incoming: { from_id: string; kind: RelationKind }[] }>>({});
  const [visits, setVisits] = useState<Record<string, string | undefined>>(() => visitMap());
  const [selectedId, setSelectedId] = useState<string>('');
  const [detail, setDetail] = useState<ItemDetailResponse | undefined>();
  const [contextId, setContextId] = useState('');
  const [panel, setPanel] = useState<Panel>('none');
  const [newType, setNewType] = useState<ItemType>('raw.document');
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [canvasQuery, setCanvasQuery] = useState('');
  const [canvasPreviewing, setCanvasPreviewing] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [lightupBusy, setLightupBusy] = useState(false);
  const [sources, setSources] = useState<SourceDTO[]>([]);
  const [sourceBusy, setSourceBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const result = await api.listItems({});
    setItems(result.items);
  }, []);

  const loadContextIndex = useCallback(async () => {
    const list = await api.listContexts();
    const entries = await Promise.all(list.contexts.map(async (c) => (await api.getContext(c.id)).context));
    setContexts(entries);
  }, []);

  const loadClusterIndex = useCallback(async () => {
    const list = await api.listClusters();
    const entries = await Promise.all(list.clusters.map(async (c) => (await api.getCluster(c.id)).cluster));
    setClusters(entries);
  }, []);

  const loadSources = useCallback(async () => {
    const list = await api.listSources();
    setSources(list.sources);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const result = await api.getItem(id);
    setDetail(result);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { void loadContextIndex(); }, [loadContextIndex]);
  useEffect(() => { void loadClusterIndex(); }, [loadClusterIndex]);
  useEffect(() => { void loadSources(); }, [loadSources]);
  useEffect(() => {
    if (!selectedId) { setDetail(undefined); return; }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);
  useEffect(() => { setError(''); }, [panel]);
  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
  }, [prefs.theme]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const objectItems = items.filter((i) => i.type.startsWith('object.'));
      const entries = await Promise.all(objectItems.map(async (i) => {
        const d = await api.getItem(i.id);
        return [i.id, d.relations] as const;
      }));
      if (alive) setRelationIndex(Object.fromEntries(entries));
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

  function updatePrefs(next: UiPrefs) {
    setPrefs(next);
    savePrefs(next);
  }

  function go(next: ViewId) {
    if (next === view) return;
    if (prefs.pageTransition) setMosaicToken((t) => t + 1);
    setView(next);
  }

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

  function openLink() {
    setPanel('link');
    setForm({ kind: isObjectType(selected?.type ?? 'raw.document') ? 'derived_from' : 'related_to', target: '', note: '' });
  }

  function setField(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveNew() {
    try {
      setError('');
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
      await refresh();
      selectItem(result.item.id);
      go(result.item.type.startsWith('raw.') ? 'raw' : 'objects');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  }

  async function saveEdit() {
    if (!selected) return;
    try {
      setError('');
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
      setPanel('none');
      await loadDetail(selected.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function saveLink() {
    if (!selected) return;
    try {
      setError('');
      const result = await api.createRelation({
        kind: form.kind,
        from_id: selected.id,
        to_id: form.target,
        note: form.note,
      });
      if (!('relation' in result)) throw new Error('Unexpected relation response');
      setPanel('none');
      await loadDetail(selected.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Link failed');
    }
  }

  async function deleteSelected() {
    if (!selected) return;
    if (!window.confirm('Delete this item? Its relations and history will be removed.')) return;
    try {
      setError('');
      await api.deleteItem(selected.id);
      setSelectedId('');
      setPanel('none');
      await refresh();
      await loadContextIndex();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
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
    try {
      setError('');
      const body = { title: form.title, description: form.description };
      const result = panel === 'edit-cluster' && clusterId
        ? await api.updateCluster(clusterId, body)
        : await api.createCluster(body);
      if (!result.cluster) throw new Error('Unexpected cluster response');
      const saved = result.cluster;
      setPanel('none');
      setClusterId(saved.id);
      await loadClusterIndex();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cluster save failed');
    }
  }

  async function changeClusterMember(action: 'add' | 'remove', itemId: string) {
    if (!clusterId) return;
    try {
      setError('');
      await (action === 'add'
        ? api.addClusterMember(clusterId, itemId)
        : api.removeClusterMember(clusterId, itemId));
      await loadClusterIndex();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Member update failed');
    }
  }

  async function deleteSelectedCluster() {
    if (!selectedCluster) return;
    if (!window.confirm('Delete this cluster? Members keep their own content.')) return;
    try {
      setError('');
      await api.deleteCluster(selectedCluster.id);
      setClusterId('');
      await loadClusterIndex();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  function openEditContext() {
    const c = selectedContext;
    if (!c) return;
    setPanel('edit-context');
    setForm({ title: c.title, subject: c.subject, scope: c.scope, purpose: c.purpose });
  }

  async function saveContext() {
    try {
      setError('');
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
      const saved = result.context;
      setPanel('none');
      setContextId(saved.id);
      await loadContextIndex();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Context save failed');
    }
  }

  async function changeMember(action: 'add' | 'remove', itemId: string) {
    if (!contextId) return;
    try {
      setError('');
      const result = action === 'add'
        ? await api.addContextMember(contextId, itemId)
        : await api.removeContextMember(contextId, itemId);
      if (!result.context) throw new Error('Unexpected member response');
      await loadContextIndex();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Member update failed');
    }
  }

  async function onFile(file?: File) {
    if (!file) return;
    const content = await file.text();
    setForm((current) => ({ ...current, filename: file.name, content_text: content }));
  }

  async function importFileObject(file: File) {
    try {
      setError('');
      const content = await file.text();
      const result = await api.createItem({
        type: 'raw.filecontent',
        title: file.name,
        domain: 'artifact',
        origin: 'import',
        source_label: 'file-import',
        fields: { filename: file.name, content_text: content },
      });
      await refresh();
      if (result.item) {
        setSelectedId(result.item.id);
        setCanvasPreviewing(true);
      }
      if (view !== 'canvas') go('canvas');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    }
  }

  async function submitComposer(payload: { text: string; mode: ComposerMode; model: ModelName; provider: string }) {
    try {
      setError('');
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
      await refresh();
      go('recently');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Capture failed');
    }
  }

  async function collectExport(): Promise<ExportSource> {
    const details = await Promise.all(items.map((item) => api.getItem(item.id)));
    return { details, contexts, exportedAt: new Date().toISOString() };
  }

  async function persistSegments(rows: SegmentRow[], sourceLabel: string) {
    setLightupBusy(true);
    try {
      setError('');
      let firstId = '';
      for (const row of rows) {
        const fields: ItemFields = { content_text: row.content };
        if (row.type === 'raw.message') fields.author = row.author || 'extracted';
        if (row.type === 'raw.evidence') fields.locator = row.locator || sourceLabel;
        if (row.type === 'raw.filecontent') fields.filename = row.title;
        const result = await api.createItem({
          type: row.type,
          title: row.title || 'Untitled',
          domain: 'knowledge',
          origin: 'user',
          source_label: sourceLabel,
          fields,
        });
        if (!firstId && result.item) firstId = result.item.id;
      }
      await refresh();
      if (firstId) {
        selectItem(firstId);
        go('raw');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Light Up failed');
    } finally {
      setLightupBusy(false);
    }
  }

  async function runExport(build: (source: ExportSource) => { filename: string; mime: string; content: string }) {
    setSyncBusy(true);
    try {
      const source = await collectExport();
      downloadArtifact(build(source));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setSyncBusy(false);
    }
  }

  async function createSourceEntry(body: { kind: SourceKind; label: string; scope: string; frequency: SourceFrequency; token: string }) {
    setSourceBusy(true);
    try {
      setError('');
      await api.createSource(body);
      await loadSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connect failed');
    } finally {
      setSourceBusy(false);
    }
  }

  async function toggleSourcePause(source: SourceDTO) {
    try {
      setError('');
      await api.updateSource(source.id, { status: source.status === 'paused' ? 'connected' : 'paused' });
      await loadSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function removeSourceEntry(source: SourceDTO) {
    if (!window.confirm(`断开 ${source.label}？已同步的条目保留。`)) return;
    try {
      setError('');
      await api.deleteSource(source.id);
      await loadSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed');
    }
  }

  async function syncSourceEntry(source: SourceDTO) {
    setSourceBusy(true);
    try {
      setError('');
      await api.syncSource(source.id);
      await loadSources();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
      await loadSources();
    } finally {
      setSourceBusy(false);
    }
  }

  async function setSourceFrequency(source: SourceDTO, frequency: SourceFrequency) {
    try {
      await api.updateSource(source.id, { frequency });
      await loadSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
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
        onBack: () => setSelectedId(''),
        onEdit: openEdit,
        onDelete: () => void deleteSelected(),
        onOpenItem: openItemInPage,
        onOpenContext: openContextInPage,
      };
      return kind === 'raw' ? <RawDetailView {...shared} /> : <ObjectDetailView {...shared} />;
    }
    return kind === 'raw' ? (
      <RawCollection items={items} onNew={() => go('lightup')} onSelect={selectItem} />
    ) : (
      <ObjectCollection items={items} sourceCounts={sourceCounts} onNew={() => openNew('object.concept')} onSelect={selectItem} />
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
    switch (view) {
      case 'start':
        return (
          <StartView
            onSubmit={submitComposer}
            onCanvas={() => go('canvas')}
            onOpenFile={() => fileInputRef.current?.click()}
            onLightUp={() => go('lightup')}
          />
        );
      case 'overview':
        return (
          <OverviewPage
            items={items}
            contexts={contexts}
            clusters={clusters}
            onNew={() => go('lightup')}
            onOpenItem={openItemInPage}
            onOpenContext={openContextInPage}
            onOpenCluster={(id) => { setClusterId(id); markVisited(id); go('clusters'); }}
            onSeeAll={() => go('raw')}
          />
        );
      case 'recently':
        return (
          <RecentlyPage
            items={items}
            contexts={contexts}
            visits={visits}
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
          <LightUpView
            manualContent={renderLightUpManual()}
            onPreviewUrl={async (u) => {
              const result = await api.ingestUrl(u);
              return { title: result.title, text: result.text, url: result.url };
            }}
            onSubmitRows={persistSegments}
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
              onBack={() => setClusterId('')}
              onEdit={openEditCluster}
              onDelete={() => void deleteSelectedCluster()}
              onAdd={(id) => void changeClusterMember('add', id)}
              onRemove={(id) => void changeClusterMember('remove', id)}
              onOpenItem={openItemInPage}
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
            busy={sourceBusy}
            error={error}
            onCreate={createSourceEntry}
            onTogglePause={toggleSourcePause}
            onDelete={removeSourceEntry}
            onSync={syncSourceEntry}
            onFrequency={setSourceFrequency}
          />
        );
      case 'export':
        return (
          <ExportView
            itemCount={items.length}
            contextCount={contexts.length}
            onExportJson={() => void runExport(buildJsonExport)}
            onExportMarkdown={() => void runExport(buildMarkdownBundle)}
            onExportAgent={() => void runExport(buildAgentContext)}
            busy={syncBusy}
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
          />
        );
      case 'docs':
        return <DocsView />;
    }
  }

  return (
    <>
      <DotGridBackground quality={prefs.quality} theme={prefs.theme} />
      <MosaicTransition playToken={mosaicToken} onDone={() => {}} />
      <div className={styles.app}>
        <Sidebar view={view} onNavigate={go} />
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
  return (
    <>
      <Field label="Title"><input value={form.title ?? ''} onChange={(e) => onField('title', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="Domain">
          <select value={form.domain ?? 'knowledge'} onChange={(e) => onField('domain', e.target.value)}>
            {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Origin">
          <select value={form.origin ?? 'user'} onChange={(e) => onField('origin', e.target.value)}>
            {['user', 'import', 'agent'].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Source label (optional)"><input value={form.source_label ?? ''} onChange={(e) => onField('source_label', e.target.value)} /></Field>
      <Field label="Status">
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
  return (
    <>
      {type === 'raw.filecontent' && onFile ? (
        <Field label="Import text file"><input type="file" accept=".txt,.md,text/*" onChange={(e) => void onFile(e.target.files?.[0])} /></Field>
      ) : null}
      {fieldKeysFor(type).filter((key) => key !== 'storage_ref' && key !== 'mime_type').map((key) => (
        <Field key={key} label={`${fieldLabels[key] ?? key}${key === 'source_item_id' ? ' · required' : ''}`}>
          {key === 'source_item_id' ? (
            <select value={form[key] ?? ''} onChange={(e) => onField(key, e.target.value)}>
              <option value="">— select raw item —</option>
              {items.filter((x) => !isObjectType(x.type)).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
            </select>
          ) : multiline.has(key) ? (
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
  type, form, items, error, onType, onField, onFile, onCancel, onSave,
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
  return (
    <>
      <SectionLabel title="New item" />
      <Field label="Type">
        <select value={type} onChange={(e) => onType(e.target.value as ItemType)}>
          <optgroup label="Raw information">
            {ITEM_TYPES.filter((t) => !OBJECT_TYPES.includes(t as never)).map((t) => <option key={t} value={t}>{ITEM_LABELS[t]}</option>)}
          </optgroup>
          <optgroup label="Structured objects">
            {OBJECT_TYPES.map((t) => <option key={t} value={t}>{ITEM_LABELS[t]}</option>)}
          </optgroup>
        </select>
      </Field>
      <div className={styles.panelTitle}>{ITEM_LABELS[type]}</div>
      <MetadataInputs form={form} type={type} onField={onField} />
      <TypedInputs type={type} form={form} items={items} onField={onField} onFile={onFile} />
      <div className={styles.formActions}>
        <Button primary onClick={onSave}>Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
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
  return (
    <>
      <div className={styles.panelKicker}>EDIT · {item.id}</div>
      <div className={styles.panelTitle}>{item.title}</div>
      <MetadataInputs form={form} type={item.type} onField={onField} />
      {isObjectType(item.type) ? <TypedInputs type={item.type} form={form} items={[]} onField={onField} /> : (
        <div className={styles.note}>Raw item content is immutable. Title, source label and status are editable.</div>
      )}
      <div className={styles.formActions}>
        <Button primary onClick={onSave}>Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
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
  return (
    <>
      <div className={styles.panelKicker}>LINK</div>
      <div className={styles.panelTitle}>Add relation</div>
      <Field label="Kind">
        <select value={form.kind} onChange={(e) => onField('kind', e.target.value)}>
          {RELATION_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </Field>
      <Field label="Target">
        <select value={form.target} onChange={(e) => onField('target', e.target.value)}>
          <option value="">— select —</option>
          {targets.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </Field>
      <Field label="Note (optional)"><input value={form.note ?? ''} onChange={(e) => onField('note', e.target.value)} /></Field>
      <div className={styles.note}>Stance labels are text only. They do not change status or verify a claim.</div>
      <div className={styles.formActions}>
        <Button primary onClick={onSave}>Save relation</Button>
        <Button onClick={onCancel}>Cancel</Button>
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
  return (
    <>
      <SectionLabel title={editing ? 'Edit cluster' : 'New cluster'} />
      {error ? <div className={styles.error}>{error}</div> : null}
      <Field label="Title"><input value={form.title ?? ''} onChange={(e) => onField('title', e.target.value)} /></Field>
      <Field label="Description"><textarea value={form.description ?? ''} onChange={(e) => onField('description', e.target.value)} rows={3} /></Field>
      <div className={styles.formActions}>
        <Button primary onClick={onSave}>Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
      <div className={styles.note}>A Cluster groups related Chunks. Members are added after creation; a Chunk may belong to multiple Clusters.</div>
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
  return (
    <>
      <SectionLabel title={editing ? 'Edit context' : 'New context'} />
      {error ? <div className={styles.error}>{error}</div> : null}
      {(['title', 'subject', 'scope', 'purpose'] as const).map((key) => (
        <Field key={key} label={key}>
          {key === 'purpose' ? (
            <textarea value={form[key] ?? ''} onChange={(e) => onField(key, e.target.value)} rows={3} />
          ) : (
            <input value={form[key] ?? ''} onChange={(e) => onField(key, e.target.value)} />
          )}
        </Field>
      ))}
      <div className={styles.formActions}>
        <Button primary onClick={onSave}>Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
      <div className={styles.note}>Context membership is edited after the context is created.</div>
    </>
  );
}
