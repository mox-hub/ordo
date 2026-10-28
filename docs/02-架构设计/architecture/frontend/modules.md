---
description: 前端模块结构（V4）—— 43 个业务模块真实工程结构 + shared 共享层 + infrastructure + 组件根 + 路由
category: architecture
status:
  - active
tags:
  - architecture
  - frontend
  - modules
version: 4.3.1
created: "2026-05-29 05:54:09"
modified: "2026-10-28 00:00:00"
projects: "[[APM-项目中心]]"
title: 前端模块结构
id: ARCH-FRONTEND-MODULES-001
scope: 前端模块架构
ai-session-types: all
ai-priority: high
ai-freshness: realtime
ai-audiences: "session:all"
---

# 前端模块结构

> 本文档描述 React 前端的真实工程结构：模块清单与结构模式、shared 共享层、infrastructure、组件根与路由。
> 基于对 `apps/frontend/src/` 的完整核对。
> 对齐 [[技术架构总览|技术架构总览]]（§4.2）、[[系统页面清单]]、[[产品需求文档-v3|PRD V3]]。
>
> **最后核对：2026-10-27。** 术语基线：后端数据模型已物理改名并落地目录（`Task` 族 → `Issue` 族、`ExecutionRun` → `Execution`），API 面为 `/issues` + `issueId`；下文「对应后端模块」一律用新口径（`issue`、`issue-type`、`issue-template`、`execution`），**前端不再存在 `task`、`terminal`、`plugins` 模块**。
>
> **v4.2.0（2026-10-11）**：工程体检对账（台账 GOV-02）——模块目录口径 39 → **42**：删除不存在的 `task-template`；补录实测存在的 `ai-surface`、`release`、`tour`、`workflow`；`contract` 由「治理与验收」移入新增的「契约知识」域（与 `release` 同域）；shared 子目录口径 23 → **28**，组件根文件口径 103 → **81**（递归计数）。
>
> **v4.3.0（2026-10-27）**：模块目录口径 42 → **43**——新增 `artifact`（产物管理，CAP-A-32：产物列表/详情页 + 标准组件五件落 shared/components/artifact/ + semantic 件 file-type-icon/artifact-source-badge），进路由树、域表与模块详述。
>
> **v4.3.1（2026-10-28）**：补录 `test-mode`（实机测试模式，CAP-A-31：壳内抓现场建单）——2026-10-25 增量此前只记在 `AGENTS.md`，本模块文档漏记；由 `check:doc-coverage` 的「模块目录 → 架构文档」覆盖检查发现。

## 一、技术栈

| 类别 | 技术（当前依赖） |
|------|------|
| 框架 | React 19.2 + TypeScript |
| 构建 | Vite 7 + `@tailwindcss/vite`（Tailwind 4）|
| 路由 | react-router-dom 7.13（`createBrowserRouter` + `lazy`）|
| 样式 | Tailwind 4 + shadcn 生成组件 + **`@base-ui/react`**（主线，无 radix）|
| **状态管理** | **Zustand 5.0（唯一全局状态库；无 jotai）** |
| 异步数据 | TanStack Query 5.90 + TanStack Table 8.21 |
| 表单 | React Hook Form 7.65 + Zod 4.1 |
| HTTP | axios 1.13（契约类型 `generated/api-types.gen.ts`）|
| 实时 | socket.io-client 4.8 |
| 编辑器/渲染 | CodeMirror 6（`@codemirror/*`）+ MDX（`@mdx-js/mdx`）+ react-markdown + remark/rehype 管线 |
| 图表/拖拽/动效 | recharts · @dnd-kit · motion |
| 面板/弹层 | react-resizable-panels · embla-carousel · cmdk · input-otp · react-day-picker |
| 桌面 | Electron 壳桥（`window.__APM_DESKTOP__.invoke`；ADR-014）|
| AI | `ai` + `@ai-sdk/react`（浏览器端 SDK）|
| 国际化 | i18next 26 + react-i18next 17（zh/en）|
| 主题/字体 | 自研 theme-context（无 next-themes）· `@fontsource-variable` inter/jetbrains-mono/noto-sans-sc · lucide-react · @lobehub/icons |
| 组件根 | `components/ui/`（base-ui/shadcn 基础组件，81 个文件）· `components/brand/` · `components/icons/` |

