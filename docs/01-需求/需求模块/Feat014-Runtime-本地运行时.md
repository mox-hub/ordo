---
title: "Runtime 模块需求说明"
description: 定义 Runtime（本地运行时）模块在 v2 平台化路线下作为控制面本地执行面的职责、连接会话、Provider 能力（含命令执行）与 AI 协作边界
category: requirement
status:
  - active
tags:
  - Runtime
  - Feature
  - requirements
  - local-runtime
  - execution
version: 2.1.0
created: 2026-07-16 04:25:19
modified: 2026-07-16 04:25:19
projects: "[[APM-项目中心]]"
---

# Runtime 模块需求说明

> 本文档整合了原 Terminal 模块（Feat007）的命令执行能力，作为 Runtime Provider 层的一个 Capability。
> 原 Feat007-Terminal 已废弃，命令执行不再作为独立业务模块，统一归入 Runtime 的受控执行能力。

## 1. 模块定位

在 v2 双表面架构下，Runtime 是平台的**本地执行面**，与 Web 控制面对应。

Runtime 模块的核心定位是：

> 平台中部署在本地的执行层，负责承载文件、Git、命令执行、CLI Agent 等本地能力，在控制面编排下完成受控执行，并将结果、证据、状态回传。

Runtime 不是独立于人使用的工具，而是：

- 接收控制面（AI Hub）的执行编排
- 在项目工作区边界内执行本地动作
- 采集输出与证据并回传
- 接受审批门的阻塞与恢复

### 1.1 模块功能约束范围

1. Runtime 注册、连接与会话管理
2. 能力上报（workspace、providers、capabilities）
3. Provider 层本地能力（文件、Git、命令执行、Process、Credentials、CLI）
4. 执行生命周期本地管理（接收派发、状态、回传）
5. 工作区边界与路径治理
6. 产物与证据收集

### 1.2 与其他模块的边界

- Runtime **不承载**业务逻辑与权限决策（由控制面 Project/Task/Core 承载），只执行受控动作。
- Runtime **不直接编排** ExecutionRun（由 AI Hub 编排），只接收派发并执行。
- Runtime **不绕过**审批门，需审批的写动作必须等待控制面审批结果。
- Runtime 是**被动执行层**：在控制面授权范围内执行，自身不发起业务动作。
- 命令执行（原 Terminal 能力）是 Runtime 的一个 **Provider Capability**，不是独立业务模块。

## 2. 模块目标

### 2.1 第一目标

提供可信的本地执行面，让控制面编排的任务能在本地受控执行。

### 2.2 第二目标

确保本地执行发生在项目工作区边界内，不越权访问其他项目或系统资源。

### 2.3 第三目标

将本地执行的输出、产物、证据结构化回传，支撑执行回放与审计。

## 3. Phase 1 范围

Phase 1 中，Runtime 模块必须先服务：

- Runtime 注册与稳定连接维持
- 能力上报（工作区、Provider 标志）
- CLI Agent Provider 执行主线（codex / claude-code）
- 命令执行能力（非交互式单命令，含风险分级与审批）
- 工作区边界校验
- 产物与证据回传

Phase 1 暂不要求：

- 多 Runtime 复杂编排
- 长生命周期交互式 shell 托管
- 完整多 Provider 调度编排

## 4. 模块依赖

### 4.1 依赖模块

- [Feat001-Core-核心](Feat001-Core-核心.md)
- [Feat002-Project-项目管理](Feat002-Project-项目管理.md)
- [Feat013-Auth-登录注册](Feat013-Auth-登录注册.md)

### 4.2 被依赖模块

- [Feat003-Task-任务](Feat003-Task-任务.md)
- [Feat005-Git-版本管理](Feat005-Git-版本管理.md)
- [Feat010-AIHub-人工智能](Feat010-AIHub-人工智能.md)
- [Feat006-Notification-消息中心](Feat006-Notification-消息.md)

