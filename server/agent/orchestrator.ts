import type { Config } from '../config.ts';
import type { Database } from '../persistence/client.ts';
import type { FetchLike, ChatMessage } from './llm.ts';
import { structuredCall, PlanError } from './structured.ts';
import { generateOnboardingFlow } from './uispec.ts';
import { suggestForChunks, suggestMetaTags } from './proposer.ts';
import {
  createTask, getTaskWithStages, transitionStage, addMessage, addBlock, getMessage,
  setTaskStatus, createUiflow, setUiflowStatus, listUiflowsByTask, getUiflow,
  type StageDTO, type TaskDTO,
} from '../repo/chat.ts';
import { listItemsPaged } from '../repo/items.ts';
import { createProposal } from '../repo/proposals.ts';
import { listTagDefinitions } from '../repo/tags.ts';
import { listProposals } from '../repo/proposals.ts';

/**
 * G7 薄编排器（GSC_CHAT_PLAN §2 Step 3，D-111）：stage 状态机驱动 + 四执行语义 +
 * confirm 停点。不是 agent framework——执行是计划内的，每步可审计（task_events）。
 * StageExecutor 插座留给未来 bounded tool-loop（V1 不实现）。
 */

export type EngineResult = {
  refs?: string[]; proposals?: number; draft?: string;
  flow?: string; need_input?: boolean;
};
export type StageOutcome = EngineResult;

/** 执行器插座：V1 默认实现四语义；tool-loop 未来作为一个实现挂上。 */
export interface StageExecutor {
  execute(ctx: ExecCtx, db: Database, task: TaskDTO, stage: StageDTO, allStages: StageDTO[]): Promise<StageOutcome>;
}

export type RunCtx = {
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  backoffMs?: number[];
  executor?: StageExecutor;
};

export type ExecCtx = RunCtx & { config: Config };

const DEFAULT_BACKOFF = [1000, 4000, 10000];

/* ── 计划生成（§1.3 契约 + 默认管线回退）── */

type PlanStage = { kind: 'collect' | 'synthesize' | 'compose' | 'confirm'; name: string; steps?: string[] };
type Plan = { title: string; goal: string; stages: PlanStage[] };

function validatePlan(v: unknown): Plan | null {
  const p = v as { title?: unknown; goal?: unknown; stages?: unknown } | null;
  if (!p || typeof p.title !== 'string' || typeof p.goal !== 'string' || !Array.isArray(p.stages)) return null;
  if (p.title.length > 200 || p.stages.length < 1 || p.stages.length > 12) return null;
  const stages: PlanStage[] = [];
  for (const raw of p.stages) {
    const s = raw as { kind?: unknown; name?: unknown; steps?: unknown };
    if (typeof s.kind !== 'string' || !['collect', 'synthesize', 'compose', 'confirm'].includes(s.kind)) return null;
    if (typeof s.name !== 'string' || !s.name || s.name.length > 80) return null;
    const steps = Array.isArray(s.steps) ? s.steps.map((x) => String(x).slice(0, 120)).slice(0, 8) : [];
    stages.push({ kind: s.kind as PlanStage['kind'], name: s.name, steps });
  }
  return { title: p.title.slice(0, 200), goal: p.goal, stages };
}

function defaultPipeline(instruction: string): Plan {
  return {
    title: instruction.slice(0, 40) || '未命名任务',
    goal: instruction,
    stages: [
      { kind: 'collect', name: '查找数据', steps: ['按指令关键词检索条目'] },
      { kind: 'synthesize', name: '分析融合', steps: ['生成命名/归类提案'] },
      { kind: 'compose', name: '撰写计划', steps: ['组装条目草稿'] },
      { kind: 'confirm', name: 'Onboarding', steps: ['Information Review', 'User Confirmation Before Write'] },
    ],
  };
}

