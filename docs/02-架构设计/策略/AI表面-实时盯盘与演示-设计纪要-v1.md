---
title: AI 表面 —— 实时盯盘·代理·叙述·演示 设计纪要 v1
description: 把 ai-surface 从 mock 形态实验改造为真实驾驶舱——同源双密度定位、实时投影层、AI 状态叙述（静默场景）、新手首次上手的演示模式、设计契约换血与门禁收口
category: architecture
status:
  - doing
version: 1.1.0
created: 2026-09-13
modified: 2026-09-14
id: ARCH-AISURFACE-001
tags: "ai-surface, realtime, observability, narration, showcase, design-system"
ai-session-types: all
ai-priority: high
ai-freshness: realtime
ai-audiences: "session:all"
---

# AI 表面 —— 实时盯盘·代理·叙述·演示 设计纪要 v1

> 日期：2026-09-13
> 性质：需求入库前的设计底稿（**代码零改动**），承接 [[能力清单-v1]] CAP-C-08 登记
> 前篇：[[AI同事化助手-界面分工记忆交接-设计纪要-v1]]（界面谱系/角色分工/记忆交接）、[[AI同事化助手-项目档案与双用户适配-设计纪要-v2]]（双用户适配/档案底座）
> 触发：2026-09-13 用户提案——「希望升级为新手小白可以实时盯盘和让 AI 代理的页面，不仅能看到实时进度，也能让 AI 告诉你实际状态；同时产品效果也能快速展示，让用户很直观容易地体验到产品」
> 关联：[[DESIGN.md]]（设计契约，本纪要 §五为契约换血依据）、`产品需求文档-v3` §8、[[渐进式信任模型]]、[[能力清单-v1]] §2.2 理想管道

## 0. 一句话共识

> **ai-surface 不缺样子，缺数据与诚实。** 它现在的仪表是贴纸（mock），实时管道只通了一半（前端没订执行事件），而它的霓虹配色还违反设计契约。改造不是重画，是**接真 + 换血 + 加一层叙述**。

---

## 一、现状诊断（2026-09-13 代码级核验）

### 1.1 三重错位

**错位一 · 形态有、数据无**

`apps/frontend/src/modules/ai-surface/` 是纯 mock：

| 位置 | 现状 |
|------|------|
| `pages/ai-surface-page.tsx:64-88` | `setTimeout` 900ms 后伪造 AI 回复（"已收到您的指令…已调用模型进行全局依赖图遍历，所有治理指标正常"），并顺手把 `overallScore` +0.3 |
| `pages/ai-surface-page.tsx:27` | `trustScore` 初值写死 `95.4` |
| `mock-data.ts` | `INITIAL_AGENTS` / `INITIAL_ARTIFACTS` / `TRUST_DIMENSIONS` / `MEMORY_ATOMS` 全为假数据 |

它有驾驶舱的外观，没有驾驶舱的数据。**注意：伪造的回复与自动上涨的信任分，正是本项目治理主轴（可验证、不静默）最不能容忍的形态，必须在改造中清零。**

**错位二 · 实时管道通到一半（关键发现）**

后端**领域事件**很富。对 `apps/server/src` 全量扫描 published 事件，与盯盘强相关的至少有：

```
执行过程  execution.run.created / execution.run.updated / execution.completed
         execution.step.created / execution.step.updated          ← 步骤级
         runtime.execution.event  { eventType, stepId, status,
                                    summary, detail, … }          ← 事件级（最细）
         runtime.dispatch.created / runtime.dispatch.changed
运行时态  runtime.heartbeat / runtime.connected / runtime.execution.cancelled
门禁治理  approval.request.created / approval.resolved / execution.approval_needed
         acceptance.created / acceptance.resolved
         release.approved / release.created
证据回流  github.pull_request.updated / github.check_run.completed / github.pr_review.submitted
```

**但「后端有事件」≠「前端能收到」——中间隔着一道网关。** 逐层核验（2026-09-14 复验）：

