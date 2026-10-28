---
title: ZCode 官方插件设计方案（CAP-S-04）
description: Ordo 平台的 ZCode 插件——工单可视化 · 会话落账 · 工单驱动会话 · 双向实时同步 · 自动化定制；四批交付基线与评审问题清单
id: ROADMAP-ZCODE-PLUGIN-001
category: roadmap
status: draft-review
version: 1.0.0
created: '2026-10-27'
modified: '2026-10-27'
scope: packages/zcode-plugin（拟）+ apps/server mcp-server（批二/三小改）
ai-priority: critical
tags: 'zcode, plugin, mcp, 工单, 双向同步, 自动化, CAP-S-04'
ordo_project_id: cmu8iciuo001sfyo0kc7uj6m1
ordo_file_type: document
ordo_sync_mode: managed
---

# ZCode 官方插件设计方案（CAP-S-04）

> 能力卡：`docs/01-需求/能力清单-v1.md` §4.7 **CAP-S-04**（doing，方案先行中）。
> 本文是评审稿：**§十一 的开放问题清单是评审焦点**，其余章节为四批交付基线。
> 状态词：批一~批四全部未开工；评审通过后批一置 doing 并回填卡面分批注记。

## 一、背景与裁决记录

**一行声明**（2026-10-27 requirement-intake 登记）：为 ZCode 开发官方 Ordo 插件——不离开编码环境即可查看/操作 Ordo 工单：可视化浏览、会话内容一键落账、Ordo 工单一键开 ZCode 新会话并关联执行、工单变更双向实时同步、自动化定制。

**用户四裁决**（AskUserQuestion）：

1. 立即开工，分批实施；
2. 新立 CAP-S-04（S-02 通道 B 由其承接，S-02 不再单独实施通道 B）；
3. 「一键转任务」语义 = **会话落账**（ZCode 会话中的想法/结论一键登记为 Ordo 工单）+ **工单驱动会话**（Ordo 中的工单一键开一个新对话任务，并关联工单执行——用户原话「反向的，ordo 中的工单，可以一键开一个新对话任务，并关联工单执行」）；
4. **方案先行**：本设计纪要评审通过后动批一代码。

**冲突检测结论**：CAP-S-02 通道 B 高度重叠且已规划未动（本卡承接）；插件打包形态 / ZCode 内可视化 / Ordo→ZCode 反向推送 / 自动化定制四域无卡覆盖；CAP-A-31 方向相反不冲突；§五治理骨架无冲突——**写操作全走既有门禁是本方案红线**（§十）。

## 二、现状与技术底座（全部实测，非推测）

| # | 事实 | 证据 |
|---|------|------|
| 1 | **Ordo REST 原生接受 PAT**，且 PAT 按 ALS 路由库查（`x-workspace-id` 头 + PAT = 多工作区路由可达） | `apps/server/src/common/guards/jwt-auth.guard.ts:63`（`ordo_pat_` 前缀走 `AccessTokenService.validate`）+ 守卫注释「PAT 校验都按 ALS 路由库查」 |
| 2 | **Ordo 已有 MCP server**（SSE 传输）：`GET /_api/mcp/sse?token=PAT` + `POST /_api/mcp/messages`，12 工具（list_tasks/get_task_context/claim_task/update_task_status/submit_task_result/request_approval/dispatch_task_to_cli/get_context/search_entities/get_cli_providers/configure_cli_provider/health_check_cli_provider） | `apps/server/src/modules/mcp-server/mcp-server.controller.ts` + `mcp-server.service.ts:195` |
| 3 | **MCP 12 工具无 workspace 解析**（grep 零命中）——工具实现跑默认工作区库；多工作区场景 REST 通道（事实 1）反而更完备 | `mcp-server.service.ts` 全文无 workspace 处理 |
| 4 | **ZCode 插件机制完整**：`.zcode-plugin/plugin.json`（skills/commands/mcpServers/userConfig 声明）+ `.mcp.json` + `hooks/hooks.json`；userConfig 支持 `${user_config.xxx}` 环境注入；官方 android-emulator 插件为完整样板 | `~/.zcode/cli/plugins/cache/zcode-plugins-official/android-emulator/0.1.0/` |
| 5 | **ZCode Gen UI 可会话内渲染 HTML fragments**（桌面/CLI/远程均可），会话有专属可视化目录 | ZCode 桌面宿主说明 + visualize skill 既有实践（design-system 画廊等已用） |

