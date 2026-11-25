import { randomUUID, createHash } from 'node:crypto';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type { Database } from '../persistence/client.ts';
import {
  conversations, messages, messageBlocks, tasks, taskStages, uiflows, taskPatches, taskEvents,
} from '../persistence/schema.ts';

/* ── GSC 对话工作面（G7）仓储 — GSC_CHAT_PLAN.md v2 Step 2 ──
   ord 稀疏惯例：间隔 1024，插入免重排。枚举语义由 DB CHECK 兜底，此处做白名单/转移表。 */

export type ConversationDTO = { id: string; title: string; created_at: string };
export type MessageDTO = { id: string; conversation_id: string; role: string; content: string; created_at: string };
export type BlockKind = 'text' | 'operation' | 'flow' | 'reference' | 'note';
export type BlockDTO = { id: string; message_id: string; kind: BlockKind; ord: number; ref_id: string | null; content: string };
export type StageKind = 'collect' | 'synthesize' | 'compose' | 'confirm';
export type StageStatus = 'pending' | 'running' | 'awaiting_user' | 'done' | 'failed';
export type StageDTO = {
  id: string; task_id: string; kind: StageKind; name: string; ord: number;
  status: StageStatus; attempts: number; steps: string[]; detail: string;
};
export type TaskDTO = { id: string; message_id: string; title: string; goal: string; status: string; version: number };

export type PatchOp =
  | { op: 'add_stage'; after?: string | number; kind: StageKind; name: string; steps?: string[] }
  | { op: 'update_stage'; target: string | number; name?: string; steps?: string[]; kind?: StageKind }
  | { op: 'remove_stage'; target: string | number }
  | { op: 'move_stage'; target: string | number; after?: string | number };

export type PatchOutcome = {
  applied: { op_hash: string; op: PatchOp }[];
  proposed: { patch_id: string; op_hash: string; op: PatchOp }[];
  replayed: number;
};

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid stage transition: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export class VersionConflictError extends Error {
  constructor(expected: number, actual: number) {
    super(`Version conflict: expected ${expected}, actual ${actual}`);
    this.name = 'VersionConflictError';
  }
}

export class PatchTargetError extends Error {
  constructor(ref: string) {
    super(`Patch target not found: ${ref}`);
    this.name = 'PatchTargetError';
  }
}

/* ── 状态机转移表（非法迁移全拒）── */
const TRANSITIONS: Record<StageStatus, StageStatus[]> = {
  pending: ['running'],
  running: ['running', 'awaiting_user', 'done', 'failed'], // running→running = 重试
  awaiting_user: ['running', 'failed'],
  done: [],
  failed: [],
};

