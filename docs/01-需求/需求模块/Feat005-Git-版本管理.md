---
title: "Git 模块需求说明"
description: 定义 Git 模块在 v2 平台化路线下作为 Local Runtime 代码上下文与受控 Git 动作提供者的职责、分支策略、权限与 AI 协作边界
category: requirement
status:
  - active
tags:
  - Git
  - Feature
  - requirements
  - local-runtime
version: 2.1.0
created: 2026-07-15 06:40:44
modified: 2026-07-16 04:24:34
projects: "[[APM-项目中心]]"
---

# Git 模块需求说明

## 1. 模块定位

在 v2 路线下，Git 模块不再只是“仓库列表 + 分支 + 提交记录”的传统代码托管视图。

Git 模块的核心定位是：

> 平台中围绕仓库上下文、差异分析和受控 Git 动作，为 Task 执行和 Local Runtime 提供代码执行输入与审计出口的能力提供者。

Git 模块需要同时服务两类需求：

- 人类项目经理和开发者查看项目代码状态
- 外部 Agent 在执行任务时读取结构化 Git 上下文，并在授权后执行受控 Git 动作

### 1.1 模块功能约束范围

1. 项目级仓库绑定与维护（本地仓库）
2. Git 结构化上下文提供（分支/提交/diff/状态）
3. 分支策略与基础分支保护
4. 受控 Git 动作派发（分级审批）
5. 外部 PR/MR 关联（只读状态展示）
6. Git 动作审计与回写
7. 作为 ContextPack 知识层数据源

### 1.2 与其他模块的边界

- Git 模块**不承载**本地命令执行（由 Runtime Provider 层承载），只负责动作定义、派发、结果接收。
- Git 模块**不自建** PR/MR 系统（GitHub/GitLab 已成熟），只关联外部 PR 状态。
- Git 模块**不绕过** Runtime 直接执行本地 Git 命令。
- Phase 1 仅支持 **Local Runtime 本地仓库**接入，远程仓库只记录地址与只读状态，不做远程 API 读写。

## 2. 模块目标

### 2.1 第一目标

提供可靠的项目级仓库管理能力：

- 仓库绑定
- 工作区关联
- 分支与提交查询
- diff 查看

### 2.2 第二目标

为 `ExecutionRun` 提供可复用的代码上下文（ContextPack 知识层数据源），而不是让 Agent 自己抓取页面信息。

### 2.3 第三目标

将 Git 写操作纳入统一审批和审计链路，通过基础分支策略防止越权操作。

## 3. Phase 1 范围

Phase 1 中，Git 模块必须先服务：

- 项目级仓库绑定和工作区关联（本地仓库）
- 任务执行所需的提交、分支、diff 上下文
- Runtime 触发的受控 Git 只读能力
- 少量受审批控制的 Git 写动作
- 基础分支策略与分支保护
- 外部 PR/MR 关联（只读状态）

Phase 1 的成功标准不是实现完整 Git 客户端，而是让 Git 成为任务执行闭环中的结构化上下文与受控动作提供者。

## 4. 模块依赖

### 4.1 依赖模块

- [Feat001-Core-核心](Feat001-Core-核心.md)
- [Feat002-Project-项目管理](Feat002-Project-项目管理.md)
- [Feat014-Runtime-本地运行时](Feat014-Runtime-本地运行时.md)

### 4.2 被依赖模块

- [Feat003-Task-任务](Feat003-Task-任务.md)
- [Feat010-AIHub-人工智能](Feat010-AIHub-人工智能.md)
- [Feat006-Notification-消息中心](Feat006-Notification-消息.md)

## 5. 核心职责

### 5.1 项目级仓库绑定

Git 模块负责维护项目和本地仓库之间的绑定关系。

至少需要支持：

- 项目关联一个或多个仓库
- 记录仓库在工作区中的路径
- 记录远程地址、默认分支和仓库角色
- 记录工作区根目录（与项目 Runtime 策略对齐）

### 5.2 Git 上下文提供

Git 模块必须为 Task 和 AI Hub 提供结构化 Git 上下文。

至少包括：

- 当前分支
- 工作区状态
- 最近提交摘要
- 指定范围 diff
- 文件级变更统计

### 5.3 受控 Git 动作

Git 模块需要通过 Local Runtime 暴露 Git 动作，但动作必须分级。

建议至少区分：

