---
title: 执行侧兜底与容错改造方案
description: 主线执行流程现状调研 + 兜底缺口清单 + 分批改造方案（失败感知/悬挂对账/验收供给侧）
id: ROADMAP-FALLBACK-001
category: roadmap
status: implemented
created: "2026-09-15"
modified: "2026-09-17"
scope: 执行链路（execution/cli-dispatch/runtime/notification）+ 验收治理链路（acceptance/contract）
ai-priority: high
tags: "execution, fallback, acceptance, notification, roadmap"
---

# 执行侧兜底与容错改造方案（2026-09-15）

> 起因：用户实测反馈「执行流程贯通但容错缺乏」——①执行失败后的提醒与重新执行缺失；②存量工单验收契约无法自动补全、手动补全不流畅；③其他摩擦感。本文档为全链路调研结论与改造方案，改造开工前各批次需按 `requirement-intake` 流程对照能力清单登记。

---

## 一、总体结论

**单点技术兜底扎实，系统性兜底缺位。**

已有的可靠底座（改造时复用，勿重造）：

- Execution 八态状态机 + 禁跳步校验（`execution.service.ts:60-81`），started 乱序/缺失有补齐兜底（`dispatch.service.ts:654-666`）；
- daemon worker 对 CLI 子进程的完整超时/非零退出/审批驳回处理（`worker.ts:296-368`、`process-runner.ts:107-118`）；
- cli-dispatch 派发前置校验失败会落 blocked 留痕再抛错（`dispatch.service.ts:102-155`）；
- 助手 CLI 桥失败时占位消息原位替换为失败态（`assistant-runtime-bridge.service.ts:78-147`）；
- 验收「收口端」门禁很硬：关单 TASK_DONE_BLOCKED（`issue.service.ts:1482-1499`）、接收五重校验+审计红牌阻断（`acceptance.service.ts:439-537`）、发版门禁（`release-gate.service.ts:191-215`）；
- 执行详情「事件流合成伪步骤」兜底 steps 空表（`run-details-format.ts:403-431`）。

**三条系统性断裂带**（全部缺口归入）：

| 断裂带 | 一句话 | 代表场景 |
|---|---|---|
| A. 失败无感知 | 事件发布了没人订阅、前端想听的事件没接线、订阅了也只有订阅者收到 | 执行失败后用户必须自己刷执行中心才知道 |
| B. 悬挂无对账 | 全 server 无 @Cron/ScheduleModule，任何中途异常都变成永久悬挂 | daemon 崩溃 → in_progress 永久转圈、助手气泡无限加载 |
| C. 治理供给侧瘸腿 | 门禁收口端很硬，但标准从哪来/缺了谁知道/怎么补上三点全缺 | 存量工单 100% 空契约，audit-gate 端点零消费形同虚设 |

---

## 二、主线流程现状地图

```
需求承接(intake)          拆解执行                验收收口
┌────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ grill 拷问  │   │ 派发: cli-dispatch│   │ 证据回流(PR/CI)   │
│ 分析代写    │ → │  / runtime daemon │ → │ acceptance→in_review│
│ 拆解批卡   │   │  / 助手 CLI 桥     │   │ 人工接收/驳回/豁免 │
│ (含验收标准)│   │ Execution 状态机  │   │ 关单门禁/发版门禁  │
└────────────┘   └──────────────────┘   └──────────────────┘
     ▲ 断裂带C入口      ▲ 断裂带A/B主灾区        ▲ 断裂带A(静默)
```

逐环节现状（详细证据见 §五索引）：

1. **需求承接**：grill 澄清/分析代写有行内错误+重试（良好）；但无服务端会话态，刷新即丢；拆解批卡是唯一「带验收标准建任务」的路径；拆解提案创建零广播，用户不知道提案已进收件箱。
2. **派发执行**：前置校验失败留痕+抛错（收件箱任务除外）；无自动重试；`DISPATCHABLE_STATUSES` 允许 failed/blocked 重派（手动重试通路已存在，但执行中心页面没有入口）；pending 派发无 TTL，daemon 恢复后会捡起陈旧任务执行。
3. **执行过程**：审批挂起（pending_approval）零通知；执行中心列表完全静止不刷新；任务详情执行区监听的 socket 事件服务端从未发送（死订阅）；run 详情弹窗轮询事件不轮状态（终态徽章卡住）。
4. **失败终态**：`execution.failed` 无任何通知订阅；前端老 execution 模块的 retry/escalate API 指向不存在的后端路由（死代码）；真正的重试在任务详情执行项面板（入口深）。
5. **验收收口**：执行完成推 `in_review` 无通知；「缺标准」对用户不可见（无徽标/筛选/列表）；手动补标准 4~5 步/条；审计只能手动触发且发生在执行后；contract 绑定与验收数据模型零关联。

