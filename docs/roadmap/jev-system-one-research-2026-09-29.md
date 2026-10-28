---
title: "JEV（System One 模型）调研与 APM 接入点分析"
description: "JEV（System One 模型）调研与 APM 接入点分析"
category: roadmap
status: reference
version: 1.0.0
created: 2026-10-28
modified: 2026-10-28
---
# JEV（System One 模型）调研与 APM 接入点分析

- 日期：2026-09-29
- 性质：技术调研（非开工许可——按 AGENTS.md 铁律，任何接入功能动工前须走 `requirement-intake` skill 登记能力清单）
- 结论速览：**适配度高**。APM 的产品核心语法「AI 代写 → 人确认 → 完整性审计把关」中，JEV 恰好补的是「把关」环节的初审位；且项目里存在多处「机制留白」（字段已预留、逻辑未接）正等一个毫秒级、可校准的便宜判断器。但有三个前置条件：**中文校准实测、防操纵边界、固定模型版本**。

---

## 一、JEV 是什么

TypeSafe AI（创始人 Diogo Almeida）推出的「系统一（System One）模型」，2026-09-21 GA，当前版本 `jev-1.13.0`。它**不做文本生成**——不聊天、不写代码，只对开发者给定的结构化问题返回离散判断与校准置信度。训练方法为 RLCD（Reinforcement Learning for Calibrated Decisions）：把模型输出的概率对准真实结果，而非 RLHF 式的人类偏好。

| 维度 | 事实 |
|------|------|
| 问题类型 | `Choice`（≤255 选项，返回 choice + 各选项概率 + confidence）、`Score`（2–10 个有序等级，返回可落在等级之间的分数 + confidence）、`Noul`（是/否，返回 0–1 概率，**无 confidence 字段**——「这个数本身就是信念」） |
| 延迟 | 端到端 70–500ms（官方对比 LLM 3s–329s，宣称最高 200x） |
| 价格 | 输入 $0.042/百万 token，**输出免费**；单次判断约 $0.0004；注册送 $5（约 1.2 亿输入 token） |
| 限流 | 250,000 tokens/秒、1,200 请求/分钟（429 时 SDK 指数退避） |
| 校准 | 官方基准 ECE 0.144（社区对比微调 Laya 的 0.213 更优；均为自测口径） |
| 上下文 | `state`（文本/JSON/数组）总量 64k token，state + 最长问题 32k |
| 接入 | 单端点 `POST https://api.typesafe.ai/v1/systemone`；官方 SDK `@typesafe-ai/sdk`（Node 20+）/ `typesafe_sdk`（Python 3.10+）；可经 OpenRouter、LiteLLM 代理 |
| 使用范式 | ① 投机扇出：一次调用并行多问，加问题几乎不加延迟，批量比逐个便宜 12.2x、快 10x；② 置信度门控路由：高置信自动执行、低置信转人，按操作风险设不同阈值；③ 级联：Jev 做分类路由，简单请求走纯代码、难请求给前沿模型；④ 先检索后判断：state 是模型唯一的世界，塞无关内容会拉低准确率 |

### 能力边界（接入设计必须绕开的坑）

- 只处理文本，无图像/音频/视频；**不能可靠计数、日期比较不可靠、不理解否定/scoping 语义**——这类算术要在代码里做，逐项用 Noul 判断。
- **state 不被视为敌对输入**：官方明确用户可控内容不在其威胁模型内。APM 的 issue 描述、执行输出都是用户/AI 生成文本，直接进 state 意味着判断结果可被文本内容「说服」——自动化范围越大，这个面越大（见 §四的安全设计）。
- **置信度跨域非单调**：社区实测三对象逻辑推理 40/40 满分，但常识因果判断任务即使高置信区间也翻车。置信度数值只在「同类问题分布上」可比较，不能跨场景互推。
- 中文：官方宣称多语言支持，但社区一致建议在代表性中文样本上实测准确率与校准后再信——**APM 全中文语境，这是本案第一验证项**。
- `jev-latest` 别名会随版本漂移，必须显式固定版本号（响应 `model` 字段回显实际版本）。
- 单一小厂商：需要 provider 可换架构（OpenRouter / LiteLLM 作备份通道），不能硬绑定。

---

## 二、项目侧现状：判断类流程盘点（代码证据）

