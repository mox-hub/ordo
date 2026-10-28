---
title: 全流程节点图 × AI 介入点 × 兜底策略
description: 主线管道到验收闭环的全景流程图（mermaid），标注 AI 介入点与 CAP-A-19 四批兜底策略
id: ROADMAP-FLOWMAP-001
category: roadmap
status: active
version: 1.0.0
created: "2026-09-16"
modified: "2026-09-16"
scope: 本地 roadmap 文档（docs/ 不入库）
ai-priority: normal
tags: "流程图, AI 介入, 兜底, CAP-A-19, CAP-P-01"
---

# 全流程节点图 × AI 介入点 × 兜底策略

> 口径基准：develop + PR #52（feat/execution-fallback，CAP-A-19 兜底四批）+ feat/create-dual-panel（CAP-A-18 双界面，未合并）。
> 图例：🟣 紫节点 = AI 介入点；🔴 红节点 = 兜底策略（F1~F8）；🔵 蓝节点 = 人工决策点。

## 一、全流程主节点图

```mermaid
flowchart TD
    %% ═══════════ ① 需求承接管道 ═══════════
    subgraph L1["① 需求承接管道（CAP-P-01 主线）"]
        IN(["用户：自然语言需求"]) --> G1["需求访谈<br/>grill-next 动态追问<br/>interview-prefill 预填"]:::ai
        G1 --> H1{"人：回答/确认访谈"}
        H1 --> G2["analysis-draft<br/>需求分析报告草稿（工件）"]:::ai
        G2 --> H2{"人：确认工件"}
        H2 --> G3["intake-composite<br/>任务族 + 验收清单组合件提案"]:::ai
        G3 --> H3{"决策收件箱批卡<br/>（过期提案被 F6 拒收）"}
        H3 -->|采纳| G4["批量落库：Issue × N + 验收标准 × N"]
    end

    %% ═══════════ ② 创建面板 ═══════════
    subgraph L2["② 创建面板（CAP-A-18 手动 × AI 双界面）"]
        C1(["用户打开统一创建面板"]) --> C2{"选界面"}
        C2 -->|手动| C3["表单：标题/描述/类型/优先级"]
        C2 -->|AI 代理| C4["create-suggestions<br/>候选草稿生成"]:::ai
        C4 --> C3
        C3 --> C5["acceptance-draft<br/>验收标准 AI 代写（可选）"]:::ai
        C5 --> H4{"人：确认提交"}
        C3 --> H4
        H4 --> C6["建 Issue + 直建 Acceptance 契约<br/>（artifact / draft）"]
        H4 -->|跳过代写| C7["建 Issue（无契约）"]
    end

    %% ═══════════ ③ 执行前门禁与派发 ═══════════
    subgraph L3["③ 执行前门禁与派发（CAP-A-19 批3 + 批0）"]
        D1(["触发执行：AI 同事「转执行」/ 任务派发"]) --> D2{"F2 执行前门禁<br/>assertDispatchGate：活契约且标准 > 0？"}:::guard
        D2 -->|否 → 400| D2X["阻断 + 指引：<br/>去详情页 AI 代写后重派"]:::guard
        D2X -.->|补全后重派| D1
        D2 -->|是| D3["F1 载荷补齐<br/>providerId ← cliProviders[0]<br/>workspaceRoot ← 三级回退"]:::guard
        D3 --> D4["createDispatch<br/>写 AppConfig 派发指令 + WS 推送"]
    end

    %% ═══════════ ④ 执行面 ═══════════
    subgraph L4["④ 执行面（runtime daemon + CLI）"]
        E1["daemon 收取派发<br/>WS 即时 / 15s 轮询兜底 F8"]:::guard
        E1 --> E2{"F1 worker 载荷校验<br/>providerId / prompt / workspaceRoot"}:::guard
        E2 -->|缺失| E2X["精确报错：缺哪个列哪个"]
        E2 -->|通过| E3["CLI Adapter 执行<br/>claude-code / codex / zcode"]:::ai
        E3 -->|ai.stream 流式回传| E4["Execution 状态机流转"]
        E3 --> E5{"需人工审批？"}
        E5 -->|是| E6["ApprovalRequest<br/>→ pending_approval"]
        E6 --> H5{"人：批准 / 拒绝"}
        H5 -->|批准| E3
        H5 -->|拒绝| E7["failed / blocked"]
        E5 -->|否| E8["执行完成 → 产出"]
        E7 --> F1N
    end

    %% ═══════════ ⑤ 兜底感知与对账 ═══════════
    subgraph L5["⑤ 兜底感知与对账（CAP-A-19 批1 + 批2）"]
        R1["reconcile 每 2min 扫描"]:::guard
        R1 -->|"pending 派发超 TTL 24h"| R2["expired 终态"]:::guard
        R1 -->|"in_progress 超 5min 且 runtime 离线"| R3["publishStalledResult<br/>注入统一收敛链"]:::guard
        F1N["F3 通知链<br/>failed / blocked / approval.requested"]:::guard
        F1N --> F2N["受众解析：createdBy + assignee<br/>订阅已覆盖用户去重"]:::guard
        F2N --> F3N["前端铃铛 + 连接横幅<br/>（F7 WS 断连感知）"]:::guard
    end

    %% ═══════════ ⑥ 结果收敛与验收闭环 ═══════════
    subgraph L6["⑥ 结果收敛与验收闭环"]
        V1["runtime.execution.result<br/>统一收敛出口"]:::guard
        V1 -->|success| V2["completeExecution"]
        V1 -->|failed| V3["failExecution<br/>+ 助手占位消息替换 + 通知"]
        V2 --> V4["证据回流（CAP-B-08）<br/>AcceptanceEvidence"]
        V4 --> V5{"有活契约且标准 > 0？"}
        V5 -->|否| V6["完成评审页：AI 代写验收标准<br/>acceptance-draft → 人确认<br/>→ apply-criteria 落契约"]:::ai
        V6 --> V7{"验收判定"}
        V5 -->|是| V7
        V7 -->|pass| V8["Issue completed ✅"]
        V7 -->|fail / waive| V9["回炉：重开或豁免"]
        V9 -.-> D1
    end

    %% ═══════════ 跨层主线 ═══════════
    G4 --> D1
    C6 --> D1
    C7 -.->|"派发时被 F2 拦截"| D2
    D4 --> E1
    E8 --> V1
    E2X --> V1

    classDef ai fill:#f3e8ff,stroke:#9333ea,color:#3b0764
    classDef guard fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef human fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
```

