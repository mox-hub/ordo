---
title: Workflow v2 重构方案（参照 ZCode 动态工作流引擎，2026-09 设计稿）
description: APM workflow 重构总设计——ZCode 动态工作流引擎五层设计提取、APM 现状六缺陷诊断、文法 v2（节点树/agent 节点/wait 节点）、确定性引擎+journal 双层重造、执行桥与治理面、UI 运行可视化、四阶段路线与决策点
id: ROADMAP-WFV2-001
category: roadmap
status: draft
created: '2026-09-26'
modified: '2026-09-26'
scope: workflow 模块重构（后端引擎 + 前端画布 + 数据模型）
ai-priority: high
ai-session-types: all
tags: 'workflow, engine, zcode-reference, journal, orchestration, agent-dispatch'
---

# Workflow v2 重构方案（已立项 → CAP-S-03，planned 待开工令）

> **立项记录（2026-09-26）**：经 requirement-intake 五步与本方案 §六五项决策点用户拍板，以 **CAP-S-03**（S 自举线，[[能力清单-v1]] §4.7）登记 planned。D1-D5 裁决结果已回填 §六表格；A-11/A-12 关系注记已同步入清单。开工时置 doing 并登记 GAP。

## 〇、定位与一句话结论

**参照 ZCode 动态工作流的引擎设计，把 APM workflow 从「线性步骤链 + Mastra 编排壳」重构为「阶段化节点树文法 + 确定性引擎 + journal 账本 + 执行桥（LLM/外部 agent/人工）+ 运行可视化」。**

一句话结论：**ZCode 用「确定性引擎核心 + journal 双层账本 + 静态分析先行」解决了 APM workflow 的全部六个结构性缺陷；但 APM 不应照搬它的 TS 脚本形态——APM 的用户是非专业团队、流程是治理流程，图形文法 v2（JSON 节点树，画布可编辑，AI 可代写）+ ZCode 的引擎原则才是正确组合。** 本次重构同时吸收 agent-integration-plan 的通道 C（agent 派发步骤与事件推进器升级为文法级节点）。

## 一、参照系：ZCode 动态工作流引擎的设计提取

源码已克隆至 `D:\workspace\ZCode`（zai-org/ZCode，浅克隆）。引擎分层与核心设计决策（实证于 `apps/zcode-cli/packages/dynamic-workflow*`）：

### 1.1 五层架构

| 层 | ZCode 实现 | 核心决策 |
|---|---|---|
| 编译/静态分析 | TS Compiler API + 全内存虚拟 host + facade dts 注入 | 一个 `ts.Program` 是唯一事实源：类型检查、站点表（`ask#N`）、JSON Schema 合成、world.run 命令集、phase 因果图、lowering 产物全部一次产出；产物是可审计的 JS 文本而非 AST |
| 引擎核心 | 确定性状态机 | **零 I/O、零时钟、零随机**（编译期禁 `Date.now/Math.random/fetch/fs`，运行期再禁一遍）；实例身份 = siteId×ordinal；一切效果经 `__host` 端口注入 |
| 调度 | per-actor FIFO + 双层并发 | 一个 actor 同时至多一个在飞 ask（同 actor 后续请求 FIFO 排队）；per-run 并发上界可热调 + 进程级 AIMD 治理器（限流×0.75、连续成功+1、epoch 阻尼） |
| 执行桥 | 独立子进程 + vm realm + NDJSON | 脚本进程唯一出口是 `__host` shim；子代理 = 每 actor 一个持久会话 + `submit_result`/`escalate` 两个工具端口；escalation 全程对引擎核心零感知 |
| 持久化 | 四张表 journal（run/actor/node/event） | **节点行（准入即 running、结算一笔写）+ 事件流（appendEvent 内分配序号）双层**；run 存脚本全文+哈希；崩溃后从 journal 逐字重放 |

### 1.2 值得移植的七条设计原则

