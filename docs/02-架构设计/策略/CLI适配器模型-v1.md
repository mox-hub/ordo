---
description: 定义 Codex / Claude Code 等开发型 CLI Agent 的统一适配层与 Provider 差异
category: meta
status:
  - draft
tags:
  - cli
  - adapter
  - codex
  - claude-code
  - provider
version: 1.0.0
created: "2026-03-22 12:01:27"
modified: "2026-04-09 10:05:04"
projects: "[[APM-项目中心]]"
title: CLI 适配模型草案
id: META-CLI-ADAPTER-001
scope: CLI Agent 接入与适配
ai-session-types: planning,doc,all
ai-priority: high
ai-freshness: realtime
ai-audiences: "session:all"
---

# CLI 适配模型草案

## 1. 文档目的

本文件用于定义平台如何接入开发型 CLI Agent，重点解决以下问题：

1. Codex 和 Claude Code 是否共用一套 CLI 适配层
2. 哪些能力可以统一抽象，哪些必须按 Provider 区分
3. CLI 会话、执行、结果和错误如何与平台模型对接

## 2. 总体结论

当前建议：

- 采用 `统一 CLI 适配层 + Provider 子适配器` 模式

也就是：

- 不直接为 Codex 和 Claude Code 各自做完全独立的接入体系
- 先定义统一的 CLI Agent 抽象
- 再为不同工具实现各自的 Provider 适配器

## 3. 为什么不用两个完全独立模型

如果完全独立建模 Codex 和 Claude Code，会出现以下问题：

- 接入模型重复
- 任务执行和审计链路重复
- 后续扩展第三个 CLI Agent 时成本继续上升
- 产品层会被具体工具细节污染

因此平台应优先抽象“CLI Agent 的共同形态”。

## 4. 为什么也不能只做一个过度抽象的统一层

Codex 和 Claude Code 虽然都属于开发型 CLI Agent，但仍然存在差异：

- 启动方式不同
- 参数模型不同
- 输出格式不同
- 会话语义不同
- 错误模式不同

因此统一层不能把 Provider 差异彻底抹平。

## 5. 推荐模型

### 5.1 统一层

统一层负责：

- Provider 注册
- 工作区绑定
- 会话生命周期抽象
- 执行请求与结果格式统一
- 审批与审计对接
- 错误归一化

### 5.2 Provider 层

Provider 层负责：

- CLI 命令构造
- 参数适配
- 输出解析
- 错误映射
- 会话控制

## 6. 核心对象建议

### 6.1 CliProviderDefinition

定义某个 CLI Provider 的静态能力。

建议字段：

- `providerId`
- `displayName`
- `versionDetection`
- `supportsSessionReuse`
- `supportsStreaming`
- `supportsStructuredOutput`
- `requiredBinaries`
- `requiredEnvVars`

### 6.2 CliSession

表示 Runtime 中某个 CLI Agent 的执行会话。

建议字段：

- `sessionId`
- `providerId`
- `runtimeId`
- `workspaceRoot`
- `status`
- `startedAt`
- `lastActiveAt`
- `metadata`

### 6.3 CliExecutionBinding

表示平台执行与 CLI 会话之间的绑定关系。

建议字段：

- `executionRunId`
- `providerId`
- `sessionId`
- `workspaceRoot`
- `commandRef`
- `status`

## 7. 统一抽象接口建议

建议 Runtime 中定义统一接口：

- `detectProvider()`
- `createSession()`
- `resumeSession()`
- `execute()`
- `streamEvents()`
- `collectArtifacts()`
- `terminateSession()`

统一层只依赖上述抽象，不直接关心具体 CLI 命令细节。

## 8. Provider 差异建议

### 8.1 Codex Provider

应负责：

- Codex CLI 可用性检测
- Codex 会话启动与参数适配
- Codex 输出事件解析
- Codex 错误映射

### 8.2 Claude Code Provider

应负责：

- Claude Code CLI 可用性检测
- Claude Code 会话启动与参数适配
- Claude Code 输出事件解析
- Claude Code 错误映射

## 9. 统一输出模型

平台不直接消费 Provider 原始输出，而应消费统一输出。

建议统一为：

- `executionStatus`
- `stepEvents`
- `artifacts`
- `evidence`
- `error`
- `rawRefs`

这样可以避免上层 UI 和执行模型直接绑定某个具体 Provider。

## 10. 会话策略建议

### 10.1 第一阶段

Phase 1 优先支持：

- 任务级短会话
- 执行完成后可释放

优点：

- 模型更简单
- 更容易审计
- 更适合先验证任务闭环

### 10.2 后续阶段

再考虑支持：

- 工作区级长会话
- 多执行复用同一 CLI Session

## 11. 错误归一化建议

建议至少归一化以下错误类型：

- `binary_not_found`
- `env_missing`
- `workspace_invalid`
- `session_start_failed`
- `execution_failed`
- `output_parse_failed`
- `permission_denied`

## 12. Phase 1 约束

Phase 1 中：

- 使用统一 CLI 适配层
- 首批只做两个 Provider：
  - `codex`
  - `claude-code`
- 以任务级短会话为主
- 会话与 `ExecutionRun` 一一绑定或弱绑定

Phase 1 暂不要求：

- 支持任意 CLI Agent 动态接入
- 复杂长会话恢复
- Provider 热插拔市场

## 13. 设计原则

### 原则 1：平台模型优先

平台先定义自己的执行、审批和审计模型，再让 CLI Provider 去适配。

### 原则 2：统一层优先

先建立统一 CLI 抽象，避免产品和 UI 直接面向具体工具。

### 原则 3：差异下沉

Provider 差异尽量下沉到适配器，不向上扩散。

### 原则 4：先任务后会话

第一阶段优先围绕任务执行闭环，而不是做复杂的 Agent 会话系统。

## 14. 与其他文档的关系

- `外部AI集成协议-v1.md`
  - 定义外部 AI 接入总策略
- `控制平面-本地运行时-v1.md`
  - 定义 Runtime 所在层级和职责
- `本地运行时通信协议-v1.md`
  - 定义 Runtime 与平台的通信
- `执行审批模型-v1.md`
  - 定义执行与审批对象

## 15. 待确认问题

1. Codex 与 Claude Code 的会话语义是否足够接近，可共用同一 `CliSession` 抽象
2. CLI 输出是否要求统一结构化，还是允许原始输出 + 解析摘要并存
3. 是否需要在 Phase 1 就暴露 Provider 级配置面板
4. 一个 Runtime 是否允许同时承载多个 Provider 并发执行
