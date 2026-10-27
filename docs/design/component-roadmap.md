---
title: component-roadmap - Ordo 组件规划账本（待开发与升级分档清单）
description: 与 registry.ts 两账分离的组件规划账本——现状盘点快照、A 档既有组件对标升级、B 档新建语义组件（开发理由/使用场景/数据契约）、C 档候补区、治理设施与销账纪律
status: active
created: '2026-10-27'
modified: '2026-10-27'
scope: apps/frontend
governance: "设计规则本体以 docs/design/PRINCIPLES.md（宪法）为准，本文件只承载规划与登记；registry.ts 仍为现存组件单一真相源"
---

# Ordo 组件规划账本（component-roadmap）

> **定位与两账分离**：`apps/frontend/src/modules/design-system/registry.ts` 是**现存组件**的单一真相源（五态治理、画廊覆盖率门禁、lint:registry 双向对账）；本文件是**待开发 / 待升级组件**的规划账本。两账纪律：**待开发件不进 registry**；组件落地一批，从本账销账、同步 registry 登记 + 画廊 demo + 宪法 §22.7 五段式 + aiNotes。B 档每件开工前走 `requirement-intake`（登记能力卡与测试映射）。
> **依据**：affectUI 调研两报告（`docs/roadmap/affectui-调研报告-2026-10-26.md`、`docs/roadmap/affectui-逆推与组件库缺口审视-2026-10-26.md`）+ 宪法 §22（v2.9，2026-10-27 用户裁决）+ 能力清单批一/批二进度（2026-10 快照）。

---

## 一、现状盘点（2026-10-27 快照）

**registry 登记 345 条**：`ui/` 66 · `semantic/` 48 · `raw/` 2（另 raw 目录 1 件未入册）· `modules/` 200 · `shared/` 29。画廊 11 组分区：Governance / Foundations / Controls / Data Display / Feedback / Navigation / Overlays / Layout & Shells / **AI Execution** / App Patterns / Semantic。治理链：registry →（单向再生）COMPONENTS.md + 画廊对账区 → `lint:registry` 等 10 个设计门禁。数量随批次增长，**本文件不维护精确计数，以 registry.ts 为准**。

**AI 执行面现存组件地图**（缺口审视的基线）：

| 域 | 现有件 | 一句话评估 |
|----|--------|-----------|
| 工具调用 | `assistant/assistant-tool-card` | 有基础卡，缺自动展开/时长格式/JSON 高亮/高度封顶/状态播报 |
| 决策审批 | `shared/decision-card/`（card / deck-stack / review-modal）+ `assistant-decision-tab` + `executions/run-approvals-section` | 载体多而分散；缺统一审批操作件与批阅流水线节奏 |
| 执行记录 | `executions/`：run-timeline / run-event-list / step-detail-panel / run-status / run-overview-card（含 totalCost）/ run-info-panel（costBreakdown.byModel）/ execution-table-view | 列表+详情齐备；缺编排树形态与时间轴瀑布形态 |
| AI 表面 | `ai-surface/` watch-deck 族（dial / station-card / decision-queue-panel / pipeline-lane-strip / screenplay 回放） | 形态完整但仍以剧本回放驱动，未接真实 Execution 流 |
| AI 判定 | `semantic/ai-verdict-pill` + `semantic/confidence-bar`（CAP-A-27 JEV 扩展批） | 已 canonical；置信度接受数值，未档位化 |
| 信任 | `office/trust-tiers-panel` + `adjust-trust-dialog` + `team-member/trust-level-badge` | 等级展示与调整齐备；缺「运行时自治边界」操作语义（B-07 三级授权的可视化表达） |
| 模型/供给 | `settings/ai/`（models-tab / provider-visuals / judgment-tab / mcp-tab / tools-tab / skills-tab）+ `useAiReadiness` + `AiReadinessBanner` | 配置面完整（AI 就绪三件套 2026-10-26/27 落地）；会话内快捷换模型无承载 |
| 成本用量 | `analytics/`（use-ai-usage / acceptance-attribution）+ executions 两处内联成本展示 | 数据面齐；无独立成本语义件，展示口径分散 |

---

## 二、A 档：既有组件对标升级（随批消化，不追溯阻断；对应宪法 §22 存量义务）

