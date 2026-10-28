---
title: "Project 模块需求说明"
description: 定义 Project 模块在 v2 平台化路线下的职责、项目控制面能力、视图交互、AI 协作契约与 Runtime 协作边界
category: requirement
status:
  - active
tags:
  - Feature
  - requirements
version: 2.1.0
created: 2026-03-22 12:01:27
modified: 2026-07-16 04:22:25
projects: "[[APM-项目中心]]"
---

# Project 模块需求说明

## 1. 模块定位

在 v2 路线下，Project 模块的定位不只是“项目列表 + 仪表盘”。
Project 模块的核心定位是：

> 平台中的项目级控制面与组织容器，负责承载成员、迭代、策略、上下文边界，项目级策略和对外执行范围。

Project 模块是以下能力的统一入口：

### 1.1 模块功能约束范围

1. 项目基础数据与元数据管理
2. 项目成员与权限管理
3. 项目里程碑与版本管理
4. 文档与代码仓库、文档关联管理
5. 项目与 Task 任务、Bug 关联管理
6. 项目上下文与 AI 读取修改数据管理
7. 项目视图、分组、过滤与排序
8. 项目模板与类型体系
9. 项目级事件与通知
10. 项目数据导入导出

### 1.2 术语说明

本模块同时涉及两类时间/节奏对象，需要显式区分：

- **迭代（Iteration）**：项目内固定节奏的工作容器（如 Sprint），是 Task 的归属对象，承载进度与上下文。数据模型对应 `Iteration`。
- **里程碑（Milestone）**：项目内关键检查点或阶段性目标，可跨迭代，用于进度跟踪与汇报。

两者并存：迭代是 Task 的执行归属，里程碑是进度与汇报的标记点。一个里程碑可关联多个迭代和任务。

## 2. 模块目标

### 2.1 整体开发目标

提供可信的项目管理底盘。
为外部 AI 工具和 Local Runtime 提供项目级边界与上下文，不让执行脱离项目治理。
成为平台中所有执行、审批和协作的上层容器。

### 2.2 阶段 1 开发范围

Phase 1 中，Project 模块必须服务以下能力：

- 人类项目经理管理项目
- 项目成员与角色控制
- 里程碑和版本管理
- 任务所属和执行范围绑定
- 外部 Agent 和 Runtime 的项目级约束
- 项目模板与默认配置（至少 1-2 个内置模板）
- 列表视图与看板视图
- 项目级事件总线接入
- 基础导入导出（数据备份与单向迁移）

## 3. 模块依赖

### 3.1 依赖模块

- [Feat001-Core-核心](Feat001-Core-核心.md)
- [Feat013-Auth-登录注册](Feat013-Auth-登录注册.md)
- [Feat005-Git-版本管理](Feat005-Git-版本管理.md)
- [Feat004-Team-团队](Feat004-团队.md)

### 3.2 被依赖模块

- [Feat003-Task-任务](Feat003-Task-任务.md)
- [Feat010-AIHub-人工智能](Feat010-AIHub-人工智能.md)
- [Feat006-Notification-消息中心](Feat006-Notification-消息中心.md)
- [Feat009-Integration-外部链接](Feat009-Integration-外部链接.md)
- [Feat016-Document-文档管理](Feat016-Document-文档管理.md)

## 4. 核心职责

### 4.1 项目空间管理

Project 模块负责管理项目基本信息以及项目元数据，包括：

#### 4.1.1 创建项目、归档项目、删除项目（create、archive、delete）

- 支持新建项目操作，支持通过[Feat012-CreatePanel-统一创建面板](Feat012-Create创建面板.md)新建项目。
- 支持基于模板创建项目，模板可预置状态机、字段、角色、视图配置。
- 支持归档项目操作，归档项目无法进行编辑信息、添加或修改任务、变更人员等操作，归档项目取消对应的自动化任务和消息提醒功能。
- 支持取消归档操作，取消归档可以恢复项目正常功能。
- 支持删除项目。删除项目需要二次确认，需要管理员权限。删除项目后默认归档 14 天，14 天后数据自动删除不可恢复。

