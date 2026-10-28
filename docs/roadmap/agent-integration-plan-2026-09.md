---
title: Agent 接入层方案（APM 作为多 Agent 编排中枢，2026-09 设计稿）
description: 执行面接入总设计——ZCode headless CLI 真相勘误、派发链通断图、三通道架构（headless 派发/MCP 会话回联/workflow 编排接线）、P0-P2 落地清单与 zcode adapter 重写规格
id: ROADMAP-AGENTLINK-001
category: roadmap
status: draft
created: '2026-09-26'
modified: '2026-09-26'
scope: 执行面接入专项（cli-dispatch × workflow × mcp-server × zcode）
ai-priority: high
ai-session-types: all
tags: 'agent-integration, cli-dispatch, workflow, mcp, zcode, headless'
---

# Agent 接入层方案（已立项 → CAP-S-02，planned 待开工令）

> **立项记录（2026-09-26）**：经 requirement-intake 五步以 **CAP-S-02**（S 自举线，[[能力清单-v1]] §4.7）登记 planned。通道 C（P1-1~P1-4 编排接线）并入 **CAP-S-03** workflow v2（见 [workflow-v2-redesign-plan-2026-09.md](./workflow-v2-redesign-plan-2026-09.md)，两卡在 W2 会师）；P0（zcode adapter 重写/shim/MCP 配置）是 S3-W2 的前置，仍按本方案先行。

## 〇、定位与一句话结论

**目标 = APM 作为控制面大脑（需求账/任务账/验收门禁/发版），各 agent 工具（ZCode/Claude Code/Codex/OpenCode）作为执行面手脚，双向自动联动。**

一句话结论：**派发半环（APM→agent 执行→结果回流）已经通了一半半——机制完整但 zcode adapter 是空壳；编排半环（workflow↔外部 agent）完全断开；而 ZCode 侧根本不缺 CLI，缺的只是一个 shim 和一次配置。** 三个问题对应三个接驳点，全部有明确工程路径。

## 一、真相勘误：ZCode 有完整 headless CLI

「ZCode 没有暴露 CLI 工具」不准确。真实情况（v0.16.9 实测）：

- 入口：`node D:\Software\ZCode\resources\glm\zcode.cjs`——**不在 PATH 上**（桌面只有 Electron 图标），所以感觉「没有 CLI」。
- headless 能力齐备：

| Flag | 作用 |
|---|---|
| `-p, --prompt <text>` | 非交互执行单个 prompt，不开 TUI |
| `--target <text>` | **`/goal` 的 headless 形态**：启动目标循环（自动迭代直到验证完成） |
| `--cwd <path>` | 指定工作目录 |
| `--resume <sessionId>` / `-c` | 恢复持久化会话（sess_ ID） |
| `--json` | 机器可读 JSON 输出 |
| `--mode build\|edit\|plan\|yolo` | 权限模式 |
| `--attach <path>` | 附加本地文件 |
| `app-server` | stdio 协议服务（桌面端同款通道，含 automation/session 管理） |

- **`/goal` 是内置功能**（非自定义命令）：`/goal [pause|resume|clear|replace <objective>|<objective>]`，持久化在 `C:\Users\life_\.zcode\cli\db\db.sqlite` 的 `session_target` 表（objective/status/token_budget/summary），可被外部程序只读检索。
- 其他自动化面：MCP 客户端（`~\.zcode\cli\config.json` → `mcp.servers`，支持 stdio/sse/http）；Hooks（7 种生命周期事件：SessionStart/UserPromptSubmit/PreToolUse/PermissionRequest/PostToolUse/PostToolUseFailure/Stop）；会话库 SQLite（session/message/part 全量可检索）。

## 二、现状通断图（调研实证）

**通的部分（派发半环机制完整）**：REST/MCP/指派自动派发三入口 → 门禁（验收/依赖/信任）→ ExecutionRun+CliSession+Binding → daemon（WS 推送+15s 轮询领活）→ adapter spawn → 标准化事件流/审批/结果上报 → `runtime.execution.result` 收口（状态机+信任评估+验收证据落 Acceptance）。MCP server 已有 12 个工具（SSE+PAT），外部 agent 可完成「领单→派单→交结果→请求审批」全环。**claude-code adapter 是唯一完整校准的**（stdin NDJSON + `--resume` + usage 提取，能力位全开）。

**断的部分（三个断点）**：

| # | 断点 | 现状 |
|---|---|---|
| B1 | **zcode adapter 是空壳** | `packages/apm-shared/src/cli/adapters/zcode.ts` 自述「配置驱动骨架，协议待校准」：**buildCommand 不传递 prompt**（无位置参数/-p/stdin），parseStream 按 claude 协议瞎猜，能力位三项全 false。即便本机 zcode 可用，派发的进程也收不到任务内容 |
| B2 | **workflow 无「派发外部 agent」步骤** | 步骤文法仅 5 种（llm/http/human-confirm/condition/action）；action 注册表仅 4 个纯 DB 写动作且经 prisma 直写——不触发 issue-assignee 自动派发、不过门禁 |
| B3 | **workflow 与执行事件无衔接** | 触发仅手动 API（无事件/定时触发）；无「执行完成→自动推进 workflow」订阅；human-confirm 的 resume 依赖进程内句柄、**不支持跨重启恢复**（Mastra 基座限制）——不能拿 suspend 做「等执行完成再继续」 |

