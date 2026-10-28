---
description: 后端模块结构（V4）—— 43 个业务模块目录真实工程结构 + app.module 注册顺序 + 域分组 + 共享基础设施
category: architecture
status:
  - active
tags:
  - architecture
  - backend
  - modules
version: 4.3.0
created: 2026-03-14
modified: 2026-10-11 00:00:00
projects: "[[APM-项目中心]]"
title: 后端模块结构
id: ARCH-BACKEND-MODULES-001
scope: 后端模块架构
ai-session-types: all
ai-priority: high
ai-freshness: realtime
ai-audiences: "session:all"
---

# 后端模块结构

> 本文档描述 NestJS 后端的真实工程结构：目录布局、模块注册顺序、域分组与各模块顶层构成。
> 基于对 `apps/server/src/` 的完整核对。
> 对齐 [[技术架构总览|技术架构总览]]（§4.1 域分组与本文件一致）、[[产品需求文档-v3|PRD V3]]。
>
> **最后核对：2026-10-27。** 术语基线：fix/core-model-refactor 分支已将数据模型**物理改名并落地到目录**——Prisma `Task` 族 → `Issue` 族、`ExecutionRun` → `Execution`；模块目录同步改为 `modules/issue`、`modules/issue-type`、`modules/issue-template`（**无 `modules/task`**）。外部 API 面为 `/issues` + `issueId`。下文目录名与数据模型名均为新口径。
>
> **v4.1.0（2026-09-08）**：目录口径 36 → **40**——补录 `profile`（项目档案与考古导入）与 `playbook`（剧本），二者为 AI 同事化 v2 纪要切片于 2026-09-08 落地；同时把 09-07 核对时已存在但漏计的 `contract`/`release` 纳入目录树与注册顺序。
>
> **v4.2.0（2026-09-26）**：目录口径 40 → **41**——新增 `prompt`（提示词治理，CAP-A-24：系统提示词内置资产只读 + 注入开关 + 项目/任务级提示词 + 派发完整 prompt 持久化与干跑预览端点）。
>
> **v4.3.0（2026-10-11）**：工程体检对账（台账 GOV-02）——目录口径 41 → **43**：补录 `environment`（本地基础环境检测）、`search`（全局搜索）、`workflow`（CAP-A-11 执行引擎基座）进目录树、域表与 app.module 注册顺序；删除不存在的 `context` 模块（ContextPack 知识层实际在 `document-context.service`，`ContextPackSnapshot` 为 Prisma 模型、归属模块未逐一核实）；Module 类口径统一为 `modules/` 下 49 个 @Module 声明、app.module 直接挂载 45 个（修正原文 38 / 39 / 43 前后不一致的计数）。
>
> **v4.4.0（2026-10-27）**：目录口径 43 → **44**——新增 `artifact`（产物管理，CAP-A-32：统一产物层 Artifact/ArtifactVersion 双表、受管存储+上传+raw 预览+执行产物登记+文档挂接订阅），进目录树、域表与 app.module 注册顺序；Module 类口径 49 → 50、app.module 直接挂载 45 → 46。

## 一、技术栈与启动配置

| 维度 | 技术 / 配置 |
|------|-----------|
| 框架 | NestJS 10（@nestjs/common@10）|
| ORM | Prisma 6（`prisma-client-js`，`PRISMA_CLIENT_ENGINE_TYPE=library`）|
| 数据库 | **SQLite**（`provider = "sqlite"`）+ **工作区多库路由**（见 §五）|
| 全局前缀 | `/_api` |
| API 文档 | Swagger `/_api/docs` + 契约导出 `/_api/openapi.json` |
| 认证方案 | JWT（Bearer）+ PAT（AccessToken）+ RuntimeSession（`x-runtime-session-token`）|
| 安全 | Helmet（CSP/HSTS/COEP/COOP）、CORS 白名单、Throttler 限流、CSRF、GitHub webhook raw body HMAC |
| 工作区路由 | `x-workspace-id` 头 → `workspaceALS`（AsyncLocalStorage）→ 数据层按工作区选库 |
| 国际化 | nestjs-i18n（`i18n/resources/{en,zh-CN}`）|
| 前端托管 | SPA fallback（`FRONTEND_DIST_DIR` 存在时托管静态文件）|
| Model 数量 | **109 个 Prisma model**（`schema.prisma`，无独立 enum 块——枚举多为 model 内联字符串）|

