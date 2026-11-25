import { useCallback, useEffect, useState } from 'react';
import * as api from '../../services/api.ts';
import { parseFlow, type FlowNode } from '../../lib/uiflow.ts';
import styles from './chat.module.css';

/**
 * FlowPanel（GSC_CHAT_PLAN §2 Step 7）：右侧 Drawer ≈60-70% 宽（原型内嵌承诺）。
 * review 可改预填 / collect 表单 / choose 单选 / confirm 显式写入清单 →
 * 确认 = POST complete（confirm 动作→提案链，D-042；结果回流 stage.detail）。
 */
export function FlowPanel({
  uiflowId, onClose, onCompleted,
}: {
  uiflowId: string;
  onClose: () => void;
  onCompleted?: () => void;
}) {
  const [dsl, setDsl] = useState('');
  const [status, setStatus] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<api.UiflowCompleteResponse | null>(null);

  const load = useCallback(() => {
    void api.getUiflow(uiflowId).then((r) => {
      setDsl(r.uiflow.dsl_text);
      setStatus(r.uiflow.status);
    }).catch(() => undefined);
  }, [uiflowId]);

  useEffect(() => { load(); }, [load]);

  const parsed = parseFlow(dsl);
  const nodes = parsed.nodes;

  // 预填 review 默认值
  useEffect(() => {
    const init: Record<string, string> = {};
    for (const n of nodes) if (n.type === 'review') init[n.field] = n.value;
    setValues((v) => ({ ...init, ...v }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsl]);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.completeUiflow(uiflowId, values, choices);
      setResult(r);
      setStatus('done');
      onCompleted?.();
    } catch {
      /* 保留在面板 */
    } finally {
      setBusy(false);
    }
  }

  function renderNode(n: FlowNode, i: number) {
    if (n.type === 'note') return <div key={i} className={styles.note}>{n.text}</div>;
    if (n.type === 'review') return (
      <label key={i} style={{ display: 'block', margin: '10px 0' }}>
        <div style={{ fontSize: 12, marginBottom: 4 }}>{n.field}</div>
        <input
          className={styles.cardInput}
          style={{ width: '100%' }}
          value={values[n.field] ?? n.value}
          onChange={(e) => setValues((v) => ({ ...v, [n.field]: e.target.value }))}
        />
      </label>
    );
    if (n.type === 'collect') return (
      <label key={i} style={{ display: 'block', margin: '10px 0' }}>
        <div style={{ fontSize: 12, marginBottom: 4 }}>{n.field}</div>
        <input
          className={styles.cardInput}
          style={{ width: '100%' }}
          value={values[n.field] ?? ''}
          placeholder="请输入…"
          onChange={(e) => setValues((v) => ({ ...v, [n.field]: e.target.value }))}
        />
      </label>
    );
    if (n.type === 'choose') return (
      <div key={i} style={{ margin: '10px 0' }}>
        <div style={{ fontSize: 12, marginBottom: 4 }}>{n.field}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {n.options.map((o) => (
            <button
              key={o}
              type="button"
              className={choices[n.field] === o ? styles.sendBtn : styles.refChip}
              style={choices[n.field] === o ? { width: 'auto', height: 'auto', padding: '4px 12px', borderRadius: 999 } : { cursor: 'pointer' }}
              onClick={() => setChoices((c) => ({ ...c, [n.field]: o }))}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    );
    if (n.type === 'reference') return <span key={i} className={styles.refChip}>📄 {n.ref}</span>;
    if (n.type === 'confirm') return (
      <div key={i} className={styles.flowChip} style={{ display: 'block', marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>写入清单（确认后创建提案）</div>
        {n.actions.map((a, j) => (
          <div key={j} style={{ fontSize: 11 }}>· {a.name} → {values[a.arg] ?? a.arg}</div>
        ))}
      </div>
    );
    return null;
  }

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)', zIndex: 40 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '64%', zIndex: 41,
        background: 'var(--bg-surface)', borderLeft: '1px solid var(--line)',
        boxShadow: '-12px 0 32px rgba(0,0,0,0.12)', padding: '22px 26px', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>{parsed.title || '交互面'}</h2>
          <button type="button" className={styles.refChip} style={{ cursor: 'pointer' }} onClick={onClose}>关闭</button>
        </div>
        <div className={styles.note} style={{ margin: '6px 0 14px' }}>
          Onboarding · {status || '…'}{parsed.degraded ? ' · 部分内容已降级展示' : ''}
        </div>
        {nodes.map(renderNode)}
        {result ? (
          <div className={styles.note} style={{ marginTop: 14 }}>
            已提交：创建 {result.proposals} 条提案（待你确认后落库）
            {result.notes.map((n2, i) => <div key={i}>{n2}</div>)}
          </div>
        ) : status === 'active' ? (
          <button
            type="button"
            className={styles.sendBtn}
            style={{ width: 'auto', height: 'auto', padding: '9px 22px', borderRadius: 999, marginTop: 16 }}
            disabled={busy}
            onClick={() => void confirm()}
          >
            确认写入
          </button>
        ) : null}
      </div>
    </>
  );
}