## 三、三通道接入架构

```
┌─ 控制面（APM server）────────────────────────────────┐
│  workflow(编排) ← 事件推进器 ← MessageBus ← 收口订阅器 │
│      │ agent-dispatch 步骤                  ↑          │
│      ▼                                     │          │
│  cli-dispatch(门禁→ExecutionRun→daemon/进程内)        │
└──────┼──────────────────────────────────────┼──────────┘
       │ 通道A: headless 派发                  │ 通道B: MCP 会话回联
       ▼                                     │
┌─ 执行面（各 agent 工具）──────────────────────────────┐
│  claude-code: claude -p --output-format stream-json  │
│  codex:       codex exec --json                      │
│  opencode:    opencode run --format json             │
│  zcode:       zcode -p "<prompt>" --json --cwd ...   │
│               （goal 任务用 --target 启动目标循环）      │
│  交互会话（含 /goal、需求分析）→ MCP 12 工具回联 APM     │
└──────────────────────────────────────────────────────┘
```

- **通道 A「主动派发」**（APM→agent，修 B1）：把任务经 cli-dispatch 派给 headless CLI 执行。zcode adapter 按真实接口重写（§四 P0-1）；claude-code/codex/opencode 已通。
- **通道 B「会话回联」**（agent→APM，零代码）：ZCode 配置 APM MCP server（SSE+PAT），任何交互会话（含 /goal 循环、需求分析对话）可调 12 工具：领任务、查实体、建档、交结果。这是「我在 ZCode 的常用工作流如何连接 APM」的最短路径。
- **通道 C「编排接线」**（workflow↔执行，修 B2/B3）：workflow 新增 `agent-dispatch` 步骤类型 + 执行完成事件推进器，让系统内流程图真正驱动外部 agent。

**亮点设计：目标模式派发（issue→ZCode goal 闭环）**。APM Issue 携带验收标准（Acceptance），派发 zcode 时用 `--target "<目标+验收标准>"` 而非裸 `-p`——ZCode 目标循环会自动迭代直到自验通过，结果回流 → `runtime.execution.result` → Acceptance 推 in_review → 人验收。**APM 的验收门禁 + ZCode 的验证循环 = 全自动执行闭环，人只出现在最后确认点。** 这正是「验收标准代写→AI 循环执行→人把关」产品主轴在执行面的落地形态。

## 四、落地路线

### P0：接通（最小改动，先让 ZCode 真的能被派发、能回联）

| # | 改动 | 说明 |
|---|---|---|
| P0-1 | **重写 zcode adapter**（双侧镜像：apm-shared + server/modules/cli-dispatch/adapters） | detect：`node <zcode.cjs> --version`；buildCommand：`node <commandPath> -p <prompt> --json --cwd <workspaceRoot> [--resume <id>] [--mode <m>]`，goal 类任务变体 `--target <objective>`；parseStream/parseFinalResult 按 `--json` 实测输出校准（实施第一步：手工采样一次 headless 输出）；能力位实测后更新 |
| P0-2 | **ZCode 侧 shim** | 建 `zcode.cmd`（`node D:\Software\ZCode\resources\glm\zcode.cjs %*`）加入 PATH，adapter 命令形态与其他 provider 统一；或 adapter 的 commandPath 配置直指 zcode.cjs（cli-provider DB override 已支持 commandPath/env） |
| P0-3 | **ZCode 配 APM MCP server** | `~\.zcode\cli\config.json` → `mcp.servers` 加 sse 条目：`http://127.0.0.1:4300/_api/mcp/sse?sessionId=zcode&token=<PAT>`（PAT 经 access-token 模块签发；token 传递方式按 ZCode mcp 配置 schema 确认）。此后任意 ZCode 会话可领单/交结果/查实体 |
| P0-4 | **实机验收** | APM 建 Issue+验收标准 → 派发 zcode（`-p` 模式）→ 事件流/结果回流/Acceptance in_review 全链走通一次；再用 `--target` 模式跑一个目标循环任务 |

### P1：编排接线（修 B2/B3，让 workflow 真正驱动外部 agent）