## 5. 核心职责

### 5.1 Runtime 注册与连接

Runtime 模块负责维护本地节点与平台的连接关系。

至少包括：

- Runtime 注册（绑定用户、设备）
- 会话建立与维持（心跳）
- 断线重连
- 状态上报（online / offline / unreachable）

### 5.2 能力上报

Runtime 必须向控制面上报自身能力，供 AI Hub 派发前判断。

至少包括：

- 工作区根目录（workspaceRoots）
- 可用 Provider 标志（providerFlags：file / git / terminal / process / cli）
- CLI Provider 列表（cliProviders：codex / claude-code）
- 能力标志（capabilityFlags）
- 策略约束（policyConstraints）

### 5.3 Provider 层能力

Runtime 通过 Provider 层承载各类本地能力。每个 Provider 是一个受控能力出口。

#### 5.3.1 Provider 清单（Phase 1）

| Provider | 能力 | Phase 1 |
|----------|------|---------|
| `provider-file` | 文件读写、目录扫描 | ✅ |
| `provider-git` | Git 状态、diff、受控写动作 | ✅ |
| `provider-terminal` | 命令执行、输出采集 | ✅ |
| `provider-process` | 进程创建、监控、终止 | ✅ |
| `provider-credentials` | 受控凭证访问 | ✅ |
| `provider-cli` | CLI Agent 会话（codex / claude-code）| ✅ |

#### 5.3.2 provider-git 与 Git 模块的协作

- Git 模块（Feat005）定义动作、风险分级、审批策略
- `provider-git` 在 Runtime 侧执行实际 Git 命令
- Git 模块不直接执行本地命令，通过 Runtime 的 `provider-git` 承载

#### 5.3.3 provider-terminal（命令执行 Capability）

> 原 Terminal 模块（Feat007）的能力迁入此处。命令执行是 Runtime 的一个 Provider 能力，不是独立业务模块。

`provider-terminal` 负责：

