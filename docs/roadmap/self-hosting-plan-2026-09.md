---
title: APM 自举完整方案（APM 用自己管自己，2026-09 设计稿）
description: 自举总体设计——现状盘点（契约/发版/承接管道已具备八成原生能力）、六环节目标态映射、五阶段路线（立项建档→发版接管→需求真相入 APM→执行面自举→闭环验收）、五个完成判据与决策点
id: ROADMAP-BOOTSTRAP-001
category: roadmap
status: draft
created: '2026-09-26'
modified: '2026-09-26'
scope: 全仓自举专项（dogfooding）
ai-priority: high
ai-session-types: all
tags: 'self-hosting, dogfood, bootstrap, governance, release, intake'
---

# APM 自举完整方案（已立项 → CAP-S-01，planned 待开工令）

> **立项记录（2026-09-26）**：经 requirement-intake 五步以 **CAP-S-01**（S 自举线，[[能力清单-v1]] §4.7）登记 planned；阶段 0 立项动作（本卡 A0-1 自举专项立项本身）已随 S 线三卡登记完成。阶段 3 执行面自举由 CAP-S-02/03 承接（见 [agent-integration-plan-2026-09.md](./agent-integration-plan-2026-09.md) 与 [workflow-v2-redesign-plan-2026-09.md](./workflow-v2-redesign-plan-2026-09.md)）。

## 〇、定位与一句话结论

**自举 = APM 项目的完整研发生命周期（需求 → 任务 → 执行 → 验收 → 质量 → 发版 → 文档）全部在 APM 系统内流转、留账、受门禁约束；仓库文件侧退化为「镜像与证据」。**

一句话结论：**自举的原生能力已具备约八成，缺的不是功能，是「接线与立项」。** 契约托管已在管本仓库的 AGENTS.md、Release 驱动型发版管道（CAP-K-03）已建成、需求承接六步流已入库为 workflow 内置模板——但「自举」从未被立项为能力卡（47 张卡零命中），需求账本仍活在 git 外的 markdown 里，发版管道未接管自己的 CHANGELOG。本方案 = 把已有单点能力串成闭环 + 把流程闸门从「会话 skill 约定」逐步迁入 APM 系统。

## 一、现状盘点（三本账）

### 1.1 已具备、可直接支撑自举（不新建，只激活）

| 能力 | 承载 | 对 APM 自身的现状 |
|---|---|---|
| 契约文件托管 | `modules/contract`：三态绑定（managed/synced/detached）、`apm:managed` 托管区间引擎、apm_ frontmatter 身份、漂移升级 `DecisionProposal(contract_conflict)` | ✅ **已纳管**：根 AGENTS.md 带 `apm_project_id: cmu8iciuo001sfyo0kc7uj6m1` + project-intro 托管块 |
| 驱动型发版 | `modules/release`：Release 实体 → 六项门禁 → 决策卡审批 → tag/GitHub Release → CHANGELOG 单向再生（`apm:derived-file` 头） | ❌ 未启用：根 CHANGELOG.md 仍手工维护（种生为 detached 过渡态） |
| 需求承接管道 | workflow 内置模板 `apm-requirement-intake` 六步流（AI 初筛→六问→人裁决闸门→归档→建卡）+ `intake-composite` 静默 AI 代写 + 前端 `/app/intake` 承接页 | ⚠️ 模板已入库（v0.7.1「APM 用自己管自己」首次进发版记录），**无真实 run 证据** |
| 执行底座 | Issue/Execution/Acceptance 实体族、MCP server（list_tasks/claim_task/dispatch_cli/submit_task_result/search_entities）、CLI+daemon runtime | ✅ 机制完备，从未用于 APM 自身开发任务 |
| 证据回流 | CAP-B-08：CI/PR 证据经集成回流验收层 | ✅ 机制完备，未接 APM 自己的仓库 |
| 提示词治理 | CAP-A-24：prompt 模块分层编辑 + 方案 D（AGENTS.md 受管区块物化，与契约托管块多区共存） | ✅ 机制已落，天然是「管理开发 APM 的 AI 的提示词」的自举件 |

### 1.2 半成品 / 结构性缺口

