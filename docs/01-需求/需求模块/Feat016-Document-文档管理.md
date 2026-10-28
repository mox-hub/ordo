---
title: "Document 模块需求说明"
description: 定义 Document 模块作为项目文档仓库（内容存储/索引/版本/关联）与 ContextPack 知识层数据源，统一接管原 ProjectDocLink 与 Integration 文档链接职责
category: requirement
status:
  - active
tags:
  - Document
  - Feature
  - requirements
  - knowledge
  - context
version: 2.1.0
created: 2026-07-16 05:30:00
modified: 2026-07-16 05:30:00
projects: "[[APM-项目中心]]"
---

# Document 模块需求说明

> 本模块为 v2.1.0 新增核心模块，解决平台「有文档引用、无文档实体」的断裂。
> 统一接管原 Project 的 `ProjectDocLink` 与 Integration 的文档链接职责。

## 1. 模块定位

在 v2 路线下，APM 反复引用「文档」（ContextPack、任务关联、知识层），但此前只有 URL 链接（`ProjectDocLink`、Integration 文档链接），**没有文档实体**。这导致 Agent 只能拿到链接，无法获得文档内容与摘要。

Document 模块的核心定位是：

> 平台的**项目文档仓库**，负责文档内容存储、结构化索引、版本管理、与项目/任务/bug 的关联，并作为 ContextPack 知识层的核心数据源，让 Agent 获得文档内容而非裸链接。

### 1.1 模块功能约束范围

1. 文档内容存储（Markdown 为主）
2. 文档类型与分类（需求/设计/API/决策/规范/外部链接）
3. 文档索引与全文检索
4. 文档版本管理
5. 文档与项目/任务/bug 的关联
6. 外部文档源同步（Obsidian / Notion / Confluence / Git 仓库）
7. 作为 ContextPack 知识层数据源

### 1.2 与其他模块的边界

- Document 模块**统一接管**原 Project 的 `ProjectDocLink` 与 Integration 的文档链接职责，消除文档能力碎片化。
- Document 模块**承载**文档内容与索引；Integration 退回到非文档类外部连接（GitHub PR / Slack 通知）。
- Document 模块**是 ContextPack 知识层（Layer 3）的核心数据源**，提供文档摘要与按需加载的完整内容。
- Document 模块**不自建**富文本编辑器（Phase 1 以 Markdown 为主），而是聚焦内容存储、索引与关联。

### 1.3 与 Obsidian 的定位关系

APM Document 与 Obsidian **错开定位**：

| 维度 | APM Document | Obsidian |
|------|-------------|----------|
| 定位 | **项目文档**（与项目/任务强关联，为 Agent 提供上下文）| **个人知识库**（网状笔记、双向链接）|
| 关联 | 文档 ↔ 项目/任务/bug 结构化关联 | 笔记 ↔ 笔记双向链接 |
| 用途 | 团队协作上下文、Agent 执行输入 | 个人思考、知识沉淀 |
| 同步 | 可从 Obsidian 导入/同步文档作为项目文档来源 | - |

APM 不替代 Obsidian，而是**消费** Obsidian 等「文档源」，将其内容转化为与项目/任务关联的、可供 Agent 使用的项目文档。

## 2. 模块目标

### 2.1 第一目标

为平台提供项目文档实体（内容 + 元数据 + 关联），让 Agent 获得文档内容而非裸链接。

### 2.2 第二目标

让文档与项目、任务、bug 建立结构化关联，成为协作上下文的一部分。

### 2.3 第三目标

作为 ContextPack 知识层数据源，通过索引与摘要让 Agent 高效获取相关文档。

### 2.4 第四目标

支持从外部文档源（Obsidian/Notion/Confluence/Git）同步文档，避免重复维护。

## 3. Phase 1 范围

Phase 1 中，Document 模块必须先服务：

- 文档内容存储（Markdown 为主）
- 文档类型与分类
- 文档与项目/任务/bug 的关联
- 基础索引与检索（标题、标签、全文）
- 作为 ContextPack 知识层数据源
- 手动创建与编辑文档

Phase 1 可预留但不强求：

- 外部文档源自动同步（Obsidian/Notion 导入）
- 文档版本历史回退
- 富文本/所见即所得编辑器
- 复杂文档权限粒度

## 4. 模块依赖

### 4.1 依赖模块

- [Feat001-Core-核心](Feat001-Core-核心.md)（审计、事件、全文检索支撑）
- [Feat013-Auth-登录注册](Feat013-Auth-登录注册.md)（权限基础）

