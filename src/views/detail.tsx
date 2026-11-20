import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../components/ui.tsx';
import { BadgeRow, MemberBadge, SemTag } from '../components/SemTag.tsx';
import { ITEM_GLYPHS, ITEM_LABELS, OBJECT_TYPES } from '../lib/items.ts';
import type { ItemDTO, ItemFields, ItemType } from '../lib/items.ts';
import type { ClusterDTO } from '../lib/clusters.ts';
import type { ItemDetailResponse } from '../services/api.ts';
import type { ContextIndexEntry } from './pages.tsx';
import { useT } from '../lib/i18n.tsx';
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
  kicker, title, subtitle, onBack, actions, rail, children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  onBack: () => void;
  actions?: ReactNode;
  rail?: ReactNode;
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
      {rail ? (
        <div className={styles.detailCols}>
          <div className={styles.detailMain}>{children}</div>
          <aside className={styles.detailRail}>{rail}</aside>
        </div>
      ) : children}
    </div>
  );
}

/* P3 INTERACTION_UX_PLAN: attribute rail — badges first, low-frequency kv folded. */
function RailBadges({ badges }: { badges: [string, string][] }) {
  return (
    <div className={styles.railBadges}>
      {badges.map(([label, value]) => (
        <span key={label} className={styles.railBadge} title={value}>{value}</span>
      ))}
    </div>
  );
}

