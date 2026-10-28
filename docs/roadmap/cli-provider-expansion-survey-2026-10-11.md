---
title: "主流 AI 编码 CLI 接入调研与分级（CAP-B-05 扩容）"
description: "主流 AI 编码 CLI 接入调研与分级（CAP-B-05 扩容）"
category: roadmap
status: reference
version: 1.0.0
created: 2026-10-28
modified: 2026-10-28
---
# 主流 AI 编码 CLI 接入调研与分级（CAP-B-05 扩容）

- 日期：2026-10-11
- 触发：用户指令「在 0.8.0 正式上线前发布主流 CLI 工具的接入」（附 38 智能体安装清单截图）
- 承载卡：CAP-B-05 CLI 派发与 Provider（扩容批一）｜测试：GAP-T-67
- 调研方式：三路并行深调（官方文档/源码/npm registry 第一手证据）+ 本机安装产物源码级采样（cursor-agent）

## 一、结论速览

APM 适配器 SPI 四要件：`--version` 探测 / 非交互一次性执行（prompt 传参 + 全权限）/ 机器可读输出（JSON/NDJSON 流）/ usage 上报 + session resume。
按此对 38 个候选分级：**A 协议现成（批一落地 5 家 + 批二 6 家）/ B 仅文本 headless（批三候选 5 家）/ C 无法诚实接入（13 家）**。

## 二、批一（本批落地，2026-10-11）

| providerId | 工具 | 非交互形态 | 全权限 | 输出信封 | usage | resume | 证据分级 |
|---|---|---|---|---|---|---|---|
| `cursor-agent` | Cursor CLI | `-p` + prompt 位置参数 | `--yolo` + `--trust` | **Claude 兼容**（system/user/assistant/tool_call/result） | result.usage 条件携带 | `--resume [chatId]` | **本机 2026.07.16-899851b 产物源码级**（官方文档滞后：未记载 usage） |
| `gemini-cli` | Gemini CLI（Google） | `-p/--prompt <prompt>` | `--approval-mode yolo`（`--yolo` 已弃用） | **原生** init/message/tool_use/tool_result/error/result | result.stats.models.*.tokens 求和映射 | `--resume <uuid\|latest>` | 官方文档+测试快照 |
| `qwen-code` | Qwen Code（阿里） | `-p <prompt>` | `--yolo`（approval-mode 值闭集不同：连字符 auto-edit） | **Claude 风格**（system:session_start/assistant/user/result） | result.usage 直读 | `--resume <id>` / `--continue` | 官方文档+源码（fork 已与 gemini 分化，**不可共用解析器**） |
| `codebuddy` | CodeBuddy（腾讯 @tencent-ai/codebuddy-code） | `-p <prompt>` | `-y/--dangerously-skip-permissions`（**headless 必需**） | **Claude 兼容** + task_* 外围事件 | result.usage 直读 | `-r <uuid>` / `-c` | 官方文档（--version 未列，commander 系标准 flag 探测容错） |
| `grok` | Grok Build（xAI 官方，Rust 单二进制；npm 同名包均为社区无关货） | `-p <prompt>` | `--yolo` | 四种输出选 **streaming-messages-json（Claude Messages 兼容）** | result.usage + 顶层 total_cost_usd | `-r <id>` / `-c` | 官方文档字段级保真 |

**架构要点**：cursor/qwen/codebuddy/grok 四家共用 `claude-compatible.ts` 解析核（共同面 system/assistant/user/result + tool_use 内容块转时间线），gemini 独立原生解析器。codebuddy 是批一唯一 allowedTools 透传（能力位 true）。

## 三、批二（协议已归档，按此实现即可）

