---
title: "Feat017 - Acceptance 验收管理"
description: V3 新核心模块 - Acceptance 验收契约
category: feature
status: draft
version: 1.0.0
created: 2026-07-23
modified: 2026-07-23
projects: "[[APM-项目中心]]"
id: Feat017-Acceptance
ai: true
project_name: agent-project-manager
project_code: MOXHUB-001
parent: PRD-001-MIG
tags:
  - feature
  - v3
  - acceptance
---

# Feat017 - Acceptance 验收管理

> V3 核心模块，继承 [[产品需求文档-v3|PRD V3]] Acceptance 范式

## 1. 模块概述

### 1.1 定位

Acceptance 是 V3 的**新原子单位**，替代 Task 成为衡量交付的核心对象。

### 1.2 核心价值

- **验收完整性审计**：自动识别验收标准缺失（L2 风险治理）
- **成本归因**：AI 成本精确追踪到每次验收
- **证据汇聚**：CI/PR/模型的验收证据统一汇聚

### 1.3 与其他模块的关系

| 模块 | 关系 |
|------|------|
| Task | Acceptance 关联 Task，一个 Task 可有多个 Acceptance |
| Execution | ExecutionRun 关联 Acceptance，执行结果作为验收证据 |
| AI Hub | ContextPack Layer 2 注入验收标准 |
| Integration | Linear 同步 acceptance criteria → Acceptance 功能标准 |
| Git | 提供 AcceptanceEvidence（代码变更质量）|

---

## 2. 数据模型

### 2.1 Core Entities

```
Acceptance (验收契约)
├── AcceptanceCriteria (验收标准项)
│   └── AcceptanceEvidence (验收证据)
├── ExecutionRun[] (执行历史)
└── CompletenessAuditReport (完整性审计报告)

CompletenessChecklist (工程完备性清单)
└── 系统预置 + 团队自定义
```

### 2.2 Prisma Models

| Model | 说明 | 关键字段 |
|-------|------|----------|
| `Acceptance` | 验收契约主实体 | taskId, status, type, totalCost, totalTokens |
| `AcceptanceCriteria` | 验收标准项 | criteriaType (functional/technical), content, severity, status |
| `AcceptanceEvidence` | 验收证据 | evidenceType, content, storageRef |
| `CompletenessChecklist` | 工程完备性清单 | projectType, techStack, isSystem, checklist |
| `CompletenessAuditReport` | 审计报告 | riskLevel, blockedItems, suggestedItems |

### 2.3 状态机

```
Acceptance.status:
  draft → pending → in_review → passed | failed | waived
                    ↓
               (触发审计)

终态（passed/failed/waived）只能经专用端点流转：
  POST /acceptance/:id/accept-completion  → passed（聚合校验：状态门禁+完成契约证据+criteria critical/high+审计非 red）
  POST /acceptance/:id/reject-completion  → failed（清 completedAt/completedBy，保留证据快照）
  POST /acceptance/:id/waive              → waived（reason 必填，记录 waivedBy/waivedAt/waiverReason）
PATCH /acceptance/:id 禁止直写终态。

活契约语义：每个 Task 至多一条非终态（draft/pending/in_review）契约；
派发（createExecutionRun）未关联时自动查找/创建活契约（同步推断 completionType）。

AcceptanceCriteria.status:
  pending → passed | failed | blocked
  判定动作自动落 human_approval 证据（AcceptanceEvidence）
```

---

## 3. 功能规格

### 3.1 Acceptance CRUD

- [x] 创建 Acceptance（关联 Task）
- [x] 查询 Acceptance（按 Task/Project/Status）
- [x] 更新 Acceptance（状态、优先级）
- [x] 删除 Acceptance

### 3.2 Criteria 管理

- [x] 添加验收标准（功能/技术）
- [x] 批量添加验收标准
- [x] 更新标准状态（pending/passed/failed/blocked）
- [x] 删除标准

### 3.3 完整性审计（核心能力）

- [x] 依赖完备性检查（Task 依赖关系）
- [x] 工程完备性检查（技术栈清单）
- [x] 三级响应（red/yellow/green）
- [x] 一键补全
- [x] 强制审计 Gate（执行前阻断）

### 3.4 成本归因

- [x] AIUsageLog → ExecutionRun 关联
- [x] ExecutionRun 成本汇总
- [x] Acceptance 成本 roll-up

### 3.5 ContextPack 注入

- [x] Layer 2 注入验收标准
- [x] 审计结果可选注入

---

## 4. API 规格

### 4.1 Acceptance

```
POST   /_api/acceptance                    - 创建验收契约
GET    /_api/acceptance                    - 列表查询
GET    /_api/acceptance/:id                - 详情
PATCH  /_api/acceptance/:id                - 更新
DELETE /_api/acceptance/:id                - 删除
```

### 4.2 Criteria

```
POST   /_api/acceptance/:id/criteria      - 添加标准
POST   /_api/acceptance/:id/criteria/batch - 批量添加
GET    /_api/acceptance/:id/criteria       - 列表
PATCH  /_api/acceptance/criteria/:criteriaId - 更新
DELETE /_api/acceptance/criteria/:criteriaId - 删除
```

### 4.3 Audit

```
POST   /_api/acceptance/:id/audit         - 触发审计
GET    /_api/acceptance/:id/audit-report   - 获取报告
POST   /_api/acceptance/:id/apply-suggestions - 采纳提议
GET    /_api/acceptance/task/:taskId/audit-gate - 执行前门禁（黄牌；活契约 red 时派发响应带 auditWarning）
```