| 层 | 事实 |
|----|------|
| 领域服务发布 | 上述事件**确实在发**（`messageBus.publish`，各服务内） |
| **WS 网关转发** | ⚠️ `gateways/events.gateway.ts` 只转发 **8 族**：`ai.stream` / `ai.workflow.update` / `task.*` / `project.*` / `notification.*` / `runtime.dispatch.changed`（聚合裹 6 个 runtime 事件）/ `linear.*`。**`execution.*` / `approval.*` / `acceptance.*` / `release.*` / `github.*` 一条都没出网关** |
| 前端白名单 | `event-client/index.ts` 硬编码 12 条；全仓 `useEventSubscription` 仅 **4 处**使用（`notification.created` ×1、`notification.read` ×1、`runtime.dispatch.changed` ×2） |

**结论（修正 v1.0 初稿的判断）：瓶颈在网关，不在前端白名单。** 初稿称「不是造新管道，是扩订白名单」——不成立：即使前端订了 `execution.step.created`，网关从未 `emit` 它，订阅会**静默失效**。正确结论是：

> **「实时盯盘」的前置改造 = 网关补治理族转发 + 前端白名单扩订并收口单源 + 建面级投影。三者缺一不可。**

唯一已通的富通道是 `runtime.dispatch.changed`——它裹着 `runtime.execution.event`（含 `summary` / `detail`），是**当前唯一的事件级细节流**。这也定下了诚实粒度的天花板（见 §3.1「诚实粒度」与 §4.6）。

伴随三个既有缺陷，本卡一并收口：

1. **事件名单源已漂移**：`event-client/index.ts` 直接硬编码 `'ai.workflow.update'`、`'linear.sync.completed'`、`'runtime.dispatch.changed'` 等字面量，**它们不在 `packages/apm-shared/src/events/domain-events.ts` 的 `DomainEventTypes` 单源里**——而该文件开头的注释正写着"杜绝三处硬编码各自漂移"。契约已经漂了，本卡顺手补齐单源（shared 真相源 + server 镜像双份，受 `check:cli-contract` 门禁）。
2. **`terminal.output` 是幽灵通道**（⚠️ 事实纠正）：`event-client` 内注释称"terminal.* 服务端仍在发，前端已无消费者，待 Terminal 模块退役战役一并摘除服务端链路"。**经 2026-09-14 全仓核验，该注释不成立**——`terminal.output` 在全仓**没有任何发布方**（`message-bus.service.ts` 里仅存于日志降噪名单），网关转发亦位于注释块内（`events.gateway.ts:179-195`）。即「chunk 级流式」这条通道**从未在线**，不是"面临误删"，而是"从未接通"。详见 §4.6。
3. **重连丢订阅**：`event-client` 的 `subscribe` 白名单只在 `connect()` 首次调用时 emit 一次，socket.io 自动重连后服务端房间丢失 → 重连即静默失聪。本卡一并修（`subscribe` 移入 `connect` 回调 + 项目房间重放）。

**错位三 · 违反设计契约，且是从门禁缺口漏进来的**

ai-surface 10 个文件共 **215 处硬编码裸色**，外加霓虹发光投影（`boxShadow: '0 0 14px rgba(139, 92, 246, 0.5)'`）与纯装饰动效（`LivingNebulaBackground` 有机极光呼吸、`LuminousSynapseOverlay` 突触光纤）。

对照 [[DESIGN.md]]：

| 契约铁律 | 原型现状 | 条款 |
|---------|---------|------|
| 彩色面积 ≤ 10%、低饱和；烟熏紫 `H265 S32% L60%` 为 **AI 专属色** | 大面积霓虹紫渐变，主色 `#8B5CF6`（S≈89%） | §2.1 / §2.3 |
| 取消厚重投影，仅 Hover/浮层允许 `shadow-xs` | 到处发光投影 | §3.2 |
| 动效白名单 100/160/220ms + AI 1.2s 呼吸；**纯装饰性炫技动效属视觉负债** | 极光 + 突触（零信息量） | §5.1 / §5.2 |
| 严禁硬编码裸色，`lint:palette` 拦截 | 215 处裸色 | §8.1-3 |

