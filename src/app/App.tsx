import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, EmptyState, Field, SectionLabel, Subhead } from '../components/ui.tsx';
import { DotGridBackground, MosaicTransition } from '../components/animations.tsx';
import { Sidebar } from './Sidebar.tsx';
import type { ViewId } from './Sidebar.tsx';
import { CanvasView, DocsView, OverviewView, SettingsView, SyncView } from '../views/views.tsx';
import {
  DOMAINS,
  ITEM_GLYPHS,
  ITEM_LABELS,
  ITEM_TYPES,
  OBJECT_TYPES,
  RAW_TYPES,
  fieldKeysFor,
  isObjectType,
  statusesFor,
} from '../lib/items.ts';
import type { Domain, ItemDTO, ItemFields, ItemType, Origin, Status } from '../lib/items.ts';
import { RELATION_KINDS } from '../lib/relations.ts';
import type { RelationKind } from '../lib/relations.ts';
import type { ComposerMode, ModelName, UiPrefs } from '../lib/prefs.ts';
import { loadPrefs, savePrefs } from '../lib/prefs.ts';
import {
  buildAgentContext,
  buildJsonExport,
  buildMarkdownBundle,
  downloadArtifact,
} from '../lib/sync.ts';
import type { ExportSource } from '../lib/sync.ts';
import * as api from '../services/api.ts';
import type { ContextDetailResponse, ItemDetailResponse } from '../services/api.ts';
import type { ContextDTO } from '../lib/contexts.ts';
import styles from './app.module.css';

type Panel = 'none' | 'new' | 'edit' | 'link' | 'new-context' | 'edit-context';

const fieldLabels: Record<string, string> = {
  content_text: 'Content', author: 'Author', locator: 'Locator', filename: 'Filename',
  storage_ref: 'Storage ref', mime_type: 'MIME type', captured_at: 'Captured at',
  measured_at: 'Measured at', definition: 'Definition', notes: 'Notes', claim: 'Claim',
  reasoning: 'Reasoning', name: 'Name', steps: 'Steps', intended_use: 'Intended use',
  statement: 'Statement', alternatives: 'Alternatives', consequences: 'Consequences',
  source_item_id: 'Source item',
};

const multiline = new Set(['content_text', 'definition', 'notes', 'claim', 'reasoning', 'steps', 'intended_use', 'statement', 'alternatives', 'consequences']);