### 4.3.1 闭环端点（V3 闭环改造 2026-08-23）

```
POST   /_api/acceptance/:id/accept-completion  - 接收（聚合校验，失败返回 failures 清单）
POST   /_api/acceptance/:id/reject-completion  - 驳回（reason 必填）
POST   /_api/acceptance/:id/waive              - 豁免（reason 必填）
PATCH  /_api/acceptance/criteria/:criteriaId?userId= - 标准判定（自动落 human_approval 证据）
POST   /_api/acceptance/criteria/:criteriaId/evidence?userId= - 追加验收证据
```

两级审计 gate：
- 派发黄牌：dispatchTaskToCli 返回 auditWarning（red 时 toast 提示，不阻断）
- 接收红牌：acceptCompletion 校验审计非 red、criteria critical/high 全通过、pr 契约须 merged
- 任务门禁：PATCH /tasks/:id status→done 时存在非 passed/waived 契约则 422（无契约不拦）

### 4.4 Checklists

```
GET    /_api/acceptance/checklists/all     - 所有清单
GET    /_api/acceptance/checklists/system - 系统预置
GET    /_api/acceptance/checklists/:id    - 详情
POST   /_api/acceptance/checklists/:id/apply - 应用清单
```

---

## 5. 前端组件

### 5.1 模块结构

```
modules/acceptance/
├── api/
│   └── acceptance-api.ts     # API 调用封装
├── components/
│   └── audit-report-panel.tsx # 审计报告面板 ★ Demo 关键组件
├── hooks/
│   └── use-acceptance.ts    # React Query hooks
└── pages/
    └── acceptance-detail-page.tsx # 验收详情页
```

### 5.2 关键 UI

| 组件 | 说明 |
|------|------|
| `AuditReportPanel` | 审计报告展示（红/黄/绿风险标记、一键补全按钮）|
| `CriteriaList` | 验收标准列表（功能/技术分类）|
| `RiskBadge` | 风险级别徽章 |

---

## 6. 技术栈清单

### 6.1 预置清单（已实现）

- [x] Java/Spring 后端完备性清单
- [x] TypeScript/Node 后端完备性清单
- [x] React 前端完备性清单
- [x] Python/Django 后端完备性清单
- [x] Go/Gin 后端完备性清单

### 6.2 清单结构

```json
{
  "name": "xxx完备性清单",
  "projectType": "backend | frontend | mobile | library",
  "techStack": "java-spring | ts-node | react | ...",
  "checklist": [
    {
      "category": "日志 | 错误处理 | 健康检查 | ...",
      "content": "检查项内容",
      "severity": "critical | high | medium | low"
    }
  ]
}
```

---

## 7. 实现状态

| 功能 | 状态 | 说明 |
|------|------|------|
| T01 v1 清理 | ✅ 完成 | Task.aiExecution* 字段标记 deprecated |
| T02 数据层 | ✅ 完成 | 5 个 model + AcceptanceModule |
| T03 技术栈模板 | ✅ 完成 | 5 套预置清单 + seed |
| T04 完整性审计 | ✅ 完成 | 依赖检查 + 工程检查 + 三级响应 |
| T05 成本归因 | ✅ 完成 | AIUsageLog → ExecutionRun → Acceptance |
| T06 ContextPack 注入 | ✅ 完成 | Layer 2 注入验收标准 |
| 前端 Demo UI | ✅ 完成 | AuditReportPanel + DetailPage |
| T19 文档对齐 | ✅ 完成 | 本文档 |
| 闭环改造（2026-08-23） | ✅ 完成 | 活契约自动创建/终态专用端点/接收聚合校验/waive 实现/任务 done 门禁/两级审计 gate/criteria 判定落 evidence/列表·详情页重写(i18n+创建+分页)/任务页验收卡/派发黄牌 toast |

### 7.1 闭环改造明细（2026-08-23）

- **水源**：`ExecutionService.createExecutionRun` 未传 acceptanceId 时自动查找/创建活契约（同步推断 completionType，消除 fire-and-forget 竞态）
- **阀门**：PATCH 禁直写终态；acceptCompletion 聚合校验（in_review 前置 + evidence + pr 须 merged + critical/high criteria + 审计非 red）
- **waive**：新端点 + migration（waivedAt/waivedBy/waiverReason）
- **门禁**：task → done 检查契约全为 passed/waived；audit-gate 改活契约查询
- **证据**：criteria 判定自动落 human_approval evidence；test_report 全绿时 completionEvidence 记录 autoChecks
- **前端**：列表页/详情页按模板重写（i18n、创建弹窗、分页、判定接线、接收/驳回/豁免、审计对齐）；任务详情页验收卡（状态徽章/进度/审计风险点/新建契约入口/失败清单展示）

---

## 8. 后续计划

### Phase 1.5

- [ ] Linear 双向同步（T07）
- [ ] 验收中心完整 UI（T10）
- [ ] 验收证据汇聚（T12）

### Phase 2

- [ ] 交付风险预测（T13）
- [ ] AI 代码质量可观测性（T14）
- [ ] 团队 AI 活动仪表盘（T15）

---

## 9. 关联文档

- [[产品需求文档-v3|PRD V3]] - 需求真相源
- [[迁移改造任务清单-v3]] - 落地任务清单
- [[Feat003-Task-任务]] - Task 模块
- [[Feat015-Execution-执行与审批]] - Execution 模块
