---
title: "Execution 模块需求说明"
description: 定义 Execution 模块作为核心执行对象（ExecutionRun/ApprovalRequest/Step/Artifact/Evidence）的需求真相源，承载执行状态机、审批治理与回放
category: requirement
status:
  - active
tags:
  - Execution
  - Feature
  - requirements
  - execution
  - approval
  - audit
version: 2.1.0
created: 2026-07-16 04:30:00
modified: 2026-07-16 04:30:00
projects: "[[APM-项目中心]]"
---

# Execution 模块需求说明

> 本文档是平台核心执行对象的需求真相源。
> 对象的详细字段与设计原则见 [[执行审批模型-v1|执行与审批模型]]（架构层），本文档为其需求层映射，承载 FR、状态机、权限、GWT。
> AI Hub 负责执行**编排**，Runtime 负责执行**承载**，本文档定义执行**对象本身的需求语义**。

## 1. 模块定位

在 v2 路线下，平台中 AI 协作的中心对象不是“聊天会话”，而是“执行”。

Execution 模块的核心定位是：

> 平台中核心执行对象（ExecutionRun / ApprovalRequest / ExecutionStep / ExecutionArtifact / ExecutionEvidence）的需求真相源，定义执行的状态机、审批治理、结果沉淀与回放语义。

Execution 模块不是一个「会运行代码的模块」，而是定义**执行如何被建模、治理、追溯**的需求规范。

### 1.1 模块功能约束范围

1. ExecutionRun 执行实例的需求语义与状态机
2. ApprovalRequest 审批治理的需求语义
3. ExecutionStep 执行步骤的需求语义
4. ExecutionArtifact / ExecutionEvidence 产物与证据的需求语义
5. 执行失败、重试、接管的需求语义
6. 执行回放与审计的需求语义

### 1.2 与其他模块的边界

- Execution 模块**定义**核心执行对象的需求语义（字段、状态机、治理规则）。
- AI Hub 模块**编排**这些对象（创建、派发、状态流转驱动）。
- Runtime 模块**承载**这些对象的本地执行。
- Task 模块**挂载**这些对象（任务是执行的归属）。
- Execution 模块**不直接**创建或执行，只定义「执行对象应该是什么样」。

简单类比：Execution 是「执行对象的规格说明」，AI Hub 是「操作执行对象的引擎」。

## 2. 模块目标

### 2.1 第一目标

为平台核心执行对象提供统一的需求真相源，避免实现时各模块对执行对象理解不一致。

### 2.2 第二目标

定义完整的执行状态机与审批治理语义，使执行可治理、可追溯、可回放。

### 2.3 第三目标

让执行的结果、证据、失败可结构化沉淀，支撑可信回放与持续改进。

## 3. Phase 1 范围

Phase 1 中，Execution 模块必须先服务：

- 基于任务的 `ExecutionRun`
- 动作级 `ApprovalRequest`
- 结构化 `ExecutionStep`
- 结果、证据（Artifact / Evidence）的基础沉淀
- 执行审计与回放

Phase 1 暂不要求：

- 跨项目长生命周期执行编排
- 多 Agent 联合作业调度
- 平台内 AI 成员晋升体系联动
- 复杂执行编排引擎

## 4. 模块依赖

### 4.1 依赖模块

- [Feat001-Core-核心](Feat001-Core-核心.md)（审计、事件、错误模型）
- [Feat002-Project-项目管理](Feat002-Project-项目管理.md)（项目边界、权限）
- [Feat003-Task-任务](Feat003-Task-任务.md)（任务归属）

### 4.2 被依赖模块

- [Feat010-AIHub-人工智能](Feat010-AIHub-人工智能.md)（编排执行对象）
- [Feat014-Runtime-本地运行时](Feat014-Runtime-本地运行时.md)（承载执行）
- [Feat005-Git-版本管理](Feat005-Git-版本管理.md)（执行中的 Git 动作）
- [Feat006-Notification-消息中心](Feat006-Notification-消息.md)（执行事件通知）