const VIEW_TITLES: Partial<Record<ViewId, string>> = {
  recently: 'Recently',
  raw: 'Raw Information',
  objects: 'Structured Objects',
};

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
  const [view, setView] = useState<ViewId>('overview');
  const [mosaicToken, setMosaicToken] = useState(0);
  const [prefs, setPrefs] = useState<UiPrefs>(() => loadPrefs());
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [detail, setDetail] = useState<ItemDetailResponse | undefined>();
  const [panel, setPanel] = useState<Panel>('none');
  const [newType, setNewType] = useState<ItemType>('raw.document');
  const [form, setForm] = useState<Record<string, string>>({});
  const [filterType, setFilterType] = useState('all');
  const [filterDomain, setFilterDomain] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [contexts, setContexts] = useState<ContextDTO[]>([]);
  const [contextId, setContextId] = useState('');
  const [contextDetail, setContextDetail] = useState<ContextDetailResponse | undefined>();
  const [memberPick, setMemberPick] = useState('');
  const [error, setError] = useState('');
  const [canvasQuery, setCanvasQuery] = useState('');
  const [canvasPreviewing, setCanvasPreviewing] = useState(false);
  const [canvasPanel, setCanvasPanel] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const result = await api.listItems({});
    setItems(result.items);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const result = await api.getItem(id);
    setDetail(result);
  }, []);

  const loadContexts = useCallback(async () => {
    const result = await api.listContexts();
    setContexts(result.contexts);
    if (!contextId && result.contexts[0]) setContextId(result.contexts[0].id);
  }, [contextId]);

  const loadContext = useCallback(async (id: string) => {
    const result = await api.getContext(id);
    setContextDetail(result);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { void loadContexts(); }, [loadContexts]);
  useEffect(() => {
    if (!contextId) { setContextDetail(undefined); return; }
    void loadContext(contextId);
  }, [contextId, loadContext]);
  useEffect(() => {
    if (!selectedId) { setDetail(undefined); return; }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);
  useEffect(() => { setError(''); }, [panel]);

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

  const visible = useMemo(() => {
    let list = items;
    if (view === 'raw') list = list.filter((item) => item.type.startsWith('raw.'));
    else if (view === 'objects') list = list.filter((item) => item.type.startsWith('object.'));
    if (filterType !== 'all') list = list.filter((item) => item.type === filterType);
    if (filterDomain !== 'all') list = list.filter((item) => item.domain === filterDomain);
    const q = keyword.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => item.title.toLowerCase().includes(q)
        || Object.values(item.fields).some((v) => typeof v === 'string' && v.toLowerCase().includes(q)));
    }
    if (view === 'recently') {
      list = [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 20);
    }
    return list;
  }, [items, view, filterType, filterDomain, keyword]);

  const selected = detail?.item;

  function updatePrefs(next: UiPrefs) {
    setPrefs(next);
    savePrefs(next);
  }

  function go(next: ViewId) {
    if (next === view) return;
    if (prefs.pageTransition) setMosaicToken((t) => t + 1);
    setView(next);
  }

  function openNew() {
    setPanel('new');
    setNewType('raw.document');
    setForm({ title: '', domain: 'knowledge', origin: 'user', source_label: '' });
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
      const body = {
        type: newType,
        title: form.title,
        domain: form.domain,
        origin: form.origin,
        source_label: form.source_label,
        fields,
      };
      const result = await api.createItem(body);
      if (!result.item) throw new Error('Unexpected create response');
      const created = result.item;
      setPanel('none');
      setSelectedId(created.id);
      await refresh();
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

  function openNewContext() {
    setPanel('new-context');
    setForm({ title: 'Knowledge Context', subject: '', scope: '', purpose: '' });
  }

  function openEditContext() {
    if (!contextDetail) return;
    const c = contextDetail.context;
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
      await loadContexts();
      await loadContext(saved.id);
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
      setMemberPick('');
      await loadContext(contextId);
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
        setCanvasPanel(true);
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
      setSelectedId(result.item.id);
      go('recently');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Capture failed');
    }
  }

  async function collectExport(): Promise<ExportSource> {
    const details = await Promise.all(items.map((item) => api.getItem(item.id)));
    const ctxList = await api.listContexts();
    const ctxDetails = await Promise.all(ctxList.contexts.map(async (c) => (await api.getContext(c.id)).context));
    return { details, contexts: ctxDetails, exportedAt: new Date().toISOString() };
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

  const linkTargets = useMemo(() => {
    if (!selected) return [];
    const kind = form.kind as RelationKind;
    if (kind === 'derived_from') return items.filter((x) => !isObjectType(x.type) && x.id !== selected.id);
    if (kind === 'references') return items.filter((x) => x.id !== selected.id);
    return items.filter((x) => isObjectType(x.type) && x.id !== selected.id);
  }, [form.kind, items, selected]);

  const typeOptions: readonly ItemType[] = view === 'raw' ? RAW_TYPES : view === 'objects' ? OBJECT_TYPES : ITEM_TYPES;
  const showDetailAside = view === 'raw' || view === 'objects' || view === 'recently' || view === 'contexts' || (view === 'canvas' && canvasPanel);

  function renderDataView() {
    return (
      <div className={styles.split}>
        <section className={styles.colMain}>
          {panel === 'new' ? (
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
            />
          ) : (
            <>
              <div className={styles.titleRow}>
                <SectionLabel title={VIEW_TITLES[view] ?? 'Information'} count={`${visible.length} items`} />
                <Button primary onClick={openNew}>New</Button>
              </div>
              <div className={styles.toolbar}>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">All types</option>
                  {typeOptions.map((type) => <option key={type} value={type}>{ITEM_LABELS[type]}</option>)}
                </select>
                <select value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)}>
                  <option value="all">All domains</option>
                  {DOMAINS.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
                </select>
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Filter by title or text" />
              </div>
              <div className={styles.list}>
                {visible.length === 0 ? (
                  <EmptyState title="No items yet. Create a raw item or object." hint="Use New in the view header." />
                ) : visible.map((item) => (
                  <button
                    key={item.id}
                    className={`${styles.row} ${selectedId === item.id ? styles.selected : ''}`}
                    onClick={() => { setSelectedId(item.id); setPanel('none'); }}
                  >
                    <span className={styles.glyph}>{ITEM_GLYPHS[item.type]}</span>
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>{item.title}</span>
                      <span className={styles.rowMeta}>{ITEM_LABELS[item.type]} · {item.domain} · {item.id}</span>
                    </span>
                    <span className={styles.rowStatus}>{item.status}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
        {renderDetailAside()}
      </div>
    );
  }

  function renderDetailAside() {
    if (!showDetailAside) return null;
    return (
      <aside className={styles.colDetail}>
        {error && panel !== 'new' && panel !== 'new-context' && panel !== 'edit-context' ? <div className={styles.error}>{error}</div> : null}
        {!selected ? (
          <EmptyState
            title="No item selected."
            hint={view === 'contexts' ? 'Click a member row to inspect it.' : 'Select a row to inspect it.'}
          />
        ) : panel === 'edit' ? (
          <Editor
            item={selected}
            form={form}
            onField={setField}
            onCancel={() => setPanel('none')}
            onSave={() => void saveEdit()}
          />
        ) : panel === 'link' ? (
          <Linker
            form={form}
            targets={linkTargets}
            onField={setField}
            onCancel={() => setPanel('none')}
            onSave={() => void saveLink()}
          />
        ) : (
          <Detail
            detail={detail}
            onEdit={openEdit}
            onLink={openLink}
            onOpen={(id) => { setSelectedId(id); setPanel('none'); }}
          />
        )}
      </aside>
    );
  }

  function renderMain() {
    switch (view) {
      case 'overview':
        return (
          <OverviewView
            onSubmit={submitComposer}
            onCanvas={() => go('canvas')}
            onOpenFile={() => fileInputRef.current?.click()}
          />
        );
      case 'canvas':
        return (
          <div className={styles.split} style={canvasPanel ? undefined : { gridTemplateColumns: '1fr' }}>
            <div className={styles.body} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <CanvasView
                items={items}
                query={canvasQuery}
                onQuery={setCanvasQuery}
                selectedId={selectedId}
                panelOpen={canvasPanel}
                onTogglePanel={() => setCanvasPanel((open) => !open)}
                onNew={() => { go('raw'); openNew(); }}
                onOpenFile={() => fileInputRef.current?.click()}
                onPreview={() => setCanvasPreviewing(true)}
                previewing={canvasPreviewing}
                onOpenItem={(id) => { setSelectedId(id); setPanel('none'); setCanvasPanel(true); }}
              />
            </div>
            {canvasPanel ? renderDetailAside() : null}
          </div>
        );
      case 'contexts':
        return (
          <div className={styles.split}>
            <section className={styles.colMain}>
              {panel === 'new-context' || panel === 'edit-context' ? (
                <ContextForm
                  form={form}
                  error={error}
                  editing={panel === 'edit-context'}
                  onField={setField}
                  onCancel={() => setPanel('none')}
                  onSave={() => void saveContext()}
                />
              ) : (
                <>
                  <div className={styles.titleRow}>
                    <SectionLabel title="Contexts" count={`${contexts.length} views`} />
                    <Button primary onClick={openNewContext}>New context</Button>
                  </div>
                  <ContextPanel
                    contexts={contexts}
                    selectedId={contextId}
                    detail={contextDetail}
                    items={items}
                    memberPick={memberPick}
                    error={error}
                    onSelect={(id) => { setContextId(id); setMemberPick(''); }}
                    onEdit={openEditContext}
                    onPick={setMemberPick}
                    onAdd={(id) => void changeMember('add', id)}
                    onRemove={(id) => void changeMember('remove', id)}
                    onOpenItem={(id) => { setSelectedId(id); setPanel('none'); }}
                  />
                </>
              )}
            </section>
            {renderDetailAside()}
          </div>
        );
      case 'sync':
        return (
          <SyncView
            itemCount={items.length}
            contextCount={contexts.length}
            onExportJson={() => void runExport(buildJsonExport)}
            onExportMarkdown={() => void runExport(buildMarkdownBundle)}
            onExportAgent={() => void runExport(buildAgentContext)}
            busy={syncBusy}
          />
        );
      case 'settings':
        return <SettingsView prefs={prefs} onChange={updatePrefs} />;
      case 'docs':
        return <DocsView />;
      default:
        return renderDataView();
    }
  }

  return (
    <>
      <DotGridBackground quality={prefs.quality} />
      <MosaicTransition playToken={mosaicToken} onDone={() => {}} />
      <div className={styles.app}>
        <Sidebar view={view} onNavigate={go} />
        <main className={styles.main}>{renderMain()}</main>
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
      <div className={styles.error} style={{ display: error ? undefined : 'none' }}>{error}</div>
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

function ContextPanel({
  contexts, selectedId, detail, items, memberPick, error,
  onSelect, onEdit, onPick, onAdd, onRemove, onOpenItem,
}: {
  contexts: ContextDTO[];
  selectedId: string;
  detail?: ContextDetailResponse;
  items: ItemDTO[];
  memberPick: string;
  error: string;
  onSelect: (id: string) => void;
  onEdit: () => void;
  onPick: (id: string) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenItem: (id: string) => void;
}) {
  const context = detail?.context;
  const ids = context?.member_ids ?? [];
  const candidates = items.filter((item) => !ids.includes(item.id));
  return (
    <>
      {error ? <div className={styles.error}>{error}</div> : null}
      <div className={styles.list}>
        {contexts.length === 0 ? (
          <EmptyState title="No context views yet." hint="Use New context in the view header." />
        ) : contexts.map((c) => (
          <button
            key={c.id}
            className={`${styles.row} ${selectedId === c.id ? styles.selected : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <span className={styles.glyph}>CTX</span>
            <span className={styles.rowMain}>
              <span className={styles.rowTitle}>{c.title}</span>
              <span className={styles.rowMeta}>{c.subject} · {c.id}</span>
            </span>
          </button>
        ))}
      </div>
      {context ? (
        <>
          <div className={styles.panelKicker}>{context.id}</div>
          <div className={styles.panelTitle}>{context.title}</div>
          <div className={styles.actions}>
            <Button small onClick={onEdit}>Edit</Button>
          </div>
          <div className={styles.ctxMeta}>
            <span>Subject</span><span>{context.subject}</span>
            <span>Scope</span><span>{context.scope}</span>
            <span>Purpose</span><span>{context.purpose}</span>
          </div>
          <Subhead title="Members · explicit selection" count={ids.length} />
          <div className={styles.list}>
            {ids.length === 0 ? <div className={styles.empty}>No members yet.</div> : ids.map((id) => {
              const item = items.find((x) => x.id === id);
              return (
                <div key={id} className={styles.row}>
                  <span className={styles.glyph}>{item ? ITEM_GLYPHS[item.type] : '??'}</span>
                  <button className={styles.rowMain} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', color: 'inherit', cursor: 'pointer' }} onClick={() => onOpenItem(id)}>
                    <span className={styles.rowTitle}>{item?.title ?? id}</span>
                    <span className={styles.rowMeta}>{item ? `${ITEM_LABELS[item.type]} · ${id}` : id}</span>
                  </button>
                  <button className={styles.ctxRemove} onClick={() => onRemove(id)}>Remove</button>
                </div>
              );
            })}
          </div>
          <Subhead title="Add member" />
          <div className={styles.stackRow}>
            <select value={memberPick} onChange={(e) => onPick(e.target.value)}>
              <option value="">— select an item —</option>
              {candidates.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <Button small onClick={() => memberPick && onAdd(memberPick)}>Add</Button>
          </div>
          <div className={styles.note}>Explicit membership only. No tags, inference or retrieval.</div>
        </>
      ) : (
        <EmptyState title="No context selected." hint="Select a context view above." />
      )}
    </>
  );
}

function Detail({
  detail, onEdit, onLink, onOpen,
}: {
  detail?: ItemDetailResponse;
  onEdit: () => void;
  onLink: () => void;
  onOpen: (id: string) => void;
}) {
  if (!detail) return <EmptyState title="No item selected." hint="Select a row to inspect it." />;
  const { item, relations, events } = detail;
  const derived = relations.outgoing.find((r) => r.kind === 'derived_from');
  const values = Object.entries(item.fields).filter(([, v]) => typeof v === 'string' && v.trim());
  const relationRow = (r: { id: string; kind: RelationKind; to_id: string; from_id: string; note: string }, incoming: boolean) => {
    const targetId = incoming ? r.from_id : r.to_id;
    const prefix = r.kind === 'supports' ? '+ ' : r.kind === 'challenges' ? '− ' : '';
    return (
      <div key={r.id} className={styles.relRow}>
        <button className={styles.relKind} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', color: 'inherit', cursor: 'pointer' }} onClick={() => onOpen(targetId)}>
          {prefix}{r.kind}
        </button>
        <span className={styles.relTitle}>{targetId}</span>
        {r.note ? <span className={styles.relNote}>{r.note}</span> : null}
      </div>
    );
  };
  return (
    <>
      <div className={styles.panelKicker}>{item.id}</div>
      <div className={styles.panelTitle}>{item.title}</div>
      <div className={styles.rowMeta}>{ITEM_LABELS[item.type]} · {item.status}</div>
      <div className={styles.actions}>
        <Button small onClick={onEdit}>Edit</Button>
        <Button small onClick={onLink}>Link</Button>
      </div>
      {values.map(([key, value]) => (
        <div className={styles.fieldBlock} key={key}>
          <div className={styles.fieldLabel}>{fieldLabels[key] ?? key}</div>
          <div className={styles.fieldValue}>{value}</div>
        </div>
      ))}
      <Subhead title="Provenance" />
      <div className={styles.fieldBlock}>
        <div className={styles.fieldLabel}>Origin</div>
        <div className={styles.fieldValue}>{item.origin}{item.source_label ? ` · ${item.source_label}` : ''}</div>
      </div>
      <div className={styles.fieldBlock}>
        <div className={styles.fieldLabel}>Derived from</div>
        <div className={`${styles.fieldValue} ${derived ? '' : styles.muted}`}>
          {derived ? <button style={{ background: 'none', border: 0, padding: 0, color: 'inherit', cursor: 'pointer' }} onClick={() => onOpen(derived.to_id)}>{derived.to_id}</button> : 'Independently created'}
        </div>
      </div>
      <div className={styles.fieldBlock}>
        <div className={styles.fieldLabel}>Created / updated</div>
        <div className={styles.fieldValue}>{item.created_at} · {item.updated_at}</div>
      </div>
      <Subhead title="Outgoing" count={relations.outgoing.length} />
      {relations.outgoing.map((r) => relationRow(r, false))}
      <Subhead title="Incoming" count={relations.incoming.length} />
      {relations.incoming.map((r) => relationRow(r, true))}
      <div className={styles.note}>Stance only; not verification.</div>
      <Subhead title="History" count={events.length} />
      {events.map((event) => (
        <div className={styles.histRow} key={event.id}>
          <span className={styles.histTime}>{event.at}</span>
          <span className={styles.histDetail}>{event.actor} · {event.action} — {event.detail}</span>
        </div>
      ))}
    </>
  );
}
