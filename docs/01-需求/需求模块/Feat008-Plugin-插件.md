---
title: "Plugin 模块需求说明"
description: 定义 Plugin 模块在 v2 平台化路线下作为平台扩展机制（扩展点注册、Provider 扩展、视图扩展）的受控扩展边界与权限治理
category: requirement
status:
  - active
tags:
  - Plugin
  - Feature
  - requirements
  - extension
version: 2.1.0
created: 2026-07-15 06:40:44
modified: 2026-07-16 03:55:22
projects: "[[APM-项目中心]]"
---

# Plugin 模块需求说明

## 1. 模块定位

在 v2 路线下，Plugin 模块不应再被定义为“插件优先架构的中心”。

Plugin 模块的核心定位是：

> 平台的**扩展机制**，负责扩展点注册、Provider 能力扩展与控制面视图扩展的受控边界，让平台在保持治理前提下可扩展新能力。

Plugin 与 Integration 的边界：

- **Plugin = 扩展机制**：改变平台**能力**（注册新 Provider、新视图、新接入点、新工具）
- **Integration = 连接器**：连接**外部系统**（GitHub/Jira/Slack，读写外部数据）

二者关系：Integration 可作为一种 Plugin 类型存在（连接器插件），但 Phase 1 两者分开建模 —— Plugin 聚焦扩展机制本身，Integration 聚焦外部系统连接。

### 1.1 模块功能约束范围

1. 扩展点注册与生命周期管理
2. Manifest 声明与权限校验
3. 扩展能力暴露（受控 API）
4. 扩展作用域控制（全局 / 项目级）
5. 扩展审计与隔离

### 1.2 与其他模块的边界

- Plugin 模块**不承载**具体业务逻辑，只提供扩展注册与治理机制。
- Plugin 模块**不承载**外部系统连接（由 Integration 承载），但 Integration 可作为 Plugin 类型。
- Plugin 模块**不绕过**审批链，扩展不能改写主执行模型。
- Plugin 是**被动扩展层**：围绕 `Project / Task / ExecutionRun / ApprovalRequest` 工作，不得反过来定义主平台。

## 2. 模块目标

### 2.1 第一目标

提供可控的扩展注册与生命周期管理能力。

### 2.2 第二目标

确保扩展能力只能通过显式声明的权限和受控 API 使用核心能力。

### 2.3 第三目标

让平台未来可以扩展更多 AI 工具、连接器和视图，而不破坏当前核心执行模型。

## 3. Phase 1 范围

Phase 1 中，Plugin 模块**仅交付最小扩展边界**，不是主交付中心。

Phase 1 优先支持（最小集）：

- 扩展清单与注册模型
- Manifest 声明与权限校验
- 扩展作用域控制（全局 / 项目级）
- 扩展审计
- 为 Integration / Runtime Provider 的扩展预留接口

Phase 1 **不交付**：

- 插件运行时（沙箱、热加载、实际执行环境）
- 插件市场
- 第三方生态治理

## 4. 模块依赖

### 4.1 依赖模块

- [Feat001-Core-核心](Feat001-Core-核心.md)
- [Feat013-Auth-登录注册](Feat013-Auth-登录注册.md)

### 4.2 被依赖模块

- [Feat009-Integration-外部链接](Feat009-Integration-外部链接.md)（Integration 可作为 Plugin 类型）
- [Feat014-Runtime-本地运行时](Feat014-Runtime-本地运行时.md)（Provider 扩展预留）

## 5. 核心职责

### 5.1 扩展点类型

Plugin 模块定义平台的扩展点类型：

| 扩展点 | 说明 | Phase 1 |
|--------|------|---------|
| `provider` | 注册新 Runtime Provider（如新 CLI Agent） | 预留 |
| `view` | 注册控制面附加视图 | 预留 |
| `connector` | 注册外部连接器（Integration 作为插件） | 预留 |
| `tool` | 注册 Agent 可调用工具 | 预留 |
| `hook` | 注册事件钩子（如任务创建后触发） | 预留 |

Phase 1 只定义扩展点类型清单与注册框架，不交付实际扩展点运行时。

### 5.2 扩展注册与生命周期

Plugin 模块负责：

- 安装或注册扩展
- 启用和禁用扩展
- 记录扩展作用域
- 维护扩展版本和兼容性信息

### 5.3 扩展权限边界

Plugin 模块必须要求扩展通过 Manifest 显式声明：

- 可访问资源
- 可执行动作
- 作用域（全局 / 项目级）
- 风险级别

至少区分：

- 只读扩展
- 写入扩展
- 管理型扩展

### 5.4 扩展能力暴露

Plugin 模块应只暴露受控能力，而不是开放原始内部实现。

Phase 1 暴露的受控能力（预留接口）：

- 读取项目和任务摘要
- 读取受控上下文
- 注册控制面附加视图
- 注册额外 Provider

### 5.5 审计与隔离

