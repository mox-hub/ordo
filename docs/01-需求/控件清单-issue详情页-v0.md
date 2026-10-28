---
title: 控件清单 v0 —— PG-ISSUE-DETAIL（issue 详情页）静态盘点
description: 2026-09-09 夜航产出——issue 详情页 92 项可操作控件的代码级静态盘点（支线二首个试点），实机校验待用户
category: requirement
status:
  - active
version: 0.1.0
created: 2026-09-09
modified: 2026-09-09
id: REQ-CTRL-ISSUE-DETAIL-001
tags: "requirements, control-inventory, e2e, issue"
ai-session-types: all
ai-priority: medium
ai-freshness: static
ai-audiences: "session:all"
---

# 控件清单 v0 —— PG-ISSUE-DETAIL（issue 详情页）

> 配套 [[测试映射矩阵-v1]] §五模板的**首个试点**。
> **口径：代码级静态盘点**（基线 commit `c37d571`，2026-09-09 夜航），未实机校验——各弹层开合、防抖节奏、流式展示均为静态推断，**实机校验待用户**。
> 盘点范围：`task-detail-page.tsx` 及其直接渲染子组件；**不含**看板/列表/抽屉/甘特图（待后续盘点）。用例名一律留空（待支线二排期补测）。

## 一、头部工具条（SubPageToolbar）

| ID | 控件 | 类型 | 预期行为/API | 位置 | 覆盖①-⑤ | 用例名 | 状态 |
|----|------|------|--------------|------|----------|--------|------|
| PG-ISSUE-CTRL-01 | 返回（ArrowLeft） | button | `navigate(-1)` | 工具条最左 | | | todo |
| PG-ISSUE-CTRL-02 | 面包屑「任务」 | link | 跳 `/app/issues` | 工具条左 | | | todo |
| PG-ISSUE-CTRL-03 | 面包屑「{项目名}」 | link | 跳 `/app/projects/:id`（无项目不渲染） | 工具条左 | | | todo |
| PG-ISSUE-CTRL-04 | Previous（硬编码英文） | button | 项目内上一任务；首条禁用 | 翻页器 | | | todo |
| PG-ISSUE-CTRL-05 | Next（硬编码英文） | button | 项目内下一任务；末条禁用 | 翻页器 | | | todo |
| PG-ISSUE-CTRL-06 | 收藏星标 | switch 型 button | zustand 本地持久化，无 API | actions | | | todo |
| PG-ISSUE-CTRL-07 | 订阅按钮（头像栈/UserRoundPlus） | popover 触发 | 打开订阅者浮层，拉全量成员 | actions | | | todo |
| PG-ISSUE-CTRL-07.1 | └ 更改订阅者搜索框 | input | 前端过滤成员 | 浮层内 | | | todo |
| PG-ISSUE-CTRL-07.2 | └ 成员/智能体勾选行 | checkbox | 勾选即全量替换 `PUT /subscriptions` | 浮层内 | | | todo |
| PG-ISSUE-CTRL-08 | Hide/Show sidebar（硬编码英文） | button | 本地 state 收展右侧栏 | 工具条最右 | | | todo |

## 二、主栏·标题与元信息

| ID | 控件 | 类型 | 预期行为/API | 位置 | 覆盖①-⑤ | 用例名 | 状态 |
|----|------|------|--------------|------|----------|--------|------|
| PG-ISSUE-CTRL-09 | 标题输入框 | textarea | 1500ms 防抖 `PATCH /issues/:id {title}`；失败横幅 | 标题行 | | | todo |
| PG-ISSUE-CTRL-10 | 父任务标题链接 | link+预览卡 | 跳父任务；hover 400ms 弹预览卡（仅子任务） | 来源行 | | | todo |
| PG-ISSUE-CTRL-11 | Linear 外部标识徽章 | link | 新窗口开 externalUrl；无 URL 禁点 | 元信息行 | | | todo |

## 三、主栏·描述区

| ID | 控件 | 类型 | 预期行为/API | 位置 | 覆盖①-⑤ | 用例名 | 状态 |
|----|------|------|--------------|------|----------|--------|------|
| PG-ISSUE-CTRL-12 | 编辑（Pencil，hover 显形） | button | 进 MarkdownEditor 编辑态 | 区标题右 | | | todo |
| PG-ISSUE-CTRL-13 | 描述正文/「添加描述…」 | button | 点击进编辑态 | 描述区 | | | todo |
| PG-ISSUE-CTRL-14 | 描述编辑器（live 双栏+@补全） | textarea | 1500ms 防抖 `PATCH {description}`；@ 触发成员+文档补全 | 编辑态 | | | todo |

