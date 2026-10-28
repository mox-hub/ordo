---
title: 全流程体验测试报告 2026-09-20
description: 夜航体验测试——新手小白/老手工程师/AI agent × 新项目/半截项目/维护期项目全流程体验，P0-P3 分级问题清单与修复路线图
id: ROADMAP-EXP-20260920
category: roadmap
status: active
version: 1.0.0
created: '2026-09-20'
scope: 体验测试（全模块）
ai-priority: high
---

# APM 全流程体验测试报告（2026-09-20 夜航）

> 测试基线：分支 `feat/ai-management-revamp` @ f56f845 + 工作树未提交改动（AI 管理页/runtime daemon-ops/issue-type-switcher 等）。全仓 type-check 通过（6/6 包）。

## 一、测试方案

### 1.1 用户×项目阶段矩阵

| | 新项目（空） | 半截项目 | 维护期项目 |
|---|---|---|---|
| **新手小白**（不懂 PM 工具） | 注册→首启引导→建项目建单全程 | — | — |
| **老手工程师**（Linear/Jira 重度用户） | — | halfway-exp（8 工单/2 文档） | maintenance-exp（43 工单/2 迭代/子任务/依赖/验收标准） |
| **AI agent**（API/协议接入） | API 注册→CRUD→派发→验收→导入导出 | 同左 | 同左 |

### 1.2 执行单元（3 波 9 个子代理 + 主线程复核）

| 单元 | 方法 | 产出 |
|---|---|---|
| E1 新手浏览器全流程 | Playwright 黑盒 GUI（注册→建项目→建单→AI 入口→设置→重登） | 40 截图，2 测试账号 |
| R1 新手可懂性审查 | 只读代码审查（i18n 4044 键×2 全量、onboarding、空态、危险操作） | 术语/文案/空态/保护四清单 |
| R2 老手效率健壮性审查 | 只读代码审查（快捷键/批量/表格/表单/错误处理/多工作区/性能） | 效率+健壮性+性能三清单 |
| R3 AI agent 契约链审查 | 只读（openapi.json 515 操作全扫 + execution/runtime/cli-dispatch/ai-hub/skills/context） | 能力-断点地图 + 13 项链路风险 |
| R4 治理链集成审查 | 只读（acceptance/decision/contract/release/trust + notification/integration/analytics/search） | 五链完成度 + 通知矩阵 + 死功能清单 |
| E6 AI agent API 实机 | 纯 HTTP API（PAT 全流程 + 错误语义测试 + 造数据） | 端点地图 + 重登 401 根因 + 51 工单数据 |
| E2 工单域深水区实机 | Playwright 黑盒（43 工单下筛选/批量/表格/快捷键/导入导出/迭代/错误模拟） | 73 截图，12 项实测 |
| E3 治理文档链实机 | Playwright 黑盒（验收门禁/决策批阅/契约/发版/文档/信任） | 85 截图，五链可用性 |
| E5 集成系统全扫 | Playwright + API（AI hub/技能/集成/通知/团队/分析/搜索/设置全 tab/boot/onboarding 等 15 模块） | 40+ 截图，模块活性总表 |

证据截图：`tmp/experience-20260920/`（novice-* / expert-* / gov-* / sys-* 共 230+ 张）。API 脚本与交接：`.tmp-apm-exp/`。

### 1.3 测试数据（保留在 default 库，命名带 exp）

- 账号 `agent-exp` / PAT `apm_pat_0f5b…06d1`（`.tmp-apm-exp/handoff.txt`）
- 项目 `maintenance-exp`（id cmu8mxh05…，43 工单）与 `halfway-exp`（id cmu8njhkf…，8 工单/2 文档）

## 二、核心结论（TL;DR）

1. **单点组件水准高于预期，链路整合是灾难。** 验收门禁逐项失败面板、发版门禁六项检查、决策卡正反面是全产品治理感最强的三处；但把「验收→决策→契约→发版→信任」串起来的每一根线几乎都是断的：决策收件箱 20 张卡 100% 无法批阅、契约冲突裁决三重断头、信任分有量纲 bug（成功执行反而降分）。
2. **三类用户的第一公里全有硬伤**：新手注册后用邮箱重登必 401（永久锁死）且掉进共享默认工作区看到他人全部数据；老手的键盘流/批量/全局检索三大效率基座全部缺失或半残；AI agent 面对无幂等键的 515 个端点、4 道无文档的派发前置门、形状不对就被静默丢弃的验收标准。
3. **「错误伪装成正常」是价值观级问题**：500 渲染成"暂无任务+引导创建"、搜索 404 伪装无结果、验收标准形状错被静默吞掉、批量派发静默只生效第一条、analytics 混入假成员名的英文 mock——对主打「工程化可信度」的产品，这些是最伤信任的一类缺陷。
4. **大量半成品已上 UI**：类型切换器（今晚新改动）点了零请求零反馈、表格 13 个显示属性 chips 全是死开关、全局页导出按钮灰禁用、文档删除是死按钮——"有入口无实现"比"没有入口"更伤。

## 三、P0 问题清单（14 项，阻断级）

