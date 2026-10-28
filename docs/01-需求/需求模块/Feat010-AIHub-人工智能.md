---
title: "AI Hub 模块需求说明"
description: 定义 AI Hub 模块在 v2 平台化路线下作为 Agent 执行编排、外部 Agent 接入中枢与 ContextPack 上下文策展者的职责
category: requirement
status:
  - active
tags:
  - AIHub
  - Feature
  - requirements
  - agent
  - execution
  - context
version: 2.1.0
created: 2026-07-15 06:40:44
modified: 2026-07-16 03:29:18
projects: "[[APM-项目中心]]"
---

# AI Hub 模块需求说明

## 1. 模块定位

在 v1 时代，AI Hub 更像：

- 对话入口
- 模型调用入口
- 工作流入口

在 v2 路线下，AI Hub 的定位收敛为：

> 平台中的 Agent 执行编排中枢、外部 Agent 接入中枢与 ContextPack 上下文策展者。

它不再以“聊天面板”为中心，而是围绕以下能力展开：

- 外部 Agent 接入与身份映射
- 执行创建与编排（ExecutionRun 生命周期）
- 上下文策展（ContextPack 四层分层）
- 模型与 Provider 路由
- 审批协同
- 执行回放与审计

### 1.1 模块功能约束范围

1. 外部 Agent 身份接入与映射
2. ExecutionRun 执行编排与状态机
3. ContextPack 上下文策展（四层分层、配方、Token 预算）
4. CLI / MCP / API / Plugin Provider 路由
5. 执行审批协同
6. 执行回放、结果回写与审计

### 1.2 与其他模块的边界