#### 4.1.2 编辑项目（edit）

- 支持编辑**项目元数据**：状态、优先级、团队成员、起始时间、结束时间、团队名称、标签。
- 支持编辑**项目基础信息**：项目名称、项目简介、项目关联仓库、项目关联文档、项目图标、项目颜色。
- 支持编辑**项目展示信息**：项目图标、颜色、排序权重，便于在项目列表与导航中识别。

#### 4.1.3 复制项目（duplicate）

- 支持复制项目配置（成员结构、角色、状态机、视图、模板字段），不复制实际任务数据。
- 用于同类项目的快速初始化。

#### 4.1.4 项目标识（identifier）

- 每个项目应有唯一标识符（如 `APM`、`WEB`），用于项目内 Task 的可读编号（如 `APM-142`）。
- 标识符全局唯一，创建后可在项目设置中修改，但修改需校验对历史编号的影响并提示。

### 4.2 项目级迭代与里程碑管理

> 相关功能模块
> - [Feat005-Git-版本管理](Feat005-Git-版本管理.md)
> - [Feat003-Task-任务](Feat003-Task-任务.md)

#### 4.2.1 项目里程碑（milestone）

Project 模块应该包含里程碑管理，项目里程碑应该包括：

1. 里程碑名称
2. 里程碑简介描述
3. 里程碑时间范围（开始/结束日期）
4. 里程碑状态（planned / active / completed / overdue）
5. 里程碑关联任务
6. 里程碑关联 bug
7. 里程碑进度（基于关联任务的完成率自动计算）

迭代信息应进入任务和执行的项目级上下文。

#### 4.2.2 项目发布版本管理（version）

Project 模块应该包含发布版本管理。
项目发布版本应该支持：

1. 发布版本号（语义化版本 semver，如 `1.2.0`）
2. 是否特殊版本（阿尔法、贝塔内测版本等）
3. 发布版本关联 git 版本（tag / commit）
4. 多渠道发布版本管理（stable / beta / nightly）
5. 支持显示发布进度
6. 发布说明（changelog）与关联任务/提交清单

#### 4.2.3 迭代（Iteration）管理

Project 模块应支持迭代节奏管理：

1. 迭代名称与目标
2. 迭代时间窗口（起止日期）
3. 迭代状态（upcoming / active / completed）
4. 迭代关联任务集合
5. 迭代容量与进度（任务数、完成率、预估工时）
6. 当前迭代标记（同一项目同一时间仅一个 active 迭代）

迭代是 Task 的主要归属对象，也是外部 Agent 执行上下文的节奏边界。

### 4.3 项目成员与权限

Project 模块负责维护项目成员与角色关系，并与平台 [[角色级权限模型-v1|角色-等级-权限模型]] 对齐。

#### 4.3.1 项目团队管理

- 支持将团队（Team）整体加入项目，继承团队角色为项目角色。
- 支持项目级覆盖团队默认角色。

#### 4.3.2 项目成员管理

- 支持添加成员（单个或批量）
- 支持变更成员角色
- 支持移除成员（移除时保留其历史活动与审计记录，仅解除当前权限）
- 支持成员退出项目
- 支持查看当前项目的角色配置与成员清单

#### 4.3.3 项目成员权限管理

