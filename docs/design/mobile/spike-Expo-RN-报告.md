---
title: spike-Expo-RN 技术验证报告
description: M0 spike 实测报告——Expo 58 + RN 0.88 在 pnpm monorepo 的判据 1-7 逐条结论、实测数据、踩坑与遗留
status: active
scope: apps/mobile
created: "2026-10-17"
governance: "判据口径见 ADR-M-001 §5；本报告如实记录失败与未跑项，不以「看起来能跑」代替证据"
---

# spike-Expo-RN 技术验证报告

- **执行日期**：2026-10-17
- **分支**：`feat/mobile-m1-skeleton`（自 develop 10e50b57 检出）
- **执行环境**：Windows 11（win32 10.0.22631）· Node v24.22.0 · pnpm 11.25.0 · 仓 `D:\workspace\ordo`
- **裁决链**：ADR-M-001（Expo + RN，2026-10-11 用户裁决）→ 本 spike 为其 §5 跑法的执行记录

## 一、版本实测（R5 处置要求：随 spike 记录 SDK 版本）

| 件 | 版本 |
|---|---|
| expo | 58.0.14（SDK 58，新架构默认启用） |
| expo-router | 58.0.23 |
| react-native | 0.88.0 |
| react | 19.3.0 |
| socket.io-client | 4.8.3 |
| @tanstack/react-query | 5.102.8 |
| zustand | 5.0.15 |

## 二、判据逐条结论

### 判据 1：Metro 在 pnpm workspace 下打包成功且产物无 Node 内置模块 —— ✅ 通过

- `expo export --platform android --dump-sourcemap` exit 0；产物 `entry-*.hbc` **3.3MB**（Hermes 字节码）+ sourcemap 8.1MB；**热导出 12.4s**（冷导出未精确计时，量级为分钟）。
- 机器证据：`apps/mobile/scripts/check-bundle-clean.mjs` 扫 sourcemap 模块图——**1403 个模块，Node 内置模块命中 0**（exit 0）。
- **`@ordo/shared` 仅 4 个纯 TS 子路径模块进图**：`errors` / `http/ordo-client` / `http/envelope` / `events/domain-events`；`config/store`（fs/os/path）与 `cli/*`（child_process）完全未被拉入 → R1 的「子路径导入」策略实证成立。前提工作已完成：`@ordo/shared` 补 `package.json.exports` 子路径映射（全仓无 node 侧 deep import，前端走 tsconfig paths 消费源码，CLI 仅根导入——改动安全）。

### 判据 2：认证链闭环 —— ◐ HTTP 层全链通过；RN UI 层待模拟器

对真实 dev 后端（localhost:4300）逐环 curl 实测，全部 2xx 且形状与消费代码一致：

1. `POST /_api/auth/register` → 201 + accessToken
2. `POST /_api/auth/login {username,password}` → 201 `{accessToken, session, user}`（LoginResponseDto ✓）
3. `GET /_api/auth/me`（Bearer）→ 200 `{user}`（AuthUserDto ✓）
4. `GET /_api/workspaces/current` → 200 `{workspaceId: "default"}`
5. `GET /_api/workspaces/public` → 200 `{enabled, workspaces[]}`

逻辑层：session store 状态机 7 条单测覆盖（restore 匿名/恢复/降级、login needsWorkspace 两态、activate、logout 容错）。**expSecureStore 落 Keychain/Keystore 与 UI 层串联待判据 5 的模拟器实测**。

### 判据 3：通知链闭环 —— ◐ 代码链路完成；实时自增待真机

`useUnreadCount` 订阅 `notification.created`（事件名取 `@ordo/shared/events/domain-events` 单源，与前端 event-client 同纪律）→ 失效通知族查询 → Tab 徽标自增；socket.io 握手口径镜像前端（auth.token + websocket 优先 + 自动重连）。**与运行中网关的真机联测未做**（依赖判据 5 的设备）。

### 判据 4：决策链闭环（核心楔子） —— ◐ 代码链路 + 纯函数单测通过；resolve 真发待真机

拍板路由映射纯函数 7 条单测：`kind=approval` → `POST /execution/approvals/{sourceId}/resolve {status: approved|rejected, comment}`；其余 kind → `POST /decisions/proposals/{id}/resolve {action: accept|reject, expectedFingerprint, reason}`。**红线 D7 闸门已实现为 `isDecisionActionable`**：提案缺 `contentFingerprint` 不可拍板、`adjust/alternative` 与 `acceptance` 类只读提示回桌面。真发 resolve 与列表移除的端到端验证待设备。

### 判据 5：双端模拟器各跑通 2-4 + 冷启耗时 —— ❌ 未跑

本机为 Windows，无 iOS 模拟器；Android 模拟器/真机联调排 M2 前置（含冷启耗时实测）。**此项未跑，不视为通过。**

### 判据 6：EAS 云构建产出内测包 —— ❌ 未跑