1. **确定性核心 + 注入式效果端口**：引擎可测试、可 replay、可修订的根基；换宿主只需换 driver。
2. **错误分类学**：按「拒绝通道是否存在」分类——节点级失败（脚本可 catch，不失败整个 run）/ run 级失败 / provider 确定性错误（停 run 可恢复，结构化明细）/ 瞬态错误（无限退避重试 + 20 分钟 stall 时钟兜观察）。**绝不匹配错误 message 文本，全部结构化错误码。**
3. **静态分析先行**：用户批准的是运行前提取的**阶段图**（含循环回边与命令集封闭集合）；运行期 = 图的状态叠加，节点/边集合永不变化。
4. **实例身份与聚合**：一个节点定义对应 N 个运行实例（循环/扇出），`siteId×ordinal` 编址；UI 按站点折叠聚合（「任一 running → running 优先于 failed」）。
5. **修订缓存（Amend）**：修订重跑按「命名身份 + 输入哈希逐序匹配」复用已完成节点，只付改动的部分；第一笔真实写入后缓存关门（防世界已变仍用旧观察）。
6. **上限的执行侧分裂 + 拒绝不截断**：谁知道几版/几条谁执行 cap；超限 fail-fast 而非静默截断（「静默截断的搜索是你无法推理的唯一结果」）。
7. **UI 纪律**：「一个模型三处消费」（确认卡/运行卡/详情页同一纯函数投影）；「缺席≠pending」（没跑的分支不上灰）；统计格拿不到写 `—` 不写 0；回放与实时共用同一铸造链（逐字节相同）。

### 1.3 不照搬的部分（形态差异）

- **TS 脚本形态不搬**：ZCode 面向开发者单用户；APM 面向非专业团队（产品主轴）、流程是治理流程（重用性高、变化低）、服务端多租户跑用户脚本沙箱成本高。APM 用**声明式节点树文法 v2**（JSON：可存储、画布可编辑、AI 可代写）表达同样的编排能力（阶段/扇出/循环/条件/等待）。
- **本地子代理会话不搬**：APM 的执行者是「服务端 LLM + 外部 agent 工具（cli-dispatch）+ 人工」，执行桥对接现有 cli-dispatch/ai-hub/decision 模块。

## 二、APM workflow 现状诊断（六个结构性缺陷）

现状：后端 13 文件 3231 行（definition v1 线性链、5 步骤类型、Mastra 编译壳）、前端 12 文件 2561 行（React Flow 只读画布）、6 个内置模板、AI 助手四件套走决策卡。

| # | 缺陷 | 实证 | 后果 |
|---|---|---|---|
| X1 | **运行时无逐步账本** | `AIWorkflowRun.stepsState` 只存 `{suspendedStepId, suspendPayload}`；`AIWorkflowStep` 表零写入（死表） | 无法回放每步输入输出、无法做运行可视化、崩溃即失忆 |
| X2 | **跨重启恢复不可靠** | Mastra suspend/resume 依赖进程内 activeRuns 句柄，服务重启即丢 | 「等外部执行完成再继续」不可能实现 |
| X3 | **编排表达力贫乏** | 线性步骤链，5 种步骤类型，无并行/扇出/循环/等待 | 表达不了「逐文件评审→分诊→修复」这类真实研发编排 |
| X4 | **与执行域零耦合** | workflow 与 execution 无外键；action 经 prisma 直写不过领域 service（不触发自动派发/门禁/事件） | 系统内流程驱动不了外部 agent（agent-integration-plan 断点 B2） |
| X5 | **触发只有手动 API** | 无事件触发、无定时触发 | 自动流程无从谈起 |
| X6 | **版本原地更新** | definition 更新 version+1 但旧 run 无快照；旧 run 无法解释当时定义 | 历史运行不可审计 |

## 三、v2 目标架构

```
┌─ 前端（React Flow 升级）────────────────────────────┐
│  画布编辑（节点树 DAG，拖拽连线）→ definition v2      │
│  运行视图 = 静态图 + 状态叠加（同模型三处消费）          │
└──────────────┬─────────────────────────────────────┘
        REST/WS（节点事件流 delta upsert）
┌─ server：workflow 模块 v2 ──────────────────────────┐
│  文法 v2 校验器 + 静态投影（阶段图/输入输出 schema）     │
│  确定性解释器（零 I/O，效果经 ExecutorPort）           │
│  调度器（阶段推进 + 节点内并行 + 并发上界）              │
│  事件推进器（MessageBus → wait 节点结算）              │
│  Journal（WorkflowNodeRun 行 + WorkflowEvent 流）    │
└──┬──────────────┬──────────────┬───────────────────┘
   ▼              ▼              ▼
 ExecutorPort   ExecutorPort   ExecutorPort
 ┌llm──────┐  ┌agent────────┐  ┌human/action──┐
 │AI SDK   │  │cli-dispatch │  │确认卡/决策卡   │
 │AIUsageLog│ │(门禁+信任+   │  │领域 service   │
 └─────────┘  │ ExecutionRun)│  │(issue/document│
              └─────────────┘  │ /release)     │
                               └───────────────┘
```

### 3.1 文法 v2：从线性链到节点树

核心升级：**容器节点（loop / fan-out / phase 内并行）允许嵌套**，表达能力对齐 ZCode 脚本（loops/conditionals/fan-out），保持声明式可校验。骨架示例：