---

## 三、缺口清单（按断裂带合并）

### 断裂带 A：失败/状态变化无感知

| # | 缺口 | 证据 | 严重度 |
|---|---|---|---|
| A1 | `execution.run.updated`（failed/blocked/pending_approval）无通知订阅；subscription 模块仅通知「主动订阅者」 | notification-event-subscriber.ts:24-124 | 高 |
| A2 | `approval.request.created` 发布后零订阅、网关不转发——审批挂起用户完全无感 | approval.service.ts:93 | 高 |
| A3 | 前端 event-client 只注册固定事件表，execution.*/approval.* 全不在列；`execution-items-panel` 监听的服务端从未 emit 的事件（死订阅） | event-client/index.ts:73-90; events.gateway.ts | 高 |
| A4 | socket 断线静默（无 UI 提示）+ 未读数无轮询兜底 + `refetchOnWindowFocus:false` → 断线期间全面陈旧且无感 | event-client.ts:59-69 | 高 |
| A5 | 执行中心列表/KPI 无轮询无 socket，打开后静止；run 详情弹窗不轮状态，终态徽章卡在 in_progress | executions-page.tsx; run-details-dialog.tsx:98-103 | 中 |
| A6 | 通知点击只标已读不跳转（issueId/projectId 落库了但没用） | notification-center.tsx:130-133 | 中 |
| A7 | 决策提案创建零广播，收件箱/侧栏徽标不自动刷新 | proposal.service.ts:88-105 | 中 |
| A8 | 派发失败只落 blocked 留痕，无事件无通知 | dispatch.service.ts:112-156 | 高 |

### 断裂带 B：悬挂无对账（无任何 cron/watchdog）

| # | 缺口 | 证据 | 严重度 |
|---|---|---|---|
| B1 | 孤儿 in_progress 执行永久悬挂：daemon 崩溃/断网后无超时对账，KPI 失真、轮询空转 | 全 server 无 @Cron；computeLiveness 仅展示层 | **高（最大无兜底场景）** |
| B2 | 助手占位消息永远 status='running'：daemon 中途死亡时桥的 onExecutionResult 永不触发，用户气泡无限转圈 | assistant-runtime-bridge.service.ts | 高 |
| B3 | pending 派发无 TTL/时间窗过滤：daemon 长时间离线恢复后会执行陈旧任务包 | runtime.service.ts:247-288 | 中 |
| B4 | workflow：suspended 跨重启不可恢复（已知降级）、failed 无重试、running 无卡死对账 | workflow.service.ts:297-302 | 中 |
| B5 | 取消语义混乱：cancel → blocked（非终态），且 runtime 路径 cancel 后 daemon 不回 result | execution.service.ts:741-747; runtime.service.ts:753-820 | 中 |
| B6 | 过期 DecisionProposal 永久滞留收件箱（查询不过滤 expiresAt、resolve 不检查过期） | decision.service.ts:132-144 | 中 |
| B7 | `runs/:id/fail|cancel|complete` 端点无归属/权限校验（越权面） | execution.controller.ts:96-144 | 中 |

### 断裂带 C：治理供给侧瘸腿（用户痛点②的根源）

| # | 缺口 | 证据 | 严重度 |
|---|---|---|---|
| C1 | 存量 Issue 无任何 AI 补全验收标准能力（无端点/场景/按钮）；「AI 代写→人确认」主轴只覆盖 CAP-P-01 新建管道 | assistant-silent.service.ts:210-320 | **P0** |
| C2 | 「缺标准/缺契约」不可见：Issue 无标记字段、无筛选/列表/徽标/定向通知；用户直到关单被拦或接收被红牌拦才发现 | issue 模型无完备性字段 | **P0** |
| C3 | 创建对话框新文件 acceptance-criteria-field「假 AI 生成」（setTimeout+硬编码文案），数据存 `todoItems` 与治理模型不打通 | unified-create-dialog.tsx:474-522 | **P0** |
| C4 | audit-gate（执行前审计门禁）端点零消费；审计手动触发且发生在执行后（时机倒挂） | completeness-audit.service.ts:380-417 | P1 |
| C5 | 手动补全不流畅：建契约对话框不能录标准；补标准需跳详情页→选类型→逐条手输（4~5 步/条） | acceptance-form-dialog.tsx:66-81 | P1 |
| C6 | 空契约（0 标准）派发不拦、无契约老任务关单不拦（存量兼容） | execution.service.ts:100-110; issue.service.ts:1483 | P1 |
| C7 | contract 绑定与验收零关联、契约缺失无审计提示（治理叙事两张皮）；审计工程比对是字符串 include、清单不匹配静默跳过 | contract-binding.service.ts; completeness-audit.service.ts:86-95 | P2 |