| # | 问题 | 证据 | 影响面 |
|---|---|---|---|
| P0-1 | **注册后用邮箱重登必 401**：注册静默派生 username（`auth.service.ts:126` deriveUniqueUsername(email@前缀)，只藏在注册响应里），登录仅按 username 精确匹配（`:60-63`）无 email 回退。两账号 UI 复现 + API 定位根因 | novice-09e/09j 截图；E6 复现表 | 全部新用户，一退出即永久锁死 |
| P0-2 | **决策收件箱 100% 无法批阅**：contract_conflict 卡前端误路由到验收端点 404（`use-decisions.ts:36-90`，PROPOSAL_KINDS 无此 kind）；普通 resolution 示例卡 400 "Unsupported entityType: undefined"；后端 `proposal.service.apply()` switch 无 contract_conflict case，`resolveConflict` 全库零调用 | gov-31/35 截图 + 网络记录 | 治理闭环核心断裂；冲突卡永久滞留 |
| P0-3 | **新用户掉进共享默认工作区**：注册无工作区隔离，直接看到他人 497 任务/36 成员/他人磁盘路径 D:\workspace\…/20 条红点决策卡 | novice-03 系列 | 隐私/观感/引导三重灾难 |
| P0-4 | **全局搜索死链**：后端无 /search controller（前端注释自认"前端优先落地版"），搜任何词 404，UI 伪装"无结果"，页面还挂着英文演示占位 | expert-94、sys-search-* | 高频入口门面故障 |
| P0-5 | **批量派发 AI 静默只对第一条生效**：`tasks-page.tsx:621-624` `selected.find` 取第一个即打开单任务对话框，其余选中项丢弃；实机选 3 条仅 1 个请求，PAT 对账确认仅 1 条写入 | expert-37/39 | 数据丢失级 bug，用户以为全部派发 |
| P0-6 | **MCP 通道无鉴权**：token 只查存在不验内容（`mcp-server.controller.ts` handleSse/handleMessages），11 个工具（含 configure_cli_provider 可注入 env）对知道端点者全开放，操作 userId=null 无审计 | R3 审查 | 生态入口裸奔（安全） |
| P0-7 | **多工作区越权+串库**：x-workspace-id 头原样信任（`main.ts:37-44`），未校验用户∈工作区；未注册 id 静默回落默认库（`prisma.service.ts:159-163`） | R2 审查 | 越权读写他库（安全） |
| P0-8 | **导出 404 + 导入三无**：`/issues/export` 被 `@Get(':id')`（声明在前）吞成 404 "Task export not found"；导入无事务/只校验首行 projectId/不校验枚举（"不存在的状态"原样入库） | E6 API 复现；issue.service.ts:2320-2392 | 导入导出闭环断裂+脏数据 |
| P0-9 | **验收标准形状错被静默丢弃**：POST /issues 的 acceptanceCriteria 传 `{title,given,when,then}`（Gherkin 直觉形状）→ 201 但标准没落库（`issue.service.ts:558` 按 content 过滤无告警）；AI 以为写了标准实则没写，后续派发被 400 拦且无从知道原因 | E6 复现 | 验收门禁静默失效 |
| P0-10 | **信任分量纲 bug**：dispatch 侧传 0-1 量表（`dispatch.service.ts:550-556`），trust 侧按 0-100 加权（`trust.service.ts:332-346`）——一次成功执行把信任分从 50 打到 30，执行越多分越低，与"执行评估驱动信任演进"方向相反 | R4 审查 | 信任演进核心机制反向 |
| P0-11 | **文档删除死按钮×3**：document-view-page.tsx:323-326、documents-page.tsx:432-441/590-600 删除按钮只关菜单无删除逻辑 | gov-70/74 实机点击零反应 | 功能不可用且伤信任 |
| P0-12 | **通知管道从未跑通**：通知表 0 条；决策提案（含发版审批卡）有事件发布但 subscriber 未订阅（`proposal.service.ts:112` vs notification-event-subscriber）；CI/ai.workflow 是死订阅（全库无发布方） | gov-39、sys 通知面板 | 协作闭环感知断裂 |
| P0-13 | **analytics 假数据对用户可见**：质量/团队 Tab 英文 mock（成员名 Alex/Sarah/Marcus 在 38 人里一个不存在；W08 周数），无任何"演示数据"标注（`use-analytics-overview.ts:2-13` 自认 mock only） | sys-analytics-* | 直伤"能证明做成了"主轴 |
| P0-14 | **全 515 端点无幂等键**：190 个 POST 重试即重复创建；runtime 派发领取纯读不置 leased、daemon 内存去重、上报失败无限重投（`runtime.service.ts:247-288`、cli worker.ts:153） | R3 全量扫描 | AI/网络重试=重复工单/重复执行（安全+可信） |

## 四、P1 问题清单（22 项，严重）

**错误呈现与可信度**
1. 500 错误渲染成空态：路由拦截 /issues=500 后项目页"共 0 个任务"、全局页"暂无任务+创建第一个任务"引导按钮（expert-95/96）
2. 工单详情页加载即自动 POST accept-completion → 404 → 弹"操作失败：Acceptance not found"（用户什么都没做）
3. 邮箱已注册 409 提示"注册失败，请稍后再试"（误导）
4. 登录传 email 字段 → 401 UNAUTHORIZED（guard 先于 ValidationPipe，字段错误伪装凭证错误）
5. `/app/dashboard`（无 projects 前缀）坏路由直接 INTERNAL_ERROR 白屏
6. AI hub「测试连接」30 秒静默转圈后 toast 英文 axios 超时；后端 38s 拼好的结构化错误被前端 30s 超时吞掉

**治理口径**
7. 无契约工单标完成零拦截（`issue.service.ts:1516` 注释自认"存量兼容不拦"）——实机静默放行，验收门禁形同虚设
8. failed 验收契约可被决策卡绕过关单：`proposeTaskResolutionIfReady` 不把 failed 视为阻塞（`proposal.service.ts:796-799`），`applyResolution` 直写 DB 绕过 TASK_DONE_BLOCKED
9. 验收标准不在详情正文回显（藏右栏"验收契约"卡二级入口），新手以为填写内容丢失
10. 决策提案待批零通知（含发版审批卡静默堆积）

**效率基座（老手）**
11. 键盘流半残：j/k/Enter 代码存在（data-list.tsx:651-653 容器 tabIndex+onKeyDown）但需先手动聚焦列表容器、点击行后焦点即丢、无可见提示；x/space 多选键不存在
12. 批量能力形同虚设：只有派发 AI/删除，无批量改状态/优先级/负责人/迭代
13. 命令面板无实体搜索：18 条命令全是页面导航/动作，registerCommands 预留接口全仓零消费
14. 表格视图：表头点击排序无效、无列宽拖拽、"展示属性"13 chips 全是死开关（tasks-page 传了 displayMenu 但两视图组件都不接收 prop）
15. 全局页导出 CSV/JSON 灰禁用无解释；导入导出对话框存在（task-page.tsx:144）但入口可发现性差（实机员未找到）；项目详情内任务页与全局页能力不一致
16. 筛选不持久化（刷新即丢）、维度仅状态/严重性两个（无优先级/标签/负责人/迭代）；筛选后头部计数不更新
17. 依赖关系 UI 零展示（数据存在，详情/列表均不可见）；列表父子平铺无缩进
18. 工单类型切换器死开关（今晚新功能）：点"缺陷"后零请求零反馈零变化（实机确认）——半成品已上 UI
19. 迭代只读：无创建/编辑入口、卡片不可点、日期已开始状态仍"待启动"