- 在指定工作目录执行非交互式命令
- 采集标准输出、标准错误、退出码、耗时
- 命令风险分级（见 [第 8 章](#8-命令执行能力原-terminal)）
- 输出证据化（见 [第 9 章](#9-输出证据化)）

### 5.4 执行生命周期本地管理

Runtime 负责在本地维护执行的状态：

- 接收 AI Hub 派发的 ExecutionRun
- 执行状态本地流转（与 AI Hub 状态机对齐）
- 审批等待与恢复（pending_approval）
- 结果与错误归档回传

### 5.5 工作区边界治理

Runtime 必须确保所有本地动作发生在项目允许的工作区内：

- 工作区根目录校验（属于项目绑定的 workspaceRoots）
- 路径规范化与逃逸防护（禁止 `../` 跳出工作区）
- 跨项目访问隔离

### 5.6 产物与证据收集

Runtime 负责收集执行产物与证据：

- 执行日志
- 结构化错误摘要
- 测试结果摘要
- 产物路径引用
- 原始输出引用

## 6. Runtime 注册与连接

> 与 [[运行时数据模型-v1|Runtime 数据模型]] 和 [[本地运行时通信协议-v1|Local Runtime 通信协议]] 对齐。

### 6.1 Runtime 实体

Runtime 表示一个本地执行节点的长期标识：

- 绑定用户与设备
- 记录 hostPlatform、runtimeVersion、protocolVersion
- 状态：online / offline / unreachable / disabled

### 6.2 RuntimeSession

RuntimeSession 表示一段活跃连接：

- 绑定 Runtime
- 会话状态：active / expired / disconnected / revoked
- 心跳维持
- 连接模式（connectionMode）

### 6.3 断线与恢复

- Runtime 断线时，其上的执行进入 `blocked` 状态（见 AI Hub 第 6 章）
- Runtime 恢复连接后，blocked 执行可重新派发
- 断线期间不丢失执行记录

## 7. 能力上报与派发约束

### 7.1 RuntimeCapabilitySnapshot

Runtime 连接后上报能力快照：

- `workspaceRoots`：可访问的工作区根目录
- `providerFlags`：可用 Provider
- `cliProviders`：CLI Agent Provider
- `capabilityFlags`：能力标志
- `policyConstraints`：策略约束

### 7.2 派发前校验

AI Hub 派发执行前，校验：

- 目标 Runtime 在线
- Runtime 能力覆盖执行所需 Provider
- 工作区根目录属于项目绑定范围
- CLI Provider 在项目允许范围内

校验失败返回结构化错误（对齐 Core 错误模型）。

## 8. 命令执行能力（原 Terminal）

> 原 Feat007-Terminal 的核心能力。命令执行是 AI 执行代码任务的基础能力，需受控治理。

### 8.1 命令风险分级

Runtime 必须为命令建立风险分级模型：

| 风险级别 | 示例 | 审批策略 |
|---------|------|---------|
| 只读（read）| `ls` `dir` `cat` `rg` `git status` | 默认允许 |
| 低风险（write）| 本地测试、构建、lint | 按项目策略 |
| 高风险（high-risk）| 删除文件、覆盖写入、环境变更、脚本执行 | 默认审批 |

### 8.2 命令安全治理

Phase 1 纳入基础命令安全治理：

- **命令黑名单**：禁止明确危险命令（如 `rm -rf /`、`rm -rf ~`、强制格式化）
- **危险模式检测**：正则匹配危险模式（如 `> /dev/sda`、`curl | sh` 链式执行）
- **工作区逃逸防护**：禁止 `cd` 到项目工作区外、禁止 `../` 跳出
- **输出脱敏**：密钥、Token、凭证不落明文输出

### 8.3 命令执行边界

- 命令必须在项目工作区内执行（cwd 校验）
- Shell / 进程调用方式受约束
- 环境变量注入受策略控制
- 超时与终止机制（避免命令卡死）
- **Phase 1 仅支持非交互式单命令**，不支持长会话交互式 shell

### 8.4 命令输出采集

`provider-terminal` 必须采集：

- 标准输出（stdout）
- 标准错误（stderr）
- 退出码（exitCode）
- 执行耗时（durationMs）
- 中断状态

## 9. 输出证据化

Runtime 必须将命令输出沉淀为结构化执行证据：

- 执行日志（TerminalExecutionRecord）
- 输出分片（TerminalOutputChunk，流式）
- 结构化错误摘要
- 测试结果摘要
- 产物路径引用

证据可回写到 ExecutionRun，支撑执行回放。

## 10. 权限模型

> 与 [[角色级权限模型-v1|角色-等级-权限模型]] 对齐。原 `terminal.*` 权限语义归入 Runtime 执行层。

### 10.1 权限层级

Runtime 执行相关权限分三层（原 Terminal 权限归入）：

- `runtime.read`（原 terminal.read）：只读命令、查看执行
- `runtime.execute`（原 terminal.execute）：低风险命令执行
- `runtime.high-risk`（原 terminal.high-risk）：高风险命令执行

### 10.2 权限矩阵（Phase 1）

权限继承自成员在所属项目中的角色：

| 能力 | Owner | Maintainer | Contributor | Viewer | 外部 Agent（受审批）|
|------|:-----:|:----------:|:-----------:|:------:|:-------------------:|
| 只读命令（runtime.read）| ✅ | ✅ | ✅ | ✅ | ✅ |
| 低风险命令（runtime.execute）| ✅ | ✅ | ✅ | ❌ | 按项目策略审批 |
| 高风险命令（runtime.high-risk）| ✅ | ✅ | ❌ | ❌ | 强制审批 |
| Runtime 注册与管理 | ✅ | ✅ | ❌ | ❌ | ❌ |

### 10.3 外部 Agent 的命令权限约束

外部 Agent 的命令执行受双重约束：

1. **项目级权限包**：由 Project 权限模型决定
2. **命令风险分级**：高风险强制审批，黑名单命令禁止

- 只读命令：默认可执行
- 低风险命令：按项目策略决定是否审批
- 高风险命令：默认强制审批
- 黑名单命令：禁止（无论权限）

### 10.4 权限决策规则

- Runtime 权限取成员项目角色与 Runtime 级规则的最严格交集
- 所有命令执行必须可追溯到 `executionRunId` 与 `projectId`
- Runtime 执行命令前校验工作区边界
- 黑名单与危险模式检测优先于权限审批（即使有权限也禁止黑名单命令）

## 11. AI 协作能力

> Runtime 是 Agent Surface 的本地执行承载者。

### 11.1 Runtime 作为 Agent 执行的承载层

- 外部 Agent（通过 CLI Provider）在 Runtime 侧执行
- Agent 调用的文件/Git/命令能力由 Runtime Provider 层承载
- Runtime 执行的所有动作受项目边界与审批门约束

### 11.2 Agent 与 Runtime 的关系

| 场景 | Agent 行为 | Runtime 行为 |
|------|-----------|-------------|
| Agent 自带终端执行 | 在自己进程执行 | Runtime 不介入（事后记录）|
| Agent 通过 Runtime 执行 | 调用 Runtime Provider | 受控执行 + 证据化 + 审计 |

### 11.3 Runtime 不承载的能力

- 不做权限决策（由控制面决定）
- 不做执行编排（由 AI Hub 决定）
- 不做上下文策展（由 AI Hub 决定）
- 不绕过审批门

### 11.4 命令执行对 Agent 的反馈

- 命令成功：返回结构化结果（退出码、输出摘要、产物引用）
- 命令失败：返回结构化错误（对齐 Core 错误模型，可解析）
- 命令被审批阻塞：执行进入 `pending_approval`（见 AI Hub 第 9 章）
- 命令被黑名单拦截：直接拒绝，记录审计

## 12. 事件与通知

> 与 [[Feat001-Core-核心|Core 事件总线]] 和 [[Feat006-Notification-消息中心|Notification 模块]] 对齐。

### 12.1 Runtime 级领域事件

Runtime 模块必须发布以下领域事件：

| 事件 | 触发时机 | 典型订阅方 |
|------|---------|-----------|
| `runtime.registered` | Runtime 注册 | Notification、AI Hub |
| `runtime.online` / `runtime.offline` | 连接状态变化 | Notification、AI Hub（执行 blocked）|
| `runtime.capability_updated` | 能力上报更新 | AI Hub（派发前校验）|
| `command.executed` | 命令执行（含风险级别）| Notification、审计 |
| `command.high_risk` | 高风险命令执行 | Notification（Owner/Maintainer）|
| `command.rejected` | 命令被黑名单/审批拒绝 | Notification、审计 |

### 12.2 通知分发

- 高风险命令执行通知项目 Owner / Maintainer
- Runtime 离线导致执行 blocked 时通知发起人
- 命令被拒绝时通知 Agent 与 Owner

## 13. 核心功能需求

### FR-RT-01 Runtime 注册与连接

Runtime 模块必须支持：

- Runtime 注册（绑定用户、设备）
- 会话建立与心跳维持
- 断线重连
- 状态上报

### FR-RT-02 能力上报

Runtime 模块必须支持：

- 上报 workspaceRoots
- 上报 providerFlags
- 上报 cliProviders
- 上报 capabilityFlags 与 policyConstraints

### FR-RT-03 Provider 层能力

Runtime 模块必须支持（Phase 1）：

- `provider-file`：文件读写、目录扫描
- `provider-git`：Git 状态、diff、受控写动作（与 Git 模块协作）
- `provider-terminal`：命令执行、输出采集
- `provider-process`：进程创建、监控、终止
- `provider-credentials`：受控凭证访问
- `provider-cli`：CLI Agent 会话（codex / claude-code）

### FR-RT-04 命令执行（原 Terminal）

Runtime 模块必须支持在指定项目工作区内执行非交互式命令：

最小输入：

- `projectId`
- `taskId`
- `executionRunId`
- `cwd`
- `command`
- `args`

要求：

- 工作区边界校验
- 命令风险分级
- 黑名单与危险模式检测
- 输出采集（stdout/stderr/exitCode/duration）

### FR-RT-05 命令级审批

Runtime 模块必须支持命令执行进入审批门：

- 只读命令默认允许
- 低风险命令按项目策略审批
- 高风险命令默认审批
- 黑名单命令禁止

### FR-RT-06 输出流与结果回传

Runtime 模块必须支持：

- 运行中输出流式回传
- 完成事件
- 失败事件
- 中断事件
- 结果回写到 ExecutionRun 与 Task

### FR-RT-07 命令失败与重试

Runtime 模块必须支持：

- 标记命令失败
- 提供失败摘要
- 允许在新审批或新执行下重试
- 保留失败可追溯性

### FR-RT-08 工作区边界治理

Runtime 模块必须支持：

- 工作区根目录校验
- 路径规范化与逃逸防护
- 跨项目访问隔离

### FR-RT-09 产物与证据收集

Runtime 模块必须支持：

- 执行日志收集
- 结构化错误摘要
- 测试结果摘要
- 产物路径引用
- 原始输出引用

### FR-RT-10 Runtime 级事件与通知

Runtime 模块必须：

- 发布 Runtime 级领域事件（见 [第 12 章](#12-事件与通知)）
- 接入 Notification 模块
- 高风险命令、Runtime 离线等关键事件正确分发

## 14. 与控制面和执行模型的关系

Runtime 模块与以下对象强关联：

- `Runtime` / `RuntimeSession` / `RuntimeCapabilitySnapshot`
- `ExecutionRun` / `ExecutionStep`
- `ApprovalRequest`
- `ContextPackSnapshot`
- `CliSession` / `CliExecutionBinding`
- `ExecutionArtifact` / `ExecutionEvidence`

### 14.1 控制面与 Runtime 的职责边界

| 维度 | 控制面（Web + AI Hub）| Runtime（本地）|
|------|---------------------|---------------|
| 执行编排 | ✅ AI Hub 编排 | 接收派发并执行 |
| 权限决策 | ✅ Project/Core | 不决策，只校验 |
| 上下文策展 | ✅ AI Hub | 接收 ContextPack |
| 本地命令执行 | 不执行 | ✅ Provider 层 |
| 工作区治理 | 定义边界 | ✅ 边界校验 |
| 证据收集 | 接收回传 | ✅ 收集 |

## 15. 数据模型要求

> 与 [[运行时数据模型-v1|Runtime 数据模型]] 和 [[数据模型-Terminal|Terminal 支撑模型]] 对齐。

### 15.1 核心对象

| 实体 | 用途 | 来源 |
|------|------|------|
| `Runtime` | 本地节点长期标识 | 运行时数据模型 |
| `RuntimeSession` | 活跃连接 | 运行时数据模型 |
| `RuntimeCapabilitySnapshot` | 能力快照 | 运行时数据模型 |
| `CliSession` | CLI Agent 会话 | 运行时数据模型 |
| `CliExecutionBinding` | 执行与 CLI 会话绑定 | 运行时数据模型 |
| `TerminalExecutionRecord` | 命令执行记录 | 原 Terminal 模型 |
| `TerminalOutputChunk` | 命令输出分片 | 原 Terminal 模型 |
| `TerminalCommandPolicy` | 命令风险策略 | 新增 |

### 15.2 Runtime 建议字段

- `id`
- `userId`
- `deviceId`
- `displayName`
- `hostPlatform`
- `runtimeVersion`
- `protocolVersion`
- `status`（online / offline / unreachable / disabled）
- `lastSeenAt`
- `createdAt`
- `updatedAt`

### 15.3 TerminalExecutionRecord 建议字段（命令执行）

- `id`
- `projectId`
- `taskId`
- `executionRunId`
- `runtimeId`
- `cwd`
- `commandLine`
- `riskLevel`（read / write / high-risk）
- `status`
- `exitCode`
- `startedAt`
- `endedAt`

### 15.4 TerminalCommandPolicy 建议字段（命令策略）

- `id`
- `projectId`
- `blacklist`（命令黑名单）
- `dangerPatterns`（危险模式正则）
- `riskRules`（风险分级规则）
- `enforceOnAgents`（是否对 Agent 强制）
- `createdAt`
- `updatedAt`

### 15.5 关系建议

- `User 1 - N Runtime`
- `Runtime 1 - N RuntimeSession`
- `RuntimeSession 1 - N RuntimeCapabilitySnapshot`
- `Runtime 1 - N CliSession`
- `ExecutionRun 1 - N CliExecutionBinding`
- `ExecutionRun 1 - N TerminalExecutionRecord`
- `TerminalExecutionRecord 1 - N TerminalOutputChunk`
- `Project 1 - N TerminalCommandPolicy`

## 16. Phase 1 非目标

Runtime 模块在 Phase 1 暂不要求：

- 多 Runtime 复杂编排与负载均衡
- 长生命周期交互式 shell 托管
- 多窗口复杂终端管理
- 跨项目共享命令历史中心
- 全功能终端工作台 UI
- Runtime 间执行迁移
- 远程模型 Provider 直接调用（Phase 1 走 CLI Provider）

## 17. GWT 验收场景

### 17.1 正常流：命令执行闭环

```
Given 外部 Agent 围绕任务发起测试命令（如 npm test）
When Runtime 在项目工作区中执行命令
Then 平台应流式记录输出
  And 结束后回写执行结果和摘要到 ExecutionRun
```

### 17.2 异常流：高风险命令审批

```
Given 外部 Agent 请求执行高风险命令（如删除文件）
When 平台未收到审批通过结果
Then 命令不得执行
  And 在 ExecutionRun 中记录阻塞原因
  And 执行进入 pending_approval
```

### 17.3 边界流：长输出与中断

```
Given 某条命令输出很长、执行时间较长且中途被人工终止
When 用户查看执行记录
Then 系统应能展示部分输出、终止状态和可追溯的中断记录
```

### 17.4 黑名单拦截

```
Given Agent 请求执行 rm -rf /（黑名单命令）
When Runtime 命令安全治理校验
Then 命令被直接拒绝（无论权限）
  And 记录审计并通知 Owner
```

### 17.5 工作区逃逸防护

```
Given 命令尝试 cd 到项目工作区外或使用 ../ 跳出
When Runtime 工作区边界校验
Then 命令被拒绝
  And 提示工作区边界约束
```

### 17.6 Runtime 离线

```
Given Runtime 不在线
When AI Hub 尝试派发执行
Then 返回 runtime_offline 错误（对齐 Core 错误模型）
  And 执行进入 blocked
  And Runtime 恢复后可重新派发
```

### 17.7 能力上报与派发校验

```
Given Runtime 上报能力（不含 provider-git）
When AI Hub 派发需要 Git 能力的执行
Then 派发前校验失败
  And 返回结构化错误（capability_mismatch）
```

## 18. 待确认问题

1. `terminal.*` 权限语义迁移到 `runtime.*` 后，权限模型文档与角色矩阵的更新范围
2. 命令黑名单的维护方式（平台级硬编码 vs 项目级可配置）
3. `TerminalCommandPolicy` 是否在 Phase 1 落地为独立可配置实体
4. 输出大小限制与截断策略（长输出的保留与截断阈值）
5. Agent 自带终端执行时，APM 是否强制要求回写证据（还是可选）