## 二、真实目录结构

```
apps/server/src/
├── main.ts                      # 启动入口（_api 前缀、workspaceALS 中间件、ValidationPipe、
│                                #   Helmet/CORS/Swagger/SPA/GitHub webhook raw body）
├── app.module.ts                # 根模块（7 个 core Module + I18n + 45 个业务 Module 类 + throttlerConfig）
├── app.controller.ts / app.service.ts
│
├── core/                        # 框架级基础设施（8 个子目录）
│   ├── audit/                   # 审计（统一审计入口，按 executionRunId 聚合）
│   ├── config/                  # 配置（ConfigModule：env/schema/校验/脱敏）
│   ├── crypto/                  # AES-256-GCM 加密服务（集成凭据加密）
│   ├── database/                # Prisma 连接 + 工作区多库路由（prisma.service/workspace-registry/…）
│   ├── exceptions/              # 全局异常过滤器 + BusinessException
│   ├── logger/                  # 结构化日志（winston）
│   ├── message-bus/             # 领域事件总线（@nestjs/event-emitter 封装）
│   ├── tracing/                 # 请求追踪（traceId 贯穿日志/审计/事件）
│   └── index.ts
│
├── common/                      # NestJS 请求处理通用（9 个子目录）
│   ├── decorators/              # @Public/@Roles/…
│   ├── dto/                     # Swagger 响应 DTO
│   ├── filters/                 # GlobalExceptionFilter
│   ├── guards/                  # JwtAuthGuard / RateLimitGuard / RolesGuard
│   ├── interceptors/            # logging / transform
│   ├── pipes/                   # 校验管道
│   ├── security/                # CSRF 配置 / Origin 校验
│   ├── throttler/               # throttler.config
│   ├── utils/                   # filter-query 等工具
│   └── index.ts
│
├── gateways/                    # WebSocket（socket.io）
│   └── events.gateway.ts
│
├── i18n/                        # 国际化
│   ├── index.ts / module.ts
│   └── resources/{en,zh-CN}/
│
├── generated/                   # 生成代码
│   └── i18n.generated.ts
│
    └── modules/                     # 44 个业务模块目录（modules/ 下 50 个 Module 类，app.module 直接挂载 46 个）
    ├── acceptance/  activity/  admin/  ai-hub/
    ├── artifact/  auth/  cli-dispatch/  cli-provider/  collaboration/
    ├── config/  contract/  dashboard/  decision/  environment/
    ├── document/  execution/  git/  integration/
    ├── issue/  issue-type/  issue-template/  iteration/
    ├── mail/  mcp-server/  memory/  metadata/
    ├── notification/  office/  playbook/  plugins/  profile/  project/
    ├── prompt/  release/  role/  runtime/  search/  skills/  subscription/
    ├── team/  trust/  user/  workflow/  workspace/
    └── (详细见 §四)
```

> 目录数 = 44；`modules/` 下 @Module 声明共 50 个，app.module 直接挂载 46 个，其余 4 个不挂根——`modules/auth` 内含 `auth.module.ts` 与 `access-token.module.ts` 两个 Module，`modules/document` 内含 `document.module.ts` 与 `document-enhance.module.ts` 两个 Module。

## 三、app.module.ts 模块注册顺序

根模块 imports 顺序如下（**与源码逐项一致**，反映依赖层次）：

