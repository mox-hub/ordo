---
title: "AI 侧边栏改造执行计划（AI SDK v7 复用版）"
description: "**五期目标（2026-09-04，用户两点意见）——✅ 全部完成（同日落地，未提交）**"
category: roadmap
status: reference
version: 1.0.0
created: 2026-10-28
modified: 2026-10-28
---
# AI 侧边栏改造执行计划（AI SDK v7 复用版）

> **五期目标（2026-09-04，用户两点意见）——✅ 全部完成（同日落地，未提交）**
> 1. ✅ **订阅 + 变更提醒（图1）**：新 Prisma 模型 `Subscription`（entityType×entityId×memberId 唯一，member 含人类/智能体）——迁移走手动路径（4300 持锁 migrate dev 挂起→手写 migration.sql + db execute + 补 _prisma_migrations 行，参考既有坑）；新 `modules/subscription`（GET 列表 / GET my / PUT 全量替换订阅者集合，Linear 式）。订阅推送枢纽 `subscription-event.subscriber`：task.updated(statusChanged→task.statusChanged；changedFields∩priority/dueDate→task.fieldChanged)、task.commented（activity.addComment 新发布）、execution.run.updated(completed/failed→execution.terminal，回查 run 拿 task/project) → 按任务+项目双 scope 查订阅者→人类 active 成员→createNotificationFromEvent；**与全域广播去重**：排除负责人（全域层已通知）与操作者，智能体成员无 userId 跳过。前端 `shared/subscription/`：SubscribeButton（收藏旁，size-6 同形态；订阅者头像栈 3 枚+计数，无订阅者时 UserRoundPlus；Popover 搜索框「更改订阅者…」+成员/智能体两组勾选，勾选即 PUT）+ 路由自动推导 scope（tasks/bugs/documents/acceptance/repositories/members/teams/projects 八规则）；PageHeader 内置 + 7 个直嵌 FavoriteToggle 的详情页全部接入。提及链路：mention.service.parseAndCreate 发布 mention.created → 全域订阅者直发被 @ 用户。
> 2. ✅ **通知设置（图2）**：`notification-settings-dialog`（通知中心头部 Settings2 入口，个人级）——收件箱六开关（分配 task.assigned / 状态变更 task.statusChanged / 评论 task.commented / 提及 mention.created / 优先级与截止日期 task.fieldChanged / 智能体活动 execution.terminal）+ 系统通知（system.desktop）；**复用既有 NotificationPreference 表与 GET/PUT 端点落库**（未配置=默认开启，全局行驱动开关，upsert 单行保存）；开关态=服务端派生⊕本地覆盖（无 effect setState，过 react-hooks 红线）。系统横幅：notification.service 推送载荷补 title/body → notification-button 的 notification.created 监听中 document.hidden + Notification.permission granted + system.desktop 未关闭 → 原生 Notification（开关开启时请求权限）。
> - 验证：server type-check✓ 受影响单测 7 套件 40/40（subscription 9 + notification 11 + mention 6 修复 + task/activity）；新 e2e `subscriptions.e2e` 2/2（集合替换/my + 状态变更推订阅者排除操作者、优先级推 fieldChanged）；契约三份零漂移（subscriptions 端点）；template.db 重建含新表；前端 type-check✓ eslint 0 警告✓ vitest 全量 185/185（SubscribeButton 2 + 设置面板 2 + 通知页补 QueryClientProvider）。i18n：subscribe.*（zh/en）。已知非阻塞：assistant-cli-chat e2e 套件级偶发 EPERM（Windows 临时目录 rmSync 文件锁，用例本身 3/3 过，存量基建抖动）。