## 四、主栏·执行项区（ExecutionItemsPanel）

| ID | 控件 | 类型 | 预期行为/API | 位置 | 覆盖①-⑤ | 用例名 | 状态 |
|----|------|------|--------------|------|----------|--------|------|
| PG-ISSUE-CTRL-15 | 「+」添加执行项 | button | 展开内联表单（旋转 45°） | 区标题右 | | | todo |
| PG-ISSUE-CTRL-16 | 执行项标题（必填） | input | 本地 state | 内联表单 | | | todo |
| PG-ISSUE-CTRL-17 | 描述（可选） | input | 本地 state | 内联表单 | | | todo |
| PG-ISSUE-CTRL-18 | 执行人下拉（仅人类成员） | select | 本地 state | 内联表单 | | | todo |
| PG-ISSUE-CTRL-19 | 预估工时（小时） | number input | 提交时换算分钟 | 内联表单 | | | todo |
| PG-ISSUE-CTRL-20 | 创建 | button | `POST /issues/:id/executions` | 内联表单 | | | todo |
| PG-ISSUE-CTRL-21 | 查看执行日志 | button | 打开 RunDetailsDialog | 行内 | | | todo |
| PG-ISSUE-CTRL-22 | 更多操作菜单 | dropdown | 次级流转 + CLI 派发入口 | 行内 | | | todo |
| PG-ISSUE-CTRL-22.1 | └ 次级流转项 | menu item | `PATCH /execution/runs/:id {status}` | 菜单 | | | todo |
| PG-ISSUE-CTRL-22.2 | └ 派发 CLI 执行（仅 AI 项+特定状态） | menu item | `POST /ai/issues/:id/dispatch-cli` | 菜单 | | | todo |
| PG-ISSUE-CTRL-23 | 主流转按钮（按状态机显示） | button | `PATCH /execution/runs/:id {status}` | 行内下方 | | | todo |
| PG-ISSUE-CTRL-24 | RunDetails：Info 按钮 | button | 切运行信息面板 | 执行弹窗 | | | todo |
| PG-ISSUE-CTRL-25 | RunDetails：事件/原始日志切换 | tab 对 | 切视图 | 执行弹窗 | | | todo |
| PG-ISSUE-CTRL-26 | RunDetails：事件条目/关闭 | list+button | 选步骤出详情；关闭返回 | 执行弹窗 | | | todo |

## 五、主栏·子任务区

| ID | 控件 | 类型 | 预期行为/API | 位置 | 覆盖①-⑤ | 用例名 | 状态 |
|----|------|------|--------------|------|----------|--------|------|
| PG-ISSUE-CTRL-27 | 「+」添加子任务 | button | 展开创建卡 | 区标题右 | | | todo |
| PG-ISSUE-CTRL-28 | 子任务行 | link | 跳 `/app/issues/:subId` | 列表 | | | todo |
| PG-ISSUE-CTRL-29 | 子任务标题（必填校验） | textarea | 本地 state | 创建卡 | | | todo |
| PG-ISSUE-CTRL-30 | 添加描述… | textarea | 本地 state | 创建卡 | | | todo |
| PG-ISSUE-CTRL-31 | 取消 | button | 关表单清草稿 | 创建卡底 | | | todo |
| PG-ISSUE-CTRL-32 | 保存子任务 | button | `POST /issues`（带 parentIssueId），toast | 创建卡底 | | | todo |

## 六、主栏·动态/评论区（ActivityFeed）

