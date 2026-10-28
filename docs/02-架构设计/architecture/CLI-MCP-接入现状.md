---
description: CLI/MCP 双轨 AI 接入的现状与契约汇总——替代四份已归档实施计划
category: architecture
status:
  - active
version: 1.0.0
created: "2026-09-06"
modified: "2026-09-06"
title: CLI/MCP 接入现状
id: ARCH-CLIMCP-CURRENT-001
scope: 外部 AI 工具接入（CLI 派发 + MCP Server）
ai-session-types: all
ai-priority: high
---

# CLI/MCP 接入现状

> 本文档汇总四份已归档实施计划的落地结论，是外部 AI 接入的**现状与契约**单一入口：
> - [agent方案](../../archive/已完成计划/agent方案.md)（双轨总体架构）
> - [CLIAgent派发与闭环接收](../../archive/已完成计划/CLIAgent派发与闭环接收.md)（4 个已确认决策）
> - [MCP与CLI-Provider接入设计-v1](../../archive/已完成计划/MCP与CLI-Provider接入设计-v1.md)（transport/检索/配置补全）
> - 设计上游：[CLI适配器模型-v1](../策略/CLI适配器模型-v1.md)、[外部AI集成协议-v1](../策略/外部AI集成协议-v1.md)
>
> 术语基线（2026-09）：数据模型 `ExecutionRun` → `Execution`，`Task` → `Issue`（外部 API `/issues` + `issueId`）；NestJS 模块目录名未变。

## 1. 双轨架构（已落地）

两条接入轨道共享同一套执行记录 + 审批 + WebSocket 反馈，仅触发方向不同：

| 轨道 | 触发方向 | 现网模块 | 覆盖 |
|---|---|---|---|
| A：CLI 派发 | 平台 push（服务端 spawn 子进程） | `modules/cli-dispatch` | claude-code / codex / zcode 三适配器 |
| B：MCP Server | 编辑器/Agent pull（SSE + messages） | `modules/mcp-server` | 全部支持 MCP 的编辑器（含 Cursor） |

## 2. CLI 派发轨（cli-dispatch）

- **适配器层**：`adapters/` 下 `cli-adapter.interface.ts` 统一接口 + `claude-code.adapter.ts`、`codex.adapter.ts`、`zcode.adapter.ts`（配置驱动骨架）。
- **关键服务**：`dispatch.service.ts`（派发，持久化到 DB，重启不丢）、`cli-executor.service.ts`（执行）、`cli-resolution.service.ts` + `cli-provider.registry.ts`（本机 CLI 检索与注册）。
- **API 面**（`@Controller('ai')`）：
  - `POST ai/tasks/:issueId/dispatch-cli` — 派发
  - `GET ai/cli-providers` / `GET ai/cli-providers/detect` — Provider 列表与本机探测
  - `GET ai/execution-runs/:id/status`、`POST ai/execution-runs/:id/cancel` — 执行状态/取消

## 3. MCP 轨（mcp-server）

- **SSE transport 已补齐**：`GET mcp/sse` 建立事件流，`POST mcp/messages` 接收工具调用；`GET mcp/status` 健康状态。
- **多 Server 管理**：`mcp-servers.controller.ts`（`@Controller('mcp/servers')`）提供 CRUD + `refresh-all` / `:id/refresh`，由 `mcp-client.registry.ts` 维护注册表、`mcp-config.generator.ts` 生成编辑器配置。

## 4. 闭环契约（已确认的 4 个决策）

| 决策点 | 落地结论 |
|---|---|
| 执行位置 | 服务器本机 spawn CLI（复用 `cli-dispatch`） |
| 任务队列 | 轻量 DB 持久化 + 扫描重试，未引入 Redis |
| 完成契约 | 按任务类型区分（PR / 测试报告 / 文档产物），测试报告走 `adapters/test-report.schema.ts` |
| 信任评分 | 复用 TrustService 四维评分（correctness/efficiency/safety/collaboration），PR 通过率仅作 correctness 一维输入 |

派发 → 执行 → 证据回传 → Acceptance 验收的链路已端到端打通（AI 同事化四切片合入 develop，见 [AI同事化设计纪要](../策略/AI同事化助手-界面分工记忆交接-设计纪要-v1.md)）。

## 5. AI Provider 层（ai-hub，另一维度）

CLI/MCP 解决"谁来执行"，`modules/ai-hub` 解决"用什么模型"：
- Vercel AI SDK 统一接入 5 Provider（OpenAI / Anthropic / Gemini / DeepSeek / GLM，其中三家复用 `@ai-sdk/openai` 兼容协议）。
- `AIProviderConfig` 表存凭证，`core/crypto/encryption.service.ts`（AES-256-GCM）加密。
- `assistant.service.ts` + `assistant-runtime-bridge.service.ts` 承载助理会话与 Runtime 桥接。

## 6. 阅读顺序

1. [外部AI集成协议-v1](../策略/外部AI集成协议-v1.md)（接入优先级与身份边界）
2. [CLI适配器模型-v1](../策略/CLI适配器模型-v1.md)（适配层抽象）
3. [执行审批模型-v1](../策略/执行审批模型-v1.md)（Execution/ApprovalRequest/ContextPack 对象模型）
4. 本文（现状）
