---
title: docs/ 文档总索引
description: docs 真相子集的索引与版本控制政策——需求真相源、开发真相源、设计宪法、管理与验收账；报告/归档/图表等一次性材料仍本地持有
category: meta
status: active
version: 2.0.0
created: '2026-09-06'
modified: '2026-10-28'
---

# docs/ 文档总索引

> **版本控制政策（2026-10-28 起）**：`docs/` 不再整体排除。**真相子集必须入库**——`docs/design/`（设计宪法）、`docs/01-需求/`（需求真相源）、`docs/02-架构设计/`（开发真相源）、`docs/roadmap/*.md`（管理与验收账，根层 md），以及本文件。理由：不进 git 的文档无评审、无历史、无法回滚，不能作为「真相源」。
>
> 其余内容（`reports/`、`archive/`、`diagrams/`、`roadmap/` 子目录中的截图/报告资产）仍只存在于本地主工作树，不入库、不作依据。
>
> 真相源变更受 `scripts/check-doc-sync.mjs` 管理：必须带 `title`/`description`/`status` frontmatter，且改动需与 `AGENTS.md` 或 `CHANGELOG.md` 同 PR；`check:docs-sync` 的 Check 0 会校验四个真相目录的在库文档数不低于下限。
>
> 最近整编：2026-09-06（过期计划与一次性快照移入 `archive/`）；2026-09-27（design/ 入 git + 设计宪法升 v2.0）；**2026-10-28（需求/架构/roadmap 根层 md 首批 82 篇入 git，另增本索引与能力账本）**。

## ⚠️ 外部依赖路径（勿动勿改名）

| 路径 | 依赖方 |
|---|---|
| `design/PRINCIPLES.md` | `.zcode/skills/frontend-page/SKILL.md`（设计宪法，最高样式依据） |
| `roadmap/stability-reports/` | `.zcode/agents/night-qa.md` 与 stability-check skill 的报告写入目录 |
| `roadmap/api-audit.md` | `scripts/api-audit.mjs` 滚动写入（`pnpm api:audit`） |

## 01-需求/（需求真相源）

能力总账、需求基线与治理账本。

| 文档 | 定位 |
|---|---|
| [产品需求文档-v3](01-需求/产品需求文档-v3.md) | **需求真相源 V3**（Acceptance 范式，supersedes v2；含 v3.1 增补：双入口 + AI 同事=治理录入手段） |
| [能力清单-v1](01-需求/能力清单-v1.md) | **功能点总账（唯一真相源）**：71 张能力卡 = A 底盘 32 / B 治理 10 / C 同事 8 / D 契约知识 3 / 跨线桥 3 / 规划 1 / S 自举 4 / M 移动 10。新功能入口的登记对象 |
| [能力账本-v1.json](01-需求/能力账本-v1.json) · [能力账本-摘要-v1](01-需求/能力账本-摘要-v1.md) | **机器生成的卡片状态账本**（`pnpm ledger:gen` 生成，`check:ledger` 门禁校验零漂移）；状态分布以账本文件为准 |
| [测试映射矩阵-v1](01-需求/测试映射矩阵-v1.md) | 功能点 → 测试用例追踪账：五类覆盖模型 + 缺口登记 + 控件清单模板 |
| [需求入口流程-v1](01-需求/需求入口流程-v1.md) | 新想法唯一合法进门（配套 `requirement-intake` skill） |
| [需求重审-总纲-v1](01-需求/需求重审-总纲-v1.md) | **需求重审基线（2026-09-17）**：工程化可信度主轴 × AI Native 内生 × 用户定位扩展；含评审标准六问、总体诊断、三批优先级、待裁决项 |
| [需求重审-逐卡意见-v1](01-需求/需求重审-逐卡意见-v1.md) | 42 张能力卡逐卡复审表（判断 / 用户任务 / AI 职责 / 可信要求 / 冗余缺口 / 建议与优先级） |
| [需求模块/Feat001~017](01-需求/需求模块/) | 17 篇模块 Feature 需求基线（scope 冻结的引用对象；⚠️ 停更于 2026-07，新功能以能力清单为准） |
| [控件清单-issue详情页-v0](01-需求/控件清单-issue详情页-v0.md) | 工单详情页控件级清单（测试映射的控件模板实例） |
| [里程碑规划-v1](01-需求/里程碑规划-v1.md) | M1-M6 里程碑（303 任务，**status: deprecated**：2026-09-08 裁决作废重编，仅作素材） |

## 02-架构设计/（开发真相源）

### architecture/（结构与现状）