```
基础设施层（7 个 core Module + i18n，先于业务）:
  ConfigModule(core/config) → CryptoModule → LoggerModule → TracingModule
  → AuditModule → MessageBusModule → DatabaseModule → I18nConfigModule(i18n/)

业务模块（46 个 Module 类，app.module 直接挂载，按源码 import 顺序）:
  AccessTokenModule(auth) → AuthModule(auth) → ActivityModule
  → MetadataModule → ProjectModule → IssueModule → IssueTypeModule
  → IssueTemplateModule → IterationModule → UserModule → TeamModule
  → MailModule → AdminModule → WorkspaceModule → AiHubModule → WorkflowModule
  → IntegrationModule → NotificationModule → SubscriptionModule → GitModule
  → AppConfigModule(modules/config，源码 `ConfigModule as AppConfigModule` 别名)
  → PluginModule → RuntimeModule → ExecutionModule → TrustModule
  → AcceptanceModule → DocumentEnhanceModule(document)
  → DocumentModule(document) → ArtifactModule(modules/artifact，CAP-A-32) → CliDispatchModule → McpServerModule
  → CliProviderModule → EnvironmentModule → SkillsModule → PromptModule(modules/prompt，CAP-A-24)
  → ProjectRoleModule(modules/role)
  → DecisionModule → DashboardModule → SearchModule → OfficeModule → ContractModule
  → ReleaseModule → MemoryModule → CollaborationModule
  → ProfileModule → PlaybookModule

附加 import:
  throttlerConfig(common/throttler)

全局 Provider:
  APP_FILTER: GlobalExceptionFilter(common)
  APP_INTERCEPTOR: LoggingInterceptor、TransformInterceptor(common)
  APP_GUARD: JwtAuthGuard、RateLimitGuard(common)
  EventsGateway(gateways)
```

## 四、43 个业务模块（按域分组）

分组口径与 [[技术架构总览|技术架构总览]] §4.1 一致。下表"顶层构成"为模块目录内的真实子目录/主要文件。

### 4.1 域分组总表

| 域 | 模块目录（Module 类） | 说明 |
|----|----------------------|------|
| 身份与访问 | `auth`（AuthModule、**AccessTokenModule**）| JWT+OAuth2+PAT（AccessToken 独立 Module）|
| 用户/团队/角色 | `user`、`team`、`role`（ProjectRoleModule）| 用户、Member 体系、ProjectRoleDefinition |
| 项目与工作区 | `project`、`workspace`、`metadata`、`config`（AppConfigModule）| 项目 CRUD+里程碑、多库工作区、标签/状态定义、业务配置 |
| 工单域 | `issue`、`issue-type`、`issue-template`、`iteration` | Issue 统一模型、IssueType 适配引擎、模板、迭代 |
| 文档与知识 | `document`（DocumentModule、**DocumentEnhanceModule**）、`artifact`（ArtifactModule，CAP-A-32）、`activity`、`subscription` | 富文档(section/version/approval/task-link)、ContextPack 策展（document-context.service）、统一产物层（上传/执行产物/文档三源登记+版本+预览）、动态追踪、订阅 |
| AI 执行编排 | `ai-hub`、`execution`、`runtime`、`cli-dispatch`、`cli-provider`、`skills`、`prompt`、`workflow` | Execution 状态机、Runtime 注册、CLI 派发、技能、提示词治理（CAP-A-24）、workflow 执行引擎基座（CAP-A-11）|
| 治理与验收 | `acceptance`、`trust`、`decision` | 验收契约、信任评分、DecisionProposal |
| 协作与记忆 | `collaboration`、`memory`、`office`、`dashboard`、`profile`、`playbook` | 接口协作卡、MemoryAtom、办公聚合、仪表盘、项目档案与考古、剧本 |
| 契约知识 | `contract`、`release` | 契约文件绑定域、发版与 CHANGELOG 再生 |
| 集成与能力 | `integration`、`git`、`mail`、`mcp-server`、`notification`、`plugins`、`admin` | GitHub/Linear/Jira、Git、MailOutbox、MCP Server、通知、插件、运维 |
| 系统/辅助 | `environment`、`search` | 本地基础环境检测（node/git + AI CLI 装机态）、全局搜索 |