```jsonc
{
  "version": 2,
  "input": [{ "key": "issueId", "type": "string", "required": true }],
  "phases": [                                   // 阶段 = 用户批准/观看的单位
    { "id": "intake", "name": "需求初筛与六问起草" },
    { "id": "review", "name": "逐文件评审并逐条复核" },
    { "id": "fix",    "name": "修复最关键的问题并验证" }
  ],
  "nodes": [
    { "id": "screen", "type": "llm", "phase": "intake",
      "prompt": "对 {input.issueId} 做初筛……", "outputSchema": { /* 轻量 JSON Schema */ } },
    { "id": "gate", "type": "human", "phase": "intake",
      "mode": "decision-card", "title": "六问评审裁决" },
    { "id": "review-files", "type": "fan-out", "phase": "review",
      "over": "{steps.plan.files}", "as": "file", "concurrency": 4,
      "body": [ { "id": "per-file", "type": "llm", "prompt": "评审 {refs.file}……" } ] },
    { "id": "fix-loop", "type": "loop", "phase": "fix",
      "until": "{refs.checkPassed}", "maxRounds": 3,
      "body": [
        { "id": "fix", "type": "agent", "provider": "zcode", "targetMode": "goal",
          "issueRef": "{input.issueId}", "goal": "修复 {steps.triage.top} 并自验" },
        { "id": "await-result", "type": "wait",
          "event": "runtime.execution.result",
          "match": { "executionRunId": "{steps.fix.executionRunId}" } }
      ] }
  ],
  "triggers": { "on": ["issue.created"], "manual": true }
}
```

节点类型 8 种：`llm`（保留）/ `agent`（新：派发外部 agent 工具，接 `dispatchTaskToCli`，`targetMode: prompt | goal`——goal 模式对齐 ZCode `--target` 目标循环）/ `human`（升级：`inline` 确认卡或 `decision-card` 决策卡双轨）/ `condition`（保留）/ `action`（保留，改走领域 service）/ **`fan-out`**（新：按上游数组输出扇出并行子节点）/ **`loop`**（新：有界循环，round cap 强制）/ **`wait`**（新：挂起等待外部事件，由事件推进器结算）。

数据流沿用 v1 插值（`{input.x}`/`{steps.y.z}`），新增 `outputSchema` 轻量校验（ZCode schema 合成的声明式对应物）与 `refs.*` 容器内迭代变量。

### 3.2 引擎：确定性解释器 + journal 双层（替换 Mastra 编排壳）

- **解释器**：definition v2 → 静态投影（阶段图+校验）→ 运行期按节点树推进；零 I/O、零时钟（延时/重试策略作为参数注入），一切效果经 `ExecutorPort` 四端口（llm/agent/human/action）+ 事件订阅。
- **journal 双层落库**（修复 X1/X2/X6）：
  - `AIWorkflowRun` 增强：+`graphSnapshot Json`（运行时 definition 快照+哈希，旧 run 可审计）；status 保留。
  - **`AIWorkflowStep` 死表改造为 `WorkflowNodeRun`**：runId、nodeId（siteId）、ordinal（循环/扇出轮次）、status（running/completed/failed）、inputHash、inputJson、resultJson、errorJson、statsJson、executionRunId?（agent 节点→执行域外键，打通 X4）、phaseId、startedAt/finishedAt。**准入即写 running、结算一笔写**（ZCode 两次写纪律）。
  - 新表 `WorkflowEvent`：runId + sequence（`unique(run_id,sequence)`）+ type + payloadJson——一切可观察迁移（run-started/phase-entered/node-settled/waiting/escalation…）；前端实时渲染数据源；`ai.workflow.update` 升级为携带 delta 的真事件（不再只做缓存失效）。
- **恢复语义**：resume = 同 runId 从 journal 重放（已 completed 节点直接复现结算，running 节点重新派发）——**跨重启恢复成立，X2 关闭**；修订重跑（amend，P2 可选）= 新 runId + 节点 id+inputHash 匹配复用（ZCode 缓存算法的图形版）。
- **错误分类学**照搬四分类：节点失败（fan-out 单项失败不拖垮整体，`allSettled` 语义）/ run 失败 / agent 确定性失败（provider 不可用→run stopped 可恢复）/ 瞬态（指数退避 + run 级 stall 扫描——后台 job 按事件时间戳扫，非进程内 timer）。
- **Mastra 基座去留**（决策点 D2）：引擎核心自研后 Mastra 编排壳（仅用其 suspend/resume+workflow 原语）可整体退役，AI SDK 模型调用层不受影响；注意 2026-09 已有「Mastra 基座发展而非删」的裁决，本方案将其重新裁决为「Mastra 保留于 ai-hub 通用编排，workflow 模块换自研引擎」——需用户拍板。

