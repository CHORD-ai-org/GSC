import { humanizeProposalValue } from './pages.tsx';
import { narrate, type FeedLine } from '../lib/narrate.ts';
import { listEventsFor } from '../services/api.ts';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../components/ui.tsx';
import { useToast } from '../components/Toast.tsx';
import { SemTag } from '../components/SemTag.tsx';
import { Glyph } from '../components/Glyph.tsx';
import { ITEM_LABELS, OBJECT_TYPES } from '../lib/items.ts';
import type { ItemDTO, ItemType } from '../lib/items.ts';
import type { ClusterDTO } from '../lib/clusters.ts';
import type { ProposalDTO } from '../lib/proposals.ts';
import type { ItemDetailResponse, OutlineNodeDTO } from '../services/api.ts';
import { listProposals, resolveProposal, listOutline, ensureOutlineTitles } from '../services/api.ts';
import type { ContextIndexEntry } from './pages.tsx';
import { useI18n, useT } from '../lib/i18n.tsx';
import { fieldLabel } from '../lib/itemFields.ts';
import styles from './views.module.css';

export type ClusterIndexEntry = ClusterDTO & { member_ids: string[] };

/* U3: field vocabulary single-sourced in lib/itemFields.ts (was fieldLabels here). */

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
  kicker, title, subtitle, footprint, onBack, actions, rail, children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  footprint?: ReactNode;
  onBack: () => void;
  actions?: ReactNode;
  rail?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <div className={styles.detailPage}>
      <button type="button" className={styles.backButton} onClick={onBack}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9.5 3.5L5 8l4.5 4.5" /></svg>
        {t('detail.back')}
      </button>
      <div className={styles.detailKicker}>{kicker}</div>
      <div className={styles.detailTitleRow}>
        <h1 className={styles.detailTitle}>{title}</h1>
        {actions ? <div className={styles.detailActions}>{actions}</div> : null}
      </div>
      {subtitle ? <div className={styles.detailSubtitle}>{subtitle}</div> : null}
      {footprint}
      {rail ? (
        <div className={styles.detailCols}>
          <div className={styles.detailMain}>{children}</div>
          <aside className={styles.detailRail}>{rail}</aside>
        </div>
      ) : children}
    </div>
  );
}

/* V1 engagement traces: footprint line — you N · Agent N · last at. */
function FootprintLine({ events }: { events: { actor: string; at: string }[] }) {
  const t = useT();
  const user = events.filter((e) => e.actor === 'user').length;
  const agent = events.filter((e) => e.actor === 'agent').length;
  const last = events[0]?.at;
  return (
    <div className={styles.footprint}>
      <span className={styles.footU}>{t('detail.fpYou', { n: user })}</span>
      <span className={styles.footA}>{t('detail.fpAgent', { n: agent })}</span>
      {last ? <span>{t('detail.fpLast', { time: last.slice(5, 16).replace('T', ' ') })}</span> : null}
    </div>
  );
}

/* V3 (M3): field-level attribution dot + inline proposal rows (Layout 4). */
function OwnerDot({ owner }: { owner?: 'user' | 'agent' }) {
  if (!owner) return null;
  return <span className={owner === 'agent' ? styles.dotA : styles.dotU} title={owner === 'agent' ? 'Agent' : 'You'} />;
}

const PROPOSAL_KIND_KEY: Record<string, string> = {
  semantic_name: 'prop.semantic_name',
  classification: 'prop.classification',
  meta_tag: 'prop.meta_tag',
  pending_definition: 'prop.pending_definition',
  association: 'prop.association',
  cluster: 'prop.cluster',
  metadata: 'prop.metadata',
};