export function canTransition(from: StageStatus, to: StageStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

const ORD_STEP = 1024;

async function nextOrdOf(fetch: () => Promise<{ ord: number }[]>): Promise<number> {
  const rows = await fetch();
  return rows.reduce((m, r) => Math.max(m, r.ord), 0) + ORD_STEP;
}

/** ord 竞态重试：并发分配撞 UNIQUE(task/message_id, ord) 时重算再插（≤3 次）。
    drizzle 的唯一键违例在 error.code='23505'/detail 里，不在 message 里。 */
function isUniqueViolation(e: unknown): boolean {
  let cur: unknown = e;
  for (let depth = 0; cur && depth < 4; depth += 1) {
    const err = cur as { message?: string; detail?: string; code?: string };
    const hay = `${err.message ?? ''} ${err.detail ?? ''} ${err.code ?? ''}`;
    if (hay.includes('23505') || hay.includes('already exists') || hay.includes('duplicate key')) return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

async function insertWithOrdRetry<T>(attempt: () => Promise<T>, max = 10): Promise<T> {
  for (let i = 0; ; i += 1) {
    try {
      return await attempt();
    } catch (e) {
      if (i >= max - 1 || !isUniqueViolation(e)) throw e;
    }
  }
}

function parseSteps(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function stageDTO(r: typeof taskStages.$inferSelect): StageDTO {
  return {
    id: r.id, task_id: r.task_id, kind: r.kind as StageKind, name: r.name, ord: r.ord,
    status: r.status as StageStatus, attempts: r.attempts, steps: parseSteps(r.steps), detail: r.detail,
  };
}

async function logTaskEvent(db: Database, taskId: string, stageId: string | null, action: string, detail: string, actor = 'agent'): Promise<void> {
  await db.insert(taskEvents).values({
    id: `tev_${randomUUID()}`, task_id: taskId, stage_id: stageId, actor, action, detail, at: new Date(),
  });
}

/* ── 对话与消息块 ── */

export async function createConversation(db: Database, title: string): Promise<ConversationDTO> {
  const id = `cnv_${randomUUID()}`;
  const now = new Date();
  await db.insert(conversations).values({ id, title: title.slice(0, 200), created_at: now });
  return { id, title, created_at: now.toISOString() };
}

export async function listConversations(db: Database): Promise<ConversationDTO[]> {
  const rows = await db.select().from(conversations).orderBy(desc(conversations.created_at));
  return rows.map((r) => ({ id: r.id, title: r.title, created_at: r.created_at.toISOString() }));
}

export async function getConversation(db: Database, id: string): Promise<ConversationDTO | undefined> {
  const [row] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return row ? { id: row.id, title: row.title, created_at: row.created_at.toISOString() } : undefined;
}

export async function addMessage(
  db: Database,
  conversationId: string,
  role: 'user' | 'agent',
  content: string,
  blocks: { kind: BlockKind; ref_id?: string; content: string }[] = [],
): Promise<{ message: MessageDTO; blocks: BlockDTO[] }> {
  const id = `msg_${randomUUID()}`;
  const now = new Date();
  await db.insert(messages).values({ id, conversation_id: conversationId, role, content, created_at: now });
  const out: BlockDTO[] = [];
  for (const b of blocks) {
    const bid = `blk_${randomUUID()}`;
    const ord = await insertWithOrdRetry(async () => {
      const o = await nextOrdOf(() => db.select({ ord: messageBlocks.ord }).from(messageBlocks).where(eq(messageBlocks.message_id, id)));
      await db.insert(messageBlocks).values({
        id: bid, message_id: id, kind: b.kind, ord: o, ref_id: b.ref_id ?? null, content: b.content,
      });
      return o;
    });
    out.push({ id: bid, message_id: id, kind: b.kind, ord, ref_id: b.ref_id ?? null, content: b.content });
  }
  return {
    message: { id, conversation_id: conversationId, role, content, created_at: now.toISOString() },
    blocks: out,
  };
}

export async function addBlock(db: Database, messageId: string, b: { kind: BlockKind; ref_id?: string; content: string }): Promise<BlockDTO> {
  const id = `blk_${randomUUID()}`;
  const ord = await insertWithOrdRetry(async () => {
    const o = await nextOrdOf(() => db.select({ ord: messageBlocks.ord }).from(messageBlocks).where(eq(messageBlocks.message_id, messageId)));
    await db.insert(messageBlocks).values({
      id, message_id: messageId, kind: b.kind, ord: o, ref_id: b.ref_id ?? null, content: b.content,
    });
    return o;
  });
  return { id, message_id: messageId, kind: b.kind, ord, ref_id: b.ref_id ?? null, content: b.content };
}

export async function listMessages(db: Database, conversationId: string): Promise<MessageDTO[]> {
  const rows = await db.select().from(messages)
    .where(eq(messages.conversation_id, conversationId))
    .orderBy(messages.created_at);
  return rows.map((r) => ({
    id: r.id, conversation_id: r.conversation_id, role: r.role, content: r.content, created_at: r.created_at.toISOString(),
  }));
}

export async function listBlocks(db: Database, messageIds: string[]): Promise<BlockDTO[]> {
  if (messageIds.length === 0) return [];
  const rows = await db.select().from(messageBlocks)
    .where(inArray(messageBlocks.message_id, messageIds))
    .orderBy(asc(messageBlocks.ord));
  return rows.map((r) => ({
    id: r.id, message_id: r.message_id, kind: r.kind as BlockKind, ord: r.ord, ref_id: r.ref_id, content: r.content,
  }));
}

/* ── 任务与阶段 ── */

export async function createTask(
  db: Database,
  body: { message_id: string; title: string; goal: string; stages: { kind: StageKind; name: string; steps?: string[] }[] },
): Promise<{ task: TaskDTO; stages: StageDTO[] }> {
  const id = `tsk_${randomUUID()}`;
  const now = new Date();
  await db.insert(tasks).values({
    id, message_id: body.message_id, title: body.title.slice(0, 200), goal: body.goal, status: 'active', version: 1,
  });
  await logTaskEvent(db, id, null, 'created', `task "${body.title}" created`);
  const stages: StageDTO[] = [];
  for (const [i, s] of body.stages.entries()) {
    stages.push(await insertStage(db, id, s, (i + 1) * ORD_STEP));
  }
  return {
    task: { id, message_id: body.message_id, title: body.title, goal: body.goal, status: 'active', version: 1 },
    stages,
  };
}

async function insertStage(
  db: Database,
  taskId: string,
  s: { kind: StageKind; name: string; steps?: string[] },
  ord: number,
): Promise<StageDTO> {
  const id = `stg_${randomUUID()}`;
  await insertWithOrdRetry(async () => {
    await db.insert(taskStages).values({
      id, task_id: taskId, kind: s.kind, name: s.name.slice(0, 80), ord,
      status: 'pending', attempts: 0, steps: JSON.stringify(s.steps ?? []), detail: '',
    });
  });
  await logTaskEvent(db, taskId, id, 'stage_created', `${s.kind} "${s.name}"`);
  return {
    id, task_id: taskId, kind: s.kind, name: s.name, ord, status: 'pending', attempts: 0,
    steps: s.steps ?? [], detail: '',
  };
}

export async function getTaskWithStages(db: Database, taskId: string): Promise<{ task: TaskDTO; stages: StageDTO[] } | undefined> {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!row) return undefined;
  const rows = await db.select().from(taskStages).where(eq(taskStages.task_id, taskId)).orderBy(asc(taskStages.ord));
  return {
    task: { id: row.id, message_id: row.message_id, title: row.title, goal: row.goal, status: row.status, version: row.version },
    stages: rows.map(stageDTO),
  };
}

/**
 * 状态机迁移（转移表白名单）；非法迁移 throw InvalidTransitionError。
 * 对账不变式：每次迁移留 task_events 行。bumpAttempts=重试计数。
 */
export async function transitionStage(
  db: Database,
  stageId: string,
  to: StageStatus,
  opts: { detail?: string; bumpAttempts?: boolean; actor?: string } = {},
): Promise<StageDTO> {
  const [row] = await db.select().from(taskStages).where(eq(taskStages.id, stageId)).limit(1);
  if (!row) throw new PatchTargetError(stageId);
  const from = row.status as StageStatus;
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
  await db.update(taskStages).set({
    status: to,
    attempts: opts.bumpAttempts ? row.attempts + 1 : row.attempts,
    detail: opts.detail ?? row.detail,
  }).where(eq(taskStages.id, stageId));
  await logTaskEvent(db, row.task_id, stageId, 'stage_transition', `${from} -> ${to}${opts.detail ? ` (${opts.detail})` : ''}`, opts.actor ?? 'agent');
  const [updated] = await db.select().from(taskStages).where(eq(taskStages.id, stageId)).limit(1);
  return stageDTO(updated);
}

/* ── 卡内 PATCH（§1.4：算子+op_hash 幂等+即时/提案分流）── */

function canonicalOp(op: PatchOp): string {
  const keys = Object.keys(op as Record<string, unknown>).sort();
  return JSON.stringify(op, keys);
}

function opHash(op: PatchOp): string {
  return createHash('sha1').update(canonicalOp(op)).digest('hex');
}

/** 算子分流：add/update(改名/追加 steps)=即时；remove/move/update 改 kind=提案。 */
function isImmediate(op: PatchOp): boolean {
  if (op.op === 'add_stage') return true;
  if (op.op === 'update_stage') return op.kind === undefined; // 改 kind 走提案
  return false;
}

async function resolveStageRef(db: Database, taskId: string, ref: string | number | undefined): Promise<{ id: string; ord: number } | undefined> {
  if (ref === undefined || ref === null) return undefined;
  const rows = await db.select().from(taskStages).where(eq(taskStages.task_id, taskId)).orderBy(asc(taskStages.ord));
  if (typeof ref === 'number' || /^\d+$/.test(String(ref))) {
    const idx = Number(ref) - 1; // 流水序号 1-based
    return rows[idx] ? { id: rows[idx].id, ord: rows[idx].ord } : undefined;
  }
  const found = rows.find((r) => r.id === ref);
  return found ? { id: found.id, ord: found.ord } : undefined;
}

async function applyOp(db: Database, taskId: string, op: PatchOp): Promise<void> {
  if (op.op === 'add_stage') {
    await insertWithOrdRetry(async () => {
      const after = await resolveStageRef(db, taskId, op.after);
      const ord = after ? after.ord + ORD_STEP / 2 : await nextOrdOf(() => db.select({ ord: taskStages.ord }).from(taskStages).where(eq(taskStages.task_id, taskId)));
      await insertStage(db, taskId, { kind: op.kind, name: op.name, steps: op.steps ?? [] }, ord);
    });
    return;
  }
  const target = await resolveStageRef(db, taskId, op.target);
  if (!target) throw new PatchTargetError(String(op.target));
  if (op.op === 'update_stage') {
    const patch: Record<string, unknown> = {};
    if (op.name !== undefined) patch.name = op.name.slice(0, 80);
    if (op.steps !== undefined) patch.steps = JSON.stringify(op.steps);
    if (op.kind !== undefined) patch.kind = op.kind;
    if (Object.keys(patch).length > 0) await db.update(taskStages).set(patch).where(eq(taskStages.id, target.id));
    await logTaskEvent(db, taskId, target.id, 'stage_updated', canonicalOp(op));
  } else if (op.op === 'remove_stage') {
    await db.delete(taskStages).where(eq(taskStages.id, target.id));
    await logTaskEvent(db, taskId, target.id, 'stage_removed', `ord ${target.ord}`);
  } else if (op.op === 'move_stage') {
    const after = await resolveStageRef(db, taskId, op.after);
    const ord = after ? after.ord + ORD_STEP / 2 : ORD_STEP / 2;
    await db.update(taskStages).set({ ord }).where(eq(taskStages.id, target.id));
    await logTaskEvent(db, taskId, target.id, 'stage_moved', `after ${op.after ?? 'head'}`);
  }
}

/**
 * 卡内 PATCH：乐观锁 version 校验 → 逐算子 op_hash 幂等 → 即时应用 / 提案落 task_patches。
 * 重放（同 (task_id, op_hash)）零重复，回执标记 replayed。
 */
export async function patchTask(
  db: Database,
  taskId: string,
  ops: PatchOp[],
  version: number,
): Promise<PatchOutcome> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) throw new PatchTargetError(taskId);
  if (task.version !== version) throw new VersionConflictError(version, task.version);

  const outcome: PatchOutcome = { applied: [], proposed: [], replayed: 0 };
  let bumped = false;
  for (const op of ops) {
    const hash = opHash(op);
    const [existing] = await db.select().from(taskPatches)
      .where(and(eq(taskPatches.task_id, taskId), eq(taskPatches.op_hash, hash))).limit(1);
    if (existing) {
      outcome.replayed += 1;
      continue;
    }
    const patchId = `tpa_${randomUUID()}`;
    const now = new Date();
    if (isImmediate(op)) {
      await applyOp(db, taskId, op);
      await db.insert(taskPatches).values({
        id: patchId, task_id: taskId, op_hash: hash, op_kind: op.op, op: canonicalOp(op),
        status: 'applied', created_at: now,
      });
      outcome.applied.push({ op_hash: hash, op });
      bumped = true;
    } else {
      await db.insert(taskPatches).values({
        id: patchId, task_id: taskId, op_hash: hash, op_kind: op.op, op: canonicalOp(op),
        status: 'proposed', created_at: now,
      });
      await logTaskEvent(db, taskId, null, 'patch_proposed', `${op.op} ${hash.slice(0, 8)}`);
      outcome.proposed.push({ patch_id: patchId, op_hash: hash, op });
    }
  }
  if (bumped) {
    // 结构变更只在批次收口处推进 version 一次（乐观锁语义：一批=一个版本）
    await db.update(tasks).set({ version: version + 1 }).where(eq(tasks.id, taskId));
  }
  return outcome;
}

/** 提案裁决：accept=应用算子（D-042「确认才落」任务域版），reject=留痕不应用。 */
export async function resolvePatchOp(
  db: Database,
  patchId: string,
  decision: 'accepted' | 'rejected',
  version: number,
): Promise<TaskDTO> {
  const [p] = await db.select().from(taskPatches).where(eq(taskPatches.id, patchId)).limit(1);
  if (!p) throw new PatchTargetError(patchId);
  const [task] = await db.select().from(tasks).where(eq(tasks.id, p.task_id)).limit(1);
  if (task.version !== version) throw new VersionConflictError(version, task.version);
  if (p.status !== 'proposed') return task; // 幂等：已裁决不动
  const now = new Date();
  if (decision === 'accepted') {
    const op = JSON.parse(p.op) as PatchOp;
    await applyOp(db, p.task_id, op);
    await db.update(tasks).set({ version: version + 1 }).where(eq(tasks.id, p.task_id));
    await db.update(taskPatches).set({ status: 'accepted', resolved_at: now }).where(eq(taskPatches.id, patchId));
    await logTaskEvent(db, p.task_id, null, 'patch_accepted', `${p.op_kind} ${p.op_hash.slice(0, 8)}`, 'user');
  } else {
    await db.update(taskPatches).set({ status: 'rejected', resolved_at: now }).where(eq(taskPatches.id, patchId));
    await logTaskEvent(db, p.task_id, null, 'patch_rejected', `${p.op_kind} ${p.op_hash.slice(0, 8)}`, 'user');
  }
  const [t] = await db.select().from(tasks).where(eq(tasks.id, p.task_id)).limit(1);
  return { id: t.id, message_id: t.message_id, title: t.title, goal: t.goal, status: t.status, version: t.version };
}

export async function listTaskPatches(db: Database, taskId: string, status?: string): Promise<{ id: string; op_hash: string; op_kind: string; op: string; status: string }[]> {
  const rows = status
    ? await db.select().from(taskPatches).where(and(eq(taskPatches.task_id, taskId), eq(taskPatches.status, status)))
    : await db.select().from(taskPatches).where(eq(taskPatches.task_id, taskId));
  return rows.map((r) => ({ id: r.id, op_hash: r.op_hash, op_kind: r.op_kind, op: r.op, status: r.status }));
}


/* ── Step 3 编排器支撑 ── */

export async function getMessage(db: Database, id: string): Promise<MessageDTO | undefined> {
  const [row] = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
  return row ? { id: row.id, conversation_id: row.conversation_id, role: row.role, content: row.content, created_at: row.created_at.toISOString() } : undefined;
}

export async function setTaskStatus(db: Database, taskId: string, status: 'active' | 'done' | 'failed'): Promise<void> {
  await db.update(tasks).set({ status }).where(eq(tasks.id, taskId));
}

export type UiFlowDTO = { id: string; task_id: string; stage_id: string; kind: string; dsl_text: string; status: string };

export async function createUiflow(db: Database, body: { task_id: string; stage_id: string; kind?: string; dsl_text: string }): Promise<UiFlowDTO> {
  const id = `uif_${randomUUID()}`;
  await db.insert(uiflows).values({
    id, task_id: body.task_id, stage_id: body.stage_id, kind: body.kind ?? 'onboarding',
    dsl_text: body.dsl_text, status: 'active',
  });
  return { id, task_id: body.task_id, stage_id: body.stage_id, kind: body.kind ?? 'onboarding', dsl_text: body.dsl_text, status: 'active' };
}

export async function setUiflowStatus(db: Database, id: string, status: 'draft' | 'active' | 'done' | 'abandoned'): Promise<void> {
  await db.update(uiflows).set({ status }).where(eq(uiflows.id, id));
}

export async function listUiflowsByTask(db: Database, taskId: string): Promise<UiFlowDTO[]> {
  const rows = await db.select().from(uiflows).where(eq(uiflows.task_id, taskId));
  return rows.map((r) => ({ id: r.id, task_id: r.task_id, stage_id: r.stage_id, kind: r.kind, dsl_text: r.dsl_text, status: r.status }));
}

export async function getUiflow(db: Database, id: string): Promise<UiFlowDTO | undefined> {
  const [row] = await db.select().from(uiflows).where(eq(uiflows.id, id)).limit(1);
  return row ? { id: row.id, task_id: row.task_id, stage_id: row.stage_id, kind: row.kind, dsl_text: row.dsl_text, status: row.status } : undefined;
}

/** SIDEBAR_PLAN 余项：对话行 awaiting_user 黄点（task_stages 聚合，一条 join）。 */
export async function listConversationsWithStatus(db: Database): Promise<(ConversationDTO & { awaiting: boolean })[]> {
  const convs = await listConversations(db);
  const rows = await db.select().from(taskStages).where(eq(taskStages.status, 'awaiting_user'));
  const taskIds = new Set(rows.map((r) => r.task_id));
  const allTasks = await db.select().from(tasks);
  const convByTask = new Map(allTasks.map((t) => [t.id, t.message_id]));
  const allMsgs = await db.select().from(messages);
  const convByMsg = new Map(allMsgs.map((m) => [m.id, m.conversation_id]));
  const awaitingConvs = new Set<string>();
  for (const tid of taskIds) {
    const mid = convByTask.get(tid);
    const cid = mid ? convByMsg.get(mid) : undefined;
    if (cid) awaitingConvs.add(cid);
  }
  return convs.map((c) => ({ ...c, awaiting: awaitingConvs.has(c.id) }));
}
