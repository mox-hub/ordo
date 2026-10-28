---
title: 编辑器选型 spike —— 保真度实测报告 v1
description: 路线 A（真 WYSIWYG/remark 往返）vs 路线 B（live-preview 文本缓冲契约）同一套保真度测试集实测——A 五项证据未过门槛，B 结构性全过，建议 B 为主形态
category: strategy
status:
  - draft
tags:
  - editor
  - spike
  - round-trip
  - live-preview
version: 1.0.0
created: "2026-09-08"
modified: "2026-09-08"
ai-priority: high
---

# 编辑器选型 spike —— 保真度实测报告 v1

> **日期**：2026-09-08　**依据**：`项目契约与文档知识层-双向绑定设计纪要-v2.md` §14
> **测试资产**：`apps/frontend/src/modules/document/__tests__/editor-fidelity-spike.spec.ts`（9 例，vitest 可复跑，CI 随门禁执行）
> **判据**（v2 纪要 §14.2）：编辑器 serialize 出的 md 过保真度关——真实文档 round-trip 逐字节相等、frontmatter 不动、managed 区间不碰。

## 1. 实测设置

| 项 | 内容 |
|----|------|
| 路线 A 等价物 | `unified + remark-parse + remark-gfm + remark-stringify` 往返（Milkdown serialize 层的等价物） |
| 路线 B 契约 | 文本缓冲区间替换（CodeMirror 事务模型）+ 渲染层只读不回写 |
| fixtures | 仓库真实 `AGENTS.md`（frontmatter+中文+表格+嵌套列表+HTML，7497 字节）+ 内联混排样本（含 apm:// 链接、转义、尾随空格） |

**等价性声明**：Milkdown 实际链路是 remark→prosemirror 文档模型→remark serialize，中间还要过一层文档模型映射；纯 remark 往返是它的**乐观下界**——下界都过不了，A 路线不可能更好。

## 2. 路线 A 实测证据（全部为失败证据）

| # | 证据 | 严重度 |
|---|------|--------|
| A1 | **frontmatter 被解析为 thematicBreak（`---` → `***`）**，语义完全损毁，AGENTS.md 往返膨胀 47%（7497 → ~11000 字节）。需 remark-frontmatter 类插件修补，Milkdown 同样无内建支持 | **语义级，一票否决项** |
| A2 | **表格列宽按最长单元格重排填充**——语义无损但逐字节 diff 不再成立，git diff 膨胀、1a 区间引擎的逐字节对齐基线被破坏 | 字节级 |
| A3 | managed 区间 HTML 注释标记可保留（唯一的好消息，但仅是 html 节点 passthrough） | — |
| A4 | **无序列表 `-` 被重写为 `*`**（remark stringify 默认 bullet 规范）；可配置，但每个配置项都是一个独立雷区 | 字节级 |
| A5 | **文末无换行的文档被强制补换行**；带尾换行的同构文档可逐字节往返——A 的可保真上限形态是「标题/引用/代码等受限子集 + 规范化行尾」 | 字节级 |

**A 路线判定：未过门槛。** 与 v2 纪要 §14.3 的风险预判一致（"ProseMirror 系 serialize 保真是著名雷区"），且实测损失比预判更早出现——连最普通的列表符号都保不住。

## 3. 路线 B 实测结果

文本缓冲契约用例全过：典型编辑后其余字节逐字不变、编辑输出与纯字符串拼接逐字节一致（无 parse/serialize 介入）、managed 区间与 frontmatter 在区间外编辑下逐字未动。**B 的保真度是架构性质（缓冲区即 md 纯文本，不存在序列化往返），不是实现调优结果**——对 fixtures 全集结构性全过，包括 A 覆灭的 frontmatter/表格/列表形态。

## 4. 结论与决策

1. **选型：路线 B（CodeMirror live-preview 装饰渲染）为 DocumentSurface 编辑形态**。复用现有 `mdx-editor.tsx` 的 CodeMirror 6 底座升级装饰层，保真度零风险，managed 区间天然安全。
2. **A 路线封存**：不再投入 Milkdown/Tiptap 评估；若未来产品强需求块级拖拽等重交互再复测（复测条件：remark-frontmatter 补齐 + bullet/表格配置全量调优 + prosemirror 模型层实测，预计成本高）。
3. `apm://` chip 内嵌（v2 纪要 §13）在 B 形态下用 CodeMirror 装饰替换实现（文本保持 `[标题](apm://...)` 原文，视觉渲染为 chip），与保真度契约兼容。
4. 测试集转为长期门槛资产：未来任何编辑器形态变更（含 B 的实现升级）须全绿本套件。

## 5. 遗留说明

- B 的短板（v2 纪要 §14.3 已列）不因选型消失：块级拖拽、表格所见即编辑上限低——以「源码视图切换态」兜底（表格/HTML 编辑场景）。
- 本报告与测试均为 2026-09-08 remark@11 实测；remark 大版本升级后复跑。