**契约与链路（AI）**
20. 契约与实际鉴权不符：28 端点 openapi 漏声明 security（workflows 全家 9 端点实际有 guard）；81 个 GET 返回裸数组无分页
21. blocked 执行死锁：retry 报"已有活跃执行"、CLI cancel 404 "No CLI binding found"，正确出口在另一个模块
22. 4 家 CLI adapter 治理语义不一致：allowedTools 对 zcode/opencode 静默失效、codex 不报 token 用量（双轨成本失明）、codex/opencode 无审批事件；MCP 工具枚举仍三家（opencode 未同步）；skills 是孤岛（不进派发链，派发 prompt 无技能注入）；上下文组装不含文档/记忆/历史教训且无 token 预算

## 五、P2/P3 摘要（38 项，择要）

- **i18n 大面积缺口**：渲染层硬编码中文约 520 处；集成页整页英文；task-page 头部硬编码 "Tasks Workspace"/"Batch Create"；帮助中心全英文占位且宣传不存在的 Slack 集成、已删除的 Ctrl+N 快捷键（与自家"help 不说谎"注释矛盾）；详情页露出未翻译 key `subscribe.title`；术语同屏矛盾（issue-type-switcher 同一下拉里"工单类型"/"任务类型"——今晚新改动引入）；内部实现文案泄露（"主体渲染器待类型落地（占位框架）"、"fieldSchema 整体替换"）
- **Web 端 onboarding 零引导**（OnboardingGate 仅桌面生效，Web 注册直达空仪表盘+30 菜单）；boot 初始化页 5/8 项"当前环境无需执行"并暴露开发模式 API 地址
- **dock 透明层吞首次点击**（AI 头像/账号菜单第一次点击被 hidden 容器拦截）
- **window.prompt 建子任务**（与全站 Dialog 割裂）；行"固定"刷新即失
- **执行记录页**：标题裸调试串 `runDetails.status.approved`、执行全部"0 步"；办公室显示"工作中" vs 执行记录"已阻塞"互相矛盾；"本周 0 tokens"与有执行记录矛盾
- **发版门禁空范围红绿渲染不一致**（验收/CHANGELOG 绿 vs CI/完整性红，同为"范围为空跳过"）；legacy `POST releases/:id/publish` 公开绕过门禁与审批
- **API 杂项**：acceptance 控制器从 Query 取 userId 可冒名（`acceptance.controller.ts:71,233,342,361,377`）；供应商槽位全局唯一（无法双网关）；assign-agent 字段名与创建 DTO 不一致（agentId vs aiAgentId）；执行状态词汇不统一（dispatched/planned/pending_approval/blocked）；枚举校验报错列空枚举；未知路由返回 Express HTML 非 JSON；openapi 分页参数缺失（/issues/all 实际支持但契约没有）
- **性能**：全局任务页 pageSize=1000 全量拉+无虚拟化（架构封顶 500 条实测可见）；runtime 状态全存 appConfig KV，`findDispatchConfigByExecutionRunId` 每次全表扫
- **共享 default 库数据污染**：38 成员中 20+ 是 E2E 残留用户；他人项目考古决策卡对测试号可见可点（越权操作面）
- **displayName 乱码**（"AI Agent ◆◆◆◆U"）：E6 用 curl GBK 注册注入的脏字节，服务端未校验/未拒绝编码
- **P3 杂项**：仪表盘 7 张统计卡均不可下钻；"团队生产力"5 天全 0 与"AI 活动 144 会话"同页矛盾；AVATAR 协议头 ERR_UNKNOWN_URL_SCHEME；标签设置页 React DOM 嵌套警告刷控制台

## 六、亮点（做对的，保持并复制）

1. **验收门禁逐项失败面板**（gov-21）：0/2 通过时点接收，后端 400 带逐项 `[state]/[artifactPresent]/[criteria][high]` 前缀，前端红面板全列出——全站治理感最强的一屏
2. **发版门禁六项检查清单**（gov-59）：scope/acceptance/ci/contract/audit/CHANGELOG 逐项红绿+时间戳，状态机 CAS 防并发，CHANGELOG 单向再生
3. **决策卡设计语言**：正反面、✓/✕ 语义解释、驳回原因 chips、`decision.gate.glossary`"人话→专业对照+可关闭"——这套"渐进解释"模式应复制到"种生/考古/AI 表面"
4. **保存视图流程完整**（expert-211~216）：筛选→另存→命名→刷新持久→一键恢复，唯一对齐 Linear 的功能
5. **创建任务对话框**：AI 智能生成验收要点+连续创建+Ctrl+Enter+脏表单守卫——AI 原生理念最好的落点
6. **供应商 validate 反馈**（E6 全仓最佳）：201 + valid:false + 3 次尝试与底层错误结构化返回
7. **统一响应信封**：1845 个错误响应声明 `{status,success,error:{code,message},requestId}`；PAT 全端点覆盖与 JWT 同构
8. **执行可观测性**：12 种标准时间线事件、失败机械归类四类+人话 hint（零 token）、AI 可 PAT 自查失败原因——同类系统少见
9. **空态组件体系**（EmptyState/AsyncState 三分场景）与多数页面的引导性空态文案
10. **危险操作保护样本**：项目删除引导到设置而非直接删、强制关闭工单三行后果说明、Token 吊销影响说明

## 七、三类用户旅程结论

**新手小白**：底子好（表单克制、空态用心、注册一气呵成），但三个硬伤让 9 成新手活不过第一晚——退出即锁死（P0-1）、进来全是别人的数据（P0-3）、想学的帮助中心是英文占位。概念负担超标：20 个菜单、6 个 AI 入口、"种生/考古/AI 表面"自造词无解释。

**老手工程师**：单点功能有模有样（建单/筛选/保存视图/子任务），但 Linear 式效率闭环（键盘流/批量/全局检索）三条腿全断，且多处"数据说谎"（筛选后计数不变、500 伪装空态、迭代状态与日期矛盾）直接击穿可信度。43 条列表本地 1.3s 不卡，但架构全量拉取封顶 500 条。

**AI agent**：可观测性和 PAT 全覆盖是同类少见的设计诚意；但执行链路"至少一次投递+无幂等"、4 道串联前置门只有第一道有文档、验收标准形状错静默吞、错误码非语义化（只能字符串匹配中文 message）——当前契约对 AI 客户端的基本容错模式（重试）不兼容。MCP 生态入口无鉴权是安全级断点。

## 八、修复路线图

