---
title: "Notification 模块需求说明"
description: 定义 Notification 模块在 v2 平台化路线下作为执行事件、审批结果与项目协作提醒分发层的职责、防骚扰、内嵌动作与权限可见性
category: requirement
status:
  - active
tags:
  - Notification
  - Feature
  - requirements
  - events
version: 2.1.0
created: 2026-07-15 06:40:44
modified: 2026-07-16 04:24:54
projects: "[[APM-项目中心]]"
---

# Notification 模块需求说明

## 1. 模块定位

在 v2 路线下，Notification 模块不应再被理解成泛化消息中心。

Notification 模块的核心定位是：

> 平台中围绕任务协作、执行状态、审批结果和关键项目事件，将需要人类关注的信息送达正确对象的事件分发层。

它首先服务的是协作效率和治理闭环，而不是营销式消息系统。

### 1.1 模块功能约束范围

1. 领域事件订阅与通知生成
2. 通知目标对象决策（谁应收到）
3. 渠道分发（站内 + 后续 Email/IM）
4. 通知内嵌动作（审批类直接操作）
5. 防骚扰机制（去重/聚合/限流）
6. 通知权限与可见性
7. 通知状态管理（未读/已读/保留）

### 1.2 与其他模块的边界

- Notification 模块**不承载**业务逻辑，只消费领域事件并分发。
- Notification 模块**不接收** AI 主体作为通知对象（Agent 通过事件总线获取状态，通知只服务人类）。
- Notification 模块**不绕开**权限校验，通知内容不泄露接收人无权限的资源。
- Notification 模块是**被动分发层**：订阅 Core 事件总线，不主动发起业务动作。

## 2. 模块目标

### 2.1 第一目标

确保关键协作事件能及时触达相关人类成员。

### 2.2 第二目标

确保执行和审批链路中的阻塞、完成和失败可以被及时感知。

### 2.3 第三目标

为后续对外通知渠道和 Digest 能力提供统一事件分发模型。

## 3. Phase 1 范围

Phase 1 中，Notification 模块必须先服务：

- 任务相关提醒
- 审批请求与审批结果提醒（含内嵌动作）
- 执行完成 / 失败提醒
- 基础站内通知
- 基础防骚扰（去重/聚合）
- 通知权限与可见性

Phase 1 可预留但不强求：

- Email 渠道
- 外部 IM 通知（Slack / Discord）
- Digest 汇总

## 4. 模块依赖

### 4.1 依赖模块

- [Feat001-Core-核心](Feat001-Core-核心.md)
- [Feat013-Auth-登录注册](Feat013-Auth-登录注册.md)

### 4.2 被依赖模块

Notification 模块作为被动分发层，被以下模块的事件订阅：

- [Feat002-Project-项目管理](Feat002-Project-项目管理.md)
- [Feat003-Task-任务](Feat003-Task-任务.md)
- [Feat005-Git-版本管理](Feat005-Git-版本管理.md)
- [Feat010-AIHub-人工智能](Feat010-AIHub-人工智能.md)

## 5. 核心职责

### 5.1 领域事件订阅

Notification 模块必须订阅平台各业务模块发布的领域事件，并将其转化为人类可读通知。

