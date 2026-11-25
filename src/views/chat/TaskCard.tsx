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

/**
 * 任务卡（GSC_CHAT_PLAN §2 Step 5）：管线小卡（序号/状态色/展开 steps/awaiting_user 黄标）
 * + 卡内「还有想添加的？」→ PATCH add_stage（乐观插 ghost，响应确认/回滚）。
 * 投影=GET /api/tasks/:id 纯函数渲染；V1 轮询 2s（WS 后置）。
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
  const stages = proj.stages;

  return (
    <div className={styles.taskCard}>
      <div className={styles.taskLabel}>新建任务</div>
      <div className={styles.taskTitle}>{proj.task.title}</div>
      <div className={styles.taskGoal}>{proj.task.goal}</div>
      <div className={styles.stages}>
        {stages.map((s, i) => {
          const active = s.status === 'running' || s.status === 'awaiting_user';
          return (
            <div
              key={s.id}
              className={`${styles.stageCard} ${active ? styles.stageActive : ''}`}
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
            >
              <div className={styles.stageNum}>{String(i + 1).padStart(2, '0')}</div>
              <div className={styles.stageName}>{s.name}</div>
              <div className={`${styles.stageStatus} ${STATUS_CLASS[s.status] ?? ''}`}>
                {s.status === 'awaiting_user' ? '● ' : ''}{STATUS_LABEL[s.status] ?? s.status}
              </div>
            </div>
          );
        })}
        {ghost ? (
          <div className={`${styles.stageCard} ${styles.ghost}`}>
            <div className={styles.stageNum}>{String(stages.length + 1).padStart(2, '0')}</div>
            <div className={styles.stageName}>{ghost}</div>
            <div className={`${styles.stageStatus} ${styles.stPending}`}>添加中…</div>
          </div>
        ) : null}
      </div>
      {expanded ? (
        <ul className={styles.stageSteps}>
          {(stages.find((s) => s.id === expanded)?.steps ?? []).map((step, i) => (
            <li key={`${expanded}-${i}`}>{step}</li>
          ))}
          {stages.find((s) => s.id === expanded)?.steps?.length === 0 ? <li>（无步骤）</li> : null}
        </ul>
      ) : null}
      <div className={styles.cardInputRow}>
        <input
          className={styles.cardInput}
          placeholder="还有想添加的？"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void addStage();
          }}
        />
        <button type="button" className={styles.sendBtn} onClick={() => void addStage()} disabled={busy || !draft.trim()}>
          ↑
        </button>
      </div>
    </div>
  );
}