| ID | 控件 | 类型 | 预期行为/API | 位置 | 覆盖①-⑤ | 用例名 | 状态 |
|----|------|------|--------------|------|----------|--------|------|
| PG-ISSUE-CTRL-33 | 回复（hover 显形） | button | 评论框插 `@作者名` 聚焦 | 评论卡头 | | | todo |
| PG-ISSUE-CTRL-34 | 编辑（仅本人） | button | 行内编辑态 | 评论卡头 | | | todo |
| PG-ISSUE-CTRL-35 | └ 取消/保存 | button | `PATCH /activities/comments/:id` | 编辑态 | | | todo |
| PG-ISSUE-CTRL-36 | 删除（仅本人，**无二次确认**） | button | `DELETE /activities/comments/:id` | 评论卡头 | | | todo |
| PG-ISSUE-CTRL-37 | 表情回应 chip | button | toggle `POST /activities/:id/reactions` | ReactionBar | | | todo |
| PG-ISSUE-CTRL-38 | 添加表情回应 | popover | EmojiPicker，选中即 toggle | ReactionBar 尾 | | | todo |
| PG-ISSUE-CTRL-39 | 评论输入框 | textarea | `Ctrl/⌘+Enter` 发送 | 动态底部 | | | todo |
| PG-ISSUE-CTRL-39.1 | └ 编写/预览切换 | tab 对 | 切编辑/渲染 | 评论框底栏 | | | todo |
| PG-ISSUE-CTRL-40 | 插入表情 | popover | 插入光标处 | 评论框底栏 | | | todo |
| PG-ISSUE-CTRL-41 | 发送评论 | button | `POST /activities/comments` | 评论框底栏 | | | todo |

## 七、右栏·操作条 + 行内问 AI

| ID | 控件 | 类型 | 预期行为/API | 位置 | 覆盖①-⑤ | 用例名 | 状态 |
|----|------|------|--------------|------|----------|--------|------|
| PG-ISSUE-CTRL-42 | 问 AI（hover 显形） | button | 展/收 AnchorQaThread | 按钮组 | | | todo |
| PG-ISSUE-CTRL-43 | 问答输入框 | input | `POST /ai/assistant/silent {scenario:'anchor-qa'}` | 问 AI 线程 | | | todo |
| PG-ISSUE-CTRL-44 | 发送 | button | 同上 | 问 AI 线程 | | | todo |
| PG-ISSUE-CTRL-45 | 关闭（X/Esc） | button | 收起线程 | 问 AI 线程 | | | todo |
| PG-ISSUE-CTRL-46 | 答案动作按钮（白名单 status/priority/dueDate） | button | `PATCH /issues/:id`；用后变「已应用」 | 答案下方 | | | todo |
| PG-ISSUE-CTRL-47 | 让我细聊 | button | 携草稿开助手侧板 | 线程底部 | | | todo |
| PG-ISSUE-CTRL-48 | 进办公室 | link | 跳 `/app/office` | 线程底部 | | | todo |
| PG-ISSUE-CTRL-49 | 指派 AI/重新派发 AI | dialog 触发 | 打开 AiAssignDialog | 按钮组 | | | todo |
| PG-ISSUE-CTRL-49.1 | └ AI 员工选择卡 | select 型 button | 本地选中态 | 弹窗 | | | todo |
| PG-ISSUE-CTRL-49.2 | └ 取消/派发并执行 | button | `POST /ai/assign-issue`；警告 toast | 弹窗 | | | todo |
| PG-ISSUE-CTRL-50 | 删除（红色圆形） | dialog 触发 | 删除确认弹窗 | 按钮组 | | | todo |
| PG-ISSUE-CTRL-50.1 | └ 取消/删除 | button | `DELETE /issues/:id` → 跳列表 | 弹窗 | | | todo |

## 八、右栏·属性卡

| ID | 控件 | 类型 | 预期行为/API | 位置 | 覆盖①-⑤ | 用例名 | 状态 |
|----|------|------|--------------|------|----------|--------|------|
| PG-ISSUE-CTRL-51 | 属性卡折叠开关 | button | 受控折叠 | 卡标题行 | | | todo |
| PG-ISSUE-CTRL-52 | 状态 CapsuleSelect | select | `PATCH {status}`；⚠️ 选「无」实落 `todo` | 属性行 | | | todo |
| PG-ISSUE-CTRL-53 | 强制关闭（拦截条内） | button | 二次确认 → `PATCH {status, force:true}` | 状态下方 | | | todo |
| PG-ISSUE-CTRL-54 | 执行项信号徽标 | 静态展示 | 非交互 | 状态下方 | — | — | — |
| PG-ISSUE-CTRL-55 | 优先级 CapsuleSelect | select | `PATCH {priority}`；⚠️ 「无」实落 `medium` | 属性行 | | | todo |
| PG-ISSUE-CTRL-56 | 负责人 CapsuleSelect | select | `POST /issue-assignees` + DELETE（不走 PATCH assigneeId）；选 AI 员工自动派发 | 属性行 | | | todo |
| PG-ISSUE-CTRL-57 | 项目 CapsuleSelect | select | `PATCH {projectId}`（空=收件箱） | 属性行 | | | todo |
| PG-ISSUE-CTRL-58 | 里程碑 CapsuleSelect | select | `PATCH {milestoneId}` | 属性行 | | | todo |
| PG-ISSUE-CTRL-59 | 标签 CapsuleSelect | select | `PATCH {tags}`；⚠️ 展示多选提交单选 | 属性行 | | | todo |
| PG-ISSUE-CTRL-60 | 截止日期 DateCapsuleField | date picker | `PATCH {dueDate}` | 属性行 | | | todo |
| PG-ISSUE-CTRL-61 | 清除截止日期 | button | `PATCH {dueDate: undefined}` | 日期弹层底 | | | todo |

