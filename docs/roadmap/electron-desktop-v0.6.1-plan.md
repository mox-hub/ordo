---
title: Electron 桌面端 v0.6.1 验证计划（spike）
description: apps/desktop 壳技术栈 Tauri → Electron 的验证分支执行计划——承载方式实验、六缺口资产随迁、打包链与实机冒烟、验收裁决（CAP-A-14 + ADR-014）
id: ROADMAP-DESKTOP-002
category: roadmap
status: active
version: 0.1.0
created: "2026-09-12"
scope: apps/desktop, apps/server 打包产物, apps/frontend desktop 模块
ai-session-types: all
ai-priority: high
tags: "electron, desktop, packaging, v0.6.1, CAP-A-14, ADR-014, spike"
---

# Electron 桌面端 v0.6.1 验证计划（spike）

> 对应能力卡 **CAP-A-14** + 决策 **ADR-014**（2026-09-12 桌面壳选型变更：Tauri → Electron 验证）。
> **不变项**：能力目标（非开发用户装上即用）、版号 **v0.6.1**、四裁决点（不签名 / 不自动更新 / AI 执行面不随包 / 不做便携模式）。
> **变更项**：实现壳 Tauri 2 → Electron；Rust 胶水层全部废弃，以 TS 重写；Tauri 分支（`feat/desktop-packaging-v0.6.1`@519baf2）归档保留，壳无关资产随迁。

## 一、选型依据（复评结论，详见 ADR-014）

实测数据：打包资源中 server `node_modules` = **386 MB**（NestJS prod 依赖 + Prisma 引擎），dist 9.4 MB，随包 node.exe ~75 MB，Tauri 壳本身仅 ~10 MB。**壳的差异被 386 MB 的运行时稀释**——Tauri 安装包压缩后约 140–180 MB，Electron 估计 180–200 MB，差距 30–50 MB（~20%），换掉的是全仓唯一 Rust 孤岛 + 三 WebView 回归 + sidecar 边界坑。

Tauri 分支已解、且与壳无关直接随迁的资产：

| 资产 | 位置 | Electron 侧用法 |
|------|------|----------------|
| 自包含 server 资源准备链 | `apps/desktop/scripts/pack.mjs` | 直接复用，改输出落位（`src-tauri/resources/` → Electron extraResources 目录） |
| server 生产入口修正 | `apps/server` `start:prod` → `dist/main.js`、prisma 入 dependencies | 已入库，无需动作 |
| 密钥首启生成持久化方案 | `src-tauri/src/setup.rs` | 语义翻译为 TS（secrets.json 生成/复用、db push 仅全新安装执行） |
| 端口探测 4300–4399 + 健康检查 env 注入 | `src-tauri/src/backend.rs` | 语义翻译为 TS，env 表照抄 |
| 前端引导链 | `modules/desktop`：`window.__DESKTOP_API_BASE_URL__` → api-client | **前端零改动**——preload contextBridge 暴露同名契约即可 |
| 自包含冷启动冒烟方法 | `resources/bin/node.exe resources/server/dist/main.js` | 路径 A（spawn node.exe）的验证方法照用 |

## 二、技术方案基线

```
┌─ Electron 主窗口（Chromium，loadFile frontend/dist）─┐
│  modules/desktop 引导链不变：                          │
│  contextBridge.desktopApi.getBackendStatus            │
│  → setApiBaseUrl → window.__DESKTOP_API_BASE_URL__    │
└──────────┬────────────────────────────────────────────┘
           │ IPC（preload 白名单暴露，对齐原 12 命令面）
┌──────────┴────────────────────────────────────────────┐
│ Electron main（TS，apps/desktop/electron/）           │
│  setup.ts   目录/密钥/db push/初始化状态                │
│  backend.ts 端口探测 + 健康检查 + env 注入              │
│  承载方式 E①实验裁决：                                  │
│   路径B(首选) utilityProcess 直接跑 server dist         │
│   路径A(回退) spawn extraResources/bin/node.exe         │
└──────────┬────────────────────────────────────────────┘
           │ extraResources/server（pack.mjs 产物复用）
           │ dist + node_modules + prisma + 预生成客户端
```

