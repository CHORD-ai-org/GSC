import type { ReactNode } from 'react';
import { Button, Subhead } from '../components/ui.tsx';
import { ITEM_GLYPHS, ITEM_LABELS, OBJECT_TYPES } from '../lib/items.ts';
import type { ItemDTO, ItemFields, ItemType } from '../lib/items.ts';
import type { ClusterDTO } from '../lib/clusters.ts';
import type { ItemDetailResponse } from '../services/api.ts';
import type { ContextIndexEntry } from './pages.tsx';
import styles from './views.module.css';

export type ClusterIndexEntry = ClusterDTO & { member_ids: string[] };

const fieldLabels: Record<string, string> = {
  content_text: 'Content', author: 'Author', locator: 'Locator', filename: 'Filename',
  storage_ref: 'Storage ref', mime_type: 'MIME type', captured_at: 'Captured at',
  measured_at: 'Measured at', definition: 'Definition', notes: 'Notes', claim: 'Claim',
  reasoning: 'Reasoning', name: 'Name', steps: 'Steps', intended_use: 'Intended use',
  statement: 'Statement', alternatives: 'Alternatives', consequences: 'Consequences',
  source_item_id: 'Source item',
};

const definitionFields: Record<string, string[]> = {
  'object.concept': ['definition'],
  'object.hypothesis': ['claim'],
  'object.methodology': ['name', 'steps'],
  'object.decision': ['statement', 'reasoning'],
  'object.evidencereference': ['claim'],
};

function isObject(type: ItemType): boolean {
  return (OBJECT_TYPES as readonly string[]).includes(type);
}

function DetailShell({
  kicker, title, subtitle, onBack, actions, children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  onBack: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.detailPage}>
      <button type="button" className={styles.backButton} onClick={onBack}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9.5 3.5L5 8l4.5 4.5" /></svg>
        Back
      </button>
      <div className={styles.detailKicker}>{kicker}</div>
      <div className={styles.detailTitleRow}>
        <h1 className={styles.detailTitle}>{title}</h1>
        {actions ? <div className={styles.detailActions}>{actions}</div> : null}
      </div>
      {subtitle ? <div className={styles.detailSubtitle}>{subtitle}</div> : null}
      {children}
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.block}>
      <h2 className={styles.blockTitle}>{title}</h2>
      {children}
    </section>
  );
}

