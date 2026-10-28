---
title: "Task 模块需求说明"
description: 定义 Task 模块在 v2 平台化路线下的职责、任务类型、状态机、依赖、权限、AI 协作契约与 Phase 1 验收标准
category: requirement
status:
  - active
tags:
  - Task
  - Feature
  - requirements
  - execution
version: 2.1.0
created: 2026-05-29 05:54:10
modified: 2026-07-16 04:22:34
projects: "[[APM-项目中心]]"
---

# Task 模块需求说明

## 1. 模块定位

在 v2 路线下，Task 模块不再只是“任务列表 + 看板 + 拖拽状态”的传统项目管理子模块。

Task 模块的核心定位是：

> 平台中围绕任务组织人类协作、AI 执行、审批治理和结果回写的主执行载体。

Task 模块是以下能力的汇聚点：

- 人类项目经理定义工作目标
- 外部 AI 工具围绕任务读取上下文并执行
- 平台围绕任务记录 `ExecutionRun`
- 写操作围绕任务进入 `ApprovalRequest`
- 结果、证据和失败围绕任务沉淀

## 2. 模块目标

### 2.1 第一目标

提供可用的任务管理底盘：

- 任务创建
- 任务详情
- 状态流
- 迭代归属
- 成员指派
- 任务类型与依赖

### 2.2 第二目标

让任务成为 AI 协作和执行的主线对象，而不是只服务于人类页面操作。

### 2.3 第三目标

让任务天然承载：

- 上下文
- 执行
- 审批
- 回放
- 审计
- 协作

## 3. 模块依赖

### 3.1 依赖模块

- [Feat001-Core-核心](Feat001-Core-核心.md)
- [Feat002-Project-项目管理](Feat002-Project-项目管理.md)
- [Feat004-Team-团队](Feat004-团队.md)
- [Feat013-Auth-登录注册](Feat013-Auth-登录注册.md)

### 3.2 被依赖模块

- [Feat010-AIHub-人工智能](Feat010-AIHub-人工智能.md)
- [Feat006-Notification-消息中心](Feat006-Notification-消息.md)
- [Feat005-Git-版本管理](Feat005-Git-版本管理.md)
- [Feat009-Integration-外部链接](Feat009-Integration-外部链接.md)

## 4. Phase 1 范围

Phase 1 中，Task 模块必须先服务：

- 人类项目经理
- 外部 AI 开发工具

Task 模块在 Phase 1 的成功标准不是做出复杂任务系统，而是让任务成为以下闭环的中心：

1. 创建任务
2. 分配执行主体
3. 读取结构化上下文
4. 创建执行
5. 进入审批
6. 回写结果

Phase 1 必须交付：任务类型体系、基础依赖、1 层子任务、列表/看板视图、任务评论、AI 协作契约。

## 5. 核心职责

### 5.1 任务主数据管理

Task 模块负责维护任务本体：

- 标题
- 描述
- 任务类型（type）
- 状态（status）
- 优先级（priority）
- 负责人
- 归属项目
- 归属迭代
- 关联标签（labels）
- 截止日期（dueDate）
- 预估工时（estimate）

### 5.2 任务执行管理

Task 模块负责围绕任务接入执行模型：

- 任务可以绑定一个或多个 `ExecutionRun`
- 任务可以关联一个或多个 `ApprovalRequest`
- 任务需要展示执行历史与结果

### 5.3 任务上下文入口

Task 模块应为外部 Agent 提供任务级结构化上下文入口，而不是让 Agent 解析前端页面。

任务上下文至少应包含：

- 任务基本信息
- 归属项目摘要
- 当前迭代信息
- 相关 Git / Terminal 上下文引用
- 依赖与阻塞任务
- 最近活动
- 当前约束与审批策略

