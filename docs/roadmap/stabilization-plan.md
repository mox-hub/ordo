---
title: "APM 稳定化计划（v0.5.0：从花架子到可用工具）"
description: "生成时间: 2026-08-14"
category: roadmap
status: reference
version: 1.0.0
created: 2026-10-28
modified: 2026-10-28
---
# APM 稳定化计划（v0.5.0：从花架子到可用工具）

> 生成时间: 2026-08-14
> 性质: 稳定化专项（feature freeze 期），与 `tasks-phase1-3.md` 的功能路线并行不冲突
> 巡检工具: `.cursor/skills/stability-check/`（一键巡检，报告输出到 `docs/roadmap/stability-reports/`）

---

## 1. 问题诊断（为什么现在必须稳定化）

当前仓库的可观测事实：

| # | 事实 | 证据 | 后果 |
|---|------|------|------|
| 1 | 测试只覆盖静态/单元层 | 全仓库 55 个测试文件（jest+vitest），E2E 为 0；`quality:gate` = type-check + lint + 单测 + docs-sync | 「点了没反应/数据不刷新/状态对不上」这类集成层 bug 无任何防护网 |
| 2 | 前后端契约靠人肉对齐 | 前端类型手写在 `apps/frontend/src/shared/types/api`；近期连续修复 `align types with actual API shapes` ×3、`dedupe types, drop envelope access` | 契约漂移是当前头号 bug 源，且修完还会再犯 |
| 3 | 功能表面积远超 QA 承载力 | 22 个后端模块 / 24 个前端模块，无黄金路径定义 | 「基本功能都有 bug」的体感无从收敛——没有"什么算基本"的判据 |
| 4 | CI 与本地门禁同构但同弱 | `.github/workflows/quality-gate.yml` 仅 type-check/lint/单测 | PR 绿灯 ≠ 功能可用 |

**结论**：问题不是「bug 多」，而是「没有防回归的机制」。逐个修 bug 修不完，必须先立机制再烧 bug。

### 1.1 首次巡检发现（2026-08-14，巡检 skill 交付当天）

首次全量巡检立即暴露 4 个此前不可见的基础设施问题（证据：`docs/roadmap/stability-reports/stability-report-20260814-1846.md`）：

| # | 发现 | 影响 | 处置 |
|---|------|------|------|
| F1 | `pnpm run test -- --run` 的 `--` 分隔符被 pnpm 8 透传，标志位失效：前端 vitest 卡 watch 模式、后端 jest 报 "No tests found" 退出 | **quality:gate 与 3 个 CI workflow 的测试步骤本地从未真正执行过**（CI 里 vitest 靠 CI 环境变量侥幸通过，jest 步骤在 CI 到达前就因其他原因失败） | 已修复：根 package.json + quality-gate.yml + release-candidate.yml + release.yml 共 6 处去掉 `--` |
| F2 | CI quality-gate 自 2026-08-10 起 5 次连红，根因是 PR 分支 `pnpm-lock.yaml` 与 server package.json 不同步（缺 @linear/sdk 等），install 即挂 | 质量门禁曾整体失效约 4 天，一批 feat PR 带红灯合入 | 当前分支锁文件已同步（frozen 校验通过）；巡检已内置依赖锁检查防复发 |
| F3 | 后端 `task-assignee.service.spec.ts` 5 个用例失败（NestJS TestingModule 依赖注入解析错误），163/168 通过 | F1 修复后才暴露的真实存量 bug | **待办**：纳入 WP4 修复（复现 → 最小修复 → 回归测试） |
| F4 | server lint script 自带 `--fix`，跑一次门禁会自动改动约 23 个源码文件 | 本地工作区被静默污染，改动与人工修改混杂 | 巡检脚本已改为非破坏性调用；仓库脚本保留 `--fix` 语义待团队决定是否移除 |

> 教训：F1/F2 说明「门禁绿灯」≠「门禁在工作」。巡检的价值正是用独立于 CI 的检查面交叉验证。

## 2. 目标与出口条件

**一句话目标**：五条黄金路径上 P0 清零，每次修复都有回归测试兜底，巡检可一键执行。

