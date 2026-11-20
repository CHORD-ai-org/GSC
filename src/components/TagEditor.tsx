import { useState } from 'react';
import type { TagDefinitionDTO, TagValueDTO } from '../lib/tags.ts';
import { isValidScope } from '../lib/tags.ts';
import styles from '../views/views.module.css';

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
        <div className={styles.hint}>暂无标签。标签维度受控定义（D-064），取值自由。</div>
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
                {tv.confirmed ? '✓ 已确认' : '确认'}
              </button>
              <button type="button" className={styles.linkButton} onClick={() => void onDelete(tv.id)}>移除</button>
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
            placeholder="标签取值"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <input
            className={styles.search}
            placeholder="作用域（global / project:x / context:y）"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          />
          <button type="button" className={styles.primaryButton} disabled={busy || !value.trim() || !isValidScope(scope)} onClick={() => void add()}>
            打标签
          </button>
        </div>
      ) : null}
      <div className={styles.hint}>作用域限定该取值的有效范围；只有已确认的 User Profile 取值会输出给外部 Agent（D-066）。</div>
    </div>
  );
}