- AI Hub **不承载**项目/任务主数据（由 Project / Task 承载），只消费它们提供的数据。
- AI Hub **不承载**权限决策与审批最终裁决（由 Project 权限模型与人类审批人决定），只负责发起 `ApprovalRequest` 并按结果恢复/终止执行。
- AI Hub **不直接执行**本地命令（由 Runtime 承载），只负责 Provider 选择、派发与接收 Runtime 回传事件。
- AI Hub **负责** ContextPack 的策展逻辑，但 Project / Task 负责 `ContextPack.project` / `ContextPack.task` 的原始数据契约（见 [第 7 章](#7-contextpack-上下文策展)）。
- AI Hub **编排**执行对象（创建、派发、状态流转），但执行对象（ExecutionRun / ApprovalRequest / Step / Artifact / Evidence）的**需求语义**由 [[Feat015-Execution-执行与审批|Execution 模块]] 定义。AI Hub 是「引擎」，Execution 是「规格」。

## 2. 模块目标

### 2.1 第一目标

成为平台中 AI 协作的统一入口，但入口对象是“执行”，不是“闲聊”。

### 2.2 第二目标

承接外部 AI 工具与平台之间的编排逻辑，尤其是：

- Codex
- Claude Code
- 后续 MCP Agent

### 2.3 第三目标

把 AI Hub 从“对话中心”改造成“Agent 执行编排器 + 上下文策展者”的上层控制模块。

## 3. Phase 1 范围

Phase 1 中，AI Hub 模块必须先服务：

- 外部 AI 开发工具的 CLI 接入主线
- Runtime 派发与执行编排
- `ExecutionRun` 状态机与 `ApprovalRequest` 协同
- ContextPack 结构化上下文构建（基础分层）
- `external_agent` 主体的身份映射（Phase 1 不含 `platform_ai_member`）

Phase 1 暂不要求：

- 复杂多步骤 AI 工作流系统
- 完整平台内 AI 成员体系（`platform_ai_member` 列为 Phase 2/3）
- 复杂聊天产品体验
- 多 Agent 协同调度编排

## 4. 模块依赖

### 4.1 依赖模块

- [Feat001-Core-核心](Feat001-Core-核心.md)
- [Feat002-Project-项目管理](Feat002-Project-项目管理.md)
- [Feat003-Task-任务](Feat003-Task-任务.md)
- [Feat005-Git-版本管理](Feat005-Git-版本管理.md)
- [Feat015-Execution-执行与审批](Feat015-Execution-执行与审批.md)

### 4.2 被依赖模块

- [Feat006-Notification-消息中心](Feat006-Notification-消息.md)
- [Feat009-Integration-外部链接](Feat009-Integration-外部链接.md)

## 5. 核心职责

### 5.1 Agent 接入中枢

AI Hub 模块需要成为外部 AI 工具接入平台时的编排层。

至少负责：

- 接入主体识别（`subjectType`）
- 主体身份来源区分（`identitySource`）
- 执行目标归属（taskId / projectId）
- 运行状态可见（Agent 在线、执行队列）

### 5.2 执行编排

AI Hub 模块需要围绕 `ExecutionRun` 做统一编排，并维护完整状态机（见 [第 6 章](#6-executionrun-状态机)）。

至少负责：

- 创建执行
- 分配执行到 Runtime / Provider
- 维护执行状态流转
- 处理执行失败与恢复信号
- 审批暂停与恢复

### 5.3 上下文策展

AI Hub 模块负责为执行构建结构化、可审计、可裁剪、可回放的 `ContextPack`，而不是生成面向 UI 的拼接文本（详见 [第 7 章](#7-contextpack-上下文策展)）。

### 5.4 模型与 Provider 路由

AI Hub 模块负责模型和 Provider 维度的治理，治理对象包括 LLM API 与 CLI Agent Provider。

Phase 1 优先：

- CLI Provider 路由（codex / claude-code）

后续扩展：

- MCP Provider
- 远程模型 Provider

### 5.5 审批协同

AI Hub 模块作为执行编排层，与审批流协同（见 [第 9 章](#9-审批协同)）。

至少负责：

- 将需要审批的动作转成 `ApprovalRequest`
- 在审批结果返回后恢复或终止执行
- 维护审批与执行的关联关系

### 5.6 执行回放与审计

AI Hub 模块负责维护执行的可回放与可审计性。

至少负责：

- 记录执行步骤（ExecutionStep）
- 维护执行事件流
- 支持按 `executionRunId` 回放执行轨迹
- 关联产物（Artifact）与证据（Evidence）

## 6. ExecutionRun 状态机

> ExecutionRun 是 AI 协作的核心对象，必须定义完整状态机。与 [[执行审批模型-v1|执行与审批模型]] 对齐。

### 6.1 状态定义

| 状态 | 说明 | Runtime 占用 | 接收审批 |
|------|------|:----------:|:-------:|
| `pending` | 已创建，待派发到 Runtime | 否 | - |
| `dispatched` | 已派发到 Runtime，待执行 | 是 | - |
| `running` | 执行中 | 是 | 是（写操作）|
| `pending_approval` | 被审批门阻塞 | 是（暂挂）| 是 |
| `completed` | 成功完成 | 否 | - |
| `failed` | 执行失败 | 否 | - |
| `cancelled` | 被人类取消 | 否 | - |
| `blocked` | 因 Runtime 离线/资源问题阻塞 | 否 | - |

### 6.2 状态流转规则

```
pending → dispatched → running → completed
              ↓ ↑          ↓
           blocked    pending_approval
              ↓ ↑          ↓
           (恢复)     (审批通过→running / 审批拒绝→failed)

running → failed (执行出错)
running → cancelled (人类取消)
* → cancelled (人类取消，除终态)
```

- `pending → dispatched`：AI Hub 派发到 Runtime 成功
- `dispatched → running`：Runtime 开始执行
- `running ↔ pending_approval`：写操作进入审批门，审批通过恢复 running
- `pending_approval → failed`：审批拒绝，执行终止
- `dispatched / running → blocked`：Runtime 离线或资源不可用，阻塞
- `blocked → dispatched`：Runtime 恢复后重新派发
- `running → completed`：执行成功完成，结果回写
- `running → failed`：执行出错，记录失败原因
- 终态：`completed` / `failed` / `cancelled` 不可回退

### 6.3 状态设计原则

- `pending_approval` 代表执行被审批门阻塞，**不是整体失败**，审批通过应能恢复执行
- 一个 `ExecutionRun` 允许存在多个 `ApprovalRequest`（多次审批门）
- 状态变更必须进入 Core 审计与执行事件流，不可篡改
- 终态执行的历史记录保留，支持回放

### 6.4 失败与重试

- `failed` 状态记录失败原因与错误分类（对齐 Core 错误模型）
- 提供重试入口，重试创建**新的** `ExecutionRun`，不修改原执行记录
- 重试可复用原上下文快照（`contextSnapshotId`）

## 7. ContextPack 上下文策展

> AI Hub 负责 ContextPack 的策展逻辑。与 [[上下文管理设计|上下文管理系统设计]] 对齐。
> Project / Task 负责提供 `ContextPack.project` / `ContextPack.task` 的原始数据契约。

### 7.1 四层上下文结构

| 层 | 名称 | 内容 | Phase 1 |
|----|------|------|---------|
| Layer 1 | 基础层（Foundation）| 项目名片：技术栈、当前迭代、关键约束 | ✅ 固定 |
| Layer 2 | 任务层（Task Scope）| 任务信息、依赖、约束，按任务类型组装 | ✅ |
| Layer 3 | 知识层（Knowledge）| 相关代码摘要、决策记录、历史执行参考 | ✅ 基础 |
| Layer 4 | 扩展层（Extended）| 完整文件源码、详细文档，Agent 按需加载 | ✅ MCP |

### 7.2 策展职责划分

- **Project 模块**：提供 `ContextPack.project` 原始数据（见 Project 第 9.2 节）
- **Task 模块**：提供 `ContextPack.task` 原始数据（见 Task 第 11.2 节）
- **AI Hub 模块**：负责四层**策展**——配方匹配、相关性排序、Token 预算控制、压缩、双视图渲染、快照固化

### 7.3 上下文配方（ContextRecipe）

按任务类型匹配配方，定义各层内容与 Token 预算：

| 配方 | Token 预算 | Layer 2 重点 | 适用任务类型 |
|------|-----------|-------------|-------------|
| `bug_fix` | 1500 | 错误描述 + 复现步骤 + 日志 | bug |
| `feature` | 2500 | 需求 + API 契约 + 设计引用 | feature |
| `default` | 2000 | 任务基础信息 | task / epic |

说明：

- 配方匹配：检查任务标签 → 任务 `type` → 父任务类型 → 默认 default
- PM 可手动指定配方覆盖自动匹配
- 配方存储于 `ContextRecipe`，系统预定义 + PM 自定义（Phase 2）

### 7.4 Token 预算管理

- 预算计算：配方基础预算 × 信任等级系数（L0×1.0 → L3×2.0）
- 四层分配：基础层 8-10% / 任务层 20-30% / 知识层 40-60% / 扩展层 0%（预留按需）
- 超预算处理：按相关性从低到高压缩或移除 Layer 3 项

### 7.5 双视图渲染

同一份上下文数据，两种渲染：

- **AI 视图**：结构化、Token 高效，通过 CLI/MCP 传递给 Agent
- **人类视图**：可交互、可审计、可调整，在 Web UI 执行详情页展示

PM 可进行的操作（Phase 2 完整支持，Phase 1 基础查看）：

- 切换压缩级别（full / summary / reference）
- 移除 / 添加内容项
- 调整 Token 预算
- 锁定上下文包（确认后不可修改）

### 7.6 上下文快照

- 每次执行固化一个 `ContextPackSnapshot`，不可篡改
- 快照作为审计依据，支持执行回放时还原当时上下文
- 快照记录使用的 `recipeId` / `totalTokens` / `budgetTokens` / `curationStatus`

## 8. 外部 Agent 身份与权限

> Phase 1 仅服务 `external_agent`。与 [[角色级权限模型-v1|角色-等级-权限模型]] 对齐。

### 8.1 身份映射

外部 Agent 接入后，AI Hub 必须建立身份映射：

| 字段 | 说明 | Phase 1 |
|------|------|---------|
| `subjectType` | 主体类型 | `external_agent` |
| `identitySource` | 身份来源 | `cli`（优先）|
| `providerId` | Provider 标识 | `codex` / `claude-code` |
| `mappedRole` | 映射角色 | 开发工程师 / 测试工程师 / 项目助理 |
| `mappedLevel` | 映射等级 | Intern / Junior / Senior |
| `projectId` | 项目归属范围 | 必填 |

### 8.2 首批外部 Agent

Phase 1 首批支持：

- Codex
- Claude Code

### 8.3 权限约束

外部 Agent 的权限受双重约束：

1. **项目级权限**：由 Project 权限模型决定（见 Project 第 8 章）
2. **执行级审批**：写操作按风险分级进入 `ApprovalRequest`

AI Hub 不自行决定 Agent 权限，只负责：

- 载入项目级权限包
- 在执行派发前校验项目边界（工作区、Provider 范围）
- 将写操作转为审批请求

### 8.4 平台内 AI 成员的边界

- Phase 1：仅预留 `platform_ai_member` 的 `subjectType` 字段，不承载其生命周期
- Phase 2/3：演进到正式 AI 成员组织能力时扩展

## 9. 审批协同

> 与 [[执行审批模型-v1|执行与审批模型]] 对齐。

### 9.1 审批触发

AI Hub 在执行过程中遇到以下情况，必须创建 `ApprovalRequest`：

- 写操作（按项目策略与风险分级）
- 高风险动作（Git 写、Terminal 危险命令）
- 项目策略要求的审批动作

### 9.2 审批恢复机制

| 审批结果 | 执行状态变化 |
|---------|-------------|
| 通过 | `pending_approval → running`，继续执行 |
| 拒绝 | `pending_approval → failed`，记录拒绝原因 |
| 超时 | 按项目策略（默认保持 `pending_approval` 或转为 `failed`）|

### 9.3 多审批门

- 一个 `ExecutionRun` 可有多个 `ApprovalRequest`（多次审批门）
- 每次审批门独立处理，互不阻塞已通过的部分
- 审批历史完整保留，支持回放

## 10. AI 协作能力（AI Hub 自身定位）

> AI Hub 是平台 AI 差异化的技术承载者。其他模块的「AI 协作能力」章节描述各自如何被 AI 使用，AI Hub 则是 AI 使用平台的**编排中枢**。

### 10.1 AI Hub 作为 Agent Surface 的后端

- Agent Surface（CLI/MCP/API/Plugin）的请求最终由 AI Hub 编排
- AI Hub 是 Agent 读取上下文、创建执行、提交审批、回写结果的统一处理层

### 10.2 AI Hub 不承载的能力

AI Hub 不自行做：

- 项目/任务数据修改的最终裁决（由权限模型与审批人决定）
- 本地命令执行（由 Runtime 承载）
- 权限策略定义（由 Project 承载）

### 10.3 对其他模块 AI 协作的支撑

AI Hub 支撑其他模块已定义的 AI 协作契约：

- Project 第 9 章：消费 `ContextPack.project` 组装 Layer 1
- Task 第 11 章：消费 `ContextPack.task` 组装 Layer 2
- Core 第 9 章：依赖其审计、事件、配置能力
- Git：消费 Git 上下文组装知识层

## 11. 执行事件与通知

> 与 [[Feat001-Core-核心|Core 事件总线]] 和 [[Feat006-Notification-消息中心|Notification 模块]] 对齐。

### 11.1 执行级领域事件

AI Hub 必须发布以下执行事件：

| 事件 | 触发时机 | 典型订阅方 |
|------|---------|-----------|
| `execution.created` | 创建 ExecutionRun | Notification、审计 |
| `execution.dispatched` | 派发到 Runtime | 审计 |
| `execution.running` | Runtime 开始执行 | 审计 |
| `execution.pending_approval` | 进入审批门 | Notification（审批人）|
| `execution.approval_resolved` | 审批结果返回 | Notification、审计 |
| `execution.completed` | 执行完成 | Notification、Task（回写）|
| `execution.failed` | 执行失败 | Notification、Task（回写）|
| `execution.cancelled` | 被取消 | Notification、审计 |
| `execution.blocked` | Runtime 离线等阻塞 | Notification |

### 11.2 通知分发

- 审批类事件通知审批人
- 完成/失败事件通知任务负责人与发起人
- 阻塞事件通知项目 Owner/Maintainer
- 通知不绕开权限校验，不泄露无权限资源

## 12. 核心功能需求

### FR-AI-01 外部 Agent 身份接入

AI Hub 模块必须支持外部 Agent 身份映射。

至少需要：

- `subjectType`（`external_agent`）
- `identitySource`（`cli` 优先）
- `providerId`（`codex` / `claude-code`）
- `mappedRole`
- `mappedLevel`
- `projectId`

Phase 1 首批支持 Codex / Claude Code。

### FR-AI-02 执行创建与状态机

AI Hub 模块必须支持围绕任务创建 `ExecutionRun`，并维护完整状态机：

- 8 个状态（pending / dispatched / running / pending_approval / completed / failed / cancelled / blocked）
- 合法流转规则校验
- 审批暂停与恢复
- 失败记录与重试入口

### FR-AI-03 上下文策展

AI Hub 模块必须支持构建任务级 `ContextPack`：

- 四层分层策展（基础/任务/知识/扩展）
- 按任务类型匹配配方
- Token 预算管理
- 双视图渲染（AI 视图 + 人类视图）
- 上下文快照固化（不可篡改）

### FR-AI-04 CLI Provider 编排

AI Hub 模块必须和 Runtime 的 CLI 适配层协同。

AI Hub 不直接执行 CLI 命令，但要负责：

- 选择或确认 Provider
- 记录 `ExecutionRun` 与 Provider 关系（`CliExecutionBinding`）
- 接收 Runtime 回传的结构化事件
- 派发前校验项目边界（Provider 范围、工作区）

### FR-AI-05 执行事件与回放

AI Hub 模块必须支持接收并展示以下执行信息：

- 执行开始
- 步骤更新（ExecutionStep）
- 审批等待
- 执行完成
- 执行失败

支持按 `executionRunId` 回放执行轨迹。

### FR-AI-06 审批协同

AI Hub 模块必须支持：

- 执行进入 `pending_approval`
- 创建 `ApprovalRequest`（支持多审批门）
- 审批通过恢复执行 / 审批拒绝终止执行
- 审批超时按项目策略处理

### FR-AI-07 执行结果回写

AI Hub 模块必须支持将执行结果回写到任务：

- 执行状态
- 结果摘要
- 产物引用（Artifact）
- 证据引用（Evidence）
- 失败原因

回写以系统注释形式进入 Task 评论流（见 Task 第 13 章）。

### FR-AI-08 对话能力降级为辅助能力

AI Hub 中的对话能力在 v2 中仍可保留，但不再是主线。

定位调整为：

- 辅助查看上下文
- 辅助解释执行结果
- 辅助发起任务相关分析

而不是独立的产品中心。

### FR-AI-09 执行级事件与通知

AI Hub 模块必须：

- 发布执行级领域事件（见 [第 11 章](#11-执行事件与通知)）
- 接入 Notification 模块
- 审批类、完成/失败、阻塞事件正确分发

## 13. 与 Runtime 的关系

> 与 [[运行时数据模型-v1|Runtime 数据模型]] 对齐。

### 13.1 职责边界

- AI Hub：编排层，负责派发、状态、上下文、审批协同
- Runtime：执行层，负责文件/Git/Terminal/CLI 本地执行

### 13.2 Runtime 离线处理

- 派发时 Runtime 不在线：执行进入 `blocked` 状态
- Runtime 恢复：执行可重新派发（`blocked → dispatched`）
- Runtime 离线期间不丢失执行记录

### 13.3 CLI 会话绑定

- 每个 CLI 执行通过 `CliExecutionBinding` 关联 `ExecutionRun` 与 `CliSession`
- AI Hub 不维护 CliSession 生命周期，由 Runtime 管理
- AI Hub 消费 Runtime 回传的事件更新执行状态

## 14. 数据模型要求

> 与 [[执行审批模型-v1|执行与审批模型]] 和 [[运行时数据模型-v1|Runtime 数据模型]] 对齐。

### 14.1 核心对象

AI Hub 模块相关对象：

| 对象 | 用途 |
|------|------|
| `ExecutionRun` | 执行实例，承载状态机 |
| `ExecutionStep` | 执行步骤记录 |
| `ApprovalRequest` | 审批请求 |
| `ContextPackSnapshot` | 上下文快照（不可篡改）|
| `ContextRecipe` | 上下文配方 |
| `CliExecutionBinding` | 执行与 CLI 会话绑定 |
| `ExecutionArtifact` | 执行产物 |
| `ExecutionEvidence` | 执行证据 |

### 14.2 旧对象重新定位

- `AIConversation`：降级为辅助对象（对话能力，见 FR-AI-08）
- `AIWorkflowRun`：后续视需要再与统一执行模型融合

### 14.3 ExecutionRun 建议字段

- `id`
- `projectId`
- `taskId`
- `subjectType`（`external_agent`）
- `subjectId`
- `providerId`
- `contextSnapshotId`
- `status`（8 态）
- `resultSummary`
- `failureReason`
- `startedAt`
- `finishedAt`

### 14.4 关系建议

- `Task 1 - N ExecutionRun`
- `ExecutionRun 1 - N ExecutionStep`
- `ExecutionRun 1 - N ApprovalRequest`
- `ExecutionRun 1 - 1 ContextPackSnapshot`（主要快照）
- `ExecutionRun 1 - N CliExecutionBinding`
- `ExecutionRun 1 - N ExecutionArtifact`
- `ContextRecipe 1 - N ContextPackSnapshot`

## 15. Phase 1 非目标

AI Hub 模块在 Phase 1 暂不要求：

- 通用多 Agent 编排中心
- 多 Agent 协同调度
- 全功能聊天产品
- 复杂可视化工作流编辑器
- 平台内 AI 成员（`platform_ai_member`）生命周期管理
- 复杂相关性打分与 Runtime 代码索引（Layer 3 智能化列为 Phase 2）
- 偏好学习（PM 调整记录提取偏好规则，Phase 2）

## 16. GWT 验收场景

### 16.1 正常流：执行闭环

```
Given 项目经理把任务分配给外部 Agent
When AI Hub 创建执行并通过 Runtime 派发给 CLI Provider
Then 平台应能记录执行、审批和结果回传全过程
  And 结果以系统注释回写到任务评论流
```

### 16.2 异常流：Provider 不可用

```
Given CLI Provider 无法启动或 Runtime 不在线
When AI Hub 尝试派发执行
Then 系统应返回可定位错误（runtime_offline）
  And 执行标记为 blocked
  And Runtime 恢复后可重新派发
```

### 16.3 边界流：多执行历史

```
Given 同一任务存在历史执行记录和多个审批节点
When 用户查看 AI Hub 相关执行详情
Then 系统应能区分当前执行、历史执行和审批轨迹
```

### 16.4 审批暂停与恢复

```
Given 执行处于 running 状态并触发了写操作审批
When AI Hub 创建 ApprovalRequest
Then 执行进入 pending_approval
  And 审批通过后恢复 running 并继续执行
  And 审批拒绝则执行转为 failed
```

### 16.5 上下文策展

```
Given 一个 bug 类型任务被分配给外部 Agent
When AI Hub 为其策展 ContextPack
Then 系统匹配 bug_fix 配方
  And Layer 1 包含项目名片
  And Layer 2 包含错误描述与复现步骤
  And 固化不可篡改的 ContextPackSnapshot
  And Token 控制在预算内
```

### 16.6 多审批门

```
Given 一次执行涉及多次写操作
When 执行过程中触发多个 ApprovalRequest
Then 每个审批门独立处理
  And 拒绝其一不影响已通过部分
  And 审批历史完整保留可回放
```

### 16.7 执行回放

```
Given 一个已完成的执行
When 项目经理按 executionRunId 回放
Then 系统展示执行步骤、审批轨迹、上下文快照、结果产物
  And 回放数据不可篡改
```

## 17. 待确认问题

1. `pending_approval` 超时默认策略（保持等待 vs 转为 failed，需确认产品取向）
2. Layer 3 知识层的相关性打分算法是否在 Phase 1 交付基础版（完整版列为 Phase 2）
3. 上下文配方是否在 Phase 1 支持 PM 自定义配方（当前文档定为 Phase 2）
4. 对话能力（FR-AI-08）在 Phase 1 是否保留最小集，还是完全移除
5. 执行失败重试是否复用原上下文快照（当前文档允许，需确认成本与新鲜度权衡）