- 只读动作：`status` `log` `diff` `show` `branch --list`
- 低风险写动作：`checkout/switch` `fetch` `pull`
- 高风险写动作：`commit` `merge` `rebase` `push` `branch -d`

### 5.4 分支策略与保护

Git 模块负责维护项目级分支策略，约束受控 Git 动作的安全边界（见 [第 8 章](#8-分支策略与保护)）。

### 5.5 外部 PR/MR 关联

Git 模块负责关联外部 PR/MR 状态（只读展示），不自建 PR 系统（见 [第 10 章](#10-外部-prmr-关联)）。

### 5.6 Git 审计出口

所有由 Runtime 触发的 Git 动作都应进入统一审计。

至少记录：

- 执行主体
- 关联 `ExecutionRun`
- 仓库与分支
- 命令摘要
- 成功/失败
- 结果与错误输出摘要

## 6. Git 上下文作为 ContextPack 数据源

> 与 [[上下文管理设计|上下文管理系统设计]] 和 [[Feat010-AIHub-人工智能|AI Hub 策展]] 对齐。Git 是 ContextPack **Layer 3 知识层**和执行输入的核心数据源。

### 6.1 Git 在 ContextPack 中的角色

| 层 | Git 提供的内容 |
|----|--------------|
| Layer 1 基础层 | 仓库绑定摘要（仓库名、默认分支、角色）|
| Layer 2 任务层 | 当前分支、工作区状态（任务执行输入）|
| Layer 3 知识层 | 相关代码文件摘要、最近提交、指定范围 diff |
| Layer 4 扩展层 | 完整文件源码（Agent 按需通过 MCP 拉取）|

### 6.2 结构化上下文输出

Git 模块输出的上下文应可被 `ContextPack` 直接引用，而不是非结构化文本：

- diff 结果结构化（文件级 + 行级变更统计）
- 提交记录结构化（hash、作者、时间、message 摘要）
- 工作区状态结构化（未跟踪/已修改/已暂存文件清单）

## 7. 核心功能需求

### FR-GT-01 仓库绑定与维护

Git 模块必须支持：

- 绑定项目仓库（本地路径）
- 编辑仓库信息
- 解绑仓库
- 标记仓库角色（primary / secondary / docs）

最小字段建议：

- `projectId`
- `name`
- `localPath`
- `workspaceRoot`
- `remoteUrl`
- `defaultBranch`
- `role`
- `provider`
- `lastScannedAt`
- `lastKnownStatus`

### FR-GT-02 仓库状态查询

Git 模块必须支持查询仓库当前状态。

至少包括：

- 仓库是否可访问
- 当前分支
- 跟踪分支信息
- 工作区是否干净
- 未跟踪/已修改文件摘要

### FR-GT-03 提交与分支查询

Git 模块必须支持：

- 查询分支列表
- 查询提交记录
- 查看提交详情
- 按任务或时间范围检索提交

说明：

- 这部分优先服务任务执行上下文和项目摘要
- Phase 1 不追求复杂 commit graph 可视化

### FR-GT-04 Diff 能力

Git 模块必须支持结构化 diff 查询。

至少支持：

- 工作区 diff
- 暂存区 diff
- 两个引用之间的 diff
- 指定文件范围 diff

diff 输出应可被 `ContextPack` 直接引用（结构化，而非纯文本）。

### FR-GT-05 Runtime Git 动作派发

Git 模块必须支持 Runtime 发起 Git 动作。

要求：

- 动作发生在项目允许的工作区内
- 动作与 `ExecutionRun` 强关联
- 动作进入统一执行事件流
- 派发前校验分支策略（受保护分支禁止越权写）

### FR-GT-06 Git 动作审批

Git 模块必须支持 Git 动作进入审批门。

Phase 1 策略：

- 只读动作默认可执行
- 低风险写动作按项目策略决定是否审批
- 高风险写动作默认审批
- 对受保护分支的写动作一律审批，且禁止 Agent 直接操作

### FR-GT-07 Git 结果回写

Git 模块必须支持将关键结果回写到任务和执行记录。

至少包括：

- 变更摘要
- 提交哈希
- 分支变更
- push / merge 结果
- 失败原因

回写以系统注释形式进入 Task 评论流（见 Task 第 13 章）。

### FR-GT-08 分支策略与保护

Git 模块必须支持（Phase 1）：

- 配置默认分支
- 分支命名约定（如 `task/APM-142`）
- 基础分支保护（标记受保护分支，禁止直接 push）
- 命名约定校验（Agent 创建分支需符合约定）

### FR-GT-09 外部 PR/MR 关联

Git 模块必须支持（Phase 1）：

- 记录外部 PR/MR 链接（GitHub/GitLab URL）
- 展示 PR 状态（open/merged/closed，只读）
- 将 PR 关联到任务

说明：不自建 PR 系统，不代理外部 PR 操作。

### FR-GT-10 Git 级事件与通知

Git 模块必须：

- 发布 Git 级领域事件（见 [第 11 章](#11-git-级事件与通知)）
- 高风险 Git 动作结果通知项目 Owner/Maintainer
- 接入 Notification 模块

## 8. 分支策略与保护

> Phase 1 纳入基础分支策略，作为受控 Git 动作的安全前提。

### 8.1 默认分支

- 每个仓库配置一个默认分支（如 `main` / `master`）
- 默认分支默认标记为受保护

### 8.2 分支命名约定

支持配置项目级分支命名约定，建议格式：

- 任务分支：`task/{identifier}`（如 `task/APM-142`）
- Bug 修复：`fix/{identifier}`（如 `fix/APM-200`）
- 功能：`feature/{slug}`

Agent 创建分支需符合约定，否则 Git 动作被拒绝。

### 8.3 基础分支保护

受保护分支规则（Phase 1 基础集）：

| 规则 | 说明 |
|------|------|
| 禁止直接 push | Agent 不可直接 push 到受保护分支 |
| 禁止删除 | 受保护分支不可被 Agent 删除 |
| 写动作强制审批 | 任何对受保护分支的写动作必须审批 |

### 8.4 非目标（分支策略）

- 复杂分支保护规则引擎（如 required reviews、status checks）列为 Phase 2
- 多分支模型编排列为 Phase 2

## 9. Git 权限模型

> 与 [[角色级权限模型-v1|角色-等级-权限模型]] 和 [[Feat002-Project-项目管理|Project 权限模型]] 对齐。

### 9.1 权限层级

Git 权限分三层：

- `git.read`：只读动作（status / log / diff / show / branch --list）
- `git.write`：低风险写动作（checkout / switch / fetch / pull / 新建分支）
- `git.high-risk`：高风险写动作（commit / merge / rebase / push / branch -d）

### 9.2 权限矩阵（Phase 1）

Git 权限继承自成员在所属项目中的角色：

| 能力 | Owner | Maintainer | Contributor | Viewer | 外部 Agent（受审批）|
|------|:-----:|:----------:|:-----------:|:------:|:-------------------:|
| 只读动作（git.read）| ✅ | ✅ | ✅ | ✅ | ✅ |
| 低风险写（git.write）| ✅ | ✅ | ✅ | ❌ | 按项目策略审批 |
| 高风险写（git.high-risk）| ✅ | ✅ | ❌ | ❌ | 强制审批 |
| 对受保护分支写 | ✅ | ✅ | ❌ | ❌ | 禁止 |
| 配置分支策略 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 绑定/解绑仓库 | ✅ | ✅ | ❌ | ❌ | ❌ |

### 9.3 外部 Agent 的 Git 权限约束

外部 Agent 的 Git 操作受双重约束：

1. **项目级权限包**：由 Project 权限模型决定（见 Project 第 8.4 节）
2. **分支策略**：禁止 Agent 直接操作受保护分支

风险分级：

- 只读动作：默认可执行
- 低风险写动作：按项目策略决定是否审批
- 高风险写动作：默认强制审批
- 受保护分支写动作：禁止（Agent 必须通过分支 + PR 流程）

### 9.4 权限决策规则

- Git 权限取成员项目角色与 Git 级规则的最严格交集
- 所有 Git 动作必须可追溯到 `executionRunId` 与 `projectId`
- Runtime 执行 Git 命令前校验工作区边界（必须属于项目绑定的 `workspaceRoot`）

## 10. 外部 PR/MR 关联

> Phase 1 仅关联外部 PR 状态，不自建 PR 系统。与产品策略「不重造成熟产品」对齐。

### 10.1 PR 关联能力

- 记录外部 PR/MR 链接（GitHub / GitLab / 其他 Git 托管 URL）
- 展示 PR 状态（open / merged / closed / draft），只读
- 将 PR 关联到任务（一个任务可关联多个 PR）

### 10.2 PR 状态同步

- Phase 1：手动刷新或记录时同步状态
- Phase 2：考虑通过 Integration 模块的 webhook 自动同步

### 10.3 非目标（PR/MR）

- 不自建 PR 创建/审查/合并能力
- 不代理外部 PR 操作（评论、approve、merge）
- 不做 PR diff 详情展示（跳转外部链接）

## 11. Git 级事件与通知

> 与 [[Feat001-Core-核心|Core 事件总线]] 和 [[Feat006-Notification-消息中心|Notification 模块]] 对齐。

### 11.1 Git 级领域事件

Git 模块必须发布以下领域事件：

| 事件 | 触发时机 | 典型订阅方 |
|------|---------|-----------|
| `git.repo_bound` | 仓库绑定到项目 | Notification |
| `git.repo_unbound` | 仓库解绑 | Notification |
| `git.action_executed` | Git 动作执行（含风险级别）| Notification、审计 |
| `git.high_risk_action` | 高风险写动作执行 | Notification（Owner/Maintainer）|
| `git.action_rejected` | 动作被分支策略/权限拒绝 | Notification、审计 |
| `git.push_completed` | push 完成 | Notification、Task（回写）|
| `git.merge_completed` | merge 完成 | Notification、Task（回写）|
| `git.branch_protection_violation` | 违反分支保护 | Notification（Owner）、审计 |

### 11.2 通知分发

- 高风险 Git 动作结果通知项目 Owner / Maintainer
- 分支保护违规立即通知 Owner 并记录审计
- push / merge 结果通知任务负责人
- 通知不绕开权限校验

## 12. AI 协作能力

> Git 是 AI 执行代码任务的核心数据源与受控动作出口。

### 12.1 Git 作为 Agent 的代码上下文

Agent 通过 Git 模块获取：

- 当前分支与工作区状态（执行输入）
- 指定范围 diff（理解变更）
- 相关代码文件摘要（Layer 3 知识层）
- 最近提交（理解项目演进）

这些上下文由 AI Hub 策展进入 ContextPack（见 AI Hub 第 7 章）。

### 12.2 Agent 的受控 Git 动作

Agent 在授权与审批约束下可执行 Git 动作：

- 只读动作：默认可执行
- 低风险写动作：按项目策略审批
- 高风险写动作：强制审批
- 受保护分支写动作：禁止

所有 Agent 的 Git 动作必须：

- 绑定 `executionRunId`
- 在项目工作区边界内
- 进入审批门（写动作）
- 记录审计

### 12.3 Agent 不可执行的 Git 操作

- 直接操作受保护分支
- 删除分支（除非符合命名约定的临时分支）
- 强制推送（force push）
- 修改分支策略与仓库绑定

### 12.4 Git 结果对 Agent 的反馈

- 动作成功：返回结构化结果（提交哈希、分支变更、文件统计）
- 动作失败：返回结构化错误（对齐 Core 错误模型，可解析）
- 审批拒绝：执行进入 `pending_approval` 或终止（见 AI Hub 第 9 章）

## 13. 与 Runtime 和执行模型的关系

Git 模块与以下对象强关联：

- `ProjectRuntimePolicy`
- `ExecutionRun`
- `ApprovalRequest`
- `ContextPack`
- `ExecutionArtifact`

说明：

- Git 模块不应绕过 Runtime 直接执行本地命令
- Git 模块的本地能力由 Runtime Provider 层承载
- Runtime 离线时，Git 动作派发失败，执行进入 `blocked`（见 AI Hub 第 6 章）

## 14. 数据模型要求

> 与 [[数据模型-Git|Git 支撑模型]] 对齐，并补充分支策略与 PR 关联。

### 14.1 核心对象

| 实体 | 用途 |
|------|------|
| `Repository` | 仓库绑定与基础信息 |
| `RepositoryBinding` | 项目与仓库的绑定关系（含工作区根目录）|
| `BranchPolicy` | 分支策略与保护规则 |
| `GitDiffSnapshot` | diff 查询结果缓存 |
| `GitActionRecord` | Git 动作审计记录 |
| `ExternalPullRequest` | 外部 PR/MR 关联 |

### 14.2 Repository / RepositoryBinding 建议字段

`Repository`：

- `id`
- `projectId`
- `name`
- `localPath`
- `workspaceRoot`
- `remoteUrl`
- `defaultBranch`
- `role`（primary / secondary / docs）
- `provider`
- `lastScannedAt`
- `lastKnownStatus`
- `createdAt`
- `updatedAt`

### 14.3 BranchPolicy 建议字段

- `id`
- `repoId`
- `protectedBranches`（受保护分支列表）
- `namingConvention`（命名约定规则）
- `enforceOnAgents`（是否对 Agent 强制）
- `createdAt`
- `updatedAt`

### 14.4 ExternalPullRequest 建议字段

- `id`
- `taskId`
- `repoId`
- `externalUrl`（GitHub/GitLab PR URL）
- `externalId`
- `status`（open / merged / closed / draft）
- `lastSyncedAt`
- `createdAt`

### 14.5 GitActionRecord 建议字段

- `id`
- `repoId`
- `executionRunId`
- `actionType`
- `riskLevel`（read / write / high-risk）
- `branch`
- `requestedByType`
- `requestedById`
- `status`
- `summary`
- `createdAt`

### 14.6 关系建议

- `Project 1 - N Repository`
- `Repository 1 - 1 BranchPolicy`
- `Repository 1 - N GitDiffSnapshot`
- `Repository 1 - N GitActionRecord`
- `Task 1 - N ExternalPullRequest`
- `ExecutionRun 1 - N GitActionRecord`

## 15. Phase 1 非目标

Git 模块在 Phase 1 暂不要求：

- 完整 PR / MR 平台能力（创建/审查/合并）
- 远程仓库 API 读写（GitHub/GitLab API 直接操作）
- 复杂分支图谱可视化
- 全功能仓库托管镜像能力
- 自动化大规模批量仓库治理
- 复杂分支保护规则引擎（required reviews、status checks）
- PR diff 详情展示与 PR webhook 自动同步

## 16. GWT 验收场景

### 16.1 正常流：结构化 Git 上下文

```
Given 项目已绑定仓库且 Runtime 在线
When 外部 Agent 围绕任务请求 Git diff 和提交上下文
Then 平台应返回结构化 Git 信息
  And 将其挂入对应 ExecutionRun 的 ContextPack 知识层
```

### 16.2 异常流：高风险动作审批拒绝

```
Given Runtime 尝试对仓库执行需要审批的 Git 写动作
When 审批未通过
Then Git 动作不得实际执行
  And 留下审批拒绝和命令摘要记录
  And 执行进入 failed 或保持 pending_approval
```

### 16.3 边界流：多仓库多执行

```
Given 一个项目绑定多个仓库并存在多个历史执行
When 用户查看任务或项目相关 Git 摘要
Then 系统应能区分仓库来源、最近状态和历史动作记录
```

### 16.4 分支保护

```
Given 仓库 main 分支标记为受保护
When 外部 Agent 尝试直接 push 到 main
Then 操作被拒绝（违反分支保护）
  And 通知项目 Owner 并记录审计
  And 提示 Agent 使用分支 + PR 流程
```

### 16.5 命名约定校验

```
Given 项目配置分支命名约定 task/{identifier}
When 外部 Agent 创建分支 my-feature
Then 操作被拒绝（不符合命名约定）
  And 提示正确命名格式 task/APM-142
```

### 16.6 外部 PR 关联

```
Given 任务 T 关联了一个 GitHub PR
When 用户查看任务详情
Then 任务页展示 PR 链接与状态（open/merged/closed）
  And 点击跳转外部 GitHub
  And 不在平台内代理 PR 操作
```

### 16.7 受控写动作闭环

```
Given Agent 在任务执行中提交代码（commit）
When commit 属于高风险写动作
Then 动作进入审批门（创建 ApprovalRequest）
  And 审批通过后执行 commit
  And 提交哈希回写到任务评论流
```

### 16.8 Runtime 离线

```
Given Runtime 不在线
When Agent 请求 Git 只读上下文
Then 返回 runtime_offline 错误（对齐 Core 错误模型）
  And 执行进入 blocked 状态
  And Runtime 恢复后可重试
```

## 17. 待确认问题

1. 分支命名约定是否强制（Agent 不符合约定直接拒绝 vs 仅告警）
2. `lastScannedAt` / `lastKnownStatus` 的刷新策略（定时扫描 vs 按需查询）
3. 外部 PR 状态同步频率（Phase 1 手动刷新是否足够）
4. 低风险写动作的审批策略默认值（默认审批 vs 默认放行，按项目策略可配置）
5. Git 动作审计记录的保留期（与 Core 审计策略对齐，需确认）