## 九、右栏·自定义字段卡

| ID | 控件 | 类型 | 预期行为/API | 位置 | 覆盖①-⑤ | 用例名 | 状态 |
|----|------|------|--------------|------|----------|--------|------|
| PG-ISSUE-CTRL-62 | 卡片折叠开关 | button | 不受控折叠 | 卡标题行 | | | todo |
| PG-ISSUE-CTRL-63 | 编辑 | button | 进编辑态（草稿按 schema 初始化） | 卡标题右 | | | todo |
| PG-ISSUE-CTRL-64 | 动态字段控件（schema 驱动六型） | 混合 | 写本地 draft | 编辑态 | | | todo |
| PG-ISSUE-CTRL-65 | 取消/保存 | button | `PATCH {customFields}`（null=删除语义） | 编辑态底 | | | todo |

## 十、右栏·建议卡 / 关联文档卡

| ID | 控件 | 类型 | 预期行为/API | 位置 | 覆盖①-⑤ | 用例名 | 状态 |
|----|------|------|--------------|------|----------|--------|------|
| PG-ISSUE-CTRL-66 | 建议卡折叠开关 | button | 受控折叠 | 卡标题行 | | | todo |
| PG-ISSUE-CTRL-67 | 建议条目 ×4 | button | **无 onClick，纯装饰（代码事实）** | 建议卡 | | | todo |
| PG-ISSUE-CTRL-68 | 关联文档卡折叠开关 | button | 不受控折叠 | 卡标题行 | | | todo |
| PG-ISSUE-CTRL-69 | 关联文档行 | link | 跳 `/app/documents/:id` | 卡内 | | | todo |

## 十一、右栏·外部集成区（Linear，条件渲染）

| ID | 控件 | 类型 | 预期行为/API | 位置 | 覆盖①-⑤ | 用例名 | 状态 |
|----|------|------|--------------|------|----------|--------|------|
| PG-ISSUE-CTRL-70 | 外部集成卡折叠开关 | button | 不受控折叠 | 卡标题行 | | | todo |
| PG-ISSUE-CTRL-71 | 推送到 Linear（未关联态） | dialog 触发 | 确认弹窗 | 面板 | | | todo |
| PG-ISSUE-CTRL-71.1 | └ 取消/推送 | button | `POST /integrations/linear/sync/issue/push-create` | 弹窗 | | | todo |
| PG-ISSUE-CTRL-72 | Linear 徽章（已关联） | link | 开 externalUrl | 面板 | | | todo |
| PG-ISSUE-CTRL-73 | 在 Linear 中打开 | link | 开 externalUrl | 面板 | | | todo |
| PG-ISSUE-CTRL-74 | 立即同步 | button | `POST /integrations/linear/sync/issues` | 面板 | | | todo |
| PG-ISSUE-CTRL-75 | Resolve（compact 冲突态） | button→菜单 | 展开三选项 | 面板 | | | todo |
| PG-ISSUE-CTRL-75.1 | └ Use Linear/Local/Keep Both | menu item | `POST .../resolve {resolution}` | 菜单 | | | todo |
| PG-ISSUE-CTRL-76 | Use Linear/Local/Keep Both（全卡态） | button ×3 | 同上 | 面板 | | | todo |
| PG-ISSUE-CTRL-77 | 同步错误提示 | Tooltip | hover 显示错误 | 面板 error 态 | | | todo |

