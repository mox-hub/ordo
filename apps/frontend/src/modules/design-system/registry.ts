/**
 * 组件治理登记表 —— 单一真相源（E 类方案 §5.2「三处同源」）
 *
 * 三条同源链（单向再生，禁止反向手工编辑）：
 *   ① registry.ts ──生成──► COMPONENTS.md（`node scripts/gen-components-md.mjs`）
 *   ② registry.ts ──渲染──► design-system 画廊（2026-10-27 展示层路由化批起：索引卡片页
 *      + 每分区单页路由，demo 本体在 sections/gallery-sections.gen.tsx 机械切分产物 +
 *      Registry 对账区遍历 galleryExempt 豁免账；画廊覆盖率由 `check-component-registry.mjs`
 *      §4.2 ④ 门禁（扫 sections/ 目录）机器强制恒 100%——H 类批 H3 起 error，分母 ui+semantic
 *      双层、排除 internal 与 galleryExempt，2026-09-29 兑现）
 *   ③ registry.ts ──校验──► lint:registry（扫描真实引用回填 consumers，判定 LU）
 *
 * 字段口径：
 * - status 五态（canonical / standby / internal / review / deprecated）定义见
 *   docs/design/修改方案-E类-2026-09-27.md §19.3。
 * - section 采用设计系统页的 11 组组件类型分区（2026-09-29 由「层」维度重组，组序见该页
 *   SECTION_GROUPS：Governance / Foundations / Controls / Data Display / Feedback /
 *   Navigation / Overlays / Layout & Shells / AI Execution / App Patterns / Semantic）。
 *   ui/ raw/ semantic/ 三层共 103 条按该页 SECTIONS 数组的 group 口径归类；modules/ 与
 *   shared/ 组件不在画廊分区体系内，保留 'App Components'（AI 执行面模块件沿用
 *   'AI Execution'），画廊分区由该页 SECTIONS 承载，COMPONENTS.md 由 LAYER 维度承载。
 * - consumers 由 lint 脚本回填，本文件**不写静态值**（防推测值污染 LU 指标）。
 * - review 态必带 reviewBy；逾期须降级 deprecated 或升级 canonical（§19.3 防滥用条款）。
 * - deprecated 态必带 `expiresAt`（§19.6；由 `check-component-registry.mjs` 机器强制，逾期 CI 失败）。
 *   书写位置：紧跟 status 之后、review 块之前，如
 *   `status: 'deprecated', expiresAt: '2026-12-31', review: { … }`；`gen-components-md.mjs`
 *   与 `check-component-registry.mjs` 均已解析该槽位（2026-09-28 补齐）。
 * - `status: 'standby'` 且带 `review` 数据的条目 = 方案 §七 D 项裁决的
 *   「先标记、不删除，待人工在设计系统页审阅后裁决」集合。
 * - `galleryExempt` = 画廊豁免槽位（H 类方案 §2.1，2026-09-29 裁决）：登记一句话理由后
 *   该件不计入画廊覆盖率分母（check-component-registry.mjs §4.2 ④ 机器强制），
 *   但仍在 Registry 对账区可见。书写位置紧跟 status，条目保持严格单行。
 *
 * 维护约定：新增 components/ui 组件必须先在此登记，否则 lint:registry 双向对账失败。
 * G 类批 G0 起，`components/raw/`（登记 internal 态、不出画廊，裁决 G6）与
 * `components/semantic/` 的组件同样必须先在此登记（三分目录治理链，见 G 类方案 §四）。
 *
 * ⚠️ 冻结镜像（ADR-022，2026-11-08）：ui/raw/升层件（共 73）源码真相已迁
 * `@mox-hub/ui`（mox-hub/ordo-ui 独立仓，GitHub Packages 分发），主仓侧经纯 re-export
 * shim 消费。本表这些条目为**冻结镜像快照**——不再增改（画廊 demo 经 shim 仍渲染，
 * 覆盖率门禁分母与 100% 不变）；ui 层唯一真相 = `@mox-hub/ui/registry`（73 条，
 * 五态治理在彼仓延续）。semantic/modules/shared 条目仍在本表活维护。
 *
 * 2026-11-12（W4）：semantic/chart + AI Execution 共 72 条已迁 `@mox-hub/patterns`
 * （mox-hub/ordo-ui），本表对应条目移除；semantic 仅保留 4 件未迁移实体
 * （artifact-source-badge / status-definition-dialog / status-definition-list / tab-bar）。
 */

export type ComponentStatus =
  | 'canonical' | 'standby' | 'internal' | 'review' | 'deprecated'