### 第一批：Quick Wins（1-2 天，多为一行~几行级）
1. 登录回退 email：`validateUser` 改 `OR [{username},{email}]`（P0-1 根修）
2. document-links 前端路径去掉 `documents/` 前缀（两处，救活 4 个页面关联区）
3. `/issues/export` 路由：`@Get('export')` 移到 `@Get(':id')` 之前
4. 批量派发：循环派发或明确拒绝多选+toast 写明生效条数
5. 错误态与空态分离：tasks-page/task-page 加 isError 分支+重试按钮（复用 AsyncState）
6. 409 文案改"该邮箱已注册，请直接登录"；测试连接前端超时调 60s+透传后端 message
7. 决策卡：前端 PROPOSAL_KINDS 补 contract_conflict + 后端 apply() 加 case 调 resolveConflict（两个文件，打通裁决闭环）
8. 详情页移除自动 accept-completion 探测；文档删除死按钮三处先摘除或补实现
9. acceptanceCriteria 非法形状时 400 告警而非静默过滤
10. 类型切换器接 PATCH 或先摘入口（半成品不上 UI）

### 第二批：结构性修复（1-2 周）
1. 工作区安全：JWT 守卫后加"用户∈工作区"校验+未注册 id 返回 404 不回落（P0-7）
2. MCP 鉴权：token 接 AccessTokenService+操作归因 userId+claim_task 实体校验+opencode 枚举同步（P0-6）
3. 通知管道：subscriber 订阅 decision.proposal.created 按 kind 定向+删三个死订阅（P0-12）
4. 搜索后端最小实现（dashboard.service 活查询已有数据源）或前端明确降级隐藏（P0-4）
5. 幂等：创建/派发链 Idempotency-Key+runtime 领取置 leased+结果上报幂等（P0-14）
6. trust 量纲归一（0-100）+验收结果回灌评估（P0-10）
7. 导入事务化+DTO 校验+逐行结果报告 `{imported,failed,errors[]}`+CSV 引号/公式注入防护（P0-8）
8. 批量改状态/优先级/负责人；命令面板接实体搜索（registerCommands 消费 /issues?q=）
9. 表格排序/列显隐接线或下线死开关；筛选持久化到 URL
10. analytics 质量/团队 Tab：接真数据（成本 Tab 已是真）或先下架（P0-13）

### 第三批：产品级（迭代）
1. 新用户隔离：注册创建独立工作区（或至少只读演示数据）+Web 端轻量首启引导（复用 intake hero 叙事）
2. 帮助中心按真实功能重写（中文、砍掉 Slack/Ctrl+N 等不存在项）
3. i18n 清账：520 处硬编码中文入 i18n；术语统一（"任务"为用户词、"工单"仅配置场景；"执行"统一）；黑话加 glossary（复制 decision.gate.glossary 模式）
4. 4 家 adapter 能力位统一（allowedTools/usage/审批上报为接口能力位，daemon 上报真实能力）
5. runtime 状态从 appConfig KV 升级一等模型（兼修全表扫性能）+错误码枚举总账
6. skills 接入派发链；上下文组装加文档/记忆/历史教训+token 预算
7. 键盘流补全：列表容器自动聚焦+行点击后焦点回归+x/space 选择键+焦点行可见样式
8. 依赖关系 UI（详情依赖区块+列表阻塞标记）；迭代状态机与日期联动
9. 信任等级接门禁（协助者以上才可自动派发等），兑现三级授权
10. 多供应商并存（provider 唯一性放开或支持同类型多槽位）

## 九、覆盖缺口与未验证项（诚实声明）

- **桌面 Electron 壳**未实测（本轮范围=Web+API）；桌面壳实机冒烟仍是历史余留
- **runtime daemon 真实执行链**（spawn CLI 真跑任务）未实机验证——只验证到 dispatch/blocked 层；R9 opencode 会话头/权限放行两处隐患标"疑似待实跑"
- **多工作区多库**实际部署形态未验证（本机 standalone 单库），P0-7 基于代码层确认
- **契约种生对真实仓库的写入**未执行（避免污染工作树），种生链路只验证到空态引导
- **邮件 SMTP 实发**未测（Outbox 落库模式已确认）
- **Playwright e2e 套件**未跑（本轮定位体验测试，质检归夜航 quality:gate）；全仓 type-check 已过（6/6 包）
- **性能压测**未做（500+ 条、并发场景为架构层推断）
- j/k 键盘导航实机未触发成功：代码存在（data-list.tsx:651 容器 tabIndex+onKeyDown），判"半残/可发现性差"而非不存在，真实用户先点列表空白处聚焦后可能可用，建议实机人工复核
- 数据对账：maintenance-exp 工单数与造数基线 ±2 差异，已归因 E3 门禁测试对 MOX-657 的状态操作（有截图与网络记录佐证），非数据异常
- 测试注入的脏数据：agent-exp 的 displayName 乱码（curl GBK 所致）留存于 default 库，如需清理可按 userId `cmu8ms7wo00e9fycwjmteqwuw` 处理

## 十、P0 修复状态（同夜更新，分支 fix/experience-p0-fixes）

> 基线快照 2f5ce39 收编在途改动后，12 笔修复提交（372397b…1efb31c）。收口验证：全仓 type-check 6/6 包、contract:check 零漂移、server 受影响 25 套件 281 用例全绿、frontend 受影响 20 套件 116 用例全绿、终验冒烟 7/7（email 登录/错密码 401/搜索命中/未注册工作区 404/冲突裁决可读 400/导出可达/通知端点）。

