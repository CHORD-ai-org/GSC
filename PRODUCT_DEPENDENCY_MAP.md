# PRODUCT_DEPENDENCY_MAP.md — 依赖图（Phase 04 配套）

> 2026-11-20 · 任务间依赖 + 架构依赖两层。执行顺序以本图为准。

## 1. 任务依赖图

```
T101 价值陈述          （无依赖，立即可做）
  └─→ T102 Onboarding
        └─→ T103 账户与会话 ──┬─→ T301 Token/授权管理面
                              └─→ T401 Shared Cluster

T202 分页              （无依赖，与 R1 并行）
  ├─→ T201 全局搜索
  └─→ T203 删除撤销

T302 演化语义          （无依赖，可与 T301 并行）

T402 Sync 调度+Notion  （无依赖，可任意排后）
```

### 并行建议
- **轨道 A（产品外壳）**：T101 → T102 → T103 → {T301, T401}
- **轨道 B（规模与发现）**：T202 → T201 → T203
- **轨道 C（生命周期）**：T302 ∥ T402
- 三轨可并行（不同模块），轨道内串行。

### 关键路径
T101 → T102 → T103 → T301（最长链，决定「Agent 可信复用」达成时间）

## 2. 任务 × 缺口对照

| 任务 | 消解缺口 | 阶段 |
|---|---|---|
| T101 | GAP-01（部分：价值传达） | R1 |
| T102 | GAP-02、GAP-08（概念教学部分） | R1 |
| T103 | GAP-01（账户）、GAP-08（分享前提） | R1 |
| T201 | GAP-03 | R2 |
| T202 | GAP-06 | R2 |
| T203 | GAP-05 | R2 |
| T301 | GAP-04 | R3 |
| T302 | GAP-07 | R3 |
| T401 | GAP-08（协作部分） | R4 |
| T402 | GAP-11、部分 GAP-08? | R4 |

## 3. 架构依赖（改哪里）

| 任务 | 后端触点 | 前端触点 | 数据迁移 |
|---|---|---|---|
| T101 | — | StartView/DocsView | — |
| T102 | 复用 tags/profile | OnboardingOverlay（新） | — |
| T103 | tokens.ts 运行时化、users repo | 启动流/UserView | 回填 owner_id |
| T201 | search 端点（新） | CommandPalette 扩展 | （进阶）FTS 索引 |
| T202 | repo cursor 参数 | 四集合页滚动加载 | items(updated_at,id) 索引 |
| T203 | deleted_at 软删、restore/purge | Toast 撤销、回收站页 | deleted_at 列 |
| T301 | tokens API 化、访问聚合 | Settings 连接区重写 | token 元数据列 |
| T302 | 状态词表、superseded_by、detector | 详情页标记流 | — |
| T401 | shares 已有、用户列表查询 | 分享区改造 | — |
| T402 | scheduler、notion adapter | SyncView 增量 | — |

## 4. 外部依赖与风险

| 依赖 | 影响任务 | 风险 | 缓解 |
|---|---|---|---|
| PGlite 性能上限 | T201/T202 | 数百条 OK、数千条吃紧 | cursor 分页已控；万级再议 postgres 适配（D-026） |
| Notion OAuth 审核 | T402 | 周期不可控 | 先 PAT token 通道，OAuth 后补 |
| 本地会话方案 | T103 | 与未来云端账户衔接 | signed cookie + 本地 token 双兼容设计 |
| LLM 可用性 | T102 示例/T302 detector | 无 key 时降级 | 引导与检测均有规则兜底（已有先例） |

## 5. 不依赖任何任务（随时可做）
- T101 的 Docs 文案重写
- GAP-09 骨架屏、GAP-10 批量入口（P2 打磨项，见缺口登记）
