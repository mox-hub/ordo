---
title: "Integration 模块需求说明"
description: 定义 Integration 模块在 v2 平台化路线下作为外部系统连接器（GitHub/通知渠道等）、上下文补充与受控外部写入边界的职责
category: requirement
status:
  - active
tags:
  - Integration
  - Feature
  - requirements
  - connector
version: 2.1.0
created: 2026-07-15 06:40:44
modified: 2026-07-16 04:15:15
projects: "[[APM-项目中心]]"
---

# Integration 模块需求说明

## 1. 模块定位

在 v2 路线下，Integration 模块不应被定义成“尽可能多接所有外部平台”的连接器堆栈。

Integration 模块的核心定位是：

> 平台的**外部系统连接器**，负责连接外部系统（GitHub/GitLab、通知渠道、工单系统等）、补充任务与项目上下文，并承载受控的外部写操作。

Integration 与 Plugin 的边界：

- **Integration = 连接器**：连接**外部系统**，读写外部数据（GitHub PR、Slack 通知、Jira 工单）
- **Plugin = 扩展机制**：改变平台**能力**（注册新 Provider/视图/接入点）

二者关系：Integration 可作为一种 Plugin 类型存在（连接器插件），但 Phase 1 两者分开建模 —— Integration 聚焦外部系统连接，Plugin 聚焦扩展机制。

### 1.1 模块功能约束范围

1. 外部连接配置管理（凭证、范围、状态）
2. 外部链接与引用管理（项目级 / 任务级）
3. 外部上下文补充（ContextPack 数据源）
4. 受控外部写操作（分级审批）
5. 外部状态查询与同步
6. 外部动作审计

### 1.2 与其他模块的边界

- Integration 模块**承载**外部系统连接与受控读写，是平台与外部系统的边界层。
- Integration 模块**不承载**本地能力（由 Runtime 承载），只对接外部 API/webhook。
- Integration 模块**不绕过**审批链，外部写操作进入审批门。
- Integration 与 Git 模块协作：Git 模块管本地仓库，Integration 管远程托管平台（GitHub/GitLab）的 PR/状态。

## 2. 模块目标

### 2.1 第一目标

提供项目级和全局级外部连接配置能力。

### 2.2 第二目标

让外部系统数据可以被平台结构化引用，而不是散落在备注或链接里。

### 2.3 第三目标

将对外部系统的写入动作纳入统一审批与审计链路。

## 3. Phase 1 范围

Phase 1 中，Integration 模块优先服务项目管理底盘和任务执行闭环。

Phase 1 首批集成对象：

- **GitHub / GitLab**：PR 状态同步、Issue 关联（与 Git 模块呼应）
- **通知渠道**：Slack / Discord webhook（与 Notification 模块呼应）

Phase 1 必须交付：

- 外部连接配置管理
- 项目级 / 任务级外部链接
- 外部状态查询（只读）
- 少量受控外部写动作（通知、评论）

Phase 1 不追求大而全的 SaaS 集成市场。

## 4. 模块依赖

### 4.1 依赖模块

- [Feat001-Core-核心](Feat001-Core-核心.md)
- [Feat013-Auth-登录注册](Feat013-Auth-登录注册.md)

### 4.2 被依赖模块

- [Feat002-Project-项目管理](Feat002-Project-项目管理.md)
- [Feat003-Task-任务](Feat003-Task-任务.md)
- [Feat005-Git-版本管理](Feat005-Git-版本管理.md)（远程 PR 状态与 Git 模块呼应）
- [Feat006-Notification-消息中心](Feat006-Notification-消息.md)（通知渠道作为 Integration 类型）
- [Feat010-AIHub-人工智能](Feat010-AIHub-人工智能.md)

## 5. 核心职责

### 5.1 外部连接配置管理

Integration 模块负责：

- 记录 Provider 类型（github / gitlab / slack / discord / jira / ...）
- 记录连接范围（全局级 / 项目级）
- 管理凭据引用（不存明文，引用 Auth 或凭证管理）
- 维护连接状态

### 5.2 外部链接与引用管理

Integration 模块负责维护项目级与任务级的**非文档类**外部引用：

- 项目级：仓库托管链接、Dashboard/CI 链接
- 任务级：关联 GitHub PR、Jira issue、测试报告、构建记录