**选型定版**

| 项 | 选择 | 理由 |
|----|------|------|
| 打包器 | electron-builder（NSIS target） | 一条龙：安装包/更新/签名生态最成熟；forge 偏 dev-first |
| main/preload 构建 | tsup（esbuild）直出 CJS | 与仓库既有 esbuild 栈一致，零新脚手架；不引 electron-vite（spike 阶段最小依赖） |
| electron 版本 | 装 latest stable，登记 pnpm catalog | 注意 allowBuilds 登记（electron 下载二进制） |
| server 承载 | E① 实验裁决 B/A 双路径 | 见下 |
| 用户数据目录 | `%APPDATA%/agent-project-manager/`（Electron 惯例 userData） | Tauri 的 `com.agentpm.desktop` 是空壳路径且未发布，直接换新，无迁移负担 |

**server 承载双路径（E① 首验项）**

- **路径 B（首选）**：`utilityProcess.fork`（或主进程 require）直接运行 server `dist/main.js`，复用 Electron 内置 Node。收益：省随包 node.exe ~75MB、少一个进程管理面。风险：Prisma query engine `dll.node` 与 electron runtime 的 ABI 兼容——引擎为 N-API 构建理论无关，**实测半天内不过即切路径 A，不死磕**。注意点：`PRISMA_QUERY_ENGINE_LIBRARY` 显式指路、`ELECTRON_RUN_AS_NODE` 语义、native 依赖 binaryTargets。
- **路径 A（回退）**：`child_process.spawn(extraResources/bin/node.exe, dist/main.js)`——与 Tauri 已冒烟路径完全同构，pack.mjs 产物原样可用，已知零风险。
- 两路径共享同一套 `backend.ts`（端口探测/健康检查/env 注入/退出杀进程），差异只封装在「如何拉起 server」一个函数后面。

## 三、切片计划（顺序执行）

1. **切片 E①——骨架与承载验证**（预估 1–2 天）：`apps/desktop/electron/` main+preload 骨架（tsup 构建，dev 模式直连仓库 server/vite）、contextBridge 契约对齐引导链、路径 B/A 双路径实验出结论、dev 端到端跑通（登录 + 项目主流程）。
2. **切片 E②——密钥初始化与用户数据**（预估 1 天）：setup.ts（secrets.json 生成复用 / db push 仅全新安装 / init 失败态经 IPC 透出到 desktop-init-page）、端口探测与健康检查翻译、优雅退出（window-all-closed + before-quit 杀全部子进程）。
3. **切片 E③——打包链与实机冒烟**（预估 1–2 天）：pack.mjs 落位改造 + electron-builder.yml（NSIS、extraResources、asar 排除 native dll）→ 产出安装包 → 干净机冒烟（对应 GAP-T-19：安装→首启建库→登录→主流程 + 异常流：端口被占自动换端口 / server 拉起失败提示）。
4. **切片 E④——裁决收口**（预估 0.5 天）：包体/内存实测报告（对照 Tauri 估算，作为选型证据闭环归档 ADR-014）；通过则删 `src-tauri/` + tauri 相关配置与依赖，走 PR；不通过则 ADR-014 补记证据回滚。

## 四、验收清单（对齐 CAP-A-14 测试义务）

> 执行结果（2026-09-12 夜航）：**E①②③ 全部通过**，以下逐项核验，证据归档 ADR-014 补记。

