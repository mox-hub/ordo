---
title: "Team 模块需求说明"
description: 定义 Team 模块在 v2 平台化路线下作为扁平组织容器与项目人员聚合层的职责、成员管理与 AI 协作边界
category: requirement
status:
  - active
tags:
  - Team
  - Feature
  - requirements
  - organization
version: 2.1.0
created: 2026-07-16 03:56:37
modified: 2026-07-16 04:24:01
projects: "[[APM-项目中心]]"
---

# Team 模块需求说明

## 1. 模块定位

在 v2 路线下，Team 模块不追求完整的企业组织管理系统。

Team 模块的核心定位是：

> 平台中的扁平组织容器与项目人员聚合层，负责将人类成员与外部 Agent 组织为团队，并为 Project 模块提供「按团队批量加入项目」的能力。

Team 模块是以下能力的统一入口：

### 1.1 模块功能约束范围

1. 团队创建与基础信息维护
2. 团队成员管理（人类成员 + 外部 Agent）
3. 团队到项目的批量映射
4. 团队级角色默认值
5. 团队级领域事件与通知

### 1.2 与其他模块的边界

- Team 模块**不承载**项目内权限决策，项目内权限由 Project 模块的 [[角色级权限模型-v1|角色-等级-权限模型]] 决定。
- Team 模块**不承载**平台内 AI 成员的生命周期管理（列为 Phase 2/3，见 PRD）。
- Team 模块**不做**多层组织树、部门层级、企业管理能力（Phase 1 非目标）。

## 2. 模块目标

### 2.1 第一目标

提供扁平的团队组织容器，让人员可以按团队聚合，而不必在项目里逐个添加成员。

### 2.2 第二目标

为 Project 模块提供「按团队整体加入项目」的入口，降低项目初始化的成员管理成本。

### 2.3 第三目标

让外部接入 Agent 也可以归属团队，使 AI 主体成为团队的一类成员，与人类成员共享统一的主体模型。

## 3. Phase 1 范围

Phase 1 中，Team 模块必须服务以下能力：

- 创建团队与维护团队基础信息
- 管理团队成员（人类成员 + 外部 Agent）
- 将团队整体加入项目（批量建立项目成员关系）
- 团队级角色默认值（加入项目时继承）
- 团队级领域事件接入

Phase 1 的成功标准不是做出复杂组织管理系统，而是让「团队」成为项目人员管理的快捷聚合层。

## 4. 模块依赖

### 4.1 依赖模块

- [Feat001-Core-核心](Feat001-Core-核心.md)
- [Feat013-Auth-登录注册](Feat013-Auth-登录注册.md)
- [Feat009-Integration-外部链接](Feat009-Integration-外部链接.md)

### 4.2 被依赖模块

- [Feat002-Project-项目管理](Feat002-Project-项目管理.md)
- [Feat003-Task-任务](Feat003-Task-任务.md)
- [Feat006-Notification-消息中心](Feat006-Notification-消息.md)

## 5. 核心职责

### 5.1 团队空间管理

Team 模块负责管理团队基本信息，包括：

#### 5.1.1 创建团队、归档团队、删除团队（create、archive、delete）

- 支持新建团队操作，支持通过 [[Feat012-CreatePanel-统一创建面板|统一创建面板]] 新建团队。
- 支持归档团队操作，归档团队无法添加或移除成员，但已建立的团队→项目映射关系保留。
- 支持取消归档操作，恢复团队正常功能。
- 支持删除团队。删除团队需要二次确认，需要团队所有者权限。删除团队不删除成员用户本身，仅解除团队组织关系。

#### 5.1.2 编辑团队（edit）

- 支持编辑**团队基础信息**：团队名称、团队简介、团队图标、团队颜色。
- 支持编辑**团队默认角色**：团队成员加入项目时继承的默认项目角色（如默认为 Contributor）。

#### 5.1.3 团队标识（identifier）

- 每个团队可选配置唯一标识符（如 `CORE`、`FE`），用于团队识别与展示。
- 标识符在组织内唯一，创建后可在团队设置中修改。

### 5.2 团队成员管理