| # | 件 | 动作 | 升级内容（宪法锚点） | 使用场景 | 优先级 | 状态 |
|---|-----|------|---------------------|---------|--------|------|
| A1 | `assistant-tool-card` | 升级 | 失败自动展开/重跑自动收起（渲染期状态比对）；`useStopwatch` 统一计时（startedAt 注入+重试累加）；渐进时长格式（ms→0.1s→m/h）；零依赖 JSON 高亮；高度封顶三段式（220px 渐隐/Show all/640px 内滚）；`inert`+`aria-live` 播报（§22.5） | 助理面板每次工具调用 | P1（高频可见） | ✅ 已落地（前批完成，2026-10-27 销账核对） |
| A2 | `shared/decision-card` 族 | 升级 | 审阅收场仪式：确认态→折叠凭证行→Undo→自动升起下一件→All-caught-up 完成态（§22.4）；头部待决计数 `aria-live`（§22.1） | 决策收件箱、面板决策 tab、批阅弹窗 | P1 | ✅ 已落地（前批完成，2026-10-27 销账核对） |
| A3 | `semantic/cost-figure`（**新沉淀件**） | 新建 | 成本语义件：金额+token 双轨、mono tabular-nums、运行态滚动/微光、终态静默；「数据源只给自身值、汇总组件现算」契约写进 aiNotes（§22.2）。由 run-overview-card / run-info-panel 的内联成本展示抽出收编 | 执行卡、执行详情、编排树、成本归因 | P1（B1/B3 的地基） | ✅ 已落地（前批完成，2026-10-27 销账核对；aiNotes 范式首例） |
| A4 | `ai-verdict-pill` / `confidence-bar` | 升级 | 置信度改四档信号枚举（0-3：无/弱/良/强）+ 防御性归一（NaN/越界收敛合法档）；数值口径在展示层折算并保留 advisory 声明 | JEV 判定上屏各处（验收概率/审批风险/发版就绪度） | P2 | ✅ 已落地（前批完成，2026-10-27 销账核对） |
| A5 | `executions/run-timeline` | 升级 | 事件列表补「活性」：运行中步骤 live 计时、状态迁移播报、失败步骤展开错误+重试入口（§22.3/22.5）——B3 瀑布升级前的过渡合规 | 执行详情 | P2 | ✅ 已落地（前批完成，2026-10-27 销账核对） |
| A6 | `watch-deck` 族 | 登记技术债 | 接真实 Execution 流替代剧本回放（批三 C-08 既有裁决「接真实数据完成前不扩大形态」的 UI 侧呼应）；本账只登记，不新增形态 | AI 表面 | 跟随 C-08 | — |

## 三、B 档：新建语义组件（每件开工走 requirement-intake；建议名均为 semantic 层 kebab-case）

> 销账纪律（§六）：落地一批即从「待开发」移入下方「已落地销账区」，同步 registry 登记 + 画廊 demo（五段式）+ aiNotes。B1/B2/B4/B5/B6 已于 **2026-10-27** 登记批销账；待开发仅余 B3。

### 已落地销账区（✅ 2026-10-27 登记批）

五件均已合入 `apps/frontend/src/components/semantic/`、登记 `registry.ts`（含 aiNotes 三段式）、画廊 `design-system-page` demo 五段式入册、COMPONENTS.md 同步再生。registry 状态以登记为准：B1 `exec-tree` / B2 `approval-card` / B5 `autonomy-dial` 有生产消费方登记 canonical；B4 `context-usage`（消费前置：服务端 `contextWindow` 契约缺失，禁手造 limit）与 B6 `inline-diff`（消费接线留后续批）按 chip 先例登记 standby、接线同批升 canonical。