**实测门禁结果**（2026-09-13 运行）：

```
node ./scripts/check-palette.mjs          → ✓ 通过 (EXIT=0)
node ./scripts/check-semantic-classes.mjs → ✓ 通过 (EXIT=0)
```

**门禁没拦住它**——这两个脚本只扫 className，不扫 `style={{}}` 内联色。原型是从门禁缺口漏进来的。

另注：`DESIGN.md` §七「风格不统一组件整改」七名单中**没有 ai-surface**，但其性质与名单里的 `FloatingDock`（"浓厚 macOS 磁性放大动效与拟物阴影"）同类，应补入整改路线。

### 1.2 家底清点：不用重造的部分

| 已有资产 | 位置 | 对方案的意义 |
|---------|------|------------|
| **真实员工卡 + 忙闲四态** | `modules/office/components/colleague-card.tsx`；后端 `server/modules/office/office.service.ts` 派生 `status: needYou｜working｜suggestions｜idle`（优先级 `needYou > working > suggestions > idle`）、`blocking` 计数、`capacity`（含 `budgetUsagePct` / `acceptability`）、`currentProvider` | **盯盘的数据原型已存在**，只差空间化呈现 |
| **静默场景注册表** | `server/modules/ai-hub/services/assistant-silent.service.ts` 的 `SILENT_SCENARIOS`（已 12 场景：quick-prompts / create-suggestions / project-score / anchor-qa / card-explain / memory-digest / grill-next / interview-prefill / intake-composite / interview-dynamic / workflow-draft / release-notes）+ `POST /ai/assistant/silent { scenario, projectId?, context? } → { scenario, data }` | **"AI 告诉你状态"零新增编排的落点**：加注册表一项即可 |
| **AI 卡片矩阵 [AI]** | `ThinkingStream`、`AssistantToolCard`、`AssistantRunLine`、`DualTrackMetricPill`、`AnchorQaThread`、`AISlotLayer` | DESIGN.md §6.1 已认证的标准件，直接复用 |
| **决策卡五段式 [HYBRID]** | `shared/decision-card/`（提案 ➔ 紧迫度 ➔ 变更主体 ➔ 影响 ➔ 证据抽屉 ➔ 动作栏） | 待办就地拍板直接复用，**不开第二个拍板入口**（v2 纪要 §4.2 纪律） |
| **状态映射单源** | `shared/status/`（`StatusPill` / `StatusIconFrame`） | 信号灯不许自造色 |
| **叙事底座** | `assistant.service formatBriefingInstruction`（完备度 + 生效槽位原子 + 派生活动热点注入，旁路失败不阻断）+ `MemoryAtom` 档案 | 叙述层的上下文供给已通 |
| **示例项目 seed** | `server/prisma/seed.ts:166`「示例项目：Agent Project Manager」+ 4 条示例工单 | 演示模式地基 |
| **桌面守护进程托管** | CAP-A-14 体验切片④（壳 utilityProcess 托管 + 自动拉起 + 设置页启停） | 实况演示（§3.4 路径 B）的可行性前提 |

---

## 二、定位裁决：同源双密度（2026-09-13 用户拍板）

**AI 表面不是第三个表面。** 双表面架构（人类控制面 / AI 执行面）是架构原则（[[architecture.md]] §3），不得新增。

正确定位：**AI 表面 = 人类控制面的「实时态」——办公室的沉浸全景版。**

```
office        = 走进办公室看人      网格 · 轻量 · 日常 · 非沉浸
ai-surface    = 坐在驾驶舱看盘      空间化 · 全屏 · 实时 · AI 叙述
                         ↑
            共享同一数据源：office summary + executions + decisions + acceptance
                         ↑
              「同源不同密度」——绝不新建第二套口径
```