> 与 [[技术架构总览|技术架构总览]] §4.1 域表基本一致；v4.1.0 新增「契约知识」域行并把 `profile`/`playbook` 归入协作与记忆域——技术架构总览 §4.1 待同步修订。能力级归类与供血关系见 `docs/01-需求/能力清单-v1.md`。

### 4.2 复杂 / 核心模块顶层构成

#### `acceptance/` — 验收管理 ★V3/V4 核心

扁平结构（规范样板）：

| 文件 | 职责 |
|------|------|
| `acceptance.module.ts` / `acceptance.controller.ts` | 模块 / 控制器 |
| `acceptance.service.ts` | 验收契约 CRUD + 状态机 |
| `acceptance-criteria.service.ts` | 验收标准分层 CRUD（functional/technical）|
| `completeness-audit.service.ts` | 完整性审计（依赖+工程+三级响应+执行前门）|
| `completeness-checklist.service.ts` | 工程完备性清单（系统/团队/技术栈/应用）|
| `dto/` | 请求/响应 DTO |

#### `ai-hub/` — AI 编排（assistant + 执行协调）

| 顶层文件 / 子目录 | 职责 |
|------------------|------|
| `ai-hub.module.ts` / `ai-hub.controller.ts` / `ai-hub.service.ts` | 模块主控（含 spec）|
| `assistant.controller.ts` / `assistant.service.ts` | AI 助手/同事会话（含 spec）|
| `assistant-runtime-bridge.service.ts` | 助手 ↔ runtime 桥接（含 spec）|
| `adapters/` | AI SDK / provider 适配 |
| `services/` | 子服务（worker-coordinator / context-builder / provider-config（模型真实查询 /models 端点 + metadata.modelsEndpoint 覆盖；内置模型 AppConfig ai.defaultModel 存取） / assistant-silent 静默场景注册表：quick-prompts·create-suggestions·project-score·anchor-qa·card-explain·memory-digest 等）|
| `utils/` + `dto/` | 工具与 DTO |

#### `workflow/` — workflow 执行引擎基座（CAP-A-11，2026-09-10 新增）

| 顶层文件 / 子目录 | 职责 |
|------------------|------|
| `workflow.module.ts` | 独立模块（imports AiHubModule 复用 AdapterRegistryService；编排逻辑不进 ai-hub）|
| `workflow.service.ts` | Mastra 实例（LibSQLStore data/mastra-workflows.db）+ triggerRun/resumeRun/run 记账（AIWorkflowRun 双写，engineRunId=run id）+ ai.workflow.update 进度广播；已知边界：resume 依赖进程内句柄，重启后诚实降级 400 |
| `workflow-compiler.service.ts` | definition 文法 v1（llm/http/human-confirm/condition 线性链，累积上下文+模板插值）→ Mastra 可执行链；code/plugin 待沙箱落地 |
| `workflow.definition.ts` | definition JSON 文法真相（parse/插值/深度插值）|
| `workflow-builtin.ts` | 内置 demo project-brief-demo（起草→人工确认→闸门→验收要点）|
| `workflow.controller.ts` + `dto/` | REST 六端点：/workflows、/workflows/:id、/workflows/:id/run、/workflow-runs、/workflow-runs/:id、/workflow-runs/:id/resume |

#### `document/` — 文档管理（体量最大、结构最特殊）

| 层 | 内容 |
|----|------|
| 根 controller | document / document-member / folder / approval |
| `controllers/` | 子控制器（reference/section/storage/tag/task-link/version/mdx-tool 等）|
| 根 service | document / document-member / folder / approval / import-export |
| `services/` | 子服务（docs-git、async-file-sync、document-context、section、version、markdown-parser、mdx-tool 等）|
| `entities/` | ⚠️ 唯一带 `entities/` 的模块（reference/section/task-link/version 等，历史遗留）|
| Module | `document.module.ts` + **`document-enhance.module.ts`**（Enhance 独立 Module）|