> **四期目标（2026-09-04 新增，用户四点意见）——✅ 全部完成（同日落地，未提交）**
> 勘察结论（先行）：工具 part 渲染是空壳（assistant-message-list ToolPartLine 只显示一行 toolName，input/output 丢弃、spinner 永转）；propose_decision 工具输出只有 {proposalId,status}；通知系统近乎瘫痪——notification-event-subscriber 6 条订阅只有 task.created 真正工作（task.updated 缺 statusChanged 载荷、task.assigned 无发布方、ci.build.*/ai.workflow.completed 名字不匹配），member/team/acceptance/milestone/iteration/tag 全无通知，task-assignee.service 绕过总线直写 prisma.notification.create，前端通知中心 TYPE_CONFIG 用 snake_case key 对不上后端 dot 格式（全部落 system 兜底）；统一创建面板（components/ui/unified-create-dialog.tsx）Suggestions 卡纯静态无 onClick；项目打分纯规则无 LLM；全仓库无静默 AI 端点（唯一非流式 generateText 只用于 provider 测连）。
>
> - **✅ 批 A｜对话内工具调用成熟渲染（参考 zcode）**：`assistant-tool-card.tsx` 新组件——折叠头=状态图标（spinner/✓/✗）+动词×实体组合标签（assistant.tool.verb.*/entity.*，41 工具全覆盖，未知回退原名）+摘要；结果常显（实体行卡=图标+标题+状态 pill+详情页跳转 task/bug/project/document/member/team/acceptance 路由映射；列表输出=结果数+前 3 条标题；错误=红字常显），展开体=输入参数键值+兜底 JSON；propose_decision 输出扩为全量 proposal 字段（spec 同步）→ 消息流内联 DecisionCard（复用 shared/decision-card + useDecisionActions，effect 失效 decisions 缓存顶部 strip 同步；残缺输出回退普通工具卡）。消息流改造：text 段独立气泡、tool 卡全宽。vitest：assistant-tool-card 5 用例（状态/实体/错误/列表/内联回退）+ message-list 更新。
> - **✅ 批 B｜数据操作通知全覆盖**：修 hub 不散装——subscriber 重写：新增 task.deleted/document.created/document.deleted/project.created/project.archived/member.created/member.removed/team.created/team.archived/acceptance.created/acceptance.resolved/milestone.created/tag.created/tag.deleted 共 14 个 handler + 受众解析器（projectMemberIds/workspaceUserIds，均排除操作者）；task.service update 载荷补 statusChanged/oldStatus/newStatus（修 task.updated 断链）+ delete 发布 task.deleted；task-assignee.service 直写 prisma.notification.create 改 publish task.assigned（走统一偏好过滤+实时推送）；notification.service 模板补 15 类型中文文案。前端通知中心 TYPE_CONFIG 改 dot 格式 key（22 类型）+ typeConfigFor 按事件族兜底。新 spec：notification-event-subscriber 6 用例（订阅清单/断链回归/受众/吞错）。成员变更不通知场景：系统助理 onModuleInit 补齐无 userId 不发。
> - **✅ 批 C｜统一创建面板 AI 对话创建**：CreateType 增 'ai'（第 6 位，Sparkles/紫，快捷键 6）——右侧自然语言 textarea + 说明卡，「让小周创建」→ app-store `openAssistantWithDraft(draft)`（assistantOpenRequest 扩 draft 字段）→ 关面板后浮窗唤起+输入框预填「请帮我创建：…」，用户确认发送，小周走工具创建、批 A 实体卡回显结果；面板渲染期 nonce 消费 draftSeed（AssistantMessageInput 增 seedDraft prop）。
> - **✅ 批 D｜统一后台静默 AI 机制**：新增 `assistant-silent.service.ts`——SCENARIOS 注册表（quick-prompts/create-suggestions/project-score，各自 instructions 构建器+JSON 约定）→ POST /ai/assistant/silent {scenario, projectId?, context?} → adapter.chat generateText（chat 增 instructions 选项对齐 v7 禁 system）→ extractJsonObject（容忍 code fence/杂文）→ {scenario, data}，AIUsageLog 记账（responseMetadata.kind='silent'）；无 provider 可读 400。前端 `use-silent-ai.ts` 三 hooks+解析器：快捷问法 AI 化（aiPrompts 覆盖静态三条，Sparkles 标识，失败/空回落）；创建面板 Suggestions 卡「AI 建议」按钮按需生成 chips（title/name/priority/labels/dueDate 点击回填表单，静态项兜底）；项目 ai-insights-widget 增 AI Analysis 区（规则分之上评分+总结+风险+建议）。spec：assistant-silent 8 用例。
> - **验证（全绿）**：server type-check✓；受影响单测 13 套件 114/114（ai-hub 39 含 propose_decision 输出扩展、notification 6、member/metadata/task-assignee/task/project/iteration）；e2e 子集 4 套件 24/24（assistant/assistant-cli-chat/ai-hub/notifications；首跑一次 assistant-cli-chat 假失败为套件间资源竞争，复跑稳定）；契约 export+generate+check ✓ 零漂移（新增 silent 端点+AssistantSilentDto）；前端 type-check✓ eslint（改动文件 0 警告，dialog 存量 20 条 any 警告非本次引入）✓ vitest 全量 165/165（+17）。pnpm-lock.yaml 随本批 exec 补齐 SDK v7 升级应收口（此前升级未落盘部分），规格与 package.json 一致。
>
> **实测修复（2026-09-04，用户报通知页为空）**：① **根因（存量 bug）**——`createNotificationFromEvent` 偏好 gate 写成 `!preferences.some(p=>p.enabled)`，从未配置过通知偏好的用户查询为空数组、`[].some()` 恒 false → 一律 continue，**所有人都收不到任何通知**（此前 task.created 链路虽通也过不了这道门）；修法=无显式偏好默认开启（in-app），仅存在显式偏好且全关才跳过，偏好查询去掉 `enabled:true` 预过滤以区分「未配置/全关」两态。② gateway `notification.created/read` 仍用 `server.sockets.sockets.get()`（ai.stream 同款崩溃点，当时只修了 ai.stream）→ 实时推送抛错，改 `server.to(socketId)`。③ `task.created` 载荷是 `userId` 而订阅者读 `createdBy` → 创建者排除失效，兜底两者。新增 notification.service.spec 5 用例 + notifications e2e **全链路用例**（建项目+成员→API 建任务→轮询断言 peer 收到/创建者排除；此前 e2e 只种数据测读写端点，生成链路零覆盖正是本次线上断链而全绿的原因；注意 e2e 建任务须带 moduleCode 且项目需先种 ProjectModule）。验证：type-check✓ 通知单测 11/11 e2e（notifications+assistant 3 套件）14/14✓。
> - **记后续（未做）**：iteration.service 已 deprecated（迭代创建走 ProjectService，未接通知）；状态/角色定义等配置类 create/delete 未接通知（高噪音低价值）；通知中心相对时间文案硬编码中文（存量）；proposal 决议后内联卡仍显示动作键（二次点击服务端 400+toast，可做已处理态）；静默场景产物未持久化（刷新即失，仅 AIUsageLog 留痕）。