### 3.3 执行桥与治理面

- **agent 节点**：唯一入口 `dispatchTaskToCli`（验收门禁/blocks 依赖/信任门禁/ExecutionRun+CliSession 记账全保留）；`executionRunId` 回写 `WorkflowNodeRun`；执行事件（execution.token/file.change）可选择性转投 workflow 事件流。
- **wait 节点 + 事件推进器**：MessageBus 订阅白名单事件（`runtime.execution.result`/`execution.completed`/`decision.resolved`…）→ 按 match 条件结算挂起节点→引擎从断点继续。**这同时实现 agent-integration-plan 的 B3 修复与 P1-2 推进器**。
- **human 节点**：`inline`（现有 waitingApproval 确认卡，轻场景）/ `decision-card`（建 DecisionProposal，走审批闭环，重场景）；审批决议事件同样经推进器结算。
- **action 节点**：`issue.create` 等改经领域 service（修 X4 的 prisma 直写暗断点，自动派发/事件链全通）。
- **触发器**：`triggers.on` 白名单事件 + manual（修复 X5）；cron 留待后续（ZCode automations 同款场景：夜航巡检定时拉起）。

### 3.4 前端：画布升级 + 运行可视化

- **画布真编辑**：v2 节点树是 DAG，React Flow 从「只读+表单调序」升级为拖拽连线编辑（节点类型=节点库面板保留）；校验器前置（连线非法即时提示）。
- **运行视图 = 一个投影函数**：`buildRunView(graphSnapshot, nodeRuns[], events[])` 纯函数——确认弹窗（运行前静态阶段图+输入+agent 节点的 provider/goal 声明）、运行卡、详情页三处消费同一模型（ZCode「一个模型三处消费」纪律）。
- **运行中**：阶段进度条带（状态点 done/current/ahead）+ 节点卡聚合状态（running 优先于 failed、`settled/observed` 计数、循环 `⟳n 轮`）+ 工件/输出卡；数据 = WS `workflowRun.updated` delta（header 键替换 + nodeRuns 按 (nodeId,ordinal) upsert + 绝对 revision——ZCode delta op 原样照搬）+ `GET /workflow-runs/:id/events?afterSequence=` 游标兜底轮询。
- **人工交互**：human 节点确认卡内联在详情页；agent 执行中的审批请求（cli-dispatch approval）冒泡到 workflow 视图；失败节点「重试此节点」入口（re-amend 语义）。
- **统计格**：时间/tokens（AIUsageLog 归因）/节点数/阶段数，拿不到写 `—` 不写 0。

## 四、数据模型变更汇总（Prisma）

| 表 | 动作 | 要点 |
|---|---|---|
| `AIWorkflowDefinition` | 微调 | +`grammarVersion Int @default(1)`；definition 存 v2 JSON；v1 定义升级器一次性迁移（线性链→单阶段节点树，6 个内置模板手工重写为 v2） |
| `AIWorkflowRun` | 增强 | +`graphSnapshot Json`、`graphHash String?`、`currentPhaseId String?`、`stopReason String?`、`resumedFromId String?`（supersede 链，为 amend 预留）；索引补 `(status, updatedAt)` |
| `AIWorkflowStep` | **重造改名 `WorkflowNodeRun`** | 见 §3.2；`(runId, nodeId, ordinal)` unique |
| `WorkflowEvent` | 新表 | runId+sequence+type+payload；`(runId, sequence)` unique |
| `AIUsageLog` | 不动 | workflowRunId 归因已有，v2 继续用 |
| Execution 域 | 不动 | agent 节点经 dispatchTaskToCli 既有记账，零改动 |

## 五、分期路线

| 阶段 | 内容 | 出口判据 |
|---|---|---|
| **W1 文法与引擎核心** | 文法 v2 定义+校验器+静态投影；确定性解释器；WorkflowNodeRun/WorkflowEvent 两表；resume 重放；v1→v2 升级器（含 6 内置模板重写）；REST 兼容（旧端点语义不变） | `apm-requirement-intake` 以 v2 文法+新引擎跑通且中途重启 server 后 resume 成功 |
| **W2 执行接线** | `agent`/`wait`/`fan-out`/`loop` 节点；事件推进器；action 走 service；human 双轨；`apm-dev-mainline` 重写（含 agent 节点派发 zcode goal 模式） | 一次「六问→裁决→建卡→派发 zcode→wait 执行完成→推进到验收」全链 run 留有逐步账本 |
| **W3 运行可视化** | 画布拖拽编辑；buildRunView 投影；WS delta + 事件游标；确认窗/运行卡/详情页；审批与失败重试交互 | 仿 ZCode 截图的三态体验：确认阶段图 → 运行中阶段进度+节点卡 → 完成统计+工件 |
| **W4 进阶**（可选） | amend 修订重跑（节点缓存复用）；事件/定时触发器白名单；模板 registry 化（CAP-A-12 遗留）；MCP/CLI 面暴露 workflow 工具 | 修订重跑只付改动部分；`issue.created` 自动拉起承接流 |