#### `artifact/` — 产物管理（统一产物层，CAP-A-32，2026-10-27 新增）

| 文件 | 职责 |
|------|------|
| `artifact.module.ts` + `artifact.controller.ts` | 模块 / 主控制器（列表/详情/版本/raw 预览）|
| `artifact-upload.controller.ts` | multipart 上传（multer，projectId+issueId?+文件 → v1；重传新版本）|
| `artifact.service.ts` | 产物 CRUD + 软删 + 分页筛选（projectId/issueId/kind/executionId/mime/q）|
| `artifact-registry.service.ts` | 三源登记：upload 落版本快照、execution 变更文件 upsert（projectId+logicalPath 合并键幂等）、document.created 事件挂引用行 |
| `artifact-storage.service.ts` | 受管存储（AppConfig `artifact.storage.config`，默认 `~/ordo/artifacts`，`{artifactId}/v{version}/` 布局，sanitize+流式 sha256）|
| `artifact-source.service.ts` | 执行产物源文件读取（worktree→主工作区三级回退+越界防线+text/image 分流+unavailable 诚实降级，批二）|
| `dto/` | 请求/响应 DTO（契约三件套 @ApiOkResponse 全挂）|

> 与 `document` 的关系：文档是产物的一种（kind=document，引用行挂 documentId，预览/版本代理现有文档链路）；与 `ExecutionArtifact` 旧表的关系：旧表保留为执行域 result 摘要记录，产物登记走本模块新表。

#### `runtime/` — 本地运行时（控制面↔执行面桥梁）

| 文件 | 职责 |
|------|------|
| `runtime.module.ts` + `runtime.service.ts` | 模块与主服务（Runtime 注册/心跳/能力）|
| `runtime.controller.ts` | 注册/会话主控制器 |
| `runtime-control.controller.ts` | 执行控制（派发/审批/取消）|
| `runtime-query.controller.ts` | 执行查询 |
| `runtime.gateway.ts` | WebSocket 网关（`/runtime/ws`）|
| `guards/` | runtime-session 守卫 |
| `dto/` | 协议 DTO（与 `packages/apm-shared` 镜像同步）|

> `runtime` 是后端 DTO/控制器最密集的模块。协议 DTO 真相在 `@apm/shared/src/runtime/protocol.ts`，server 端镜像。

#### `execution/` — 执行与审批

| 文件 | 职责 |
|------|------|
| `execution.module.ts` / `execution.controller.ts` / `execution.service.ts` | Execution 八态状态机（原 ExecutionRun）|
| `approval.service.ts` | ApprovalRequest 审批 |
| `dto/` | 执行事件 / 审批 DTO |

#### `team/` — 团队与成员（多 service 聚合）

多 controller + 多 service：member / invite / issue-assignee / mention / team（controller+service）、team-stats、member-card、member-search、member-tool-grant、project-membership-sync、issue-assignee 等。

#### `plugins/` — 插件扩展

controller + service + `runtime/` + `sandbox/`（插件宿主/沙箱，v4 运行时方向）。

#### `mcp-server/` — MCP 服务

mcp-server / mcp-servers 双控制器 + 双 service + `mcp-client.registry.ts` + `mcp-config.generator.ts` + `index.ts`。

### 4.3 其余模块（一行职责）