v0.5.0 发布出口条件（全部满足才可公开 beta）：

| # | 出口条件 | 判定方式 |
|---|---------|---------|
| E1 | 契约 codegen 上线：前端类型由 OpenAPI 生成，CI 校验漂移 | `pnpm contract:check` 在 CI 中运行且通过 |
| E2 | 五条黄金路径各有 ≥1 条 Playwright E2E 用例 | CI e2e job 连续 7 天绿 |
| E3 | 黄金路径 P0 = 0，P1 ≤ 5 且均有 Linear 排期 | 巡检报告 + Linear 过滤 |
| E4 | 回归防护生效：稳定期内合入的每个 bug 修复都带测试 | 修复 PR 模板勾选项 + 抽查 |
| E5 | 稳定化巡检 skill 固化并可一键执行 | `.cursor/skills/stability-check/` 可用 |
| E6 | 冻结执行：稳定期内不合入新功能模块 | git log 审计（仅 fix/test/ci/docs/chore） |

## 3. 黄金路径定义（冻结，变更需人工裁决）

判定规则：**路径圈内 bug = P0/P1；圈外 = P2/P3**。圈内新需求同样冻结。

### GP1 认证与项目初始化

- 路由: `/login` → `/app/projects` → 项目创建对话框 → `/app/projects/:id/dashboard`
- 关键链路: 登录/注册 → JWT 持久化 → 项目列表加载 → 创建项目 → 跳转仪表盘
- 后端依赖: auth、project 模块

### GP2 任务管理主循环

- 路由: `/app/projects/:id/tasks` → 创建任务（含 moduleCode/shortId）→ `/app/projects/:id/board` 看板流转 → 任务详情
- 关键链路: 任务 CRUD → 状态流转 → 看板列移动持久化 → 详情 drawer 各 tab 加载
- 后端依赖: task、metadata、project 模块

### GP3 AI 执行与审批

- 路由: 任务指派 AI → `/app/ai/executions` 执行中心 → 审批操作 → 结果回看
- 关键链路: 指派对话框 → ExecutionRun 创建 → 执行列表/详情加载 → 审批提交 → 状态实时更新（WebSocket）
- 后端依赖: ai-hub、execution、runtime 模块

### GP4 Linear 集成

- 路由: `/app/integrations` → Linear 配置 → 项目绑定 → 同步 → 冲突解决
- 关键链路: 配置表单 + inline test → project pull → task 双向 sync → 冲突徽章 + 解决器 → 同步日志抽屉
- 后端依赖: integration（linear provider）模块

### GP5 文档闭环

- 路由: `/app/documents` → `/app/documents/new` → `/app/documents/:id/edit` → 版本历史 → 回滚
- 关键链路: 创建 → CodeMirror 编辑 → 保存 → 版本列表 → 回滚为新版本
- 后端依赖: document 模块

## 4. 工作包

### WP0: Bug 基线清点

**模块**: 全局
**优先级**: P0
**预估点**: 1

**描述**:
人工 dogfood 完整走一遍五条黄金路径（前端 + 后端本地起服务），把每个异常记录到 `docs/roadmap/stability-bug-baseline.md`，按 P0-P3 分级并导入 Linear（label: `stability`）。

**验收标准**:
- [ ] 五条路径全部走查，每条路径的截图/录屏存档
- [ ] bug 清单含: 路径编号、复现步骤、预期 vs 实际、分级
- [ ] 已导入 Linear 并打 `stability` + `priority/*` 标签

**标签**: `stability` `priority/p0` `size/1`

### WP1: 契约 codegen（掐断最大 bug 源）

**模块**: server + frontend + CI
**优先级**: P0
**预估点**: 3

**描述**:
后端已有 Swagger（`/_api/docs`）。用 `openapi-typescript` 从 OpenAPI 规范生成前端类型，CI 校验「提交的生成文件与重新生成结果零 diff」。手写业务类型逐步退役（`BackendEnvelope` 等基础封装类型可保留）。