> **三期目标（2026-09-04 新增，用户四点意见）——✅ 全部完成（同日落地，未提交）**
> 1. ✅ **工具集大扩展**：`assistant-tools.service.ts` 从 6 工具扩到 **38 工具**，覆盖核心域 CRUD——任务/缺陷（create/update/delete + 查询，type=bug 原生支持 severity）、项目（list/create/update/archive）、文档（list/get/create/update/软删）、成员（list/get/create/update/deactivate）、团队（list/create/update/archive）、迭代/里程碑（list/create/update）、标签（list/create）、状态/角色/验收/仓库（读）+ 既有决策提案。**写路径走领域 service**（TaskService/DocumentService/MemberService/TeamService/ProjectService——继承校验/活动/事件），读路径直查库；破坏性操作强制 `confirm:true`（prompt 指引 AI 先向用户确认）；工具异常转可读 error 返回给模型（errText 解 HttpException）。ai-hub.module 增 forwardRef(Project/Document/Team)Module；chat() 传 userId 给 buildTools。
>    未覆盖（记 roadmap 后续）：终端/邮件/集成/信任/工作区管理等边缘域。
> 2. ✅ **会话历史接入通知页**：`notification-center-page.tsx` 增「AI 助理」tab（unread|all|assistant），列全部会话（标题/消息数/相对时间），点击 `openAssistantConversation(id)` → 浮窗打开并定位该会话（app-store `assistantOpenRequest{conversationId,nonce}`，面板渲染期比对 nonce 消费）。
> 3. ✅ **小助理默认成员**：`member.service.ts` `ensureSystemAssistantMember()`（handle=xiaozhou，type=ai_agent，metadata.isSystemAssistant=true）+ onModuleInit 启动补齐既有库；`build-template.ts` 同规则 upsert（template.db 已重建，新工作区开箱即有）；`remove()` 拒删 + `update()` 拒 status≠active（守卫按 isSystemAssistantMember：metadata 标记或 handle）。前端 `Member.metadata?` + `isSystemAssistantMember()` helper；成员详情停用按钮/admin 删除菜单/成员卡片与列表停用四处隐藏并提示「系统内置 AI 助理：可修改信息，不可删除或停用」。
> 4. ✅ **浮窗化**：`assistant-fab.tsx` 右下角圆形按钮（fixed bottom-4 right-4，w-12 Bot/X）；面板常挂载（关闭仅 `hidden`，流式与会话状态不丢）；浮窗默认 380×560（bottom-20 right-4），放大 `min(50vh,calc(100vh-6rem)) × min(50vw,42rem)`≈1/4 屏（Header 加 Maximize2/Minimize2 切换，app-store.assistantExpanded）；shell 第三栏挂载移除改 AssistantFab；Alt+A / 命令面板 / 同事位 / 通知页均可唤起。
>    i18n：assistant.fab.*、notification.assistant.*、members.systemAssistantProtected（zh/en 文本行插入）。
>    验证：server type-check✓ 单测 89/89（tools spec 增 create_task 服务复用/confirm 拒绝/Date 序列化用例）e2e 23/23 契约零漂移✓ template.db 重建✓；前端 type-check✓ eslint（改动文件）✓ vitest 27/27✓（通知页测试补 i18n/app-store/assistant mocks）。
>    浏览器实测（用户执行）：右下角按钮开合/放大；通知页 AI 助理 tab 点会话继续聊；成员列表见「小周」且无删除入口；对话里让小助理「创建一个任务/建个文档」验证 CRUD。
>
> **补充（2026-09-04，验收单 CRUD）**：工具集 38→41。新增 `create_acceptance`（taskId+title+criteria[{criteriaType: functional|technical, content, weight, severity}]，completionType 留空按任务推断，draft 起步）、`update_acceptance`（元数据 + draft/pending/in_review 流转；终态由 service 拒绝并指向 resolve）、`resolve_acceptance`（action: accept/reject/waive，confirm 强制 + reject/waive 必填 reason；accept 走 acceptCompletion 的聚合校验=状态门禁+criteria 判定）。写路径走 AcceptanceService（继承门禁校验），ai-hub.module forwardRef(AcceptanceModule)。验证：type-check✓ ai-hub 单测 39/39 e2e 19/19 契约零漂移✓。