Plugin 模块必须保证扩展的关键动作可追溯。

至少记录：

- 扩展身份（pluginId / version）
- 调用动作
- 关联项目或执行
- 成功/失败

## 6. 扩展权限模型

> 与 [[角色级权限模型-v1|角色-等级-权限模型]] 和 [[Feat013-Auth-登录注册|Auth 权限基础]] 对齐。

### 6.1 扩展权限层级

扩展权限通过 Manifest 声明，分三层：

| 层级 | 说明 | 审批 |
|------|------|------|
| `read` | 读取项目/任务摘要、受控上下文 | 默认允许（授权后）|
| `write` | 写入平台数据、触发动作 | 按项目策略审批 |
| `admin` | 管理型操作（配置、安装其他扩展）| 强制审批 |

### 6.2 扩展权限矩阵（Phase 1）

扩展安装与管理的权限：

| 能力 | admin | Owner | Maintainer | 其他 |
|------|:-----:|:-----:|:----------:|:----:|
| 安装全局扩展 | ✅ | ❌ | ❌ | ❌ |
| 安装项目级扩展 | ✅ | ✅ | ✅ | ❌ |
| 启用/禁用项目级扩展 | ✅ | ✅ | ✅ | ❌ |
| 配置扩展 | ✅ | ✅ | ✅ | ❌ |
| 撤销扩展 | ✅ | ✅ | ❌ | ❌ |

### 6.3 扩展调用的权限校验

- 扩展调用平台 API 时，结合**扩展声明权限 + 调用者用户权限**双重校验
- 扩展不能绕开调用者权限（插件 + 用户双重校验，见 Auth FR-AUTH-06）
- 扩展的写操作进入审批门

## 7. Manifest 规范

### 7.1 Manifest 必含字段

- `pluginId`：扩展唯一标识
- `name`：扩展名称
- `version`：版本（semver）
- `type`：扩展点类型（provider / view / connector / tool / hook）
- `scopeType`：作用域（global / project）
- `entryPoints`：入口声明
- `permissions`：权限声明（read / write / admin + 具体资源）
- `compatibility`：兼容性约束（平台版本、协议版本）
- `riskLevel`：风险级别

### 7.2 Manifest 校验

- 注册时校验 Manifest 完整性与合法性
- 校验权限声明不超出允许范围
- 校验兼容性约束
- 校验入口声明有效性

## 8. AI 协作能力

> Plugin 为 Agent 接入与工具扩展提供机制，但 Phase 1 只预留框架。

### 8.1 Plugin 与 Agent 接入的关系

PRD 接入策略 `MCP > CLI > API/Plugin`，其中 API/Plugin 是 Agent 接入方式之一：

- CLI / MCP 接入：由 Runtime + AI Hub 承载（Phase 1 主线）
- API / Plugin 接入：未来可通过 Plugin 机制扩展新的 Agent 接入方式

### 8.2 Plugin 不承载的 AI 能力（Phase 1）

- 不承载 Agent 执行编排（由 AI Hub）
- 不承载 Agent 身份映射（由 AI Hub）
- 不承载 Agent 上下文策展（由 AI Hub）
- 不交付可运行的 Agent 插件运行时（Phase 2/3）

### 8.3 Plugin 的扩展预留

Phase 1 为以下 AI 相关扩展预留接口：

- 新 CLI Agent Provider 扩展（如未来接入新 AI 工具）
- 新工具扩展（Agent 可调用的工具）
- 新接入方式扩展（API/Plugin 接入路径）

## 9. 事件与通知

> 与 [[Feat001-Core-核心|Core 事件总线]] 和 [[Feat006-Notification-消息中心|Notification 模块]] 对齐。

### 9.1 Plugin 级领域事件

Plugin 模块必须发布以下领域事件：

| 事件 | 触发时机 | 典型订阅方 |
|------|---------|-----------|
| `plugin.installed` | 扩展安装 | Notification、审计 |
| `plugin.enabled` / `plugin.disabled` | 扩展启停 | Notification |
| `plugin.uninstalled` | 扩展卸载 | Notification、审计 |
| `plugin.config_changed` | 扩展配置变更 | 审计 |
| `plugin.action_executed` | 扩展调用平台 API | 审计 |
| `plugin.permission_violation` | 扩展越权尝试 | Notification（admin）、审计 |

### 9.2 安全告警

- 扩展越权尝试触发安全告警
- 扩展异常调用（高频失败）触发告警
- 告警通知 admin 与项目 Owner

## 10. 核心功能需求

### FR-PL-01 扩展清单管理

Plugin 模块必须支持：

- 列出扩展
- 注册扩展
- 启用扩展
- 禁用扩展
- 卸载扩展

最小字段建议：

- `pluginId`
- `name`
- `version`
- `type`
- `scopeType`
- `status`
- `riskLevel`

### FR-PL-02 Manifest 与权限声明