- [x] 安装包双击安装 → 首启自动建库 → 服务健康 → 登录 → 项目主流程全通（本机静默安装 /S 近似干净机：建库、密钥生成、server 生产启动、health 200、窗口加载 server 托管前端全通；**真干净机冒烟留 v0.6.1 发版前**）
- [x] 异常流 ≥2：后端端口被占自动换端口（实测 4300/4301 被占取 4302）；server 拉起失败时 init 错误态可见（get_init_status 透出 + desktop-init-page 通道）
- [x] 退出应用后无 node/server 残留进程（优雅退出实测 4302 无监听、无 electron 进程）
- [x] 前端引导链零改动可用（`window.__DESKTOP_API_BASE_URL__` 契约不变；CDP smoke-ipc 全字段断言 PASS）
- [x] 包体与内存实测数据归档（安装包 241MB；5 进程合计 584MB 含 server 运行时），写入 ADR-014 补记作为选型终审证据
- [x] `pnpm quality:gate` 最小子集全绿（desktop 纳入 type-check + lint；server/frontend type-check + 单测通过；契约无变更故 contract:check 不适用）

## 五、裁决点与明确不做

**沿用既有裁决（不变）**：不代码签名（SmartScreen 提示接受）/ 不自动更新器 / 不做便携模式 / 升级场景 migrate deploy 不在本版。

**裁决更新（2026-09-12 体验五切片）**：「AI 执行面不随包」→ **apm-runtime 守护进程本体随包**（`resources/cli/` 自包含产物；壳在 server 健康后自动拉起，`APM_CONFIG_PATH` 重定向 userData 与用户手动 CLI 隔离；注册 Public 端点上线即出现在设置页机器列表）；外部 CLI 二进制（claude-code/codex 等）仍不随包、由守护进程探测用户自装环境。

**体验五切片（2026-09-12，用户实机验收反馈落地）**：

1. **初始化向导**：`OnboardingGate` 挂 ShellLayout 全局层，桌面模式且未完成时自动弹出；桌面模式插入「工作目录」步骤（壳原生选目录 → 守护进程 `workspaceRoots`），全部步骤可跳过；完成标记 zustand persist + 壳侧镜像双持久化。
2. **登录缓存**：动态端口 → origin 漂移 → localStorage 隔离是登录态丢失根因；壳侧 `desktop-state.json` 镜像 token/工作区/向导标记，启动恢复 + 登录/登出/401/工作区切换四点回写；JWT 7d 服务端兜底。
3. **品牌启动屏**：logo + 轨道动画 + 分阶段状态文案（executeJavaScript 原地更新，不重载页面）。
4. **守护进程托管**：见裁决更新；IPC `get_runtime_daemon_status/start/stop` + 工作目录命令；设置页运行时区「本机守护进程」卡片。
5. **调试模式**：dev 自动开 DevTools；打包版 `--devtools` 参数 / `APM_DESKTOP_DEBUG=1` / F12·Ctrl+Shift+I / 设置页按钮。

**E① 实验结论（已定版）**：server 承载 = 路径 B（utilityProcess 内嵌 Node）一次通过；路径 A 保留为自动降级兜底。

**dev 实机冒烟结论（2026-09-12，体验五切片验收）**：CDP smoke-ipc PASS；端口被占自动换端口（4300/4301 占用取 4302）；守护进程壳内自动拉起 + 心跳 201 持续 + 设置页机器列表本机在线；向导弹出/AI 说明/工作目录步骤 2/6（实机抓漏：插入表 key 语义错位，8a0c25c 修复+防回归单测）；toggle_devtools 双向。**余留缺陷**：socket.io WS 握手 JwtStrategy 从 header.authorization 取 token 报 TypeError——桌面模式实时推送（socket 推送面）不可用，REST 全链不受影响；属 event-client 与壳桥集成缺口，待单独切片（env 或 auth 载荷注入 token）。**余留观察**：dev server 冷启动 ~22s 才到 i18n 初始化，30s 健康窗口在慢机/冷缓存首启偏紧，超时错误态已正确渲染（可操作提示数据/日志目录）。

**spike 通过后需一次人审**：`src-tauri/` 删除 PR 的范围确认（含 Cargo.toml、tauri.conf、@tauri-apps/cli 依赖、.gitignore 行清理）——**待办，v0.6.1 发版前执行**。