function Kvs({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div className={styles.kv}>
      {rows.map(([label, value]) => (
        <div className={styles.kvRow} key={label}>
          <span className={styles.kvLabel}>{label}</span>
          <span className={styles.kvValue}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function contextsContaining(index: ContextIndexEntry[], id: string): ContextIndexEntry[] {
  return index.filter((c) => c.member_ids.includes(id));
}

export function RawDetailView({
  detail, items, contextIndex, onBack, onEdit, onDelete, onOpenItem, onOpenContext,
}: {
  detail?: ItemDetailResponse;
  items: ItemDTO[];
  contextIndex: ContextIndexEntry[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenItem: (id: string) => void;
  onOpenContext: (id: string) => void;
}) {
  if (!detail) return <div className={styles.detailPage}><div className={styles.hint}>Loading…</div></div>;
  const { item, relations, events } = detail;
  const titleOf = (id: string) => items.find((i) => i.id === id)?.title ?? id;
  const derived = relations.outgoing.find((r) => r.kind === 'derived_from');
  const referencedBy = relations.incoming.filter((r) => isObject(items.find((i) => i.id === r.from_id)?.type ?? 'raw.document'));
  const inContexts = contextsContaining(contextIndex, item.id);

  return (
    <DetailShell
      kicker={`${ITEM_LABELS[item.type]} · ${item.status} · ${item.id}`}
      title={item.title}
      onBack={onBack}
      actions={<><Button small onClick={onEdit}>Edit</Button><Button small onClick={onDelete}>Delete</Button></>}
    >
      <Block title="原始内容">
        <div className={styles.rawContent}>{item.fields.content_text ?? '（无文本内容）'}</div>
        <div className={styles.hint}>Raw content is stored verbatim. Derived objects live separately and never overwrite it.</div>
      </Block>

      <Block title="来源">
        <Kvs rows={[
          ['Origin', item.origin],
          ['Source label', item.source_label || '—'],
          ['Derived from', derived
            ? <button type="button" className={styles.linkButton} onClick={() => onOpenItem(derived.to_id)}>{titleOf(derived.to_id)}</button>
            : 'Independently created'],
          ['Created / Updated', `${item.created_at} · ${item.updated_at}`],
        ]} />
      </Block>

      <Block title="基本属性">
        <Kvs rows={[
          ['Type', item.type],
          ['Domain', item.domain],
          ['Status', item.status],
          ...Object.entries(item.fields)
            .filter(([key, value]) => key !== 'content_text' && typeof value === 'string' && value.trim())
            .map(([key, value]) => [fieldLabels[key] ?? key, value as string] as [string, ReactNode]),
        ]} />
      </Block>

      <Block title="被哪些 Structured Objects 引用">
        {referencedBy.length === 0 ? (
          <div className={styles.hint}>暂无对象引用此原始信息。</div>
        ) : referencedBy.map((r) => (
          <div className={styles.refRow} key={r.id}>
            <span className={styles.refKind}>{r.kind}</span>
            <button type="button" className={styles.linkButton} onClick={() => onOpenItem(r.from_id)}>{titleOf(r.from_id)}</button>
            {r.note ? <span className={styles.refNote}>{r.note}</span> : null}
          </div>
        ))}
        <div className={styles.hint}>Stance only; not verification.</div>
      </Block>

      <Block title="属于哪些 Contexts">
        {inContexts.length === 0 ? (
          <div className={styles.hint}>尚未加入任何 Context View。</div>
        ) : inContexts.map((c) => (
          <div className={styles.refRow} key={c.id}>
            <span className={styles.refKind}>member</span>
            <button type="button" className={styles.linkButton} onClick={() => onOpenContext(c.id)}>{c.title}</button>
          </div>
        ))}
      </Block>

      <Subhead title="History" count={events.length} />
      {events.map((event) => (
        <div className={styles.refRow} key={event.id}>
          <span className={styles.refKind}>{event.at.slice(0, 10)}</span>
          <span className={styles.kvValue}>{event.actor} · {event.action} — {event.detail}</span>
        </div>
      ))}
    </DetailShell>
  );
}

export function ObjectDetailView({
  detail, items, contextIndex, onBack, onEdit, onDelete, onOpenItem, onOpenContext,
}: {
  detail?: ItemDetailResponse;
  items: ItemDTO[];
  contextIndex: ContextIndexEntry[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenItem: (id: string) => void;
  onOpenContext: (id: string) => void;
}) {
  if (!detail) return <div className={styles.detailPage}><div className={styles.hint}>Loading…</div></div>;
  const { item, relations, events } = detail;
  const titleOf = (id: string) => items.find((i) => i.id === id)?.title ?? id;
  const typeOf = (id: string) => items.find((i) => i.id === id)?.type;

  const defKeys = definitionFields[item.type] ?? [];
  const coreFields = Object.entries(item.fields).filter(([key, value]) => defKeys.includes(key) && typeof value === 'string' && value.trim());
  const propFields = Object.entries(item.fields).filter(([key, value]) => !defKeys.includes(key) && key !== 'source_item_id' && typeof value === 'string' && value.trim());

  const related = relations.outgoing.filter((r) => isObject(typeOf(r.to_id) ?? 'raw.document'));
  const relatedIncoming = relations.incoming.filter((r) => isObject(typeOf(r.from_id) ?? 'raw.document'));
  const sources = relations.outgoing.filter((r) => !isObject(typeOf(r.to_id) ?? 'object.concept'));
  const sourceItemId = typeof item.fields.source_item_id === 'string' ? item.fields.source_item_id : '';
  const sourceRows = [...sources];
  const inContexts = contextsContaining(contextIndex, item.id);

  return (
    <DetailShell
      kicker={`${ITEM_LABELS[item.type]} · ${item.status} · ${item.id}`}
      title={item.title}
      onBack={onBack}
      actions={<><Button small onClick={onEdit}>Edit</Button><Button small onClick={onDelete}>Delete</Button></>}
    >
      <Block title="Definition">
        {coreFields.length === 0 ? (
          <div className={styles.hint}>该对象还没有核心定义。</div>
        ) : coreFields.map(([key, value]) => (
          <div className={styles.fieldBlock} key={key}>
            <div className={styles.kvLabel}>{fieldLabels[key] ?? key}</div>
            <div className={styles.fieldValue}>{value}</div>
          </div>
        ))}
      </Block>

      <Block title="Properties">
        <Kvs rows={[
          ['Type', item.type],
          ['Domain', item.domain],
          ['Origin', item.origin + (item.source_label ? ` · ${item.source_label}` : '')],
          ['Status', item.status],
          ['Created / Updated', `${item.created_at} · ${item.updated_at}`],
          ...propFields.map(([key, value]) => [fieldLabels[key] ?? key, value as string] as [string, ReactNode]),
        ]} />
      </Block>

      <Block title="Relationships">
        {related.length === 0 && relatedIncoming.length === 0 ? (
          <div className={styles.hint}>暂无对象间关系。</div>
        ) : (
          <>
            {related.map((r) => (
              <div className={styles.refRow} key={r.id}>
                <span className={styles.refKind}>{r.kind} →</span>
                <button type="button" className={styles.linkButton} onClick={() => onOpenItem(r.to_id)}>{titleOf(r.to_id)}</button>
                {r.note ? <span className={styles.refNote}>{r.note}</span> : null}
              </div>
            ))}
            {relatedIncoming.map((r) => (
              <div className={styles.refRow} key={r.id}>
                <span className={styles.refKind}>{r.kind} ←</span>
                <button type="button" className={styles.linkButton} onClick={() => onOpenItem(r.from_id)}>{titleOf(r.from_id)}</button>
                {r.note ? <span className={styles.refNote}>{r.note}</span> : null}
              </div>
            ))}
            <div className={styles.hint}>Relations are listed, not verified.</div>
          </>
        )}
      </Block>

      <Block title="Sources">
        {sourceRows.length === 0 && !sourceItemId ? (
          <div className={styles.hint}>暂无来源。用 Link 添加 derived_from / references。</div>
        ) : (
          <>
            {sourceRows.map((r) => (
              <div className={styles.refRow} key={r.id}>
                <span className={styles.refKind}>{r.kind}</span>
                <button type="button" className={styles.linkButton} onClick={() => onOpenItem(r.to_id)}>{titleOf(r.to_id)}</button>
                <span className={styles.refNote}>{typeOf(r.to_id) ? ITEM_LABELS[typeOf(r.to_id) as ItemType] : ''}</span>
              </div>
            ))}
            {sourceItemId ? (
              <div className={styles.refRow}>
                <span className={styles.refKind}>source_item_id</span>
                <button type="button" className={styles.linkButton} onClick={() => onOpenItem(sourceItemId)}>{titleOf(sourceItemId)}</button>
              </div>
            ) : null}
          </>
        )}
      </Block>

      <Block title="Contexts">
        {inContexts.length === 0 ? (
          <div className={styles.hint}>尚未被任何 Context View 使用。</div>
        ) : inContexts.map((c) => (
          <div className={styles.refRow} key={c.id}>
            <span className={styles.refKind}>member</span>
            <button type="button" className={styles.linkButton} onClick={() => onOpenContext(c.id)}>{c.title}</button>
          </div>
        ))}
      </Block>

      <Subhead title="History" count={events.length} />
      {events.map((event) => (
        <div className={styles.refRow} key={event.id}>
          <span className={styles.refKind}>{event.at.slice(0, 10)}</span>
          <span className={styles.kvValue}>{event.actor} · {event.action} — {event.detail}</span>
        </div>
      ))}
    </DetailShell>
  );
}

export function ClusterDetailView({
  detail, items, onBack, onEdit, onDelete, onAdd, onRemove, onOpenItem,
}: {
  detail?: ClusterIndexEntry;
  items: ItemDTO[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAdd: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onOpenItem: (id: string) => void;
}) {
  if (!detail) return <div className={styles.detailPage}><div className={styles.hint}>Loading…</div></div>;
  const candidates = items.filter((item) => !detail.member_ids.includes(item.id));
  return (
    <DetailShell
      kicker={`Cluster · ${detail.id}`}
      title={detail.title}
      onBack={onBack}
      actions={<><Button small onClick={onEdit}>Edit</Button><Button small onClick={onDelete}>Delete</Button></>}
    >
      <Block title="Cluster Definition">
        <div className={styles.kv}>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>TITLE</span>
            <span className={styles.kvValue}>{detail.title}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>DESCRIPTION</span>
            <span className={styles.kvValue}>{detail.description || '—'}</span>
          </div>
        </div>
        <div className={styles.hint}>A Cluster is an association structure. It owns no content; members keep their own identity and provenance.</div>
      </Block>

      <Block title="Members">
        <div className={styles.list}>
          {detail.member_ids.length === 0 ? (
            <div className={styles.emptyLine}>No members yet. Use Add Items below.</div>
          ) : detail.member_ids.map((id) => {
            const item = items.find((x) => x.id === id);
            return (
              <div className={styles.listRow} key={id}>
                <span className={styles.rowGlyph}>{item ? ITEM_GLYPHS[item.type] : '??'}</span>
                <button type="button" className={styles.linkButton} onClick={() => onOpenItem(id)}>
                  {item?.title ?? id}
                </button>
                <span className={styles.rowType}>{item ? ITEM_LABELS[item.type] : id}</span>
                <button type="button" className={styles.removeButton} onClick={() => onRemove(id)}>Remove</button>
              </div>
            );
          })}
        </div>
        <div className={styles.addRow}>
          <select className={styles.settingInput} id="cluster-add-picker" defaultValue="">
            <option value="">+ Add Items — select a Chunk —</option>
            {candidates.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <Button small onClick={() => {
            const picker = document.getElementById('cluster-add-picker') as HTMLSelectElement | null;
            if (picker?.value) { onAdd(picker.value); picker.value = ''; }
          }}>Add</Button>
        </div>
        <div className={styles.hint}>Explicit membership; a Chunk may belong to multiple Clusters.</div>
      </Block>
    </DetailShell>
  );
}

export function ContextDetailView({
  detail, items, onBack, onEdit, onAdd, onRemove, onOpenItem,
}: {
  detail?: { id: string; title: string; subject: string; scope: string; purpose: string; member_ids: string[] };
  items: ItemDTO[];
  onBack: () => void;
  onEdit: () => void;
  onAdd: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onOpenItem: (id: string) => void;
}) {
  if (!detail) return <div className={styles.detailPage}><div className={styles.hint}>Loading…</div></div>;
  const candidates = items.filter((item) => !detail.member_ids.includes(item.id));
  return (
    <DetailShell
      kicker={`Context View · ${detail.id}`}
      title={detail.title}
      onBack={onBack}
      actions={<Button small onClick={onEdit}>Edit</Button>}
    >
      <Block title="Context Information">
        <div className={styles.kv}>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>SUBJECT</span>
            <span className={styles.kvValue}>{detail.subject}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>SCOPE</span>
            <span className={styles.kvValue}>{detail.scope}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>PURPOSE</span>
            <span className={styles.kvValue}>{detail.purpose}</span>
          </div>
        </div>
      </Block>

      <Block title="Members">
        <div className={styles.list}>
          {detail.member_ids.length === 0 ? (
            <div className={styles.emptyLine}>No members yet. Use Add Items below.</div>
          ) : detail.member_ids.map((id) => {
            const item = items.find((x) => x.id === id);
            return (
              <div className={styles.listRow} key={id}>
                <span className={styles.rowGlyph}>{item ? ITEM_GLYPHS[item.type] : '??'}</span>
                <button type="button" className={styles.linkButton} onClick={() => onOpenItem(id)}>
                  {item?.title ?? id}
                </button>
                <span className={styles.rowType}>{item ? ITEM_LABELS[item.type] : id}</span>
                <button type="button" className={styles.removeButton} onClick={() => onRemove(id)}>Remove</button>
              </div>
            );
          })}
        </div>
        <div className={styles.addRow}>
          <select className={styles.settingInput} id="ctx-add-picker" defaultValue="">
            <option value="">+ Add Items — select an item —</option>
            {candidates.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <Button small onClick={() => {
            const picker = document.getElementById('ctx-add-picker') as HTMLSelectElement | null;
            if (picker?.value) { onAdd(picker.value); picker.value = ''; }
          }}>Add</Button>
        </div>
        <div className={styles.hint}>Explicit membership only. No tags, inference or retrieval.</div>
      </Block>
    </DetailShell>
  );
}