调研子代理全仓摸底结论：APM 已有完整的「规则打分 + 人裁决」骨架，且已有一条统一的「静默 JSON AI 调用」协议（assistant-silent），**但所有 AI 参与都是重文本生成型**（`generateText` + 正则 `extractJsonObject` 提取，无 schema 校验、无按任务类型的模型路由），没有任何「毫秒级选择/打分/置信度」型轻量调用。

### 已有的判断类骨架（可直接承载 JEV 输出）

- 信任：`trustScore`(0–100)、`trustLevel`(1–3)、四维 `averageScores.{correctness,efficiency,safety,collaboration}`（`apps/server/prisma/schema.prisma:1447`）
- 审批：`riskLevel`(read|write|high_risk)、`status` 含 `auto_approved`、`approverPolicy`（`schema.prisma:2062-2068`，**后两者预留未用**）
- 验收：criteria `pending|passed|failed|blocked`、证据类型含 `model_evaluation`（`schema.prisma:2002`，**枚举已预留、全仓无一处写入**）、`riskLevel(red|yellow|green)` 完整性审计
- 决策：`Decision`/`DecisionSlots` 开放结构 + `contentFingerprint`/`approvalStale`（CAP-C-04）
- 记忆：memory-digest 场景已输出 0–1 `confidence` 并落库（`assistant-silent.service.ts:160`、`assistant-memory-digest.service.ts:153-185`）——项目已有「AI 输出带置信度」的先例与消费习惯

### 五处明确的「机制留白」（字段/方法在、逻辑空转）

| 留白 | 位置 | 现状 |
|------|------|------|
| `autoApprove` 无调用方 | `apps/server/src/modules/execution/approval.service.ts:246-267` | 方法已实现（high_risk 禁自动批），全仓 grep 无触发点 |
| `model_evaluation` 证据类型未写入 | `schema.prisma:2002` / `acceptance.dto.ts:31` | 枚举预留，零写入 |
| 人工验收审批 riskLevel 硬编码 `medium` | `execution.service.ts:522-537` | 无任何定级逻辑 |
| `AIModelConfig.taskTypes` 返回 null | `ai-hub.service.ts:45-94` | 按任务路由模型的槽位在、实现空 |
| trust 评估 criteria 硬编码常量 | `cli-dispatch/dispatch.service.ts:111-131` | `TRUST_CRITERIA_SUCCESS = {correctness:90,...}`——执行评估**不看内容只看成败** |

### 成本纪律先例（接入范式的对齐对象）

`apps/server/src/modules/execution/failure-classifier.ts:1-12` 文件头明文「本文件绝不发网络请求」：零 token 关键词规则先行，深诊断才走 LLM 静默场景。**「规则能判的不调模型」是既有范式，JEV 接入须沿用这个双层结构。**

---

## 三、接入点清单（按优先级）

### P0-A 审批风险定级 + 自动批准分流（改造成本最低、收益最直接）

- 痛点：审批 riskLevel 由创建方自报或硬编码 medium；`autoApprove` 建好了没人敢用，因为「谁来自动批」缺一个可信的判断器。
- JEV 判断设计：`state` = requestedAction + actionType + goal 摘要（**注意排除用户自由文本**，见 §四），questions：`riskLevel: Choice(read|write|high_risk)` + `safeToAutoApprove: Noul`。
- 门控：`riskLevel=write` 且 `safeToAutoApprove ≥ 0.95` → 走已有 `autoApprove`（status 自动记 `auto_approved`）；high_risk 或低置信 → 照旧人审。
- 落点：`approval.service.ts` create 前置 judge 调用；下游 resolve/autoApprove 零改动。

### P0-B 验收证据预审（激活 `model_evaluation` 槽位）

- 痛点：证据校验纯规则（正则/schema/聚合），「证据是否真的证明该标准达成」只能人看；`model_evaluation` 证据类型预留至今没用上。
- JEV 判断设计：逐条 criteria，`state` = 标准文本 + 证据摘要，questions：`evidenceSufficient: Noul` + `verdict: Choice(passed|failed|unclear)`。
- 门控：**advisory 起步**——结果落 `AcceptanceEvidence(evidenceType='model_evaluation', metadata.confidence)` 仅在验收面板展示为「AI 预审」，不改 `acceptCompletion` 判定权（「CI 落证据、判定归人工」哲学不破）；攒够校准数据后再考虑把高置信通过降为抽检。
- 落点：`acceptance-criteria.service.ts` / `github-evidence.subscriber.ts` 回流后追加一步。

### P1-C intake 两个「纯分类」场景换便宜通道