| 缺口 | 现状 | 影响 |
|---|---|---|
| **需求真相源在系统外** | 能力清单/需求入口流程/测试映射矩阵均为 `docs/01-需求/` markdown，且 **docs/ 整目录 gitignore**（仅本地磁盘）；requirement-intake skill 与 APM API 零集成（纯 Read/Edit markdown） | 需求账无版本安全网、无结构化关联、跨工具会话依赖文件在场 |
| 仓库 md ↔ Document 无双向通道 | `importFromFile` 是死代码；Document 无 sourcePath；契约 `docs_dir`/`readme` 两个 fileType **已定义未实现** | docs/ 关键文档进不了 APM 的版本/寻址/订阅体系 |
| CHANGELOG 接管未完成 | 再生格式（Keep a Changelog 纯文本）与现文件（带 frontmatter + apm 头注）不一致；check-doc-sync 要求 md 带 frontmatter | 切换前需裁决格式归属 |
| CLI 命令缺口 | 无 release/contract/issue 建卡类子命令 | ZCode 会话无法经 CLI 完成承接/发版闭环，只能走 REST/MCP |
| 质量账在第三方 | stability-check 纯 shell+markdown，**bug 权威在 Linear**（label `stability`） | 质量闭环不在自家系统 |
| 对齐节拍少 | contract 对齐仅 project.created / execution 终态 / 人工 POST 三个触发 | agent 直接改文件无感知（可接受，见 §六决策点 4） |

### 1.3 两套并行机制的关系（须显式共存，不吞并）

- **仓库侧 CI 治理**（`scripts/check-doc-sync.mjs`、`contract:check`、`api:audit`…）：git 层纪律，管「代码改动须同 PR 更新文档」等，与 APM 后端实体零交互。
- **APM 系统内治理**（contract 绑定、release 门禁、decision 裁决）：数据层真相。
- 自举不是二选一：CI 管「入库纪律」，APM 管「业务真相与流转」。边界声明写入能力卡，防止后续互相侵蚀。

## 二、目标态：六环节映射

| 环节 | APM 承载功能 | 自举后 APM 自身的流转 |
|---|---|---|
| 需求 | workflow `apm-requirement-intake` + DecisionProposal + Document 归档 | 新功能想法在 APM 内走六问、人裁决、归档、建卡；markdown 清单降为镜像（双轨期） |
| 任务 | Issue（开工登记卡）+ Playbook 剧本 | 47 张能力卡与日常开发任务在 APM 内有账，卡片状态与清单对账 |
| 执行 | cli-dispatch / runtime / MCP 认领 | 开发 APM 的 AI 会话（ZCode 等）开工前认领 Issue、收口回填 Execution |
| 验收 | Acceptance + CAP-B-08 证据回流 | 能力卡三段式验收标准落 Acceptance；CI/e2e 证据回流自家仓库 |
| 质量 | stability 报告 → Document；红黄项 → Issue | 巡检报告入 APM 可查可订阅，bug 权威从 Linear 迁入 |
| 发版 | Release 管道全链 | v0.7.5 起 CHANGELOG 由 Release 实体单向再生，tag 由发布流水受控打出 |

## 三、设计原则（三条铁律）

1. **串珠不重造**：优先激活既有能力（contract/release/workflow/MCP），**不建 Requirement 新实体、不建 intake 后端模块**（与 CAP-P-01「不建新模块」既有裁决一致）。能力清单数据化走「Document 全文 + Issue 逐卡」轻量路线。
2. **双轨渐进、显式换源**：markdown 账本与 APM 系统并行一段；每个阶段设一个「真相源切换点」，切换时在决策日志显式宣布（遵守「单一真相源」铁律与「不静默覆盖」铁律）。禁止大爆炸迁移。
3. **自举治理自举**：本方案自身先走 requirement-intake 立项；后续每个阶段的实施卡也走闸门——阶段 0 的第一次实践就是「用 APM 的治理流程管理『自举』这个需求」。

## 四、分期路线（阶段 0 → 4）

### 阶段 0：立项与建档（零代码，一个会话可完成）

| # | 动作 | 说明 |
|---|---|---|
| A0-1 | **requirement-intake 立项自举专项** | 一行声明（价值=用真实使用驱动产品打磨 + 需求/发版账本获得系统级安全网；影响域=跨线）→ 冲突检测（与 K-03/A-11/A-12/P-01 互补不冲突）→ 新建能力卡：建议开 **CAP-S 自举线**（或挂跨线桥 X 段），母卡「APM 自举闭环」+ 五阶段子任务 |
| A0-2 | **核验 APM 项目档案与仓库绑定** | 确认项目 cmu8iciuo001sfyo0kc7uj6m1 的 Repository/ProjectWorkspace 指向 `D:\workspace\agent-project-manager`（契约工作区根三级回退依赖它；AGENTS.md 纳管已成功说明大概率已绑，需核验 role/defaultBranch） |
| A0-3 | **能力清单 47 卡 → Issue 批量建档** | 一次性回填：每卡一条 Issue，标题带卡号（如「CAP-A-15 控制面导航 IA」），metadata 记卡片 ID/状态/工作线；状态映射 planned→待办、doing→进行中、done→关闭、gap→取消归档；此后卡状态变更双向对账 |
| A0-4 | （可选）**stability bug 账从 Linear 迁入** | label `stability` 的 bug 建 Issue，此后 APM 为权威 |