| 候选 | 关键协议 | 缺口/前置 |
|---|---|---|
| Qoder CLI（阿里） | **与 Claude Code 几乎 1:1**：`-p -o stream-json --yolo -r` | 直接复用 claude-compatible 核，成本最低 |
| Kimi Code CLI（月之暗面，旧 kimi-cli 已归档停维护） | `kimi -p --output-format stream-json`；**-p 不可与 --yolo 同用（非交互默认 auto 权限）**；`--session [id]` resume | stream-json 事件结构官方未详列，需实测采样一轮 |
| Amp（Sourcegraph，npm 已改名 @ampcode/cli） | `amp -x`；Streaming JSON 官方声明兼容 Claude 格式；usage 字段最全 | 版本探测用 `amp version` 子命令（无 --version flag）；execute 模式 resume flag 未证实；全权限 flag 未证实 |
| Droid（Factory AI，npm 包名就叫 `droid`） | `droid exec <prompt> --auto high -o json`（claude 风格 result）；`-s <id>` 续会话 | json 模式 usage 字段未证实；stream-jsonrpc 是长驻多轮通道（另形态） |
| Goose（Block→AAIF，Rust） | `goose run -t <prompt>` + `GOOSE_MODE=auto`（默认即 auto）；`--output-format stream-json` 独立信封 message/notification/error/**complete**（含全 token 分解+cost_usd）；`-r` resume | 独立解析器（小）；仓库已迁 aaif-goose/goose、文档迁 goose-docs.ai |
| Kiro CLI（AWS，原 Amazon Q CLI） | `kiro-cli chat --no-interactive <prompt> --output-format stream-json --trust-all-tools` | 仅 V2/V3 agent-engine 支持；需 KIRO_API_KEY 付费订阅；headless resume 未证实 |

批二次优先级建议：Qoder → Kimi Code → Amp → Goose → Droid → Kiro。

## 四、批三候选（仅文本 headless，coarse 接入需另立适配形态）

Devin CLI（`-p` 纯文本 + `--export` ATIF JSON 落盘；`--permission-mode dangerous`）、Rovo Dev（Atlassian，需付费订阅，JSON 未证实）、Auggie（Augment，`--print --quiet`）、Kilo Code（`kilo run`，JSON 未证实）、Aider（`--message --yes`，无任何 JSON，结果只能靠 git diff 回读）。
该档无结构化输出，SPI 的流式时间线/usage 双轨成本两能力注定 missing，接入前需产品裁决「文本-only 适配器」形态是否值得开（建议 0.8.0 后再说）。

## 五、无法诚实接入（2026-10-11 时点）

| 工具 | 原因 |
|---|---|
| Trae CLI（字节） | 文档站改版，CLI 参考不可达，headless 未证实 |
| Continue CLI（cn） | `cn -p --format json --allow "*"` 存在但事件结构未详述——**降级批二观察**（若实测补齐结构可升批二） |
| Cline CLI | `cline --json --yolo` NDJSON 存在但自有事件结构——同上降批二观察 |
| Copilot CLI（GitHub） | `--output-format json`(JSONL) 存在但记录结构官方无文档，协议透明度最差——实测逆向后再评 |
| Ante / MiMo Code / Muse / dsh-tui / Prime Agent / Hermes / Autohand Code / OpenClaude / Command Code | 无公开包或占位包，未证实 |
| OpenClaw | 消息网关（Clawdbot 系），非编码 CLI harness |
| Codebuff / Freebuff | CLI 在但 headless flag 未证实（文档站 JS 渲染抓不到） |
| Claude Agent Teams（orca 包装） | 底层就是 Claude Code，经 claude-code provider 即可覆盖，无需独立 adapter |

## 六、本批改动面（沿 opencode 扩容先例）

- shared 单源：`interface.ts`（ProviderId 九家 + 能力位总表）、`claude-compatible.ts`（新解析核）、五家 adapter、`index.ts` 导出、`adapters.test.ts` 42 例
- server 双轨镜像：`adapters/` 六文件 + `cli-dispatch.module.ts` 注册 + `cli-provider` DTO/service/registry providerIds 链 + `cli-asset-scanner` 五家分支（cursor/gemini/qwen 实扫 mcpServers，codebuddy/grok 诚实降级注记）
- daemon：`apps/cli/src/runtime/worker.ts` ADAPTERS 表 +5
- 前端：`provider-meta.tsx` +3（qwen-code/codebuddy/grok；cursor-agent/gemini-cli 原有预留条目直接生效）+ 两处 @lobehub/icons mock 扩容
- 契约：DTO 枚举扩容 → openapi.json 重导出 → 前端生成类型再生 → contract:check 零漂移
- 已知边界（如实记）：五家 prompt 均走 argv，Windows shell 链路受 cmd.exe ~8K 命令行上限约束（claude-code 经 stdin 免疫，zcode 经 node 直启免疫）；cursor 未登录无法实跑真 turn，gemini/qwen/codebuddy/grok 本机未安装——全链实机验收列余留

## 七、证据来源

- cursor-agent：本机 `C:\Users\life_\AppData\Local\cursor-agent\versions\2026.07.16-899851b\5305.index.js` 源码采样 + `--help` 实测 + cursor.com/docs/cli
- gemini-cli：google-gemini/gemini-cli docs/cli/{headless,cli-reference,session-management}.md + nonInteractiveCli 测试快照
- qwen-code：QwenLM/qwen-code docs/users/features/headless.md + src/config/top-level-options.ts
- codebuddy：cnb.cool/codebuddy/codebuddy-code docs/{headless,cli-reference}.md + npm @tencent-ai/codebuddy-code
- grok：xai-org/grok-build README + crates/.../docs/user-guide/{14-headless-mode,17-sessions}.md
- 其余各家：官方 docs/源码/npm registry（详见第三~五节对应行）