**架构含义**：桥进程主通道选 **REST（PAT + x-workspace-id）** 而非代理 MCP SSE——REST 是全量 API 面（issues CRUD / 评论 / 项目 / 验收 / 里程碑…），天然多工作区，且批一零 Ordo 侧改动即可成立。MCP SSE 通道（事实 2）保留给「无插件的裸 ZCode 简单接入」场景（S-02 原语义），插件不复用它。

## 三、总体架构

```
┌─────────────────────────── ZCode 会话 ────────────────────────────┐
│  skills（ordo 工作流 / 可视化渲染规范）  commands（/ordo /ordo-issue） │
│  hooks（批四：Stop 自动回账 / 注入提醒）                              │
│        │ MCP 工具调用（stdio）                                       │
│        ▼                                                            │
│  ┌─────────────── ordo-mcp-bridge（插件内嵌桥进程）──────────────┐  │
│  │ ① stdio MCP server：对 ZCode 暴露 ordo_* 工具面（§5.2）        │  │
│  │ ② Ordo REST client：PAT + x-workspace-id（读写主通道）         │  │
│  │ ③ 事件通道（批二）：socket.io client 订事件网关 → 注入信号      │  │
│  │ ④ 会话-工单映射账本（批三）：本地 json + Ordo 侧评论镜像        │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
└─────────────────────────────┼──────────────────────────────────────┘
                              ▼ HTTPS（PAT + x-workspace-id）
                    Ordo server（REST /_api/* + /events 网关）
                              │
                    信任门禁 / 审批 / 验收链（不旁路，§十）
```

**桥进程是唯一有 Ordo 凭据的组件**；skills/commands/hooks 只经 MCP 工具面或本地信号文件间接工作，PAT 不落任何其他位置。

## 四、插件包结构与用户配置

```
packages/zcode-plugin/               # monorepo 新包，name = @ordo/zcode-plugin
├── .zcode-plugin/plugin.json        # 插件清单（userConfig 声明在此）
├── .mcp.json                        # 桥进程启动声明（stdio，node dist/bridge.js）
├── skills/
│   ├── ordo/SKILL.md                # 主工作流：何时查工单/如何落账/如何回流（触发词+流程）
│   └── ordo-board/SKILL.md          # 可视化渲染规范：Gen UI 面板模板与状态语义映射
├── commands/
│   ├── ordo.md                      # /ordo：工单面板总入口（拉数据+渲染）
│   ├── ordo-issue.md                # /ordo-issue <shortId>：工单驱动会话入口（批三）
│   └── ordo-log.md                  # /ordo-log：把本会话结论落账为工单/评论
├── hooks/hooks.json                 # 批四填充
├── src/bridge/                      # 桥进程（TypeScript → esbuild 单文件 dist/bridge.js）
│   ├── server.ts                    # stdio MCP server（@modelcontextprotocol/sdk）
│   ├── ordo-client.ts               # REST client（PAT + x-workspace-id + 重试/超时）
│   ├── events.ts                    # 批二：socket.io client + 轮询兜底
│   └── links.ts                     # 批三：会话-工单映射账本
└── package.json
```

**plugin.json userConfig**（ZCode 设置页表单自动生成，`${user_config.*}` 注入桥进程 env）：

| 键 | 说明 | 默认 |
|----|------|------|
| `base_url` | Ordo server 地址（如 `http://127.0.0.1:4300`） | 空（必填，未配置时全部工具返回引导性错误） |
| `pat` | PAT（`ordo_pat_` 前缀，设置页-访问令牌签发） | 空（必填） |
| `workspace_id` | 目标工作区 id（`x-workspace-id` 头） | 空（空 = default 库） |
| `poll_seconds` | 批二轮询兜底间隔 | `30` |
| `auto_push` | 批四 Stop 自动回账开关 | `off` |

PAT 安全：仅经 env 进桥进程内存；桥不写盘、不打日志（logger 一律脱敏 `ordo_pat_***`）；README 警示勿将 PAT 提交进任何仓库。

## 五、批一：插件骨架 + REST 读写 + 可视化 + 会话落账（零 Ordo 侧改动）

### 5.1 交付判据