## 5. ExecutionRun 执行实例

### 5.1 定义

`ExecutionRun` 表示某个主体围绕某个任务或目标发起的一次可追踪执行。它不是单一工具调用，而是一个完整执行实例。

### 5.2 核心语义

每个 `ExecutionRun` 必须回答：

- 谁在执行（subjectType / subjectId）
- 为了什么目标执行（taskId / goal）
- 基于什么上下文执行（contextSnapshotId）
- 做了哪些步骤（ExecutionStep）
- 哪些步骤需要审批（ApprovalRequest）
- 最终产出了什么（Artifact / Evidence / Outcome）
- 是否成功、失败、中断或被接管（status）

### 5.3 ExecutionRun 状态机

> 与 AI Hub 第 6 章对齐。Execution 定义状态语义，AI Hub 驱动状态流转。

| 状态 | 说明 | Runtime 占用 | 接收审批 |
|------|------|:----------:|:-------:|
| `pending` | 已创建，待派发 | 否 | - |
| `dispatched` | 已派发到 Runtime，待执行 | 是 | - |
| `running` | 执行中 | 是 | 是（写操作）|
| `pending_approval` | 被审批门阻塞 | 是（暂挂）| 是 |
| `blocked` | Runtime 离线/资源问题阻塞 | 否 | - |
| `completed` | 成功完成 | 否 | - |
| `failed` | 执行失败 | 否 | - |
| `cancelled` | 被人类取消 | 否 | - |
| `superseded` | 旧执行被新执行替代（保留审计）| 否 | - |

### 5.4 状态设计原则

- `pending_approval` 代表执行被审批门**阻塞**，不是整体失败
- `blocked` 表示依赖缺失、工具不可用、上下文不足等阻塞
- `superseded` 表示旧执行被新执行替代，但保留审计价值
- 终态（completed / failed / cancelled / superseded）不可回退，历史保留

### 5.5 最小字段建议

- `id`
- `projectId`
- `taskId`
- `subjectType`（human / platform_ai_member / external_agent）
- `subjectId`
- `identitySource`
- `goal`
- `role`（映射角色）
- `level`（映射等级）
- `status`
- `contextSnapshotId`
- `failureReason`
- `resultSummary`
- `startedAt`
- `completedAt`
- `terminatedAt`
- `createdBy`

## 6. ApprovalRequest 审批请求

### 6.1 定义

`ApprovalRequest` 表示执行过程中某个动作因为风险级别、权限边界或项目策略而进入待确认状态。

审批不是独立流程，而是执行流程中的**治理节点**。

### 6.2 核心语义

每个 `ApprovalRequest` 必须明确：

- 请求主体是谁
- 依附于哪个 `ExecutionRun`
- 请求执行什么动作
- 为什么需要审批（风险级别）
- 谁有权审批
- 审批结果是什么

### 6.3 ApprovalRequest 状态机

| 状态 | 说明 |
|------|------|
| `pending` | 待审批 |
| `approved` | 已批准 |
| `rejected` | 已拒绝 |
| `expired` | 超时未处理 |
| `cancelled` | 已取消（发起方撤销）|

### 6.4 审批设计原则

- 写操作默认进入审批
- 高风险动作必须审批
- 审批按**动作级别**定义，不按“成员是谁”一刀切
- 一个 `ExecutionRun` 允许存在多个 `ApprovalRequest`（多审批门）
- 审批结果驱动 ExecutionRun 状态（approved → running，rejected → failed）

### 6.5 审批与执行的联动

| 审批结果 | ExecutionRun 状态变化 |
|---------|----------------------|
| `approved` | `pending_approval → running`，继续执行 |
| `rejected` | `pending_approval → failed`，记录拒绝原因 |
| `expired` | 按项目策略（保持等待或转 failed）|
| `cancelled` | 执行恢复或终止 |