| P0 | 状态 | 提交 | 说明 |
|---|---|---|---|
| P0-1 登录死锁 | ✅ 已修 | 372397b | validateUser 加 email 回退（username 优先），碰撞安全性已论证；实机三通道冒烟通过 |
| P0-2 决策收件箱不可批阅 | ✅ 已修 | f86c0ef | contract_conflict 后端 apply case + resolveConflict 接入 + 前端词表/卡面/路由；resolution 坏 payload 可读 400；10 kind 对齐表全绿 |
| P0-3 新用户共享工作区 | ⏸ 需裁决 | — | 注册不建 workspace 是数据架构问题；修复方案需产品拍板（注册自动建个人工作区 vs 演示模式）；安全组已给「用户∈工作区」校验的数据模型方案（主库 workspace_membership 表） |
| P0-4 全局搜索死链 | ✅ 已修 | 972ca71 | search 模块实装（三类查询+项目成员可见性口径），前端错误态/无结果分离 |
| P0-5 批量派发只生效第一条 | ✅ 已修 | 5bec403 | 真批量（逐条 allSettled+汇总 toast），跨项目混选显式拒绝 |
| P0-6 MCP 无鉴权 | ✅ 已修 | 074d507 | PAT 鉴权+SHA-256 会话校验+6 变更工具审计+claim/dispatch 实体归因；顺带修好 SSE 消息通道两处存量断裂（此前根本不可用） |
| P0-7 工作区串库 | ✅ 止血已修 | b645326 | 未注册 id 404 不再回落 default；「用户∈工作区」需新数据模型（见 P0-3 方案），待切片 |
| P0-8 导出 404+导入三无 | ✅ 已修 | 5bec403 | export 路由顺序；导入逐行校验+$transaction 整批回滚+errors[] 逐行报告 |
| P0-9 验收标准静默丢弃 | ✅ 已修 | 5bec403 + b385e9c | issue 创建路径与 acceptance AI 建议路径均改显式 400（第 N 项缺 content） |
| P0-10 trust 量纲反向 | ✅ 已修 | 4f5e883 | dispatch 侧统一 0-100 显式常量；成功执行综合分 ≈30→62（>基线 50），方向归正 |
| P0-11 文档删除死按钮 | ✅ 已修 | 2489a18 | 三处统一 useConfirm+软删流程；顺带修 section-links 解包 bug 与预览编辑器死按钮 |
| P0-12 通知管道不通 | ✅ 已修 | a3e1d43 | 订阅 decision.proposal.created（项目成员定向、排除提案人），删三个死订阅；实机端到端落库验证 |
| P0-13 analytics 假数据 | ✅ 已修 | 195db34 | 质量/团队 Tab 仅 msw 演示模式可见+演示徽章+中文化；生产恒隐藏 |
| P0-14 全端点无幂等键 | ⏸ 需专门切片 | — | 跨契约+runtime 协议（Idempotency-Key+领取置 leased），不能一夜安全落地 |

### 修复带入的已知余留（下批跟进）
1. CLI `apm mcp config` 生成的 runtime-token MCP URL 将 401（P0-6 修复的有意行为变化），需改生成 PAT 引导；接入文档需同步。
2. 登录 401 文案建议改「用户名或密码错误」（`auth.login.invalidCredentials` 键未注入，前端映射逻辑未改）。
3. MCP 工具级授权粒度粗（PAT 通过即全工具开放），建议按 scopes 收紧高危工具。
4. acceptance 后端删除/写操作无项目成员级权限校验（模块既有口径，单独立卡）。
5. 存量被打坏的 trust 档案数据（历史成功执行被压到 ~30 分）不会自动恢复，需后续成功执行回涨或人工修档。
6. 决策收件箱一张坏数据示例卡（cmtlsojy2000vfym4r7wlwp45，AI 误用 kind 产生）建议驳回清理；ai-hub propose_decision 工具仍不校验 payload 形状。
7. 验收 accept/reject 回灌信任评估、runtime 派发幂等（P0-14）、用户∈工作区校验——三个功能增强切片待排期。

## 十一、CI 修复批（合并前清偿，PR #72 三轮 CI）

P0 修复批首推 CI 5 job 红，定位后全部清偿（合并前 9/9 绿，PR 已合入 develop @ a72a18c）。**核心发现：本地 node_modules 为 vitest 4.x 残留目录，vitest5 收口（ee12230）以来的 frontend 类型「全绿」全部是假绿**——quality-gate 仅 PR 触发，develop 直推不经 CI，故从未暴露：

| 失败 job | 根因 | 修法 | 提交 |
|---|---|---|---|
| typecheck（339 错） | vitest 5 把 Assertion 移入内部 chunk，'vitest' 顶层成 re-export 别名，jest-dom@6.10 对 'vitest' 的模块增强静默失效 | pnpm patch vitest@5.0.0：在真实声明模块追加 jest-dom matchers extends（升级 vitest 需重生成 patch） | e15c54a |
| test-backend | daemon-ops spec 非 win32 分支 process.kill(process.pid) 把 vitest worker 自己杀了（Windows 走 taskkill 分支假绿） | spec spy process.kill + 平台感知断言 | 1a9b774 |
| e2e-backend | error-paths「非 owner 期望 401」建立在从未实现的守卫假设上（P0-7 落地语义为 404 WORKSPACE_NOT_FOUND） | 用例对齐 P0-7（404+code 断言，隔离性更强） | 1a9b774 |
| test-frontend（5 用例） | jest-dom 官方 vitest 入口从包自身位置解析出**第二份 vitest 实例**（pnpm 隐藏提升），双 expect 互踩 chai 原型损坏 rejects 断言 | setup.ts 改手动 expect.extend(matchers)（类型由 patch 提供） | 23405ba |
| test-workspace | CI 不构建 @apm/shared，cli worker.test 加载期崩（dist 不在 git） | cli 补 pretest 构建 shared | 23405ba |
| test-frontend（余留 1） | design-system 整页渲染用例本地 ~27s，CI runner 越过 30s 阈值 | 用例级 timeout 180s | eccfc67 |

附带归因修正：execution 缺参裸 500（error-paths 日志噪音，用例实际过）顺手在 service 入口补了前置 400 校验；`@Body() dto: any` 使 ValidationPipe 形同虚设的问题记为余留（补 DTO 联动契约，另立卡）。

## 十二、方法与工具记录

- 实机浏览器：Playwright 1.62 无头 Chromium 1280×800（browser-use 插件在子代理环境不可用，已按 skill 规则降级）
- API 测试：Node 脚本 + UTF-8（`.tmp-apm-exp/api.mjs`；Git Bash 下 node 需 `node.exe` 避开 winpty alias；curl GBK 会写坏中文——建议后续统一 Node）
- 造数据：51 工单/2 项目/2 迭代/2 文档/1 PAT，全程 0 限流命中（间隔 350-400ms）
- 代码审查均为只读；未修改任何仓库文件、未执行任何 git 写操作

## 十三、P1 修复状态（分支 fix/experience-p1-fixes，18 笔提交）

> 基线 origin/develop（含 P0 批 a72a18c）。按 `docs/roadmap/p1-fix-plan-2026-09-20.md` 四批执行，子代理并行、i18n 与契约由主线程统一收口。收口验证：全仓 test 5 包全绿（server 949 / frontend 1022 / cli 9 用例）、双端+shared/cli type-check 零错、contract:check 零漂移、check:cli-contract 过。**裁决 D1/D2/D3/D4 未批，4 项对应工作按计划未开工**。

### §四 22 项 P1 逐项状态

