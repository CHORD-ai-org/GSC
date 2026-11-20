import { useState } from 'react';
import type { TagDefinitionDTO, TagValueDTO } from '../lib/tags.ts';
import { isValidScope } from '../lib/tags.ts';
import styles from '../views/views.module.css';
import { useT } from '../lib/i18n.tsx';

/**
 * PLAN-8 (D-064): Meta Tag assignment block — controlled dimension, free value, explicit scope.
 * Confirmation flips are human governance: only confirmed values feed User Profile output (D-066).
 */
export function TagEditor({
  definitions,
  values,
  onAdd,
  onConfirm,
  onDelete,
  readOnly,
}: {
  definitions: TagDefinitionDTO[];
  values: TagValueDTO[];
  onAdd: (body: { definition_id: string; value: string; scope: string }) => Promise<void>;
  onConfirm: (id: string, confirmed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  readOnly?: boolean;
}) {
  const t = useT();
  const [definitionId, setDefinitionId] = useState(definitions[0]?.id ?? '');
  const [value, setValue] = useState('');
  const [scope, setScope] = useState('global');
  const [busy, setBusy] = useState(false);

  const defName = (id: string) => definitions.find((d) => d.id === id)?.name ?? id;

  async function add() {
    if (!definitionId || !value.trim() || !isValidScope(scope)) return;
    setBusy(true);
    try {
      await onAdd({ definition_id: definitionId, value: value.trim(), scope });
      setValue('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {values.length === 0 ? (
        <div className={styles.hint}>{t('tags.empty')}</div>
      ) : values.map((tv) => (
        <div className={styles.tagRow} key={tv.id}>
          <span className={styles.tagDim}>{defName(tv.definition_id)}</span>
          <span className={styles.tagValue}>{tv.value}</span>
          <span className={styles.tagScope}>{tv.scope}</span>
          {!readOnly ? (
            <>
              <button
                type="button"
                className={`${styles.linkButton} ${tv.confirmed ? styles.tagConfirmed : ''}`}
                onClick={() => void onConfirm(tv.id, !tv.confirmed)}
              >
                {tv.confirmed ? t('tags.confirmed') : t('tags.confirm')}
              </button>
              <button type="button" className={styles.linkButton} onClick={() => void onDelete(tv.id)}>{t('tags.remove')}</button>
            </>
          ) : null}
        </div>
      ))}

      {!readOnly ? (
        <div className={styles.tagForm}>
          <select
            className={styles.search}
            value={definitionId}
            onChange={(e) => setDefinitionId(e.target.value)}
          >
            {definitions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <input
            className={styles.search}
            placeholder={t('tags.valuePlaceholder')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <input
            className={styles.search}
            placeholder={t('tags.scopePlaceholder')}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          />
          <button type="button" className={styles.primaryButton} disabled={busy || !value.trim() || !isValidScope(scope)} onClick={() => void add()}>
            {t('tags.add')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