**为什么不取代 office**：CAP-C-06（简报与健康分析，`dashboard`+`office`）已有归属，取代会触发卡归属重划；且办公室的网格态是日常高频入口，沉浸全屏不适合天天用。

**架构含义**：

1. 盯盘面的数据一律经既有服务/端点取（`officeApi.getSummary`、`useExecutionRuns`、decision summary），**不许新写一套聚合 SQL 副本**。若确需面级聚合，下沉为 `office` 模块的新端点而非在 `ai-surface` 自造。
2. 两页对同一实体的状态判定必须同源（都读 `shared/status` 映射 + `office.service` 派生口径），防止"办公室说忙着、盯盘说卡了"。

---

## 三、四态设计

### 3.1 态一 · 盯盘（Watch）—— 小白睁眼就知道"现在发生了什么"

信息架构（**保留原型的空间叙事，换掉数据与配色**）：

```
┌─ 顶栏：AI 一句话总述（§3.3 叙述层）+ 全局信号灯 ──────────────────┐
├─ 左：同事工位列        │ 中：六站管道泳道      │ 右：该你了 ──────┤
│  每个 AI 一张工位卡：    │  每张单在管道上的位置  │  待你拍板的：     │
│   · 在做哪张单（可点开） │  卡住的高亮 + 原因     │   · 决策卡        │
│   · 跑到第几步 / 共几步  │  阻塞溯源             │   · 待验收        │
│   · 已耗时 · token · 成本│                      │   · 待发布门禁     │
│   · 信号灯：跑着/卡了/等你│                      │  按紧迫度排序      │
└─ 底：Omni-Dock（保留原型形态，换语义 token + 接真输入）──────────┘
```

工位卡直接对齐 `ColleagueCard` + `office.service` 已有字段（status / blocking / capacity / currentProvider），**不发明新口径**。

#### ★ 核心原则：诚实粒度

这一条决定小白信不信这个面板。严格按下表降级，**严禁伪造**：

| 数据可用度 | 允许展示 | 严禁 |
|-----------|---------|------|
| 有事件级细节（`runtime.execution.event` 的 `summary` / `detail`） | 实时进展行（取 `summary` 原文，如"正在跑 npm test…"），限行数、可折叠 | 把 `detail` 里任意字段渲染成百分比 |
| 只有步骤级（`execution.step.*`） | 步骤条 + 当前步名 + 步骤耗时 | 反推百分比 |
| 只有状态级（`execution.run.*`） | 只显示状态与耗时 | **伪造进度条百分比** |
| chunk 级（`terminal.output`） | ❌ **当前不可用**（全仓无发布方、网关转发在注释块内）——须先补发布方 + 恢复转发 | 假装有 chunk 流 |

> 粒度天花板说明：当前线上可达的最细粒度是**事件级**（`runtime.execution.event`，且仅覆盖经 runtime 派发的执行）。「实时日志尾巴」在 S2 落地的形态是**逐事件 `summary` 行**，不是终端原始 chunk 流——这一点必须在 UI 文案上诚实（用"进展"而非"日志流"）。

配套要求：**每个工位卡必须能回答"你这数字哪来的"**——hover 显示数据来源事件名与最后更新时间戳。数据陈旧（如心跳超时）时显式标注"数据滞后 Ns"，不假装新鲜。

### 3.2 态二 · 代理（Delegate）—— "我一句话，AI 去干"

不是新聊天窗口，而是**把既有代理入口收进一个面、不切上下文**：

| 入口 | 复用 |
|------|------|
| 输入框 | 既有 assistant 会话（Omni-Dock 形态保留） |
| 待拍板决策卡就地展开 | `DecisionCardShell` 五段式 |
| 新建需求 | 统一创建面板 / intake 剧本（CAP-P-01） |
| 就地问"这是什么" | AISlot（Ctrl+左键 / 长按 Ctrl 500ms 发现态，CAP-C-07） |