export interface ComponentEntry {
  name: string          // 'button'
  file: string          // 'ui/button.tsx'
  section: string       // 组件类型分区（11 组口径；modules/shared 件为 'App Components'）
  status: ComponentStatus
  variants?: string[]   // 变体轴登记（§19.4）
  consumers?: number    // 由 lint 脚本回填
  expiresAt?: string    // deprecated 必填
  galleryExempt?: string // 画廊豁免槽位（H 类方案 §2.1）：登记理由后不计入画廊覆盖率分母；demo 豁免 ≠ 清退豁免，五态裁决面不受影响
  aiNotes?: string      // ★ §22.7：给 AI 编码代理的契约摘要（数据契约 / 状态语义 / 禁区三段式），随 gen-components-md.mjs 生成进 COMPONENTS.md（2026-10-27 首例 cost-figure，登记范式：AI 相关 semantic 件建议必填）
  reviewBy?: string     // review 必填（§19.3 防滥用）
  review?: {            // ★ 裁决面数据（承接 〇之二 三段式）
    pending: true
    reason: string      // '零引用' | '仅画廊引用' | '与 X 能力重叠' | '命名误导'
    proposal: 'delete' | 'merge' | 'keep' | 'rename' | 'standby'
    target?: string     // merge/rename 的目标组件名
  }
}