### 4.2 被依赖模块

- [Feat002-Project-项目管理](Feat002-Project-项目管理.md)（项目文档关联）
- [Feat003-Task-任务](Feat003-Task-任务.md)（任务关联文档）
- [Feat010-AIHub-人工智能](Feat010-AIHub-人工智能.md)（ContextPack 知识层数据源）

## 5. 核心职责

### 5.1 文档内容存储

Document 模块负责存储文档内容：

- Markdown 为主要格式
- 文档正文（content）
- 文档元数据（标题、描述、类型、标签）
- 文档来源（手动创建 / 外部同步）

### 5.2 文档类型与分类

支持文档分类，便于组织与检索：

| 类型 | 说明 | 典型场景 |
|------|------|---------|
| `requirement` | 需求文档 | PRD、需求规格 |
| `design` | 设计文档 | 架构设计、方案设计 |
| `api` | API 文档 | 接口契约、数据模型 |
| `decision` | 决策记录 | ADR、技术选型 |
| `standard` | 规范文档 | 编码规范、流程规范 |
| `external` | 外部链接 | 外部系统文档引用（不同步内容）|

### 5.3 文档索引与检索

Document 模块必须支持文档索引：

- 标题、描述、标签索引
- 全文检索（基于 Core 的检索能力）
- 按类型、标签、项目、关联对象筛选
- 索引结果供 ContextPack 相关性排序使用

### 5.4 文档版本管理

- 文档编辑产生新版本
- 版本历史可追溯（谁、何时、改了什么）
- Phase 1 支持版本记录查看，不支持回退（回退 Phase 2）

### 5.5 文档关联管理

Document 模块负责维护文档与其他对象的关联：

- 文档 ↔ 项目（项目级文档）
- 文档 ↔ 任务（任务关联文档）
- 文档 ↔ bug（bug 关联文档）
- 文档 ↔ 文档（相关文档，非 Obsidian 式双链，Phase 1 为单向引用）

### 5.6 外部文档源同步

支持从外部文档源导入/同步文档：

| 源 | Phase | 方式 |
|----|-------|------|
| Obsidian | Phase 2 | 文件系统扫描 / 导入 |
| Notion | Phase 2 | API 同步 |
| Confluence | Phase 2 | API 同步 |
| Git 仓库 | Phase 1 可选 | 仓库内 markdown 文档索引 |
| 手动创建 | ✅ Phase 1 | Web 编辑器 / API |

### 5.7 ContextPack 知识层数据源

> 这是 Document 模块的核心价值：让 Agent 获得文档**内容摘要**而非裸链接。