纪律沿用候补区原话：**对话是入口，不是容器**。代理态的增量价值只有一个——**盯盘看到卡住 → 就地查 → 就地拍板，全程不跳页**。

### 3.3 态三 · 叙述（Narrate）—— "AI 说人话告诉我实际状态"

落点：**新增静默场景 `surface-narration`**，加进 `SILENT_SCENARIOS` 注册表。零新端点、零新编排层。

- 输入：盯盘快照（同事态 + 活跃执行 + 阻塞项 + 待决数 + 门禁状态）
- 输出（结构化 JSON，前端按 schema 渲染，不做自由文本）：

```jsonc
{
  "headline":   "一切正常，小周在写登录页，还需要你拍板 2 件事",
  "highlights": ["登录页卡在测试没过，AI 已自己重试 2 次"],
  "blockers":   [{ "what", "who", "since", "why", "whatYouCanDo" }],
  "needsYou":   [{ "decisionId", "oneLineWhy", "urgency" }],
  "honestGaps": ["这条流水线只有步骤级进度，没有实时日志"]
}
```

**四条硬约束**：

1. **事实与叙事分离**（沿用 v2 纪要 §3.3 铁律）：**数字一律由事实层查询算好后注入 prompt，不允许模型自己算/自己编**。模型只做翻译与归因。
2. **成本纪律**：TTL 缓存（≈30s）+ 页面可见性 API 触发，**绝不逐事件调模型**；沿用 `AIUsageLog` 记账（`responseMetadata.kind='silent'`），并让叙述自身的开销显示在 `DualTrackMetricPill` 上——**叙述自己花多少 token 也必须可见**（双轨成本纪律）。
3. **确定性降级**：模型不可用 / 超预算 / 超时 → 回落**确定性模板叙述**（v2 纪要已有先例：对照翻译用确定性模板转写器）。**盯盘绝不因 AI 挂了而白屏**，且降级态显式标注"以下为规则生成的摘要"。
4. **不主动弹窗**（v1 §7 铁律）：叙述浮在面内，是结构化卡片，不是弹窗。

### 3.4 态四 · 演示（Showcase）—— 让新手第一次就体验到完整效果

**2026-09-13 用户拍板：定位为「新手首次上手」**（非售前获客素材导向）。因此本态与 CAP-A-14 桌面版体验切片、`onboarding` 模块合流。

**路径 A · 回放模式（必做，S5）**

预置一条"从一句需求到交付"的六站剧本快照（每站若干关键帧），前端按时间轴回放，支持暂停 / 步进 / 跳站。

之所以**必须**先做：演示最怕三件事——**依赖用户本机 runtime、烧 token、等 5 分钟**。回放模式三样全免，全新环境（无 runtime、无 API key）也能 90 秒放完。

数据来源：`seed.ts` 既有示例项目 + 一份快照 JSON（**快照格式即契约，需登记**）。

**路径 B · 实况演示（S6，加分项）**

沙箱工作区真跑一条 mini 需求（intake → 拆解 → 派发 → 执行 → 验收）。前提是 CAP-A-14 的守护进程托管（已落）。附加价值：**它就是 GAP-T-19 缺的"端到端主流程安装冒烟"证据**——一次投入两处收口。

**与 onboarding 的接法**：初始化向导（`modules/onboarding`）完成后，引导至 ai-surface 播放回放 → 用户获得"这东西能干什么"的第一印象 → 再落回真实项目。**先回放、后实况**的次序不可颠倒（实况失败会摧毁第一印象）。

---

## 四、技术架构

### 4.1 面级投影层 `use-surface-feed`（S1 核心）

```
领域事件（step/run/heartbeat/approval/acceptance/release）
   │  EventClient 订阅（§4.2 扩订）
   ▼
归一化 SurfaceFeedItem { id, kind, at, projectId, subjectId, summary, raw }
   │
   ▼
Zustand store（环形缓冲：容量上限 + 按项目过滤 + 去重）
   │
   ▼
盯盘组件消费
```