---

# 以下为一期/二期历史记录（已完成）

> 2026-09-03 批准执行。分支 feat/main-ai-assistant。
> 本文件是执行锚点：上下文压缩后按此文件继续，每批完成回写进度（见文末进度表）。

## 需求原始清单（用户五点意见）

1. **接入真实 AI 模型**：侧边栏接入真实模型；能从后台拿到守护进程提供的 CLI 命令行工具就用它作主 AI 模型，真实消息发给它、回复进对话。
2. **历史记录保存与展现**：(a) AI 与系统数据用 JSON 格式存储（已确认：SQLite 内 JSON 结构化，不迁文件）；(b) AI 回复的特定 JSON 数据用设计好的角色卡片渲染。
3. **支持切换模型**。
4. **上下文注入**：(a) 自动感知左侧正在浏览的内容；(b) 提前告知 AI 上下文。
5. **暴露系统接口**：向 AI 暴露系统接口与工具，让它获取信息并以决策卡等形式推送（已确认 v1：工具目录 + PAT 回环 → 修订后 LLM 路径改用 SDK 原生 tools，CLI 路径保留 PAT 目录）。

## 调研结论（2026-09-03）

- **AI SDK 现状**：最新稳定版 **v7**（2026-06 发布；v6 于 2026-05 引入 Agents/MCP/结构化工具输出）。v7 要求 **Node 22+**；React 19 ✓、zod 4 ✓。
- **仓库现状**：server `ai@^4.0.0` + `@ai-sdk/openai|anthropic|google@^1.0.0`，SDK 消费面仅 `apps/server/src/modules/ai-hub/adapters/ai-sdk-adapter.ts` 一个文件（`streamText`/`generateText`/`CoreMessage`/`maxTokens`/`LanguageModel`，v4 API）。前端未用 SDK（React 19.2、zod ^4.1.11 已具备）。
- **CLI 管线事实**：token 以 2s 批量借 `execution.token` 事件的 **`summary` 字段**上报（`apps/cli/src/runtime/worker.ts` flushTokens）；server 侧 `runtime.service.ts submitExecutionEvent`（约 L323-369）写 SystemEvent + publish `runtime.execution.event`；终态 `runtime.execution.result` 的 summary 只是「任务执行完成」——**CLI 回复正文 = token 块累积**，须服务端累积。zcode 适配器是未校准骨架（`packages/apm-shared/src/cli/adapters/zcode.ts`）。
- **消息流事实**：`ai.stream` 网关事件现为 `{conversationId, messageId, chunk, isFinal, userId}`，按 userId 定向（events.gateway 只发 payload.userId 的 sockets）；`CliExecutorService` 旧形状载荷被网关丢弃。
- **决策卡事实**：`DecisionProposal`（kind: plan|assignment|resolution|spend|clarify，payload Json，status pending|accepted|rejected|expired|cancelled）；前端 `shared/decision-card` 五段结构卡片 + `useDecisionActions`（建议类 resolve 打 `POST /decisions/proposals/:sourceId/resolve`）。
- **其他事实**：JWT principal 是 `{id}` 非 userId；多工作区 x-workspace-id + ALS（Prisma 调用须在请求 ALS 上下文内）；契约三份（根 openapi.json + 前端/shared 两个 api-types.gen.ts），DTO 变更后 `pnpm contract:export` + `pnpm contract:generate`。