| # | 改动 | 说明 |
|---|---|---|
| P1-1 | **新增 `agent-dispatch` 步骤类型** | workflow-actions 注册表加动作（如 `execution.dispatch`）：入参 issueRef/provider/model/targetMode，**走 `dispatchTaskToCli` 领域 service 而非 prisma 直写**——门禁（验收/依赖/信任）、ExecutionRun/CliSession 记账、事件全保留。步骤语义 = 触发派发即完成（fire-and-forget），不阻塞等待 |
| P1-2 | **执行完成事件推进器** | 新订阅器消费 `runtime.execution.result`/`execution.completed`：按 run 上下文（ExecutionRun.metadata 记 workflowRunId/stepId）推进对应 workflow run 到下一步。**绕开 Mastra suspend 跨重启不可靠**：等待态不靠 suspend 内存句柄，靠「事件驱动 + DB 记账」自制推进；5min stalled 对账已有先例可扩展（挂起超时判 failed 并通知） |
| P1-3 | **workflow 事件触发器** | definition 增 `triggerOn` 白名单（如 `issue.created`），MessageBus 订阅器拉起 run；最小实现仅支持 2-3 个事件，避免过度建设 |
| P1-4 | **action 落库改走领域 service** | `issue.create` 等改经 service 层，触发既有事件链（含 AI 成员指派自动派发），修「直写不派发」的暗断点 |
| P1-5 | **升级内置研发剧本** | `apm-dev-mainline`（清单闸门→契约先行→…→PR）加入 agent-dispatch 步骤：人工确认后自动派给指定 provider 执行——「系统内流程图驱动外部 agent」的样板 run |

### P2：对话产物上行与自动化深化

| # | 改动 | 说明 |
|---|---|---|
| P2-1 | **`.zcode/commands/apm-*.md` 命令** | `apm-goal`：读当前 /goal + 会话摘要 → 经 MCP 建 APM Issue/Document（goal 上行）；`apm-intake`：需求分析对话收口时一键落 Intake 管道（与 requirement-intake skill 合流） |
| P2-2 | **ZCode hooks 回账** | Stop hook 外呼 APM（记执行摘要）；SessionStart hook 拉取当前项目活跃任务。需 `hooks.enabled: true`，改动在用户级 config.json |
| P2-3 | **能力位对齐工程账** | 四 adapter 能力位不齐（approval 仅 claude-code；usage 缺 codex）——逐项实测补齐或在 UI 显式降级，杜绝静默 |
| P2-4 | **（可选）goal 会话反向同步器** | 只读检索 `session_target` 表，定期把「孤儿 goal」提示用户归档进 APM |

## 五、实施注意点与风险

1. **Windows 命令行长度限制**：spawn 走 shell:true（cmd.exe 上限约 8K 字符），而 dispatch 组装的 prompt（system+skills+task+context）远超此限。claude-code 用 stdin NDJSON 绕开；zcode `-p` 是位置参数——**实施时优先确认 zcode headless 是否支持 stdin 传 prompt**；不支持则用「prompt 写临时文件 + `--attach`」变通。这是 P0-1 的头号技术风险。
2. **`--json` 输出结构未知**：parseStream/parseFinalResult 不能照抄 claude 协议猜测，必须实测采样后校准；会话恢复旗标（`--resume sess_...`）与 headless 的兼容性同场实测。
3. **门禁与信任等级**：自动派发受信任门禁约束（观察者拦截，`dispatch.trustGateEnabled`）；goal 循环类长任务建议默认 `--mode build`（改动需确认）而非 yolo，与信任等级联动。
4. **MCP PAT 管理**：PAT 长期有效，配置进 config.json 属敏感信息；`.zcode/config.json` 项目级配置若考虑入库需走 env 引用，短期先用户级配置不入库。
5. **workflow 推进器的幂等**：`runtime.execution.result` 可能重放（daemon 重试），推进器必须按 executionRunId 幂等；跨重启推进依赖 DB 记账而非内存，是 P1-2 的设计红线。
6. **不动 claude-code 既有链路**：claude-code adapter 已完整校准且 daemon 在用，重构 adapter 接口时保持向后兼容（能力位协商已有告警机制兜底）。

## 六、与自举总方案的关系

- 本方案 = [self-hosting-plan-2026-09.md](./self-hosting-plan-2026-09.md)（ROADMAP-BOOTSTRAP-001）阶段 3「执行面自举」的**展开与替代**：原阶段 3 只设想了「会话经 MCP 认领」的被动联动，本方案补齐了「APM 主动派发 + workflow 编排 + goal 闭环」的主动联动。
- 通道 B（MCP 回联）即自举总方案 A3-1；P0 全部完成后，阶段 3 剩余项（证据回流、stability 入账）照旧执行。
- 立项口径建议：与自举总案合并为 CAP-S 自举线，本方案为「S2 执行面接入」子卡；或独立成卡挂 cli-dispatch × workflow × mcp-server 三模块。走 requirement-intake 五步裁决。

## 七、现状备注（2026-09-26）

- `apps/server/src/modules/cli-dispatch/dispatch.service.ts`、`prompt-shared.ts`、`prompt.service.ts` 有 CAP-A-24 未提交改动——P0-1 动工前先处理该分支（feat/prompt-governance-enhancements），避免搅树。
- 四 adapter 双侧镜像（apm-shared 单源 + server 镜像）的同步纪律：改 zcode adapter 必须双侧同改并跑 `check:cli-contract`。