**快照 + 增量双轨**（关键设计，防纯 WS 缺陷）：

- **冷启动**：进面先 React Query 拉全量快照（office summary + active executions + decisions）
- **增量**：WS 事件只做修正，且**带时间戳防乱序**（迟到的旧事件不覆盖新状态——B-08 二期已有同类防御先例）
- **断连**：WS 断开 → 显式展示"实时已断开，数据可能滞后"+ 自动重连后**重新拉快照对齐**（不靠补发事件）

### 4.2 事件链三层收口（S1）

⚠️ 初稿此处只写了「前端扩订」，经 §1.1 错位二复验后修正为**三层**——缺任何一层订阅都会静默失效：

1. **网关补转发（`gateways/events.gateway.ts`）** ← 真正的瓶颈层
   新增治理族逐事件显式转发（不做聚合，线上名 = 领域名）：`execution.run.created/updated`、`execution.completed`、`execution.step.created/updated`、`execution.approval_needed`、`approval.request.created/resolved/cancelled`、`acceptance.created/resolved/deleted`、`release.created/approved`。
   *分工注记*：`runtime.execution.event` 等仍**同时**走既有的 `runtime.dispatch.changed` 聚合通道（服务 `use-assistant-status`），两通道并行不冲突。
2. **前端白名单扩订（`event-client/index.ts`）**：覆盖上述治理族 + 运行时族 + 已通的 `runtime.dispatch.changed`。
3. **事件名单源收口**：把 `event-client` 内硬编码的事件名字面量改为从 `DomainEventTypes` 取；缺失的（`ai.workflow.update` / `linear.*` / `runtime.dispatch.changed` / 新治理族）**补进 `packages/apm-shared/src/events/domain-events.ts` 单源**（真相源）+ **server 镜像同名文件**（`check:cli-contract` 门禁比对二者），消除漂移。并为盯盘直接消费的事件补 zod payload 契约。
4. **重连路径修复**：`subscribe` 白名单改为在 socket `'connect'` 回调内 emit（原实现只在 `connect()` 调用时 emit 一次，自动重连后服务端房间丢失即静默失聪）；`joinProject` 的项目房间同样重放。

### 4.3 叙述层（S3）

- 后端：`SILENT_SCENARIOS` 加 `surface-narration`（instructions 构建器 + 响应 schema + 结构化解析）
- 前端：`use-surface-narration`（TTL 缓存 + 可见性触发 + 降级分支）
- 契约：响应 schema 入 `openapi.json`（`contract:export` → 双端类型，禁手工改 `api-types.gen.ts`）

### 4.4 设计契约换血（S1）

1. 10 个组件：215 处硬编码裸色 → 语义 token；AI 专属色统一为烟熏紫（`H265 S32% L60%`）
2. 删除纯装饰动效：`LivingNebulaBackground`、`LuminousSynapseOverlay` 退场；保留的动效收敛进白名单（100/160/220ms + 1.2s AI 呼吸），并支持 `prefers-reduced-motion`
3. 发光投影 → `shadow-xs`；卡片内边距按外舒内紧（标准卡 `p-3.5~p-4`、子卡 `p-2.5~p-3`）
4. **落地顺序**：按 DESIGN.md §8.1 第二原则，**先在 `/app/design-system` 完成新样式渲染验证**，再改业务页

### 4.5 门禁收口（S1，需裁决范围）

补 `style={{}}` 内联裸色扫描（`check-palette.mjs` 扩展）。**范围二选一**：

- **窄**：只对 `modules/ai-surface/**` 强制（新改文件不欠新债）
- **宽**：全仓扫描，存量 47 个文件 37 处（除 ai-surface）滚动清偿