Team 模块负责维护团队成员关系，并与 [[数据模型-User-Auth|User/Auth 模型]] 和 [[角色级权限模型-v1|角色-等级-权限模型]] 对齐。

#### 5.2.1 成员主体类型

团队成员支持以下主体类型（与 Task 模块主体模型对齐）：

- `human`：人类成员（项目经理、开发、测试、架构等）
- `external_agent`：外部接入 Agent（通过 CLI/MCP/API/Plugin 接入）

> `platform_ai_member`（平台内 AI 成员）的生命周期管理列为 Phase 2/3，Phase 1 不在此模块承载。

#### 5.2.2 团队成员管理操作

- 支持添加成员（人类成员单个或批量邀请；外部 Agent 注册后加入）
- 支持移除成员（移除时保留其在各项目中的历史活动与审计记录）
- 支持成员退出团队
- 支持查看当前团队的成员清单与主体类型

#### 5.2.3 团队成员角色

团队级角色为「项目角色默认值」，区别于项目内角色：

| 团队角色 | 说明 |
|---------|------|
| `owner` | 团队所有者，可管理团队配置与成员 |
| `admin` | 团队管理员，可管理成员但不可删除团队 |
| `member` | 普通团队成员 |

团队成员加入项目时，默认继承为项目的 `Contributor`，但可在项目级覆盖（见 Project 第 4.3.1 节）。

### 5.3 团队到项目的映射

> 与 [[Feat002-Project-项目管理|Project 模块第 4.3.1 节]] 呼应。

Team 模块负责维护团队与项目的关联关系：

#### 5.3.1 团队加入项目

- 支持将整个团队加入一个或多个项目。
- 加入时，团队成员按团队默认角色批量建立项目成员关系。
- 支持项目级覆盖：项目可指定某团队加入时的角色映射（如团队 `admin` 在项目 A 映射为 `Maintainer`）。

#### 5.3.2 团队与项目的同步

- 团队新增成员时，已关联的项目可选择是否自动将该成员加入项目（默认行为可配置）。
- 团队移除成员时，已关联的项目可选择是否同步移除该成员的项目关系（默认保留项目关系，仅解除团队关系）。
- 同步策略在团队→项目映射关系上配置（`auto_sync_on_add` / `auto_sync_on_remove`）。

#### 5.3.3 外部 Agent 的团队归属

外部 Agent 归属团队后：

- 可随团队整体加入项目，避免逐项目配置 AI 主体。
- 在项目中仍按 [[角色级权限模型-v1|角色-等级-权限模型]] 映射角色与等级。
- 所有写操作仍受项目级审批门约束，团队归属不改变审批边界。

## 6. 团队权限模型

> Team 模块只管理团队级权限（谁能管理团队本身），不承载项目内权限。

### 6.1 团队级权限矩阵（Phase 1）

| 能力 | owner | admin | member | 非团队成员 |
|------|:-----:|:-----:|:------:|:--------:|
| 查看团队 | ✅ | ✅ | ✅ | 受可见性约束 |
| 编辑团队信息 | ✅ | ✅ | ❌ | ❌ |
| 添加 / 移除成员 | ✅ | ✅ | ❌ | ❌ |
| 配置团队默认角色 | ✅ | ❌ | ❌ | ❌ |
| 将团队加入项目 | ✅ | ✅ | ❌ | ❌ |
| 删除团队 | ✅ | ❌ | ❌ | ❌ |
| 退出团队 | ✅ | ✅ | ✅（自己）| - |

### 6.2 团队可见性（visibility）

- `private`：仅团队成员可见
- `internal`：组织内成员可见
- `public`：公开可发现（Phase 2）

### 6.3 与项目权限的关系

- 团队级权限**不传递**为项目内权限。
- 团队成员加入项目后，项目内权限独立由 Project 模块决定。
- 团队 `owner`/`admin` 在团队管理上的权限，不等于在所有关联项目中的 `Owner`/`Maintainer` 权限。
- 冲突时项目级配置优先于团队默认值。

## 7. AI 协作能力

> 团队是 AI 主体（外部 Agent）的组织归属层，但团队本身不直接参与执行。

### 7.1 外部 Agent 的团队归属价值