async function generatePlan(config: Config, instruction: string, ctx: RunCtx): Promise<{ plan: Plan; fallback: boolean }> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You plan an information-organization task. Reply ONLY with JSON: '
        + '{"title":"<≤40字>","goal":"<one sentence>","stages":[{"kind":"collect|synthesize|compose|confirm","name":"<≤12字>","steps":["<step>"]}]} '
        + 'Constraints: 1..12 stages; steps ≤8 per stage; prefer the four kinds in order collect→synthesize→compose→confirm.',
    },
    { role: 'user', content: instruction },
  ];
  try {
    const plan = await structuredCall(config, messages, { validate: validatePlan, repair: 1, fetchImpl: ctx.fetchImpl });
    return { plan, fallback: false };
  } catch (e) {
    // 任何失败（违约/LLM 不可用）都回退默认管线——不静默（note 明示），不阻塞任务
    console.error('[orchestrator] plan generation fell back:', e instanceof Error ? e.message : e);
    return { plan: defaultPipeline(instruction), fallback: true };
  }
}

/* ── 四执行语义（V1 默认 StageExecutor）── */

export const defaultExecutor: StageExecutor = {
  async execute(ctx, db, task, stage, allStages): Promise<StageOutcome> {
    const { config } = ctx;
    if (stage.kind === 'collect') {
      // 分词多查（q 是子串针）：goal 拆 ≤4 个词段并集；零命中兜底取最近条目
      const terms = extractQueryTerms(task.goal);
      const ids = new Set<string>();
      for (const term of terms) {
        const page = await listItemsPaged(db, { q: term, limit: 10 });
        for (const i of page.items) ids.add(i.id);
        if (ids.size >= 20) break;
      }
      if (ids.size === 0) {
        const page = await listItemsPaged(db, { limit: 5 });
        for (const i of page.items) ids.add(i.id);
      }
      return { refs: [...ids].slice(0, 20) };
    }
    if (stage.kind === 'synthesize') {
      // refs 由同任务的 collect 阶段产出（detail=JSON ids）
      const collect = allStages.find((x) => x.kind === 'collect' && x.status === 'done');
      const ids = collect ? parseRefs(collect.detail) : [];
      if (ids.length === 0) return { proposals: 0 };
      const page = await listItemsPaged(db, { ids: ids.slice(0, 8) });
      const chunks = page.items.map((i) => ({
        title: i.title,
        content: String((i.fields as Record<string, unknown>).content_text ?? i.title).slice(0, 2000),
      }));
      const suggestions = await suggestForChunks(config, chunks, ctx.fetchImpl);
      let count = 0;
      for (const s of suggestions) {
        const item = page.items[s.index];
        if (!item || !s.semantic_name) continue;
        await createProposal(db, {
          kind: 'semantic_name', target_id: item.id, proposed_value: s.semantic_name.slice(0, 200),
          rationale: s.rationale || 'orchestrator synthesize', source: 'agent',
        });
        count += 1;
      }
      const definitions = await listTagDefinitions(db);
      if (definitions.length > 0) {
        const meta = await suggestMetaTags(config, page.items.map((i) => ({
          id: i.id, title: i.title,
          content: String((i.fields as Record<string, unknown>).content_text ?? '').slice(0, 500),
        })), definitions.map((d) => ({ id: d.id, name: d.name })), ctx.fetchImpl);
        for (const m of meta) {
          if (m.new_name) continue; // pending_definition 流由提案面处理，编排器不代造
          await createProposal(db, {
            kind: 'meta_tag', target_id: m.item_id, related_definition_id: m.definition_id,
            proposed_value: m.value, rationale: m.why || 'orchestrator meta', source: 'agent',
          });
          count += 1;
        }
      }
      return { proposals: count };
    }
    if (stage.kind === 'compose') {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'Draft a short plan document (≤400 chars) organizing the work. Reply ONLY with JSON {"draft":"<text>"}.' },
        { role: 'user', content: JSON.stringify({ goal: task.goal, title: task.title }) },
      ];
      try {
        const out = await structuredCall<{ draft: string }>(config, messages, {
          validate: (v) => {
            const d = (v as { draft?: unknown } | null)?.draft;
            return typeof d === 'string' && d.length > 0 ? { draft: d.slice(0, 2000) } : null;
          },
          fetchImpl: ctx.fetchImpl,
        });
        return { draft: out.draft };
      } catch {
        return { draft: `草稿（模板）：围绕「${task.goal.slice(0, 80)}」整理条目与提案，确认后写入项目文件夹。` };
      }
    }
    // confirm：产 DSL 草稿 → 停点
    const flow = await generateOnboardingFlow(config, {
      title: task.title, goal: task.goal,
      reviewFields: [{ name: '任务目标', value: task.goal.slice(0, 60) }],
      collectFields: ['整理粒度', '排除项'],
    }, ctx.fetchImpl);
    return { flow: flow.dsl_text, need_input: true };
  },
};

