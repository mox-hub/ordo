---
title: 剪枝计划 2026-09（调研稿，待确认）
description: 全仓冗余代码/功能/资源清查与裁剪计划——三级分类（P0 安全剪 / P1 合并改造 / P2 需求裁决）+ package 治理 + 红线
id: ROADMAP-PRUNE-001
category: roadmap
status: draft
created: '2026-09-22'
modified: '2026-09-22'
scope: 全仓剪枝专项
ai-priority: high
---

# 剪枝计划 2026-09（调研稿，待用户确认后执行）

## 〇、数据来源与方法

- **四路只读清查代理**：前端 / 服务端 / CLI+desktop+apm-shared / package 依赖审计，全部「双证据法」（import 路径零命中 + 导出符号零命中）。
- **knip 全仓扫描**（`knip-report.json` 已留根目录备查）：112 个未用文件、796 个未用导出/类型、5 个未用依赖、13 组重复导出；人工复核剔除误报（如 `conventional-recommended-bump` 走动态字符串 import、`dependency-cruiser` 被 `check:boundaries` 脚本使用、部分 DTO knip 误报实有引用）。
- **端点对账**：server 68 controller / 516 路由与 openapi.json 404 path 完全一致（无契约漂移）；但 66 条 path 前端零消费（其中 14 条全仓零消费）。
- **knip 配置自身有盲区**（P1 修复）：frontend entry 指向 `src/main.tsx` 而真实入口是 `src/app/main.tsx`；workspaces 未含 `apps/cli`、`apps/desktop`。

**总体判断**：该仓库手写通用功能克制（全仓仅 6 处手写工具函数，多数轻而稳），冗余主体是**迁移遗留死代码、死 barrel、零引用资源、声明未用的依赖**，不是重复造轮子。服务端跨模块重复极少，真正的结构性冗余在 CLI adapter 双实现与前端 execution/executions 双模块。

---

## 一、P0 安全剪（零引用死代码，机械删除）

> 删除标准：import 路径 + 导出符号双零命中，或 knip + 人工复核双确认。逐条执行时先复跑一次 grep 再删。

### 1.1 前端死页面/死模块（8 处）

| 路径（apps/frontend/src/…） | 说明 |
|---|---|
| `modules/task-template/` 整目录（4 文件） | 路由未注册、全仓零引用，唯一整目录死模块 |
| `modules/ai-hub/pages/ai-management-page.tsx` | 2026-08-19 迁入 settings 后遗留（活体是 settings 的 ai-management-section）；ai-hub 的 api/hooks 仍活，勿删整模块 |
| `modules/git/pages/git-settings-page.tsx` | git 设置活体在 settings 的 git-section |
| `modules/project/pages/project-detail-page.tsx` | 被 project-detail-frame 架构取代的旧壳页 |
| `modules/github/pages/github-integration-page.tsx` | 迁移遗留（活体 settings/github-integration-section） |
| `modules/linear/pages/linear-integration-detail-page.tsx` | 同上 |
| `modules/runtime/api/runtime-api.ts` | 双 API 客户端中的死副本（活体 `shared/runtime/runtime-api.ts`，4 处引用） |
| `modules/runtime/hooks/use-runtime.ts` | useRuntime 零命中（runtime 模块仅 use-terminal-status 仍活） |

### 1.2 前端零引用组件（18 个，A2 清单）

`ai-hub/components/cli-dispatch-panel.tsx`；`ai-surface/components/{cognitive-canvas, project-vitality-canvas, squad-capsule-orbit, trust-orbital-lens}.tsx`（盯盘面旧可视化，被 radial-watch-deck 体系取代）；`document/components/{document-form, document-tree, import-export-dialog, section-task-links}.tsx`（活体是 section-task-links-list）；`issue/components/{context-preview-dialog, task-detail-tabs}.tsx`；`notification/components/notification-button.tsx`；`project/components/{ai-insights-widget, project-health-widget, project-module-manager, sprint-dialog}.tsx`；`project/components/dashboard/health-score-card.tsx`；`integration/components/{integration-card, integration-config-form}.tsx`；`integration/constants/builtin-providers.tsx`。