### 6.6 最小字段建议

- `id`
- `executionRunId`
- `projectId`
- `taskId`
- `requestedAction`
- `riskLevel`（read / write / high-risk）
- `reason`
- `status`
- `approverPolicy`（谁有权审批）
- `approvedBy` / `rejectedBy`
- `requestedAt`
- `resolvedAt`
- `resolutionNote`

## 7. ExecutionStep 执行步骤

### 7.1 定义

`ExecutionStep` 表示一次执行中的可追踪步骤。

每一步可以是：

- 计划生成
- 上下文读取
- 工具调用
- 审批请求
- 结果写回
- 失败记录

### 7.2 设计原则

- 步骤日志应偏**结构化**，不只是一段长文本
- 步骤粒度不应细到每个 token，也不应粗到整个执行只有一条记录
- 审批请求应能关联到触发它的步骤
- 步骤记录支撑执行回放

### 7.3 最小字段建议

- `id`
- `executionRunId`
- `stepType`
- `toolName`
- `status`
- `startedAt`
- `completedAt`
- `inputSummary`
- `outputSummary`
- `errorSummary`

## 8. 产物、证据与结果

### 8.1 ExecutionArtifact（产物）

执行产出的对象，例如：

- 执行计划
- 代码 patch
- 测试报告
- 风险摘要
- 日报周报

### 8.2 ExecutionEvidence（证据）

用于支持执行结果的证据，例如：

- Git diff 摘要
- 命令输出摘要
- 测试结果
- 日志片段
- 外部同步结果

### 8.3 ExecutionOutcome（结果归纳）

一次执行最终的结果归纳：

- 是否完成目标
- 产生了哪些交付物
- 还剩哪些未完成项
- 是否建议继续下一次执行

### 8.4 设计原则

- Artifact 与 Evidence 分离：产物是「做出来了什么」，证据是「凭什么说做出来了」
- 结果回写以系统注释形式进入 Task 评论流（见 Task 第 13 章）
- 产物与证据支撑执行回放

## 9. 失败、重试与接管

### 9.1 失败分类

执行失败必须被明确记录，建议区分：

- 权限失败
- 审批拒绝
- 工具调用失败
- 上下文不足
- 外部依赖失败
- 逻辑失败

失败原因记录到 `ExecutionRun.failureReason`，对齐 Core 错误模型。

### 9.2 重试

- 平台允许在同一任务下创建**新的** `ExecutionRun` 作为重试，不粗暴复用旧执行
- 重试时应保留：
  - 原失败原因
  - 继承或重建的上下文（可复用原 `contextSnapshotId`）
  - 与上一次执行的关联关系（旧执行标记为 `superseded`）

### 9.3 接管（Takeover）

当 AI 执行异常、停滞或需要人工介入时，支持人类接管。

接管至少应记录：

- 接管人
- 接管时间
- 接管原因
- 原执行状态

## 10. 权限模型

> 与 [[角色级权限模型-v1|角色-等级-权限模型]] 对齐。

### 10.1 执行相关权限

执行权限不是独立的 read/write/high-risk，而是嵌入在各业务动作的风险分级中：

- 任务写操作（Task）→ 触发审批
- Git 写操作（Git）→ 触发审批
- 命令执行（Runtime）→ 触发审批
- 外部写操作（Integration）→ 触发审批

### 10.2 审批权限

| 审批能力 | Owner | Maintainer | Contributor | Viewer | 外部 Agent |
|---------|:-----:|:----------:|:-----------:|:------:|:---------:|
| 审批 AI 写操作 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 取消执行 | ✅ | ✅ | 自己发起的 | ❌ | ❌ |
| 接管执行 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 查看执行历史 | ✅ | ✅ | ✅ | ✅ | ✅（项目内）|

### 10.3 权限决策规则