### 其他清理项

| # | 缺口 | 严重度 |
|---|---|---|
| X1 | 前端老 execution 模块 retry/escalate/batch-resolve API 指向不存在路由（404 死代码），恢复对话框是空壳 | 中 |
| X2 | i18n 死键 `unifiedCreate.quickChips.testcase`（补全验收用例）无消费 | 低 |
| X3 | `execution-items-panel` 引用的 `execution-run-panel` 已无页面引用（死代码） | 低 |
| X4 | 邮件/webhook 通知渠道空壳（只存偏好不投递） | 低 |
| X5 | cli-executor 的 ai.stream 不带 userId 被网关丢弃（进程内执行看不到实时输出） | 低 |

---

## 四、改造方案（四批，P0 先行）

> 排批原则：先让「失败被看见、悬挂有终态」（A/B 是信任底线），再攻「标准供给侧」（C 是产品主轴兑付），最后一致性清理。每批一个分支，走 requirement-intake 对照能力清单登记后开工。

### 批 1｜失败感知与一键重试（P0，对应痛点①）

**目标**：任何执行失败/阻塞/审批挂起，相关人在 30 秒内知道，并且一键可重试。

| 事项 | 改动点 | 验收方式 |
|---|---|---|
| 1.1 执行事件通知接线 | `notification-event-subscriber` 订阅 `execution.run.updated`：newStatus ∈ {failed, blocked} 时定向通知 run.createdBy + issue.assignee（human）；`approval.request.created` 通知审批目标人。与 subscription 模块的 `execution.terminal` 去重（同一事件同人只发一条，通知 service 内做幂等键） | e2e：失败执行 → 断言通知落库+socket 推送 |
| 1.2 网关转发补齐 | `events.gateway` 转发 `execution.run.updated`（含 previousStatus/newStatus）、`approval.request.created/resolved`；前端 `event-client` 注册同名事件 | e2e：WS 客户端收到事件 |
| 1.3 修死订阅+轮询兜底 | `execution-items-panel` 改为订阅 1.2 的真实事件做 invalidate；`useIssueExecutions`/`useExecutionRuns`/run 详情 detail 加 refetchInterval（非终态 5s，终态停） | 手动：失败后任务详情 5s 内变红 |
| 1.4 一键重新执行 | 执行中心 failed/blocked 行加「重新派发」按钮（复用 `DISPATCHABLE_STATUSES` + `dispatchTaskToCli({executionId})` 既有通路，重建载荷）；助手 run-line 失败卡加「重试」 | e2e：failed → 点重试 → 新 run in_progress |
| 1.5 socket 断线横幅 | event-client 暴露连接态；shell 顶部渲染断线横幅（重连成功自动消失）；未读数加 60s 轮询兜底 | 手动：杀 server 后横幅出现 |
| 1.6 通知点击跳转 | notification-center 点击按 issueId/projectId navigate，已读保留 | 手动 |

**工作量**：后端 2 项各 ~0.5 天，前端 4 项各 ~0.5-1 天。
**登记**：能力清单 CAP-B-08/通知卡扩展「执行终态定向通知」条目。

### 批 2｜悬挂对账 watchdog（P0，失败感知的前提）

**目标**：任何链路中断（daemon 崩溃、server 重启、进程悬挂）最终都会收敛到明确终态。