#### ✅ B1 `exec-tree` —— 执行编排树（⭐ 首选 P0）
- **开发理由**：批一 A-04/B-03 执行前约束 + 派发认领语义（2026-10-25 体检批）落地后，「一个编排者+多个子执行」已是真实数据形态，但 UI 只有表格视图（execution-table-view），**树形态缺位**；C-06 成本归因（G8，批二唯一未开工项）需要「分支成本汇总」的可视化落点；G5「cwd 隔离（git worktree 任务级）+ 成果合入」设计切片挂账，落地后编排叙事成为刚需。三条需求线在同一件上交汇。
- **使用场景**：executions 页行展开态、issue 详情执行段、（远期）watch-deck 工位卡。
- **形态与数据契约**：树卡六态映射 Execution 状态机（queued/running/**waiting=等人**/done/failed/stopped，§22.1）；每卡成本自身值、分支汇总组件现算（§22.2 + A3 件）；重试=新子节点、失败者保留（§22.3）；分支折叠受控/非受控双模（§10.7）；键盘 Tab/Enter/Space + ARIA tree/treeitem。形态参考：affectUI Agent Tree（公开 API 已核）。
- **对位**：CAP-A-04 / B-03 / C-06 / G5；宪法 §22.1-22.3 全覆盖。**P0（B 档第一优先）**。
- **落地注记**：已接入 `run-details-dialog`（单根退化态——数据层 `Execution` 无 `parentExecutionId`，未为演示造树形假数据）；多级接入待父子数据契约，子级挂 `children` 即长出。

#### ✅ B2 `approval-card` —— 审批操作统一件
- **开发理由**：C-04 批准有效性已闭合（后端），前端审批操作分散在 run-approvals-section（执行详情）与 decision-review-modal（收件箱弹窗）两处，交互不含风险徽标、行动预览、单键批准/拒绝、形变收场；JEV 批一 P0-A 审批风险定级（riskLevel/safeToAutoApprove→metadata.aiJudge）已产数据，需要统一呈现位。
- **使用场景**：执行详情审批段、决策收件箱、（远期）桌面通知深链直达批准。
- **形态与数据契约**：风险档（复用 A4 四档）+ 行动预览（会做什么）+ Approve/Deny 单键 + 倒计时暂停（等待 AI 完成当前步）+ 决后形变收场（§22.4）；props 受控、决断回调 `onResolve(action: approve|reject|retry|dismiss)`。
- **对位**：C-04、CAP-A-27 批一 P0-A；宪法 §22.1/22.4。**P0**。
- **落地注记**：已收编 `run-approvals-section`（唯一消费）；收场仪式（确认层 1s→凭证行）内置于本件；decision-review-modal 侧接线为后续可选收编。

#### ✅ B4 `context-usage` —— 上下文占用可视化
- **开发理由**：ai-hub 已有 token 计数，「模型上下文快满了/这条对话还装得下多少」对用户完全黑箱——上下文透明是重审三轴心「AI Native 内生于功能设计」的直接表达；全前端无任何承载。
- **使用场景**：assistant 面板（会话级）、执行详情（单次运行）。
- **形态与数据契约**：一期取格场形态（每格≈定量 token，悬停点亮分区：系统提示/工具/记忆/对话/文件）；compaction 发生时格子收敛动画；`role="img"` + aria-label 概括结论（§17.6 同法）。二期再评估 treemap 形态。
- **对位**：B-06（上下文时效性，已修）的 UI 延伸。**P1**。
- **落地注记**：组件 + 16 例测试落地，registry 登记 **standby**（chip 先例）；真实接线前置 = 服务端暴露 `contextWindow` 契约（禁消费方手造 limit，§22.2），接线方案已随组件头留档，契约立项走 requirement-intake。

#### ✅ B5 `autonomy-dial` —— 自治边界拨盘（trust 操作面）
- **开发理由**：B-07「评分→可理解的分级授权」已合入（#69），trust 四维 Score 双轨记账已落（CAP-A-27 批二 P1-E）；但授权档位目前是抽象等级展示，缺「哪些动作它可自己跑、哪些必先问我」的**运行时边界**操作 UI。
- **使用场景**：office 信任面板改造、AI 成员（Member）配置页。
- **形态与数据契约**：三档拨盘（自己跑 / 先问我 / 锁定必问）+ 每档下挂真实动作样例（来自该成员历史执行）；调整走既有授权配置链，不新增契约。
- **对位**：B-07；宪法 §22.1（等人档的高亮）。**P2**。
- **落地注记**：已接真 `adjust-trust-dialog`（拨盘即选择器，tier↔档位 1:1 映射走既有 `PATCH /members/:id`）；samples 样例滑轨待 B-07 后续切片供数（组件 API 已就绪）。

