---
title: "Core 模块需求说明"
description: 定义 Core 模块在 v2 平台化路线下作为配置、可观测性、审计、事件与基础运行契约支撑层的职责，及其对 AI 主线的被动服务模式
category: requirement
status:
  - active
tags:
  - Core
  - Feature
  - requirements
  - infrastructure
version: 2.1.0
created: 2026-05-29 05:54:10
modified: 2026-07-16 04:21:57
projects: "[[APM-项目中心]]"
---

# Core 模块需求说明

## 1. 模块定位

在 v2 路线下，Core 模块的定位应保持克制。

Core 模块的核心定位是：

> 平台中为各业务模块提供配置、可观测性、日志、审计、事件分发和基础运行契约的基础设施支撑层。

它不承载业务主线，但决定平台是否具备可治理、可追踪、可维护的基础能力。

### 1.1 模块功能约束范围

1. 配置管理（环境变量 / 分环境 / 关键配置校验）
2. 可观测性（健康检查 / 指标 / 探针）
3. 结构化日志与追踪
4. 审计记录
5. 领域事件总线
6. 统一错误边界

### 1.2 与其他模块的边界

- Core 模块**不承载**任何业务逻辑（项目管理、任务、执行、审批均不在 Core）。
- Core 模块**不承载** AI 执行调度、上下文打包、权限决策（由各业务模块和 AI Hub 承载）。
- Core 模块是**被动服务层**：为业务模块和 AI 主线提供基础设施能力，本身不主动发起业务动作。

## 2. 模块目标

### 2.1 第一目标

提供全平台统一的配置和运行基础能力。

### 2.2 第二目标

为任务执行、审批和 Runtime 通信提供统一的日志、审计和事件支撑。

### 2.3 第三目标

避免基础设施能力散落在各业务模块中重复实现。

## 3. Phase 1 范围

Phase 1 中，Core 模块必须先服务：

- 配置管理
- 可观测性（健康检查 + 基础指标）
- 结构化日志
- 审计记录
- 领域事件总线
- 统一错误与追踪上下文

Phase 1 不追求复杂平台中台化，也不把所有通用工具都堆进 Core。

## 4. 核心职责

### 4.1 配置管理

Core 模块负责提供统一配置读取能力。

至少包括：

- 环境变量配置
- 分环境配置（dev / test / prod）
- 关键配置校验（启动期快速失败）
- 配置变更审计（敏感配置的读取与修改留痕）

### 4.2 可观测性

Core 模块负责提供平台可观测性基础能力。作为接 Runtime、跑 AI 执行的平台底盘，可观测性是可信平台的必要能力。

#### 4.2.1 健康检查（health check）

- 进程级健康检查（liveness）
- 就绪检查（readiness，依赖 DB / 关键服务连通性）
- Runtime 连通性探针（Runtime 是否在线，供执行派发前判断）
- 健康检查端点供编排层（如容器编排）调用

#### 4.2.2 基础指标（metrics）

Phase 1 至少暴露以下指标：

- 业务计数：任务数、执行数、审批数、审计记录数（按时间窗口）
- 事件吞吐：事件总线发布/消费速率
- Runtime 指标：在线 Runtime 数、执行派发成功率/失败率
- 基础资源：请求延迟、错误率（P50/P95）

指标格式应遵循通用标准（如 Prometheus 兼容），便于对接监控。

#### 4.2.3 非目标（可观测性）

- 复杂分布式链路追踪（OpenTelemetry 全链路）列为 Phase 2
- 大规模时序数据存储与可视化大盘列为 Phase 2

### 4.3 日志与追踪

Core 模块负责提供结构化日志和请求追踪能力。

至少包括：

- 模块级日志（按模块打标签）
- 请求或执行级 trace（贯穿一次 ExecutionRun / ApprovalRequest 的链路）
- 错误日志
- 日志脱敏（敏感配置、密钥、Token 不落明文日志）

### 4.4 审计能力

Core 模块必须支持平台关键动作审计。

重点覆盖：

- 权限变更
- 审批结果
- 执行关键状态变化
- Git / Terminal / Integration / Plugin 高风险动作
- 配置与策略变更

### 4.5 事件总线

Core 模块必须提供领域事件发布与订阅能力。

服务对象包括：

- Task
- Project
- Team
- AI Hub
- Notification
- Integration
- Runtime 相关模块

### 4.6 统一错误边界

Core 模块应提供统一错误表示和异常转换机制。

目标是保证：

- API 错误可识别
- Runtime 相关错误可分类
- 审计和日志能拿到一致的错误上下文

## 5. 可观测性

