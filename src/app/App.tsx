import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, EmptyState, Field, SectionLabel, Subhead } from '../components/ui.tsx';
import {
  DOMAINS,
  ITEM_GLYPHS,
  ITEM_LABELS,
  ITEM_TYPES,
  OBJECT_TYPES,
  fieldKeysFor,
  isObjectType,
  statusesFor,
} from '../lib/items.ts';
import type { Domain, ItemDTO, ItemFields, ItemType, Origin, Status } from '../lib/items.ts';
import { RELATION_KINDS } from '../lib/relations.ts';
import type { RelationKind } from '../lib/relations.ts';
import * as api from '../services/api.ts';
import type { ItemDetailResponse } from '../services/api.ts';
import styles from './app.module.css';

type Panel = 'none' | 'new' | 'edit' | 'link';

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
  const [view, setView] = useState<'library' | 'contexts'>('library');
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [detail, setDetail] = useState<ItemDetailResponse | undefined>();
  const [panel, setPanel] = useState<Panel>('none');
  const [newType, setNewType] = useState<ItemType>('raw.document');
  const [form, setForm] = useState<Record<string, string>>({});
  const [filterType, setFilterType] = useState('all');
  const [filterDomain, setFilterDomain] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const result = await api.listItems({ type: filterType, domain: filterDomain, q: keyword });
    setItems(result.items);
  }, [filterType, filterDomain, keyword]);

  const loadDetail = useCallback(async (id: string) => {
    const result = await api.getItem(id);
    setDetail(result);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!selectedId) { setDetail(undefined); return; }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);
  useEffect(() => { setError(''); }, [panel]);

  const filtered = useMemo(() => items, [items]);
  const selected = detail?.item;

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
      if (!('item' in result)) throw new Error('Unexpected create response');
      setPanel('none');
      setSelectedId(result.item.id);
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

  async function onFile(file?: File) {
    if (!file) return;
    const content = await file.text();
    setForm((current) => ({ ...current, filename: file.name, content_text: content }));
  }

  const linkTargets = useMemo(() => {
    if (!selected) return [];
    const kind = form.kind as RelationKind;
    if (kind === 'derived_from') return items.filter((x) => !isObjectType(x.type) && x.id !== selected.id);
    if (kind === 'references') return items.filter((x) => x.id !== selected.id);
    return items.filter((x) => isObjectType(x.type) && x.id !== selected.id);
  }, [form.kind, items, selected]);

  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <div className={styles.brand}>GSC<span className={styles.proto}>LOCAL MVP · persisted</span></div>
        <nav className={styles.views}>
          <button className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}>Library</button>
          <button className={view === 'contexts' ? 'active' : ''} onClick={() => setView('contexts')}>Contexts</button>
        </nav>
        <div className={styles.spacer} />
        {view === 'library' ? <Button primary onClick={openNew}>New</Button> : null}
      </header>

      <main className={styles.main}>
        <section className={styles.colMain}>
          {view === 'contexts' ? (
            <>
              <SectionLabel title="Knowledge Context" count="Phase 04" />
              <EmptyState title="Context Views are not implemented yet." hint="Phase 04 assembles explicit member lists from stored items." />
            </>
          ) : panel === 'new' ? (
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
              <SectionLabel title="Information" count={`${filtered.length} items`} />
              <div className={styles.toolbar}>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">All types</option>
                  {ITEM_TYPES.map((type) => <option key={type} value={type}>{ITEM_LABELS[type]}</option>)}
                </select>
                <select value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)}>
                  <option value="all">All domains</option>
                  {DOMAINS.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
                </select>
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Filter by title or text" />
              </div>
              <div className={styles.list}>
                {filtered.length === 0 ? (
                  <EmptyState title="No items yet. Create a raw item or object." hint="Use New in the top bar." />
                ) : filtered.map((item) => (
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

        <aside className={styles.colDetail}>
          {error && panel !== 'new' ? <div className={styles.error}>{error}</div> : null}
          {!selected ? (
            <EmptyState title="No item selected." hint="Select a row in Library to inspect it." />
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
      </main>
    </div>
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
