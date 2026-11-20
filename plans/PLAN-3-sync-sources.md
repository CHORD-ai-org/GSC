# PLAN-3 — Sync：外部源持续采集

Status: `A3-1/A3-2 已执行` — 2026-11-20（用户「开始执行PLAN-3」）。裁决：D-049 命名（Sync=采集、Export=导出）、D-050 origin=import+sync: 前缀来源标记、密钥 `.data/secrets.json`、D-051 GitHub 先行+手动默认。B3-1（Notion/Drive/X 官方接入+品牌素材）待凭据与外网；C3-1（调度/增量/去重升级）未做。 · 源：`PRODUCT_VISION.md` §3.2 · 依赖：PLAN-1 ✓

## 目标场景

用户在 Sync 页点 GitHub 官方图标 → 授权 → 选「issues + PR comments」范围 → 每天同步；新 issue 自动以原文+来源（repo#编号）进入 GSC，与 Light Up 的数据同模型共存；页面上每个源显示连接状态、范围、上次同步时间，可暂停。

## ⚠️ 前置命名裁决

现有 **Sync 页 = 数据导出**（gsc-export.json / gsc-bundle.md / GSC-CONTEXT.md），与 Vision 的 Sync（源采集）冲突。建议：现有页改名 **Export**（Settings→Data Management 已有同样入口），「Sync」专指本计划。需一条 DECISION 记录。

## 现状 → 缺口

| 要求 | 现状 | 缺口 |
|---|---|---|
| 源连接（X/GitHub/Notion/Drive） | 无 | OAuth/URL 配置流、凭据存储 |
| 品牌资产（官方 logo） | 无 | 各品牌图标资源（遵守品牌规范） |
| 源状态六要素 | 无 | identity/status/scope/last-sync/settings UI |
| 同步入同一模型 | 无 | `origin: sync` 来源记录 + provenance 链 |
| 用户可控同步设置 | 无 | 范围选择、频率、暂停 |

## 阶段

- **A3-1 命名与页重组**：Export 改名落地；Sync 页占位（源列表空态）。
- **A3-2 源适配层**：`sources` 表 + 适配器接口（fetch → raw 条目 + provenance）；首个源选 **GitHub**（URL/token 型，无需 OAuth 审批）。
- **B3-1 官方接入**：X / Notion / Drive 的 OAuth 或官方 API；品牌图标；状态面板。
- **C3-1 调度与增量**：定时增量同步、失败退避、冲突去重（联动 PLAN-4 Detector 查重）。

## 边界

不做双向同步回写外部源（v1 只进不出）；不做通用爬虫；密钥存本机、不入库不入 git。

## 验证

连接 GitHub 测试仓 → issue 以 raw 条目出现且 source 可溯；断连后暂停；last-sync 时间准确。

## 待决策

1. 四个源的优先序（建议 GitHub → Notion → Drive → X）？
2. 同步频率默认值（手动/每日/实时 webhook）？