/** goal → 查询词段（按标点/空白切，≥2 字符，最多 4 个）。 */
export function extractQueryTerms(goal: string): string[] {
  return goal
    .split(/[\s,，。;；、:：!？?（）()\[\]【】/\\]+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2)
    .slice(0, 4);
}

function parseRefs(detail: string): string[] {
  try {
    const v = JSON.parse(detail);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/* ── 运行器：stage 串行 + 重试 + 停点 ── */

type StageResult = 'done' | 'parked' | 'failed' | 'skipped';

async function runStage(db: Database, config: Config, task: TaskDTO, stage: StageDTO, allStages: StageDTO[], ctx: RunCtx, runMsgId: string): Promise<StageResult> {
  const executor = ctx.executor ?? defaultExecutor;
  const fullCtx: ExecCtx = { ...ctx, config };
  const backoff = ctx.backoffMs ?? DEFAULT_BACKOFF;
  const sleep = ctx.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  await addBlock(db, runMsgId, { kind: 'note', content: `正在执行：${stage.name}` });
  await transitionStage(db, stage.id, 'running');
  for (let attempt = 0; ; attempt += 1) {
    try {
      const out = await executor.execute(fullCtx, db, task, stage, allStages);
      if (out.need_input) {
        const flow = await createUiflow(db, {
          task_id: task.id, stage_id: stage.id, kind: 'onboarding', dsl_text: out.flow ?? '',
        });
        await addBlock(db, runMsgId, { kind: 'flow', ref_id: flow.id, content: `onboarding:${flow.id}` });
        await addBlock(db, runMsgId, { kind: 'note', content: '启动 Onboarding 的交互流' });
        await transitionStage(db, stage.id, 'awaiting_user', { detail: 'awaiting onboarding input' });
        return 'parked';
      }
      // 产物块
      if (out.refs?.length) {
        for (const id of out.refs.slice(0, 20)) {
          await addBlock(db, runMsgId, { kind: 'reference', ref_id: id, content: id });
        }
        await transitionStage(db, stage.id, 'done', { detail: JSON.stringify(out.refs.slice(0, 50)) });
      } else if (out.draft !== undefined) {
        await addBlock(db, runMsgId, { kind: 'text', content: out.draft });
        await transitionStage(db, stage.id, 'done');
      } else {
        await addBlock(db, runMsgId, { kind: 'note', content: `已生成 ${out.proposals ?? 0} 条提案` });
        await transitionStage(db, stage.id, 'done');
      }
      return 'done';
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt >= 2) {
        await transitionStage(db, stage.id, 'failed', { detail: msg.slice(0, 200) });
        await addBlock(db, runMsgId, { kind: 'note', content: `阶段失败：${stage.name}（${msg.slice(0, 80)}）` });
        return 'failed';
      }
      await transitionStage(db, stage.id, 'running', { bumpAttempts: true, detail: `retry after: ${msg.slice(0, 120)}` });
      await sleep(backoff[attempt] ?? 1000);
    }
  }
}

/** 执行任务到停点/完成/失败（可重复调用=恢复续跑）。 */
export async function runStages(db: Database, config: Config, taskId: string, ctx: RunCtx = {}): Promise<void> {
  const loaded = await getTaskWithStages(db, taskId);
  if (!loaded) throw new PlanError(`task not found: ${taskId}`);
  const { task, stages } = loaded;
  const msg = await getMessage(db, task.message_id);
  const run = await addMessage(db, msg?.conversation_id ?? '', 'agent', '', []);
  await addBlock(db, run.message.id, { kind: 'note', content: `正在启动任务管线：${task.title.slice(0, 40)}` }); // 播报·启动
  let anyFailed = false;
  for (const stale of stages) {
    // 每轮重载：跨 stage 取 refs（synthesize 读 collect.detail）必须用新鲜状态
    const fresh = (await getTaskWithStages(db, taskId))!;
    const stage = fresh.stages.find((x) => x.id === stale.id);
    if (!stage) continue;
    if (stage.status === 'done') continue;
    if (stage.status === 'failed') { anyFailed = true; continue; } // 红标可见，不阻塞后续段
    if (stage.status === 'awaiting_user') return; // 停点：runner 不驻留
    const result = await runStage(db, config, fresh.task, stage, fresh.stages, ctx, run.message.id);
    if (result === 'parked') return;
    if (result === 'failed') anyFailed = true; // 增强段失败不阻塞 onboarding（§0 场景语义）
  }
  // 终态：有失败段 → failed（可见）；否则 done
  await setTaskStatus(db, taskId, anyFailed ? 'failed' : 'done');
  await addBlock(db, run.message.id, { kind: 'note', content: anyFailed ? '任务结束（有阶段失败，红标可见）' : '任务完成' });
}

/** 停点恢复：user_input → awaiting_user→running→续跑。 */
export async function resumeTask(
  db: Database, config: Config, taskId: string, stageId: string, input: string, ctx: RunCtx = {},
): Promise<void> {
  const loaded = await getTaskWithStages(db, taskId);
  if (!loaded) throw new PlanError(`task not found: ${taskId}`);
  const stage = loaded.stages.find((s) => s.id === stageId);
  if (!stage) throw new PlanError(`stage not found: ${stageId}`);
  const msg = await getMessage(db, loaded.task.message_id);
  const run = await addMessage(db, msg?.conversation_id ?? '', 'agent', '', []);
  await addBlock(db, run.message.id, { kind: 'note', content: `用户输入已收到（恢复执行）：${input.slice(0, 120)}` }); // 播报·恢复
  await transitionStage(db, stageId, 'running', { actor: 'user', detail: `user_input: ${input.slice(0, 160)}` });
  await transitionStage(db, stageId, 'done', { actor: 'user' });
  await runStages(db, config, taskId, ctx);
}

/**
 * Flow 完成（Step 7）：confirm 动作→提案（D-042 链，accept=confirmed）→ 表单结果回流
 * stage.detail → uiflow done → resume（awaiting_user→running→done→续跑）。
 * 动作→提案映射：meta_tag（按名解析定义；未命中走 pending_definition+new: 引用）·
 * cluster/semantic_name/classification/metadata 直落对应 kind；association/dedupe/
 * pending_definition 动作仅记录不提案（语义需关联对/新建定义，表单语境不适用）。
 */
export async function completeFlow(
  db: Database, config: Config, uiflowId: string,
  input: { values: Record<string, string>; choices: Record<string, string> },
): Promise<{ proposals: number; notes: string[] }> {
  const flow = await getUiflow(db, uiflowId);
  if (!flow) throw new PlanError(`uiflow not found: ${uiflowId}`);
  if (flow.status !== 'active') return { proposals: 0, notes: [`uiflow 已是 ${flow.status}，幂等返回`] };

  const { parseFlow } = await import('../../src/lib/uiflow.ts');
  const parsed = parseFlow(flow.dsl_text);
  const actions = parsed.nodes.flatMap((n) => (n.type === 'confirm' ? n.actions : []));
  const loaded = await getTaskWithStages(db, flow.task_id);
  const collect = loaded?.stages.find((x) => x.kind === 'collect' && x.status === 'done');
  const refs = collect ? parseRefs(collect.detail).slice(0, 20) : [];
  const defs = await listTagDefinitions(db);
  const valueOf = (arg: string) => (input.values[arg] ?? input.choices[arg] ?? arg).slice(0, 200);
  const rationale = `flow ${uiflowId} · ${JSON.stringify({ values: input.values, choices: input.choices }).slice(0, 400)}`;

  const notes: string[] = [];
  let count = 0;
  for (const action of actions.slice(0, 8)) {
    if (action.name === 'association' || action.name === 'dedupe' || action.name === 'pending_definition') {
      notes.push(`动作 ${action.name}(${action.arg}) 仅记录（表单语境不提案）`);
      continue;
    }
    const targets = refs.length > 0 ? refs : [];
    if (targets.length === 0) {
      notes.push(`动作 ${action.name}(${action.arg}) 无目标条目（collect 为空），跳过`);
      continue;
    }
    for (const ref of targets) {
      if (action.name === 'meta_tag') {
        const def = defs.find((d) => d.name.toLowerCase() === action.arg.toLowerCase());
        if (def) {
          await createProposal(db, {
            kind: 'meta_tag', target_id: ref, related_definition_id: def.id,
            proposed_value: valueOf(action.arg), rationale, source: 'agent',
          });
        } else {
          // 未命中定义 → pending_definition 流（D-106）：建定义提案 + new: 引用打标提案
          const pending = await listProposals(db, 'pending');
          if (!pending.some((x) => x.kind === 'pending_definition' && x.proposed_value === action.arg)) {
            await createProposal(db, {
              kind: 'pending_definition', target_id: ref, proposed_value: action.arg,
              rationale, source: 'agent',
            });
          }
          await createProposal(db, {
            kind: 'meta_tag', target_id: ref, related_definition_id: `new:${action.arg}`,
            proposed_value: valueOf(action.arg), rationale, source: 'agent',
          });
        }
        count += 1;
      } else if (action.name === 'cluster') {
        await createProposal(db, {
          kind: 'cluster', target_id: ref, proposed_value: valueOf(action.arg), rationale, source: 'agent',
        });
        count += 1;
      } else if (action.name === 'semantic_name') {
        await createProposal(db, {
          kind: 'semantic_name', target_id: ref, proposed_value: valueOf(action.arg), rationale, source: 'agent',
        });
        count += 1;
      } else if (action.name === 'classification') {
        await createProposal(db, {
          kind: 'classification', target_id: ref, proposed_value: valueOf(action.arg), rationale, source: 'agent',
        });
        count += 1;
      } else if (action.name === 'metadata') {
        await createProposal(db, {
          kind: 'metadata', target_id: ref,
          proposed_value: JSON.stringify({ name: action.arg, value: valueOf(action.arg) }),
          rationale, source: 'agent',
        });
        count += 1;
      }
    }
  }

  await setUiflowStatus(db, flow.id, 'done');
  const summary = `${JSON.stringify({ values: input.values, choices: input.choices, proposals: count }).slice(0, 300)}`;
  await resumeTask(db, config, flow.task_id, flow.stage_id, summary);
  return { proposals: count, notes };
}

/** 指令 → 计划 → 任务卡 → 执行（POST messages 的触发面）。 */
export async function startTask(
  db: Database, config: Config, conversationId: string, instruction: string, ctx: RunCtx = {},
): Promise<{ task: TaskDTO; stages: StageDTO[]; fallback: boolean }> {
  const { plan, fallback } = await generatePlan(config, instruction, ctx);
  const user = await addMessage(db, conversationId, 'user', instruction, []);
  const created = await createTask(db, {
    message_id: user.message.id,
    title: plan.title,
    goal: plan.goal,
    stages: plan.stages.map((s) => ({ kind: s.kind, name: s.name, steps: s.steps ?? [] })),
  });
  const run = await addMessage(db, conversationId, 'agent', '', [
    { kind: 'operation', ref_id: created.task.id, content: plan.title },
    ...(fallback ? [{ kind: 'note' as const, content: '计划生成失败，使用默认管线' }] : []),
  ]);
  void run;
  await runStages(db, config, created.task.id, ctx);
  // 响应反映执行后的真实阶段态（而非 createTask 的初始快照）
  const fresh = (await getTaskWithStages(db, created.task.id))!;
  return { task: fresh.task, stages: fresh.stages, fallback };
}

export { listUiflowsByTask, setUiflowStatus, createUiflow };