export const COMPONENT_REGISTRY: ComponentEntry[] = [
  // G7 倒置收编迁出 ui/，保留登记保 LU（2026-09-29）
  // JEV 快速判断徽注（CAP-A-27 扩展批）：离散判定+置信度统一呈现，advisory 声明恒挂
  // 审批操作统一件（组件规划账本 B2 · CAP-A-27）：Agent 行动前请示的风险档 + 行动预览 +
  // 单键批准/拒绝 + 决后收场仪式（确认层 1s → 凭证行）。消费方：executions 审批段。
  // 自治边界拨盘（账本 B5）：「哪些动作它可以自己跑、哪些必先问我」的运行时边界操作 UI。
  // 三档段选（锁定必问/先问我/自己跑，从严到宽），locked 档带锁标；滑块 translateX 归位
  // 对齐 segmented-control 视觉语言；样例滑轨展示该成员近期真实动作的落档分布（只读）。
  // 已接真：adjust-trust-dialog 拨盘即选择器，映射 Member.trustLevel 三级后走既有
  // PATCH /members/:id 持久化。
  { name: 'avatar-picker-field', file: 'ui/avatar-picker-field.tsx', section: 'Data Display', status: 'canonical' },
  { name: 'chapter-scrubber', file: 'modules/document/components/chapter-scrubber.tsx', section: 'Layout & Shells', status: 'canonical' },
  // 上下文占用格场（账本 B4）：上下文窗口渲染为定量格排，分区（系统提示/工具/记忆/对话/文件）
  // 按 token 占比填充、尾部虚框（free）；悬停点亮 + tooltip「分区名 · token 数 · 占比」；
  // 阈值语义色 <70 中性 / 70-90 warning / >90 danger 只落汇总读数；防御归一（负数/NaN 归零、
  // 总和超限等比收缩到满）。role=img + 结论式 aria（§17.6）。登记 standby（chip 先例：组件
  // 已落地、消费前置缺失——服务端需先暴露窗口上限（contextWindow）契约，禁消费方手造
  // limit（§22.2），接线后升 canonical；接线方案留 .roadmap-handoff 交接快照）。
  // G7 倒置收编迁出 ui/，保留登记保 LU（2026-09-29）
  { name: 'data-list', file: 'shared/components/data-list.tsx', section: 'App Components', status: 'canonical' },
  // G7 倒置收编迁出 ui/，保留登记保 LU（2026-09-29）
  { name: 'document-preview-dialog', file: 'modules/document/components/document-preview-dialog.tsx', section: 'App Components', status: 'canonical' },
  // 执行编排树（组件规划账本 B1 · P0 · CAP-A-04/B-03/C-06/G5）：「一个编排者+多个子执行」的
  // 纵向缩进树视图——六态、等人琥珀高亮可计数（§22.1）、成本沿分支现算折叠不隐账（§22.2）、
  // 失败分支保留可重试（§22.3）。消费方：run-details-dialog（单根退化态）。
  // diff 优先律承载件（宪法 §22.6 / 组件规划账本 B6）：AI 修改既有内容默认 diff 形态
  // （改前/改后对照）而非替换后成品；零依赖词级 LCS、逐段接受/拒绝、应用前实时预览合成结果。
  // 登记 standby（chip 先例：组件与 20 例测试已落地、消费接线留后续批——候选消费方
  // document-enhance / PromptEditor / member-profile-draft，接线同批升 canonical）。
  { name: 'mock-badge', file: 'ui/mock-badge.tsx', section: 'Data Display', status: 'canonical', galleryExempt: '运行时挂载件（入口/错误边界挂载），非画廊可 demo 形态' },
  // G7 倒置收编迁出 ui/，保留登记保 LU（2026-09-29）
  { name: 'property-panel', file: 'shared/components/property-panel.tsx', section: 'App Components', status: 'canonical' },
  // Task Atoms 套件件：子任务进度徽章（进度环+计数，22px 外框标准）。提取自 task-rows /
  // task-simple-list / 画廊三份重复实现，提取同批接好三个消费方，登记 canonical。
  { name: 'tab-bar', file: 'semantic/tab-bar.tsx', section: 'Navigation', status: 'canonical' },

  // ── 语义组件层：src/components/semantic/（G 类批 G1 起：新增组件默认落点）──
  // props 面封闭（不接 className/variant，口径见 semantic/README.md）；业务面可直接消费。
  // 第三件语义组件：主题模式卡片（三档意图）。提取自 appearance-section 的内联 JSX，
  // 消费方同批接好（设置页外观分区），故同 nav-status-dot 登记 canonical。
  // 预览缩略图的字面色单列豁免：宪法附录 A.1 行 A8 + check-palette.mjs 同名谓词。
  // 批二三件（chart-card / stat-tile / metric-row）登记 standby：首消费同批接入
  // （project-overview-charts 两块 / dashboard-page 弹窗 tile 簇 / team-stats-section 进度列），
  // 消费簇尚小，按 chip 先例留复核窗口观察泛化形态是否立得住。
  // JEV 概率条（CAP-A-27 扩展批）：0-100% 概率统一呈现，紫系=AI 预估与真实数据区分
  // 统计卡归一批（2026-09-29）：原 ui/stats-card 升格语义层标准件 + 原 ui/stat-card 收编为
  // featured 变种（layout 封闭枚举，非样式透传）；卡底（surface）与数值彩色（coloredValue）
  // 为封闭可选项。analytics / dashboard-page / settings ai overview / acceptance / team-stats
  // 五处本地与内联实现同批退役，旧 ui/stats-card 十页消费全部改道本件。
  // 图表重设计批（2026-10-11，参考 dsh-context 仪表盘风格）：环形占比图 + 分段比例条
  // 首消费同批接入（global-overview-charts 成本环形图 + 优先级构成条）。
  // 图例网格登记 internal（LU 口径：仅被 donut-chart / proportion-bar 两个 semantic 兄弟
  // 组件内建消费，无 modules/shared 直引——同 checkbox-group 先例「仅被其他组件消费的件
  // 不占 canonical LU 分母」）；画廊仍陈列 demo（internal 免门禁非禁展示）。
  // 详情页语义化批四（2026-10-02）：L2 详情页双栏母版——收编 task/bug/member/team 四页
  // 逐字重复骨架（PageShell+SubPageToolbar+主栏自滚动居中宽档+RightSidebar），侧栏二态
  // 内聚受控/非受控双模，主栏宽度走 page-shell 的 L1 总表分发（§20.2）。
  // 设置页语义组件批（2026-10-01，用户四裁决：scrubber 嵌吸顶卡第二行 / 新件先行 /
  // 毛玻璃卡+text-2xl / 三件+试点页）：settings-header 双态吸顶头（替代 PageHeader 在
  // 设置域的角色）、section-scrubber 栏目跳转（与 modules/document 的 chapter-scrubber
  // 刻度轨为不同组件，撞名裁决改名见组件头）、settings-section-card 栏目卡（与旧
  // section-card 并存，旧件另批评估归并——存量 24 消费文件不一次改写）。
  { name: 'status-definition-list', file: 'semantic/status-definition-list.tsx', section: 'Semantic', status: 'canonical' },
  { name: 'status-definition-dialog', file: 'semantic/status-definition-dialog.tsx', section: 'Semantic', status: 'canonical', galleryExempt: '受控表单弹窗（候选/回调由消费方注入），画廊以 status-definition-list demo 间接覆盖' },
  // 设置页语义组件批二（2026-10-01）：sticky-save-bar 脏状态保存栏（收编设置域三种
  // 保存落点并存——页头 Save 钮/控件旁/卡底钮，GitHub/Vercel 惯例 sticky bottom 毛玻璃条）；
  // settings-field-row 左说明右控件字段行（收编 settings 域 10+ 处同构散写）。
  // 统一创建面板优化批四（2026-10-27）：form-dialog 标准化实体创建/编辑对话框——
  // Dialog 骨架+RHF+Zod（§13.1）+提交态（§10.6）+脏确认（§20.1）+§10.8 尺寸档一次封死，
  // 面板外独立创建对话框收敛承载件；字段段 render prop 注入，props 封闭（G8）
  // path-input 路径输入统一件（CAP-A-28，2026-10-03）：手输+桌面壳系统选择器
  // （choose_directory/choose_file）+后端实测验证+失效一键创建+保底报错，
  // 收编 git/workspace/project/settings 四域 6 处路径手输。
  // 成本一等公民承载件（宪法 §22.2 / 组件规划账本 A3，2026-10-27）：金额+token 双轨、
  // mono tabular-nums、运行态数字滚动+微光（240ms 预算、reduced-motion 直出）、双缺席
  // 「—」诚实降级禁造假数。由 run-overview-card / run-info-panel 内联成本展示抽出收编
  // （两消费方同批接好，登记 canonical）。aiNotes 为 §22.7 登记范式首例。
  // 产物管理标准件（CAP-A-32，2026-10-27）：文件类型图标按扩展名→MIME 两级映射
  // （扩展名优先），tone 走 §19.5 封闭词表；产物列表/预览/上传唯一出口，禁页面自拼 File* 映射
  // 产物来源徽标（CAP-A-32）：upload/execution/document 三源标注；传 to 即整枚为溯源跳转
  { name: 'artifact-source-badge', file: 'semantic/artifact-source-badge.tsx', section: 'Data Display', status: 'canonical' },

  // ── 跨模块业务组件：src/shared/components/ ───────────────────────────────
  // 产物管理标准件族（CAP-A-32，2026-10-27）：业务页面即插即用，宿主只传归属
  // （projectId/issueId），上传/预览/版本/溯源全内置
  { name: 'artifact-preview-dialog', file: 'shared/components/artifact/artifact-preview-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'artifact-section', file: 'shared/components/artifact/artifact-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'artifact-upload-dialog', file: 'shared/components/artifact/artifact-upload-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'artifact-version-list', file: 'shared/components/artifact/artifact-version-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'file-previewer', file: 'shared/components/artifact/file-previewer.tsx', section: 'App Components', status: 'canonical' },
  { name: 'board-view', file: 'shared/components/board-view/board-view.tsx', section: 'App Components', status: 'canonical' },
  { name: 'bottom-dock', file: 'shared/components/bottom-dock/bottom-dock.tsx', section: 'App Components', status: 'canonical' },
  { name: 'dock-metric-badge', file: 'shared/components/bottom-dock/dock-metric-badge.tsx', section: 'App Components', status: 'canonical' },
  { name: 'dock-prompt-bar', file: 'shared/components/bottom-dock/dock-prompt-bar.tsx', section: 'App Components', status: 'canonical' },
  { name: 'dock-user-popover', file: 'shared/components/bottom-dock/dock-user-popover.tsx', section: 'App Components', status: 'canonical' },
  { name: 'cell-select', file: 'shared/components/cell-select.tsx', section: 'App Components', status: 'canonical' },
  { name: 'connection-banner', file: 'shared/components/connection-banner.tsx', section: 'App Components', status: 'canonical' },
  { name: 'acceptance-criteria-field', file: 'shared/components/create-dialog/acceptance-criteria-field.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-source-tabs', file: 'shared/components/create-dialog/entity-templates/project-source-tabs.tsx', section: 'App Components', status: 'canonical' },
  { name: 'ai-readiness-card', file: 'shared/components/create-dialog/ai-readiness-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'create-dialog/index', file: 'shared/components/create-dialog/index.tsx', section: 'App Components', status: 'canonical' },
  { name: 'mode-shuttle-button', file: 'shared/components/create-dialog/mode-shuttle-button.tsx', section: 'App Components', status: 'canonical' },
  { name: 'property-pills-bar', file: 'shared/components/create-dialog/property-pills-bar.tsx', section: 'App Components', status: 'canonical' },
  { name: 'suggestions-card', file: 'shared/components/create-dialog/suggestions-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'unified-create-dialog', file: 'shared/components/create-dialog/unified-create-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'emoji-picker', file: 'shared/components/emoji-picker/emoji-picker.tsx', section: 'App Components', status: 'canonical' },
  { name: 'favorite-toggle', file: 'shared/components/favorite-toggle.tsx', section: 'App Components', status: 'canonical' },
  { name: 'gantt-chart', file: 'shared/components/gantt-chart.tsx', section: 'App Components', status: 'canonical' },
  { name: 'global-create-dialog', file: 'shared/components/global-create-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'issue-type-icon', file: 'shared/components/issue-type-icon.tsx', section: 'App Components', status: 'canonical' },
  { name: 'issue-type-pill', file: 'shared/components/issue-type-pill.tsx', section: 'App Components', status: 'canonical' },
  { name: 'language-switcher', file: 'shared/components/language-switcher.tsx', section: 'App Components', status: 'canonical' },
  { name: 'markdown-editor', file: 'shared/components/markdown-editor.tsx', section: 'App Components', status: 'canonical' },
  { name: 'markdown-live-editor', file: 'shared/components/markdown-live-editor.tsx', section: 'App Components', status: 'canonical' },
  { name: 'markdown-view', file: 'shared/components/markdown-view.tsx', section: 'App Components', status: 'canonical' },
  { name: 'prompt-editor', file: 'shared/components/prompt-editor.tsx', section: 'App Components', status: 'canonical' },

  // ── 错位目录：src/shared/ui/（E7 清退候选） ───────────────────────────────

  // ── 模块专用组件：src/modules/*/components/ ──────────────────────────────
  { name: 'acceptance-draft-dialog', file: 'modules/acceptance/components/acceptance-draft-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'acceptance-form-dialog', file: 'modules/acceptance/components/acceptance-form-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'audit-report-panel', file: 'modules/acceptance/components/audit-report-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'activity-comment', file: 'modules/activity/components/activity-comment.tsx', section: 'App Components', status: 'canonical' },
  { name: 'activity-feed', file: 'modules/activity/components/activity-feed.tsx', section: 'App Components', status: 'canonical' },
  { name: 'comment-input', file: 'modules/activity/components/comment-input.tsx', section: 'App Components', status: 'canonical' },
  { name: 'reaction-bar', file: 'modules/activity/components/reaction-bar.tsx', section: 'App Components', status: 'canonical' },
  { name: 'generated-password-dialog', file: 'modules/admin/components/generated-password-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'invite-create-dialog', file: 'modules/admin/components/invite-create-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'invites-section', file: 'modules/admin/components/invites-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'members-section', file: 'modules/admin/components/members-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'user-accounts-section', file: 'modules/admin/components/user-accounts-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'user-create-dialog', file: 'modules/admin/components/user-create-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'user-edit-dialog', file: 'modules/admin/components/user-edit-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'assistant-panel', file: 'modules/assistant/components/assistant-panel.tsx', section: 'AI Execution', status: 'canonical' },
  { name: 'admin-guard', file: 'modules/auth/components/admin-guard.tsx', section: 'App Components', status: 'canonical' },
  { name: 'auth-guard', file: 'modules/auth/components/auth-guard.tsx', section: 'App Components', status: 'canonical' },
  { name: 'auth-shell', file: 'modules/auth/components/auth-shell.tsx', section: 'App Components', status: 'canonical' },
  { name: 'auth-visual-card', file: 'modules/auth/components/auth-visual-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'auth-visual', file: 'modules/auth/components/auth-visual.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-card', file: 'modules/auth/components/member-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'server-config-dialog', file: 'modules/auth/components/server-config-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'blueprint-canvas', file: 'modules/auth/components/visuals/blueprint-canvas.tsx', section: 'App Components', status: 'canonical' },
  { name: 'prism-canvas', file: 'modules/auth/components/visuals/prism-canvas.tsx', section: 'App Components', status: 'canonical' },
  { name: 'boot-checklist', file: 'modules/boot/components/boot-checklist.tsx', section: 'App Components', status: 'canonical' },
  { name: 'boot-error-drawer', file: 'modules/boot/components/boot-error-drawer.tsx', section: 'App Components', status: 'canonical' },
  { name: 'boot-progress-bar', file: 'modules/boot/components/boot-progress-bar.tsx', section: 'App Components', status: 'canonical' },
  { name: 'boot-toggle', file: 'modules/boot/components/boot-toggle.tsx', section: 'App Components', status: 'canonical' },
  { name: 'contract-bindings-panel', file: 'modules/contract/components/contract-bindings-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'role-manager', file: 'modules/core-config/components/role-manager.tsx', section: 'App Components', status: 'canonical' },
  { name: 'status-manager', file: 'modules/core-config/components/status-manager.tsx', section: 'App Components', status: 'canonical' },
  { name: 'tag-manager', file: 'modules/core-config/components/tag-manager.tsx', section: 'App Components', status: 'canonical' },
  { name: 'template-manager', file: 'modules/core-config/components/template-manager.tsx', section: 'App Components', status: 'canonical' },
  { name: 'decision-review-modal', file: 'shared/decision-card/decision-review-modal.tsx', section: 'App Components', status: 'canonical' },
  { name: 'decomposition-review-panel', file: 'modules/decision/components/decomposition-review-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'BackendStatusBadge', file: 'modules/desktop/components/BackendStatusBadge.tsx', section: 'App Components', status: 'canonical' },
  { name: 'desktop-gate', file: 'modules/desktop/components/desktop-gate.tsx', section: 'App Components', status: 'canonical' },
  { name: 'desktop-log-card', file: 'modules/desktop/components/desktop-log-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'desktop-preferences-card', file: 'modules/desktop/components/desktop-preferences-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'process-monitor-card', file: 'modules/desktop/components/process-monitor-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'approval-dialog', file: 'modules/document/components/approval-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'document-properties-panel', file: 'modules/document/components/document-properties-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'document-task-links', file: 'modules/document/components/document-task-links.tsx', section: 'App Components', status: 'canonical' },
  { name: 'mdx-editor', file: 'modules/document/components/mdx-editor.tsx', section: 'App Components', status: 'canonical' },
  { name: 'mdx-renderer', file: 'modules/document/components/mdx-renderer.tsx', section: 'App Components', status: 'canonical' },
  { name: 'mdx-toolbar', file: 'modules/document/components/mdx-toolbar.tsx', section: 'App Components', status: 'canonical' },
  { name: 'revision-impact-banner', file: 'modules/document/components/revision-impact-banner.tsx', section: 'App Components', status: 'canonical' },
  { name: 'section-navigation', file: 'modules/document/components/section-navigation.tsx', section: 'App Components', status: 'canonical' },
  { name: 'section-task-links-list', file: 'modules/document/components/section-task-links-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'task-picker-dialog', file: 'modules/document/components/task-picker-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'version-diff-view', file: 'modules/document/components/version-diff-view.tsx', section: 'App Components', status: 'canonical' },
  { name: 'version-history-panel', file: 'modules/document/components/version-history-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'run-details-dialog', file: 'modules/executions/components/run-details-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'run-diagnosis-section', file: 'modules/executions/components/run-diagnosis-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'run-event-list', file: 'modules/executions/components/run-event-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'run-info-panel', file: 'modules/executions/components/run-info-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'run-overview-card', file: 'modules/executions/components/run-overview-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'run-status', file: 'modules/executions/components/run-status.tsx', section: 'App Components', status: 'canonical' },
  { name: 'run-timeline', file: 'modules/executions/components/run-timeline.tsx', section: 'App Components', status: 'canonical' },
  { name: 'step-detail-panel', file: 'modules/executions/components/step-detail-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'bind-repository-dialog', file: 'modules/git/components/bind-repository-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'branch-list', file: 'modules/git/components/branch-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'commit-list', file: 'modules/git/components/commit-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'diff-viewer', file: 'modules/git/components/diff-viewer.tsx', section: 'App Components', status: 'canonical' },
  { name: 'git-command-panel', file: 'modules/git/components/git-command-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'git-tool-status', file: 'modules/git/components/git-tool-status.tsx', section: 'App Components', status: 'canonical' },
  { name: 'pull-request-card', file: 'modules/git/components/pull-request-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'pull-request-list', file: 'modules/git/components/pull-request-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'repository-list', file: 'modules/git/components/repository-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'workspace-config', file: 'modules/git/components/workspace-config.tsx', section: 'App Components', status: 'canonical' },
  { name: 'github-config-form', file: 'modules/github/components/github-config-form.tsx', section: 'App Components', status: 'canonical' },
  { name: 'github-panel', file: 'modules/github/components/github-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'github-setup-card', file: 'modules/github/components/github-setup-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'analysis-draft-dialog', file: 'modules/intake/components/analysis-draft-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'pipeline-overview-cards', file: 'modules/intake/components/pipeline-overview-cards.tsx', section: 'App Components', status: 'canonical' },
  { name: 'readiness-dialog', file: 'modules/intake/components/readiness-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'acceptance-criteria-preview', file: 'modules/issue/components/acceptance-criteria-preview.tsx', section: 'App Components', status: 'canonical' },
  { name: 'ai-assign-dialog', file: 'modules/issue/components/ai-assign-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'batch-update-issues-dialog', file: 'modules/issue/components/batch-update-issues-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'board-presets', file: 'modules/issue/components/board-presets.tsx', section: 'App Components', status: 'canonical' },
  { name: 'bug-simple-list', file: 'modules/issue/components/bug-simple-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'cell-editors', file: 'modules/issue/components/cell-editors.tsx', section: 'App Components', status: 'canonical' },
  { name: 'completion-review', file: 'modules/issue/components/completion-review.tsx', section: 'App Components', status: 'canonical' },
  { name: 'custom-field-input', file: 'modules/issue/components/custom-field-input.tsx', section: 'App Components', status: 'canonical' },
  { name: 'execution-items-panel', file: 'modules/issue/components/execution-items-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'global-task-export-dialog', file: 'modules/issue/components/global-task-export-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'issue-dependencies-section', file: 'modules/issue/components/issue-dependencies-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'issue-type-switcher', file: 'modules/issue/components/issue-type-switcher.tsx', section: 'App Components', status: 'canonical' },
  { name: 'iteration-detail-dialog', file: 'modules/issue/components/iteration-detail-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'iteration-form-dialog', file: 'modules/issue/components/iteration-form-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'task-gantt', file: 'modules/issue/components/task-gantt.tsx', section: 'App Components', status: 'canonical' },
  { name: 'task-import-export', file: 'modules/issue/components/task-import-export.tsx', section: 'App Components', status: 'canonical' },
  { name: 'task-prompt-panel', file: 'modules/issue/components/task-prompt-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'task-simple-list', file: 'modules/issue/components/task-simple-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'task-table-view', file: 'modules/issue/components/task-table-view.tsx', section: 'App Components', status: 'canonical' },
  { name: 'linear-config-form', file: 'modules/linear/components/linear-config-form.tsx', section: 'App Components', status: 'canonical' },
  { name: 'linear-conflict-resolver', file: 'modules/linear/components/linear-conflict-resolver.tsx', section: 'App Components', status: 'canonical' },
  { name: 'linear-projects-table', file: 'modules/linear/components/linear-projects-table.tsx', section: 'App Components', status: 'canonical' },
  { name: 'linear-provider-card', file: 'modules/linear/components/linear-provider-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'linear-status-badge', file: 'modules/linear/components/linear-status-badge.tsx', section: 'App Components', status: 'canonical' },
  { name: 'linear-sync-log-drawer', file: 'modules/linear/components/linear-sync-log-drawer.tsx', section: 'App Components', status: 'canonical' },
  { name: 'linear-sync-log', file: 'modules/linear/components/linear-sync-log.tsx', section: 'App Components', status: 'canonical' },
  { name: 'sync-progress-dialog', file: 'modules/linear/components/sync-progress-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'task-linear-panel', file: 'modules/linear/components/task-linear-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'inbox-item-row', file: 'modules/notification/components/inbox-item-row.tsx', section: 'App Components', status: 'canonical' },
  { name: 'notification-settings-dialog', file: 'modules/notification/components/notification-settings-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'agent-handoff-card', file: 'modules/office/components/agent-handoff-card.tsx', section: 'App Components', status: 'standby' },
  { name: 'collaboration-section', file: 'modules/office/components/collaboration-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'colleague-card', file: 'modules/office/components/colleague-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'onboarding-gate', file: 'modules/onboarding/components/onboarding-gate.tsx', section: 'App Components', status: 'canonical' },
  { name: 'api-doc-links-manager', file: 'modules/project/components/api-doc-links-manager.tsx', section: 'App Components', status: 'canonical' },
  { name: 'ai-insight-card', file: 'modules/project/components/dashboard/ai-insight-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'integration-status-strip', file: 'modules/project/components/dashboard/integration-status-strip.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-detail-frame', file: 'modules/project/components/dashboard/project-detail-frame.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-detail-header-card', file: 'modules/project/components/dashboard/project-detail-header-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-detail-nav', file: 'modules/project/components/dashboard/project-detail-nav.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-health-score-dialog', file: 'modules/project/components/dashboard/project-health-score-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-overview-charts', file: 'modules/project/components/dashboard/project-overview-charts.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-right-sidebar', file: 'modules/project/components/dashboard/project-right-sidebar.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-sidebar-context', file: 'modules/project/components/dashboard/project-sidebar-context.tsx', section: 'App Components', status: 'canonical' },
  { name: 'doc-links-manager', file: 'modules/project/components/doc-links-manager.tsx', section: 'App Components', status: 'canonical' },
  { name: 'external-links-manager', file: 'modules/project/components/external-links-manager.tsx', section: 'App Components', status: 'canonical' },
  { name: 'grill-interview', file: 'modules/project/components/grill/grill-interview.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-entry-wizard', file: 'modules/project/components/import/project-entry-wizard.tsx', section: 'App Components', status: 'canonical' },
  { name: 'interview-chat', file: 'modules/project/components/playbook/interview-chat.tsx', section: 'App Components', status: 'canonical' },
  { name: 'interview-dialog', file: 'modules/project/components/playbook/interview-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'profile-atom-card', file: 'modules/project/components/profile/profile-atom-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'profile-completeness-ring', file: 'modules/project/components/profile/profile-completeness-ring.tsx', section: 'App Components', status: 'canonical' },
  { name: 'profile-health-chips', file: 'modules/project/components/profile/profile-health-chips.tsx', section: 'App Components', status: 'canonical' },
  { name: 'profile-slot-section', file: 'modules/project/components/profile/profile-slot-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-board', file: 'modules/project/components/project-board.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-cell-editors', file: 'modules/project/components/project-cell-editors.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-gantt', file: 'modules/project/components/project-gantt.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-linear-sync-status', file: 'modules/project/components/project-linear-sync-status.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-property-panel', file: 'modules/project/components/project-property-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-simple-list', file: 'modules/project/components/project-simple-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-team-bindings', file: 'modules/project/components/project-team-bindings.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-playbook-settings-panel', file: 'modules/project/components/settings/project-playbook-settings-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-prompt-settings-panel', file: 'modules/project/components/settings/project-prompt-settings-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-team-settings-panel', file: 'modules/project/components/settings/project-team-settings-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'project-roles-section', file: 'modules/project-role/components/project-roles-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'template-picker-dialog', file: 'modules/prompt/components/template-picker-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'release-deliverables-card', file: 'modules/release/components/release-deliverables-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'release-trace-section', file: 'modules/release/components/release-trace-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'mcp-tab', file: 'modules/settings/components/ai/mcp-tab.tsx', section: 'App Components', status: 'canonical' },
  { name: 'models-tab', file: 'modules/settings/components/ai/models-tab.tsx', section: 'App Components', status: 'canonical' },
  { name: 'overview-tab', file: 'modules/settings/components/ai/overview-tab.tsx', section: 'App Components', status: 'canonical' },
  { name: 'provider-visuals', file: 'modules/settings/components/ai/provider-visuals.tsx', section: 'App Components', status: 'canonical' },
  { name: 'skills-tab', file: 'modules/settings/components/ai/skills-tab.tsx', section: 'App Components', status: 'canonical' },
  { name: 'tools-tab', file: 'modules/settings/components/ai/tools-tab.tsx', section: 'App Components', status: 'canonical' },
  { name: 'storage-settings', file: 'modules/settings/components/storage-settings.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-avatar', file: 'modules/team-member/components/member-avatar.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-card-popover', file: 'modules/team-member/components/member-card-popover.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-card-team', file: 'modules/team-member/components/member-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-chip', file: 'modules/team-member/components/member-chip.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-create-dialog', file: 'modules/team-member/components/member-create-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-list', file: 'modules/team-member/components/member-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-picker', file: 'modules/team-member/components/member-picker.tsx', section: 'App Components', status: 'canonical' },
  { name: 'member-tool-grants', file: 'modules/team-member/components/member-tool-grants.tsx', section: 'App Components', status: 'canonical' },
  { name: 'mention-renderer', file: 'modules/team-member/components/mention-renderer.tsx', section: 'App Components', status: 'standby' },
  { name: 'mention-textarea', file: 'modules/team-member/components/mention-textarea.tsx', section: 'App Components', status: 'standby' },
  { name: 'team-card', file: 'modules/team-member/components/team-card.tsx', section: 'App Components', status: 'canonical' },
  { name: 'team-create-dialog', file: 'modules/team-member/components/team-create-dialog.tsx', section: 'App Components', status: 'canonical' },
  { name: 'team-hierarchy-section', file: 'modules/team-member/components/team-hierarchy-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'team-list', file: 'modules/team-member/components/team-list.tsx', section: 'App Components', status: 'canonical' },
  { name: 'team-prompt-section', file: 'modules/team-member/components/team-prompt-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'team-stats-section', file: 'modules/team-member/components/team-stats-section.tsx', section: 'App Components', status: 'canonical' },
  { name: 'trust-level-badge', file: 'modules/team-member/components/trust-level-badge.tsx', section: 'App Components', status: 'canonical' },
  { name: 'workflow-canvas', file: 'modules/workflow/components/workflow-canvas.tsx', section: 'App Components', status: 'canonical' },
  { name: 'workflow-node-palette', file: 'modules/workflow/components/workflow-node-palette.tsx', section: 'App Components', status: 'canonical' },
  { name: 'workflow-run-panel', file: 'modules/workflow/components/workflow-run-panel.tsx', section: 'App Components', status: 'canonical' },
  { name: 'workflow-run-timeline', file: 'modules/workflow/components/workflow-run-timeline.tsx', section: 'App Components', status: 'canonical' },
  { name: 'workflow-step-editor', file: 'modules/workflow/components/workflow-step-editor.tsx', section: 'App Components', status: 'canonical' },
  { name: 'workflow-trigger-dialog', file: 'modules/workflow/components/workflow-trigger-dialog.tsx', section: 'App Components', status: 'canonical' },
]