| 事项 | 改动点 | 验收方式 |
|---|---|---|
| 2.1 引入调度基座 | server 引入 `@nestjs/schedule`（仅一个对账 module，控制依赖面） | 模块测试 |
| 2.2 执行对账 job | 每 2 分钟扫 in_progress：`startedAt/updatedAt` 超过派发 timeout×2 且对应 runtime 心跳离线（复用 computeLiveness）→ `failExecution(errorDetail.reason='EXECUTION_STALLED')`；无 runtime 归属的 in_progress 按统一上限（如 24h）兜底 | 单测+e2e：伪造离线注册 → 断言置 failed |
| 2.3 pending 派发 TTL | 对账 job 同场处理：pending 超 24h 置 `expired`（dispatch 记录+若有关联 run 则同步 failed），daemon 轮询接口过滤 expired | 单测 |
| 2.4 助手占位对账 | bridge 暴露按超时收口方法，对账 job 调用：running 占位超 timeout×2 → 复用既有失败原位替换逻辑（文案「执行通道失联」） | e2e |
| 2.5 workflow 对账 | running 的 AIWorkflowRun 超 24h → failRun('WORKFLOW_STALLED')；suspended 跨重启维持现有「请重新触发」提示（跨重启恢复列入远期） | 单测 |
| 2.6 取消语义修正 | runtime cancel 后 server 直接置 `superseded`（终态）并同步 dispatch 状态；前端区分展示 failed/cancelled/blocked 三态 | e2e |
| 2.7 越权修复 | `runs/:id/fail|cancel|complete` 补归属校验（createdBy/项目管理员） | e2e：他人 token 403 |

**工作量**：~3-4 天。**登记**：能力清单执行域新条目「执行悬挂对账与终态收敛」。

### 批 3｜验收标准供给侧（P0/P1，对应痛点②）

**目标**：缺标准看得见、AI 能代写、人只确认、补全三步内完成。

| 事项 | 改动点 | 验收方式 |
|---|---|---|
| 3.1 AI 代写服务 | `assistant-silent.service` 新增 `acceptance-draft` 静默场景：输入 issue（标题/描述/todoItems）+ 项目上下文 → 产 3~6 条 criteria 草案（functional/technical 分型、severity、绝不编造超纲项）；暴露 `POST /acceptance/issue/:issueId/draft-criteria` | 单测：prompt 组装+防御性解析 |
| 3.2 草案确认落库 | 新端点 `POST /acceptance/issue/:issueId/apply-criteria`（payload=人确认后的草案，source='ai-generated'）：无契约先建契约再落标准；契约已有标准时走增量+冲突提示 | e2e：空契约 → 一次调用 → 标准落库可审计 |
| 3.3 缺标准可观测 | server：issue 列表查询支持 `hasActiveAcceptance=false` 过滤 + 计数；前端：任务列表「缺验收」徽标/筛选、任务详情验收卡黄条提示（复用 auditWarning 视觉语言）；auditWarning 响应附 draft-criteria 直达按钮 | e2e：建无标准任务 → 列表可见徽标 |
| 3.4 创建对话框接真线 | `acceptance-criteria-field` 的假 AI 换成 3.1 端点（对话面板内已能拿到项目上下文）；`createIssue` server 支持 `acceptanceCriteria` 直建契约+标准（替代 todoItems 旁路，todoItems 保留为待办语义）；批 3 完成后删除假生成代码 | e2e：创建面板 AI 生成→确认→建任务→契约带标准 |
| 3.5 手动补全顺滑化 | `AcceptanceFormDialog` 建契约即可直接录标准（并预填 AI 草案，确认即落）；验收详情页加「AI 预填」按钮（调 3.1 后进同确认流）；保留逐条手输 | 手动+组件测试 |
| 3.6 audit-gate 接线 | 派发链路（`dispatchTaskToCli` + runtime 派发路径）前置调 `enforceAuditBeforeExecution`：红牌阻断并附补全入口、无契约/空契约黄牌提示（可配置仅提示）；审计报告自动生成（派发前无报告则现场跑一次，缓存复用） | e2e：空契约派发 → 黄牌+按钮；红牌 → 阻断 |
| 3.7 空契约关单收紧（可延后） | 关单门禁对「空契约」同样拦（与无契约分开文案），给存量任务一个版本的过渡期开关 | e2e |

**工作量**：~5-7 天（3.1/3.2 是核心，3.4/3.5 强依赖二者）。
**登记**：能力清单 CAP-B-01/CAP-B-02 扩展「存量工单 AI 代写验收标准 + 执行前门禁接线」，此项是产品主轴的直接兑付，建议单独立卡。

### 批 4｜一致性与清理（P1/P2，穿插做）

- X1 死 API 处置：删除老 execution 模块 retry/escalate/恢复对话框（或按批 1 的真实通路重实现）；
- B6 提案过期：收件箱查询过滤 expiresAt + resolve 检查过期 + 对账 job 清理；
- A7 提案创建广播：publish + 网关转发 + 徽标 invalidate；
- X2/X3 死键死组件清理；X5 ai.stream 补 userId 定向；
- C7（远期）：审计纳入契约绑定检查、验收标准引用契约条款；X4 邮件渠道桥接；workflow 步骤级重试与跨重启恢复（需 Mastra 句柄持久化调研，与 workflow 基线分支余留合并考虑）。

