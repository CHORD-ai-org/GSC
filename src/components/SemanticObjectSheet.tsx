import { useState } from 'react';
import { ITEM_LABELS, RAW_TYPES } from '../lib/items.ts';
import type { ItemType } from '../lib/items.ts';
import { SemTag } from './SemTag.tsx';
import { useT } from '../lib/i18n.tsx';
import styles from '../views/lightup.module.css';

export type SheetStatus = 'ready' | 'accepted' | 'edited' | 'rejected' | 'deferred';

export type PendingTag = { dim: string; value: string };

export type Sheet = {
  key: string;
  title: string;
  content: string;
  start?: number;
  end?: number;
  nameOrigin: 'rule' | 'agent' | 'user';
  status: SheetStatus;
  type: ItemType;
  author: string;
  locator: string;
  tags: PendingTag[];
  persistError?: string;
};

/**
 * Semantic Object Sheet (LIGHT_UP_UX_VISION §Shape): the editorial unit of
 * Light Up. Semantic name is prominent; original content is always visible and
 * never replaced. Original / machine / user states are visually distinct.
 */
export function SemanticObjectSheet({
  sheet,
  index,
  selected,
  tagDimensions,
  onSelect,
  onPatch,
  onAccept,
  onReject,
  onDefer,
  onRestore,
  onSplit,
  onMergeToggle,
  mergePicked,
}: {
  sheet: Sheet;
  index: number;
  selected: boolean;
  tagDimensions: string[];
  onSelect: () => void;
  onPatch: (patch: Partial<Sheet>) => void;
  onAccept: () => void;
  onReject: () => void;
  onDefer: () => void;
  onRestore: () => void;
  onSplit: () => void;
  onMergeToggle: () => void;
  mergePicked: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagDim, setTagDim] = useState(tagDimensions[0] ?? 'Interest');
  const [tagValue, setTagValue] = useState('');

  const nameState = sheet.nameOrigin === 'user' ? 'confirmed' : 'machine';
  const canPersist = sheet.status !== 'rejected' && sheet.status !== 'deferred';

  return (
    <article
      className={`${styles.sheet} ${selected ? styles.sel : ''} ${sheet.status === 'rejected' ? styles.rejected : ''} ${sheet.status === 'deferred' ? styles.deferred : ''}`}
      onClick={onSelect}
    >
      <div className={styles.sheetTop}>
        <span className={styles.sheetIndex}>{String(index + 1).padStart(2, '0')}</span>
        <input
          className={styles.nameInput}
          value={sheet.title}
          onChange={(e) => onPatch({ title: e.target.value, nameOrigin: 'user' })}
          onKeyDown={(e) => { if (e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
          placeholder={t('detail.semanticIdentity')}
          aria-label={t('detail.semanticIdentity')}
        />
        <SemTag kind={nameState} label={nameState === 'confirmed' ? t('sheet.named') : t('sheet.machineName')} />
      </div>

      <div className={styles.sheetMeta}>
        <select value={sheet.type} onChange={(e) => onPatch({ type: e.target.value as ItemType })} aria-label={t('sheet.type')}>
          {RAW_TYPES.map((t) => <option key={t} value={t}>{ITEM_LABELS[t]}</option>)}
        </select>
        {sheet.type === 'raw.message' ? (
          <input
            value={sheet.author}
            placeholder={t('detail.origin')}
            onChange={(e) => onPatch({ author: e.target.value })}
            aria-label="Author"
          />
        ) : null}
        {sheet.type === 'raw.evidence' ? (
          <input
            value={sheet.locator}
            placeholder="locator"
            onChange={(e) => onPatch({ locator: e.target.value })}
            aria-label="Locator"
          />
        ) : null}
        <SemTag kind="original" />
        <span className={styles.prov}>
          {sheet.start !== undefined ? t('sheet.sourceSpan', { start: sheet.start ?? 0, end: sheet.end ?? 0 }) : t('sheet.noSourceRef')}
        </span>
      </div>

      <div className={`${styles.excerpt} ${open ? styles.excerptOpen : ''}`} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} title={open ? t('sheet.collapse') : t('sheet.expand')}>
        {open ? sheet.content : `${sheet.content.slice(0, 280)}${sheet.content.length > 280 ? '…' : ''}`}
      </div>

      <div className={styles.tagRow} onClick={(e) => e.stopPropagation()}>
        {sheet.tags.map((tag, i) => (
          <span className={styles.tagChip} key={`${tag.dim}-${i}`}>
            <b>{tag.dim}</b> {tag.value}
            <button type="button" aria-label={t('tags.remove')} onClick={() => onPatch({ tags: sheet.tags.filter((_, j) => j !== i) })}>×</button>
          </span>
        ))}
        {!tagOpen ? (
          <button type="button" className={styles.tagAdd} onClick={() => setTagOpen(true)}>+ {t('overview.metaTags')}</button>
        ) : (
          <span className={styles.tagAddRow}>
            <select value={tagDim} onChange={(e) => setTagDim(e.target.value)} aria-label={t('overview.dimension')}>
              {tagDimensions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input
              value={tagValue}
              placeholder={t('sheet.tagValue')}
              onChange={(e) => setTagValue(e.target.value)}
              aria-label="Tag value"
            />
            <button
              type="button"
              className={styles.ghost}
              onClick={() => {
                if (!tagValue.trim()) return;
                onPatch({ tags: [...sheet.tags, { dim: tagDim, value: tagValue.trim() }] });
                setTagValue('');
                setTagOpen(false);
              }}
            >
              {t('tags.ok')}
            </button>
            <button type="button" className={styles.ghost} onClick={() => setTagOpen(false)}>{t('common.cancel')}</button>
          </span>
        )}
      </div>

      <div className={styles.sheetActions} onClick={(e) => e.stopPropagation()}>
        {sheet.status === 'rejected' || sheet.status === 'deferred' ? (
          <>
            <span className={styles.stateNote}>{sheet.status === 'rejected' ? t('sheet.rejectedNote') : t('sheet.deferredNote')}</span>
            <button type="button" className={styles.action} onClick={onRestore}>{t('common.restore')}</button>
          </>
        ) : (
          <>
            <button type="button" className={`${styles.action} ${styles.accept}`} onClick={onAccept}>
              {sheet.status === 'accepted' || sheet.status === 'edited' ? t('sheet.accepted') : t('common.accept')}
            </button>
            <button type="button" className={styles.action} onClick={onDefer}>{t('common.defer')}</button>
            <button type="button" className={`${styles.action} ${styles.reject}`} onClick={onReject}>{t('common.reject')}</button>
            <button type="button" className={styles.action} onClick={onSplit}>{t('common.split')}</button>
            <button type="button" className={styles.action} onClick={onMergeToggle}>
              {mergePicked ? t('sheet.mergePick') : t('common.merge')}
            </button>
          </>
        )}
        {!canPersist ? null : sheet.persistError ? (
          <span className={`${styles.stateNote} ${styles.bad}`}>{t('sheet.persistFail', { msg: sheet.persistError })}</span>
        ) : null}
      </div>
    </article>
  );
}
