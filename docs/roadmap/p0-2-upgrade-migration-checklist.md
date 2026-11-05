---
description: P0-2 升级与数据迁移任务清单（~/.ordo 初始化、DB migration、旧版回滚）
category: roadmap
status: draft
tags: [roadmap, migration, p0]
version: 1.0.0
created: "2026-11-04"
title: P0-2 升级与数据迁移 任务清单
---

# P0-2 升级与数据迁移 任务清单

> 目标：老版本可平滑升级到 Ordo，数据不丢；出问题可回滚。
> 本清单只登记任务与关联代码位置，方案定稿后再动代码。

## T1 数据目录迁移（高风险，勿裸改）

- 现状：桌面/CLI/服务端主数据根已统一为 `~/.ordo`（`apps/desktop/electron/src/config.ts`、`apps/server/src/modules/runtime/daemon-ops.service.ts`、`environment-install.service.ts`）。
- **残留**：两处服务端默认目录仍落 `~/agent-project-manager`（与主数据根不一致）：
  - `apps/server/src/modules/document/services/document-storage.service.ts` — `~/agent-project-manager/documents`
  - `apps/server/src/modules/document/services/docs-git.service.ts` — `~/agent-project-manager/docs`
- 要求：改成 `~/.ordo` 前必须实现「检测旧目录 → 迁移 / 软链」，否则老用户 documents/docs 读不到。
- 代码内已加 `TODO(P0-2 数据迁移)` 注释标注，勿在品牌分支裸改。

## T2 ~/.ordo 初始化 / 首装与升级区分

- 首装标记已存在（`apps/desktop/electron/src/commands.ts`：`~/.ordo` 无既有数据 = 全新安装）。
- 待办：确认升级安装路径能识别旧数据并走迁移，而不是当全新安装覆盖。

## T3 DB schema 演进（旧版 → 新版）

- 现状：`apps/desktop/README.md` 记「升级场景的 schema 演进（migrate deploy）未接入——首版安装只做全新建库」。
- 待办：升级时执行 `prisma migrate deploy`，并定义迁移失败的中止/回滚策略。

## T4 旧版回滚路径

- 待办：明确回滚触发条件（迁移失败/启动自检失败）、回滚到旧版本的方式（备份数据目录 + 旧安装包），以及回滚后数据一致性校验。

## 关联

- 品牌命名基线：`docs/02-架构设计/策略/品牌命名方案-v1.md` §六（数据目录列为高风险管理项）。