### 批 5｜失败执行重新执行：克隆新建+血缘关联（2026-09-17 增批，P0）

> 批 1.4 落地后用户复核裁决：原地重派（`dispatchTaskToCli({executionId})` 复用失败记录、状态重置+input 覆盖）会抹掉失败现场。本批把「重新执行」语义升级为**克隆新建**。

| 事项 | 改动点 | 验收方式 |
|---|---|---|
| 5.1 血缘字段 | `Execution.retryOfId` 自关联（迁移 20260917100000，SQLite 不做 DB 级外键，完整性由 schema 声明+应用层校验维护） | 迁移应用 dev.db+template.db 并登记 |
| 5.2 retry 端点 | `POST /ai/execution-runs/:id/retry`（cli-dispatch）：failed/blocked 可重试（superseded 人工取消不放开）→ 克隆新建执行（沿用 goal/标题/角色/主体/工时/验收契约关联；原 input 保留并附 retryContext=原状态/errorDetail/派发错误，dispatchError 留痕归档不进新载荷）→ 走既有派发链 → 门禁阻断时新执行落 blocked（RETRY_DISPATCH_FAILED）留痕、原执行不动 | e2e 三态（正常流/非法状态/门禁阻断） |
| 5.3 前端改调 | 执行中心 failed/blocked 行菜单 + 任务详情执行项面板改调 retry（draft/planned 仍为首次派发原地语义）；两处新增「重试自」血缘徽标（点击直达原执行详情）；i18n 双语，移除 redispatch 旧键 | 手动+组件回归 |

**登记**：能力清单 CAP-A-19 卡批 5 增量 + §七变更记录（2026-09-17）。

---

## 五、证据索引（关键文件）

- 执行状态机：`apps/server/src/modules/execution/execution.service.ts`（:60-81 状态机、:100-110 空契约自动创建、:444-462 跳步校验、:642-648 failExecution、:741-747 cancel）
- 派发链路：`apps/server/src/modules/cli-dispatch/dispatch.service.ts`（:102-155 失败留痕、:269-274 可重派状态集、:498-508 auditWarning、:837+ 证据回流）
- runtime 生命周期：`apps/server/src/modules/runtime/runtime.service.ts`（:247-288 派发查询、:551-570 createDispatch、:629-651 判活）；`apps/cli/src/runtime/worker.ts`（:156-176 载荷校验、:296-368 超时/驳回）
- 助手桥：`apps/server/src/modules/ai-hub/assistant-runtime-bridge.service.ts:78-147`
- 通知/订阅：`apps/server/src/modules/notification/notification-event-subscriber.ts:24-124`；`apps/server/src/modules/subscription/subscription-event.subscriber.ts:188-217`
- 前端：`apps/frontend/src/infrastructure/event-client/index.ts:43-90`；`modules/executions/`（列表/详情/轮询）；`modules/issue/components/execution-items-panel.tsx:218-229`（死订阅）；`modules/notification/components/notification-center.tsx:130-133`
- 验收：`apps/server/src/modules/acceptance/acceptance.service.ts:439-537`（接收五重校验）、`completeness-audit.service.ts:380-417`（零消费的 audit-gate）、`apps/server/src/modules/decision/proposal.service.ts:455-502`（唯一带标准建契约路径）
- 创建对话框（未提交改动）：`apps/frontend/src/shared/components/create-dialog/acceptance-criteria-field.tsx`（假 AI）、`unified-create-dialog.tsx:474-522`（todoItems 旁路）

---

## 六、裁决点（需人工拍板）

1. 批 1 执行失败通知的**默认受众**：仅 createdBy/assignee，还是项目全体成员？（建议前者+可配置）
2. 批 2 悬挂判定的**超时倍率**与 pending TTL 数值（建议 timeout×2 / 24h，入 config 模块可配）。
3. 批 3.6 执行前门禁的**强度**：红牌阻断即可，还是空契约也阻断（建议空契约黄牌+引导，观察一段时间再收紧为 3.7）。
4. 批 3.4 创建面板验收标准与 `todoItems` 的**语义分工**（建议：验收标准进契约体系，todoItems 保持待办语义，创建面板只暴露验收标准）。
5. workflow 跨重启恢复（批 4 远期）是否投入：涉及 Mastra 句柄持久化，成本高收益依赖审批型工作流的真实使用率。