## 替换映射（原自制 → SDK 现成）

| 原自制方案 | 改用 SDK 方案 |
|---|---|
| 自制 apm-reply-v1 JSON 回复协议 + 解析兜底 | **UIMessage**（parts 数组）作消息本体：`AIMessage.content` 存序列化 UIMessage，`metadata.format='ui-message'` |
| `ai.stream` 自制 `{chunk,isFinal}` 文本载荷 | **UI Message Stream 协议**：载荷改 `{conversationId, messageId, chunk: UIMessageChunk, userId}` |
| use-assistant-session/stream 手写乐观+流式 | **useChat(@ai-sdk/react) + 自定义 SocketChatTransport**（sendMessages/reconnectToStream；hydrate=GET current→setMessages） |
| 回复 JSON cards 段解析出卡 | **tool calling：propose_decision 服务端执行**（落 DecisionProposal）→ tool/data parts 直达 UI，复用 shared/decision-card |
| PAT prompt 工具目录（LLM 路径） | **SDK tools（zod+execute）+ 多步工具循环**，服务端查库执行；PAT 目录仅留给 CLI 路径 |
| 手记 modelName/usage 无落库 | messageMetadata/onFinish 持久化 + **AIUsageLog 写入**（补 roadmap 缺口） |
| CLI 适配器（新增机会） | v7 HarnessAgent（实验性）未来替换 apm-shared 手写适配器——本期不动 daemon 协议，记 roadmap |

## 批次