> 文档链接（含外部文档引用）已迁移至 [[Feat016-Document-文档管理|Document 模块]] 统一管理（external 类型文档）。

### 5.3 外部上下文补充

Integration 模块为 ContextPack 提供外部上下文数据源：

- 外部 Issue / PR 状态摘要
- 外部构建 / CI 结果摘要

> 外部文档引用的上下文补充由 Document 模块承载（见 Document 第 8 章 ContextPack 知识层数据源）。

### 5.4 外部动作边界

Integration 模块必须区分动作风险：

| 风险级别 | 示例 | 审批 |
|---------|------|------|
| 只读 | 查询外部链接、Issue 状态、构建状态 | 默认允许 |
| 低风险写 | 发送通知、写评论、创建引用链接 | 按项目策略 |
| 高风险写 | 创建/更新外部工单、触发外部流程、修改外部状态 | 默认审批 |

### 5.5 外部写操作治理

所有由任务执行触发的外部写操作都必须：

- 绑定 `ExecutionRun`
- 受项目权限约束
- 进入审计记录
- 按策略进入审批门

## 6. 首批集成对象

### 6.1 GitHub / GitLab（代码托管）

与 Git 模块协作（Git 管本地，Integration 管远程）：

| 能力 | Phase 1 |
|------|---------|
| 关联 PR/MR 链接 | ✅ |
| 查询 PR 状态（open/merged/closed）| ✅ 只读 |
| 关联 Issue | ✅ |
| 查询 Issue 状态 | ✅ 只读 |
| 创建 PR/Issue | ❌ Phase 2（高风险写）|
| PR webhook 自动同步 | ❌ Phase 2 |

### 6.2 通知渠道（Slack / Discord）

与 Notification 模块协作（Notification 管站内，Integration 提供外部渠道）：

| 能力 | Phase 1 |
|------|---------|
| webhook 配置 | ✅ |
| 发送通知到外部渠道 | ✅ 低风险写 |
| 外部渠道双向同步 | ❌ Phase 2 |

### 6.3 其他 Provider（Phase 2）

- Jira / Linear（工单双向同步）
- CI/CD 平台（构建状态深度集成）
- 知识库（Confluence / Notion）

## 7. 外部动作权限模型

> 与 [[角色级权限模型-v1|角色-等级-权限模型]] 对齐。

### 7.1 权限层级

外部动作权限分三层：

- `integration.read`：查询外部链接、状态
- `integration.write`：低风险写（通知、评论、链接）
- `integration.high-risk`：高风险写（创建/更新外部工单、触发外部流程）

### 7.2 权限矩阵（Phase 1）

权限继承自成员在所属项目中的角色：

| 能力 | Owner | Maintainer | Contributor | Viewer | 外部 Agent（受审批）|
|------|:-----:|:----------:|:-----------:|:------:|:-------------------:|
| 只读查询（integration.read）| ✅ | ✅ | ✅ | ✅ | ✅ |
| 低风险写（integration.write）| ✅ | ✅ | ✅ | ❌ | 按项目策略审批 |
| 高风险写（integration.high-risk）| ✅ | ✅ | ❌ | ❌ | 强制审批 |
| 配置集成连接 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 管理外部凭证 | ✅ | ✅ | ❌ | ❌ | ❌ |

### 7.3 外部 Agent 的 Integration 权限约束

- 只读查询：默认可执行
- 低风险写（如发送通知）：按项目策略审批
- 高风险写（如创建外部工单）：强制审批
- 凭证管理：禁止（Agent 不可管理集成凭证）

### 7.4 权限决策规则

- 外部动作权限取成员项目角色与 Integration 级规则的最严格交集
- 所有外部写操作必须可追溯到 `executionRunId` 与 `projectId`
- 外部写操作受项目边界约束（只操作项目绑定的外部连接）

## 8. AI 协作能力

> Integration 为 Agent 提供外部系统的上下文补充与受控写出口。

### 8.1 Integration 作为 ContextPack 数据源

Agent 通过 Integration 获取外部上下文：

- 关联的 GitHub PR 状态（理解代码评审进展）
- 关联的外部 Issue（理解需求来源）
- 外部构建/CI 结果（理解质量状态）