详见 [第 8 章](#8-contextpack-知识层数据源)。

## 6. 文档状态机

### 6.1 文档状态

| 状态 | 说明 | 可编辑 |
|------|------|--------|
| `draft` | 草稿 | 是 |
| `published` | 已发布（正式版本）| 是 |
| `deprecated` | 已废弃（保留但标记过时）| 受限 |
| `archived` | 已归档（只读）| 否 |

### 6.2 状态流转

```
draft → published → deprecated → archived
            ↓ ↑
        (编辑产生新版本，保持 published)
```

- `draft → published`：文档作者/维护者发布
- `published → deprecated`：标记过时（如对应的功能已移除）
- `deprecated → archived`：归档只读
- `published` 状态下编辑产生新版本，状态保持 published
- 文档状态影响 ContextPack 是否纳入（deprecated 降权，archived 不纳入）

## 7. 文档关联模型

### 7.1 关联类型

| 关联 | 说明 | 示例 |
|------|------|------|
| 文档 → 项目 | 项目级文档 | 项目 P 的需求文档 |
| 文档 → 任务 | 任务关联文档 | 任务 T 关联 API 契约 |
| 文档 → bug | bug 关联文档 | bug B 关联复现步骤文档 |
| 文档 → 文档 | 相关文档（单向引用）| 设计文档引用需求文档 |

### 7.2 关联用途

- **上下文组装**：任务的关联文档自动成为 ContextPack 候选
- **影响分析**：文档变更时，通知关联的任务负责人
- **导航**：任务详情页展示关联文档，文档页展示关联任务

### 7.3 自动关联建议（Phase 2）

- AI 基于任务描述与文档索引，建议关联文档
- 基于文档内容相似度，建议相关文档

## 8. ContextPack 知识层数据源

> 与 [[上下文管理设计|上下文管理系统设计]] 和 [[Feat010-AIHub-人工智能|AI Hub 策展]] 对齐。Document 是 ContextPack **Layer 3 知识层**的核心数据源。

### 8.1 Document 在 ContextPack 中的角色

| 层 | Document 提供的内容 |
|----|-------------------|
| Layer 1 基础层 | 项目文档索引摘要（文档数量、关键文档列表）|
| Layer 2 任务层 | 任务直接关联的文档引用 |
| **Layer 3 知识层** | **相关文档摘要**（按相关性排序，AI 策展）|
| Layer 4 扩展层 | 完整文档内容（Agent 按需通过 MCP 拉取）|

### 8.2 文档摘要输出

Document 模块输出的文档摘要应可被 `ContextPack` 直接引用：

- 文档标题 + 类型 + 状态
- 一句话摘要（description 或正文首段）
- 相关性分数（由 AI Hub 策展时计算）
- 压缩级别（full / summary / reference）
- 完整内容的按需加载引用

### 8.3 按需加载

Agent 执行中需要完整文档内容时，通过 MCP Tool（`get_context`）按需拉取：

- `get_context("doc_content", docId)` → 返回完整正文
- 由 AI Hub 策展的 Layer 4 机制承载

## 9. 权限模型

> 与 [[角色级权限模型-v1|角色-等级-权限模型]] 和 [[Feat002-Project-项目管理|Project 权限模型]] 对齐。

### 9.1 权限层级

文档权限分三层：

- `doc.read`：查看文档
- `doc.write`：创建/编辑文档
- `doc.manage`：管理文档（删除、归档、变更状态）

### 9.2 权限矩阵（Phase 1）

权限继承自成员在所属项目中的角色：

| 能力 | Owner | Maintainer | Contributor | Viewer | 外部 Agent（受审批）|
|------|:-----:|:----------:|:-----------:|:------:|:-------------------:|
| 查看文档（doc.read）| ✅ | ✅ | ✅ | ✅ | ✅ |
| 创建/编辑文档（doc.write）| ✅ | ✅ | ✅ | ❌ | 审批后 |
| 管理文档（doc.manage）| ✅ | ✅ | ❌ | ❌ | ❌ |
| 删除/归档文档 | ✅ | ✅ | ❌ | ❌ | ❌ |

### 9.3 文档可见性

- 文档可配置可见性：项目内可见 / 公开
- 外部 Agent 只能读取其项目范围内的文档
- deprecated 文档对 Agent 降权提示，archived 文档不纳入 ContextPack

### 9.4 外部 Agent 的文档权限约束

- 读取文档：默认可执行（项目范围内）
- 创建/编辑文档：审批后可执行
- 删除/管理文档：禁止（AI 不可删除文档）
- Agent 可写回执行产出的文档（如执行报告），进入审批

### 9.5 权限决策规则

- 文档权限取成员项目角色与文档级规则的最严格交集
- 所有文档操作必须可追溯到操作主体
- 跨项目文档访问必须显式授权

## 10. AI 协作能力

> Document 是 Agent 获取项目知识与上下文的核心来源。

### 10.1 Document 作为 Agent 的知识源

Agent 通过 Document 模块获取：

- 任务关联文档（理解任务背景与需求）
- 相关文档摘要（Layer 3 知识层策展）
- 决策记录（理解技术选型与约束）
- 规范文档（遵循编码规范与流程）
- 完整文档内容（Layer 4 按需加载）

### 10.2 Agent 的受控文档操作

Agent 在授权与审批约束下可：

- 读取项目范围内文档（默认允许）
- 创建文档（如执行报告、分析文档，审批后）
- 编辑文档（审批后）
- 关联文档到任务（审批后）

### 10.3 Agent 不可执行的操作

- 删除文档
- 变更文档状态（published → deprecated）
- 管理文档权限
- 修改文档关联（审批后除外）

### 10.4 文档回写

Agent 执行产出的文档（如代码分析报告、测试报告）可回写：

- 作为 `ExecutionArtifact` 沉淀
- 可选创建为项目文档（审批后）
- 回写以系统注释形式关联到任务

### 10.5 文档索引支撑 AI 策展

Document 模块的索引为 AI Hub 策展提供基础：

- 文档相关性排序（基于关键词、关联、时效）
- 文档摘要生成（供 Layer 3 压缩）
- 文档新鲜度（影响 ContextPack 策展权重）

## 11. 外部文档源同步

> 与 Obsidian 错开定位：APM 消费文档源，转化为项目文档。

### 11.1 同步模型

```
外部文档源（Obsidian/Notion/Confluence/Git）
    ↓ 同步（导入 / 定期拉取）
APM Document（项目文档实体：内容 + 元数据 + 关联）
    ↓ 策展
ContextPack（知识层摘要 / 按需加载）
```

### 11.2 同步策略

| 源 | Phase 1 | Phase 2 |
|----|---------|---------|
| 手动创建 | ✅ | ✅ |
| Git 仓库 markdown | 可选 | ✅ 自动索引 |
| Obsidian | 导入 | ✅ 文件系统同步 |
| Notion | - | ✅ API 同步 |
| Confluence | - | ✅ API 同步 |

### 11.3 同步规则

- 同步产生的是 APM 文档**副本**（保留来源引用 `sourceRef`）
- 同步文档可被编辑（产生 APM 本地版本，标记与源的差异）
- 双向同步列为 Phase 2/3（Phase 1 以单向导入为主）
- `external` 类型文档不同步内容，只存链接与元数据

### 11.4 非目标（同步）

- 不替代 Obsidian/Notion 的编辑能力
- 不做实时双向同步（Phase 1 单向导入）
- 不做复杂冲突解决

## 12. 事件与通知

> 与 [[Feat001-Core-核心|Core 事件总线]] 和 [[Feat006-Notification-消息中心|Notification 模块]] 对齐。

### 12.1 Document 级领域事件

Document 模块必须发布以下领域事件：

| 事件 | 触发时机 | 典型订阅方 |
|------|---------|-----------|
| `document.created` | 文档创建 | Notification |
| `document.updated` | 文档内容更新（新版本）| Notification（关联任务负责人）|
| `document.published` | 文档状态变为 published | Notification |
| `document.deprecated` | 文档标记过时 | Notification（关联对象）|
| `document.archived` | 文档归档 | Notification、AI Hub（从索引移除）|
| `document.linked` | 文档关联到任务/项目 | Notification |
| `document.synced` | 外部源同步完成 | Notification、审计 |

### 12.2 通知分发

- 文档更新通知关联任务的负责人
- 文档废弃通知关联对象的相关人员
- 文档同步完成通知文档维护者

## 13. 核心功能需求

### FR-DOC-01 文档创建与编辑

Document 模块必须支持：

- 创建文档（Markdown 为主）
- 编辑文档内容
- 设置文档元数据（标题、描述、类型、标签）
- 文档状态管理（draft / published / deprecated / archived）

最小字段建议：

- `title`
- `content`（Markdown 正文）
- `type`（requirement / design / api / decision / standard / external）
- `status`（draft / published / deprecated / archived）
- `projectId`
- `sourceType`（manual / obsidian / notion / confluence / git）
- `sourceRef`（外部源引用）
- `tags`

### FR-DOC-02 文档类型与分类

Document 模块必须支持：

- 内置文档类型（requirement / design / api / decision / standard / external）
- 按类型筛选与组织
- 标签管理

### FR-DOC-03 文档索引与检索

Document 模块必须支持：

- 标题、描述、标签索引
- 全文检索
- 按类型、标签、项目、关联对象筛选
- 索引结果供 ContextPack 相关性排序

### FR-DOC-04 文档版本管理

Document 模块必须支持：

- 编辑产生新版本
- 版本历史记录（作者、时间、变更摘要）
- 版本查看（Phase 1 不支持回退）

### FR-DOC-05 文档关联管理

Document 模块必须支持：

- 文档关联到项目
- 文档关联到任务
- 文档关联到 bug
- 文档间相关引用
- 关联文档自动成为 ContextPack 候选

### FR-DOC-06 ContextPack 知识层数据源

Document 模块必须支持：

- 输出文档摘要供 ContextPack 引用
- 按相关性排序（与 AI Hub 协作）
- 支持按需加载完整内容（Layer 4）

### FR-DOC-07 外部文档源同步

Document 模块必须支持（Phase 1 最小 / Phase 2 完整）：

- 手动创建文档（Phase 1）
- Git 仓库 markdown 索引（Phase 1 可选）
- Obsidian/Notion/Confluence 同步（Phase 2）

### FR-DOC-08 统一接管文档职责

Document 模块必须：

- 接管原 Project 的 `ProjectDocLink` 职责
- 接管原 Integration 的文档链接职责
- 提供迁移路径（现有文档链接转化为 Document 实体或 external 类型文档）

### FR-DOC-09 Document 级事件与通知

Document 模块必须：

- 发布 Document 级领域事件（见 [第 12 章](#12-事件与通知)）
- 接入 Notification 模块
- 文档更新/废弃通知关联对象

## 14. 数据模型要求

### 14.1 核心对象

| 实体 | 用途 |
|------|------|
| `Document` | 文档主实体（内容 + 元数据）|
| `DocumentVersion` | 文档版本历史 |
| `DocumentLink` | 文档与项目/任务/bug 的关联 |
| `DocumentIndex` | 文档索引（全文检索支撑）|

### 14.2 Document 建议字段

- `id`
- `projectId`
- `title`
- `description`
- `content`（Markdown 正文）
- `type`（requirement / design / api / decision / standard / external）
- `status`（draft / published / deprecated / archived）
- `tags`
- `sourceType`（manual / obsidian / notion / confluence / git）
- `sourceRef`（外部源引用，如 Obsidian 文件路径）
- `sourceUrl`（外部源 URL，external 类型用）
- `currentVersion`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

### 14.3 DocumentVersion 建议字段

- `id`
- `documentId`
- `versionNumber`
- `content`
- `changeSummary`
- `createdBy`
- `createdAt`

### 14.4 DocumentLink 建议字段

- `id`
- `documentId`
- `targetType`（project / task / bug / document）
- `targetId`
- `relation`（primary / reference / related）
- `createdBy`
- `createdAt`

### 14.5 关系建议

- `Project 1 - N Document`
- `Document 1 - N DocumentVersion`
- `Document 1 - N DocumentLink`
- `Task N - N Document`（通过 DocumentLink）
- `Document 1 - N DocumentIndex`（索引条目）

### 14.6 迁移说明

- 原 `ProjectDocLink` 迁移为 `Document`（external 类型）+ `DocumentLink`
- 原 Integration 文档链接迁移为 `Document`（external 类型）
- 迁移保留原链接 URL 与描述

## 15. Phase 1 非目标

Document 模块在 Phase 1 暂不要求：

- 富文本/所见即所得编辑器（Phase 1 Markdown）
- 文档版本回退（Phase 2）
- Obsidian/Notion/Confluence 自动同步（Phase 2）
- AI 驱动的自动关联建议（Phase 2）
- 复杂文档权限粒度（文档级 ACL）
- 实时双向同步
- 文档评论与协作编辑（Phase 2）
- Obsidian 式双向链接图谱

## 16. GWT 验收场景

### 16.1 正常流：文档作为任务上下文

```
Given 任务 T 关联了 API 契约文档 D
When 外部 Agent 围绕任务 T 请求上下文
Then ContextPack Layer 2 包含文档 D 的摘要
  And Agent 可通过 Layer 4 按需加载完整内容
```

### 16.2 异常流：权限不足

```
Given 用户 U 对项目 P 无访问权限
When U 尝试查看项目 P 的文档
Then 访问被拒绝
  And 不泄露文档内容
```

### 16.3 边界流：相关文档策展

```
Given 项目有 50 篇文档，任务 T 是 bug 类型
When AI Hub 为任务 T 策展 ContextPack
Then Layer 3 包含与 bug 相关的文档摘要（如复现步骤、相关规范）
  And 按相关性排序，控制在 Token 预算内
```

### 16.4 文档更新通知

```
Given 文档 D 关联了任务 T1、T2、T3
When 文档 D 内容更新（新版本）
Then T1、T2、T3 的负责人收到通知
```

### 16.5 外部文档导入

```
Given 用户从 Obsidian 导入一篇笔记作为项目文档
When 执行导入
Then 创建 APM Document（sourceType=obsidian，sourceRef=文件路径）
  And 可编辑产生 APM 本地版本
```

### 16.6 Agent 写回文档

```
Given Agent 执行完成，产出代码分析报告
When Agent 请求创建文档（审批后）
Then 创建文档（status=draft）
  And 文档关联到执行的任务
  And 以系统注释形式通知任务负责人
```

### 16.7 废弃文档处理

```
Given 文档 D 被标记为 deprecated
When AI Hub 策展 ContextPack
Then 文档 D 在 Layer 3 中降权（或排除）
  And 提示该文档已过时
```

## 17. 待确认问题

1. 文档内容存储方式（数据库正文字段 vs 对象存储引用 vs Git 仓库）
2. 全文检索实现（PostgreSQL 全文索引 vs Elasticsearch，影响 Core 依赖）
3. Git 仓库 markdown 索引是否在 Phase 1 交付（与 Git 模块协作）
4. Obsidian 同步的 Phase 2 技术方案（文件系统扫描 vs Obsidian 插件）
5. external 类型文档是否需要定期验证链接可用性
6. 文档与 bug 的关联（bug 是否作为 Task 子类型，还是独立实体）
