---
title: 夜航报告 2026-09-30——设计治理线收口/合流/发版托管执行账
description: 工作树五批收口提交、quality:gate 等效全绿（e2e 四条基线同挂豁免实证）、refactor/design-semantic-tokens 151 笔合流 develop、v0.7.6 发版归版与 tag；死选择器全库波及盘点与早上决策清单
id: night-shift-2026-09-30
category: report
status: active
version: 1.0.0
created: '2026-09-30'
modified: '2026-09-30'
scope: 设计系统治理线夜航托管
ai-session-types: all
ai-priority: normal
ai-freshness: realtime
ai-audiences: 'session:all'
tags: 'night-shift, design-system, release, quality-gate'
---

# 夜航报告 2026-09-30

> 用户授权：晚上托管执行全部无需决策的工作，需要用户决策的项汇总到早上。本报告 = 执行账 + 早上决策清单。

## 一、执行总账

| 阶段 | 结果 |
|------|------|
| 0 安全网 | 快照分支 `backup/night-2026-09-30-start` 已建（回滚锚点）；4300/5173 dev server 整夜未动 |
| 1 工作树收口 | 30 文件拆三笔提交（commit-scribe 编队执行）：`4e795c23` 组件裁决 36 条账 → `33555f99` 画廊意见批组件级 → `b20fe108` 列表呼吸感批；**11 件 deprecated 物理删除未执行（留晨批）** |
| 2 质量门禁 | `quality:gate` 等效全绿（详见 §三）；过程中修复两处：任意值白名单补录 `8149e33d`、死选择器修复批 `d7596124`、CHANGELOG 入账 `4bf7de11` |
| 3 push/合流 | refactor/design-semantic-tokens（151 笔）已 push 留档；develop **fast-forward 合流**（分支不缺 develop 任何提交，零冲突）并 push `00b88d5b..9c0f8c50` |
| 4 发版 | 归版提交 `9c0f8c50`（CHANGELOG 归版 0.7.6 + desktop 版本对齐）→ fetch 对齐后打 annotated tag `v0.7.6` 并推送；desktop draft 自动构建中，**人工 Publish 留早上** |
| 5 增量任务 | 死选择器五件排查批完成（超额：实锤六文件 + 全库波及盘点，见 §四）；H4 确认挂「裁决暂缓」→ 移入晨清单 |

## 二、今晚提交清单（refactor/design-semantic-tokens 分支上，已随 ff 合流进 develop）

```
9c0f8c50 chore(release): v0.7.6 发版归版 + 桌面版本对齐
4bf7de11 docs(changelog): 夜航收口五笔入账
d7596124 fix(design-system): 死选择器五件排查批——base-ui data 口径纠正六文件
8149e33d fix(design-system): 呼吸感批任意值白名单补录
b20fe108 feat(frontend): 列表 Linear 呼吸感批
33555f99 feat(design-system): 画廊意见批组件级落地
4e795c23 chore(design-system): 组件裁决 36 条全收口入账
（此前已在分支：d5035eba 统计卡归一、G 类物理搬移全簇、H 类门禁 1fe42f72/804cceed 等）
```

归属偏差如实记录：`design-system-page.test.tsx` 实际只含 review=0 断言改写，归入裁决账笔（预判画廊批）；`status-visuals.ts` 仅含 medium 降灰一处，归入呼吸感批。

## 三、门禁结果与 e2e 豁免实证

- type-check（turbo 全包）✓ · lint（五治理脚本 + eslint）✓ · 全仓 Vitest ✓
- contract:check 契约零漂移 ✓ · api:audit **97.3%**（528 端点覆盖 514）✓ · check:docs-sync ✓（CHANGELOG 配对后过）
- **server e2e：416/420 绿**。4 条失败经 origin/develop 基线（v0.7.5 归版点）detach 复跑**完全同挂**（office 1 + playbook 3，同用例名）——豁免判据实证成立，属长寿库 local-only 环境依赖，非本分支引入。assistant-cli-chat EPERM 为已知 Windows 环境 flake（记忆在案：fs.rmSync 并行清理冲突，单跑即过，本次基线复跑单跑通过证实）。

## 四、死选择器发现全记录（今晚最大增量发现）

**证据链**：base-ui 1.7.0 `getStateAttributesProps.js` —— 布尔 state 渲染为**空串属性**（`data-pressed=""`），枚举 state 才带值（`data-orientation="horizontal"`）。