EAS 账号未配置（R4 遗留）。本地 export 已通（判据 1 侧证 Metro 链健康），云构建、签名与内测分发待账号到位后补测。**此项未跑，不视为通过。**

### 判据 7：移动端 type-check 消费生成的契约类型 —— ✅ 通过

`tsc --noEmit` 0 错。契约类型经 tsconfig paths 别名 `@ordo/api-types` → 前端 `api-types.gen.ts`（contract:generate 真产物）**type-only 消费**：`DecisionDto` / `AuthUserDto` / `IssueListItemDto` / `IssueDetailResponseDto` / `NotificationResponseDto` / `ExecutionEventDto`。运行时零拷贝（import type 擦除，Metro 不可见）。M1 契约单源化（apm-contract 抽包）落地后此别名改指单源产物。

## 三、工程接入点状态（工程接入方案 §七 M1 批对账）

| 接入点 | 状态 |
|---|---|
| CI 分类器 + `test-mobile` job | ✅ 本次落地（防「SOURCES=false 全绿静默跳过」） |
| `apps/mobile` 骨架 type-check/lint/test 三脚本 | ✅ 全绿（单测 19/19） |
| `packages/apm-contract` 抽包 + `@ordo/shared` re-export | ⏳ 未做——按工程接入方案 §三为独立 PR（触及 CLI import 面，须随 PC 发版合流） |
| 契约单源化四步 | ⏳ 未做（同上） |
| `knip.json` / `lint-staged` 接入 | ✅ 本次落地 |
| RN 设计治理脚本首批三个 | ⏳ 未做（后续批） |
| `check:i18n-sync` 移动变体 | ⏳ 未做；en 词典与 zh-CN 键集对齐暂由类型层强制（缺键 type-check 失败） |

`pnpm-workspace.yaml` 与 `turbo.json` 实测确认**无需改动**（`apps/*` 自动纳入；mobile 不定义 build，与工程接入方案 §一一致）。

## 四、踩坑记录（四条，全部已处置）

1. **迁仓后 pnpm 拒装**：`node_modules/.modules.yaml` 记录的 `virtualStoreDir` 仍是迁仓前路径（agent-project-manager），pnpm 11.25 判定设置变更要求整仓重建且无 TTY 直接中止。修法：node 替换状态文件中的路径记录（符号链接均为相对路径，搬仓不受影响）→ 36.5s 增量装完。**任何会话在迁仓后首次 `pnpm install` 都会踩**。
2. **`"type": "module"` 与 babel.config.js 冲突**：为消 eslint 的 MODULE_TYPELESS 警告加了 type:module，Metro babel transformer（CJS `module.exports`）当场拒启。回退 type:module，eslint 配置改名 `.mjs`（eslint 9 原生支持）。
3. **vite tsconfck 解不了 `extends: "expo/tsconfig.base"`**：vitest 收集阶段全挂。修法：`vitest.config.ts` 的 `esbuild.tsconfigRaw: '{}'` 绕开项目 tsconfig 的 transform 读取（单测为纯逻辑层，不需要其 paths/jsx）。
4. **`expo install` 自动维护 `minimumReleaseAgeExclude`**：向 `pnpm-workspace.yaml` 写入 expo 工具链包豁免（本仓 minimumReleaseAge 机制在生效）——属工具自管理行为，随批提交。

## 五、契约发现（供 M2 校准与后端适配清单更新）

1. **审批 resolve 无指纹字段**：`ResolveApprovalDto = {status: approved|rejected, comment}`——蓝图 §四「禁止乐观 UI：决策拍板需 approvedFingerprint 校验」对 approval 通道**后端契约不支持**，指纹闸门仅 proposals 通道存在。D7 红线在 approval 通道的实现口径需与后端对表（后端适配清单 B 线候选）。
2. `/execution/runs` 与 `/execution/approvals/pending` 的 200 **未标注 schema**（移动端按 server 实现取最小视图 + 归一层兼容）；`WorkspaceDto` 无命名组件；通知**无按 id 单取端点**（蓝图 §2.2「按 id 取」与现状不符，暂以列表缓存定位）。

## 六、测试残留登记

dev 库新增冒烟号 `m1-spike-residue@example.com`（密码已废弃处理，可随时删除）——判据 2 实测所用。

## 七、结论与下一步

- **判据 1/7 全过、判据 2 HTTP 层全过、判据 3/4 代码链路过；判据 5/6 未跑（设备与 EAS 账号）**。按 ADR-M-001「全部跑通才算成功」的严格口径，spike 收口还差 5/6 两项设备侧实测；**技术路线本身无一道到证伪信号**（R1 子路径策略、pnpm workspace + Metro、契约 type 消费全部实证成立）。
- 下一步：① M1 批余项（apm-contract 抽包 → 契约单源化 → RN 设计脚本，随 PC 发版合流）；② 判据 5（模拟器/真机跑认证-通知-决策三链 + 冷启计时）；③ 判据 6（EAS 账号 + 云构建）。
