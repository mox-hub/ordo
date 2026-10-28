---
description: 定义MCP、CLI、API/Plugin接入外部AI工具时的身份映射、权限边界与执行规则
category: meta
status:
  - draft
tags:
  - integration
  - mcp
  - cli
  - agent
  - protocol
version: 1.0.0
created: 2026-03-20
modified: 2026-03-20
projects: "[[APM-项目中心]]"
title: 外部 AI 接入协议草案
id: META-INTEGRATION-001
scope: 外部AI工具接入平台
ai-session-types: planning,doc,all
ai-priority: high
ai-freshness: realtime
ai-audiences: "session:all"
---

# 外部 AI 接入协议草案

## 1. 文档目的

本文件用于明确平台如何接入外部优秀 AI 工具，并回答以下问题：

1. 平台支持哪些接入方式
2. 接入优先级是什么
3. 外部 Agent 如何映射到平台身份
4. 外部 Agent 如何获取上下文和工具
5. 外部 Agent 的执行、审批、审计规则是什么

## 2. 接入原则

### 2.1 平台定位原则

平台不是外部 AI 工具的替代品，而是外部 AI 工具参与项目协作的中枢。

### 2.2 接入优先级

已确认接入优先级：

`MCP > CLI > API/Plugin > 其他`

这意味着：

- 第一优先设计 MCP 接入
- 第二优先设计 CLI 接入
- Plugin 与 API 保持支持，但不作为第一主线

补充说明：

- 这是平台级长期接入优先级
- Phase 1 的实施顺序先从 CLI 主线切入
- 这样做是为了优先验证 Codex / Claude Code 的开发型 Agent 协作路径

## 3. 支持的接入方式

### 3.1 MCP 接入

适用场景：

- 需要结构化资源、工具和 prompt 暴露
- 需要深度 Agent 交互
- 需要标准化工具发现

平台需要提供：

- Resources
- Tools
- Prompt / Template
- 身份映射
- 权限校验

### 3.2 CLI 接入

适用场景：

- 本地工程执行
- 与终端、仓库、代码任务深度结合
- 外部 AI 工具通过命令方式参与项目

平台需要提供：

- 命令式入口
- 项目/任务上下文获取
- 执行记录回写
- 审批结果查询

Phase 1 中，CLI 是首条必须打通的接入主线。

### 3.3 API / Plugin 接入

适用场景：

- 特定产品或集成场景
- 内部扩展与非标准接入

平台需要提供：

- 鉴权方式
- 统一执行与审计协议
- 工具能力映射

## 4. 外部 Agent 身份映射

### 4.1 身份不是“匿名工具调用”

外部 Agent 接入后，必须映射为平台可识别的执行主体。

至少应具备：

- `subjectType = external_agent`
- `identitySource`
- `displayName`
- `projectScope`
- `role`
- `level`
- `permissionProfile`

### 4.2 建议字段

- `externalProvider`
  - 例如：`codex`, `claude-code`, `custom-cli`, `mcp-client`
- `externalSessionId`
- `projectId`
- `mappedRole`
- `mappedLevel`
- `toolPolicy`

## 5. 外部 Agent 上下文协议

外部 Agent 不应直接依赖页面或非结构化文本作为主要上下文来源。

平台应优先提供结构化上下文：

- `ContextPack.project`
- `ContextPack.task`
- `ContextPack.git`
- `ContextPack.terminal`
- `ContextPack.activity`

### 5.1 最小上下文原则

- 默认只给当前任务必需上下文
- 大上下文按 relevance 裁剪
- 上下文提供必须可审计

## 6. 外部 Agent 工具发现协议

平台应提供统一的工具发现机制，而不是让外部 AI 工具直接碰底层模块。

### 6.1 Tool Definition 至少包括

- `name`
- `description`
- `inputSchema`
- `outputSchema`
- `riskLevel`
- `requiresApproval`
- `scope`

### 6.2 工具访问原则

- 所有模块能力先抽象成 Tool，再暴露给外部 Agent
- 外部 Agent 不直接访问数据库或内部私有 service
- Tool 访问必须经过统一鉴权和权限校验

## 7. 执行协议

### 7.1 外部 Agent 执行流程

1. Agent 绑定或映射身份
2. Agent 发现工具和上下文入口
3. Agent 创建执行
4. Agent 请求读写动作
5. 涉及写操作时进入审批
6. 审批后继续执行
7. 平台记录执行结果和证据

### 7.2 外部 Agent 不能绕过的约束

- 不能绕过审批门直接做写操作
- 不能绕过 Tool Registry 直连业务数据
- 不能越过项目范围读取上下文

## 8. 审批与治理

### 8.1 默认治理模式

- 外部 Agent 默认以“建议 + 待确认”模式运行
- 低风险读操作可直接执行
- 写操作默认审批
- 高风险动作必须审批

### 8.2 高风险动作示例

- Git 高风险写操作
- 终端危险命令
- 外部系统状态变更
- 跨项目上下文访问

## 9. 审计与回放

平台应记录：

- 外部 Agent 来源
- 所属项目
- 所属任务
- 执行目标
- 使用工具
- 审批过程
- 输出结果
- 失败原因

### 9.1 审计最小要求

每次外部 Agent 执行至少要关联：

- `projectId`
- `taskId`
- `executionId`
- `subjectType`
- `identitySource`

## 10. Phase 1 实施建议

### 10.1 先实现的接入顺序

长期平台优先级：

1. MCP
2. CLI
3. API / Plugin

Phase 1 实施顺序：

1. CLI
2. MCP
3. API / Plugin

### 10.2 先打通的闭环

- 人类 PM 创建任务
- 外部 AI 工具读取任务上下文
- 外部 AI 工具创建执行
- 写操作审批
- 结果回写与审计

## 11. 待确认问题

1. CLI 接入是否需要单独会话管理模型
2. MCP 与 CLI 是否共享同一身份映射规则
3. 外部 Agent 的权限模板是否按项目单独配置

## 12. Phase 1 首批工具范围

Phase 1 首批优先支持：

- Codex
- Claude Code

平台的 CLI 接入设计应优先围绕这两类开发型 Agent 展开。