依赖关系：W1/W2 涵盖并**吸收** agent-integration-plan 的 P1-1/P1-2/P1-3/P1-4（通道 C）；该计划的 P0（zcode adapter/shim/MCP 配置）是 W2 agent 节点的前置，仍按原计划先行。

## 六、关键设计决策点（✅ 已全部裁决，2026-09-26）

| # | 决策 | 选项 | 裁决 |
|---|---|---|---|
| D1 | 文法形态 | a) TS 脚本（ZCode 原样）；b) 声明式节点树 v2；c) b+高级脚本节点逃生舱 | ✅ **b，用更通用的形式（JSON）编排**；c 留 W4 后评估 |
| D2 | Mastra 编排壳去留 | a) 退役（引擎自研，AI SDK 保留）；b) 继续 Mastra 加持持久化补丁 | ✅ **a，采用 ZCode 自研引擎的设计改造**（确定性核心/journal 双层/错误分类学等七条原则自行实现，不引入其代码） |
| D3 | human 节点形态 | a) 只内联确认卡；b) 只决策卡；c) 双轨（节点配置） | ✅ **c，同意双轨** |
| D4 | 步骤账本表 | a) 改造死表 AIWorkflowStep；b) 新表丢弃死表 | ✅ **a，建议改造**（改名重造 WorkflowNodeRun） |
| D5 | agent 节点并发与信任 | fan-out 的 agent 并发上界来源 | ✅ **本期不做信任等级联动，仅预留接口**（并发上界=provider 上限/节点配置；联动留后续切片） |

## 七、风险与红线

1. **规模控制**：ZCode 引擎实现量级很大（编译管线+journal+缓存修订全套）。本方案分期裁剪——W1-W3 不含 amend 缓存、不含 TS 编译管线、不含 AIMD 治理器（声明式文法不需要）；先立骨架后长肌肉。
2. **兼容红线**：v1 definition 与旧 run 只读保留（旧 run 无快照，详情页降级展示 definition 现值并标注）；REST 端点路径不变。
3. **事件推进器幂等**：`runtime.execution.result` 可能重放，推进器按 executionRunId 幂等结算；跨重启推进依赖 journal 而非内存（agent-integration-plan 风险 5 承接）。
4. **并发下毒**：fan-out agent 节点必须 round cap 强制（`maxRounds`/`over` 数组上限，建议 100），cap 拒绝不截断。
5. **前端体验红线**：运行视图不得退化为 JSON dump（现状 output `<pre>` 是底线体验）；统计格诚实降级。

## 八、与既有方案的关系

- **吸收** [agent-integration-plan-2026-09.md](./agent-integration-plan-2026-09.md) 通道 C：P1-1→`agent` 节点、P1-2→`wait`+推进器、P1-3→触发器、P1-4→action 走 service；其 P0（adapter/shim/MCP）与 P2 不变。
- **服务** [self-hosting-plan-2026-09.md](./self-hosting-plan-2026-09.md)：阶段 2 的 workflow 真跑（A2-5）以 W1 出口判据兑现；阶段 3 执行面自举以 W2 出口判据兑现。
- 立项口径建议：三案合并 CAP-S 自举线立项——S1 记账自举（自举总案）、S2 执行面接入（接入层方案 P0/P2）、S3 workflow v2（本案 W1-W4）。走 requirement-intake 五步裁决。

## 九、现状备注（2026-09-26）

- 参照系源码：`D:\workspace\ZCode`（浅克隆，仅供设计参照，不入 APM 仓库、不引入其代码版权——只借鉴已实证的设计原则，全部自行实现）。
- `apps/server/src/modules/workflow/` 现有 8 个测试文件（后端 4 spec 1140 行 + 前端 4 test 567 行）在重构中是安全网，W1 先行补 controller/e2e 缺口再动引擎。
- 前置：feat/prompt-governance-enhancements 分支的 CAP-A-24 未提交改动需先行处理。