- AI 成员默认不作为最终审批人（必须人类审批）
- 所有执行必须可追溯到 `projectId` / `taskId` / `executionRunId`
- 执行边界受项目 `ProjectRuntimePolicy` 约束
- 审批按动作风险分级，不按成员身份一刀切

## 11. AI 协作能力

> Execution 定义 AI 执行对象的需求语义，是 AI 协作的对象层规范。

### 11.1 Execution 在 AI 协作中的角色

- ExecutionRun 是 AI 围绕任务执行的**载体对象**
- ApprovalRequest 是 AI 写操作的**治理节点**
- ContextPackSnapshot 是 AI 执行的**上下文快照**（不可篡改）
- Artifact / Evidence 是 AI 执行的**结果沉淀**

### 11.2 与 AI Hub 的边界

- **Execution 模块**：定义执行对象的语义（状态机、字段、治理规则）
- **AI Hub 模块**：编排执行对象（创建、派发、状态流转驱动、上下文策展）

Execution 是「规格」，AI Hub 是「引擎」。

### 11.3 Execution 不承载的能力

- 不创建或派发执行（由 AI Hub）
- 不执行本地命令（由 Runtime）
- 不策展上下文（由 AI Hub）
- 不做权限决策（由 Project 权限模型）

## 12. 审计与回放

### 12.1 审计最小要求

每次执行至少应可追溯到：

- `projectId` / `taskId` / `executionRunId`
- `subjectType` / `subjectId` / `identitySource`
- `approvalRequestIds`
- `contextSnapshotId`
- 完整的 ExecutionStep 链路

审计通过 Core 统一审计入口，不可篡改（见 Core 第 6 章）。

### 12.2 回放目标

回放不是为了重现 token 级细节，而是为了回答：

- 这个执行是怎么开始的
- 期间做了哪些关键步骤
- 哪些动作被审批、批准或拒绝
- 最终产出了什么
- 为什么成功或失败

回放基于不可篡改的 `ContextPackSnapshot` 与 ExecutionStep 链路还原。

## 13. 事件与通知

> 执行事件由 AI Hub 发布（见 AI Hub 第 11 章），Execution 模块定义事件涉及的对象语义。

### 13.1 执行相关领域事件

执行事件清单见 [[Feat010-AIHub-人工智能|AI Hub 第 11 章]]，包括：

- `execution.created` / `dispatched` / `running`
- `execution.pending_approval` / `approval_resolved`
- `execution.completed` / `failed` / `cancelled` / `blocked`

### 13.2 Execution 与事件的关系

- Execution 定义事件涉及的对象（ExecutionRun 状态变化、ApprovalRequest 状态变化）
- AI Hub 负责发布这些事件
- Notification 消费这些事件分发通知

## 14. 核心功能需求

### FR-EX-01 ExecutionRun 建模

Execution 模块必须定义 ExecutionRun 的完整需求语义：

- 9 个状态的状态机
- 合法流转规则
- 终态不可回退
- 完整字段集

### FR-EX-02 ApprovalRequest 审批治理

Execution 模块必须定义 ApprovalRequest 的需求语义：

- 5 个状态的状态机
- 动作级风险分级审批
- 多审批门支持
- 审批结果驱动执行状态

### FR-EX-03 ExecutionStep 步骤记录

Execution 模块必须定义 ExecutionStep 的需求语义：

- 结构化步骤记录
- 步骤与审批的关联
- 步骤支撑回放

### FR-EX-04 产物与证据沉淀

Execution 模块必须定义：

- ExecutionArtifact（产物）的语义
- ExecutionEvidence（证据）的语义
- ExecutionOutcome（结果归纳）的语义
- 产物与证据分离原则

### FR-EX-05 失败分类与重试

Execution 模块必须定义：

- 6 类失败分类
- 重试语义（新 ExecutionRun，旧执行 superseded）
- 重试上下文继承

### FR-EX-06 人类接管

Execution 模块必须定义：

- 接管语义（Takeover）
- 接管记录（接管人、时间、原因、原状态）