本机 `zcode --plugin-dir packages/zcode-plugin`（或 config.json enabledPlugins）后：会话内 `/ordo` 出工单面板；对话中「把刚才的结论记成工单」走确认链建单成功，Ordo web 端可见；拔掉 PAT 全部工具显式报错。全程不改 Ordo 一行代码。

### 5.2 MCP 工具面（桥进程对 ZCode 暴露）

为「会话内使用」重新设计（不复刻 12 工具原面），统一 `ordo_` 前缀：

| 工具 | 入参 | 语义（REST 映射） | 模式 |
|------|------|------------------|------|
| `ordo_health` | — | 连接/认证/工作区三段自检（排障第一入口；返回 base_url 掩码、工作区名、PAT 前四位） | 读 |
| `ordo_list_projects` | — | `GET /projects`（选项目/落账归属用） | 读 |
| `ordo_list_issues` | `projectId?/status?/type?/assigneeId?/q?/limit?` | `GET /issues` + filter-query（看板/列表数据源） | 读 |
| `ordo_get_issue` | `issueId` | `GET /issues/:id` 聚合详情 + 评论 + 验收标准摘要 + 执行记录摘要 | 读 |
| `ordo_create_issue` | `projectId/title/description?/type?/priority?/assigneeId?/milestoneId?` | `POST /issues`（**会话落账唯一写入口**，§5.4） | 写 |
| `ordo_update_issue` | `issueId/status?/assigneeId?/priority?/comment?` | `PATCH /issues/:id` + `POST /issues/:id/comments`（comment 独立参数避免误改主体） | 写 |
| `ordo_search` | `q` | `GET /search`（跨实体，工单驱动会话定位用） | 读 |

异常流统一形状：`{ error: { code, message, hint } }`——401 带「PAT 失效，去设置页重签」hint；网络失败带「检查 base_url 与 server 状态」hint；**绝不静默吞错**。

### 5.3 可视化（Gen UI 渲染规范）

`skills/ordo-board/SKILL.md` 定义渲染契约，模型经工具取数后生成 HTML fragment 写入会话可视化目录：

- **列表面板**：表格 = 类型徽标 + 标题 + 状态色点 + 负责人 + 更新时间；行尾「在 Ordo 打开」链接（`{base_url}` 由工具结果携带，不硬编码）。
- **看板面板**：按状态分组泳道（状态语义读工具返回的 `statusGroup`，不自造颜色映射——状态色从 `StatusDefinition` 服务端字段透传）。
- **详情卡**：描述渲染（markdown 简化版）+ 验收标准清单 + 最近评论三条 + 执行记录摘要。
- 渲染红线：**只读展示层**——面板里不放「点我改状态」的假按钮；一切写操作走对话确认链（§5.4），面板仅承载跳转链接与数据。

### 5.4 会话落账（确认链，主轴语法「AI 代写 → 人确认」）

触发：对话中显式说「记成工单/落账」或 `/ordo-log` 命令。流程：

1. AI 从会话上下文起草：标题/描述/建议项目与类型（`ordo_list_projects` 定归属，歧义时问）；
2. **向人呈现草稿卡（对话文本）并等确认**——用户可改字段；
3. 确认后才调 `ordo_create_issue`（skill 明文规定：**未确认禁止调用**；yolo 模式下同样走确认，这是 skill 纪律不是权限依赖）；
4. 成功回执带 shortId + Ordo 链接；失败保留草稿于会话中可重试（桥不缓存草稿，会话即草稿容器）。

### 5.5 批一明确不做

可视化写按钮、反向推送、会话-工单关联账本、hooks、Ordo 侧任何改动。

## 六、批二：Ordo→ZCode 反向实时推送桥

**目标**：Ordo 侧工单变更（状态/指派/评论/新工单）在 ZCode 会话中可见——「双向同步」的下行半边。

### 6.1 双轨制（对齐 A-19「事件驱动 + 轮询兜底」既定模式）

- **事件轨**：桥进程起 socket.io client 订 Ordo 事件网关（认证方式为 spike SP-2）；订阅白名单 = `issue.created/updated/commented` 族（读 `DomainEventTypes` 单源，不硬编码字面量）。
- **轮询轨（兜底，恒开）**：桥按 `poll_seconds` 轮询 `GET /issues?updatedSince=`，事件轨活跃时自动降频。

### 6.2 注入机制（两级，批二只做第一级）