注意存量里 `shared/layout/page-registry.ts`（41 处，导航色字段）与 `design-system-page.tsx`（22 处）属**设计上可解释**的用例，宽扫需先设计白名单机制，否则一开就红。**建议窄起步**。

### 4.6 `terminal.output` 事实核验（⚠️ 推翻初稿判断）

初稿依据 `event-client` 注释推断「chunk 级管道仍在发、面临误删、需先接后删」。**2026-09-14 全仓核验推翻了该推断**：

| 核查项 | 结果 |
|--------|------|
| `terminal.output` 发布方 | **0 处**（`grep -rn "publish('terminal.output'"` 全仓无命中） |
| 网关转发 | 位于注释块内（`events.gateway.ts:179-195`，块首"Terminal事件订阅已废弃"） |
| 其余出现位置 | 仅 `message-bus.service.ts` 的日志降噪名单（与收发无关） |

**结论**：`terminal.output` 是**幽灵通道**——不存在的管道，谈不上"误删"，而是"从未接通"。修正后的裁决：

1. **当下不删**：留作未来 chunk 级流式的命名占位（已就近写入网关注释澄清事实，避免后人再据旧注释误判）。
2. **盯盘的天花板据此重定**：当前可达最细粒度为**事件级**（`runtime.execution.event` 的 `summary`/`detail`，经 `runtime.dispatch.changed`）。**S2 不承诺"实时日志尾巴"，只承诺"逐事件进展行"**，UI 文案须相应诚实（§3.1 粒度表）。
3. **若要恢复 chunk 级**（独立战役，非本卡范围）：须**先补发布方**（runtime terminal capability 内）+ **恢复本例转发**，两件事都做完才算接通；缺一即为死订阅。

### 4.7 诚实边界（改造中不得越界）

| 边界 | 内容 |
|------|------|
| 不改双表面架构 | ai-surface 属人类控制面，不新增架构层 |
| 不造第二套数据口径 | 数据一律经 office / executions / decision 既有服务 |
| 不开第二个拍板入口 | 决策动作仍回决策收件箱/就地决策卡，不新造审批流 |
| 不直写档案 | 叙述产物只进展示层，不写 `MemoryAtom`（写回纪律见 v2 纪要 §3.5） |
| 不伪造 | 无数据就显示无数据；降级就标注降级 |

---

## 五、切片与验收

| 切片 | 内容 | 工期 | 验收标准（三段式） |
|------|------|------|------------------|
| **S1 门禁与骨架** | **网关补治理族转发** + EventClient 扩订 + 事件名单源收口（双镜像）+ 重连补订；`use-surface-feed` 投影层；十组件裸色→语义 token、删装饰动效；补内联裸色扫描（窄范围） | 0.5→**1d**（网关层为 v1.1 新增） | ①正常流：lint 全绿 + `check-palette` 含内联扫描 + `check:cli-contract` 双镜像一致 ②异常流：内联裸色被测出并阻断 ③联动：治理族事件经 WS 真实到达前端（非轮询）；`/app/design-system` 渲染验证通过 |
| **S2 盯盘接真** | 工位卡/泳道/待办区接真实数据；诚实粒度降级 | 1.5d | ①注入真实执行，盯盘秒级反映 ②WS 断开有明确离线态、重连后快照对齐 ③乱序旧事件不覆盖新状态 |
| **S3 叙述层** | `surface-narration` 场景 + 确定性降级 + TTL/记账 | 1d | ①叙述与事实层数字一致 ②模型挂掉回落模板且标注 ③开销现于 `DualTrackMetricPill` |
| **S4 代理态收敛** | 待办就地拍板 + 输入框接 assistant + AISlot 保留 | 1d | ①不跳页完成"看到卡住→问 AI→拍板" ②决策动作仍落既有决策记录 |
| **S5 回放演示** | 快照格式 + 回放器 + seed 剧本 | 1–1.5d | ①无 runtime、无 API key 环境完整放完 ②暂停/步进/跳站可用 |
| **S6 实况演示** | 接 onboarding 向导 + 兼安装冒烟 | 1d | ①向导后引导至回放 ②实况路径兼出 GAP-T-19 主流程证据 |