function AttributionPanel({
  detail, itemId, onRefresh,
}: {
  detail: ItemDetailResponse;
  itemId: string;
  onRefresh?: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [proposals, setProposals] = useState<ProposalDTO[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    listProposals('pending')
      .then((r) => {
        if (!cancelled) {
          setProposals(r.proposals.filter((p) => p.target_id === itemId || p.related_id === itemId));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const visible = proposals.filter((p) => !hidden.has(p.id));
  const u = detail.attribution?.user_edits ?? 0;
  const a = detail.attribution?.agent_edits ?? 0;
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  if (u + a + visible.length === 0) return null;

  const act = async (id: string, status: 'accepted' | 'rejected') => {
    try {
      await resolveProposal(id, status);
      toast(t('detail.proposalResolved'), 'ok');
      setProposals((prev) => prev.filter((r) => r.id !== id));
      onRefresh?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('model.saveFailed'), 'error');
    }
  };

  /* P1 hygiene: fold same-kind proposals into one expandable row (12 rows → 3 groups). */
  const groups = new Map<string, ProposalDTO[]>();
  for (const p of visible) {
    const list = groups.get(p.kind) ?? [];
    list.push(p);
    groups.set(p.kind, list);
  }
  const renderRow = (p: ProposalDTO) => (
    <div key={p.id} className={styles.propRow}>
      <span className={styles.propChip}>{t((PROPOSAL_KIND_KEY[p.kind] ?? 'prop.metadata') as Parameters<typeof t>[0])}</span>
      <span className={styles.propBody}>
        <b>{humanizeProposalValue(p.kind, p.proposed_value)}</b>
        {p.related_id === itemId && p.target_id !== itemId ? <span className={styles.propWhy}>{t('prop.related')}</span> : null}
        {p.rationale ? <span className={styles.propWhy}>{p.rationale}</span> : null}
      </span>
      <button type="button" className={styles.propBtn} onClick={() => void act(p.id, 'accepted')}>{t('detail.adopt')}</button>
      <button type="button" className={styles.propBtn} onClick={() => void act(p.id, 'rejected')}>{t('detail.reject')}</button>
      <button type="button" className={styles.linkButton} onClick={() => setHidden((s) => new Set(s).add(p.id))}>{t('detail.defer')}</button>
    </div>
  );

  return (
    <>
      <div className={styles.attrStrip}>
        {u > 0 ? <span className={styles.attrU}>{t('detail.attrYou', { n: u })}</span> : null}
        {a > 0 ? <span className={styles.attrA}>{t('detail.attrAgent', { n: a })}</span> : null}
        {visible.length > 0 ? <span className={styles.attrP}>{t('detail.attrProposals', { n: visible.length })}</span> : null}
      </div>
      {[...groups.entries()].map(([kind, list]) => {
        if (list.length === 1) return renderRow(list[0]);
        const open = openGroups.has(kind);
        return (
          <div key={kind} className={styles.propGroup}>
            <button
              type="button"
              className={styles.propGroupHead}
              onClick={() => setOpenGroups((s) => {
                const next = new Set(s);
                if (open) next.delete(kind);
                else next.add(kind);
                return next;
              })}
            >
              <span className={styles.propChip}>{t((PROPOSAL_KIND_KEY[kind] ?? 'prop.metadata') as Parameters<typeof t>[0])}</span>
              <span className={styles.propBody}>{t('detail.propCount', { n: list.length })}</span>
              <span className={styles.propChevron}>{open ? '▾' : '▸'}</span>
            </button>
            {open ? list.map(renderRow) : null}
          </div>
        );
      })}
    </>
  );
}

/* P3 INTERACTION_UX_PLAN: attribute rail — badges first, low-frequency kv folded. */
/* SEMANTIC_TITLE_PLAN (batch C): outline with three-state title badges.
   Generation is on-demand (G4 待定点③) — ensure-titles only proposes for
   rule-title nodes; user/agent titles are never regenerated. */
function OutlinePanel({ itemId }: { itemId: string }) {
  const t = useT();
  const [nodes, setNodes] = useState<OutlineNodeDTO[]>([]);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void listOutline(itemId)
      .then((r) => { setNodes(r.outline); setPending(new Set(r.pending_paths ?? [])); })
      .catch(() => setNodes([]));
  }, [itemId]);
  const generate = () => {
    if (busy) return;
    setBusy(true);
    void ensureOutlineTitles(itemId)
      .then((r) => { setNodes(r.outline); setPending(new Set(r.pending_paths)); })
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };
  if (nodes.length === 0) return null;
  const childrenOf = new Map<string, OutlineNodeDTO[]>();
  for (const node of nodes) {
    const parent = node.path.includes('.') ? node.path.slice(0, node.path.lastIndexOf('.')) : '';
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), node]);
  }
  const hidden = (node: OutlineNodeDTO): boolean => {
    let p = node.path.includes('.') ? node.path.slice(0, node.path.lastIndexOf('.')) : '';
    while (p) {
      if (collapsed.has(p)) return true;
      p = p.includes('.') ? p.slice(0, p.lastIndexOf('.')) : '';
    }
    return false;
  };
  const badge = (node: OutlineNodeDTO): string => {
    if (node.nameOrigin === 'user') return t('outline.badgeUser');
    if (node.nameOrigin === 'agent') return t('outline.badgeAgent');
    return pending.has(node.path) ? t('outline.badgePending') : t('outline.badgeRule');
  };
  return (
    <Block title={t('outline.title')}>
      <div className={styles.list}>
        {nodes.map((node) => (hidden(node) ? null : (
          <div className={styles.listRow} key={node.id} style={{ paddingLeft: 4 + (node.level - 1) * 16 }}>
            {childrenOf.has(node.path) ? (
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => setCollapsed((prev) => {
                  const next = new Set(prev);
                  if (next.has(node.path)) next.delete(node.path);
                  else next.add(node.path);
                  return next;
                })}
              >
                {collapsed.has(node.path) ? '[+]' : '[–]'}
              </button>
            ) : (
              <span className={styles.rowType}>·</span>
            )}
            <span className={styles.rowTitle}>{node.title}</span>
            <span className={styles.rowType}>{badge(node)}</span>
          </div>
        )))}
      </div>
      <Button small onClick={generate}>{busy ? t('outline.generating') : t('outline.generate')}</Button>
    </Block>
  );
}

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
  detail, items, contextIndex, tags, onBack, onEdit, onDelete, onOpenItem, onOpenContext, onAddToContext, onRefresh,
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
  onAddToContext: (contextId: string) => Promise<void> | void;
  onRefresh?: () => void;
}) {
  const [pickCtx, setPickCtx] = useState('');

  const { t, lang } = useI18n();  if (!detail) return <div className={styles.detailPage}><div className={styles.hint}>{t('detail.loading')}</div></div>;
  const { item, relations, events } = detail;
  const titleOf = (id: string) => items.find((i) => i.id === id)?.title ?? id;
  const derived = relations.outgoing.find((r) => r.kind === 'derived_from');
  const referencedBy = relations.incoming.filter((r) => isObject(items.find((i) => i.id === r.from_id)?.type ?? 'raw.document'));
  const inContexts = contextsContaining(contextIndex, item.id);
  const extraFields = Object.entries(item.fields)
    .filter(([key, value]) => key !== 'content_text' && typeof value === 'string' && value.trim());

  return (
    <DetailShell
      kicker={`${t('nav.raw')} › ${ITEM_LABELS[item.type]}`}
      title={item.title}
      footprint={<FootprintLine events={events} />}
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
              [t('detail.id'), item.id],
              ...extraFields.map(([key, value]) => [fieldLabel(key, lang), <>{value}<OwnerDot owner={detail.attribution?.field_owners[`fields.${key}`]} /></>] as [string, ReactNode]),
            ]} />
          </More>
        </>
      )}
    >
      {referencedBy.length > 0 ? (
        <div className={styles.pairChipRow}>
          <button type="button" className={styles.pairChip} onClick={() => onOpenItem(referencedBy[0].from_id)}>
            {t('detail.pairObject', { name: titleOf(referencedBy[0].from_id) })}
          </button>
        </div>
      ) : null}

      <AttributionPanel detail={detail} itemId={item.id} onRefresh={onRefresh} />

      <OutlinePanel itemId={item.id} />

      <Block title={t('detail.rawContent')} tag={<SemTag kind="original" />}>
        <div className={styles.rawContent}>{item.fields.content_text ?? t('detail.noText')}</div>
      </Block>

      {tags ? <Block title={t('overview.metaTags')}>{tags}</Block> : null}

      {referencedBy.length === 0 && inContexts.length === 0 ? null : (
        <>
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
            {/* GAP-13 quick reuse: reference this object into another context */}
            {contextIndex.some((c) => !inContexts.some((i) => i.id === c.id)) ? (
              <div className={styles.pairChipRow}>
                <select className={styles.pickSelect} value={pickCtx} onChange={(e) => setPickCtx(e.target.value)}>
                  <option value="">{t('detail.pickContext')}</option>
                  {contextIndex.filter((c) => !inContexts.some((i) => i.id === c.id)).map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <button type="button" className={styles.pairChip} disabled={!pickCtx} onClick={() => { const id = pickCtx; setPickCtx(''); void onAddToContext(id); }}>
                  {t('detail.addToContext')}
                </button>
              </div>
            ) : null}
          </Block>
        </>
      )}

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
  detail, items, contextIndex, tags, onBack, onEdit, onDelete, onOpenItem, onOpenContext, onAddToContext, onRefresh,
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
  onAddToContext: (contextId: string) => Promise<void> | void;
  onRefresh?: () => void;
}) {
  const [pickCtx, setPickCtx] = useState('');

  const { t, lang } = useI18n();  if (!detail) return <div className={styles.detailPage}><div className={styles.hint}>{t('detail.loading')}</div></div>;
  const { item, relations, events } = detail;
  const titleOf = (id: string) => items.find((i) => i.id === id)?.title ?? id;
  const typeOf = (id: string) => items.find((i) => i.id === id)?.type;

  const defKeys = definitionFields[item.type] ?? [];
  /* §4.3 semantic layout: defining fields lead, per object type. */
  const FIELD_PRIORITY: Record<string, string[]> = {
    'object.concept': ['definition', 'notes'],
    'object.hypothesis': ['claim', 'notes'],
    'object.methodology': ['name', 'steps', 'principles', 'notes'],
    'object.decision': ['statement', 'reasoning', 'alternatives', 'consequences', 'notes'],
    'object.evidencereference': ['claim', 'notes'],
  };
  const order = FIELD_PRIORITY[item.type] ?? [];
  const coreFields = Object.entries(item.fields)
    .filter(([key, value]) => defKeys.includes(key) && typeof value === 'string' && value.trim())
    .sort(([a], [b]) => {
      const pa = order.indexOf(a);
      const pb = order.indexOf(b);
      return (pa < 0 ? order.length : pa) - (pb < 0 ? order.length : pb);
    });
  const BLOCK_TITLE: Record<string, string> = {
    'object.concept': 'detail.definition',
    'object.hypothesis': 'detail.claimBody',
    'object.evidencereference': 'detail.claimBody',
    'object.methodology': 'detail.methodBody',
    'object.decision': 'detail.decisionBody',
  };
  const blockTitleKey = BLOCK_TITLE[item.type] ?? 'detail.definition';
  const propFields = Object.entries(item.fields).filter(([key, value]) => !defKeys.includes(key) && key !== 'source_item_id' && typeof value === 'string' && value.trim());

  const related = relations.outgoing.filter((r) => isObject(typeOf(r.to_id) ?? 'raw.document'));
  const relatedIncoming = relations.incoming.filter((r) => isObject(typeOf(r.from_id) ?? 'raw.document'));
  const sources = relations.outgoing.filter((r) => !isObject(typeOf(r.to_id) ?? 'object.concept'));
  const supersededBy = relations.outgoing.find((r) => r.kind === 'superseded_by');
  const sourceItemId = typeof item.fields.source_item_id === 'string' ? item.fields.source_item_id : '';
  const sourceRows = [...sources];
  const inContexts = contextsContaining(contextIndex, item.id);

  return (
    <DetailShell
      kicker={`${t('nav.objects')} › ${ITEM_LABELS[item.type]}`}
      title={item.title}
      footprint={<FootprintLine events={detail.events} />}
      onBack={onBack}
      actions={<><Button small onClick={onEdit}>{t('common.edit')}</Button><Button small onClick={onDelete}>{t('common.delete')}</Button></>}
      rail={(
        <>
          <RailBadges badges={[[t('detail.type'), item.type], [t('detail.domain'), item.domain], [t('detail.status'), item.status]]} />
          <RailKvs rows={[
            [t('detail.origin'), item.origin],
            [t('detail.sourceLabel'), item.source_label || '—'],
          ]} />
          <More label={t('detail.more')}>
            <RailKvs rows={[
              [t('detail.createdUpdated'), `${item.created_at.slice(0, 16).replace('T', ' ')} · ${item.updated_at.slice(0, 16).replace('T', ' ')}`],
              [t('detail.id'), item.id],
              ...propFields.map(([key, value]) => [fieldLabel(key, lang), value as string] as [string, ReactNode]),
            ]} />
          </More>
        </>
      )}
    >
      {sources.length > 0 || sourceItemId ? (
        <div className={styles.pairChipRow}>
          <button type="button" className={styles.pairChip} onClick={() => onOpenItem(sources[0]?.to_id ?? sourceItemId)}>
            {t('detail.pairSource', { name: titleOf(sources[0]?.to_id ?? sourceItemId) })}
          </button>
        </div>
      ) : null}

      <AttributionPanel detail={detail} itemId={item.id} onRefresh={onRefresh} />

      {(item.status === 'superseded' || item.status === 'outdated') ? (
        <div className={styles.error}>
          <strong>{item.status === 'superseded' ? t('detail.superseded') : t('detail.outdated')}</strong>
          {supersededBy ? <> · {t('detail.supersededBy')} <button type="button" className={styles.linkButton} onClick={() => onOpenItem(supersededBy.to_id)}>{titleOf(supersededBy.to_id)}</button></> : null}
        </div>
      ) : null}

      <Block title={t(blockTitleKey as Parameters<typeof t>[0])} tag={<SemTag kind={item.origin === 'agent' ? 'machine' : 'confirmed'} label={item.origin === 'agent' ? t('detail.machineCreated') : t('detail.semanticIdentity')} />}>
        {coreFields.length === 0 ? (
          <div className={styles.hint}>{t('detail.noDefinition')}</div>
        ) : coreFields.map(([key, value]) => (
          <div className={styles.fieldBlock} key={key}>
            <div className={styles.kvLabel}>{fieldLabel(key, lang)}</div>
            <div className={styles.fieldValue}>{value}<OwnerDot owner={detail.attribution?.field_owners[`fields.${key}`]} /></div>
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
            <div className={styles.hint}>{t('detail.relationsNote')}</div>
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
        {/* GAP-13 quick reuse: reference this object into another context */}
        {contextIndex.some((c) => !inContexts.some((i) => i.id === c.id)) ? (
          <div className={styles.pairChipRow}>
            <select className={styles.pickSelect} value={pickCtx} onChange={(e) => setPickCtx(e.target.value)}>
              <option value="">{t('detail.pickContext')}</option>
              {contextIndex.filter((c) => !inContexts.some((i) => i.id === c.id)).map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <button type="button" className={styles.pairChip} disabled={!pickCtx} onClick={() => { const id = pickCtx; setPickCtx(''); void onAddToContext(id); }}>
              {t('detail.addToContext')}
            </button>
          </div>
        ) : null}
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
  pendingProposals = [], onResolve,
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
  /* CL2：语义名提案就地裁决 + 归块履历 */
  pendingProposals?: { id: string; kind: string; target_id: string; proposed_value: string; related_id?: string | null }[];
  onResolve?: (id: string, status: 'accepted' | 'rejected') => Promise<void>;
}) {
  const t = useT();
  const [shareName, setShareName] = useState('');
  const [shareRole, setShareRole] = useState<'view' | 'add'>('view');
  const [addQuery, setAddQuery] = useState('');
  const [history, setHistory] = useState<FeedLine[]>([]);

  /* 归块履历：成员事件合流（narrate 同源管道，倒序 ≤12）。 */
  useEffect(() => {
    if (!detail || detail.member_ids.length === 0) { setHistory([]); return; }
    void listEventsFor(detail.member_ids.slice(0, 100), { limit: 40 })
      .then((r) => {
        const rows: FeedLine[] = r.events.map((e) => ({
          at: e.at,
          actor: e.actor,
          kind: 'event' as const,
          verb: e.action,
          target_title: items.find((i) => i.id === e.item_id)?.title ?? '（已删除条目）',
        }));
        setHistory(rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12));
      })
      .catch(() => setHistory([]));
  }, [detail?.id, detail?.member_ids.join(','), items]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!detail) return <div className={styles.detailPage}><div className={styles.hint}>{t('detail.loading')}</div></div>;

  const candidates = items.filter((item) => !detail.member_ids.includes(item.id)
    && (!addQuery.trim() || item.title.toLowerCase().includes(addQuery.trim().toLowerCase()))).slice(0, 8);
  /* 语义名提案（就地裁决）：挂在此 cluster 的 pending semantic_name。 */
  const nameProposals = pendingProposals.filter((pr) => pr.kind === 'semantic_name' && (pr.target_id === detail.id || pr.related_id === detail.id));

  return (
    <DetailShell
      kicker={t('nav.clusters')}
      title={detail.title}
      onBack={onBack}
      actions={<><Button small onClick={onEdit}>{t('common.edit')}</Button><Button small onClick={onDelete}>{t('common.delete')}</Button></>}
    >
      {nameProposals.map((pr) => (
        <div key={pr.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--tint-hover)', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>
            Agent 给这个书架想好了名字：<b>{humanizeProposalValue(pr.kind, pr.proposed_value)}</b>
          </span>
          {onResolve ? (
            <>
              <button type="button" style={{ border: 0, background: '#2fae55', color: '#fff', borderRadius: 999, padding: '4px 14px', cursor: 'pointer', font: 'inherit', fontSize: 12 }} onClick={() => void onResolve(pr.id, 'accepted')}>✓ 用这个</button>
              <button type="button" style={{ border: '1px solid var(--line)', background: 'transparent', borderRadius: 999, padding: '4px 14px', cursor: 'pointer', font: 'inherit', fontSize: 12 }} onClick={() => void onResolve(pr.id, 'rejected')}>✕ 不用</button>
            </>
          ) : null}
        </div>
      ))}

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
      </Block>

      <Block title={t('detail.members')}>
        {detail.member_ids.length === 0 ? (
          <div className={styles.emptyLine}>{t('detail.noMembers')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {detail.member_ids.map((id) => {
              const item = items.find((x) => x.id === id);
              return (
                <div key={id} style={{ position: 'relative', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 30px 10px 12px', background: 'var(--bg)' }}>
                  <button type="button" onClick={() => onOpenItem(id)} style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer', font: 'inherit', display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left', width: '100%' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      {item ? <Glyph kind={item.type} /> : <Glyph kind="raw.document" />}
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item?.title ?? id}</span>
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{item ? ITEM_LABELS[item.type] : id}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={t('detail.remove')}
                    onClick={() => onRemove(id)}
                    style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, border: 0, borderRadius: 99, background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer', lineHeight: 1 }}
                  >✕</button>
                </div>
              );
            })}
          </div>
        )}
        <div className={styles.addRow} style={{ marginTop: 12, position: 'relative' }}>
          <input
            className={styles.settingInput}
            placeholder="搜索条目，点选添加…"
            value={addQuery}
            onChange={(e) => setAddQuery(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
        {addQuery.trim() && candidates.length > 0 ? (
          <div style={{ border: '1px solid var(--line)', borderRadius: 10, marginTop: 6, overflow: 'hidden' }}>
            {candidates.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onAdd(item.id); setAddQuery(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 0, borderBottom: '0.5px solid var(--line)', background: 'var(--bg)', padding: '8px 12px', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}
              >
                <Glyph kind={item.type} />
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>+ 添加</span>
              </button>
            ))}
          </div>
        ) : null}
      </Block>

      <Block title="归块履历">
        {history.length === 0 ? (
          <div className={styles.emptyLine}>这个书架还没有动静。</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((h, i) => (
              <div key={`${h.at}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--ink)' }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--ink-3)', opacity: 0.5, flex: 'none' }} />
                <span style={{ flex: 1 }}>{narrate(h)}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', flex: 'none' }}>{new Date(h.at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
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
      kicker={t('nav.contexts')}
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
                <span className={styles.rowGlyph}>{item ? <Glyph kind={item.type} /> : <Glyph kind="raw.document" />}</span>
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
      </Block>
    </DetailShell>
  );
}