### 第 0 步｜持久化锚点 ✅（本文件 + memory）
### 批 0｜SDK v7 升级基座（行为不变）
- Preflight：`node -v` ≥ 22（不满足先升 Node 或退 ai@6）。
- server 升 `ai@7` + 三个 @ai-sdk/* 配套大版本；`ai-sdk-adapter.ts` 迁移：`CoreMessage`→`ModelMessage`、`maxTokens`→`maxOutputTokens`、usage 字段改名（`inputTokens/outputTokens`）、新增 `getModel()` 暴露 LanguageModel。
- factory/registry、settings validate/detect 回归；前端加 `ai` + `@ai-sdk/react` 依赖。
- 验收：ai-hub/assistant 相关单测 + e2e 全绿。

### 批 1｜服务端对话重造（请求 1 后端 + 2a）
- `AiHubService.chat`：`streamText` + `toUIMessageStream()`，chunk 逐个 publish `ai.stream`（新载荷带 UIMessageChunk）；`onFinish` 持久化 UIMessage JSON + usage→AIUsageLog；旧纯文本消息读取兼容。
- `AssistantService` 模型路由：send DTO 增 `model?`/`viewing?`；CLI 模型→ExecutionRun（input 带 conversationId/messageId）+ createDispatch + 预建 running 占位 UIMessage；无在线 runtime 400。
- 新 `AssistantRuntimeBridge`（@OnEvent）：`execution.token`→text-delta chunk publish（按 runId 查 ExecutionRun.input 判定 assistant-chat + 缓存映射）；`runtime.execution.result`→累积终文解析 + 可选 ```apm-cards fence→落 DecisionProposal + data-decision-card parts→finish chunk→落库终态（done/failed）。
- `GET /ai/assistant/models`：在线 runtime cliProviders + enabled AIProviderConfig 聚合；模型记忆 `AIConversation.metadata.model`，current 会话返回。
- LLM 路径 POST 仍同步返回终文。契约 export+generate。

### 批 2｜前端 useChat 改造（请求 1 前端 + 2b + 3）
- `SocketChatTransport` + `useAssistantChat` 替换 use-assistant-session/use-assistant-stream；渲染 parts 化：text→MarkdownView、tool-propose_decision/data-decision-card→decision-card + useDecisionActions（resolve 后 invalidate decisions+messages）；running/failed 占位；旧纯文本回退。
- `assistant-model-picker`（CLI 在线徽标默认 + LLM 项）；i18n 键文本行插入；vitest 重写。

### 批 3｜系统工具 + 上下文注入（请求 5 + 4）
- 服务端 `assistant-tools.ts`：zod 工具集 get_task/list_my_tasks/get_project_overview/list_pending_decisions/search_documents/get_project_members + propose_decision；chat 按开关启用工具循环；`GET /ai/assistant/tools` 目录（同一定义生成，注入 CLI prompt 供 PAT 回环）。
- 前端 viewing：app-store slice + `useSetViewingContext` 接线任务/缺陷/文档/仓库/成员详情页；面板 `assistant-context-chip`（可移除）随 send 附带；vitest。

### 批 4｜收尾
- e2e CLI 全链路（仿 cli-dispatch.e2e-spec 假 runtime：接单→报 token/终态→断言 UIMessage 落库+提案生成+占位终态）。
- roadmap 更新（编排器出卡✅、AIUsageLog 写入✅、HarnessAgent/MCP/PAT 下发记后续）；`contract:check`；前端 type-check/lint/vitest + server 相关单套件（不触真实 LLM、不开浏览器）。

## 关键约束

- 不动：CLI 派发管线（注册/判活/ExecutionRun/审批/验收桥）、per-workspace SQLite、会话/决策既有端点、x-workspace-id+ALS、JWT principal `{id}`。
- 工程纪律：pnpm 传参不带 `--`；locale JSON 文本行插入（禁程序化整体重写）；server 全量 jest 内存重（用单套件）；e2e 只走 local-only 路径不触真实 LLM；前端只跑 type-check/lint/vitest（浏览器实测由用户负责）；lint 渲染期红线（ref.current 渲染期读写、effect 内同步 setState 违例）。

## 进度表

| 批次 | 状态 | 备注 |
|---|---|---|
| 第 0 步 | ✅ | 计划与调研落盘 |
| 批 0 | ✅ | ai@7.0.91 + @ai-sdk 4.x；Node v24.20 满足；adapter 迁移 v7 API + getModel()；jest/e2e 配置加 ESM 转译白名单（@ai-sdk/@workflow/ai，pnpm .pnpm 感知）；顺带修复 detect() 不吃 commandPath 覆盖的存量不一致 + cli-dispatch e2e 免依赖本机 claude（commandPath=node 夹具）；type-check✓ 单测 17/17 e2e 20/20 |
| 批 1 | ✅ | chat 通道 toUIMessageStream 化（ai.stream 载荷={conversationId,messageId,chunk:UIMessageChunk,userId}，旧 isFinal 载荷废弃）；assistant 消息 UIMessage JSON 持久化（metadata.format='ui-message'）+ AIUsageLog 写入（补 roadmap 缺口）；send DTO 增 model/viewing；模型路由（cli/cli:provider→对话桥，llm:provider/模型名→getAdapter 增 provider 匹配）；sendViaRuntime 占位消息+ExecutionRun(input 带 conversationId/messageId)+buildCliChatPrompt（transcript 回灌+running 占位剔除）；AssistantRuntimeBridge（token→text-delta、result→终态 UIMessage 落库+finish chunk，start 携带 messageId）；GET /ai/assistant/models；单测 30/30 e2e 20/20 契约零漂移 |
| 批 2 | ✅ | assistant-api 重构（send 载荷对象化+mode/listModels/metadata）；use-assistant-chat.tsx：AssistantStreamTransport（socket ai.stream→UIMessageChunk 喂 useChat，POST 失败→error chunk，finish/error/abort 关流）+ convertAssistantMessage（UIMessage JSON 水合/旧纯文本回退/占位损坏兜底）+ AssistantChatSession（useState 初始化器构建 Chat 实例，key 重挂载切会话，context 提供 helpers）；面板重接线（sessionReady 门槛 + chatKey + 模型选择器入头部 + footer 消费 helpers + 转执行按钮保留）；消息流 parts 渲染（MarkdownView/工具单行/running 工作指示）；i18n 新键（zh/en 文本行插入）；删 use-assistant-stream.ts、瘦身处 use-assistant-session.ts；type-check✓ eslint✓ vitest 20/20 |
| 批 3 | ✅ | AssistantToolsService（6 工具目录常量同源：get_task/list_project_tasks/get_project_overview/list_pending_decisions/search_documents/propose_decision；LLM 路径 zod+execute 服务端代查库，propose_decision 落 DecisionProposal(ai_agent/main-assistant)；CLI 路径 renderCatalogForPrompt 注入 dispatch prompt——PAT 回环）；chat DTO 增 enableTools + streamText 工具循环（stopWhen 5 步）；GET /ai/assistant/tools；server 单测 34/34。前端：app-store 增 viewing slice + shared/viewing-context 的 useSetViewingContext（effect 上报/卸载清除）接线任务/缺陷/文档/仓库/成员 5 详情页；AssistantContextChip（可移除）入 footer，send body 附 viewing；i18n context 键；type-check/eslint/vitest 全绿 |
| 批 4 | ✅ | 新增 assistant-cli-chat.e2e（3 用例：无 runtime 可读 400、models 含在线 CLI 项、全链路=send(cli)→占位→假 runtime 接单断言 prompt 带 transcript/工具目录→token×2+result completed→轮询断言 UIMessage JSON 落库 status done）；契约再导出（tools 端点+enableTools）零漂移；roadmap decision-cards-roadmap.md 增「主 AI 交互面二期」章节与本批遗留（HarnessAgent/MCP/内嵌卡渲染/PAT 注入）；顺手清偿 repo-detail 页存量 unused lint 警告。终态自检：server ai-hub 单测 34/34、相关 e2e 4 套件 23/23（ai-hub/assistant/assistant-cli-chat/cli-dispatch）、前端 type-check✓ eslint 0 警告✓ 全量 vitest 158/158 |

## 执行完成（2026-09-03）

五项意见全部落地，未提交（工作树含多批改动，提交时机与拆分由用户决定）。浏览器实测按约定由用户执行：
1. 面板选模型（CLI 在线默认）→ 发消息 → CLI 流式回流 + 历史刷新后 UIMessage 渲染；
2. LLM 路径：配置 provider 后对话 + propose_decision 出卡进「待你决定」；
3. 打开任务/缺陷/文档/仓库/成员详情 → 面板出现「正在查看」chip → 发消息自动附带、可移除；
4. 历史会话切换后模型记忆跟随会话。

## 实测修复与调优（2026-09-04）

- **v7 system 消息违规**：`chat()` 的系统提示从 messages 头部改走 `streamText({ instructions })`（v7 禁止 messages 内 system）；历史构建过滤 system 角色。
- **网关推流崩溃**：`events.gateway.ts` 的 `server.sockets.sockets.get()` 在当前 socket.io 版本为 undefined，改 `server.to(socketId).emit()`（仍按 userId 定向）。
- **模型菜单崩溃**：`DropdownMenuLabel`（base-ui GroupLabel）必须位于 Group 内，模型选择器包 `DropdownMenuGroup`。
- **多轮工具循环报「流式响应失败」**：工具直接返回 Prisma 行，`Date` 字段不是合法 ToolResultOutput，多步工具循环拼 tool 消息时 zod 校验失败 → error chunk（toast），但文本已落库——表现为「报错但历史有回复」。修复：`assistant-tools.service.ts` 全部工具输出经 `jsonSafe()`（JSON.parse(JSON.stringify())）序列化；新增回归用例。
- **控制台刷屏**：`.env` 的 `LOG_LEVEL=debug` 会把控制台级别拉到 debug，高频事件 debug 行全量打印。修复：console 级别固定 info（与 LOG_LEVEL 解耦，需要时设 `CONSOLE_LOG_LEVEL`）；debug 全量只进 `logs/combined.log`。dev 库日志文件（combined.log 169MB / error.log 30MB）可安全删除重建。