合计约 **6–6.5 天**，每片独立可验收、可回退。

---

## 六、风险与对冲

| 风险 | 对冲 |
|------|------|
| **两个盯盘面口径打架**（office vs surface） | 同源双密度铁律（§二）；数据经同一服务；状态判定同读 `shared/status` |
| **叙述层烧 token**（逐事件调用） | TTL + 可见性触发 + 记账可见 + 确定性降级 |
| **AI 叙述编造数字** | 事实与叙事分离：数字由事实层算好注入，模型只翻译 |
| **实时事件洪水**（chunk 级高频） | 环形缓冲 + 容量上限 + 按项目过滤 + 前端节流渲染 |
| **演示给人假印象**（回放被当成真实能力） | 回放模式**显式标注"回放演示"**，且结尾提供转入真实项目的入口 |
| **换血后形态失去原有吸引力** | 保留原型的空间叙事/径向关系，只换视觉语言与数据；先在 design-system 页对照验证再铺开 |
| **门禁宽扫一次性变红** | 窄范围起步（§4.5），存量滚动清偿 |

---

## 七、待定清单（需定夺）

1. 快照 JSON 格式归属：前端静态资源 vs 后端 seed 化（影响演示模式能否跨版本维护）
2. 盯盘面是否需要"历史回看"（滚回 10 分钟前状态）还是只做实时
3. 叙述触发策略：仅可见性触发 vs 状态显著变化时也自动刷新（成本/新鲜度权衡）
4. `surface-narration` 的输出是否需要做前端交互（如点 blockers 直接跳执行详情）
5. 工位卡与 `office` 的复用方式：抽公共组件 vs 各自实现（倾向抽 `shared/` 但需先确认两页的呈现差异是否真能收敛）
6. 回放快照的六站是否复用 `pipeline-stages.ts` 六站定义（倾向复用，保持导航与演示同源）

---

## 八、决策摘要

| 项 | 结论 |
|----|------|
| AI 表面定位 | ✅ **同源双密度**：office 常态网格 / surface 沉浸驾驶舱，共享数据源，不加第三个表面 |
| 改造本质 | ✅ **接真 + 换血 + 加叙述**，不是重画 |
| 实时前置工作 | ✅ **三层收口**（v1.1 修正）：网关补治理族转发（真瓶颈）+ EventClient 白名单扩订并收口单源 + 建面级投影；另修重连丢订阅 |
| 诚实粒度 | ✅ 有 chunk 显示日志尾、有 step 显示步骤条、只有状态就只显示状态；**严禁伪造百分比** |
| AI 叙述落点 | ✅ 复用 `SILENT_SCENARIOS` 加 `surface-narration`；零新端点零新编排 |
| 叙述四条硬约束 | ✅ 事实与叙事分离 / TTL+记账 / 确定性降级不白屏 / 不主动弹窗 |
| 演示模式定位 | ✅ **新手首次上手**（用户拍板）；先回放后实况，次序不可颠倒 |
| 装饰动效 | ✅ `LivingNebulaBackground` / `LuminousSynapseOverlay` 退场；动效收敛进白名单 |
| 门禁收口 | ✅ 补 `style` 内联裸色扫描；**窄范围起步**（ai-surface 先行），全仓宽扫待白名单机制 |
| `terminal.output` | ⚠️ **v1.1 事实纠正**：非"面临误删"，而是**幽灵通道**（全仓 0 发布方、转发在注释块内）——从未在线。当下不删留作命名占位；盯盘粒度天花板重定为**事件级**，S2 不承诺 chunk 级日志尾 |
| 治理动作 | ✅ requirement-intake 五步 → CAP-C-08（done by 本纪要）、GAP-T-26、CHANGELOG 登记 |