## 二、真实目录结构

```
apps/frontend/src/
├── main.tsx                      # 入口（React 渲染）
├── App.tsx                       # 桌面端启动逻辑（壳桥感知）
├── index.css / polyfills.ts
│
├── app/                          # 应用壳与路由
│   ├── main.tsx                  # 历史入口（index.html 未引用）
│   ├── router.tsx                # 路由定义（createBrowserRouter + lazy，539 行，真相源）
│   └── router.test.tsx
│
├── modules/                      # 43 个业务模块（Feature-based，详见 §四）
│   └── AGENTS.md                 # 模块开发规范
│
├── shared/                       # 跨模块共享层（28 个子目录，详见 §五）
├── infrastructure/               # 基础设施层（详见 §六）
│   ├── api-client/               # 契约客户端 + generated/api-types.gen.ts
│   ├── event-client/             # socket.io WebSocket 客户端
│   ├── hooks/                    # use-event-subscription
│   └── store/                    # Zustand（app-store.ts + test）
│
├── components/                   # 全局组件根（3 个定位明确的目录）
│   ├── ui/                       # base-ui/shadcn 基础组件（81 文件）
│   ├── brand/                    # logo.tsx
│   └── icons/                    # 品牌图标（linear.tsx 等）
│
├── hooks/                        # 全局 Hooks
├── i18n/                         # 国际化（config.ts + locales/）
├── lib/                          # 全局工具
├── assets/                       # 静态资源
├── templates/                    # 模板
├── mocks/ + __mocks__/           # mock / 模块级 mock
├── test/ + test-utils/           # 测试配置与工具
└── __fixtures__/                 # 测试夹具（API mock JSON）
```

> 结构变化要点（相对 v3.4）：
> - **无 `components/kibo-ui`**、无根级散落组件——全局组件已收敛为 `components/{ui,brand,icons}` 三目录；高级视图（kanban/gantt）在 `shared/components/` 下（如 `board-view/`、`gantt-chart.tsx`）。
> - **无 jotai**（Zustand 为唯一全局状态库）；无 next-themes（theme 自研）。
> - 无 `radix`；基础组件根 `components/ui` 基于 **base-ui** 演进（shadcn 生成物）。
> - `task/`、`terminal/`、`plugins/` 模块均已不存在。

## 三、入口与路由

### 3.1 入口链路

`index.html` → `/src/main.tsx`（**唯一 web 入口**）：

| 职责 | 说明 |
|------|------|
| polyfill | Buffer 先导（gray-matter 依赖裸 Buffer）→ `../polyfills` |
| Provider 栈 | ThemeProvider（shared/theme）→ ConfirmProvider → ToastProvider → LoadingProvider → QueryClientProvider → RouterProvider（`app/router`）|
| i18n | `import './i18n'` 初始化（react-i18next）|
| mock | `isMockModeEnabled()` → MockBadge（mock 模式 UI）|
| `src/App.tsx` | 桌面启动视图组件（Electron「AgentPM Desktop」launcher，独立于 web 入口）|
| `src/app/main.tsx` | 历史入口（index.html 未引用，仅保留）|

### 3.2 路由结构（基于 router.tsx，createBrowserRouter + lazy）