这些上下文由 AI Hub 策展进入 ContextPack（作为知识层补充数据）。

### 8.2 Agent 的受控外部写动作

Agent 在授权与审批约束下可执行外部写动作：

- 只读查询：默认可执行
- 低风险写（通知、评论）：按项目策略审批
- 高风险写（创建工单、触发流程）：强制审批

所有 Agent 的外部写动作必须：

- 绑定 `executionRunId`
- 在项目绑定的外部连接范围内
- 进入审批门
- 记录审计

### 8.3 Agent 不可执行的操作

- 管理集成连接配置
- 管理外部凭证
- 修改连接范围

### 8.4 外部写动作对 Agent 的反馈

- 动作成功：返回结构化结果（外部对象 ID、URL、状态）
- 动作失败：返回结构化错误（对齐 Core 错误模型）
- 审批拒绝：执行进入 `pending_approval` 或终止

## 9. 事件与通知

> 与 [[Feat001-Core-核心|Core 事件总线]] 和 [[Feat006-Notification-消息中心|Notification 模块]] 对齐。

### 9.1 Integration 级领域事件

Integration 模块必须发布以下领域事件：

| 事件 | 触发时机 | 典型订阅方 |
|------|---------|-----------|
| `integration.connected` | 外部连接建立 | Notification |
| `integration.disconnected` | 外部连接断开 | Notification |
| `integration.link_added` | 添加外部链接 | Notification |
| `integration.action_executed` | 外部动作执行（含风险级别）| 审计 |
| `integration.high_risk_action` | 高风险外部写动作 | Notification（Owner/Maintainer）|
| `integration.action_rejected` | 动作被审批/权限拒绝 | Notification、审计 |
| `integration.status_synced` | 外部状态同步 | 审计 |

### 9.2 通知分发

- 高风险外部写动作通知项目 Owner / Maintainer
- 外部连接断开通知配置者
- 外部写动作结果通知任务负责人

## 10. 核心功能需求

### FR-IT-01 集成配置管理

Integration 模块必须支持：

- 创建集成配置
- 编辑集成配置
- 查看连接状态
- 禁用/启用集成配置
- 管理凭据引用（不明文存储）

最小字段建议：

- `provider`（github / gitlab / slack / discord / ...）
- `scopeType`（global / project）
- `scopeId`
- `credentialRef`
- `status`
- `lastSyncAt`

### FR-IT-02 项目级外部链接管理

Integration 模块必须支持维护项目级**非文档类**外部链接：

- 仓库托管链接
- Issue / Ticket 链接
- Dashboard / CI 链接

> 文档链接已迁移至 [[Feat016-Document-文档管理|Document 模块]]（external 类型文档统一管理）。

### FR-IT-03 任务级外部引用

Integration 模块必须支持任务和外部对象之间建立引用关系：

- 任务关联 GitHub PR
- 任务关联外部 Issue
- 任务关联测试报告或构建记录

### FR-IT-04 外部状态查询

Integration 模块必须支持查询外部对象的基础状态（只读）。

Phase 1 至少支持：

- GitHub/GitLab PR 状态（open/merged/closed）
- Issue 基础状态
- 构建基础结果摘要

### FR-IT-05 受控外部写动作

Integration 模块必须支持受控的外部写动作。

Phase 1 收敛到：

- 发送通知（Slack/Discord webhook）
- 创建评论或备注
- 更新轻量状态字段

更复杂的双向同步推迟到后续阶段。

### FR-IT-06 外部写动作审批

Integration 模块必须支持外部写动作进入审批门：

- 只读查询默认允许
- 低风险写按项目策略处理
- 高风险写默认审批

### FR-IT-07 首批 Provider 支持

Integration 模块必须支持（Phase 1 首批）：

- GitHub（PR 状态、Issue 关联，只读）
- 通知渠道（Slack/Discord webhook，低风险写）

### FR-IT-08 Integration 级事件与通知

Integration 模块必须：