- 现状：`readiness-review`（六维三态 + verdict）与 `decomposition-review`（逐任务 granularity/testability 三态 + verdict）本来就是要模型「只输出枚举」的活，现在用整套大模型生成（`assistant-silent.service.ts:378-463`）。
- JEV 判断设计：六维各一题 `Choice(ready|unclear|missing)` + 总 `verdict` 一题，一次调用扇出；长 summary 仍留大模型或模板化。
- 收益：这两处是前端手动触发的高频评估，换 JEV 后延迟从秒级进百毫秒级、成本降约两个数量级，还顺带解决现有 `extractJsonObject` 正则解析的可靠性欠账（SDK typed answers 天然结构化）。

### P1-D 契约漂移语义判定（降误报卡片）

- 痛点：`contract-binding.service.ts:127-194` 的 checkAlignment 只做字节级比对（checksum/managed 块），手改是否「实质破坏契约语义」无从判断，漂移一律升级决策卡 → 人被误报骚扰。
- JEV 判断设计：drift 检出后、升级前，`state` = 契约 spec 区间 + 实际 diff，questions：`impact: Choice(benign|semantic-break|formatting-only)`。
- 门控：`benign` 且高置信 → 仅记通知不建卡；`semantic-break` 或低置信 → 照旧升级 `contract_conflict` 决策卡。blocks 差异已是现成输入。

### P1-E trust 执行评估上「真判断」

- 痛点：`TRUST_CRITERIA_SUCCESS/FAILURE` 常量写死四维分数（`dispatch.service.ts:111-131`），信任演进这个产品差异化卖点实际是「看成功/失败查表」。
- JEV 判断设计：执行终态后，`state` = goal + output 摘要（排除用户可控部分或降权），questions：四维各一题 `Score(0–100 十档)`。
- 门控：先与常量并行双轨记录（不生效只记账），对比一段时间证明判断质量优于查表后再切换；下游 `evaluateExecution` 管道与等级映射零改动。

### P2-F workflow 引擎新增 judge 节点

- 现状：自研 V2 引擎（`workflow-v2.engine.service.ts`，非 Mastra）的判断点只有 `condition` 纯规则比较（`:481-494`）与 human 节点人审；llm 节点只生成文本。
- 设计：`execNode` switch（`:453-554`）加一个 `judge` 节点类型——跑 JEV 返回枚举/分数 + confidence，写进 `steps.<id>` 供后续 condition/interpolate 消费；journal/确定性重走/事件机制对它透明。这让「入口初筛三分类」这类内置 workflow 判定点（`workflow-builtin.ts:123-192`）从 llm 节点降级为毫秒级 judge 节点。

### P2-G 决策卡「AI 参考」槽位（产品面）

- 现状：决策卡只展示规则性风险字段，唯一分数是 assignment 卡的 trustScore（`decision-card.tsx:522-534`）；`Decision` payload 是开放结构。
- 设计：服务端在 payload 附 `aiSuggestion: { verdict, confidence }`，前端 evidence 抽屉加「AI 参考」段。
- 诚实说明：JEV **不能生成理由文本**（不产文字），卡上可展示的是判断 + 概率分布 + 置信度；「为什么」要么由 criteria 差异合成模板文案，要么仍由大模型补。这与「AI 同事」愿景的适配点在「给出可校准的倾向」，而非「给出解释」。

---

## 四、安全与可靠性设计约束（接入前必须立的三条规矩）

1. **防操纵边界**：JEV 的 state 不防注入。凡「判断结果触发自动动作」的场景（P0-A 自动批准、P1-E 信任加分为甚），state 不得包含可被用户/被执行 AI 自由编写的文本；确需内容摘要时只允许来自系统生成的结构化字段（状态码、命令退出码、diff 统计），并对自由文本场景把置信度阈值提高 + 强制人审抽检。
2. **失败降级 = 回落规则层**：JEV 调用超时/失败时必须回落到现有规则行为（查表常量、纯规则审计、照旧建卡），绝不阻塞主流程——对齐 failure-classifier 的双层范式。所有判断结果在 AIUsageLog 记账（`responseMetadata.kind='judge'`），可回溯可审计。
3. **版本与通道锁定**：固定 `jev-1.13.0`（忌 `jev-latest` 漂移）；ai-hub 的 AdapterRegistry 天然支持 provider 抽象，TypeSafe 直连为主、OpenRouter 为备，通道可切换；配置沿用 `AIProviderConfig` 加密存储先例。

