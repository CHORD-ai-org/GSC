# GSC 按钮真实性全盘审查 + 优化计划

> 状态：`PROPOSED`（待批准执行）
> 范围：GSC 全部可点击元素
> 口径：每个按钮点击后必须产生**真实、可见、可持久或可导航**的效果

---

## 1. 审计方法

- 逐个盘点全部 21 个含 `onClick` 的源文件、约 **170 个可点击元素**（`<button>` / `onClick` / `role="button"` / 可点击 div/span）。
- 对每个按钮读 handler **函数体**，一路追到最终调用：`api.*`（持久变更）/ `downloadArtifact`（导出落盘）/ `go/navigate/openItem`（真实导航）/ 真实开关态。
- 三档判定：
  - **REAL** — 产生持久数据变更、真实导航、或属一个能真正工作的流程（对话框保存真落库、开关真实生效）。
  - **FAKE** — 空操作 / 只改永不落地的临时态 / 未接线 stub / 纯装饰 / 点了无真实后续。
  - **PARTIAL** — 能做点事但不完整（保存假、只改本地不持久、目标功能做了一半）。

---

## 2. 总体结论

| 判定 | 数量 | 说明 |
|---|---|---|
| REAL | ~160 | 核心 CRUD、导航、导出、标签、提案、新闻、账户、主题/语言/视图、向导 |
| PARTIAL | 4 | 接线对但后端/持久化做了一半（见 §3） |
| FAKE | 2 类（约 7 个按钮） | 1 个死按钮 + 同步页 6 张数据源卡的"假连接" |

**一句话**：GSC 的按钮工程质量很高——绝大多数都接了真实 API 或真实导航。问题**高度集中在「同步与导出」的数据源域**（正好是你此前指出的不真实处），外加 1 个装饰性死按钮。

---

## 3. 假按钮 / 半成品清单（需优化）

| # | 位置 | 按钮 | 判定 | 现状与问题 | 优化方向 |
|---|---|---|---|---|---|
| F1 | `src/app/Composer.tsx:171` | 麦克风（`title="Voice input (visual only)"`） | **FAKE** | 无 `onClick`，纯装饰死按钮 | 移除，或接 Web Speech 真实语音输入（P0，建议先移除） |
| F2 | `src/views/views.tsx:65` + `:291` | 同步页 Notion/Drive/X/Web/RSS/File 数据源卡「连接」 | **FAKE** | 只登记一条 source 记录；无 OAuth/抓取，"已连接"是假象 | 接线到已建成的 Web Intelligence 适配器（P0） |
| P1 | `src/views/views.tsx:198` `:215` | 「立即同步」（非 github 源） | **PARTIAL** | handler 真调 `api.syncSource`，但后端 sync 路由只实现 github，其余必报 "not implemented" | 同上，接线适配器即真实 |
| P2 | `src/views/lightup.tsx:312` | URL「预览」 | **PARTIAL** | 真调 `api.ingestUrl`，但按 D-048 只抓取预览、**永不落库** | 让 URL 采集可落库（接 Web Intelligence capture→persist） |
| P3 | `src/components/SemanticObjectSheet.tsx:163` | 「采纳 / accept」 | **PARTIAL** | 只改会话审校态，状态不入库，对落库内容零影响 | 持久化审校态，或并入 proposal confirm 模型 |

---

## 4. 关键洞察（决定优化成本）

**Web Intelligence 的多数据源适配器已经真实建成**，只是没接到 UI 的 sync 路由：

- `server/intel/adapters/index.ts` — `ADAPTERS` 注册表已含 `web / rss / file / github`（真实抓取+提取）与 `notion / drive / x`（token 型 API 适配器）。
- `server/intel/extract.ts` — 确定性结构化提取（title/meta/author/hash + SSRF 防护）。
- `server/intel/pipeline.ts` — 整合进 Light Up（语义命名/分类提案 → 去重 → proposals 表）。
- `server/intel/intel.test.ts` — 7 个测试通过。

**但** `server/router.ts:796-812` 的 `POST /api/sources/:id/sync` 只特判 github（`runGithubSync`），其余源返回 `not implemented`，**从不调用 `ADAPTERS`**。

> ⇒ 数据源按钮的真实化 ≈ **接线**（把 sync 路由改走 `getAdapter(kind) + extract + pipeline`），不是从零造。这把工作量从"6 个数据源接入"降为"1 处路由接线 + 2 个前端落库动作"。

---

## 5. 优化计划

### P0 — 让假按钮变真（以接线为主，最高优先）
- **P0-1 接线 sync 路由到 Web Intelligence 适配器**
  `POST /api/sources/:id/sync` 改为：`getAdapter(source.kind)` → `fetch` → `extract.ts` → `pipeline.ts`（进 Light Up 提案）→ 更新 source 同步状态/时间戳。取代只认 github。完成即让 6 张数据源卡 + 「立即同步」全部真实（F2、P1 一并解决）。
  - web/rss/file：无 token 即可真实抓取。
  - notion/drive/x：走 `apiAdapter` 的 token 路径（用户填 token 即真实），full OAuth 归 B3-1 长线。
- **P0-2 处理麦克风死按钮**（F1）：暂**移除**（符合"每个按钮都真实"），语音输入留作后续独立特性。

### P1 — 让半成品完整、可持久
- **P1-1 URL 采集落库**（P2）：Light Up 的 URL「预览」→ 生成 Web Capture Task → 提取 → Light Up 提案 → 用户确认 → 持久化（对齐 Web Intelligence MVP 旅程 §3.1）。保留"仅预览"作为可选，但补一个真实的「存为信息」动作。
- **P1-2 持久化「采纳」审校态**（P3）：把 SemanticObjectSheet 的 accept 状态并入 proposal/confirm 模型，或写入 item 元数据，使审校结果不随会话丢失。

### P2 — 诚实化与长线
- **P2-1 Notion/Drive/X 真实接入升级**：确认 token 路径端到端可用（连接→同步→结果）；full OAuth 作为 B3-1 路线项单列。
- **P2-2 全域回归**：每个数据源卡的「连接 / 同步 / 暂停 / 频率 / 断开」五动作逐一实测真实；核对"已连接"文案与真实能力一致，杜绝假象。

---

## 6. 验收标准

1. 全局**死按钮 = 0**：不存在无 `onClick` 的可点击元素。
2. 同步页所有数据源卡：**连接 → 同步 → 结果**端到端真实（web/rss/file 无 token 即通，notion/drive/x 填 token 即通）。
3. URL 采集可落库，「采纳」审校态可持久。
4. `npx tsc --noEmit` = 0 错误；`npx vitest run` 全绿；`npm run build` 通过。
5. 双主题截图核对：数据源卡状态真实、无装饰死按钮。

---

## 7. 已知诚实边界（不假装已实现）

- Notion/Drive/X 的 **full OAuth**（浏览器授权跳转）属长线（B3-1），本计划先提供**真实可用的 token 接入**路径；UI 文案须如实标注"用访问令牌连接"，不假装是官方 OAuth。
- URL 抓取对需 JS 渲染 / 登录的页面返回明确的"不支持 / 提取失败"，不假装成功（沿用 Web Intelligence §6 内容安全）。
