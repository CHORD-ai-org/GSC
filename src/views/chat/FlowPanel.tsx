import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '../../services/api.ts';
import { parseFlow, type FlowNode } from '../../lib/uiflow.ts';
import styles from './chat.module.css';

const ACTION_LABEL: Record<string, string> = {
  meta_tag: '打标', cluster: '归块', semantic_name: '重命名', classification: '分类',
  metadata: '元信息', association: '关联', dedupe: '去重', pending_definition: '新标签定义',
};

const CANNED_RANGES = ['本周新内容', '全部项目材料', '最近30天'];
const CANNED_WAYS = ['按主题', '按时间线', '按项目阶段'];

/**
 * FlowPanel（UI_PARITY_FIX_PLAN R4）：右侧 Drawer ≈64% 宽；丝滑选择体验——
 * 单步展示、点选即流转、每步可返回、末步可读写入清单；confirm 技术原文永不渲染。
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
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [confirmedFields, setConfirmedFields] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<api.UiflowCompleteResponse | null>(null);

  const load = useCallback(() => {
    void api.getUiflow(uiflowId).then((r) => {
      setDsl(r.uiflow.dsl_text);
      setStatus(r.uiflow.status);
    }).catch(() => undefined);
  }, [uiflowId]);

  useEffect(() => { load(); }, [load]);

  const parsed = useMemo(() => parseFlow(dsl), [dsl]);
  const reviews = parsed.nodes.filter((n): n is Extract<FlowNode, { type: 'review' }> => n.type === 'review');
  const chooses = parsed.nodes.filter((n): n is Extract<FlowNode, { type: 'choose' }> => n.type === 'choose');
  const confirmNode = parsed.nodes.find((n): n is Extract<FlowNode, { type: 'confirm' }> => n.type === 'confirm');

  useEffect(() => {
    const init: Record<string, string> = {};
    for (const r of reviews) init[r.field] = r.value;
    setValues((v) => ({ ...init, ...v }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsl]);

  const goNext = () => window.setTimeout(() => setStep((s) => Math.min(3, s + 1)), 260);
  const firstChoose = chooses[0];
  const secondChoose = chooses[1];

  function pick(field: string, option: string) {
    setChoices((c) => ({ ...c, [field]: option }));
    goNext();
  }

  function confirmField(field: string) {
    setConfirmedFields((f) => (f.includes(field) ? f : [...f, field]));
    setEditing(null);
    if (confirmedFields.length + 1 >= reviews.length) goNext();
  }

  async function submit() {
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

  const progress = ['选择范围', '保留或改', '整理方式', '写入确认'];
  const readableActions = confirmNode?.actions ?? [{ name: 'metadata', arg: 'plan' }];

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)', zIndex: 40 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(760px, 92vw)', maxHeight: '88vh', zIndex: 41,
        background: 'var(--bg-surface)', border: '1px solid var(--line)',
        borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.16)', padding: '24px 28px', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{parsed.title || '关键信息确认'}</h2>
          <button type="button" className={styles.subtleButton} onClick={onClose}>关闭</button>
        </div>
        <div style={{ display: 'flex', gap: 8, margin: '12px 0 20px' }}>
          {progress.map((p, i) => (
            <span key={p} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 999,
              background: i === step ? '#E6F1FB' : 'var(--bg-sunken)',
              color: i === step ? '#185FA5' : 'var(--ink-3)',
            }}>{i + 1} {p}</span>
          ))}
        </div>

        {step === 0 ? (
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 12px' }}>这次整理覆盖哪些材料？</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(firstChoose?.options ?? CANNED_RANGES).map((o) => (
                <button key={o} type="button" className={styles.chip} style={{ borderColor: choices[firstChoose?.field ?? ''] === o ? '#378ADD' : undefined, background: choices[firstChoose?.field ?? ''] === o ? '#E6F1FB' : undefined }} onClick={() => pick(firstChoose?.field ?? '范围', o)}>{o}</button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 12px' }}>关键信息，保留还是改？</p>
            {reviews.length === 0 ? <div className={styles.note}>（无可修改的关键信息，直接下一步）</div> : null}
            {reviews.map((r) => (
              <div key={r.field} className={styles.row}>
                <span style={{ fontSize: 13, width: 90, color: 'var(--ink-3)' }}>{r.field}</span>
                {editing === r.field ? (
                  <input
                    className={styles.cardInput}
                    style={{ flex: 1 }}
                    value={values[r.field] ?? r.value}
                    onChange={(e) => setValues((v) => ({ ...v, [r.field]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmField(r.field); }}
                  />
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{values[r.field] ?? r.value}</span>
                )}
                {confirmedFields.includes(r.field) ? (
                  <span style={{ fontSize: 12, color: '#185FA5' }}>✓</span>
                ) : (
                  <>
                    <button type="button" className={styles.subtleButton} onClick={() => confirmField(r.field)}>保留</button>
                    <button type="button" className={styles.subtleButton} onClick={() => setEditing(editing === r.field ? null : r.field)}>改</button>
                    {editing === r.field ? <button type="button" className={styles.subtleButton} onClick={() => confirmField(r.field)}>保存</button> : null}
                  </>
                )}
              </div>
            ))}
            {reviews.length === 0 ? <button type="button" className={styles.subtleButton} onClick={goNext}>下一步</button> : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 12px' }}>按什么方式整理？</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(secondChoose?.options ?? CANNED_WAYS).map((o) => (
                <button key={o} type="button" className={styles.chip} style={{ borderColor: choices[secondChoose?.field ?? ''] === o ? '#378ADD' : undefined, background: choices[secondChoose?.field ?? ''] === o ? '#E6F1FB' : undefined }} onClick={() => pick(secondChoose?.field ?? '整理方式', o)}>{o}</button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 12px' }}>写入清单</p>
            {readableActions.map((a, i) => (
              <div key={i} className={styles.row}>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', width: 60 }}>{ACTION_LABEL[a.name] ?? a.name}</span>
                <span style={{ fontSize: 13, flex: 1 }}>{values[a.arg] ?? choices[a.arg] ?? a.arg}</span>
              </div>
            ))}
            <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 12 }}>确认后创建提案，仍需你裁决才落库</p>
            {result ? (
              <p style={{ fontSize: 13, color: '#185FA5', marginTop: 14 }}>已生成提案，等待裁决</p>
            ) : (
              <button type="button" className={styles.chip} style={{ background: '#E6F1FB', borderColor: '#378ADD', color: '#185FA5', marginTop: 14 }} disabled={busy} onClick={() => void submit()}>确认写入</button>
            )}
          </div>
        ) : null}

        <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between' }}>
          {step > 0 ? <button type="button" className={styles.subtleButton} onClick={() => setStep((s) => s - 1)}>返回</button> : <span />}
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{status}</span>
        </div>
      </div>
    </>
  );
}