| 模块目录 | Module 类 | 职责 / 结构要点 |
|---------|-----------|-----------------|
| `auth` | AuthModule / **AccessTokenModule** | JWT+OAuth2+PAT；含 `strategies/`、`guards/`、`oauth2.controller` |
| `user` | UserModule | 用户 CRUD |
| `role` | ProjectRoleModule | ProjectRoleDefinition（executionRole/promptHint）|
| `project` | ProjectModule | 项目 CRUD+状态机+成员+里程碑；含 `controllers/`、`services/` 子目录 |
| `workspace` | WorkspaceModule | 工作区管理（controller+module，面向 `x-workspace-id` 多库）|
| `contract` | ContractModule | 契约文件绑定域（v2 纪要，2026-09-08 落地）：round-trip 区间引擎/三态绑定（managed/synced/detached）与冲突升级 DecisionProposal(kind=contract_conflict)/种生三件套/工作区根解析（Repository.workspacePath→localPath→ProjectWorkspace.localPath 三级回退）；REST 面 `/projects/:id/contract/*`（bindings 只读/seed 幂等种生 fileTypes 可过滤 + **formatOnly 格式化纳管**：已有文件仅并入 apm_ frontmatter 建 synced 指纹观察绑定、不注入托管区间/check 显式对齐/PATCH 三态）；事件节拍 project.created（种生）+ runtime.execution.result（对齐） |
| `release` | ReleaseModule | 发版与 CHANGELOG 单向导出（v2 纪要 1b）：publishRelease 发 release.created → 订阅器再生 Keep a Changelog 风格 CHANGELOG.md（apm:derived-file 头，派生型绑定） |
| `metadata` | MetadataModule | 标签/状态/字段定义等元数据 |
| `config` | AppConfigModule | 业务 AppConfig（源码 import 时别名 `ConfigModule as AppConfigModule`）|
| `issue` | IssueModule | Issue CRUD+状态机+依赖+评论；含 `services/` 子目录（shortId 等）|
| `issue-type` | IssueTypeModule | IssueType 适配引擎（customFields 动态字段）|
| `issue-template` | IssueTemplateModule | 工单模板 |
| `iteration` | IterationModule | 迭代 |
| `activity` | ActivityModule | 动态追踪 |
| `execution` | ExecutionModule | 执行状态机 + ApprovalRequest |
| `environment` | EnvironmentModule | 本地基础环境检测（node/git + AI CLI 装机态，`/_api/environment`）|
| `search` | SearchModule | 全局搜索（`/_api/search`）|
| `workflow` | WorkflowModule | workflow 执行引擎基座（CAP-A-11，REST 六端点，见 §4.2）|
| `trust` | TrustModule | 渐进信任评分（**纯 service，无 controller**）|
| `decision` | DecisionModule | DecisionProposal（proposal + decision 双控制器）|
| `collaboration` | CollaborationModule | 接口协作卡 + 事件订阅 |
| `memory` | MemoryModule | MemoryAtom 记忆 |
| `profile` | ProfileModule | 项目档案与考古导入——档案底座/来源分流/考古 auto-ingest（2026-09-08 落地，AI 同事化 v2 纪要切片 1）|
| `playbook` | PlaybookModule | 剧本——内置注册表/访谈转写/闸门决策卡/项目游标（2026-09-08 落地，AI 同事化 v2 纪要切片）|
| `office` | OfficeModule | 办公聚合 |
| `dashboard` | DashboardModule | 仪表盘聚合 |
| `subscription` | SubscriptionModule | 订阅 + 事件订阅器 |
| `integration` | IntegrationModule | 外部集成（GitHub/Linear/Jira；含 `providers/`）|
| `git` | GitModule | 仓库/分支/diff/受控动作；git-service/command/tool/project-workspace 多 service |
| `mail` | MailModule | MailOutbox 邮件外发 |
| `notification` | NotificationModule | 通知 + 事件订阅器 |
| `admin` | AdminModule | 运维/管理 + register-invite |
| `skills` | SkillsModule | Skill 配置（供 cli-provider/runtime）|
| `cli-provider` | CliProviderModule | CLI Provider 管理 |
| `cli-dispatch` | CliDispatchModule | CLI 派发（dispatch/cli-executor/cli-resolution/cli-provider.registry + adapters/）|

## 五、数据层与工作区多库路由