```
顶层独立路由（无 ShellLayout）:
  /login · /register · /invite/:token
  /boot → 开机引导         /desktop/init → 桌面端初始化
  /app/workspaces/new → 新建工作区（独立全屏）
  `*` → ErrorPage fallback

/app（AuthGuard + ShellLayout，带侧边栏与标签页）
  ├── index                → dashboard
  ├── projects（index · :projectId 项目首页 · :projectId/board / milestones / team / issues / settings / roles）
  ├── issues · issues/:issueId · bugs · bugs/:bugId    工单域（issue 统一模型）
  ├── intake                                           需求承接（研发生命周期 01 位：CTA 唤起统一创建面板 + 管道说明 + requirement 文档列表，CAP-A-15）
  ├── ai · ai/agents · ai/executions                   执行/Agent 观察（AI Hub 域）
  ├── executions                                       执行中心（run 详情/时间线）
  ├── acceptance · acceptance/:id                      ★ 验收（V3/V4 核心）
  ├── office · decisions                               办公聚合 / 决策收件
  ├── members(:memberId) · teams(:teamId)               组织
  ├── documents（/new /:documentId /:documentId/edit） 文档管理
  ├── artifacts · artifacts/:artifactId                产物管理（CAP-A-32：三源统一视图+预览+版本）
  ├── repositories（:repoId · :repoId/settings）        仓库（git）
  ├── notifications（notification → 复数重定向）
  ├── integrations（· /github · /linear/:integrationId）（plugins/plugin-center → 重定向）
  ├── analytics · admin · delivery · search · help · design-system

/app/settings（独立全屏路由，不嵌入 ShellLayout；分组见 modules/settings/settings-nav.ts）
  ├── profile · appearance                    个人 & 外观
  ├── labels · statuses · issue-types · roles · templates · short-id   元数据治理
  ├── git · terminal · storage · memory · runtime(/:runtimeId)         能力配置
  ├── ai · ai/executions                         AI 管理分区（/ai 合并页五页签：概览(默认)·模型服务·CLI·MCP·技能，2026-09-19 页面合并；agents/usage 已撤销）
  └── tokens · integrations(·/github ·/linear/:integrationId)           接入管理
```

> 各页面对应关系详见 [[系统页面清单]]。路由真相源 = `app/router.tsx`。

## 四、43 个业务模块详述

### 4.1 模块清单（按域分组，与后端 §4.1 / 技术总览 §4.2 对齐）

