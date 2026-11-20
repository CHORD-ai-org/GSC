import { useState } from 'react';
import { ITEM_LABELS, RAW_TYPES } from '../lib/items.ts';
import type { ItemType } from '../lib/items.ts';
import { SemTag } from './SemTag.tsx';
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
          placeholder="Semantic Name"
          aria-label="Semantic Name"
        />
        <SemTag kind={nameState} label={nameState === 'confirmed' ? '已命名' : '机器建议'} />
      </div>

      <div className={styles.sheetMeta}>
        <select value={sheet.type} onChange={(e) => onPatch({ type: e.target.value as ItemType })} aria-label="Information type">
          {RAW_TYPES.map((t) => <option key={t} value={t}>{ITEM_LABELS[t]}</option>)}
        </select>
        {sheet.type === 'raw.message' ? (
          <input
            value={sheet.author}
            placeholder="author"
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
          {sheet.start !== undefined ? `source ${sheet.start}–${sheet.end}` : 'no precise source ref'}
        </span>
      </div>

      <div className={`${styles.excerpt} ${open ? styles.excerptOpen : ''}`} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} title={open ? '收起' : '展开全文'}>
        {open ? sheet.content : `${sheet.content.slice(0, 280)}${sheet.content.length > 280 ? '…' : ''}`}
      </div>

      <div className={styles.tagRow} onClick={(e) => e.stopPropagation()}>
        {sheet.tags.map((t, i) => (
          <span className={styles.tagChip} key={`${t.dim}-${i}`}>
            <b>{t.dim}</b> {t.value}
            <button type="button" aria-label="Remove tag" onClick={() => onPatch({ tags: sheet.tags.filter((_, j) => j !== i) })}>×</button>
          </span>
        ))}
        {!tagOpen ? (
          <button type="button" className={styles.tagAdd} onClick={() => setTagOpen(true)}>+ Tag</button>
        ) : (
          <span className={styles.tagAddRow}>
            <select value={tagDim} onChange={(e) => setTagDim(e.target.value)} aria-label="Tag dimension">
              {tagDimensions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input
              value={tagValue}
              placeholder="取值"
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
              加
            </button>
            <button type="button" className={styles.ghost} onClick={() => setTagOpen(false)}>取消</button>
          </span>
        )}
      </div>

      <div className={styles.sheetActions} onClick={(e) => e.stopPropagation()}>
        {sheet.status === 'rejected' || sheet.status === 'deferred' ? (
          <>
            <span className={styles.stateNote}>{sheet.status === 'rejected' ? '已拒绝 — 不会入库' : '已延后 — 未决'}</span>
            <button type="button" className={styles.action} onClick={onRestore}>恢复</button>
          </>
        ) : (
          <>
            <button type="button" className={`${styles.action} ${styles.accept}`} onClick={onAccept}>
              {sheet.status === 'accepted' || sheet.status === 'edited' ? '✓ 已采纳' : '采纳'}
            </button>
            <button type="button" className={styles.action} onClick={onDefer}>延后</button>
            <button type="button" className={`${styles.action} ${styles.reject}`} onClick={onReject}>拒绝</button>
            <button type="button" className={styles.action} onClick={onSplit}>拆分</button>
            <button type="button" className={styles.action} onClick={onMergeToggle}>
              {mergePicked ? '✓ 待合并' : '合并'}
            </button>
          </>
        )}
        {!canPersist ? null : sheet.persistError ? (
          <span className={`${styles.stateNote} ${styles.bad}`}>入库失败：{sheet.persistError}（可重试）</span>
        ) : null}
      </div>
    </article>
  );
}