- 外部 Agent 归属团队后，可随团队批量加入多个项目，减少逐项目配置成本。
- 团队为 Agent 提供稳定的组织身份，便于在跨项目场景下识别「同一类 Agent」。

### 7.2 团队不承载的 AI 能力

Team 模块在 Phase 1 **不承载**：

- AI 执行调度
- AI 任务分配
- AI 权限审批
- AI 上下文打包

这些能力分别由 Task、Project、AI Hub、[[上下文管理设计|ContextBuilder]] 承载。Team 仅提供组织归属。

### 7.3 平台内 AI 成员的边界

平台内 AI 成员（`platform_ai_member`）的生命周期管理：

- Phase 1：仅在主体模型中预留字段，不在 Team 模块承载其生命周期。
- Phase 2/3：演进到正式 AI 成员组织能力时，扩展 Team 模块或引入新模块承载。

## 8. 团队级事件与通知

> 与 [[Feat001-Core-核心|Core 模块事件总线]] 和 [[Feat006-Notification-消息中心|Notification 模块]] 对齐。

### 8.1 团队级领域事件

Team 模块必须发布以下领域事件：

| 事件 | 触发时机 | 典型订阅方 |
|------|---------|-----------|
| `team.created` | 团队创建 | Notification |
| `team.updated` | 团队信息变更 | Notification |
| `team.archived` | 团队归档 | Notification、Project（同步检查）|
| `team.member_added` | 成员加入团队 | Notification、Project（若开启自动同步）|
| `team.member_removed` | 成员移除团队 | Notification、Project（若开启自动同步）|
| `team.member_role_changed` | 成员团队角色变更 | Notification |
| `team.project_linked` | 团队加入项目 | Notification、Project |
| `team.project_unlinked` | 团队退出项目 | Notification、Project |

### 8.2 通知订阅

- 团队成员默认订阅本团队事件
- 团队 owner/admin 强制接收成员变更通知
- 团队→项目同步事件同时通知相关项目的 Owner/Maintainer

## 9. 核心功能需求

### FR-TE-01 团队创建与维护

Team 模块必须支持：

- 创建团队
- 编辑团队基础信息
- 归档团队 / 取消归档
- 删除团队（二次确认 + owner 权限）
- 团队列表与筛选

最小字段建议：

- `name`
- `identifier`
- `description`
- `icon`
- `color`
- `visibility`
- `status`
- `defaultProjectRole`

### FR-TE-02 团队成员管理

Team 模块必须支持：

- 添加成员（人类成员 + 外部 Agent）
- 移除成员（保留项目历史与审计）
- 变更成员团队角色（owner / admin / member）
- 成员退出团队
- 查看成员清单（区分主体类型）

### FR-TE-03 团队到项目映射

Team 模块必须支持：

- 将团队加入一个或多个项目
- 配置团队→项目映射的同步策略（auto_sync_on_add / auto_sync_on_remove）
- 项目级角色覆盖
- 将团队从项目移除
- 查看团队关联的项目列表

### FR-TE-04 团队默认角色

Team 模块必须支持：

- 配置团队默认项目角色（加入项目时继承）
- 项目级覆盖默认角色

### FR-TE-05 团队级事件与通知

Team 模块必须：