> v4 关键基础设施变化——从"单 SQLite 库"演进为"**工作区多库路由**"。

- 单 `dev.db` 之外的**工作区化存储**由 `core/database` 承载：
  - 工作区 = 用户指定目录（含 `data/apm.db`、`uploads`、`logs`、`workspace.json`）；`workspaces.json` 注册表统一登记；
  - 请求经 `x-workspace-id` 头 → `workspaceALS`（AsyncLocalStorage）→ 数据层按工作区路由到对应 SQLite 库；`default` 工作区即 `DATABASE_URL`；
  - 新工作区以 `prisma/template.db` 为模板复制初始化（`pnpm build:template-db`）。
- 因此 **SQLite 并非"不适合生产待替换"，而是作为每工作区一个库的既定存储形态**；需关注的是并发写与多工作区一致性（见 §六 风险提示）。

## 六、结构一致性与风险提示（当前实况）

| 主题 | 现状 |
|------|------|
| core/common 重叠 | ✅ 已解决（decorators/guards/interceptors 统一到 `common/`，core 保留 8 框架级子目录）|
| ValidationPipe | ✅ 统一由 `main.ts` 原生 ValidationPipe（whitelist/transform）承担 |
| 模块目录命名 | ✅ 已物理改名（`task/`→`issue` 族），无 `modules/task` |
| 术语一致性 | ✅ API/目录/schema 均已新口径；`app.module.ts` 保留「Terminal 已废弃并入 Runtime」注释 |
| 结构不统一 | ⚠️ 已知：`trust` 纯 service 无 controller；`document` 独有 `entities/` 与双 Module；`plugins` 有 runtime/sandbox 子目录；`team`/`project` 多 controller |
| 生成契约 | openapi `contract:export` → 仓库根 `openapi.json` → `contract:check` 防双端漂移 |
| 生产边界 | ⚠️ SQLite 每工作区一库适合单机/小团队；多用户高并发写、跨工作区聚合需关注（Postgres 迁移仍列演进方向）|

## 七、后端主线对象（数据模型，schema.prisma 109 model）

| 对象 | 所属模块 | 角色 |
|------|---------|------|
| `Issue`（原 Task 族）| issue | 工单统一模型（Task/Bug）|
| `IssueType` / `IssueTemplate` | issue-type / issue-template | 类型适配引擎（customFields）/ 模板 |
| `Acceptance` / `AcceptanceCriteria` / `AcceptanceEvidence` | acceptance | ★ 验收原子单位 |
| `Project` / `Iteration` | project / iteration | 聚合顶层 / 迭代 |
| `Execution`（原 ExecutionRun）/ `ApprovalRequest` | execution | 执行尝试 / 审批治理 |
| `Runtime` / `RuntimeSession` | runtime | 本地执行节点 |
| `ContextPack` / `ContextPackSnapshot` | document / execution | ContextPack 知识层策展（`document-context.service`，无独立模块）；Snapshot 为 Prisma 模型，归属模块未逐一核实 |
| `Member` / `MemberToolGrant` | team | 统一身份（human/platform_ai_member/external_agent）|
| `Repository` / `CliSession` | git / cli-dispatch | 代码 / CLI 会话绑定 |
| `Document` 族 / `MemoryAtom` / `DecisionProposal` | document / memory / decision | 知识 / 记忆 / 决策 |

## 八、阅读顺序

1. [[产品架构愿景|架构愿景]]
2. [[技术架构总览|技术架构总览]]（§4.1 域分组 = 本文 §4.1）
3. [[产品需求文档-v3|PRD V3]]
4. `apps/server/src/app.module.ts`（模块注册与依赖顺序真相源）
5. `apps/server/src/main.ts`（启动配置 / workspaceALS）
6. `apps/server/prisma/schema.prisma`（109 个 model 的数据模型真相源）
7. `packages/apm-shared/src/runtime/protocol.ts`（runtime 协议镜像）