| # | 状态 | 提交 | 说明 |
|---|---|---|---|
| P1-1 伪空态 | ✅ 已修 | 8d7897e | 全局/项目任务页 useQuery 补 isError 分支（AsyncState+重试），严格区分真空态 |
| P1-2 挂载自发 accept | ✅ 复核销项 | 8d7897e | 当前代码不存在该调用（仅按钮触发、组件无 useEffect），疑旧构建观察；补回归测试锁定挂载零请求 |
| P1-3 注册 409 误导 | ✅ 已修 | 5bfb5c7 | 后端 EMAIL_ALREADY_REGISTERED 语义码 + 前端定向文案；真根因是前端读旧信封路径恒 undefined（api-client 已转顶层 ApiClientError），一并修正 |
| P1-4 email 登录伪 401 | ✅ 已修 | 5bfb5c7 | 根因 guard 先于 pipe（passport-local Missing credentials 401）；login 移除 LocalAuthGuard 改显式校验，字段错误 400/凭证错误 401+INVALID_CREDENTIALS，未动全局管道 |
| P1-5 /app/dashboard 白屏 | ✅ 已修 | 2eb9a90 | redirect 至 /app/projects/dashboard；全仓 /app/* 扫描无其他坏路径 |
| P1-6 测试连接吞错 | ✅ 已修 | 3320865 | 60s 超时 + api-client TIMEOUT 独立分类 + 后端结构化 message 完整透传，超时/断网走 i18n |
| P1-7 无契约关单零拦截 | ⏸ 待裁决 D1 | — | 拦截口径（硬拦/项目级配置/警告）需拍板 |
| P1-8 failed 契约绕过关单 | ✅ ①②已修 | 6e28f5f | 口径统一 notIn ['passed','waived']（与 TASK_DONE_BLOCKED 同构，堵决议前重开路径）；apply 拒绝 422 ACCEPTANCE_FAILED_BLOCKING；③存量追溯待 D2 |
| P1-9 验收标准不回显 | ✅ 已修 | cedf84a | 详情正文只读回显（同右栏数据源零新请求），编辑留右栏 |
| P1-10 提案零通知 | ✅ 复核+已修 | 4e38d4a | 复核实锤缺口在发布侧：发版审批卡等 5 处直写绕过统一入口不发事件，全部补发同形态事件；订阅/受众侧无断点 |
| P1-11 键盘流半残 | ✅ 已修 | 233aba7 | 复核：半残属实但「j/k 失效」归因有偏，真因焦点到不了容器；修复焦点管理+x/space 选择+焦点守卫（不全局劫持），顺带修 checkbox Space 双触发 |
| P1-12 批量能力缺失 | ✅ 已修 | 73abeeb | 批量改状态/优先级/负责人（逐条 allSettled+汇总 toast，P0-5 范式） |
| P1-13 面板无实体搜索 | ✅ 已修 | 944f98c | 接 /search（task/bug/project）防抖 300ms+AbortSignal 竞态防护，命中置顶可跳转 |
| P1-14 表格死开关 | ✅ 已修 | 73abeeb | 排序+13 chips 接线（11 真开关，3 个无数据 chips 移除）；列宽拖拽未做（DataTable 无列宽基建） |
| P1-15 导出灰禁用 | ✅ 已修 | 73abeeb | 偏离：/issues/export 为项目级端点（projectId 必填），全局页改前端从筛选结果生成文件并双注明范围；导入复用 ImportModal |
| P1-16 筛选不持久化 | ✅ 已修 | 73abeeb | URL 同步（视图>URL>默认）+优先级/负责人/迭代/标签四维+计数如实标注「当前显示 N」 |
| P1-17 依赖零展示 | ✅ 已修 | 233aba7 | 详情双向依赖区块+drawer 字段错位顺带修（Blocked By 此前恒只显示 ID）+表格子任务缩进折叠（排序回声防子行甩出） |
| P1-18 类型切换器死开关 | ✅ 已修 | f0d5195 | 根因纠偏：DTO typeId 已存在，真因 base-ui Menu.Item 无 onSelect（类型检查不报）；改 onClick+乐观更新回滚；assistant-model-picker 同病根 3 处顺手修 |
| P1-19 迭代只读 | ✅ 已修 | bdcf6cb | 创建/编辑/详情对话框+日期状态推导（cancelled 手动覆盖）；后端零改动（三端点已在契约） |
| P1-20 契约不符 | ✅ 已修 | b49a67e | 实扫漏 security 9 个（非 28，516 端点全对账）+7 个实读分页参数端点补声明；66 个纯全量小表不加假声明 |
| P1-21 blocked 死锁 | ✅ 已修 | 50b0999 | 错误指路（活跃执行 ID+两条取消途径）+cancel 按 executionId 降级+retry 放开 superseded（否则指路本身是死路） |
| P1-22a adapter 治理语义 | ✅ 已修 | b1cce52 | 四家能力位如实声明（codex usage 失明实锤）+双落点显式告警+opencode 补 MCP 枚举；能力位不进协议 |
| P1-22b skills 孤岛 | ⏸ 按计划剥离 | — | 功能增强（L 起），随第三批产品级立项 |

### §十 A 项状态

| # | 状态 | 提交 | 说明 |
|---|---|---|---|
| A-1 mcp config 401 | ✅ 已修 | b1cce52 | runtime-token 通道改 PAT 引导（无 PAT 输出创建指引并 AUTH 退出），help 同步 |
| A-2 MCP scopes 收紧 | ⏸ 待裁决 D4 | — | 缺省口径（变更类须显式 scope/全开放/只读）需拍板 |
| A-3 trust 坏档修复 | ⏸ 待裁决 D3 | — | 脚本回涨/人工修档/自然回涨需拍板（脚本编写可先行，跑前等确认） |

### 实机冒烟余留（代码级验证已全绿，实机项待补）

计划 §4.2 各批实机冒烟清单中，P1-5（路由重定向）已由路由表结构测试覆盖；其余实机项（断后端见错误态、重复注册定向文案、批量操作、面板搜索、迭代创建等）待 dev server 实机走查后在本节勾销。决策收件箱坏数据卡清理（§5.2 第 8 条）随实机冒烟顺带执行。

### 修复过程新发现的存量问题（登记备后续）

1. DataTable（data-table.tsx）有一份同款键盘光标实现，同样的焦点断裂+无 x/space——表格视图/项目页/bugs 页走它，data-list 的三件套修复可平移。
2. server 进程内执行路径不消费 usage（daemon 路径已有）——双轨成本线的另一半缺口，建议登记 P1/P2。
3. decision.proposal.created 未登记进 domain-events 真相源，字面量散布 5+ 处——建议独立 chore。
4. applyResolution 直写 DB 不走 issue.service 链路（无 activity 留痕/无广播/不标 Linear 同步）——建议后续收敛为复用领域服务。
5. workspace activate 端点 @Public 无任何 guard；@Public+JwtAuthGuard 组合语义可疑两处——建议人工安全确认。
6. §十余留 6 后半：ai-hub propose_decision 工具仍不校验 payload 形状（本次未动）。

## 十四、后续增量：命令面板组件升级（coss ui p-command，分支 fix/experience-p1-fixes 第 19-20 笔）

用户裁决：命令面板弃手搓换 coss ui 成熟组件（`pnpm dlx shadcn add @coss/p-command-2`）。两轮落地：

**第一轮（组件替换）**：`components/ui/command.tsx` 整体重写为 coss `@coss/command` 移植——引擎=base-ui Autocomplete（contains 过滤/分组/键盘导航内置），壳=base-ui Dialog；provider 按官方 p-command-2 配方组合（数据驱动 items+filter、List children 渲染函数）；隐藏消费方 `filter-chips` ValueMenu 一并迁移（`mode:'none'` 自管过滤）；cmdk 依赖退场；`AutocompleteList`/`CommandList` 增 `scrollAreaClassName` 通道。15 旧用例原样过，+4 引擎行为用例。

**第二轮（用户实测五项反馈返工）**：①搜索图标与 placeholder 重叠——autocomplete startAddon 的子选择器是死规则（data-slot 不匹配），改 render Input 直挂 ps-9；②图标 size-4 统一 + page-registry 品牌色（iconColor 与侧边栏同源）+ Ctrl+1..9 快速选择（显示+真实生效）；③列表 max-h-72 滚动 + 命令注册表 23→40 条全页面覆盖（settings 分组 16 条二级页，page-registry 补 4 行）；④AI 模式重设计——Tab/询问 AI/零命中回车进入内嵌轻量问答（`assistantApi.send` 真通道，sync 终文 markdown 渲染 / runtime 异步诚实提示，相关页面=真实 /search 命中 chips，Esc capture 返回搜索），不再跳转系统助手；⑤输入区/页脚 bg-muted/50 与面板 bg-popover 分层、聚焦 ring 禁用。

坑：①base-ui List children 渲染函数是运行时支持的 closed-template API 但类型未收窄（children: ReactNode），单独函数子元素可推断通过，与 CommandEmpty 并列时需 `as unknown as ReactNode` 断言；②jsdom 缺 `Element.prototype.getAnimations`，base-ui ScrollArea viewport 淡入动画在测试中抛 Uncaught Exception，测试内补空实现；③/AutocompleteInput 旧版 startAddon padding 走 `*:data-[slot=autocomplete-input]` 子选择器，实际渲染元素是 Input 本体（data-slot="input"）永不相中。

## 十五、P2 修复状态（2026-09-21 夜航，分支 fix/experience-p2-fixes，12 笔提交）

> 基线 develop @ c4387c9（含 P0 批 + P1 批合并 + v0.7.1/v0.7.2 归版）。计划：`docs/roadmap/p2-fix-plan-2026-09-20.md`（P2-01~28，来源 §五 P2 项 + §八第三批余量 + §十三登记项；P3 不在范围）。六批次子代理并行交付，**28 项全部完成**。收口验证：全仓 test 5 包全绿（frontend 164 文件 1063 用例）、type-check 6/6 包、lint 0 error、contract:check 零漂移、check:cli-contract 过、check-i18n-sync 4486=4486、check:docs-sync 过。

### §五 P2 项逐项状态

| # | 状态 | 提交 | 说明 |
|---|---|---|---|
| P2-01 dock 吞首点 | ✅ 已修 | c54d279 | 真因=收起态根节点（盒高=胶囊高）仍参与命中测试的隐形条带；!dockVisible 时整体退出命中测试，浮出判定走坐标不受影响 |
| P2-02 prompt 子任务+行固定 | ✅ 已修 | c54d279 | window.prompt 两处换命令式 prompt-provider（镜像 useConfirm 契约）；pinnedIds 写穿 localStorage（useSyncExternalStore，双视图同步） |
| P2-03 执行记录裸 key+0 步 | ✅ 已修 | 2afc90c | approved/rejected 系 confirmExecution 直写的裁决态，全链映射补齐；「0 步」=daemon 不写 ExecutionStep 恒显 0，改 !!stepsCount 才显示 |
| P2-04 状态矛盾+0 tokens | ✅ 已修 | 2afc90c | office 词表改导入 ACTIVE_EXECUTION_STATUSES（漏 blocked 即根因），blocked→needYou；周 tokens 改 AIUsageLog 真相源（失败执行用量也入账） |
| P2-05 门禁红绿不一 | ✅ 已修 | abf9f26 | 空范围跳过统一灰色中性态（按服务端 detail 归类），真实红绿不变 |
| P2-06 DataTable 键盘 | ✅ 已修 | abf9f26 | P1-11 四要素平移+checkbox [role] 守卫特化；消费方零接线 |
| P2-08 acceptance 冒名 | ✅ 已修 | 485c602 | 实扫 9 处（报告 4 处）全改 @CurrentUser；含绕过所有权改删他人清单两处高危 |
| P2-09 legacy publish | ✅ 已修 | fefc3bd | 核实推翻：`/publish` 端点一直走状态机；真 legacy=publishRelease 方法（draft→released 直写），零产品引用删除；顺手治好 golden-path 两用例 |
| P2-10 未知路由 HTML | ✅ 已修 | fefc3bd | 前缀外请求穿透 Nest 路由栈掉 Express finalhandler；新增 unknown-route.filter 栈尾兜底统一信封+requestId 三级兜底 |
| P2-11 枚举报错空清单 | ✅ 已修 | fefc3bd | 根因=数组传 @IsEnum 被数字键过滤；19 DTO 57 处改 @IsIn，线上同配管道抽查用例锁定 |
| P2-12 assign-agent 字段 | ✅ 已修 | cf2825e* | 三名归一（DTO agentId/创建 aiAgentId/CLI agentBindingId 必 400 死字段实锤）；aiAgentId 规范+agentId deprecated 别名 |
| P2-13 openapi 分页余量 | ✅ 对账零缺口 | cf2825e* | 34 实读分页端点全对齐（P1-20 已覆盖），纯小表按口径不加假声明；反向核对无假声明 |
| P2-14 propose_decision 不校验 | ✅ 已修 | cf2825e* | 五 kind payload 形状校验（对齐 apply 运行时期望），inputSchema 补形状提示前置降误用 |
| P2-15 进程内 usage 缺口 | ✅ 已修 | cf2825e* | 完成链先落 AIUsageLog 再 complete（与 daemon 同构）；claude-code/opencode 镜像单源提取，codex/zcode 无源如实不落 |
| P2-16 workspace @Public | ✅ 已修 | 485c602 | list（泄露工作区名+库路径）/activate 收紧补 JWT；current 保留；全仓 18 处逐处裁定 |
| P2-17 任务页全量拉 | ✅ 已修 | 8c91fef | 真分页 50/页+URL 同步+超界钳制；批量翻页清空选中、导出如实标注当前页范围 |
| P2-18 runtime KV 全表扫 | ✅ 已修 | 8c91fef | dispatch key 本身含 executionRunId 只是查找方没用——3 热路径改 (key,scope) 精确命中复合索引，零迁移 |
| P2-19 displayName 乱码 | ✅ 已修 | 4810933* | 共享 util 拒控制段/U+FFFD/零宽（emoji 代理对不误伤），4 DTO 接入 |
| P2-20 残留用户清理 | ✅ 脚本就绪待 R1 | 4810933* | dry-run 默认+写方法保险丝+引用链对账（AUTO/MANUAL/PROTECTED 三档）；真实库自证 30 候选=21/5/4，**未执行** |
| P2-21 信任等级接门禁 | ✅ 已修 | 26f62c5* | runDispatch 唯一咽喉三路接线；仅拦明确观察者级+fail-open 兼容存量+TRUST_LEVEL_INSUFFICIENT 指路；开关缺省开 |
| P2-22 多供应商并存 | ✅ 已修 | 26f62c5* | AIProviderConfig 类型唯一→(provider,displayName) 组合唯一；代表槽位语义锁定；CLI 执行域牵动协议另立项 |
| P2-23 skills 孤岛+上下文 | ✅ 已修 | 26f62c5* | 技能注入派发 prompt（开关缺省开）；增强做在真实链路 buildTaskExecutionContext（buildContextPack 已 deprecated 零调用方）：文档+记忆+失败教训三来源+token 预算 truncated 如实标注 |
| P2-24/25 i18n 清账 | ✅ 已修 | d30ca74* | 约 224 条迁 i18n、309 对新键双语同步；subscribe.title 实为整组 6 处误挂 assistant.subscribe.*；「主体渲染器」开发串改用户语言；集成目录未接入项补「即将支持」徽章 |
| P2-26 帮助中心 | ✅ 已修 | d30ca74* | 22 篇按真实功能重写（对齐 router/page-registry/快捷键注册表实况）；Slack/Ctrl+N/Account&Billing 不存在项清除 |
| P2-27 Web onboarding | ✅ 已修 | d30ca74* | OnboardingGate 去「仅桌面」限制；注册建工作区属 P0-3 裁决未动；**Web 存量用户升级后会弹一次向导（发布说明需提及）** |
| P2-28 boot 页 | ✅ 已修 | d30ca74* | 跳过项按原因诚实化（desktop-only/no-token）；API 地址仅 import.meta.env.DEV 显示 |
| 附：术语矛盾 | ✅ 销项 | — | 已随 P1-18 消除（switcher 下拉同屏一致） |

\* 为分组提交哈希前缀，完整哈希见 git log。

### 裁决项（不替用户决定）

| # | 裁决点 | 现状 |
|---|---|---|
| R1 | E2E 残留用户/乱码 displayName 数据清理是否执行 | 脚本+候选清单（30=21 自动/5 人工/4 保护）+备份回滚方案就绪，跑 `node scripts/cleanup-e2e-users.mjs --execute` 前等确认 |
| R2 | P0-3 注册自动建个人工作区 vs 演示模式（上游遗留） | onboarding UI 引导已做，隔离半边未动 |
| R3 | 考古决策卡跨项目可见性口径 | 属 P0-3/P0-7 数据模型切片，登记未动 |

### 修复带入与相邻余留（登记备后续）

1. **可根除项**：GateCheck.passed 二值无法表达 skipped（前端按 detail 文案归类属约定耦合），后端加 `status: pass|fail|skipped` 可根除；server 侧 CLI adapter 与 shared 单源结构性漂移（镜像漏 usage 已补，建议直接复用 @apm/shared 消灭手工镜像）。
2. **安全余留**：runtime `register` 端点无守卫（守护进程引导入口，是否加引导密钥属裁决）；JwtAuthGuard 开发模式注入 mock admin（仅 NODE_ENV=development）；acceptance 写权限成员级校验（§十余留 4 继续挂）。
3. **行为语义待裁决**：issue.service confirmExecution 直写 approved/rejected 不在状态机（任何后续流转被拒，建议走裁决）；受托者 vs 协助者的「自行重试」差异未接；红线动作（发布/删除/花钱/权限）门禁仍是展示口径。
4. **性能余量**：bugs-page 仍 pageSize=100 全量拉；acceptance-form-dialog 等大 pageSize 场景；分页后前端筛选/排序作用域收窄为当前页（后端 filters 仅 3 维，全量筛选语义需后端补 filters 键）；cancelExecution 无 runtimeId 仍走全量兜底（冷路径）。
5. **i18n 长尾**：范围外模块（github/linear/project dashboard 等）疑有硬编码；issue 域英文硬编码（表头 ID/Title 等 12 处）未在本期范围；settings 页「任务类型/工单类型」混用（10:5，配置场景基线收口建议）；CLI 执行域 provider 类型唯一未放开。
6. **死代码清理候选**：ReleaseService.approve、common/pipes/validation.pipe.ts、cli-dispatch-panel.tsx、builtin-providers.tsx、deprecated context.service.ts（含 cachedDocuments 隐患）；main.ts 限流兜底信封不一致。
7. **脚本环境**：本机多个子代理 shell 的 node shim 报 stdin is not a tty（node.exe 直呼可绕），与仓库无关；check-i18n-sync 等脚本主线程环境正常。

### 实机冒烟余留

代码级验证全绿，以下待 dev server 实机走查：dock 首点、行固定刷新、prompt 建子任务、执行记录页三态、发版门禁跳过态、DataTable 键盘流、任务页分页+筛选联动、帮助中心全文、新注册 Web 用户 onboarding 弹出、boot 页 DEV 判定、多槽位 provider 创建（前端暂无创建表单，走 API）。