## 十二、右栏·GitHub 集成（条件渲染）

| ID | 控件 | 类型 | 预期行为/API | 位置 | 覆盖①-⑤ | 用例名 | 状态 |
|----|------|------|--------------|------|----------|--------|------|
| PG-ISSUE-CTRL-78 | 仓库输入框 | input | 本地 state 驱动 PR 查询 | GitHub 卡 | | | todo |
| PG-ISSUE-CTRL-79 | 刷新 | button | 重拉 `GET /integrations/github/:id/pulls` | GitHub 卡 | | | todo |
| PG-ISSUE-CTRL-80 | 新建 PR（toggle） | button | 展/收创建表单 | GitHub 卡 | | | todo |
| PG-ISSUE-CTRL-81 | PR 标题/Head/Base/描述 | input ×4 | 本地 state | 表单 | | | todo |
| PG-ISSUE-CTRL-82 | 取消/提交 | button | createPull 后 refetch；必填禁用态 | 表单 | | | todo |
| PG-ISSUE-CTRL-83 | PR 行 | link | 新窗口开 htmlUrl | PR 列表 | | | todo |

## 十三、右栏·验收契约

| ID | 控件 | 类型 | 预期行为/API | 位置 | 覆盖①-⑤ | 用例名 | 状态 |
|----|------|------|--------------|------|----------|--------|------|
| PG-ISSUE-CTRL-84 | 验收卡折叠开关 | button | 不受控折叠 | 卡标题行 | | | todo |
| PG-ISSUE-CTRL-85 | 验收标题链接 | link | 跳 `/app/acceptance/:id` | 验收卡 | | | todo |
| PG-ISSUE-CTRL-86 | PR 证据链接 | link | 开 PR 地址 | 证据区 | | | todo |
| PG-ISSUE-CTRL-87 | 接收（绿） | button | `POST /acceptance/:id/accept-completion`；阻断弹清单 Dialog | 操作行 | | | todo |
| PG-ISSUE-CTRL-88 | 驳回（红边） | dialog 触发 | 驳回原因弹窗 | 操作行 | | | todo |
| PG-ISSUE-CTRL-88.1 | └ 原因 textarea + 确认 | textarea+button | `POST .../reject-completion {reason}` | 弹窗 | | | todo |
| PG-ISSUE-CTRL-89 | 新建验收契约 | dialog 触发 | AcceptanceFormDialog（绑当前任务） | 验收卡 | | | todo |
| PG-ISSUE-CTRL-89.1 | └ 任务/类型/标题/描述表单 | 混合 | 本地 state | 弹窗 | | | todo |
| PG-ISSUE-CTRL-89.2 | └ 取消/创建 | button | `POST /acceptance` | 弹窗 | | | todo |

## 附：task-detail-tabs.tsx（疑似死代码，仅登记事实）

| ID | 控件 | 类型 | 预期行为/API | 状态 |
|----|------|------|--------------|------|
| PG-ISSUE-CTRL-90 | Execution/Approvals/Discussion Tabs（硬编码英文） | tab 切换 | 本地 state | todo |
| PG-ISSUE-CTRL-91 | 「Add a comment...」textarea ×2 | textarea | 仅本地 state | todo |
| PG-ISSUE-CTRL-92 | Send 按钮 | button | **无 onClick——点击无行为（疑似未完成）** | todo |

> ⚠️ 全仓 grep 未发现 `TaskDetailSheetTabs` 的任何外部引用——该文件不在详情页渲染树中，疑为旧版 drawer 遗留。**待用户裁决是否删除。**

## 盘点发现的待确认点（静态推断，实机校验待用户）

1. 状态选「无」实际提交 `todo`（`v || 'todo'`），并非清空语义；
2. 优先级选「无」实际落 `medium`；
3. 标签展示多标签（`+N`）但提交为单选（`[v]`/`[]`）；
4. 建议卡四个建议按钮无 onClick，纯装饰；
5. 评论删除无二次确认；「回复」只是插 `@名`，非楼层引用；
6. 工具条 Previous/Next/Hide sidebar 硬编码英文未走 i18n；
7. 外部集成/GitHub 区为条件渲染，实际页面可能不出现；
8. 负责人保存走 `issue-assignees` 接口而非 PATCH issue（刻意设计，测试勿期待 `PATCH {assigneeId}`）。