### 1.3 前端死 barrel / 死 hook / 死类型（P0 与 knip 并集，执行时逐个双验证）

- 死 barrel：`shared/components/index.ts`、`shared/hooks/index.ts`、`shared/decision-card/index.ts`、`shared/member/index.ts`、`shared/tabs/index.ts`、`shared/mdx/components/index.ts`、`modules/{boot,delivery,git,github,help,intake,integration,linear,notification,release,team-member}/index.ts`、`modules/ai-hub/hooks/index.ts`、`modules/linear/hooks/index.ts`、`modules/issue/components/index.ts`、`modules/document/enhance.ts`、`shared/command-palette/use-command-palette.ts`（2 行死垫片，符号活）。
- 死 hook/类型：`shared/hooks/use-route-context.ts`、`shared/layout/sidebar-adapter.ts`（导航项第三份死副本）、`shared/types/{socket-events, view-types}.ts`、`hooks/use-mobile.ts`、`document/hooks/use-folders.ts`、`ai-hub/hooks/use-ai-models.ts`、`core-config/api/metadata-api.ts`、`notification/hooks/use-notification-preferences.ts`（语义确认后删）。
- 死组件（shared）：`shared/components/{expandable-search, floating-actions}.tsx`（删时改 assistant-fab.tsx:2 注释）、`shared/ui/filter-toolbar.tsx`。
- knip 独有发现（代理未双验证，执行时先复核）：`issue/components/task-card.tsx`、`notification/components/notification-center.tsx`、`document/components/section-reference.tsx`、`shared/mdx/components/{mdx-callout, mdx-task-list}.tsx`。

### 1.4 前端 components/ui（删后同步 `COMPONENTS.md` 注册表，有治理脚本双向对账）

零引用业务向 5 个：`attention-rail.tsx`、`bug-report-dialog.tsx`、`notification-popover.tsx`、`page-loader.tsx`、`task-form-dialog.tsx`。
随依赖删除 2 个：`carousel.tsx`（embla）、`resizable.tsx`（react-resizable-panels）。
shadcn 预留件 `direction.tsx`、`navigation-menu.tsx`、`sidebar.tsx` → P2 按治理流程裁决。

### 1.5 前端静态资源

- `public/vite.svg`（Vite 脚手架残留）、`src/assets/react.svg`（可整删 assets 目录）。
- `public/avatars/` 12 个 svg（bot-01~06 / human-01~06，约 11.5KB）全仓零引用。
- 保留：`public/logo.svg`（favicon）、`public/mockServiceWorker.js`（MSW 运行时）。

### 1.6 前端「仅测试拖着的死代码」（删组件连带删测试）

- `modules/issue/pages/task-page.tsx` + `task-page.test.tsx`（活页是 tasks-page）。
- `shared/components/create-dialog/entity-templates/` 下 `bug-template-helper.tsx`、`doc-category-chips.tsx`、`project-source-tabs.tsx` + 对应测试段（unified-create-dialog 不用）。
- `modules/git/hooks/__test-utils__.tsx`（连测试都不引用）。

### 1.7 服务端

- **context 整模块**（`modules/context/`）：头部自述 deprecated、功能并入 AI Hub ContextBuilder；删时同步 `app.module.ts` 的 import/imports 数组。
- `plugins/runtime/plugin-loader.service.ts` + `plugins/sandbox/sandbox.service.ts`：未接线的空壳（多 TODO，零引用零注册）。
- `ai-hub/adapters/openai-adapter.ts`：被 ai-sdk-adapter 取代的旧实现。
- `core/message-bus/message-bus.types.ts`、`document/dto/section.dto.ts`、`document/entities/document-version.entity.ts`。
- `test/octokit.stub.ts`、`check-users.cjs`（一次性调试脚本）。
- `relative/path/workspace.json`——**已被 git 跟踪**，是测试误提交产物，`git rm`。
- 死 barrel：`core/index.ts`、`core/crypto/index.ts`、`core/tracing/index.ts`、`modules/{cli-dispatch,cli-provider,mcp-server,role}/index.ts`、`cli-dispatch/adapters/index.ts`、`integration/providers/{github,linear}/index.ts`。