**验收标准**:
- [x] `pnpm contract:export`：构建时导出 `openapi.json` 到仓库（或 CI 临时生成）（2026-08-30 落地：jest 守卫 spec 启动 AppModule + template.db 副本导出，321 paths / 102 schemas 入库）
- [x] `pnpm contract:generate`：生成 `apps/frontend/src/infrastructure/api-client/generated/`（openapi-typescript 7，产物 api-types.gen.ts）
- [x] `pnpm contract:check`：CI 中校验漂移（后端契约变更而前端未重新生成 → fail）（临时产物字节比对，已接入 quality-gate.yml 与 quality:gate）
- [ ] GP1 涉及的 auth/project/task 类型先替换为生成类型作为试点，验证工作流后再推广（生成类型已就绪，前端消费侧迁移待做，属增量推广）
- [x] 手写类型保留清单写入本文档（哪些保留、为什么）（见下）

**手写类型保留清单（2026-08-30）**:
- `apps/frontend/src/infrastructure/api-client`（api 实例与 envelope 封装）：保留，属于传输层封装而非契约类型。
- 各模块 `api/*.ts` 中与后端 DTO 一一对应的 interface/type：**待迁移**——按模块逐步替换为 `generated/api-types.gen.ts` 的 `components['schemas'][...]` 引用；每替换一个模块须通过 `pnpm contract:check` + 前端 type-check。
- 前端本地视图模型（组件 props、store 状态等非契约形状）：永久保留，不在迁移范围。

**标签**: `stability` `priority/p0` `size/3`

### WP2: E2E 基建 + 黄金路径 smoke

**模块**: frontend + CI
**优先级**: P0
**预估点**: 5

**描述**:
引入 Playwright，配置 `webServer`（并行起 server + frontend），seed 数据确定性（幂等），为五条黄金路径各写至少 1 条 smoke 用例（每条 ≤10 步，只验证主干不断，不做精细断言）。

**验收标准**:
- [ ] `apps/frontend/playwright.config.ts` + `pnpm --filter ./apps/frontend run e2e`
- [ ] seed 脚本幂等（重复执行不报错、数据不重复）
- [ ] 5 条用例: `gp1-auth-project.spec.ts` … `gp5-documents.spec.ts`
- [ ] CI 新增 e2e job（quality-gate workflow 内），带 Playwright 官方缓存 action
- [ ] 本地 `pnpm e2e` 一条命令可跑

**备注（2026-08-30，接口层 E2E 已先行落地）**:
WP2 原指前端 Playwright 浏览器 E2E，仍待做。接口层的先行版本已完成并接入 CI：
- `apps/server/test/helpers/ws-app.ts`：template.db 副本一次性工作区（幂等、不污染 dev 库）+ `initTestApp`（含 x-workspace-id→ALS 中间件）+ `wsRequest` 注入工作区头 + `ws.db` 直连客户端。
- 覆盖模块：auth/project/task/iteration/metadata（存量修复至全绿）+ git/document/team/activity（新增 smoke，共 68 用例）。
- `test:e2e` 已进入 quality-gate.yml 与根 `quality:gate`。

**标签**: `stability` `priority/p0` `size/5`

### WP3: 门禁与流程升级

**模块**: CI + 流程
**优先级**: P1
**预估点**: 2

**描述**:
本地与 CI 门禁对齐升级，把契约检查与 E2E 纳入阻断项；建立修复类 PR 的规范。

**验收标准**:
- [ ] `quality:gate` 扩展为: type-check + lint + 单测 + e2e + contract:check + docs-sync
- [ ] PR 模板新增: 「本 PR 修复的黄金路径编号」「已包含回归测试」勾选项
- [ ] husky 钩子确认生效（commit 前至少跑 lint-staged 或 type-check 快速路径）
- [ ] 文档更新: CLAUDE.md 快速命令区补 `pnpm e2e` / `pnpm contract:check` / 巡检 skill 用法

**标签**: `stability` `priority/p1` `size/2`

### WP4: P0 收敛冲刺（滚动执行）

**模块**: 按黄金路径
**优先级**: P0
**预估点**: 8（首批）