1. **信号文件（本批）**：桥把增量摘要写本地信号文件（`~/.zcode/plugin-data/ordo/last-changes.json`）；`hooks/hooks.json` 配 `UserPromptSubmit` hook 读信号文件，将「自上次交互：3 个工单有变更（BUG-12 状态→进行中…）」注入会话上下文。用户下一条消息即感知，零轮询噪声。
2. **主动打断（不做的理由）**：MCP 自定义 notification 在 ZCode 中的实际行为（是否注入运行中会话）未证实（SP-3），且「正在编码时被外部事件打断」违背 ZCode 会话主权——事件在用户下一次交互时呈现是产品语义，不是技术妥协。

### 6.3 冲突与幂等

- 信号文件带 `seq`（事件序号或 updatedSince 水位），重启不重放旧摘要；
- **同步方向裁决：Ordo 是工单状态真相源**。ZCode 侧对同一工单的本地缓存只作展示，不缓存编辑态——一切编辑即时写 Ordo（批一语义），天然无双写冲突。批二只下行展示，不做「ZCode 本地修改合并回 Ordo」。

## 七、批三：工单驱动会话与写通道收口

### 7.1 工单驱动会话（用户裁决语义③后半）

**ZCode 内触发**：`/ordo-issue <shortId>` 命令 → `ordo_get_issue` 取全上下文 → 生成会话启动注入（工单标题/描述/验收标准/关联执行摘要 + 「完成后向工单回流」指令）→ 会话在此上下文中开工。

**Ordo 侧拉起（可选项，评审定夺 OQ-2）**：Ordo 工单详情页「用 ZCode 打开」按钮 → 桌面壳 spawn `zcode "/ordo-issue <shortId>"`（要求本机 zcode CLI 在 PATH + 已装插件）。涉及 Ordo 前端 + 桌面壳小改，价值=把「去编码工具」的动作成本降为一次点击。

**关联执行与回流**：

- 桥本地账本（`links.json`）：`{ 会话标识(项目目录+时间戳), issueId, shortId, 开启时间, 回流记录[] }`；
- 回流动作 = `ordo_update_issue(comment)` 报告进展 + 状态建议（建议≠直改：`status` 参数仅当人明确说「关掉它/标记完成」才传，skill 明文）；
- **不做**：为交互式 ZCode 会话造 `Execution` 实体（执行状态机语义是 headless 派发的账，硬套会话污染口径）；成本归因若将来需要，走 AIUsageLog 既有通道另行立项。

### 7.2 写通道收口（走门禁，不旁路）

- 指派 AI 成员/派发：仍走 Ordo 既有 `dispatch_task_to_cli`（MCP）或 REST 派发端点——信任门禁在服务端，插件只是入口；
- 审批/验收：插件**只读呈现**决策卡与验收状态（`ordo_get_issue` 摘要），拍板动作引导回 Ordo 界面（决策卡是人类决策界面，CAP-C-04 边界）；
- 服务端校验不放松：PAT 权限即签发人权限，越权由 Ordo 既有 Roles 守卫拦截——插件侧零特权。

## 八、批四：自动化定制

| 件 | 形态 | 门禁 |
|----|------|------|
| Stop 自动回账 | `hooks/hooks.json` Stop hook：会话有关联工单且有未回流变更 → 追加评论（`auto_push=on` 时自动；off 时只提示） | 失败不阻断 ZCode 退出；只追加评论不改状态 |
| cron 巡检模板 | 文档提供 ZCode automations 预置模板（每日过期工单巡检 → 会话内汇报） | 只读 |
| workflow 联动 | 文档化既有通道：Ordo workflow v2 agent 节点已可派发 zcode goal（CAP-S-03），ZCode 会话完成经事件推进 wait 节点——插件补「本地会话完成 → 触达 Ordo」的评论回流闭环 | 走既有门禁 |
| userConfig 定制面 | `auto_push`/`poll_seconds`/订阅事件族开关 | — |

「更高级的自动化定制」的边界：插件提供**挂点与模板**，编排语义归 Ordo workflow v2（不造第二套编排引擎，对齐 §二主轴「显式编排 vs 学习型」划界）。

## 九、模式适配矩阵