详细契约见 [第 11 章 AI 协作能力](#11-ai-协作能力)。

### 5.4 任务结果沉淀

Task 模块负责承接：

- 执行产物摘要
- 执行证据引用
- 最终结果状态
- 失败原因与重试入口

### 5.5 任务协作

Task 模块负责承载围绕任务的协作信息：

- 任务活动流（系统记录 + 人类操作）
- 任务评论（人类讨论 + AI 系统注释）
- @提及与通知触发

## 6. 任务类型体系

> 与 [[上下文管理设计|上下文管理系统设计]] 的 Layer 2 配方匹配呼应。任务类型驱动默认状态机、上下文配方、视图分组和统计。

### 6.1 内置任务类型

Phase 1 至少支持以下类型：

| 类型 | 说明 | 典型场景 |
|------|------|---------|
| `bug` | 缺陷修复 | 线上问题、测试缺陷 |
| `feature` | 功能开发 | 新功能、需求实现 |
| `task` | 通用任务 | 常规工作、配置、文档 |
| `epic` | 史诗 | 跨迭代的大型目标，作为子任务的父级 |

### 6.2 类型与状态机的联动

不同类型可配置不同的默认状态机，但 Phase 1 先使用统一基础状态机（见 [第 7 章](#7-任务状态机)），类型仅影响：

- 默认上下文配方（bug → `bug_fix` 配方，feature → `feature` 配方）
- 默认字段预设（bug 默认带复现步骤字段，feature 默认带需求文档引用）
- 看板默认分组
- 统计维度

### 6.3 epic 与子任务

- `epic` 作为父级，可包含多个子任务（task/feature/bug）
- 子任务进度汇入 epic 进度
- epic 不直接进入执行，其子任务才是执行对象

### 6.4 类型扩展

- 任务类型应可扩展，不锁定固定枚举
- 支持项目级自定义类型（Phase 2 增强）

## 7. 任务状态机

### 7.1 基础状态定义

| 状态 | 说明 | 可编辑 | 接收执行 | 进入审批 |
|------|------|--------|---------|---------|
| `backlog` | 待办池，未排期 | 是 | 否 | - |
| `todo` | 已排期，待开始 | 是 | 是 | - |
| `in_progress` | 进行中 | 是 | 是 | 是 |
| `in_review` | 评审中 | 是 | 是 | 是 |
| `done` | 已完成 | 受限 | 否 | - |
| `cancelled` | 已取消 | 受限 | 否 | - |
| `blocked` | 阻塞（横向状态）| 是 | 否 | - |

### 7.2 状态流转规则

```
backlog → todo → in_progress → in_review → done
                      ↓ ↑              ↓
                   blocked         cancelled
```

- `backlog → todo`：排入迭代或分配时
- `todo → in_progress`：开始执行（人类或 AI）
- `in_progress ↔ in_review`：提交评审 / 退回修改
- `in_progress / in_review → done`：完成
- `* → cancelled`：任何状态可取消（需权限）
- `todo / in_progress / in_review → blocked`：阻塞为横向状态，可回到原状态
- `done` 终态：默认不可回退， reopen 需显式操作并记录原因

### 7.3 状态与能力的联动

- `done` / `cancelled` 状态下，停止 AI 执行派发与自动提醒
- `blocked` 状态下，触发阻塞通知与阻塞风险计数
- 状态变更必须进入任务活动记录，不可篡改历史记录
- AI 主体修改状态按风险分级进入审批（见 [第 10 章](#10-任务权限)）

## 8. 依赖与子任务

> Phase 1 交付基础依赖 + 1 层 parent/subtask。复杂子任务树列为非目标。

### 8.1 任务依赖

Task 模块必须支持任务间依赖关系：

- **blocked by**：本任务被另一任务阻塞，依赖任务完成后才能开始
- **blocking**：本任务阻塞其他任务

依赖关系规则：

- 依赖任务未完成时，本任务标记为依赖阻塞（区别于手动 blocked）
- 禁止循环依赖（A blocked by B，B blocked by A），创建时校验
- 禁止自依赖
- 依赖关系进入任务上下文，供 AI 执行参考

### 8.2 子任务（parent / subtask）

Phase 1 支持 1 层父子关系：

- `epic` 或任意任务可作为父任务，包含子任务
- 子任务只允许 1 层（子任务不能再有子任务），避免复杂树
- 子任务状态汇入父任务进度（完成率）
- 父任务可折叠展示子任务
- 子任务独立归属项目和迭代（可与父任务不同迭代）

### 8.3 非目标（依赖与子任务）

- 多层子任务树
- 跨项目依赖
- 自动化依赖触发（A 完成自动启动 B，列为 Phase 2）

## 9. 优先级体系

### 9.1 优先级定义

Phase 1 采用 5 级优先级（对标 Linear）：

| 优先级 | 说明 | 语义 |
|--------|------|------|
| `urgent` | 紧急 | 立即处理，阻塞其他工作 |
| `high` | 高 | 当前迭代重点 |
| `medium` | 中 | 正常推进 |
| `low` | 低 | 有空再做 |
| `none` | 无优先级 | 未评估 |

### 9.2 优先级与排序

- 列表/看板默认按优先级降序
- 优先级影响 AI 执行派发顺序
- 优先级变更进入活动记录

## 10. 任务权限

> 与 [[Feat002-Project-项目管理|Project 权限模型]] 和 [[角色级权限模型-v1|角色-等级-权限模型]] 对齐。任务权限受项目成员角色约束。

### 10.1 任务级权限矩阵（Phase 1）

任务权限继承自成员在所属项目中的角色（见 Project 第 8 章）：

| 能力 | Owner | Maintainer | Contributor | Viewer | 外部 Agent（受审批） |
|------|:-----:|:----------:|:-----------:|:------:|:-------------------:|
| 查看任务 | ✅ | ✅ | ✅ | ✅ | ✅（项目内）|
| 创建任务 | ✅ | ✅ | ✅ | ❌ | 审批后 |
| 编辑任务信息 | ✅ | ✅ | ✅（自己的）| ❌ | 审批后 |
| 变更状态 | ✅ | ✅ | ✅（自己的）| ❌ | 按风险审批 |
| 分配/改派 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 删除任务 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 添加评论 | ✅ | ✅ | ✅ | ✅ | 系统注释 |
| 审批 AI 写操作 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 创建执行 | ✅ | ✅ | ✅ | ❌ | 审批后 |
| 修改依赖/子任务 | ✅ | ✅ | ✅（自己的）| ❌ | 审批后 |

### 10.2 外部 Agent 的任务权限

外部 Agent 的任务操作受双重约束：

1. **项目级角色映射**（见 Project 第 8.4 节）
2. **任务级风险审批**（见 [[角色级权限模型-v1|角色-等级-权限模型]] 第 8 章）

风险分级：

- 更新任务状态（低风险）：可按项目策略决定是否审批
- 写回任务结果（中风险）：默认审批
- 创建任务 / 修改依赖（高风险）：必须审批
- 删除任务：禁止（AI 不可删除任务）

### 10.3 权限决策规则

- 任务必须归属于项目，无项目外任务
- 任务权限取成员项目角色与任务级规则的最严格交集
- `done` / `cancelled` 任务编辑受限， reopen 需 Maintainer+ 权限
- 外部 Agent 写操作必须可追溯到 `taskId` 与 `executionRunId`

## 11. AI 协作能力

> 本章定义 AI 主体如何使用 Task 模块。Task 是平台执行主线载体，AI 协作契约比 Project 更核心。

### 11.1 AI 对任务的访问契约

#### 11.1.1 读取（read）

AI 主体可读取：

- 任务基本信息与描述
- 任务类型、状态、优先级
- 归属项目摘要（通过 `ContextPack.project`）
- 当前迭代信息
- 依赖与阻塞任务（ID + 标题 + 状态）
- 子任务列表（若为父任务）
- 最近活动与评论
- 历史执行记录摘要
- 当前审批策略与约束

#### 11.1.2 写入（write，受审批约束）

AI 主体在权限与审批约束下可：

- 更新任务状态（按风险分级）
- 写回执行结果与产物引用（中风险，默认审批）
- 添加系统评论（执行结果、失败原因）
- 创建子任务（高风险，审批）
- 发起审批请求

#### 11.1.3 禁止（forbidden）

AI 主体在 Phase 1 禁止：

- 删除任务
- 分配 / 改派任务（人类职责）
- 修改任务优先级（人类职责）
- 变更依赖关系（审批后除外）
- 修改任务归属项目 / 迭代

### 11.2 任务级 ContextPack 契约

Task 模块必须输出符合 [[上下文管理设计|上下文管理系统设计]] Layer 2 任务层规范的任务上下文包。

`ContextPack.task` 至少包含：

```
task:
  id
  identifier          # 如 APM-142
  title
  description        # 摘要（按配方压缩：full/summary/reference）
  type               # bug/feature/task/epic
  status
  priority
  assignee:          # 指派对象摘要
    type             # human/platform_ai_member/external_agent
    id
    mappedRole
    mappedLevel
  projectId
  iterationId        # 当前迭代
  parentId           # 若为子任务
  dependencies:      # 依赖关系
    blockedBy:       # [{id, title, status}]
    blocking:        # [{id, title, status}]
  subtasks:          # 若为父任务 [{id, title, status}]
  labels:            # 标签
  dueDate
  estimate
  constraints:       # 任务级约束（如：必须与 v1 共存）
  recentActivity:    # 最近活动摘要（≤5 条）
  approvalPolicy:    # 当前审批策略
  latestExecution:   # 最近执行摘要
    id, status, resultSummary
```

### 11.3 任务执行生命周期（AI 视角）

| 阶段 | AI 动作 | 平台动作 |
|------|---------|---------|
| 接收 | 读取 `ContextPack.task` | 打包上下文，记录快照 |
| 执行 | 创建 `ExecutionRun`，读取扩展上下文（Layer 4） | 记录执行，绑定上下文快照 |
| 写操作 | 提交状态变更 / 结果回写 | 进入 `ApprovalRequest` |
| 审批等待 | 暂停执行 | 通知审批人 |
| 完成 | 回写最终结果、产物、证据 | 更新任务状态，记录活动 |
| 失败 | 回写失败原因，可选重试 | 记录失败，提供重试入口 |

### 11.4 任务上下文的按配方组装

Task 模块与 AI Hub 协作，按任务类型匹配上下文配方：

| 任务类型 | 配方 | Layer 2 重点 |
|---------|------|-------------|
| `bug` | `bug_fix` | 错误描述 + 复现步骤 + 日志片段 |
| `feature` | `feature` | 需求 + API 契约 + 设计文档引用 |
| `task` | `default` | 任务基础信息 |
| `epic` | `default` | 子任务清单 + 整体目标 |

PM 可手动指定配方覆盖自动匹配。

### 11.5 任务执行边界约束

- 任务执行必须绑定 `projectId` 与 `executionRunId`
- AI 可访问的工作区、Provider 受项目 `ProjectRuntimePolicy` 约束
- 任务上下文快照（`contextSnapshotId`）不可篡改，作为审计依据
- 跨任务读取需显式授权，禁止隐式跨任务数据访问

## 12. 任务视图、分组、过滤与排序

> 对标 Linear。Phase 1 交付列表视图与看板视图。

### 12.1 视图类型

| 视图 | Phase 1 | 说明 |
|------|---------|------|
| 列表视图 | ✅ | 任务平铺列表，支持列配置 |
| 看板视图 | ✅ | 按状态/优先级/负责人分组的卡片看板 |
| 日历视图 | Phase 2 | 按 dueDate 展示 |
| 甘特视图 | Phase 2 | 依赖关系与时间线 |

### 12.2 分组（group by）

- 按状态、优先级、负责人、标签、类型、迭代分组
- 看板列由分组字段决定

### 12.3 过滤（filter）

- 按状态、优先级、负责人、标签、类型、迭代、是否阻塞过滤
- 支持组合条件（AND）
- Phase 2 增强复杂条件

### 12.4 排序（sort）

- 按创建时间、更新时间、优先级、状态、dueDate 排序
- 看板内支持手动拖拽排序（sortOrder 字段）

### 12.5 保存视图（saved view）

- 支持保存「分组 + 过滤 + 排序」组合为命名视图
- 项目级共享视图与个人视图
- 「我的任务」视图：当前用户在所有项目中被分配的任务聚合

### 12.6 批量操作

Phase 1 支持基础批量操作：

- 批量改状态
- 批量分配 / 改派
- 批量移入迭代
- 批量加标签
- 批量改优先级

## 13. 评论与协作

> Phase 1 支持任务评论。明确评论是任务协作的一部分，不是「聊天中心」。

### 13.1 评论类型

| 类型 | 说明 | 来源 |
|------|------|------|
| 人类评论 | 讨论实现方案、反馈、@提及 | 项目成员 |
| 系统注释 | AI 执行结果回写、状态变更摘要、审批结果 | 平台 / AI |

### 13.2 评论能力

- 任务详情页展示评论流（时间顺序）
- 支持 @提及项目成员，触发通知
- 支持回复（单层引用，不做嵌套讨论）
- 支持编辑 / 删除自己的评论（系统注释不可删除）
- 评论进入任务活动记录

### 13.3 AI 评论（系统注释）

AI 执行结果自动作为系统注释写入任务：

- 执行完成：结果摘要 + 产物引用
- 执行失败：失败原因 + 重试入口
- 审批结果：审批通过 / 拒绝摘要

系统注释以特殊样式与人类评论区分。

### 13.4 评论边界（非目标）

- 不做富文本编辑器（Phase 1 纯文本 + Markdown）
- 不做嵌套讨论（避免演变为聊天）
- 不做评论 reactions（Phase 2）

## 14. 任务级事件与通知

> 与 [[Feat001-Core-核心|Core 模块事件总线]] 和 [[Feat006-Notification-消息中心|Notification 模块]] 对齐。

### 14.1 任务级领域事件

Task 模块必须发布以下领域事件：

| 事件 | 触发时机 | 典型订阅方 |
|------|---------|-----------|
| `task.created` | 任务创建 | Notification、AI Hub |
| `task.updated` | 任务信息变更 | Notification |
| `task.status_changed` | 状态流转 | Notification、自动化 |
| `task.assigned` | 分配 / 改派 | Notification（被指派人）|
| `task.iteration_changed` | 移入 / 移出迭代 | Notification |
| `task.priority_changed` | 优先级变更 | Notification |
| `task.dependency_changed` | 依赖关系变更 | Notification、阻塞检测 |
| `task.commented` | 新评论 / 系统注释 | Notification（@提及人）|
| `task.blocked` | 进入 blocked 状态 | Notification、风险计数 |
| `task.execution_created` | 创建 ExecutionRun | AI Hub、审计 |
| `task.execution_completed` | 执行完成 | Notification、活动流 |
| `task.execution_failed` | 执行失败 | Notification、重试入口 |

### 14.2 通知订阅

- 任务负责人默认订阅任务事件
- 任务创建者默认订阅
- 被 @提及的成员订阅相关评论
- 评论参与者订阅后续评论
- 支持手动订阅 / 取消订阅单个任务

### 14.3 阻塞与依赖通知

- 任务进入 blocked 时通知负责人与项目经理
- 依赖任务完成时通知被阻塞任务负责人（可解除阻塞）
- 阻塞超过阈值（如 24h）触发升级通知

## 15. 核心功能需求

### FR-TK-01 任务创建与编辑

Task 模块必须支持：

- 创建任务（含类型选择）
- 编辑任务基本信息
- 更新任务状态
- 指定迭代
- 指定执行主体
- 设置优先级、dueDate、标签

任务最小字段建议：

- `title`
- `description`
- `type`
- `projectId`
- `iterationId`
- `status`
- `priority`
- `assigneeType`
- `assigneeId`
- `dueDate`
- `labels`
- `estimate`
- `parentId`
- `sortOrder`

### FR-TK-02 任务状态流

Task 模块必须支持完整任务状态机：

- 7 个状态（backlog / todo / in_progress / in_review / done / cancelled / blocked）
- 合法流转规则校验
- 状态与执行派发、通知的能力联动
- 状态变更进入活动记录与审计
- `done` 任务 reopen 需显式操作

### FR-TK-03 任务与迭代绑定

Task 模块必须支持任务归属到某个迭代。

说明：

- 迭代是 Phase 1 必须交付能力
- 外部 Agent 的执行上下文应包含任务所处迭代

### FR-TK-04 任务分配给外部 Agent

Task 模块必须支持将任务分配给外部 Agent。

Phase 1 首批支持：

- Codex
- Claude Code

分配后，任务应至少记录：

- `assigneeType = external_agent`
- `subjectId`
- `identitySource = cli`
- `mappedRole`
- `mappedLevel`

### FR-TK-05 任务级执行

Task 模块必须支持围绕任务创建 `ExecutionRun`。

每次执行至少应绑定：

- `taskId`
- `projectId`
- `subjectType`
- `subjectId`
- `contextSnapshotId`
- `status`

### FR-TK-06 任务级审批

Task 模块必须支持围绕任务发起和展示 `ApprovalRequest`。

Phase 1 中：

- 写操作默认审批
- 高风险动作必须审批
- 任务详情页应能看到审批状态
- AI 操作按风险分级（低/中/高）配置审批策略

### FR-TK-07 任务级结果回写

Task 模块必须支持将执行结果回写到任务。

回写内容包括：

- 执行状态
- 结果摘要
- 产物引用
- 证据引用
- 失败原因
- 回写以系统注释形式进入评论流

### FR-TK-08 任务活动与审计

Task 模块必须维护任务活动流，至少记录：

- 状态变更
- 分配变更
- 优先级变更
- 依赖关系变更
- 执行创建
- 审批请求
- 审批结果
- 执行完成 / 失败
- 评论（摘要）

活动记录要求：

- 记录 actor（类型 + ID）、action、变更前后值、时间戳
- 不可篡改，仅可追加
- 支持按时间和类型检索

### FR-TK-09 任务视图

Task 模块在 Phase 1 保持基础视图可用：

- 列表视图
- 看板视图
- 任务详情视图

说明：

- 复杂甘特和高级分析不作为 Phase 1 必需项
- 任务详情页优先承载执行和审批信息
- 支持保存视图与「我的任务」聚合视图

### FR-TK-10 任务依赖与子任务

Task 模块必须支持（Phase 1）：

- blocked by / blocking 依赖关系
- 循环依赖校验
- 1 层 parent / subtask 关系
- 子任务进度汇入父任务
- 依赖关系进入任务上下文

### FR-TK-11 任务类型体系

Task 模块必须支持（Phase 1）：

- 内置类型（bug / feature / task / epic）
- 类型驱动默认上下文配方
- 类型驱动默认字段预设
- 类型作为分组与统计维度

### FR-TK-12 评论与协作

Task 模块必须支持（Phase 1）：

- 人类评论（含 @提及）
- AI 系统注释（执行结果回写）
- 评论回复（单层引用）
- 评论进入活动记录与通知

### FR-TK-13 任务级事件与通知

Task 模块必须（Phase 1）：

- 发布任务级领域事件（见 [第 14 章](#14-任务级事件与通知)）
- 接入 Notification 模块
- 阻塞与依赖通知
- 订阅偏好配置

### FR-TK-14 批量操作

Task 模块必须支持（Phase 1）：

- 批量改状态 / 优先级
- 批量分配 / 改派
- 批量移入迭代 / 加标签

### FR-TK-15 AI 协作能力

Task 模块必须支持：

- AI 主体按契约读取任务上下文（`ContextPack.task`）
- AI 主体受审批约束写入
- 按任务类型匹配上下文配方
- 任务执行生命周期管理
- 任务执行边界校验与审计

## 16. 任务主体模型

### 16.1 人类主体

任务支持分配给人类成员：

- 项目经理
- 开发工程师
- 测试工程师
- 架构 / 评审角色

### 16.2 AI 主体

任务支持分配给 AI 主体，但 Phase 1 只先服务外部接入 Agent。

Task 模块必须显式区分：

- `human`
- `platform_ai_member`
- `external_agent`

Phase 1 中优先使用：

- `external_agent`

### 16.3 主体变更规则

- 任务改派需权限（Maintainer+，见 [第 10 章](#10-任务权限)）
- 改派进入活动记录与通知
- AI 主体改派后，原执行可保留历史，新执行归属新主体

## 17. 与执行模型的关系

Task 模块与以下对象强关联：

- `ExecutionRun`
- `ApprovalRequest`
- `ContextPack`
- `ExecutionArtifact`
- `ExecutionEvidence`

在 v2 路线下，Task 模块应作为这些对象的主要业务挂载点。

## 18. 数据模型要求

> 与 [[数据模型-Project|Project / Task 主线模型]] 对齐。

### 18.1 Task 实体

在现有模型基础上，Task 实体至少需要支持以下字段：

- `id`
- `identifier`（编号，如 APM-142）
- `projectId`
- `iterationId`
- `parentId`（子任务父级，1 层）
- `title`
- `description`
- `type`（bug / feature / task / epic）
- `status`
- `priority`
- `assigneeType`
- `assigneeId`
- `labels`
- `dueDate`
- `estimate`
- `sortOrder`
- `latestExecutionId`
- `latestApprovalStatus`
- `executionSummary`
- `createdAt`
- `updatedAt`

说明：

- 旧的 `aiExecutionSpec / aiExecutionStatus / aiExecutionResult` 可作为迁移资产参考
- v2 更推荐使用统一的 `ExecutionRun` 关联模型，而不是把执行状态全部塞进任务主表

### 18.2 建议实体

| 实体 | 用途 |
|------|------|
| `Task` | 任务主实体 |
| `TaskActivity` | 任务活动流 |
| `TaskDependency` | 任务依赖关系（blocked by） |
| `TaskComment` | 任务评论与系统注释 |
| `TaskLabel` | 任务标签（或复用通用 Label） |
| `SavedView` | 保存的视图配置（与 Project 共用） |

### 18.3 TaskDependency 模型建议

```
TaskDependency:
  id
  taskId           # 本任务
  blockedById      # 阻塞本任务的任务 ID
  createdAt
  createdBy
```

### 18.4 TaskComment 模型建议

```
TaskComment:
  id
  taskId
  type             # human / system
  authorType       # human / platform_ai_member / external_agent
  authorId
  body
  parentCommentId  # 单层引用回复
  mentions         # @提及的用户 ID 列表
  createdAt
  updatedAt
```

### 18.5 关系建议

- `Project 1 - N Task`
- `Iteration 1 - N Task`
- `Task 1 - N Task`（parent / subtask，1 层）
- `Task N - N Task`（通过 TaskDependency，blocked by）
- `Task 1 - N TaskActivity`
- `Task 1 - N TaskComment`
- `Task 1 - N ExecutionRun`
- `ExecutionRun 1 - N ApprovalRequest`

## 19. Phase 1 非目标

Task 模块在 Phase 1 暂不要求：

- 复杂子任务树（多层嵌套）
- 大规模外部同步
- 全功能甘特图
- 日历视图与表格视图
- 平台内 AI 成员生命周期联动
- 多 Agent 协同调度
- 跨项目依赖
- 自动化依赖触发（A 完成自动启动 B）
- 富文本评论编辑器与评论 reactions
- 嵌套评论讨论

## 20. GWT 验收场景

### 20.1 正常流：AI 执行闭环

```
Given 人类项目经理创建了一个任务并将其分配给外部 Agent
When Runtime 获取任务上下文并创建 ExecutionRun
Then 平台应记录执行、审批和结果回写链路
  And 结果以系统注释回写到任务评论流
```

### 20.2 异常流：审批拒绝

```
Given 外部 Agent 尝试执行需要审批的写操作
When 审批未通过
Then 任务状态不应被非法修改
  And 应记录审批拒绝结果到活动流
  And 任务保持原状态
```

### 20.3 边界流：多执行历史

```
Given 一个任务有多个历史执行或失败重试
When 用户查看任务详情
Then 系统应能展示当前主执行、历史执行与失败原因摘要
```

### 20.4 任务类型与上下文配方

```
Given 创建了一个 bug 类型任务
When AI Hub 为该任务打包上下文
Then 系统自动匹配 bug_fix 配方
  And Layer 2 包含错误描述与复现步骤
```

### 20.5 依赖与阻塞

```
Given 任务 A blocked by 任务 B，任务 B 未完成
When 任务 A 尝试进入 in_progress
Then 系统标记 A 为依赖阻塞
  And 通知 A 的负责人
  And 阻塞进入项目健康度的阻塞风险计数
```

### 20.6 子任务进度汇入

```
Given epic E 包含子任务 T1、T2、T3
When T1、T2 完成，T3 未完成
Then E 的进度为 67%
  And E 详情页折叠展示子任务状态
```

### 20.7 状态机回退限制

```
Given 任务处于 done 状态
When Contributor 尝试改回 in_progress
Then 操作被拒绝（需 Maintainer+ reopen）
  And 提示 reopen 需更高权限
```

### 20.8 AI 权限边界

```
Given 外部 Agent 被分配任务 T
When Agent 尝试删除任务 T
Then 操作被禁止（AI 不可删除任务）
  And 尝试记录到审计
```

### 20.9 评论与协作

```
Given 任务 T 进行中，PM @提及开发成员 D
When PM 提交评论
Then D 收到通知
  And 评论进入任务活动流
  And 后续评论 D 自动订阅
```

### 20.10 批量操作

```
Given 项目经理在列表视图选中 5 个任务
When 批量移入迭代 Sprint-10
Then 5 个任务 iterationId 同步更新
  And 每个任务记录 iteration_changed 活动
```

## 21. 待确认问题

1. 任务预估工时（estimate）单位与是否在 Phase 1 强制（影响负载看板数据源）
2. 子任务是否允许跨迭代（当前文档允许，需确认与里程碑/版本汇报的一致性）
3. 任务评论的 Markdown 渲染范围（是否支持代码块、任务列表 checkbox）
4. 任务编号（identifier）是否跟随项目 identifier 自动生成（如 APM-142 自动递增）
5. blocked 状态超过阈值的通知升级机制阈值（24h / 48h 可配置？）
