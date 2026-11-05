---
description: P0-2 数据迁移决策说明——4 类旧数据位置、迁移/中止/全新装判定、复制+校验+回滚
category: roadmap
status: draft
tags: [roadmap, migration, p0]
version: 1.0.0
created: "2026-11-04"
title: P0-2 数据迁移决策说明
---

# P0-2 数据迁移决策说明

> 面向维护者：讲清 Ordo 历史数据位置、升级时如何判定、迁移/中止/回滚怎么做。
> 代码实现：`apps/desktop/electron/src/legacy-migration.ts`（纯逻辑，可单测）。

## 一、为什么需要

当前 `installer.nsh` 只检查 `~/.ordo`。Ordo 历史上有**三代**数据位置，老用户从旧版本升级时，`~/.ordo` 不存在 → 被当成「全新安装」→ 旧数据不会被读取，形成**数据孤儿化**。这是 P0-2 要堵的洞。

## 二、旧数据可能在的 4 类位置（git 实证）

| # | 位置 | 出现版本 | 说明 |
|---|---|---|---|
| ① | `%APPDATA%\agent-project-manager` | v0.6.1 及更早 | Electron 默认 userData；旧 `migrateLegacyUserData` 曾从此白名单搬迁（该代码已在 commit `ccb9ae0f` 退役） |
| ② | `~/.apm` | Ordo 改名之前 | `1b279096` 起改为 `~/.ordo`；含 `data/apm.db`、`apm-config.json`、`.apm-backups/` |
| ③ | `~/.ordo` 内旧文件名残留 | 原地改路径未搬文件 | `data/apm.db`、`data/agent-project-manager.db`、`apm-config.json`、`.apm-backups/` |
| ④ | `~/agent-project-manager/{documents,docs}` | 文档库默认值 | 服务端文档库默认目录，至今未迁 |

## 三、判定（三态 + 冲突）

`detectLegacyData(homeDir, appDataDir)` 只读、不写，返回：

| 状态 | 条件 | 处理 |
|---|---|---|
| `FRESH` | 无旧数据、`~/.ordo` 不存在 | 全新初始化 |
| `MIGRATE` | `~/.ordo` 为空/不存在，有外部旧根 | 执行迁移 |
| `ALREADY_NEW` | `~/.ordo` 非空，无旧数据 | 直接启动 |
| `ABORT` | `~/.ordo` 非空，另有外部旧根或原地旧文件 | **中止，不合并、不覆盖** |
| `ARCHIVE_REQUIRED` | `~/.ordo` 内旧 db 与 `data/ordo.db` 并存 | **保留 ordo.db，旧库移入 `.retired/` 归档（不删）** |

原则：只要 `~/.ordo` 已有非空数据，就绝不覆盖；两库并存一律 `MERGE_REQUIRED`，不自动择一。

## 四、迁移动作（仅 MIGRATE）

1. 预检：`~/.ordo` 不存在或为空，否则拒绝。
2. 备份：每个旧根整棵复制到 `~/.ordo-migrate-backup-<ts>/`。
3. 复制（**非移动**）到 `~/.ordo`：`appdata`/`~/.apm` 顶层合并；文档库进 `~/.ordo/{documents,docs}`。
4. 校验：逐文件 sha256 与备份比对，任一缺失/不一致即抛错。
5. 留档：全部通过后旧根改名 `*.migrated.bak`，写 `~/.ordo/.migrated-from.json`。

## 五、回滚

自检失败 → `rollbackMigration(manifest)`：删除本次新建 `~/.ordo`，把 `*.migrated.bak` 改回原名。因为全程是复制且旧根在校验前不动，回滚后旧数据 sha 不变。

## 六、用户裁决（2026-11-04）：两库并存取 B

- **只保留 `data/ordo.db`**，`agent-project-manager.db` 那批 AI/会话数据放弃使用。
- 旧库**归档不删**：移入 `~/.ordo/.retired/`，文件名加 `.retired-<ts>`，迁移前记录 sha256/size，可回滚（`restoreArchivedDatabases`）。
- 不再有「人工合并」分支；正式数据源只认 `ordo.db`，任何情况**不覆盖 ordo.db**。
- 旧目录清理：稳定运行 N 天且用户显式确认后才清理，绝不自动删。

## 七、接线

已接入 `main.ts` 启动流程（`bootstrap()` 内、目录/首装校验之前调用 `runLegacyDataStartup`）：
探测 → MIGRATE 迁移 / ARCHIVE_REQUIRED 归档旧库 / ABORT 仅告警。`ORDO_DATA_DIR` 覆盖（e2e/CI）时跳过，避免测试触碰真实主目录数据；任何异常仅告警、不阻断启动。
