# EVAL_PLAN_EXECUTION.md — 商业产品级 Eval：PLAN-1…8 执行效果评估

> Date: 2026-11-20 · Evaluator: AI agent (live probes + evidence audit) · Scope: PLAN-1…PLAN-8 A/B 段全部产出 + 相关基础设施
> 方法：**不看承诺看实测** —— 每个维度给 1–5 分（3=内部可用，4=公测可发布，5=商业级），结论必须附证据（探针输出/测试/截图/代码定位）。

---

## 1. 总评

| 维度 | 分数 | 一句话结论 |
|---|---|---|
| 1. 功能完整性 | **4.0** | 八轨 A/B 段承诺全部落地；C 段（智能/规模化）按计划未做，不算欠账 |
| 2. 正确性 / 数据完整性 | **4.5** | 49 tests 全绿含级联/共享/标签全链；原文逐字回环、关键词检索回归覆盖 |
| 3. 健壮性 / 错误处理 | **3.5** | 错误契约统一，但畸形 JSON 返回 502（应 400）、鉴权状态码语义错（400→应 401/403） |
| 4. UX / 交互质量 | **4.0** | 双模式布局、全状态覆盖、深浅主题、动效克制；删除无撤销/确认是商业化硬伤 |
| 5. 性能 | **4.0** | 实测关键端点 avg 1–5ms（当前数据量）；Detector O(n²) 是规模化隐患 |
| 6. API / 契约质量 | **4.5** | v1 冻结 + 文档 + 别名 + 统一 envelope；MCP 真链路实测；SDK 起步 |
| 7. 安全 | **3.5** | token 鉴权/sha256/可见性隔离实测通过；无 401/403、无速率限制、密钥明文落盘 |
| 8. 可访问性 | **3.0** | 语义色必配文字达标；键盘导航/焦点/对比度未审计 |
| 9. 文档 / 可维护性 | **4.5** | 决策日志+验证矩阵+状态文档是同类项目罕见的强项 |
| **加权总分** | **≈ 4.0 / 5** | **公测可发布（本地/单机形态）；距商业发行差 P1 三项 + 安全/可访问性打磨** |

---

## 2. 维度详评（证据）

### 2.1 功能完整性 — 4.0
- 八轨承诺 ↔ 实证逐条核对：`0002…0006` 迁移 × 5、`server/{agent,sync,mcp}/`、`src/lib/{lightup,tags,clusters,proposals}.ts`、`SemTag`/`ActivityMap`/`TagEditor`、`API_CONTRACT.md`/`sdk/` —— 全部存在（file sweep 2026-11-20）。
- Vision §7 的 8 个 Dashboard 页面全部存在且可走通（截图 01–22）。
- 诚实差距（计划内未做，不算缺陷但要记）：C 段全部（C2-1 批量队列 / C3-1 定时同步 / C4-1 体检 / C5-1 虚拟滚动 / C6-1 token 细粒度 / C7-1 分享链接 / C8-1 标签智能）；B3-1（Notion/Drive/X）、B7-2（edit/admin 角色）、Python SDK。

### 2.2 正确性 / 数据完整性 — 4.5
- `npm test` **49/49**（12 files）：含 DELETE 级联、共享可见性全链（B 只见成员/回收即失效/审计）、标签受控定义/作用域/Profile confirmed-only、MCP 握手+路由、切块规则、Detector 查重 100% 命中。
- 活体：unicode/emoji/`<script>` 标题**逐字回环**（不转义不丢字）✓；create→内容关键词可检索（D-020 修复有回归）✓；delete→404 ✓。
- 扣分：规模未验证（当前库 ~15 条目；无 1k/10k 压测数据）。

### 2.3 健壮性 / 错误处理 — 3.5
活体探针 15/16 通过（`.workbuddy/tmp/eval-probe.mjs`）：
- ✅ 非法 body → 400 `contract`（含 kind/message/retryable）；缺 id → 404 `not_found`；未知路由 → 404 JSON；未知标签定义/非法 scope → 400；10k 字符标题 → 干净 201。
- ❌ **P1-1 畸形 JSON body → 502**（`server/http.ts:43` `JSON.parse` 抛错被全局 catch 归为 `internal`→502）。502 语义是「网关/服务故障可重试」，客户端会做无意义重试；应映射 400。
- ⚠️ **P2-5 错误方法 → 404**（应 405 + Allow 头，可用性瑕疵）。