**描述**:
按 GP1 → GP2 → GP3 → GP4 → GP5 顺序收敛基线清单中的 P0。**修复工作流固定为**：
1. 复现先行：先写失败用例（E2E 层优先，纯后端逻辑可单测层）
2. 最小修复：不顺手重构、不扩大范围
3. 回归测试随修复合入（E4 审计依据）
4. Linear issue 关联 PR，修复后勾选巡检报告中的对应项

**验收标准**:
- [ ] 基线 P0 全部关闭，每个修复 PR 含测试
- [ ] 新发现的 P0 当日分级、当周修复或明确排期

**标签**: `stability` `priority/p0` `size/8`

### WP5: 稳定化巡检 skill（本次已交付）

**模块**: 工具链
**优先级**: P1
**预估点**: 1

**描述**:
`.cursor/skills/stability-check/`：一键执行全部检查（type-check / lint / 单测 / E2E / 契约 / 测试资产统计），产出 markdown 巡检报告与出口条件进度表。E2E 与契约检查在 WP1/WP2 落地前自动降级为 NOT_IMPLEMENTED，落地后自动纳入。

**验收标准**:
- [x] skill 可一键执行（skill 已创建，2026-08-14）
- [ ] 首份全量巡检报告生成并存档

**标签**: `stability` `priority/p1` `size/1`

## 5. 执行节奏与排期

| 阶段 | 内容 | 预估 | 里程碑 |
|------|------|------|--------|
| S0（第 1 周） | WP0 基线清点 + WP1 契约 codegen + WP5 巡检固化 | ~1 周 | 基线清单冻结；契约漂移从此被拦截 |
| S1（第 2-3 周） | WP2 E2E 基建 + WP3 门禁升级 + WP4 首批 P0（GP1/GP2） | ~2 周 | 五条路径有 E2E 防护网 |
| S2（第 4-5 周） | WP4 收尾（GP3/GP4/GP5）+ 冻结审计 | ~2 周 | 出口条件 E1-E6 逐项核验 → v0.5.0 |

巡检节奏：**每日 quick**（type-check + lint，~3 分钟）+ **每周 full**（全量 + 报告归档 + Linear P0/P1 盘点）。

## 6. 冻结规则

- 稳定期（S0 开始至 v0.5.0 发布）内，develop 分支只接受: `fix/*`、`test/*`、`ci/*`、`docs`、`chore/*`
- 例外流程：功能类合入需人工裁决并在本文档记录理由（记录到 `docs/meta/decision-log.md`）
- UI 统一（archetype 收敛）属另案，不在本计划内，但同样受冻结规则约束

## 7. 度量与看板

| 指标 | 来源 | 目标 |
|------|------|------|
| 黄金路径 P0 数 | Linear `stability` label 过滤 | 0 |
| E2E 通过率 / flake 次数 | CI + 巡检报告 | 100% / 每周 <2 |
| 契约漂移拦截次数 | CI contract:check 失败次数 | >0（证明拦截生效）且趋稳 |
| 修复带测试比例 | PR 审计 | 100% |

巡检报告统一存档于 `docs/roadmap/stability-reports/stability-report-YYYYMMDD-HHmm.md`，最新报告文件名记录在 `docs/roadmap/stability-reports/LATEST.md`。

## 8. 边界（本计划明确不做）

- 不做 UI 统一与视觉收敛（另案）
- 不做新功能（runtime 协议 v2、PM-agent 架构、Jira 同步等全部冻结）
- 不做模块结构重构
- 不追测试覆盖率数字（回归防护优先于覆盖率指标）

---

## 任务汇总

| 工作包 | 优先级 | 预估点 | 依赖 |
|--------|--------|--------|------|
| WP0 基线清点 | P0 | 1 | - |
| WP1 契约 codegen | P0 | 3 | - |
| WP2 E2E 基建 | P0 | 5 | WP0（seed 场景参考） |
| WP3 门禁升级 | P1 | 2 | WP1+WP2 |
| WP4 P0 收敛 | P0 | 8+ | WP0 |
| WP5 巡检 skill | P1 | 1 | -（已交付） |
| **合计** | | **20+** | |

*本文档由稳定化专项产出，巡检 skill 每次运行后会更新第 7 节看板数据。*