## 二、Execution 状态机与兜底触发点

```mermaid
stateDiagram-v2
    direction LR
    [*] --> draft: 建单
    draft --> planned: 计划
    planned --> in_progress: 派发通过 F2 门禁
    in_progress --> pending_approval: 审批请求（F3 通知）
    pending_approval --> in_progress: 批准
    pending_approval --> failed: 拒绝
    in_progress --> completed: 成功回传
    in_progress --> failed: 失败回传 / 停滞对账 F4
    in_progress --> blocked: 阻断
    blocked --> superseded: 取消收口 F5
    failed --> [*]
    completed --> [*]
    superseded --> [*]

    note right of in_progress
        兜底对账（批2，reconcile 每 2min）
        · pending 派发超 EXEC_PENDING_TTL_MS(24h) → expired
        · in_progress 超 EXEC_STALL_THRESHOLD_MS(5min)
          且 runtime 离线 → 注入 failed 收敛链
        · 两阈值 env 可配；workflow 侧另有 5min 周期对账
    end note
```

## 三、AI 介入点清单

| # | 环节 | 场景 / 机制（assistant-silent） | 人的角色 |
|---|------|-------------------------------|---------|
| A1 | 需求访谈 | `grill-next` 动态追问 · `interview-prefill` 预填 · `interview-dynamic` 追问 | 回答追问 |
| A2 | 需求分析 | `analysis-draft` 分析报告草稿（intake 弹窗） | 确认工件 |
| A3 | 拆解落库 | `intake-composite` 任务族+验收清单组合件 → 决策收件箱批卡 | 一次批卡落库 |
| A4 | 建单辅助 | 创建面板 AI 代理界面 + `create-suggestions` 候选 | 选候选微调 |
| A5 | 验收代写 | `acceptance-draft` 三入口：创建面板 / 完成评审页 / 详情页 → 人确认 → `apply-criteria` | 确认标准 |
| A6 | 执行主体 | AI 同事（Member platform_ai_member）经 CLI adapter 亲手写代码 | 只在审批闸门出手 |
| A7 | 对话转执行 | assistant `dispatchExecution` 消息转执行单 | 发起对话 |

## 四、兜底策略清单（CAP-A-19 四批 + 既有）

| 编号 | 名称 | 触发条件 | 动作 | 出处 |
|------|------|---------|------|------|
| F1 | 载荷缺失防呆 | providerId / prompt / workspaceRoot 缺失 | 派发前补齐（`cliProviders[0]` + 工作区三级回退）；worker 报错精确到缺哪个 | 批0（本分支起点修复） |
| F2 | 执行前门禁 | 无活验收契约或 criteria = 0 | 400 阻断 + AI 代写指引（严格要求，已裁决） | 批3 |
| F3 | 失败/阻断通知 | ExecutionRunUpdated(failed/blocked)、ApprovalRequested | 定向通知 createdBy + assignee；`NOTIFY_EXECUTION_AUDIENCE` 可切 project；订阅去重 | 批1 |
| F4 | 悬挂对账 | reconcile 2min：pending > 24h TTL；停滞 > 5min 且 runtime 离线 | pending → expired；停滞 → failed 注入统一收敛链 | 批2 |
| F5 | 状态收口 | cancel blocked 态；run 端点越权 | blocked → superseded 终态；五个 run 端点归属校验 | 批2 |
| F6 | 提案过期 | DecisionProposal expiresAt < now | resolve 拒收；收件箱查询过滤过期 | 批4 |
| F7 | 连接感知 | WS 断连 / 错误 | connection-banner 前端横幅 | 批1 |
| F8 | 派达兜底 | WS 推送丢失 | daemon 15s 轮询 AppConfig 派发指令 | 既有机制 |

## 五、分支状态注记

- CAP-A-19 兜底四批：PR #52（feat/execution-fallback → develop，2026-09-16 提交，gate 七关全绿）。
- CAP-A-18 双界面创建面板：feat/create-dual-panel 六批已提交未合并；图中②层按该分支口径绘制。
- 其余节点均为 develop 现状。
