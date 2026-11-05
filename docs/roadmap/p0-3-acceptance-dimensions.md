---
description: 验收门禁必备维度（日志/监控/依赖/回滚）定义与可解释性说明（P0-3）
category: roadmap
status: draft
tags: [roadmap, acceptance, gate, p0]
version: 1.0.0
created: "2026-11-04"
title: 验收门禁维度定义与可解释性
---

# 验收门禁维度定义与可解释性（P0-3）

> 面向维护者：验收门禁如何判定「日志/监控/依赖/回滚」是否被覆盖，为什么拦截，怎样算通过。
> 代码：`apps/server/src/modules/acceptance/acceptance-dimensions.ts`（纯判定内核）、
> `completeness-audit.service.ts`（审计执行）、`acceptance.service.ts`（接收门禁）。

## 一、四个必备维度

| 维度 key | 展示名 | 覆盖判据（category 别名 或 正文关键词） | 缺失严重级 |
|---|---|---|---|
| `logging` | 日志 | category 含 日志/logging/可观测性；或正文含 日志/结构化日志/log/logger/pino… | high（强阻断） |
| `monitoring` | 监控/告警 | category 含 监控/告警/可观测性；或正文含 监控/告警/指标/metric/prometheus/alert… | high（强阻断） |
| `dependency` | 依赖 | category 含 依赖/dependency；或正文含 依赖/降级/超时/熔断… | high（强阻断） |
| `rollback` | 回滚 | category 含 回滚/发布/部署；或正文含 回滚/回退/灰度/rollback… | high（强阻断） |

## 二、卡在哪、何时生效

1. **执行前强制审计**（`CompletenessAuditService.auditAcceptance`）：除依赖完备性、工程完备性、证据充分性外，新增「必备维度覆盖」。**不依赖 checklist 是否存在**——拿不到清单也按保守四维判定，避免「新项目类型无匹配清单就静默放行」。
2. **接收完成硬门禁**（`AcceptanceService.acceptCompletion`）：审计红牌（含维度阻断）→ `ACCEPT_BLOCKED`；审计过期 → 拒绝重审。
3. **工程侧 CI 不变**：type-check/lint/test/build 仍归既有 `quality-gate`；P0-3 不新增 CI stage，回归测试并入现有 turbo test。

## 三、为什么这样设计（堵的洞）

- 旧实现：工程完备性只在命中 checklist 时执行，且用纯子串双向 `includes`——无清单即跳过（日志/监控/回滚从不检查）、措辞一变即漏判。
- 新实现：默认四维全必备（保守），结构化 category+关键词判定；可解释 finding。

## 四、可解释性

每个缺失维度产出一条 finding（写入 `CompletenessAuditReport.blockedItems`，`type=dimension`）：

```json
{
  "type": "dimension",
  "id": "dimension-logging",
  "dimension": "logging",
  "category": "日志",
  "content": "验收标准缺少「日志」维度的覆盖：补一条…",
  "severity": "high",
  "source": "Required Dimension Gate",
  "suggestion": "补一条验收标准：关键路径有结构化日志…",
  "howToPass": "存在 category=日志 的标准，或正文含“日志/log/logger”等关键词。"
}
```

接收被拦时，`ACCEPT_BLOCKED.failures` 逐条展开为 `auditDimension`，reason 含「缺哪维 / category / 补法 / 通过标准」，人一眼知道怎么补。

## 五、覆盖机制（不写死）

`REQUIRED_DIMENSIONS_BY_PROJECT_TYPE` 可按 `techStack` / `projectType` 覆盖必备维度；未登记的一律回落默认四维。优先级：techStack > projectType > 默认。

## 六、已知行为变更

- 旧「无依赖无清单无标准 → green」改为「→ red（四维全缺）」：这是 P0-3 要堵的静默放行洞，属预期变更。
- 存量审计报告若无 `criteriaRevisions` 快照（版本化之前），审计过期判定按「无法判定、不标过期」兼容处理。