function RailKvs({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div className={styles.railKvs}>
      {rows.map(([label, value]) => (
        <div className={styles.railKv} key={label}>
          <span className={styles.railKvLabel}>{label}</span>
          <span className={styles.railKvValue}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function More({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className={styles.more}>
      <summary className={styles.moreSummary}>{label}</summary>
      {children}
    </details>
  );
}

function Block({ title, tag, children }: { title: string; tag?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.block}>
      <h2 className={styles.blockTitle}>{title}{tag ? <span style={{ marginLeft: 8 }}>{tag}</span> : null}</h2>
      {children}
    </section>
  );
}

function contextsContaining(index: ContextIndexEntry[], id: string): ContextIndexEntry[] {
  return index.filter((c) => c.member_ids.includes(id));
}

export function RawDetailView({
  detail, items, contextIndex, tags, onBack, onEdit, onDelete, onOpenItem, onOpenContext,
}: {
  detail?: ItemDetailResponse;
  items: ItemDTO[];
  contextIndex: ContextIndexEntry[];
  tags?: ReactNode;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenItem: (id: string) => void;
  onOpenContext: (id: string) => void;
}) {

  const t = useT();  if (!detail) return <div className={styles.detailPage}><div className={styles.hint}>{t('detail.loading')}</div></div>;
  const { item, relations, events } = detail;
  const titleOf = (id: string) => items.find((i) => i.id === id)?.title ?? id;
  const derived = relations.outgoing.find((r) => r.kind === 'derived_from');
  const referencedBy = relations.incoming.filter((r) => isObject(items.find((i) => i.id === r.from_id)?.type ?? 'raw.document'));
  const inContexts = contextsContaining(contextIndex, item.id);
  const extraFields = Object.entries(item.fields)
    .filter(([key, value]) => key !== 'content_text' && typeof value === 'string' && value.trim());

  return (
    <DetailShell
      kicker={`${ITEM_LABELS[item.type]} · ${item.status} · ${item.id}`}
      title={item.title}
      onBack={onBack}
      actions={<><Button small onClick={onEdit}>{t('common.edit')}</Button><Button small onClick={onDelete}>{t('common.delete')}</Button></>}
      rail={(
        <>
          <RailBadges badges={[[t('detail.type'), item.type], [t('detail.domain'), item.domain], [t('detail.status'), item.status]]} />
          <RailKvs rows={[
            [t('detail.origin'), item.origin],
            [t('detail.sourceLabel'), item.source_label || '—'],
            [t('detail.derivedFrom'), derived
              ? <button type="button" className={styles.linkButton} onClick={() => onOpenItem(derived.to_id)}>{titleOf(derived.to_id)}</button>
              : t('detail.independent')],
          ]} />
          <More label={t('detail.more')}>
            <RailKvs rows={[
              [t('detail.createdUpdated'), `${item.created_at.slice(0, 16).replace('T', ' ')} · ${item.updated_at.slice(0, 16).replace('T', ' ')}`],
              ...extraFields.map(([key, value]) => [fieldLabels[key] ?? key, value as string] as [string, ReactNode]),
            ]} />
          </More>
        </>
      )}
    >
      {referencedBy.length > 0 ? (
        <div className={styles.pairChipRow}>
          <span className={styles.pairChip} onClick={() => onOpenItem(referencedBy[0].from_id)}>
            {t('detail.pairObject', { name: titleOf(referencedBy[0].from_id) })}
          </span>
        </div>
      ) : null}

      <Block title={t('detail.rawContent')} tag={<SemTag kind="original" />}>
        <div className={styles.rawContent}>{item.fields.content_text ?? t('detail.noText')}</div>
        <div className={styles.hint}>{t('detail.rawHint')}</div>
      </Block>

      {tags ? <Block title={t('overview.metaTags')}>{tags}</Block> : null}

      <Block title={t('detail.referencedBy')}>
        {referencedBy.length === 0 ? (
          <div className={styles.hint}>{t('detail.noRefs')}</div>
        ) : referencedBy.map((r) => (
          <div className={styles.refRow} key={r.id}>
            <span className={styles.refKind}>{r.kind}</span>
            <button type="button" className={styles.linkButton} onClick={() => onOpenItem(r.from_id)}>{titleOf(r.from_id)}</button>
            {r.note ? <span className={styles.refNote}>{r.note}</span> : null}
          </div>
        ))}
        <div className={styles.hint}>{t('detail.stanceHint')}</div>
      </Block>

      <Block title={t('detail.inContexts')}>
        {inContexts.length === 0 ? (
          <div className={styles.hint}>{t('detail.noContexts')}</div>
        ) : inContexts.map((c) => (
          <div className={styles.refRow} key={c.id}>
            <span className={styles.refKind}>member</span>
            <button type="button" className={styles.linkButton} onClick={() => onOpenContext(c.id)}>{c.title}</button>
          </div>
        ))}
      </Block>

      <More label={`${t('detail.history')} · ${events.length}`}>
        {events.map((event) => (
          <div className={styles.refRow} key={event.id}>
            <span className={styles.refKind}>{event.at.slice(0, 10)}</span>
            <span className={styles.kvValue}>{event.actor} · {event.action} — {event.detail}</span>
          </div>
        ))}
      </More>
    </DetailShell>
  );
}

export function ObjectDetailView({
  detail, items, contextIndex, tags, onBack, onEdit, onDelete, onOpenItem, onOpenContext,
}: {
  detail?: ItemDetailResponse;
  items: ItemDTO[];
  contextIndex: ContextIndexEntry[];
  tags?: ReactNode;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenItem: (id: string) => void;
  onOpenContext: (id: string) => void;
}) {

  const t = useT();  if (!detail) return <div className={styles.detailPage}><div className={styles.hint}>{t('detail.loading')}</div></div>;
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
      actions={<><Button small onClick={onEdit}>{t('common.edit')}</Button><Button small onClick={onDelete}>{t('common.delete')}</Button></>}
      rail={(
        <>
          <RailBadges badges={[[t('detail.type'), item.type], [t('detail.domain'), item.domain], [t('detail.status'), item.status]]} />
          <RailKvs rows={[
            ['Origin', item.origin],
            [t('detail.sourceLabel'), item.source_label || '—'],
          ]} />
          <More label={t('detail.more')}>
            <RailKvs rows={[
              [t('detail.createdUpdated'), `${item.created_at.slice(0, 16).replace('T', ' ')} · ${item.updated_at.slice(0, 16).replace('T', ' ')}`],
              ...propFields.map(([key, value]) => [fieldLabels[key] ?? key, value as string] as [string, ReactNode]),
            ]} />
          </More>
        </>
      )}
    >
      {sources.length > 0 || sourceItemId ? (
        <div className={styles.pairChipRow}>
          <span className={styles.pairChip} onClick={() => onOpenItem(sources[0]?.to_id ?? sourceItemId)}>
            {t('detail.pairSource', { name: titleOf(sources[0]?.to_id ?? sourceItemId) })}
          </span>
        </div>
      ) : null}

      <Block title={t('detail.definition')} tag={<SemTag kind={item.origin === 'agent' ? 'machine' : 'confirmed'} label={item.origin === 'agent' ? t('detail.machineCreated') : t('detail.semanticIdentity')} />}>
        {coreFields.length === 0 ? (
          <div className={styles.hint}>{t('detail.noDefinition')}</div>
        ) : coreFields.map(([key, value]) => (
          <div className={styles.fieldBlock} key={key}>
            <div className={styles.kvLabel}>{fieldLabels[key] ?? key}</div>
            <div className={styles.fieldValue}>{value}</div>
          </div>
        ))}
      </Block>

      {tags ? <Block title={t('overview.metaTags')}>{tags}</Block> : null}

      <Block title={t('detail.relationships')}>
        {related.length === 0 && relatedIncoming.length === 0 ? (
          <div className={styles.hint}>{t('detail.noRelations')}</div>
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

      <Block title={t('detail.sources')}>
        {sourceRows.length === 0 && !sourceItemId ? (
          <div className={styles.hint}>{t('detail.noSources')}</div>
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

      <Block title={t('detail.contextsBlock')}>
        {inContexts.length === 0 ? (
          <div className={styles.hint}>{t('detail.noContextUse')}</div>
        ) : inContexts.map((c) => (
          <div className={styles.refRow} key={c.id}>
            <span className={styles.refKind}>member</span>
            <button type="button" className={styles.linkButton} onClick={() => onOpenContext(c.id)}>{c.title}</button>
          </div>
        ))}
      </Block>

      <More label={`${t('detail.history')} · ${events.length}`}>
        {events.map((event) => (
          <div className={styles.refRow} key={event.id}>
            <span className={styles.refKind}>{event.at.slice(0, 10)}</span>
            <span className={styles.kvValue}>{event.actor} · {event.action} — {event.detail}</span>
          </div>
        ))}
      </More>
    </DetailShell>
  );
}

export function ClusterDetailView({
  detail, items, shares, users, onBack, onEdit, onDelete, onAdd, onRemove, onOpenItem, onShare, onRevoke,
}: {
  detail?: ClusterIndexEntry;
  items: ItemDTO[];
  shares?: { user_id: string; name: string; role: 'view' | 'add' }[];
  users?: { id: string; name: string }[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAdd: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onOpenItem: (id: string) => void;
  onShare: (name: string, role: 'view' | 'add') => Promise<void>;
  onRevoke: (userId: string) => Promise<void>;
}) {

  const t = useT();  const [shareName, setShareName] = useState('');
  const [shareRole, setShareRole] = useState<'view' | 'add'>('view');
  if (!detail) return <div className={styles.detailPage}><div className={styles.hint}>{t('detail.loading')}</div></div>;
  const candidates = items.filter((item) => !detail.member_ids.includes(item.id));
  return (
    <DetailShell
      kicker={`Cluster · ${detail.id}`}
      title={detail.title}
      onBack={onBack}
      actions={<><Button small onClick={onEdit}>{t('common.edit')}</Button><Button small onClick={onDelete}>{t('common.delete')}</Button></>}
    >
      <Block title={t('detail.clusterDef')}>
        <div className={styles.kv}>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('detail.title')}</span>
            <span className={styles.kvValue}>{detail.title}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('detail.description')}</span>
            <span className={styles.kvValue}>{detail.description || '—'}</span>
          </div>
        </div>
        <div className={styles.hint}>A Cluster is an association structure. It owns no content; members keep their own identity and provenance.</div>
      </Block>

      <Block title={t('detail.members')}>
        <div className={styles.list}>
          {detail.member_ids.length === 0 ? (
            <div className={styles.emptyLine}>{t('detail.noMembers')}</div>
          ) : detail.member_ids.map((id) => {
            const item = items.find((x) => x.id === id);
            return (
              <div className={styles.listRow} key={id}>
                <span className={styles.rowGlyph}>{item ? ITEM_GLYPHS[item.type] : '??'}</span>
                <button type="button" className={styles.linkButton} onClick={() => onOpenItem(id)}>
                  {item?.title ?? id}
                </button>
                <span className={styles.rowType}>{item ? ITEM_LABELS[item.type] : id}</span>
                <button type="button" className={styles.removeButton} onClick={() => onRemove(id)}>{t('detail.remove')}</button>
              </div>
            );
          })}
        </div>
        <div className={styles.addRow}>
          <select className={styles.settingInput} id="cluster-add-picker" defaultValue="">
            <option value="">{t('detail.addItems')} — select a Chunk —</option>
            {candidates.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <Button small onClick={() => {
            const picker = document.getElementById('cluster-add-picker') as HTMLSelectElement | null;
            if (picker?.value) { onAdd(picker.value); picker.value = ''; }
          }}>Add</Button>
        </div>
        <div className={styles.hint}>{t('detail.multiHomeHint')}</div>
      </Block>

      <Block title={t('detail.sharing')}>
        <div className={styles.addRow}>
          <select className={styles.settingInput} value={shareName} onChange={(e) => setShareName(e.target.value)}>
            <option value="">{t('detail.pickUser')}</option>
            {(users ?? []).map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
          <select className={styles.select} value={shareRole} onChange={(e) => setShareRole(e.target.value as 'view' | 'add')}>
            <option value="view">{t('detail.roleView')}</option>
            <option value="add">{t('detail.roleAdd')}</option>
          </select>
          <Button small onClick={() => { if (shareName) { void onShare(shareName, shareRole); setShareName(''); } }}>{t('detail.share')}</Button>
        </div>
        {(shares ?? []).length === 0 ? (
          <div className={styles.hint}>{t('detail.shareEmpty')}</div>
        ) : (shares ?? []).map((s) => (
          <div className={styles.refRow} key={s.user_id}>
            <span className={styles.refKind}>{s.role}</span>
            <span className={styles.kvValue}>{s.name}</span>
            <button type="button" className={styles.removeButton} onClick={() => void onRevoke(s.user_id)}>{t('detail.revoke')}</button>
          </div>
        ))}
        <div className={styles.hint}>{t('detail.auditHint')}</div>
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

  const t = useT();  if (!detail) return <div className={styles.detailPage}><div className={styles.hint}>{t('detail.loading')}</div></div>;
  const candidates = items.filter((item) => !detail.member_ids.includes(item.id));
  return (
    <DetailShell
      kicker={`Context View · ${detail.id}`}
      title={detail.title}
      onBack={onBack}
      actions={<Button small onClick={onEdit}>{t('common.edit')}</Button>}
    >
      <Block title={t('detail.ctxInfo')}>
        <div className={styles.kv}>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('detail.subject')}</span>
            <span className={styles.kvValue}>{detail.subject}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('detail.scope')}</span>
            <span className={styles.kvValue}>{detail.scope}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('detail.purpose')}</span>
            <span className={styles.kvValue}>{detail.purpose}</span>
          </div>
        </div>
      </Block>

      <Block title={t('detail.members')}>
        <div className={styles.list}>
          {detail.member_ids.length === 0 ? (
            <div className={styles.emptyLine}>{t('detail.noMembers')}</div>
          ) : detail.member_ids.map((id) => {
            const item = items.find((x) => x.id === id);
            return (
              <div className={styles.listRow} key={id}>
                <span className={styles.rowGlyph}>{item ? ITEM_GLYPHS[item.type] : '??'}</span>
                <button type="button" className={styles.linkButton} onClick={() => onOpenItem(id)}>
                  {item?.title ?? id}
                </button>
                <span className={styles.rowType}>{item ? ITEM_LABELS[item.type] : id}</span>
                <button type="button" className={styles.removeButton} onClick={() => onRemove(id)}>{t('detail.remove')}</button>
              </div>
            );
          })}
        </div>
        <div className={styles.addRow}>
          <select className={styles.settingInput} id="ctx-add-picker" defaultValue="">
            <option value="">{t('detail.addItems')} — select an item —</option>
            {candidates.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <Button small onClick={() => {
            const picker = document.getElementById('ctx-add-picker') as HTMLSelectElement | null;
            if (picker?.value) { onAdd(picker.value); picker.value = ''; }
          }}>Add</Button>
        </div>
        <div className={styles.hint}>{t('detail.explicitOnly')}</div>
      </Block>
    </DetailShell>
  );
}