详见 [第 8 章 项目权限模型](#8-项目权限模型)。

### 4.4 项目级上下文管理

Project 模块负责提供项目级上下文，供任务、执行和外部 Agent 使用。

> 与 [[上下文管理设计|上下文管理系统设计]] 的 Layer 1 基础层对齐。

项目上下文至少应包括：

- 项目摘要（名称、简介、技术栈、类型）
- 项目标识（identifier）
- 成员与角色摘要
- 当前迭代信息
- 项目文档链接
- Git / Runtime 工作区绑定摘要
- 项目策略与约束（编码规范、审批策略、可见性）
- 项目状态与进度摘要

详细契约见 [第 9 章 AI 协作能力](#9-ai-协作能力)。

### 4.5 项目数据看板以及健康度分析

#### 4.5.1 项目基础数据展示

- 任务总数与按状态分布
- Bug 数量与未解决数
- 成员数与活跃成员数
- 创建时间与运行时长

#### 4.5.2 项目关联数据展示

- 关联仓库列表与最近同步状态
- 关联文档列表
- 关联集成（Integration）状态

#### 4.5.3 项目健康度（风险）展示

健康度应基于多维度计算，并支持 AI 风险预警：

- **进度风险**：当前迭代完成率 vs 计划完成率，偏差超阈值标红
- **阻塞风险**：阻塞状态（blocked）任务数与占比
- **逾期风险**：逾期任务数、逾期里程碑数
- **负载风险**：成员任务负载分布（任务数/预估工时）
- **执行风险**：AI 执行失败率、审批积压数
- **综合健康度**：绿（健康）/ 黄（关注）/ 红（风险），可由 AI 综合研判生成文字摘要

#### 4.5.4 项目成员、成本、工时展示

- 成员任务分布
- 预估/实际工时对比（若启用工时字段）
- Phase 1 只做基础展示，不做复杂成本核算

#### 4.5.5 项目进展展示（版本、里程碑）

- 里程碑进度条与时间线
- 发布版本进度与渠道状态
- 迭代燃尽概览（基于任务完成率）

## 5. 项目状态机

### 5.1 项目状态定义

| 状态 | 说明 | 可编辑 | 接收新任务 | 触发自动化 |
|------|------|--------|-----------|-----------|
| `planning` | 规划中，项目初始化阶段 | 是 | 是 | 否 |
| `active` | 进行中，正常运转 | 是 | 是 | 是 |
| `on_hold` | 暂停，临时冻结 | 受限 | 否 | 否 |
| `completed` | 已完成，主动收尾 | 受限 | 否 | 否 |
| `archived` | 已归档，只读 | 否 | 否 | 否 |

### 5.2 状态流转规则

```
planning → active → completed → archived
              ↓ ↑
           on_hold
```

- `planning → active`：项目经理手动启动
- `active ↔ on_hold`：可双向切换
- `active → completed`：项目经理手动标记完成
- `* → archived`：归档操作（completed 或 active 均可归档）
- `archived → active`：取消归档回到归档前状态
- 非法状态跳转必须被拒绝并记录审计

### 5.3 状态与能力的联动

- `on_hold` / `completed` / `archived` 状态下，停止任务自动化、消息提醒、AI 执行派发。
- `archived` 状态下，禁止编辑信息、添加任务、变更人员。
- 状态变更必须进入项目活动记录与审计。

## 6. 项目模板与类型体系

### 6.1 模板定位

项目模板用于快速初始化同类项目，预置以下配置：

- 默认状态机
- 默认字段与字段值域
- 默认项目角色与权限包
- 默认视图配置
- 默认标签集合
- 默认文档结构建议

### 6.2 项目类型（type）

Phase 1 至少支持以下项目类型：

| 类型 | 说明 | 适用场景 |
|------|------|---------|
| `software` | 软件研发 | 代码项目，绑定 Git 仓库，含迭代与发布版本 |
| `product` | 产品设计 | 需求与设计为主，文档关联为主 |
| `general` | 通用项目 | 不限定场景的协作项目 |

### 6.3 内置模板（Phase 1）

至少交付：

- **软件研发模板**：默认迭代节奏、开发/测试/PM 角色、bug/feature 标签、列表+看板视图、Git 集成预设
- **通用项目模板**：基础角色、通用状态机、列表视图

### 6.4 模板管理

- 内置模板为系统级，不可删除，可被项目继承后覆盖
- 支持将现有项目「另存为模板」（Phase 2 增强）
- 模板字段集合应可扩展，不锁定固定 schema

## 7. 项目视图、分组、过滤与排序

> 对标 Linear 的核心交互能力。Phase 1 交付列表视图与看板视图。

### 7.1 视图类型

| 视图 | Phase 1 | 说明 |
|------|---------|------|
| 列表视图 | ✅ | 项目下所有对象的平铺列表，支持列配置 |
| 看板视图 | ✅ | 按状态/优先级/负责人分组的卡片看板 |
| 日历视图 | Phase 2 | 按时间维度展示 |
| 甘特视图 | Phase 2 | 依赖关系与时间线 |
| 表格视图 | Phase 2 | 类电子表格的批量编辑 |

### 7.2 分组（group by）

- 按状态、优先级、负责人、标签、迭代、里程碑分组
- 看板视图的列由分组字段决定

### 7.3 过滤（filter）

- 按状态、优先级、负责人、标签、迭代、时间范围过滤
- 支持组合条件（AND）
- Phase 2 增强复杂条件（OR、嵌套）

### 7.4 排序（sort）

- 按创建时间、更新时间、优先级、状态、标题排序
- 支持项目在导航中的手动排序（sortOrder 字段）

### 7.5 保存视图（saved view）

- 支持将「分组 + 过滤 + 排序」组合保存为命名视图
- 支持项目级共享视图与个人视图
- 保存视图可作为项目默认入口

### 7.6 跨项目视图

- Phase 1 至少提供「我的聚焦」：当前用户在所有项目中被分配/关注的 Task 聚合视图
- 复杂跨项目仪表盘列为 Phase 1 非目标

## 8. 项目权限模型

> 与 [[角色级权限模型-v1|角色-等级-权限模型]] 对齐。角色定义职责，等级定义放权程度，二者正交。

### 8.1 项目级角色

| 角色 | 说明 | 典型权限 |
|------|------|---------|
| Owner（项目所有者） | 项目创建者或转让接收者，每项目至少 1 人 | 全部权限，含删除、转让、归档 |
| Maintainer（维护者） | 核心协作成员 | 项目配置、成员管理、审批、状态机变更 |
| Contributor（贡献者） | 普通执行成员 | 创建/编辑任务、提交执行、评论 |
| Viewer（只读） | 观察者 | 只读访问 |

### 8.2 项目级权限矩阵（Phase 1）

| 能力 | Owner | Maintainer | Contributor | Viewer |
|------|:-----:|:----------:|:-----------:|:------:|
| 查看项目 | ✅ | ✅ | ✅ | ✅ |
| 编辑项目信息 | ✅ | ✅ | ❌ | ❌ |
| 管理成员 | ✅ | ✅ | ❌ | ❌ |
| 创建/编辑任务 | ✅ | ✅ | ✅ | ❌ |
| 删除项目 | ✅ | ❌ | ❌ | ❌ |
| 归档项目 | ✅ | ✅ | ❌ | ❌ |
| 状态机变更 | ✅ | ✅ | ❌ | ❌ |
| 审批 AI 写操作 | ✅ | ✅ | ❌ | ❌ |
| 配置 Runtime 策略 | ✅ | ✅ | ❌ | ❌ |
| 查看审计记录 | ✅ | ✅ | 受限 | ❌ |

### 8.3 可见性（visibility）

- `private`：仅项目成员可见
- `internal`：组织内成员可见（依赖团队层级）
- `public`：公开可发现（Phase 2）

### 8.4 与外部 Agent 的权限映射

> 这是产品差异化重点，详见 [第 9 章](#9-ai-协作能力)。

外部接入 Agent 不直接持有项目角色，而是通过以下方式获得项目级权限：

1. 在项目内注册为 `external_agent` 主体
2. 映射到角色（建议首批：开发工程师 / 测试工程师 / 项目助理）
3. 映射到等级（Intern / Junior / Senior）
4. 接收项目级权限包（`project.read` / 受控写权限）
5. 所有写操作默认进入审批门

### 8.5 权限决策规则

权限由四个维度共同决定，并受项目策略覆盖：

1. 主体类型（human / platform_ai_member / external_agent）
2. 项目级角色（Owner / Maintainer / Contributor / Viewer）
3. 等级（Intern / Junior / Intermediate / Senior / Lead）
4. 项目策略（审批策略、Runtime 边界、可见性）

冲突时取最严格策略，避免权限意外放大。

## 9. AI 协作能力

> 本章定义 AI 主体（平台内 AI 成员、外部接入 Agent）如何使用 Project 模块。
> 这是平台对标 Linear 的差异化核心：Project 不仅是人类的项目容器，也是 AI 可读、可治理的执行边界。

### 9.1 AI 对项目的访问契约

Project 模块必须为 AI 主体提供结构化访问入口，而不是让 Agent 解析前端页面。

#### 9.1.1 读取（read）

AI 主体可读取：

- 项目基础信息与元数据
- 项目成员与角色
- 当前迭代与里程碑
- 项目文档链接
- Runtime / Workspace 绑定与策略摘要
- 项目健康度摘要

#### 9.1.2 写入（write，受审批约束）

AI 主体在权限与审批约束下可：

- 创建任务（进入审批）
- 更新任务状态（按风险分级审批）
- 创建迭代（高风险，需 Maintainer+ 审批）
- 提交执行结果与产物引用
- 发起审批请求

#### 9.1.3 禁止（forbidden）

AI 主体在 Phase 1 禁止：

- 删除项目、归档项目
- 变更项目成员角色
- 修改项目可见性
- 修改 Runtime 策略边界
- 修改项目级审批策略

这些动作必须由人类项目经理完成。

### 9.2 项目级 ContextPack 契约

Project 模块必须输出符合 [[上下文管理设计|上下文管理系统设计]] Layer 1 基础层规范的项目上下文包。

`ContextPack.project` 至少包含：

```
project:
  id
  name
  identifier          # 如 APM
  description         # ≤50 字摘要
  type                # software / product / general
  techStack           # ≤8 个关键词
  status              # planning / active / on_hold / completed / archived
  currentIteration:   # 当前迭代摘要
    name
    window            # 起止日期
    progress          # 完成率
  milestones:         # 当前关注里程碑（≤3）
    - name, dueDate, progress
  members:            # 成员摘要
    - role, count
  gitBindings:        # 仓库绑定摘要
    - name, branch, role
  conventions:        # 编码规范/约束引用
  constraints:        # 项目级约束（如：AI 写操作需审批）
  runtimePolicy:      # Runtime 边界摘要
    allowedProviders
    workspaceRoots
```

### 9.3 AI 成员在项目中的生命周期

| 阶段 | 动作 | 执行者 |
|------|------|--------|
| 注册 | 将外部 Agent 加入项目并映射角色/等级 | 人类项目经理 |
| 授权 | 配置项目级权限包与 Runtime 边界 | 人类项目经理 |
| 执行 | 围绕任务读取上下文、创建执行、提交审批 | AI 主体 |
| 评估 | 记录执行结果与评价 | 平台 + 人类 |
| 移除 | 解除项目权限，保留审计 | 人类项目经理 |

### 9.4 AI 风险预警

Project 模块应支持 AI 基于项目健康度生成风险预警：

- 进度偏差预警
- 阻塞积压预警
- 逾期预警
- 执行失败率异常预警

预警通过 [[Feat006-Notification-消息中心|Notification 模块]] 推送给项目经理，并写入项目活动流。

### 9.5 AI 操作的项目级边界约束

所有 AI 执行必须受项目边界约束：

- Runtime 派发的工作区根目录必须属于当前项目绑定的工作区
- AI 可访问的 Provider 范围由项目策略限定
- AI 的写操作必须可追溯到 `projectId`
- 跨项目访问必须显式授权，禁止隐式跨项目读取

## 10. 项目级事件与通知

> 与 [[Feat001-Core-核心|Core 模块事件总线]] 和 [[Feat006-Notification-消息中心|Notification 模块]] 对齐。

### 10.1 项目级领域事件

Project 模块必须发布以下领域事件：

| 事件 | 触发时机 | 典型订阅方 |
|------|---------|-----------|
| `project.created` | 项目创建 | Notification、AI Hub |
| `project.updated` | 项目信息/元数据变更 | Notification |
| `project.status_changed` | 项目状态机流转 | Notification、自动化 |
| `project.archived` | 项目归档 | 所有订阅方（停止自动化） |
| `project.member_changed` | 成员增删/角色变更 | Notification、权限缓存 |
| `project.iteration_changed` | 迭代创建/切换/完成 | Notification、AI Hub |
| `project.milestone_changed` | 里程碑状态变更 | Notification |
| `project.risk_alert` | AI 风险预警 | Notification |
| `project.runtime_policy_changed` | Runtime 策略变更 | Runtime、AI Hub |

### 10.2 通知订阅

- 项目成员默认订阅本项目的事件
- 支持按事件类型与角色配置订阅偏好
- 高风险事件（如 `risk_alert`、`status_changed → archived`）强制通知 Owner / Maintainer

### 10.3 自动化触发

- 项目状态变更可触发自动化（如 `active → completed` 时生成项目总结）
- 自动化规则在 Phase 1 保持最小集，复杂自动化列入 Phase 2

## 11. 数据导入导出与迁移

### 11.1 导出（export）

- 支持导出单个项目数据（JSON 格式），含项目配置、成员、迭代、任务、活动、审计摘要
- 用于数据备份与跨实例迁移
- 导出操作需 Maintainer+ 权限，并记录审计

### 11.2 导入（import）

Phase 1 至少支持单向导入：

- 从 Linear 导入（CSV / API）
- 从 Jira 导入（CSV）
- 通用 CSV 导入

导入内容至少映射：项目信息、任务、状态、优先级、成员（按邮箱匹配）。

### 11.3 非目标（Phase 1）

- 不做双向实时同步（与 Linear / Jira 的双向 sync 列为 Phase 2）
- 不做全量历史导入的完美字段映射
- 不做跨平台评论/附件迁移

## 12. 核心功能需求

### FR-PJ-01 项目创建与维护

Project 模块必须支持：

- 创建项目（支持基于模板）
- 编辑项目
- 归档项目 / 取消归档
- 删除项目（二次确认 + 管理员权限 + 14 天保留）
- 复制项目配置
- 项目列表与筛选

最小字段建议：

- `name`
- `identifier`
- `description`
- `type`
- `visibility`
- `status`
- `icon`
- `color`
- `sortOrder`
- `templateId`

### FR-PJ-02 项目成员管理

Project 模块必须支持：

- 添加成员（单个 / 批量 / 按团队）
- 变更成员角色
- 移除成员（保留历史与审计）
- 查看当前项目的角色配置
- 与 [[角色级权限模型-v1|角色-等级-权限模型]] 对齐的权限决策

### FR-PJ-03 迭代管理

Project 模块必须支持：

- 创建迭代
- 编辑迭代
- 查看当前迭代
- 将任务归入迭代
- 标记当前 active 迭代

说明：

- 迭代管理是 Phase 1 必需项
- 不能再作为“应做增强项”处理
- 外部 Agent 的执行上下文应包含任务所处迭代

### FR-PJ-04 项目文档与知识链接

> 文档实体管理已迁移至 [[Feat016-Document-文档管理|Document 模块]] 统一承载（内容存储、索引、版本、关联）。
> Project 模块保留「项目级文档入口」的引用关系，文档实体的创建/编辑/检索由 Document 模块负责。

Project 模块应支持维护项目级文档引用入口（文档实体由 Document 模块管理），例如：

- 需求文档
- 设计文档
- API 文档
- 外部知识链接（external 类型文档）

这些文档引用可用于构建 `ContextPack.project.documents`（由 Document 模块提供数据，AI Hub 策展）。

### FR-PJ-05 项目级 Runtime / Workspace 约束

Project 模块必须支持为 Runtime 提供项目级边界。

至少需要承载：

- 项目可访问的工作区根目录
- 项目允许使用的 Provider 范围
- 项目允许接入的 CLI Provider
- 项目级审批策略（默认审批 / 按风险分级）

说明：

- Project 模块不直接执行本地能力
- 但必须定义本地执行发生在哪个项目边界内

### FR-PJ-06 项目健康度与状态摘要

Project 模块在 Phase 1 要求支持基础项目状态摘要 + 多维健康度。

至少可承载：

- 当前任务数 / 按状态分布
- 当前执行数 / 待审批数
- 进度风险 / 阻塞风险 / 逾期风险 / 负载风险
- 基础风险摘要（支持 AI 研判文字摘要）
- 综合健康度（绿/黄/红）

### FR-PJ-07 项目模板与类型

Project 模块必须支持：

- 至少 1-2 个内置模板（软件研发模板、通用项目模板）
- 基于模板创建项目
- 内置模板预置状态机、字段、角色、视图

### FR-PJ-08 项目状态机

Project 模块必须支持完整项目状态机：

- 五个状态（planning / active / on_hold / completed / archived）
- 合法流转规则校验
- 状态与自动化、通知、编辑能力的联动
- 状态变更进入活动记录与审计

### FR-PJ-09 项目视图

Project 模块必须支持（Phase 1）：

- 列表视图（可配置列）
- 看板视图（按状态/优先级/负责人分组）
- 基础过滤与排序
- 保存命名视图（项目级 / 个人级）
- 「我的聚焦」跨项目聚合视图

### FR-PJ-10 项目级事件与通知

Project 模块必须：

- 发布项目级领域事件（见 [第 10 章](#10-项目级事件与通知)）
- 接入 Notification 模块
- 支持订阅偏好配置
- 高风险事件强制通知

### FR-PJ-11 导入导出

Project 模块必须支持（Phase 1）：

- 单项目数据导出（JSON）
- 从 Linear / Jira / CSV 单向导入
- 导入导出操作记录审计

### FR-PJ-12 AI 协作能力

Project 模块必须支持：

- AI 主体按契约读取项目上下文
- AI 主体受审批约束写入（任务、执行结果）
- 项目级 ContextPack 输出
- AI 成员在项目中的生命周期管理
- AI 操作的项目边界校验与审计

## 13. 与任务和执行的关系

Project 模块是 Task 和 Execution 的上层容器。

必须保证：

- Task 必须归属于 Project
- ExecutionRun 必须归属于 Project
- ApprovalRequest 必须可追溯到 Project
- Runtime 派发必须受项目边界约束
- 所有 AI 写操作必须可追溯到 Project

## 14. 数据模型要求

> 与 [[数据模型-Project|Project / Task 主线模型]] 对齐。

### 14.1 Project 实体

在现有模型基础上，至少应支持以下方向：

- 基本项目信息（`name`、`description`、`type`、`visibility`、`status`）
- 项目标识（`identifier`）
- 展示信息（`icon`、`color`、`sortOrder`）
- 模板来源（`templateId`）
- 成员关系
- 迭代关系
- 里程碑关系
- 文档链接
- Runtime / workspace 约束
- 项目策略摘要

### 14.2 建议实体

| 实体 | 用途 |
|------|------|
| `Project` | 项目主实体 |
| `ProjectMember` | 成员与角色关系 |
| `Iteration` | 迭代容器 |
| `Milestone` | 里程碑标记点 |
| `ProjectVersion` | 发布版本 |
| `ProjectDocLink` | 文档与知识链接（> 已迁移至 [[Feat016-Document-文档管理|Document 模块]] 的 `DocumentLink`）|
| `ProjectRuntimePolicy` | Runtime / Provider / Workspace 边界策略 |
| `ProjectTemplate` | 项目模板定义 |
| `SavedView` | 保存的视图配置 |
| `ProjectEvent` | 项目级领域事件记录（可选，可复用 Core 的 DomainEvent） |

### 14.3 关键字段补充建议

- `Project`：补充 `identifier`、`icon`、`color`、`sortOrder`、`templateId`、`currentIterationId`
- `ProjectMember`：补充 `level`（等级）、`addedBy`、`removedAt`
- `ProjectRuntimePolicy`：`allowedProviders`、`workspaceRoots`、`approvalPolicy`、`cliProviders`
- `Milestone`：`startDate`、`endDate`、`status`、`progress`
- `ProjectVersion`：`semver`、`channel`、`gitRef`、`changelog`、`isPreRelease`

### 14.4 关系建议

- `Project 1 - N ProjectMember`
- `Project 1 - N Iteration`
- `Project 1 - N Milestone`
- `Project 1 - N ProjectVersion`
- `Project 1 - N Task`
- `Project 1 - N ProjectDocLink`
- `Project 1 - 1 ProjectRuntimePolicy`
- `Project N - 1 ProjectTemplate`

## 15. Phase 1 非目标

Project 模块在 Phase 1 暂不要求：

- 复杂外部 PM 平台双向实时同步（Linear / Jira 双向 sync）
- 完整经营分析大盘
- 平台内 AI 成员组织树
- 复杂跨项目视图与仪表盘
- 日历 / 甘特 / 表格视图
- 复杂自动化规则引擎
- 全量历史导入的完美字段映射
- 自定义项目模板编辑器（「另存为模板」）

## 16. GWT 验收场景

### 16.1 正常流：AI 执行在项目边界内

```
Given 项目经理创建了项目、成员和迭代
When 为某个任务分配外部 Agent 并启动执行
Then 执行应在该项目边界内获得上下文和权限
  And 执行记录、审批请求均可追溯到项目
```

### 16.2 异常流：项目边界违规

```
Given Runtime 尝试访问不属于当前项目的工作区或执行
When 平台校验项目边界
Then 请求应被拒绝并留下审计记录
```

### 16.3 边界流：项目摘要展示

```
Given 一个项目存在多个迭代、多个成员和多个待审批执行
When 项目经理查看项目摘要
Then 系统应能展示当前迭代、执行状态和待审批数量
  And 健康度综合判断为绿/黄/红
```

### 16.4 模板创建

```
Given 项目经理选择「软件研发模板」
When 基于模板创建新项目
Then 项目应预置默认状态机、开发/测试/PM 角色、列表+看板视图
  And 项目标识符可用且全局唯一
```

### 16.5 状态机流转

```
Given 项目处于 active 状态且有自动化规则
When 项目经理将项目切换为 on_hold
Then 自动化与通知应暂停
  And 任务无法被新增
  And 状态变更进入审计
```

### 16.6 AI 风险预警

```
Given 项目当前迭代完成率显著低于计划
When AI 研判检测到进度风险
Then 系统生成风险预警并通知 Owner/Maintainer
  And 健康度摘要更新为关注或风险
  And 预警写入项目活动流
```

### 16.7 AI 读取项目上下文

```
Given 外部 Agent 被分配项目内任务
When Agent 请求项目级上下文
Then 平台返回符合 ContextPack.project 契约的结构化数据
  And 数据中包含当前迭代、约束、Runtime 边界摘要
```

### 16.8 导入迁移

```
Given 项目经理从 Linear 导出 CSV
When 执行单向导入
Then 项目、任务、状态、优先级、成员（按邮箱匹配）应被正确映射
  And 导入操作记录审计
```

## 17. 待确认问题

1. 项目模板是否需要支持「自定义模板编辑器」（Phase 2 增强项，需排期确认）
2. 工时字段是否在 Phase 1 启用（影响成本/工时看板的实际数据来源）
3. 跨项目「我的聚焦」视图的聚合范围（仅 assigned / 含 watched / 含 commented）
4. 项目级自动化规则在 Phase 1 是否交付最小集（如完成时自动生成总结）
5. 里程碑与迭代的进度计算口径是否需要独立配置