### 阶段 1：发版接管（改动最小、收益最直接的激活项）

| # | 动作 | 说明 |
|---|---|---|
| A1-1 | 历史版本回填 Release 实体 | 0.1.0~0.7.4 一次性导入（notes 取自现 CHANGELOG 段落）。这是「用文件历史初始化 DB」，不违反此后「DB→文件单向」原则；真相自切换点起移交 Release 实体 |
| A1-2 | 再生文本对齐裁决 | `generateChangelog` 再生 vs 现文件差异走一次决策卡。**实施注意**：现 CHANGELOG.md 带 frontmatter（check-doc-sync 硬要求），再生输出需补 frontmatter，或给 check-doc-sync 加 `apm:derived-file` 豁免——二选一，决策卡裁决 |
| A1-3 | 绑定切换 | changelog 绑定 detached → managed（truthOwner=system），切换点写入决策日志 |
| A1-4 | **v0.7.5 起全程走 APM 发版** | Release 草案（版本推荐服务按 git tag+conventional commits 推断）→ 六项门禁 → 决策卡人工审批 → publish（CHANGELOG 再生 + tag + GitHub Release）。桌面 draft 人工 Publish 环节保持不变 |

### 阶段 2：需求真相入 APM（中等改动，核心工程量所在）

| # | 动作 | 说明 |
|---|---|---|
| A2-1 | 能力清单全文入 Document | 导入为 docRole=spec、category=requirement，获得 apm:// 寻址、版本快照、digest 订阅；同时把《需求入口流程》《测试映射矩阵》一并入档 |
| A2-2 | 实现 `docs_dir` 契约绑定（最小版） | contract 的 `docs_dir` fileType 已定义未实现；最小实现 = **关键文档白名单导入 + checksum 漂移检测**（不做全目录双向同步；docs/ 结构复杂且 gitignored，双向同步是过度工程） |
| A2-3 | requirement-intake skill 双轨升级 | 五步流程不变；第 4/5 步追加「落 APM」动作：裁决归档 → Document/决策卡，开工登记 → Issue 建卡（经 A2-4 的 CLI 或 MCP）。markdown 清单仍是会话闸门载体（跨工具 AI 可读），Document 为系统真相 |
| A2-4 | CLI 补命令 | `apm issue create/update`、`apm release list/create/publish`、`apm contract check`（REST 均已有，薄客户端加壳，成本低） |
| A2-5 | workflow 模板真跑一次 | 用 `apm-requirement-intake` 六步流真实承接一个新需求（建议就用阶段 3 的第一张实施卡），替代 skill 人工五步——作为需求自举的验收 run |

### 阶段 3：执行面自举（接线为主）

> **2026-09-26 扩充**：本阶段已由 [agent-integration-plan-2026-09.md](./agent-integration-plan-2026-09.md)（ROADMAP-AGENTLINK-001）展开为独立接入层方案——ZCode headless CLI 真相勘误、三通道架构（headless 派发/MCP 会话回联/workflow 编排接线）、P0-P2 落地清单。执行面接入以该文档为准。

| # | 动作 | 说明 |
|---|---|---|
| A3-1 | AI 会话开工认领 | 开发 APM 的 ZCode 会话开工前经 MCP `list_tasks/claim_task` 认领对应 Issue；收口 `submit_task_result` 回填 Execution（工具已全备，缺的是会话约定写入 AGENTS.md §九） |
| A3-2 | 证据回流接自家仓库 | CAP-B-08 的 CI/PR 证据回流指向 APM 自己的 GitHub 仓库（github 集成已具备）；PR checks/验收证据落 Acceptance |
| A3-3 | stability 报告入 APM | stability-check 脚本产物落 Document（roadmap 类），红/黄项自动建 Issue；Linear 权威正式退役 |
| A3-4 | 提示词自举 | CAP-A-24 方案 D：APM 自己的系统提示词在 APM 内编辑、物化到工作区 AGENTS.md 受管区块，与契约托管块多区共存（机制已落，启用即可） |

### 阶段 4：闭环验收（自举「完成」的可证明判据）