### FR-EX-07 审计与回放

Execution 模块必须定义：

- 执行审计最小要求
- 回放目标与基于快照的还原
- 审计不可篡改

## 15. 数据模型要求

> 与 [[执行审批模型-v1|执行与审批模型]] 和 [[运行时数据模型-v1|Runtime 数据模型]] 对齐。

### 15.1 核心对象

| 对象 | 用途 |
|------|------|
| `ExecutionRun` | 执行实例 |
| `ApprovalRequest` | 审批请求 |
| `ExecutionStep` | 执行步骤 |
| `ExecutionArtifact` | 执行产物 |
| `ExecutionEvidence` | 执行证据 |
| `ExecutionOutcome` | 执行结果归纳 |

### 15.2 关系建议

- `Task 1 - N ExecutionRun`
- `ExecutionRun 1 - N ExecutionStep`
- `ExecutionRun 1 - N ApprovalRequest`
- `ExecutionRun 1 - 1 ContextPackSnapshot`（主要快照）
- `ExecutionRun 1 - N ExecutionArtifact`
- `ExecutionRun 1 - N ExecutionEvidence`
- `ExecutionRun 1 - 1 ExecutionOutcome`（结果归纳）
- `ApprovalRequest 1 - 1 ExecutionStep`（触发它的步骤，可选）

## 16. Phase 1 鞠目标

Execution 模块在 Phase 1 暂不要求：

- 跨项目长生命周期执行编排
- 多 Agent 联合作业调度
- 平台内 AI 成员晋升体系联动
- 复杂执行编排引擎
- 并行执行（同一任务多个并行 ExecutionRun）
- 批量动作审批

## 17. GWT 验收场景

### 17.1 正常流：执行闭环

```
Given 外部 Agent 围绕任务创建执行
When 执行经过审批门并最终完成
Then 平台记录完整的 ExecutionRun、Step、ApprovalRequest 链路
  And 结果以 Artifact / Evidence / Outcome 沉淀
  And 可通过 executionRunId 回放
```

### 17.2 异常流：审批拒绝

```
Given 执行中触发高风险写操作的审批
When 审批被拒绝
Then ExecutionRun 进入 failed 状态
  And 拒绝原因记录到 failureReason
  And 历史步骤与审批记录保留
```

### 17.3 边界流：多审批门

```
Given 一次执行涉及多次写操作
When 执行过程中触发多个 ApprovalRequest
Then 每个审批门独立处理
  And 拒绝其一不影响已通过部分
  And 审批历史完整保留可回放
```

### 17.4 失败与重试

```
Given 一个执行失败（工具调用失败）
When 项目经理触发重试
Then 创建新的 ExecutionRun
  And 旧执行标记为 superseded（保留审计）
  And 新执行可复用原上下文快照
```

### 17.5 人类接管

```
Given AI 执行停滞或异常
When 人类项目经理接管
Then 记录接管人、时间、原因、原状态
  And 执行进入人类可控状态
```

### 17.6 回放

```
Given 一个已完成的执行
When 按 executionRunId 回放
Then 系统展示步骤链路、审批轨迹、上下文快照、产物证据
  And 回放数据不可篡改
```

### 17.7 阻塞与恢复

```
Given 执行因 Runtime 离线进入 blocked
When Runtime 恢复
Then 执行可重新派发（blocked → dispatched）
  And 阻塞期间不丢失执行记录
```

## 18. 待确认问题

1. `ExecutionRun` 是否允许一个任务同时存在多个并行执行（Phase 1 列为非目标，需确认）
2. `ApprovalRequest` 是否需要支持批量动作审批（Phase 1 列为非目标）
3. `ExecutionArtifact` 与业务实体（Task/Project）的绑定粒度
4. 接管（Takeover）后原 AI 主体的执行权限是否自动暂停
5. 重试复用原上下文快照的新鲜度权衡（Phase 1 允许复用，需确认）