- 发布 Integration 级领域事件（见 [第 9 章](#9-事件与通知)）
- 接入 Notification 模块
- 高风险动作、连接断开等关键事件正确分发

## 11. 数据模型要求

> 与 [[数据模型-Integration|Integration 支撑模型]] 对齐。

### 11.1 核心对象

| 实体 | 用途 |
|------|------|
| `IntegrationConnection` | 外部连接配置 |
| `ExternalLink` | 项目/任务与外部对象的引用 |
| `IntegrationActionRecord` | 受控外部动作审计 |
| `IntegrationCredential` | 外部凭证引用（不明文）|

### 11.2 IntegrationConnection 建议字段

- `id`
- `provider`（github / gitlab / slack / discord / ...）
- `scopeType`（global / project）
- `projectId`（项目级时必填）
- `name`
- `credentialRef`
- `enabled`
- `lastSyncAt`
- `lastKnownStatus`
- `createdAt`
- `updatedAt`

### 11.3 ExternalLink 建议字段

- `id`
- `projectId`
- `taskId`（任务级引用时）
- `provider`
- `externalType`（pr / issue / doc / build / ...）
- `externalId`
- `externalUrl`
- `title`
- `lastKnownStatus`
- `lastSyncedAt`
- `createdAt`
- `updatedAt`

### 11.4 IntegrationActionRecord 建议字段

- `id`
- `projectId`
- `taskId`
- `executionRunId`
- `connectionId`
- `provider`
- `actionType`
- `riskLevel`（read / write / high-risk）
- `status`
- `summary`
- `createdAt`

### 11.5 关系建议

- `Project 1 - N IntegrationConnection`
- `IntegrationConnection 1 - N ExternalLink`
- `Task 1 - N ExternalLink`
- `IntegrationConnection 1 - N IntegrationActionRecord`
- `ExecutionRun 1 - N IntegrationActionRecord`

## 12. Phase 1 非目标

Integration 模块在 Phase 1 暂不要求：

- 大规模双向同步引擎
- 复杂 ETL 或外部数据仓库能力
- 完整集成市场和插件生态
- 面向所有 SaaS 的统一抽象层
- 创建/更新外部 PR/Issue（高风险写，Phase 2）
- PR/Issue webhook 自动实时同步（Phase 2）
- Jira/Linear 双向工单同步（Phase 2）

## 13. GWT 验收场景

### 13.1 正常流：外部上下文补充

```
Given 项目已配置 GitHub 集成并关联 PR
When 外部 Agent 围绕任务请求上下文
Then 平台把外部 PR 状态作为结构化上下文的一部分返回
  And 纳入 ContextPack 知识层
```

### 13.2 异常流：外部写动作审批拒绝

```
Given 外部 Agent 请求执行需要审批的外部写动作（如创建 Issue）
When 审批未通过
Then 系统不得调用外部 Provider
  And 记录阻塞和审批结果
```

### 13.3 边界流：多外部链接

```
Given 一个任务同时关联多个外部链接（PR + Issue + 构建）和多次执行记录
When 用户查看任务详情或执行回放
Then 系统应能区分链接来源、当前状态和历史外部动作摘要
```

### 13.4 通知渠道发送

```
Given 项目配置了 Slack webhook
When 任务执行完成触发通知
Then Integration 通过 webhook 发送通知到 Slack
  And 发送记录审计
```

### 13.5 PR 状态查询

```
Given 任务关联了 GitHub PR
When Agent 查询 PR 状态
Then 返回 PR 当前状态（open/merged/closed）
  And 不代理 PR 内部操作（跳转外部）
```

### 13.6 凭证安全

```
Given 集成连接配置了 GitHub 凭证
When 查看连接配置
Then 凭证不明文展示（仅显示引用）
  And 凭证不落明文日志
```

### 13.7 Agent 受控外部写

```
Given Agent 尝试发送 Slack 通知（低风险写）
When 项目策略要求审批
Then 动作进入审批门
  And 审批通过后执行发送
  And 发送结果回写到执行记录
```

## 14. 待确认问题

1. 外部凭证存储方式（引用 Auth 的 ApiToken 机制 vs 独立凭证管理）
2. GitHub PR 状态同步频率（Phase 1 手动刷新 vs 定时轮询）
3. Slack/Discord webhook 的通知格式模板是否 Phase 1 定制
4. 高风险外部写（创建 PR/Issue）的 Phase 2 排期
5. Integration 作为 Plugin 类型的正式融合时机