#### ✅ B6 `inline-diff` —— 文本逐段审阅件
- **开发理由**：document-enhance 与 PromptEditor 都有「AI 改文」场景，现状是一键替换无对照；宪法 §22.6 diff 优先律需要承载件；AI 创建 AI 同事的 member-profile-draft 场景（2026-10-27 落地）的「草稿分卡逐字段可编辑」是近亲形态，可复用交互律。
- **使用场景**：文档 AI 增强、提示词编辑器、AI 同事草稿。
- **形态与数据契约**：改前/改后逐段对照、逐段接受/拒绝（键盘 j/k+Enter）、「全部接受」带逐段回退（§22.6）。
- **对位**：宪法 §22.6；A-18 样板推广。**P2**。
- **落地注记**：组件 + 20 例测试落地，registry 登记 **standby**（chip 先例）；纯函数 `tokenize`/`diffTextSegments`/`synthesizeAppliedText` 已导出；消费接线（document-enhance / PromptEditor / member-profile-draft）留后续批，接线同批升 canonical。

### 待开发

#### B3 `trace-waterfall` —— 执行时间轴瀑布（run-timeline 的第二形态）
- **开发理由**：AIUsageLog 步骤级 token/cost 数据已存在（run-info-panel 已显 byModel），但「时间与钱花在哪一步」无时间轴形态；执行评估（批一 A-19 失败诊断）需要「最慢/最贵一步」的定位视图。
- **使用场景**：执行详情（与 run-timeline 列表形态并存，按 run 形态切换）。
- **形态与数据契约**：每次 LLM 调用/工具调用/子执行一根条；逐条 token+cost（A3 件）；最慢步标记；分支折叠回父级；运行中整体 shimmer。
- **对位**：C-06（G8）；宪法 §22.2。**P1**。

## 四、C 档：候补区（不立项、不排期；场景触发再评审转 B 档）

| # | 件 | 转正前置（触发场景） |
|---|-----|---------------------|
| C1 | `conflict-radar`（多执行改同文件的冲突仲裁矩阵） | G5 worktree 任务级隔离+成果合入落地（多执行并行改树成为常态） |
| C2 | `fan-out-grid` / `parallel-attempts`（扇出网格 / 并行竞赛） | 出现「一听多发」批处理或多路尝试择优的真实场景（workflow v2 批量节点扩容后） |
| C3 | `agent-steering`（运行中排队提示/立即打断） | execution 打断/插话能力立项（后端先于 UI） |
| C4 | `memory-panel`（记忆管理：分组/编辑/遗忘+Undo） | MemoryAtom 管理 UI 立项（memory 模块前端化） |
| C5 | `agent-cursors`（文档内 AI 实时协作指针） | document-enhance 走向实时协作场景 |
| C6 | `agent-ledger`（执行变更账+undo 链可视化） | 执行产物回滚/撤销能力立项 |

## 五、治理设施（非组件，配套门禁与工具）

| # | 设施 | 内容 | 宪法锚点 |
|---|------|------|---------|
| G1 | 画廊五段式 + aiNotes 槽位 | AI Execution 分组与 AI 相关 semantic 件 demo 模板增五段（When to use / When not to use / Keyboard / Accessibility / Motion）；registry `ComponentEntry` 增 `aiNotes?` 字段，`gen-components-md.mjs` 生成进 COMPONENTS.md；机器化候选=aiNotes 存在性 lint（新增件未填 warn） | §22.7 |
| G2 | waiting 权级修订 | `shared/status/status-visuals.ts` waiting 族视觉权级上调（warning 系+图标+可计数），两大列表与执行视图消费 | §22.1 |
| G3 | 时长格式统一 | `@/lib/format` 的 `formatDuration` 吸收渐进精度口径（<1s 显 ms→<60s 显 0.1s→m/h/d），替换执行面各处手搓计时格式 | §14.3 |

## 六、登记与销账纪律

1. **两账分离**：本账只承载待开发/待升级；落地一批即从本账销账，同步 registry 登记（含 section 归组与 variants）+ 画廊 demo（五段式）+ aiNotes。
2. **入口闸门**：B 档每件开工前走 `requirement-intake`（对位能力卡登记、测试映射 GAP-T 编号预占）；A 档升级属既有组件改造，随批登记能力卡切片注记即可。
3. **批次纪律**：遵守既有裁决——每簇独立小批、禁全库 codemod 大轮；A 档各件可独立合入，B1+B2 建议同批（共享 §22 语义底座与 A3 件）。
4. **候补转正**：C 档件转正须场景触发评审（§四前置列出现实），不得因「库里有参考实现」直接开工。