---

## 五、架构落法：ai-hub 新增 quickJudge 通道

现有 assistant-silent 通道语义是「前端触发的静默生成」（`assistant.controller.ts:186-200`），系统内部判断不该蹭这个端点。建议：

- 新增 `ai-hub/services/quick-judge.service.ts`：`judge(state, questions)` 薄封装 `@typesafe-ai/sdk`，产出类型化 answers；
- 模型路由：真正启用 `AIModelConfig.taskTypes='judge'`（现状返回 null 的留白），judge 类调用路由到 TypeSafe provider；
- 记账：AIUsageLog 增 `judge` 来源（现有 conversation/execution/silent 三类之外），估价接 usage-pricing.service（输入计费、输出零价）；
- 场景注册表：模仿 silent 场景注册表（协议注释 `assistant-silent.service.ts:7-31`）建 judge 场景清单，每个场景声明 questions schema + 置信度阈值 + 降级行为，避免调用方散落硬编码。

成本账：$0.042/MTok ≈ 单次判断 $0.0004；即使单工作区每天数千次判断也是美分级，比现有大模型 silent 调用便宜约两个数量级——「把关初审」从「舍不得调」变成「随便调」。

## 六、实施路线（建议）

| 步骤 | 内容 | 闸门 |
|------|------|------|
| 0 | **中文校准实测**：用项目真实数据（issue 描述、验收标准、审批 reason）造 50–100 个标注样例，测准确率 + ECE | 不达标全案搁置 |
| 1 | P0-A / P0-B 以 advisory 模式上线（只展示不拦截），judge 通道基建 + 记账 | 判断与人工裁决一致率 ≥ 目标线 |
| 2 | 攒置信度-实际结果校准数据，按场景定阈值；开启 P0-A 自动批准（先 low-risk 工作区试点） | 校准曲线达标 + 防操纵审计通过 |
| 3 | P1-C/D/E 替换与双轨，P2-F/G 按需 | 逐场景独立小批（禁全库大轮，遵循 2026-09-29 工作法裁决） |

治理提醒：以上任一步骤动工前，按 AGENTS.md 铁律走 `requirement-intake` skill 登记能力清单；本调研仅为技术评估。

## 七、结论

JEV 与 APM 的匹配不是「又一个 AI 模型接入」，而是恰好落在三个结构性空位上：① 一批预留未用的机制（autoApprove/model_evaluation/taskTypes/riskLevel 定级）等一个可信的自动判断器来激活；② 产品主轴「工程化可信度」需要的是**可校准、可审计**的判断，JEV 的置信度输出 + RLCD 校准正是为此设计；③ 现有大模型参与全是生成型重调用，缺一层「毫秒级初审」，JEV 补上后形成「规则 → JEV 初审 → 大模型深诊 → 人裁决」的完整成本阶梯。风险集中于中文校准未实测、防操纵边界、单一小厂商三点，均有明确缓解手段（§四），不构成否决项。

---

## 参考来源

- [How to Use Jev: A practical guide to TypeSafe's System One model（dev.to，API 形态/限制最全）](https://dev.to/valyuai/how-to-use-jev-a-practical-guide-to-typesafes-system-one-model-g5e)
- [TypeSafe SDK（OpenRouter 社区文档，@typesafe-ai/sdk TS 用法）](https://openrouter.ai/docs/guides/community/typesafe-sdk)
- [Jev TypeScript quickstart: build a typed ticket router（refix.ai）](https://www.refix.ai/news/jev-quickstart-typescript)
- [What Is Jev?（LangChain 博客，含 200x/400x 数据）](https://www.langchain.com/blog/building-a-harness-with-jev)
- [Awesome Jev use cases（GitHub 用例集）](https://github.com/walidboulanouar/awesome-jev-use-cases)
- [LiteLLM TypeSafe/Jev pass-through 文档](https://docs.litellm.ai/docs/pass_through/typesafe)
- [Jev vs Laya 置信度校准对比（ECE 0.144 vs 0.213）](https://wilsonwu.me)
- [Laya 本地方案与 Jev 对比（中文样本实测建议）](https://laplusda.com)
- [Jev 深度解析——不说话的 AI 模型（CSDN，RLCD 中文综述）](https://blog.csdn.net)
- [从 Prompt 编译到离散裁决：jev-skill 的 Agent 决策外挂（lijianfei.com，置信度跨域非单调实测）](https://lijianfei.com)