### 2.4 UX / 交互质量 — 4.0
- 双模式（Collection 紧凑行 / Object Detail 分区）按设计落地；全状态截图核对（空态/加载/有数据/深浅主题）。
- 动效规范：背景动画默认全空、仅光标邻域浮现（刚修正）✓。
- 扣分：**P2-1 删除无确认无撤销**（商业产品的数据安全底线）；提案队列行密度高（已记 KNOWN_ISSUES）；部分操作无乐观更新，网络慢时按钮反馈不足。

### 2.5 性能 — 4.0
实测（dev API，当前数据量，20 次取均值/p95）：

| 端点 | avg | p95 |
|---|---|---|
| GET /api/v1/items | 4.5ms | 31.5ms |
| GET /api/v1/clusters | 1.3ms | 1.8ms |
| GET /api/v1/profile | 1.4ms | 3.3ms |
| GET /api/v1/tags/definitions | 1.2ms | 2.0ms |

- 扣分：**P1-3 Detector 查重 O(n²) 全对相似度**（测试库 82 候选即可见），1k+ 条目时会退化；列表端点**无分页**（P2-6）。

### 2.6 API / 契约质量 — 4.5
- `/api/v1/` 冻结 + `API_CONTRACT.md` + 旧前缀别名；错误 envelope 全站统一。
- MCP 实测：握手 → 7 工具 → `gsc_get_user_profile` 真链路返回 confirmed-only ✓。
- 扣分：无显式版本弃用策略；SDK 仅 JS 单文件。

### 2.7 安全 — 3.5
鉴权探针（GSC_AUTH_REQUIRED=1 实例，8799）：

| 场景 | 结果 |
|---|---|
| 无 token GET | 拒绝 ✓（但 400，应 401） |
| 坏 token GET | 拒绝 ✓（应 401） |
| read token GET | 200 ✓ |
| read token POST | 拒绝「read-only token cannot write」✓（应 403） |
| rw token POST | 201 ✓ |

- 共享隔离（PLAN-7）有测试级证明；密钥/token sha256 不入库不进 git ✓。
- 扣分：**P1-2 状态码语义**；无速率限制（P2-2）；`.data/secrets.json` 明文存第三方 token（本机可接受，须文档化）。

### 2.8 可访问性 — 3.0
- ✅ SemTag 颜色必配文字（D-055）。
- 未做：键盘遍历/焦点环审计、aria 标注抽查、对比度量化（WCAG AA）。发布前必须补（P2-4）。

### 2.9 文档 / 可维护性 — 4.5
- DECISION_LOG 66 条决策全带理由/替代/后果；IMPLEMENTATION_STATUS 带验证矩阵；KNOWN_ISSUES 诚实记录（含踩过的工具坑）。
- 扣分：文档曾多次漂移（本轮又修两处过期文案），依赖人工同步，无 CI 校验。

---

## 3. 问题清单（按商业优先级）

| ID | 级别 | 问题 | 位置 | 修复建议 |
|---|---|---|---|---|
| P1-1 | **P1** | 畸形 JSON → 502（应 400） | `server/http.ts` readJson | JSON.parse 包 try，抛 typed `contract` 错 |
| P1-2 | **P1** | 鉴权失败返回 400（应 401/403） | `server/router.ts` 鉴权门 | missing/invalid → 401；scope 不足 → 403 |
| P1-3 | **P1** | Detector O(n²) 全对相似度，规模化退化 | `server/agent/detector.ts` | 长度/前缀预过滤或 simhash 桶；增量指纹 |
| P2-1 | P2 | 删除无确认无撤销 | 详情页 Delete | 确认弹窗 + 软删除/回收站 |
| P2-2 | P2 | 无速率限制（ingest/agent 端点） | router | 简单 token-bucket per token |
| P2-3 | P2 | 第三方密钥明文落盘 | `server/storage/secrets.ts` | DPAPI/keychain 或至少文档警示 |
| P2-4 | P2 | 可访问性未审计 | 全站 | 键盘/焦点/对比度一轮 + 修复 |
| P2-5 | P2 | 错误方法 → 404（应 405） | router | 方法不匹配时回 405 + Allow |
| P2-6 | P2 | 列表端点无分页 | items/clusters | limit/offset + 计数 |

## 4. 结论

**执行质量 ≈ 4.0/5：公测可发布（单机形态），不是商业发行形态。**
强项：正确性与契约纪律（测试全链、错误 envelope、决策可追溯）明显高于一般内部项目；弱项集中在「商业运行才会暴露」的三个面：**错误码语义、规模化性能、数据安全操作（删除/密钥）**。P1 三项修完即可进入对外 beta；可访问性与速率限制是发行门禁。