- 发布团队级领域事件（见 [第 8 章](#8-团队级事件与通知)）
- 接入 Notification 模块
- 团队→项目同步事件通知相关项目

### FR-TE-06 外部 Agent 团队归属

Team 模块必须支持：

- 外部 Agent 加入团队
- 外部 Agent 随团队加入项目（批量建立项目映射）
- 团队移除外部 Agent 时处理项目关系（按同步策略）

## 10. 与其他模块的关系

### 10.1 与 Project 的关系

- Team 为 Project 提供人员聚合层。
- 团队→项目映射在 Project 侧体现为批量 ProjectMember 关系。
- Project 内权限独立于团队权限，项目级配置优先。

### 10.2 与 Task 的关系

- Task 的指派对象（`assigneeType` / `assigneeId`）指向人类成员或外部 Agent。
- 团队不直接作为 Task 的指派对象（Phase 1 不支持「指派给团队」）。

### 10.3 与 User/Auth 的关系

- 团队成员中的 `human` 类型引用 [[数据模型-User-Auth|User 模型]] 的 `userId`。
- 团队级角色与 User/Auth 的 `RoleAssignment`（scope=global）互补，但团队角色不写入 `RoleAssignment` 的 project scope。

## 11. 数据模型要求

> 与 [[数据模型-User-Auth|User/Auth 模型]] 对齐。

### 11.1 Team 实体

建议字段：

- `id`
- `name`
- `identifier`
- `description`
- `icon`
- `color`
- `visibility`（private / internal / public）
- `status`（active / archived）
- `defaultProjectRole`
- `createdAt`
- `updatedAt`

### 11.2 TeamMember 实体

建议字段：

- `id`
- `teamId`
- `subjectType`（human / external_agent）
- `subjectId`（userId 或 agentId）
- `teamRole`（owner / admin / member）
- `joinedAt`
- `addedBy`
- `removedAt`（软删除，保留历史）

### 11.3 TeamProjectMapping 实体

建议字段：

- `id`
- `teamId`
- `projectId`
- `roleMapping`（JSON，团队角色 → 项目角色的映射，可选覆盖默认）
- `autoSyncOnAdd`（boolean）
- `autoSyncOnRemove`（boolean）
- `linkedAt`
- `linkedBy`

### 11.4 关系建议

- `Team 1 - N TeamMember`
- `Team N - N Project`（通过 TeamProjectMapping）
- `TeamMember.subjectType = human` → 引用 `User.id`
- `TeamMember.subjectType = external_agent` → 引用外部 Agent 注册实体（见 Integration/AI Hub）

## 12. Phase 1 非目标

Team 模块在 Phase 1 暂不要求：

- 多层组织树 / 部门层级
- 企业级管理能力（SSO 统一组织、跨组织协作）
- 平台内 AI 成员（`platform_ai_member`）的生命周期管理
- 复杂团队级经营分析与驾驶舱
- 团队级预算 / Token 配额管理
- 跨团队资源调度
- 「指派给团队」的任务分配模式

## 13. GWT 验收场景

### 13.1 正常流：团队加入项目

```
Given 团队 T 有 5 名成员，其中 1 名为外部 Agent
When 团队 owner 将团队 T 加入项目 P（开启 auto_sync_on_add）
Then T 的 5 名成员按默认角色批量成为项目 P 的成员
  And 外部 Agent 在项目 P 中仍受审批门约束
```

### 13.2 异常流：权限不足

```
Given 用户 U 是团队 T 的普通 member
When U 尝试将团队 T 加入项目 P
Then 操作被拒绝（需 owner/admin 权限）
  And 尝试记录到审计
```

### 13.3 边界流：团队移除成员

```
Given 团队 T 关联项目 P，且映射开启 auto_sync_on_remove
When T 的 owner 移除成员 M
Then M 的团队关系解除
  And M 在项目 P 中的成员关系同步解除（项目历史与审计保留）
  And 通知项目 P 的 Owner/Maintainer
```

### 13.4 团队成员变更同步

```
Given 团队 T 已加入项目 P，映射开启 auto_sync_on_add
When 团队 T 新增成员 N
Then N 自动成为项目 P 的成员（继承团队默认角色）
  And N 收到加入项目通知
```

### 13.5 外部 Agent 团队归属

```
Given 外部 Agent A 已加入团队 T
When 团队 T 加入项目 P
Then A 在项目 P 中按角色-等级模型映射角色与等级
  And A 的所有写操作仍进入项目级审批门
  And A 的团队归属不改变其执行边界
```

## 14. 待确认问题

1. 团队→项目映射的 `roleMapping` 默认策略（团队 owner/admin 在项目中默认映射为什么角色）
2. 团队移除成员时项目关系的默认同步策略（默认移除 vs 默认保留，需确认产品取向）
3. 外部 Agent 是否支持同时归属多个团队
4. 团队标识符（identifier）的作用范围（组织内唯一 vs 全局唯一）
5. 是否需要团队级成员负载视图（跨项目聚合成员的任务量，列为 Phase 2？）