### 1.8 apm-shared / desktop / cli

- `apm-shared/src/config/store.ts` `setProfileValue`、`src/errors.ts` `ExitCodeValue`。
- `apm-shared/src/runtime/protocol.ts`：`WS_RECONNECT_BASE_MS/MAX_MS`、`DEFAULT_DISPATCH_LIMIT`、`ExecutionContextPayload`（连同 RUNTIME_ENDPOINTS.executionContext——daemon 从未调用）。
- `desktop/electron/src/tray.ts` `destroyTray`、`commands.ts` `DesktopCommand`、`state.ts` `BackendStatus/FrontendStatus`。
- desktop 17 个源文件无死文件（preload 以路径字符串加载，knip 报告勿信该域）。

### 1.9 一次性脚本/根目录残留

- `scripts/migrate-to-d.ps1`（E→D 迁移 2026-09-19 已完成）、`scripts/check_icon_tools.py`（环境自检，无引用）。
- `scripts/backups/cleanup-e2e-users/`（执行时看内容定去留）。
- 根目录：`create-test-doc.ps1`、`test-create.json`、`tmp-apm-import.py`、`tmp-apm-release-backfill.py`、`temp_server.log`、`knip-report.err`（本次调研临时件）。

### 1.10 依赖删除（5 个）

| 包 | 工作区 | 证据 |
|---|---|---|
| `conventional-commits-parser` | server | 零 import（版本推断实际走 conventional-recommended-bump） |
| `passport-local` + `@types/passport-local` | server | 只有 JWT 策略，包名仅存注释 |
| `zod` | frontend | 零 import；且版本 ^4.1.11 与后端 ^4.5.4 漂移 |
| `embla-carousel-react` | frontend | 唯一引用 ui/carousel.tsx 本身零消费 |
| `react-resizable-panels` | frontend | 同上 |

### 1.11 本地垃圾清理（不入库，gitignored）

`apps/server/data/wf-spec-*.db`（约 60 组，workflow 测试残留）、`shadow-clean.db`/`shadow-diff.db`、`dev.db.bak-*`、`server*.log`、`coverage/`；`apps/desktop/{dist-release, dist-release-2, dist-release-3, release}`（三份构建产物，1.4G 大头）；`apps/frontend/package-lock.json`（npm 锁混入 pnpm 仓，疑 shadcn 垫片产物——确认垫片不需要后删）。仓库外：E: 旧副本待用户整删（已知）。

---

## 二、P1 合并与结构调整（需小改代码，逐项独立提交）