| 文档 | 定位 |
|---|---|
| [技术架构总览](02-架构设计/architecture/技术架构总览.md) | **架构入口索引**：双表面分层 + 阅读路径 |
| [产品架构愿景](02-架构设计/architecture/产品架构愿景.md) | 主架构文档（三类主体 / 12 模块 / ContextPack） |
| [backend/modules](02-架构设计/architecture/backend/modules.md) | 后端真实工程结构（v4.3.0，2026-10-11 核对：43 目录 / 49 个模块内 @Module 声明） |
| [frontend/modules](02-架构设计/architecture/frontend/modules.md) | 前端真实工程结构（v4.2，2026-10-11 核对：43 模块目录） |
| [CLI-MCP-接入现状](02-架构设计/architecture/CLI-MCP-接入现状.md) | CLI/MCP 双轨接入现状与契约 |
| 控制平面-本地运行时-v1 / 本地运行时模块-v1 / 本地运行时通信协议-v1 | Runtime 形态决策、模块拆分、通信契约 |

### 策略/（设计与治理上游）

| 文档 | 定位 |
|---|---|
| [决策日志](02-架构设计/策略/决策日志.md) | ADR 简化版（ADR-001 起有效） |
| [AI同事化助手-界面分工记忆交接-设计纪要-v1](02-架构设计/策略/AI同事化助手-界面分工记忆交接-设计纪要-v1.md) | AI 同事化的直接设计依据（2026-09-05） |
| 外部AI集成协议-v1 / CLI适配器模型-v1 | 外部接入优先级与适配层抽象 |
| 执行审批模型-v1 / 运行时数据模型-v1 | Execution/ApprovalRequest/Runtime 对象模型 |
| 上下文管理设计 / 渐进式信任模型 / 产品差异化策略 | 前瞻方向（未完全实现） |
| 角色级权限模型-v1 / 阶段1-能力矩阵-v1 | 三类主体权限 / Phase 1 能力边界 |
| [品牌命名方案-v1](02-架构设计/策略/品牌命名方案-v1.md) | **品牌命名基线（2026-10-17）**：apm → **Ordo** |
| [项目契约与文档知识层-双向绑定设计纪要-v2](02-架构设计/策略/项目契约与文档知识层-双向绑定设计纪要-v2.md) | 契约文件双向绑定 / 分层镜像的收敛结论（v1 已 superseded，保留作底稿） |

## design/（前端设计宪法，已入 git）

| 文档 | 定位 |
|---|---|
| [PRINCIPLES](design/PRINCIPLES.md) | ★ **设计宪法（最高样式依据，被 `frontend-page` skill 与 `COMPONENTS.md` 引用）**。版本以文件内版本行为准 |
| [DESIGN](design/DESIGN.md) | 指针页——原《全局设计系统规范 v2.0》正文已收口至仓库根 `DESIGN.md`（该文件是参考规格，不是宪法） |
| [修改方案-A类](design/修改方案-A类-2026-09-27.md) 等 A~H 类 | 样式 token 化、组件收敛、布局/分层/画廊遍历等修改方案（部分已执行） |
| [审计-工程体检问题清单-2026-10-11](design/审计-工程体检问题清单-2026-10-11.md) | 工程体检发现、分级与处置账 |
| [api-contract-proposals](design/api-contract-proposals.md) · [mock-inventory](design/mock-inventory.md) · [page-inventory](design/page-inventory.md) | 契约提案 / mock 存量 / 页面盘点 |
| 其余审计与清剿报告 | 一次性治理底稿，只读，不作依据 |

## roadmap/（路线图与巡检，根层 md 已入 git）

| 文档 | 定位 |
|---|---|
| [ai-sidebar-sdk7-plan](roadmap/ai-sidebar-sdk7-plan.md) | AI 助理五期改造锚点（已完成） |
| [stabilization-plan](roadmap/stabilization-plan.md) | v0.5.0 稳定化计划（黄金路径 / 出口条件 E1-E6） |
| [decision-cards-roadmap](roadmap/decision-cards-roadmap.md) | 决策卡路线图（批次①②已落地） |
| [安装与启动性能诊断-2026-10-22](roadmap/安装与启动性能诊断-2026-10-22.md) | 桌面壳体积/冷启动诊断（上线卡点依据） |
| [实机验收清单-v0.8.0-2026-10-10](roadmap/实机验收清单-v0.8.0-2026-10-10.md) | 版本实机验收清单 |
| 其余计划/调研/夜航报告 | 按主题留存的过程账（self-hosting / agent-integration / workflow-v2 / zcode-plugin / affectui / 组件库 等） |
| [api-audit](roadmap/api-audit.md) | API 覆盖率快照（机器滚动写入，勿手改） |
| `stability-reports/` | 稳定化巡检报告（night-qa / stability-check 写入，**不入库**） |

## 本地保留目录（不入 git）

| 目录 | 内容 |
|---|---|
| `reports/` | 一次性报告（当前为空；已归档的见 `archive/`） |
| `archive/` | 只读历史：已完成计划 / 快照报告 / 需求历史（PRD v2、CSV 快照等） |
| `diagrams/` | Archify 生成的交互式架构图（HTML/JSON） |
| `roadmap/` 子目录 | 巡检报告截图、稳定性报告等资产 |
