import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../../services/api.ts';
import styles from './chat.module.css';

const STATUS_CLASS: Record<string, string> = {
  pending: styles.stPending,
  running: styles.stRunning,
  awaiting_user: styles.stAwaiting,
  done: styles.stDone,
  failed: styles.stFailed,
};

const STATUS_LABEL: Record<string, string> = {
  pending: '待执行',
  running: '执行中',
  awaiting_user: '等你确认',
  done: '完成',
  failed: '失败',
};

/** 原型 Onboarding 三步原文（老数据 steps 不足时兜底展示）。 */
const ONBOARDING_STEPS = [
  'Information Review',
  'Structured Data Preparation',
  'User Confirmation Before Write',
];

const MAIN_KINDS = ['collect', 'synthesize', 'compose', 'confirm'] as const;

/**
 * 任务卡（UI_PARITY_FIX_PLAN R2）：语义标题 + 竖排四步 + Onboarding 绿边常展开英文三步 +
 * 卡内右栏「还有想添加的？」（+ / 麦克风 / 蓝发送钮）；PATCH 追加段落进附加步骤区。
 */
export function TaskCard({ taskId, onPatched }: { taskId: string; onPatched?: () => void }) {
  const [proj, setProj] = useState<api.TaskProjectionResponse | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [ghost, setGhost] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);

  const load = useCallback(() => {
    void api.getTaskProjection(taskId).then(setProj).catch(() => undefined);
  }, [taskId]);

  useEffect(() => {
    load();
    timer.current = window.setInterval(load, 2000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [load]);

  async function addStage() {
    const text = draft.trim();
    if (!text || !proj || busy) return;
    setBusy(true);
    setGhost(text);
    const last = proj.stages.at(-1);
    try {
      await api.patchTaskOps(taskId, proj.task.version, [
        { op: 'add_stage', after: last?.id, kind: 'compose', name: text.slice(0, 40) },
      ]);
      setDraft('');
      load();
      onPatched?.();
    } catch {
      /* 回滚 ghost */
    } finally {
      setGhost(null);
      setBusy(false);
    }
  }

  if (!proj) return <div className={styles.taskCard}>…</div>;
  const seen = new Set<string>();
  const main = proj.stages.filter((s) => {
    if (!MAIN_KINDS.includes(s.kind as typeof MAIN_KINDS[number]) || seen.has(s.kind)) return false;
    seen.add(s.kind);
    return true;
  });
  const extras = proj.stages.filter((s) => !main.includes(s));
  const onboarding = main.find((s) => s.kind === 'confirm');

  return (
    <div className={styles.taskCard}>
      <div className={styles.taskLabel}>新建任务</div>
      <div className={styles.taskTitle}>{proj.task.title}</div>
      <div className={styles.taskGrid}>
        <div className={styles.stages}>
          {main.map((s, i) => {
            const active = s.status === 'running' || s.status === 'awaiting_user';
            const isOnboard = s.kind === 'confirm';
            const opened = isOnboard || expanded === s.id;
            const steps = isOnboard && (s.steps?.length ?? 0) < 3 ? ONBOARDING_STEPS : (s.steps ?? []);
            return (
              <div key={s.id}>
                <div
                  className={`${styles.stageCard} ${active ? styles.stageActive : ''}`}
                  onClick={() => !isOnboard && setExpanded(expanded === s.id ? null : s.id)}
                >
                  <span className={styles.stageNum}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.stageName}>{s.name}</span>
                  <span className={`${styles.stageStatus} ${STATUS_CLASS[s.status] ?? ''}`}>
                    {s.status === 'awaiting_user' ? '● ' : ''}{STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </div>
                {opened && steps.length > 0 ? (
                  <ul className={styles.stageSteps}>
                    {steps.map((step, j) => <li key={`${s.id}-${j}`}>{step}</li>)}
                  </ul>
                ) : null}
              </div>
            );
          })}
          {ghost ? (
            <div className={`${styles.stageCard} ${styles.ghost}`}>
              <span className={styles.stageNum}>{String(main.length + 1).padStart(2, '0')}</span>
              <span className={styles.stageName}>{ghost}</span>
              <span className={`${styles.stageStatus} ${styles.stPending}`}>添加中…</span>
            </div>
          ) : null}
        </div>
        <div className={styles.cardInputRow}>
          <input
            className={styles.cardInput}
            placeholder="还有想添加的？"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void addStage(); }}
          />
          <div className={styles.cardButtons}>
            <button type="button" className={styles.subtleButton} title="插入" onClick={() => document.querySelector<HTMLInputElement>(`.${styles.cardInput}`)?.focus()}>+</button>
            <button type="button" className={styles.subtleButton} title="语音" disabled>⌁</button>
            <button type="button" className={styles.sendBtn} onClick={() => void addStage()} disabled={busy || !draft.trim()}>↑</button>
          </div>
        </div>
      </div>
      {extras.length > 0 ? (
        <div className={styles.extraSteps}>附加步骤：{extras.map((s) => s.name).join(' · ')}</div>
      ) : null}
      {onboarding?.status === 'awaiting_user' ? (
        <div className={styles.note} style={{ marginTop: 10 }}>启动关键信息的Onboarding的交互流</div>
      ) : null}
    </div>
  );
}