1. **execution vs executions 双模块合并**：同域两套 API 客户端并存且互相 import，合并为单一模块（保留在役路由那套），迁移 `use-active-executions-map` 反向依赖。
2. **导航双实现统一**：`shell-layout.tsx:873-889` 内嵌 tabs 数组 与 `project-detail-nav.tsx` 同一组 7 页签两份实现 → 抽单一页签配置数据源。
3. **apm-shared 导出面瘦身**（不删实现只收导出）：`parseBackendError`、`BackendErrorBody`、`ProfileConfig/RuntimeConfig/DaemonConfig`、`ApmClientOptions`、`EnvelopeUnwrap`、`RefItem`、`Artifact`、`ArtifactType`、`TEST_REPORT_ARTIFACT_TYPE`、`ApprovalHint`、`StreamEmitter`、`CliExecutionInput`、`DetectResult`、`CommandBuildResult`、`ParseResult`、`CliUsage`、`extractCliUsage`、`CLI_ADAPTER_CAPABILITIES` 等 18 项改模块私有。
4. **domain-events 旁路修复**：`notification-button.tsx:17` 本地重定义 `NotificationCreatedPayload` → 改从 shared 单源导入（零消费 payload 类型本身保留——它们是事件契约）。
5. **generated 双副本收敛**：`contract:generate` 停掉 apm-shared 第二输出（现零消费且 `contract-check.mjs` 只护栏 frontend 份，shared 份只会烂掉）。待拍板：apm-shared 是否对外发布（monorepo 内无外部消费者则删）。
6. **常量回归单源**：`apps/cli/src/runtime/lifecycle.ts:120-121` 硬编码 1000/60000 → 引用 shared WS_RECONNECT 常量。
7. **`apm run` 命令修复或下线**：POST `/ai/tasks/{id}/dispatch-cli` 已 404（openapi 只有 `/ai/issues/{issueId}/dispatch-cli`）；`--provider` 帮助漏 opencode。
8. **双 CLI adapter 漂移治理（结构修复，工作量大，可单独排期）**：server 侧 `modules/cli-dispatch/adapters/*`（回退执行用）与 apm-shared adapters 已漂移 291 行、capabilities/常量两份手抄无护栏 → server 改为消费 apm-shared 版本，或至少让 `check:cli-contract` 护住两份一致性。**建议本次只做「护栏」不做「合并」**。
9. **radix 残留样式修复**：`team-member/components/member-picker.tsx:119` `w-[--radix-popover-trigger-width]` 在 base-ui 下失效（宽度 bug），改 base-ui 等价方案。
10. **markdown 三栈收敛**：`editor-fidelity-spike.spec.ts` 复用 `shared/mdx/mdx-pipeline` 的 unified 链，删 `unified`/`remark-parse`/`remark-stringify` 三个 devDeps（react-markdown 与 mdx-pipeline 职责不同，保留双栈）。
11. **浏览器端 gray-matter 换轻量**：`mdx-frontmatter.ts` 换 `front-matter` 或 ~50 行白名单子集解析 → 连带删 `buffer` 依赖与 `polyfills.ts` 的 Buffer polyfill。
12. **buildLineDiff 换 jsdiff**：`version-diff-view.tsx:25-58` 手写 O(m·n) LCS 行 diff，千行级文档会卡——四端唯一有可预见规模瓶颈的手写实现，换社区标准 `diff` 包。
13. **内建替换微操**：3 处 `JSON.parse(JSON.stringify())` → `structuredClone`（assistant-tools/auth/contract-binding）；server `fs-extra` → `node:fs/promises`（2 文件，用完删依赖）；`prisma` 移 devDependencies；`p-retry` v4 → v7。
14. **knip 配置补强**：frontend entry 改 `src/app/main.tsx`；workspaces 补 `apps/cli`、`apps/desktop`；`ignoreDependencies` 移除已删的 embla/react-resizable-panels。P0 完成后 `knip` 应接近零报。

---

## 三、P2 标记观察 / 需求裁决（本次不动代码，出清单交裁决）

### 3.1 66 条前端零消费端点——requirement-intake 已登记（候补区 pending，2026-09-23）

**冲突检测结论（对照能力清单-v1）**：零消费 ≠ 可下线，分组裁决建议——

| 组 | 端点 | 归属卡 | 建议 |
|---|---|---|---|
| 外部回调 | `integrations/github/webhook` | CAP-B-08（webhook 分发已扩 check_run） | **保留**（面向 GitHub 回调，前端零消费正常） |
| 插件开放 | plugins 全部 9 条 | CAP-A-11（trust+插件沙箱+MCP，doing） | 保留但标记：前端无入口为「能力在役、控制面缺 UI」，或裁决插件域降级置 gap |
| 身份扩展 | `auth/sessions*`、`oauth2/authorize\|callback\|logout`、`subject-claim` | 身份卡（JWT/OAuth2/PAT 三态是卡面价值） | **保留**（OAuth2 属卡承诺能力，面向团队部署双入口） |
| 决策卡 | `decisions/proposals/generate/assignment`、`watch/spend` | decision 卡（doing） | 待裁决：规划未接线 vs 预留废弃 |
| 文档 MDX 工具 | `documents/mdx/parse\|validate\|export-html`、`references/stats\|{id}` | document 卡（价值含 MDX） | 待裁决：前端已本地编译（shared/mdx 管线），服务端工具疑被架空 |
| 验收治理 | `acceptance/criteria/batch`、`audit-report`、`audit-gate`、`checklists/apply` 等 | 验收闭环（V4 核心） | 待裁决：多为批操作/审计面，可能是 API-first 设计留待消费 |
| 双健康检查 | `/health/health` vs `/health` | 无卡 | 可合并（历史重复），随 P1 顺手裁决 |
| 杂项零散 | `projects/restore\|docs-storage`、`issues/by-short-id`、`memory/recall\|brief`、`collaboration/*`、`admin/mail/status`、`runtime/control/*`、`mentions/source/*` 等 | 各归属域 | 逐条裁决 |