Plugin 模块必须支持解析扩展 Manifest，并校验：

- 扩展基础信息
- 入口声明
- 权限声明（不超出允许范围）
- 兼容性约束

### FR-PL-03 扩展作用域控制

Plugin 模块必须支持：

- 全局扩展
- 项目级扩展

不同作用域对应不同的权限和可见范围。

### FR-PL-04 扩展 API 边界

Plugin 模块必须为扩展提供受控 API。

Phase 1 中，扩展不得直接绕过平台访问：

- 本地文件系统
- Runtime 进程
- 数据库主表

这些能力必须通过受控 Provider 或服务接口获取。

### FR-PL-05 扩展审计

Plugin 模块必须支持对扩展关键动作进行审计记录。

重点动作：

- 安装/卸载/启停
- 配置修改
- 对外请求
- 写入平台数据
- 触发执行相关动作

### FR-PL-06 扩展点类型注册（预留）

Plugin 模块必须定义扩展点类型清单（provider / view / connector / tool / hook），Phase 1 只交付类型定义与注册框架，不交付运行时。

### FR-PL-07 Plugin 级事件与通知

Plugin 模块必须：

- 发布 Plugin 级领域事件（见 [第 9 章](#9-事件与通知)）
- 接入 Notification 模块
- 越权与异常告警正确分发

## 11. 数据模型要求

> 与 [[数据模型-Plugin|Plugin 支撑模型]] 对齐。

### 11.1 核心对象

| 实体 | 用途 |
|------|------|
| `PluginManifest` | 扩展声明（权限、入口、兼容性）|
| `InstalledPlugin` | 已安装/注册扩展 |
| `PluginConfig` | 扩展配置（全局/项目级）|
| `PluginPermissionGrant` | 扩展权限授予 |
| `PluginActionRecord` | 扩展调用审计 |

### 11.2 InstalledPlugin 建议字段

- `id`
- `pluginId`
- `name`
- `version`
- `type`（扩展点类型）
- `manifest`（完整 Manifest JSON）
- `scopeType`（global / project）
- `scopeId`（项目级时为 projectId）
- `status`（installed / enabled / disabled）
- `riskLevel`
- `installedAt`
- `installedBy`

### 11.3 PluginConfig 建议字段

- `id`
- `installedPluginId`
- `projectId`
- `enabled`
- `config`
- `updatedAt`

### 11.4 PluginPermissionGrant 建议字段

- `id`
- `installedPluginId`
- `permission`（read / write / admin + 资源）
- `grantedAt`
- `grantedBy`

### 11.5 关系建议

- `InstalledPlugin 1 - 1 PluginManifest`
- `InstalledPlugin 1 - N PluginConfig`
- `InstalledPlugin 1 - N PluginPermissionGrant`
- `InstalledPlugin 1 - N PluginActionRecord`

## 12. Phase 1 非目标

Plugin 模块在 Phase 1 暂不要求：

- 插件运行时（沙箱、热加载、实际执行环境）
- 成熟插件市场（发现、安装、评分、计费）
- 前后端完整沙箱体系
- 复杂插件计费与发布机制
- 大规模社区生态治理
- 可运行的 Agent 插件（Phase 2/3）
- 实际扩展点运行时（Provider/View/Tool/Hook 的实际执行）

## 13. GWT 验收场景

### 13.1 正常流：只读扩展注册与调用

```
Given 管理员注册了一个具备只读权限的扩展
When 扩展请求读取项目和任务摘要
Then 平台应在授权范围内返回数据
  And 记录扩展调用来源审计
```

### 13.2 异常流：越权尝试

```
Given 扩展尝试执行超出权限范围的写动作
When Plugin 模块校验权限
Then 请求应被拒绝
  And 记录越权审计并告警 admin
```

### 13.3 边界流：多扩展并发

```
Given 同一项目启用了多个扩展
When 它们同时订阅平台事件并调用受控 API
Then 系统应能区分扩展身份、作用域和各自调用记录
```

### 13.4 Manifest 校验

```
Given 一个 Manifest 声明了超出允许范围的权限
When 注册扩展时校验
Then 注册被拒绝
  And 返回权限声明非法错误
```

### 13.5 项目级扩展隔离

```
Given 项目 P 启用了扩展 E（项目级）
When 项目 Q 尝试调用 E
Then 调用被拒绝（作用域隔离）
  And 提示扩展不在该项目作用域
```

## 14. 待确认问题

1. 扩展点类型（provider/view/connector/tool/hook）的 Phase 1 交付深度（仅类型定义 vs 含基础注册流程）
2. Manifest 权限声明的具体资源粒度（粗粒度 read/write vs 细粒度资源级）
3. 扩展运行时（沙箱/热加载）的 Phase 2 排期与技术选型
4. Integration 作为 Plugin 类型的正式融合时机（Phase 2？）
5. 扩展计费与市场是否在路线图内（Phase 3？）