事件源来自 [[Feat001-Core-核心|Core 事件总线]]，各模块已定义的事件清单见 [第 6 章](#6-事件源对接)。

### 5.2 目标对象决策

Notification 模块必须决定谁应该收到通知。

至少包括：

- 当前任务负责人
- 相关审批人
- 项目 Owner / Maintainer
- 发起执行的人类成员
- 被 @提及的成员
- 订阅者（任务/项目的订阅者）

### 5.3 渠道分发

Notification 模块在 Phase 1 至少支持：

- 站内通知

后续可扩展（通过渠道抽象）：

- Email
- Slack / Discord 等外部渠道

### 5.4 通知内嵌动作

通知支持内嵌动作入口（见 [第 8 章](#8-通知内嵌动作)），尤其审批类通知可直接操作。

### 5.5 防骚扰

Notification 模块必须实现基础防骚扰机制，避免重复刷屏（见 [第 9 章](#9-防骚扰机制)）。

### 5.6 读状态与回执

Notification 模块必须支持：

- 未读 / 已读状态
- 通知跳转目标
- 对审批类通知的关联动作入口
- 未读数统计

## 6. 事件源对接

> Notification 订阅 Core 事件总线，消费各业务模块发布的领域事件。以下是 Phase 1 必须处理的关键事件归类。

### 6.1 任务类事件（来自 Task 模块）

| 事件 | 通知对象 | 内嵌动作 |
|------|---------|---------|
| `task.assigned` | 被指派人 | 跳转任务 |
| `task.status_changed` | 负责人、订阅者 | 跳转任务 |
| `task.blocked` | 负责人、Owner/Maintainer | 跳转任务 |
| `task.commented` | @提及人、订阅者 | 跳转评论 |
| `task.iteration_changed` | 负责人 | 跳转任务 |

### 6.2 执行类事件（来自 AI Hub 模块）

| 事件 | 通知对象 | 内嵌动作 |
|------|---------|---------|
| `execution.pending_approval` | 审批人 | **approve / reject** |
| `execution.approval_resolved` | 发起人 | 跳转执行 |
| `execution.completed` | 负责人、发起人 | 跳转结果 |
| `execution.failed` | 负责人、Owner/Maintainer | 跳转失败详情、重试 |
| `execution.blocked` | Owner/Maintainer | 跳转执行 |

### 6.3 项目类事件（来自 Project 模块）

| 事件 | 通知对象 | 内嵌动作 |
|------|---------|---------|
| `project.status_changed` | 项目成员 | 跳转项目 |
| `project.member_changed` | 相关成员 | 跳转成员管理 |
| `project.risk_alert` | Owner/Maintainer | 跳转健康度 |

### 6.4 Git 类事件（来自 Git 模块）

| 事件 | 通知对象 | 内嵌动作 |
|------|---------|---------|
| `git.high_risk_action` | Owner/Maintainer | 跳转审计 |
| `git.branch_protection_violation` | Owner | 跳转审计 |
| `git.push_completed` | 任务负责人 | 跳转提交 |

### 6.5 团队类事件（来自 Team 模块）

| 事件 | 通知对象 | 内嵌动作 |
|------|---------|---------|
| `team.member_added` | 新成员、团队成员 | 跳转团队 |
| `team.project_linked` | 团队成员、项目 Owner | 跳转项目 |

## 7. 目标对象决策

### 7.1 默认订阅规则

| 角色 / 关系 | 默认订阅事件 |
|------------|-------------|
| 任务负责人 | 该任务的所有事件 |
| 任务创建者 | 该任务的状态变更、评论 |
| 项目 Owner/Maintainer | 项目风险、分支保护、高风险动作 |
| 审批人 | 待其审批的 ApprovalRequest |
| 被 @提及人 | 相关评论 |
| 评论参与者 | 后续评论 |

### 7.2 通知不泄露原则

- 通知内容不得包含接收人无权限访问的资源摘要
- 跨项目通知严格隔离：用户只收到自己有权访问的项目的事件通知
- 通知跳转目标在用户无权限时拒绝访问（不通过通知绕开权限）

## 8. 通知内嵌动作

> Phase 1 支持审批类通知内嵌动作，提升闭环效率。对标 Linear/现代协作工具。

### 8.1 内嵌动作能力

通知可携带可选的动作入口，用户可在通知内直接操作，无需跳转：

| 动作 | 适用通知 | 效果 |
|------|---------|------|
| `approve` | 审批类（execution.pending_approval）| 直接通过审批 |
| `reject` | 审批类 | 直接拒绝审批 |
| `retry` | 执行失败 | 触发重试（创建新 ExecutionRun）|
| `view` | 通用 | 跳转详情（默认动作）|

### 8.2 动作约束

- 内嵌动作仍受权限校验（无审批权限者看不到 approve/reject）
- 动作执行后通知状态更新（如审批后通知标记为已处理）
- 动作执行进入 Core 审计（如 approve 动作留审计）
- Phase 1 内嵌动作聚焦审批类，其他类型默认 `view` 跳转

## 9. 防骚扰机制

> Phase 1 纳入基础防骚扰，避免重复刷屏。

### 9.1 去重（deduplication）

同一资源、同一事件类型在短时间窗口内（建议 30s）只生成一条通知：

- 例如：任务状态短时间内多次变更，合并为一条「状态变更」通知
- 去重窗口可按事件类型配置

### 9.2 聚合（aggregation）

批量事件聚合成单条通知：

- 批量指派：5 个任务同时指派给同一人 → 聚合为「你被指派了 5 个任务」
- 批量状态变更：聚合为「N 个任务状态变更」
- 聚合规则：同事件类型 + 同接收人 + 同时间窗口

### 9.3 限流（rate limiting）

- 单用户单时间窗口（如 1 小时）接收通知数上限
- 超限后低优先级通知降级为 Digest 或静默
- 高优先级通知（审批、风险预警、分支保护违规）不受限流影响

### 9.4 优先级

通知优先级影响防骚扰处理：

| 优先级 | 类型 | 限流 |
|--------|------|------|
| `critical` | 审批请求、风险预警、分支保护违规 | 不限流 |
| `high` | 执行失败、任务阻塞 | 轻度限流 |
| `normal` | 任务指派、状态变更、评论 | 标准限流 + 聚合 |
| `low` | 常规状态更新 | 可降级 Digest |

## 10. 渠道分发

### 10.1 Phase 1 渠道

- 站内通知（in-app）：必须交付

### 10.2 渠道抽象

通知渠道应抽象为可扩展模型，便于后续接入：

| 渠道 | Phase | 说明 |
|------|-------|------|
| `in_app` | ✅ Phase 1 | 站内通知 |
| `email` | Phase 2 | 邮件 |
| `webhook` | Phase 2 | 外部 IM（Slack/Discord）|

### 10.3 渠道与偏好的关系

- 用户可在偏好中按事件类型配置启用渠道
- `critical` 优先级通知强制站内渠道，不受偏好关闭影响

## 11. 权限与可见性

> Notification 作为被动分发层，权限约束体现在「谁能收到什么」和「通知不泄露」。

### 11.1 通知可见性规则

- 用户只能收到自己有权访问的项目/任务相关通知
- 通知内容摘要不包含接收人无权限的字段
- 通知跳转目标受目标资源的权限校验约束
- 跨项目通知严格按项目成员关系隔离

### 11.2 通知与项目权限的关系

- 通知接收人决策依赖 Project 权限模型（成员关系、角色）
- 用户被移除项目后，不再接收该项目新通知（历史通知保留但不可访问资源）
- 外部 Agent **不接收**通知（通过事件总线获取执行状态）

### 11.3 内嵌动作的权限

- 内嵌动作（approve/reject）仅对有相应权限的接收人可见
- 无审批权限者只看到 `view` 动作

## 12. AI 协作能力

> Notification 是被动分发层，类似 Core，不主动服务 AI，但必须确保对 AI 主线的正确处理。

### 12.1 Notification 不向 AI 分发

- 通知接收对象**仅为人类成员**
- 外部 Agent 通过 Core 事件总线订阅执行状态（如 `execution.approval_resolved`），不通过 Notification
- Notification 与 Agent 的状态获取是两条独立通道，避免冗余

### 12.2 Notification 承载 AI 执行的治理触达

Notification 是 AI 执行治理闭环中「触达人类」的关键环节：

- AI 写操作进入审批 → 通知审批人（内嵌 approve/reject）
- AI 执行失败 → 通知负责人
- AI 高风险 Git 动作 → 通知 Owner/Maintainer
- AI 风险预警 → 通知 Owner/Maintainer

### 12.3 Notification 不承载的能力

- 不做 AI 生成的 Digest（Phase 2 实验性）
- 不做 AI 驱动的通知优先级智能调整（Phase 2）
- 不向 Agent 推送通知

## 13. 核心功能需求

### FR-NT-01 站内通知生成

Notification 模块必须支持根据平台领域事件生成站内通知。

通知至少应包含：

- 事件类型（`eventType`）
- 标题
- 摘要
- 关联资源（`resourceType` / `resourceId`）
- 接收人
- 优先级
- 创建时间

### FR-NT-02 审批通知（含内嵌动作）

Notification 模块必须支持为 `ApprovalRequest` 生成专门通知。

要求：

- 明确展示审批对象
- 明确风险级别
- 能跳转到对应审批入口
- **内嵌 approve / reject 动作**（仅对有审批权限者可见）
- 动作执行后通知状态更新并进入审计

### FR-NT-03 执行结果通知

Notification 模块必须支持执行完成或失败后的通知分发。

至少包括：

- 执行完成摘要
- 执行失败摘要
- 结果查看入口
- 失败时内嵌 retry 动作

### FR-NT-04 用户通知状态管理

Notification 模块必须支持：

- 查询通知列表（按项目、类型、优先级筛选）
- 标记已读 / 批量已读
- 未读数统计
- 通知保留期管理（过期自动归档）

### FR-NT-05 通知偏好

Notification 模块必须支持基础偏好配置：

- 是否接收审批通知
- 是否接收执行失败通知
- 是否接收任务指派通知
- 按事件类型配置启用渠道（Phase 2 多渠道时生效）

`critical` 优先级通知不受偏好关闭影响（强制站内）。

### FR-NT-06 防骚扰机制

Notification 模块必须支持（Phase 1）：

- 去重（同资源同事件短窗口去重）
- 聚合（批量事件合并）
- 限流（单用户单窗口上限）
- 优先级分级（critical 不限流）

### FR-NT-07 事件源订阅

Notification 模块必须：

- 订阅 Core 事件总线
- 处理 Project / Task / Git / AI Hub / Team 的领域事件
- 幂等处理（订阅方至少一次投递，见 Core 第 7 章）

### FR-NT-08 通知权限与可见性

Notification 模块必须：

- 按项目成员关系隔离通知
- 通知内容不泄露无权限资源
- 内嵌动作按权限可见
- 外部 Agent 不接收通知

## 14. 数据模型要求

> 与 [[数据模型-Notification|Notification 支撑模型]] 对齐，并补充接收人与动作。

### 14.1 核心对象

| 实体 | 用途 |
|------|------|
| `Notification` | 通知主记录 |
| `NotificationRecipient` | 通知接收人（支持多接收人）|
| `NotificationPreference` | 用户通知偏好 |
| `NotificationAction` | 通知内嵌动作（可选）|
| `NotificationTemplate` | 通知模板（Phase 2 增强）|

### 14.2 Notification 建议字段

- `id`
- `eventType`
- `resourceType`
- `resourceId`
- `projectId`
- `title`
- `body`
- `priority`（critical / high / normal / low）
- `status`（unread / read / archived）
- `createdAt`
- `readAt`
- `archivedAt`

### 14.3 NotificationRecipient 建议字段

- `id`
- `notificationId`
- `userId`
- `deliveryChannel`（in_app / email / webhook）
- `deliveryStatus`
- `readAt`

> 注：原数据模型将 `userId` 直接放在 Notification 上，v2 建议拆分为 NotificationRecipient 以支持多接收人与多渠道。

### 14.4 NotificationAction 建议字段

- `id`
- `notificationId`
- `actionType`（approve / reject / retry / view）
- `label`
- `requiredPermission`
- `executedAt`
- `executedBy`

### 14.5 NotificationPreference 建议字段

- `id`
- `userId`
- `projectId`
- `eventType`
- `channels`（启用渠道列表）
- `enabled`（是否接收）
- `createdAt`
- `updatedAt`

### 14.6 关系建议

- `Notification 1 - N NotificationRecipient`
- `Notification 1 - N NotificationAction`
- `User 1 - N NotificationPreference`
- `Project 1 - N Notification`

## 15. Phase 1 非目标

Notification 模块在 Phase 1 暂不要求：

- 复杂模板系统（NotificationTemplate 引擎）
- 完整多渠道编排（Email / Slack / Discord 实际投递）
- AI 生成 Digest 平台
- AI 驱动的通知优先级智能调整
- 营销或运营类消息能力
- 通知的富媒体推送（Push Notification）

## 16. GWT 验收场景

### 16.1 正常流：审批通知内嵌动作

```
Given 某个任务执行进入待审批状态
When 平台生成审批通知给审批人
Then 审批人收到站内通知
  And 通知内嵌 approve / reject 动作
  And 审批人可直接在通知内完成审批
  And 审批结果进入审计
```

### 16.2 异常流：权限隔离

```
Given 某个用户对资源无访问权限
When Notification 模块尝试分发相关事件通知
Then 系统不得向该用户暴露资源摘要或跳转入口
  And 跨项目通知严格隔离
```

### 16.3 边界流：防骚扰聚合

```
Given 某个执行在短时间内产生多次状态变化
When Notification 模块生成通知
Then 系统应能保证事件顺序可追溯
  And 通过去重/聚合避免明显重复刷屏
  And 同资源同事件短窗口内合并为一条
```

### 16.4 批量指派聚合

```
Given 项目经理批量将 5 个任务指派给用户 U
When Notification 生成通知
Then U 收到聚合通知「你被指派了 5 个任务」
  And 而非 5 条独立通知
```

### 16.5 critical 优先级不限流

```
Given 用户 U 已达通知限流上限
When 一个审批请求（critical）需通知 U
Then 审批通知不受限流影响，正常送达
```

### 16.6 Agent 不接收通知

```
Given 外部 Agent A 执行的任务状态变更
When Notification 处理 task.status_changed 事件
Then 通知只发给人类负责人与订阅者
  And Agent A 不收到通知（其通过事件总线获取状态）
```

### 16.7 内嵌动作权限

```
Given 一个审批通知发给用户 U（无审批权限的观察者）
When U 查看该通知
Then U 只看到 view 动作
  And approve / reject 动作对 U 不可见
```

## 17. 待确认问题

1. 去重窗口默认值（建议 30s，可按事件类型配置，需确认）
2. 通知保留期（建议 30/90 天后归档，需确认）
3. 限流阈值（单用户单窗口上限，建议 1 小时 50 条，需确认）
4. NotificationRecipient 拆分是否在 Phase 1 落地（影响原数据模型）
5. Email 渠道是否在 Phase 1 末尾作为「应该做」补齐