| 域 | 前端模块 |
|----|---------|
| 身份与访问 | `auth` |
| 用户/团队/角色 | `team-member`、`project-role` |
| 项目与工作区 | `project`、`workspace`、`config`、`core-config` |
| 工单域 | `issue`、`intake`（需求承接站，2026-09-13 增量，CAP-A-15）|
| 文档与知识 | `document`、`artifact`（产物管理，2026-10-27 增量，CAP-A-32）、`activity` |
| AI 执行编排 | `ai-hub`、`assistant`、`execution`、`executions`、`runtime`、`skills`、`prompt`（提示词治理 api/hooks + components[TemplatePickerDialog]，2026-09-26 增量，CAP-A-24）、`workflow`（CAP-A-11 前端管理页基座，2026-09-10）|
| 治理与验收 | `acceptance`、`decision` |
| 契约知识 | `contract`（2026-09-08 新增：契约绑定面板 ContractBindingsPanel，消费 /projects/:id/contract/*；init 页与设置页「契约文件」页签共用）、`release`（发版列表/详情，含 CAP-A-29 表格视图）|
| 协作与办公 | `office`、`ai-surface`、`delivery`、`desktop`、`onboarding` |
| 集成与能力 | `integration`、`github`、`linear`、`mcp-server`、`notification`、`git`、`admin` |
| 系统/辅助 | `analytics`、`boot`、`search`、`settings`、`help`、`design-system`、`tour`、`test-mode`（实机测试模式，2026-10-25 增量，CAP-A-31）|

> 域分组口径与后端 §4.1 对齐（`git` = 仓库能力归「集成」）；前端特有 `assistant`（AI 同事）、`delivery`、`design-system` 按语义归位。

### 4.2 模块内部结构差异（当前实况）

| 结构模式 | 模块 |
|---------|------|
| 标准 api/components/hooks/pages | acceptance、admin、ai-hub、artifact、auth、git、github、issue、linear、notification、office、project、release、team-member、workflow |
| api/components/hooks（无 pages）| activity、assistant、contract、core-config、execution、project-role |
| api/hooks/pages（无 components）| analytics、decision、delivery、onboarding、search |
| api/components/pages（无 hooks）| executions |
| api/pages（无 components/hooks）| workspace |
| api/hooks（纯数据层）| config、mcp-server、runtime、skills |
| api/hooks/components（数据层+选用弹层）| prompt（CAP-A-24 增强批增 TemplatePickerDialog）|
| 纯页面 | help、design-system |
| 页面 + 适配层（无 api）| ai-surface（components/hooks/pages/adapters/replay；`mock-data.ts` 残留 mock 种子，见台账 PROD-04）|
| 单 store | tour（`use-tour-store.ts`）|
| api/components/hooks + lib/store | test-mode（实机测试：元素拾取、截图标注、FAB/面板，`lib/element-picker.ts` + `store/test-mode-store.ts`）|
| 特例（多 lib/services/constants）| boot（多 lib/）、document（多 services/）、integration（多 constants/）|

### 4.3 核心模块职责

#### `issue/` — 工单统一模型（Task/Bug）★

api（issue-api、issue-type-api）+ components + hooks + pages。页面：`bugs-page`、`bug-detail-page`、`task-detail-page` 等（看板/列表/详情）。接收方组件含 `ai-assign-dialog`、`execution-items-panel`（AI 指派/执行项联动）。

#### `acceptance/` — 验收管理 ★V4 核心

api/components/hooks/pages。完整性审计报告、标准分层、证据。

#### `assistant/` — AI 同事面板（主 AI 面）

api（assistant-api）+ components + hooks。AI 助手/同事会话 UI（对应后端 ai-hub assistant*）。

#### `execution/` 与 `executions/`

- `execution/`：执行相关 api/components/hooks（单次执行语义组件）。
- `executions/`：api/components/pages（执行中心——列表/详情/时间线，含 run-details/run-event-list）。

#### `document/` — 文档管理（最复杂前端模块）

api + components + hooks + pages + **services/**（mdx-frontmatter 等，前端唯一 services/ 模块）。文档目录/详情/编辑、MDX 渲染。

#### `artifact/` — 产物管理（2026-10-27 新增，CAP-A-32）

api/components/hooks/pages 标准四件套。产物列表页 `/app/artifacts`（三源筛选+list/table 视图）与详情页（预览器+版本账+溯源 aside）。可复用面落 `shared/components/artifact/`（file-previewer/artifact-preview-dialog/artifact-upload-dialog/artifact-section/artifact-version-list）与 semantic 件 `file-type-icon`/`artifact-source-badge`——工单详情「产物」区块、执行详情产出区块均消费标准件，不直取模块内部。

#### `decision/` — 决策收件箱

api/hooks/pages（`decision-inbox-page`）——DecisionProposal 人工裁决入口。

#### `office/` — 办公聚合

api（office-api、collaboration-api）+ components/hooks/pages（`office-page`）——办公看板聚合。

#### `design-system/` — 设计系统页

仅 pages——token / 组件展示与治理脚本的着陆页（配合 `components/` 与 `shared/theme`）。

#### `test-mode/` — 实机测试模式（CAP-A-31，2026-10-25）

api/components/hooks + `lib/element-picker.ts` + `store/test-mode-store.ts`。壳内浮动球（`test-mode-fab`）呼出面板（`test-mode-panel`），拾取页面元素并截图标注（`screenshot-annotator`），建单走既有 `POST /issues`（bug 专用字段零后端改动直映射）；截图分块经桌面 IPC 落盘，运行时产物不入 git。

## 五、shared 共享层（28 个子目录）

| 子目录 | 职责 |
|--------|------|
| `components/` | 跨模块业务组件：ai-agent-badge、ai-context-summary、board-view/、emoji-picker/、error-boundary、expandable-search、floating-actions、favorite-toggle、gantt-chart、issue-type-icon、language-switcher、markdown-editor/view、page-error-fallback、view-switcher… |
| `ai-slot/` | AI 槽位层（ai-slot-layer）|
| `apm-ref/` | APM 引用芯片（apm-ref-chip）|
| `entity-icons/` | 实体图标 |
| `entity-ref/` | 实体引用建议 + 斜杠引用输入框（slash-ref-textarea）|
| `hotkeys/` | 快捷键定义、存储与全局 Hook（hotkey-store / use-global-hotkey）|
| `prompt/` | 输入对话 Provider（prompt-provider / use-prompt）|
| `hooks/` | 通用 Hook（use-action-with-toast、use-debounced-callback、use-route-context…）|
| `layout/` | 主壳布局（shell-layout/sidebar-adapter）|
| `theme/` | 主题系统（theme-context + presets）|
| `mdx/` | MDX 渲染管线 |
| `ai/` | AI 语义属性（identifiers，data-ai-*）|
| `ai-providers/` | provider-meta（模型/供应商元数据）|
| `runtime/` | runtime 前端镜像（runtime-api、heartbeat-monitor）|
| `subscription/` | 订阅 UI/API（subscribe-button、use-subscription）|
| `route-preview/` | 路由预览卡（preview registry/trigger）|
| `decision-card/` | 决策卡（decision-card/shell/types）|
| `status/` | 状态视觉（status-icon-frame、status-visuals）|
| `viewing-context/` | 浏览上下文 |
| `context-menu/` | 行上下文菜单 |
| `command-palette/` | 命令面板（provider/hook/commands 注册表；UI 基元=ui/command（coss `@coss/command`，base-ui autocomplete 引擎，2026-09-20 替换 cmdk）；实体搜索接 /search 防抖，「问 AI」接真助手动作）|
| `confirm/` | 全局确认对话框 |
| `filters/` | 筛选类型与序列化适配器 |
| `member/` | 成员类型 |
| `tabs/` | Tab 上下文 |
| `pages/` | 通用页（error-page）|
| `lib/` | date-format、logger |
| `types/` | 全局类型 |

## 六、infrastructure 基础设施层

| 文件/目录 | 职责 |
|-----------|------|
| `api-client/contract.ts` + `index.ts` | axios HTTP 客户端（ApiResponse 封装、filter 序列化）|
| `api-client/generated/api-types.gen.ts` | **契约生成类型**（openapi → 双端 gen，`contract:check` 防漂移）|
| `event-client/index.ts` | socket.io 单例客户端（自动重连、事件监听管理）|
| `hooks/use-event-subscription.ts` | `useEventSubscription<T>`（订阅后端事件）|
| `store/app-store.ts` | Zustand（唯一全局状态库）persist store（currentUser/AppState）|

## 七、组件放置规范（当前实况）

```
组件类型                 → 放置位置
──────────────────────────────────
UI 原子组件（无业务语义）  → components/ui/（base-ui/shadcn，81 文件）
品牌/图标                → components/brand/ · components/icons/
跨模块业务组件 / 复杂视图  → shared/components/（board-view、gantt-chart、emoji-picker…）
模块专用组件             → modules/{module}/components/
共享 UI 面板             → shared/ui/
```

> v3.4 提出的「三层放置混乱」（components/ 根级散落 + kibo-ui + shared 重叠）**已解决**：无根级散落、无 kibo-ui，统一落在 components/{ui,brand,icons} 与 shared/components。

## 八、已知问题与不一致点（当前实况）

| 主题 | 现状 |
|------|------|
| task/terminal/plugins 模块 | ✅ 已不存在（`issue` 统一；terminal→runtime；plugins→integrations）|
| 状态管理双库（zustand+jotai）| ✅ 已解决（无 jotai，仅 Zustand 5）|
| 组件三层混乱 | ✅ 已收敛为 §七 规范 |
| notification 单复数 | ⚠️ 目录 `notification`（单数），路由 `/app/notifications`（复数，含单→复重定向）|
| settings 无 hooks/ | 结构偏平（api/components/pages）——允许但留意 |
| document/services 与 boot/lib、integration/constants | 结构特例（见 §4.2），接入 AGENTS.md 规范时留意 |
| `shared/components` 与 `modules/*/components` 边界 | ⚠️ 需按「跨模块业务」vs「模块专用」判定放置；AGENTS.md 有约束 |
| 路由与模块命名 | github/linear 是独立模块但共享 integration 的 provider 语义；集成功能以 `integration` 为收口页 |

## 九、数据流

```
React Components
  → hooks（模块专用 + shared/hooks + infrastructure）
  → api-client（axios REST + generated 类型）/ event-client（socket.io WS）
  → NestJS 控制面 /_api / WebSocket Gateway
```

| 数据类型 | 管理方式 |
|---------|---------|
| 异步查询数据 | TanStack Query（缓存/失效/乐观更新）|
| 全局 UI 状态 | Zustand（app-store.ts）|
| 实时事件 | event-client → useEventSubscription |
| 表单状态 | React Hook Form + Zod |
| 表格状态 | TanStack Table |

## 十、阅读顺序

1. [[产品架构愿景|架构愿景]]
2. [[技术架构总览|技术架构总览]]（§4.2）
3. [[系统页面清单|系统页面清单]]（完整页面与路由）
4. [[产品需求文档-v3|PRD V3]]
5. `apps/frontend/src/app/router.tsx`（路由真相源）
6. `apps/frontend/src/modules/AGENTS.md`（模块开发规范）
7. `apps/frontend/src/infrastructure/api-client/generated/api-types.gen.ts`（契约类型真相源）