| ZCode 场景 | 读工具 | 写工具 | 可视化 | 推送注入 |
|-----------|--------|--------|--------|---------|
| plan 模式 | ✅ | 工具返回「当前 plan 模式，切换后可写」提示 | ✅ | ✅ |
| build / edit / guarded | ✅ | ZCode 权限系统逐次确认（MCP 工具内建行为） | ✅ | ✅ |
| yolo | ✅ | 自动执行（落账确认链仍由 skill 纪律强制，§5.4） | ✅ | ✅ |
| headless `-p`（S-02 goal 场景） | ✅ | 按 `--mode` | 不渲染（返回结构化文本） | ❌（无交互会话） |
| 桌面壳 / CLI / 远程 SSH | 同上 | 同上 | Gen UI 均可渲染 | 桥进程随插件走，均可 |

适配实现零成本说明：读写与模式判定全是 ZCode 内建权限行为，插件只保证「不诱导绕过 + plan 模式给可读提示」。

## 十、安全与治理红线（不可协商）

1. **不旁路门禁**：写操作全部经 Ordo 服务端校验（信任等级/审批/验收链）；插件不提供改验收结论、绕审批、直写契约绑定的工具。
2. **PAT 最小暴露**：仅 userConfig → 桥进程 env → 内存；日志脱敏；README 警示。
3. **状态口径单源**：状态名/色/分组一律服务端透传（`StatusDefinition`），插件不硬编码第二套语义。
4. **确认链纪律入 skill**：落账必须人确认（连 yolo 也走）；状态直改仅限人明确指令。
5. **诚实降级**：断线/PAT 失效/工作区不可达全部显式报错带 hint，禁止静默空结果。

## 十一、Spike 项与开放问题（评审焦点）

**Spike（批一开工前完成，半天量级）**：

| # | 问题 | 验证法 |
|---|------|--------|
| SP-1 | PAT + `x-workspace-id` 经 REST 调 `/issues` 全链实测（守卫代码已证实接受 PAT，须实测确认响应形状与分页） | curl 起手即得 |
| SP-2 | 事件网关 socket.io 是否接受 PAT 认证（前端走 JWT；网关若拒 PAT，批二事件轨改轮询增强或 Ordo 侧网关加 PAT 握手——小改，届时破「批二零 Ordo 改动」预期并显式记录） | 最小 io client 连接实测 |
| SP-3 | ZCode hooks `UserPromptSubmit` 注入实测（信号文件 → 上下文注入链路 + 中文） | 空插件 hook demo |

**开放问题（请评审拍板）**：

| # | 问题 | 建议 |
|---|------|------|
| OQ-1 | 插件包落点：monorepo `packages/zcode-plugin`（dogfooding + 同仓发版）还是独立仓库（面向外部 ZCode 用户的独立分发物）？ | 先 monorepo；registry 分发是后话 |
| OQ-2 | Ordo 侧「用 ZCode 打开」按钮（§7.1 可选项）批三做不做？ | 做——一键开会话是用户点名的核心语义 |
| OQ-3 | 可视化是否需要「非会话常驻面板」？ | 当前插件机制无 panel API，Gen UI 会话内渲染起步；ZCode 出 panel 能力再评估 |
| OQ-4 | MCP 12 工具的 workspace 缺口（事实 3）：Ordo 侧是否补参？ | 插件走 REST 已绕开；裸 MCP 场景维持现状、文档标注限制即可 |

## 十二、测试义务（GAP-T-76 对齐，按批落地）

- **批一**：桥进程工具透传 spec（ordo_* → REST 断言）+ 401/断线/超时异常流 + 落账确认链（确认建单 / 取消零写 / 草稿保留）；
- **批二**：事件过滤与注入 spec（命中/不命中/桥挂回落轮询/seq 不重放）；
- **批三**：会话-工单映射 + 回流文案 + 「无 PAT 无写」门禁断言；
- **批四**：Stop hook 触发与失败不阻断。

验收基线：桥进程 vitest 单测 + 实机五步冒烟（配 PAT → /ordo 出面板 → 落账 → Ordo web 见单 → 改状态反向可见）。

---

**变更摘要**（本纪要自身）：docs | 新建设计纪要（CAP-S-04 方案先行交付物）| 影响分析=评审通过后批一动 `packages/zcode-plugin`（新包）| 同步状态=能力卡 GAP-T-76 已登记、S-02 承接注记已落、本稿 draft-review 待用户评审。