- **E1 发版自举**：一次发版全程 APM 内驱动（Release→决策卡→tag→CHANGELOG 再生），期间无任何手工编辑 CHANGELOG.md。
- **E2 需求自举**：一个新功能想法从六问到合入全链路在 APM 留账（Intake run/决策卡 → Issue → Execution → Acceptance → Release notes 引用）。
- **E3 契约自举**：一次真实漂移经 `contract_conflict` 决策卡人裁决闭环（accept_file / accept_db / detach 三选一真实发生并留痕）。
- **E4 质量自举**：一份 stability 报告在 APM 内可查、红项有 Issue 跟踪、Linear 不再是新 bug 的登记入口。
- **E5 提示词自举**：开发 APM 的 AI 的系统提示词在 APM 内管理并可追溯版本。

五条判据全绿 = 自举闭环达成，写稳定性报告归档。

## 五、关键设计决策点（待用户拍板，附推荐）

| # | 决策 | 选项 | 推荐 |
|---|---|---|---|
| D1 | 能力清单终局真相源 | a) markdown 永久真相；b) Document(DB) 真相、markdown 镜像；c) 双轨常态+checksum 对账 | **c**：markdown 保留「跨工具会话闸门」职能（ZCode/Claude/Codex 都能零依赖读取），Document 承担版本账与 apm:// 寻址；以契约 synced 模式的 checksum 纪律对账 |
| D2 | CHANGELOG 再生格式归属 | a) 再生格式为终局（文件变纯派生）；b) 改 generateChangelog 适配现风格（保留 frontmatter） | **b**：再生产出补 frontmatter（顺带满足 check-doc-sync），保持文件人类可读的头部信息；格式细节在 A1-2 决策卡定 |
| D3 | bug 权威迁移时机 | a) 阶段 0 随建档一起；b) 阶段 3 专项迁 | **b**：先跑通机制再迁账，避免迁移期两头记账 |
| D4 | 对齐节拍是否加密 | a) 维持三节拍；b) 加 git hook/文件监听 | **a**：agent 改文件后本就应走会话收口（execution 终态触发对齐），文件监听是多此一举且引入抖动 |
| D5 | 自举卡归属线段 | a) 新开 CAP-S 线；b) 挂跨线桥 X | **a**：自举有独立价值声明（真实使用驱动打磨），且横跨 A/B/C/D 四线，独立成线便于排期与对账；X 桥保持纯桥接语义 |

## 六、风险与红线

1. **双写漂移**：双轨期 markdown 与 DB 双写靠纪律，必须有对账动作（A0-3 建档后每阶段收尾对账一次；长期靠 D1 的 checksum 纪律）。任何一侧失真即违反「单一真相源」铁律，须停下来人工裁决。
2. **过度工程红线**：自举是治理工程不是功能工程。禁止顺手新建 Requirement 实体、intake 后端模块、全量 docs 双向同步、文件监听——每个「顺手」都必须先过 intake 六问。
3. **docs/ 不入 git 的安全网**：需求文档迁入 Document 后由 docs-git 快照（`documentsRepoPath`）兜底版本安全；切换点之前 docs/ 目录手工备份一次。
4. **发版切换期的回滚路径**：A1-3 绑定切换后如需退回手工维护，走绑定 detach（决策卡裁决），CHANGELOG 回到 detached——机制天然支持，无锁定风险。
5. **治理脚本与 APM 治理的边界**：CI（check-doc-sync/contract:check/api:audit）继续管入库纪律，不因自举而削弱；APM 门禁是第二道而非替代。

## 七、与治理流程的衔接

- 本文档为设计稿；**正式立项必须走 requirement-intake 五步**（A0-1），未立项前不得开工任何实施项。
- 各阶段实施卡按需求入口流程登记：三段式验收标准 + 测试映射 GAP 行 + 六问答案（自举卡六问要点：用户任务=小白团队也能让自己的项目被系统管辖；AI 职责=代写归档/对账/报告；可信依据=门禁与证据回流；人类控制=决策卡裁决发版/冲突/换源；失败降级=detach 回手工；跨模块闭环=contract×release×decision×issue×document）。
- 阶段里程碑与 CHANGELOG：阶段 1/2 的交付走 APM 自身发版管道归版（从 v0.7.5 起），自举用自己的管道记录自己的进度。

## 八、现状备注（2026-09-26）

- 当前工作树：`feat/prompt-governance-enhancements` 分支，CAP-A-24 三文件改动未提交（与本方案无关，先行处理）。
- 本方案落 docs/roadmap/（本地，不入 git）；立项归档后以 Document 版本为系统侧锚点。