**三类死法**：
1. 布尔 `=true` 形态死：`data-[invalid=true]` 生成 `[data-invalid="true"]`，DOM 恒空串不匹配 → 应写存在性 `data-[invalid]`（field 三处）
2. 属性名 radix 残留死：`data-[state=on]`——base-ui Toggle 产出 `data-pressed`，无 data-state（toggle-group 一处）
3. 裸命名形态死：`data-horizontal:`/`group-data-horizontal` 检查不存在的 `data-horizontal` 属性（实际输出 `data-orientation` 带值）——toggle-group 十处/separator 四处/slider 八处/button-group 四处/tabs line 变体一处

**已修**（d7596124）：六文件 27 处，统一 `data-[orientation=horizontal|vertical]` 显式形态（tabs 修复批判例）。验证：tsc -b 干净、field 13 + design-system-page 1 用例绿、eslint 0 error。

**测试自证陷阱**（重要）：`field.test.tsx` 手动渲染 `data-invalid="true"` 恰好喂活死选择器——测试永远绿、生产 DOM 全死。修复为存在性选择器后该测试仍真匹配（无需改），但此模式已记入记忆。

**全库波及（未修，留晨批）**：`data-[x=true]` 形态另涉 9 文件——combobox / label / navigation-menu / drawer / input-otp / calendar / input-group / select / design-system-page。多数为 coss 官方配方来源，是否逐簇清剿待裁决。

## 五、早上决策清单（按建议优先级排序）

1. **桌面 v0.7.6 draft Publish**：draft 已就绪——**重复 draft 坑第四次复发已在夜航按既定法处置完毕**（残缺份仅 blockmap 已删，完整份 id 399429176 三资产齐：exe + blockmap + latest.yml），早上只剩人工 Publish 一个动作。
2. **批 9 物理删除 11 件**：decisions.json 已账、registry 已标 deprecated + expiresAt 2026-10-31。批准后逐项单独 commit（连带测试与 filter-panel 的 vi.mock）。⚠️ 注意核实「task-rows」删裁与呼吸感批 `modules/issue/components/task-rows.tsx` 仍在改（四列表接统一件）是否同一文件——若是需先裁决归属。
3. **死选择器全库清剿批**：另 9 文件 `data-[x=true]` 形态是否立批（每簇独立小批纪律；修复会让一批视觉状态「复活」，实机观感变化需知情）。
4. **CI 口径知悉**：quality-gate.yml 只对 **pull_request** 触发（develop 直接 push 不跑 CI，无 run 记录属预期）；全量兜底走 nightly-full-gate.yml 定时。本次发版靠本地门禁等效集（§三）背书；若后续开 PR（如 develop→pre-prod）时 CI 挂，优先按「基线同挂豁免判据」排查。
5. **H4 排期**：挂「裁决暂缓——G2 遗留账先行」；物理搬移/统计卡归一已清，剩 ChartContainer 二选一。是否现在排 H4（6400 行 design-system-page 大改须与该页其他改动错峰）。
6. **统计卡批三项余留**：①响应式栅格档退化（方案：columns 加封闭响应式档，不开 className）②analytics trend 反向语义消亡确认 ③实机验收三重点（数值变小观感/四页窄窗/彩色新口径）。
7. **comfortable 档启用评审**（F 类唯一余项）：候选 member/team-list 单 prop、admin 三区需 data-table 透传 size。
8. **实机验收大排队**：F 类 26 笔 / G 类 / 统计卡 / H 门禁（对账区+新 demo）/ 画廊意见批 / 死选择器批——建议一次过完。
9. **text-[15px] 升格评审**：维持白名单特例 vs 升格正式字号 token（升格须登记 cn/twmerge）。
10. **JEV System One**：调研已交查（非开工许可），是否开工 + 三前置（中文校准实测/防操纵/锁版本）。
11. **清理项**（低优先）：release 草稿区存量——**0.7.5 双份 draft（重复 draft 坑现场）+ 0.7.4 / 0.7.3 draft 未 Publish** + 远古空 draft v0.4.1-beta.2；`backup/night-2026-09-30-start` 与 `backup/pre-rollback-ba418dad` 快照分支、stash（chip+f-class 存档，2026-09-28 裁决不保留）、refactor/design-semantic-tokens 分支（已合流可删）。

## 六、环境与注意事项

- dev server（4300/5173）整夜未动，用户浏览器连接保持。
- main 未动（按策略 main 不随版同步）。
- `docs/design/` 五份方案文档（G/H 类等）随分支入库，docs 整体仍不入 gitignore 变更未做。
- 今晚全程未动 stash、未删任何分支、未执行物理删除。