> 作为平台底盘的关键能力，独立成节强调。详见 [第 4.2 节](#42-可观测性)。

### 5.1 健康检查端点

| 端点 | 用途 |
|------|------|
| `/health/liveness` | 进程存活探针 |
| `/health/readiness` | 就绪探针（依赖连通性）|
| `/health/runtime` | Runtime 在线状态摘要 |

### 5.2 指标暴露

- 统一指标端点（如 `/metrics`），Prometheus 兼容
- 指标命名遵循 `{module}_{metric}_{unit}` 规范
- 关键业务指标（执行数/审批数/审计量）必须可查询

## 6. 审计能力

### 6.1 审计记录统一入口

Core 模块必须提供统一审计入口，所有模块通过该入口写入审计，禁止各模块自行落库。

### 6.2 审计记录字段

审计记录至少应包含：

- `actor`（操作主体类型 + ID）
- `action`（动作类型）
- `resource`（操作对象类型 + ID）
- `result`（成功 / 失败）
- `timestamp`
- `metadata`（变更前后摘要、来源 IP 等）
- `traceId`（关联请求/执行链路）

### 6.3 审计不可篡改

- 审计记录仅可追加，不可修改、不可删除（逻辑保留期外由运维策略清理）
- 高风险动作审计强制写入，不可跳过

## 7. 事件总线

### 7.1 事件契约

事件模型需要稳定，但不应过早过度抽象。

每个领域事件至少包含：

- `eventId`
- `eventType`（如 `task.created`、`project.archived`）
- `aggregateId`（聚合根 ID，如 projectId / taskId）
- `actorType` / `actorId`
- `payload`
- `occurredAt`
- `traceId`

### 7.2 发布与订阅

- 发布方：各业务模块（Task / Project / Team / AI Hub 等）
- 订阅方：Notification、AI Hub、审计、自动化等
- Phase 1 重点服务任务执行闭环相关事件
- 支持至少一次投递语义，订阅方需幂等处理

### 7.3 非目标（事件总线）

- 复杂分布式事件平台（Kafka 级、事件溯源 Event Sourcing）列为 Phase 2
- 跨实例事件同步列为非目标

## 8. 统一错误模型

### 8.1 错误分类

Core 模块应支持统一错误码和错误分类，至少覆盖：

- 权限错误
- 配置错误
- Runtime 不在线
- Provider 执行失败
- 审批阻塞
- 校验错误
- 资源不存在

### 8.2 错误表示

- 统一错误响应结构（`code` / `message` / `detail` / `traceId`）
- 错误码命名遵循 `{domain}.{category}.{specific}` 规范
- 错误与审计联动：业务错误自动进入日志，高风险错误进入审计

## 9. AI 协作能力

> Core 作为被动基础设施层，本身不主动服务 AI，但必须确保其提供的基础能力对 AI 主线「可用、可读、可治理」。

### 9.1 Core 的被动服务定位

Core 模块不承载：

- AI 执行调度
- AI 上下文打包
- AI 权限决策
- AI 任务分配

这些能力由 Task、Project、AI Hub、[[上下文管理设计|ContextBuilder]] 承载。Core 仅为其提供基础设施支撑。

### 9.2 审计对 AI 可读

Core 的审计能力必须支持 AI 主线：

- AI 执行的每个关键动作（创建执行、发起审批、写回结果）必须留审计
- 审计记录可被 AI Hub / Runtime 按需读取（如回溯某次执行的操作链）
- 审计查询支持按 `executionRunId` / `taskId` / `projectId` / `actorType` 聚合

### 9.3 事件总线供 AI Hub 订阅

- AI Hub 订阅执行闭环相关事件（`task.assigned`、`approval.resolved` 等）
- Core 保证事件语义稳定，避免 AI Hub 订阅逻辑因事件变更频繁返工
- 事件携带 `traceId`，使 AI 执行链路可贯穿日志/审计/事件三处追踪

### 9.4 配置供 Runtime 读取

- Runtime 启动时从 Core 配置服务读取项目级边界（Provider 范围、工作区根目录）
- 配置读取记录审计，避免 Runtime 静默使用越权配置
- 敏感配置（密钥、Token）不向 Runtime 明文暴露，通过受控凭证交换

### 9.5 错误模型对 AI 友好

- Runtime / Agent 收到的错误必须结构化、可分类
- 执行失败、审批阻塞、权限拒绝等错误对 Agent 可解析，便于 Agent 决定重试或放弃
- 错误响应携带 `traceId`，便于人类回溯 AI 执行链路

## 10. 核心功能需求

### FR-CR-01 配置服务

Core 模块必须支持：

- 类型安全读取配置
- 缺失配置快速失败
- 关键配置启动期校验
- 敏感配置读取留痕

### FR-CR-02 可观测性

Core 模块必须支持（Phase 1）：

- 进程级健康检查（liveness）
- 就绪检查（readiness）
- Runtime 连通性探针
- 基础指标暴露（业务计数、事件吞吐、Runtime 指标、P50/P95）
- 指标端点 Prometheus 兼容

### FR-CR-03 结构化日志

Core 模块必须支持：

- 按模块记录日志
- 按执行或请求附带 trace 信息
- 控制日志级别
- 日志脱敏（密钥、Token 不落明文）

### FR-CR-04 审计记录

Core 模块必须支持统一审计入口。

审计记录至少应包含：

- `actor`（类型 + ID）
- `action`
- `resource`（类型 + ID）
- `result`
- `timestamp`
- `metadata`
- `traceId`

要求：

- 仅可追加，不可篡改
- 高风险动作强制写入
- 支持按 `executionRunId` / `taskId` / `projectId` 聚合查询

### FR-CR-05 事件发布与订阅

Core 模块必须支持领域事件的发布和订阅。

要求：

- 事件携带 `eventId` / `eventType` / `aggregateId` / `actor` / `payload` / `occurredAt` / `traceId`
- 至少一次投递，订阅方幂等
- 事件模型稳定，不频繁破坏性变更

### FR-CR-06 统一错误模型

Core 模块应支持统一错误码和错误分类。

至少覆盖：

- 权限错误
- 配置错误
- Runtime 不在线
- Provider 执行失败
- 审批阻塞
- 校验错误

要求：

- 统一错误响应结构（`code` / `message` / `detail` / `traceId`）
- 错误与审计联动

## 11. 与平台主线的关系

Core 模块必须作为支撑层存在。

必须保证：

- 不在 Core 中写具体业务逻辑
- 业务模块围绕 Core 提供的基础设施能力协同
- 执行和审批主线仍由业务模块定义
- AI 主线依赖 Core 的审计、事件、配置、错误能力，但 Core 不反向依赖业务模块

## 12. 数据模型要求

Core 模块至少需要以下方向的模型或统一结构：

- `AuditLog`
- `DomainEvent`
- `ErrorCodeRegistry`
- `TraceContext`
- `MetricSnapshot`（可选，指标可不入库直接暴露）

说明：

- 并非所有对象都必须先落成独立表
- 但语义和字段需要在平台内统一
- `AuditLog` 必须独立持久化，不可与其他业务表混用

## 13. Phase 1 非目标

Core 模块在 Phase 1 暂不要求：

- 复杂分布式事件平台（Kafka 级 / 事件溯源）
- 通用工作流引擎
- 大而全的数据抽象层
- 过度设计的多数据库兼容体系
- 全链路 OpenTelemetry 分布式追踪
- 大规模时序数据存储与可视化大盘
- 复杂配置中心（动态配置热更新）

## 14. GWT 验收场景

### 14.1 正常流：执行闭环的基础设施支撑

```
Given 外部 Agent 围绕任务创建了一次执行
When 执行进入审批并最终完成
Then Core 模块应为整条链路提供稳定的日志、事件和审计支撑
  And 执行链路可通过 traceId 贯穿日志/审计/事件三处
```

### 14.2 异常流：Runtime 不在线

```
Given Runtime 不在线且执行派发失败
When 系统返回错误
Then Core 模块应能提供统一错误分类（runtime_offline）
  And 错误进入日志与审计，携带 traceId
  And Agent 收到结构化错误可决定重试或放弃
```

### 14.3 边界流：多模块并发事件

```
Given 短时间内多个模块同时发布与任务执行相关事件
When Notification 和 AI Hub 订阅这些事件
Then 系统应能保持事件语义一致并可回溯事件来源
  And 订阅方幂等处理不产生重复副作用
```

### 14.4 可观测性：健康检查与指标

```
Given 平台正在运行并有 AI 执行活动
When 运维或编排层查询 /health 与 /metrics
Then 系统返回进程存活状态、依赖连通性与 Runtime 在线状态
  And 指标端点返回执行数、审批数、事件吞吐、P95 延迟等关键指标
```

### 14.5 审计：AI 执行链路可追溯

```
Given 外部 Agent 完成了一次涉及审批的执行
When 项目经理或 AI Hub 按 executionRunId 查询审计
Then 系统返回该执行相关的全部审计记录
  And 记录包含 actor、action、resource、result、traceId
  And 记录不可篡改
```

## 15. 关联文档

- [[产品需求文档-v2|PRD]]
- [[执行审批模型-v1|执行与审批模型]]
- [[运行时数据模型-v1|Runtime 数据模型]]
- [[阶段1-实施路线图-v1|Phase 1 实现路线图]]
- [[上下文管理设计|上下文管理系统设计]]