> 裁决前**一律不动**。全部下线须同步 openapi.json 收缩 + 契约三件套再生 + `requirement-intake` 终裁留痕。

### 3.2 其余标记观察项

0. **knip 配置纠偏后新暴露（2026-09-23，执行期增量）**：`issue/components/{batch-create-tasks-dialog, task-board, task-detail-drawer}.tsx`、`issue/hooks/use-task-filter-options.tsx`、desktop scripts 三件（cdp-invoke/gen-icon/smoke-ipc，疑似应保留的开发工具）——疑似被看板/详情页改版取代的旧件，执行期未删，入 backlog 逐个双验证。
1. `TerminalSession`/`CommandExecution` deprecated Prisma 模型删除（需配 migration，运行库持锁，走零重启迁移法）。
3. `prisma/backfill-task-assignees.ts`（确认各环境已执行后删）、`prisma/seed-agents.ts`（手工 dev seed，定去留）。
4. `src/lib/design-tokens.ts`：代码零引用但 AGENTS.md 三处引用为语义色规范——文档改口后方可删。
5. shadcn 预留件 `direction/navigation-menu/sidebar`、双头像包（avvvatars + react-nice-avatar，**有意双表面设计，建议保留**）、`@lobehub/icons` 浅使用（在意包体可换 static-svg 子包）、member-card 同名双实现是否合并、provider 白名单不含 opencode（HTTP 派发拒收，daemon 可用）——均需产品/架构裁决。

---

## 四、红线（绝不触碰）

- `openapi.json`、两份 `api-types.gen.ts` 生成物（`contract:export` 管理，禁手工改）。
- `docs/` 治理对象：`check-doc-sync`、`PRINCIPLES/`、`stability-reports/`、`api-audit/`；`mdx-frontmatter` 边界块闸门。
- 已核实活体：`shared/command-palette`、`shared/route-preview`、`gateways/events.gateway.ts`、envelope 族、runtime 协议镜像主体、`workflow-builtin.ts` 导出、DEV-only 路由与重定向路由、`public/mockServiceWorker.js`。
- server 镜像架构（server 不依赖 apm-shared）与 `check:cli-contract` 现有护栏语义。
- 当前工作树并行会话的未提交改动（acceptance/release/desktop-auth 面）——剪枝不与之混提交。

## 五、执行方式与验证门

- **分支策略（待拍板）**：推荐等当前 `feat/desktop-auth-compact-window` 收口、工作树干净后，从 `develop` 开 `chore/pruning-2026-09` 执行；若要立即执行则用 `worktree-init` 开隔离 worktree（接受一次冷启动成本）。
- **批次顺序**：P0（分 5 个提交：前端死码 / ui+资源+依赖 / 服务端 / shared+desktop / 脚本残留+本地垃圾）→ P1（每项独立提交）→ P2（只产出裁决清单）。
- **每提交验证**：type-check（前端必须 `tsc -b`）+ lint + 受影响测试（定向规则）；P0 收口跑一次全仓 `pnpm test` + `contract:check` + `check:boundaries` + knip 复跑对比（未用文件应从 112 → 个位数误报级）。
- 预估规模：P0 约 90+ 文件删除 + 5 依赖 + 若干本地垃圾；P1 约 14 项小改造；P2 纯清单。

## 六、待拍板点

1. P0 清单是否照单全删（尤其 shadcn 预留件之外的 ui 组件、public/avatars、一次性脚本）？
2. `contract:generate` 是否停掉 apm-shared 第二输出（确认 apm-shared 不对外发布）？
3. 双 CLI adapter（P1-8）本次只加护栏还是彻底合并？
4. 66 条零消费端点是否启动 requirement-intake 契约收缩裁决？
5. 执行分支：等收口 vs worktree 隔离？
