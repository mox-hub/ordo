/**
 * 设计系统画廊套件（gallery-kit）——2026-10-27 展示层路由化批自 design-system-page.tsx
 * 原样搬出（imports + demo helpers + 常量 + SECTIONS/SECTION_GROUPS），demo 内容零改动。
 * 消费方：sections/gallery-sections.gen.tsx（demo 本体）、pages/ 两个壳（SECTIONS 导航数据）。
 * 顶层声明全部 export（套件形态）；不再被任何处使用的声明留给「库化批」（packages/ordo-ui）清理。
 */
import * as React from 'react'
import { useCallback, useMemo, useState } from 'react'
import { AlertCircle, ArrowDown, ArrowUp, BarChart3, Bot, CalendarRange, Check, CheckCircle2, ChevronsUp, Circle, Copy, Edit2, Flag, GripVertical, Kanban, Loader, MessagesSquare, Minus, Plus, Sparkles, SunMoon, Trash2, User, Users, X, XCircle, CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandCollection, CommandEmpty, CommandFooter, CommandGroup, CommandGroupLabel, CommandInput, CommandItem, CommandList, CommandPanel, CommandShortcut } from '@/components/ui/command'
import { getEntityIcon } from '@/shared/entity-icons/entity-icons'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { AvatarPickerField } from '@/components/ui/avatar-picker-field'
import { ColorPicker } from '@/components/ui/color-picker'
import Avvvatars from 'avvvatars-react'
import NiceAvatar, { genConfig } from 'react-nice-avatar'
import { MentionTextarea } from '@/modules/team-member/components/mention-textarea'
import { MentionRenderer } from '@/modules/team-member/components/mention-renderer'
import { ActivityHeatmap } from '@/components/semantic/activity-heatmap'
import { Sortable, SortableItem, SortableItemHandle } from '@/components/ui/sortable'
import { StatusIconFrame } from '@/shared/status/status-icon-frame'
import { PRIORITY_VISUALS, TASK_STATUS_VISUALS, type StatusIconComponent } from '@/shared/status/status-visuals'
import { MarkdownView } from '@/shared/components/markdown-view'
import { MarkdownEditor } from '@/shared/components/markdown-editor'
import { MarkdownLiveEditor } from '@/shared/components/markdown-live-editor'
import { PromptEditor } from '@/shared/components/prompt-editor'
import { ChapterScrubber, type Chapter } from '@/modules/document/components/chapter-scrubber'
import { HeaderActionButton } from '@/components/semantic/header-action-button'
import { ToolbarRow, useToolbarViews, type ToolbarViewStyleOption } from '@/components/semantic/toolbar-row'
import { FilterChipsRow, FilterCascadeMenu, type FilterCondition, type FilterFieldDef } from '@/components/semantic/filter-chips'
import { SubPageToolbar } from '@/components/semantic/sub-page-toolbar'
// H 类批 H2：画廊覆盖率补齐——12 件 canonical 缺口的 demo 收录（check-component-registry §4.2 ④ 门禁配套）
import { QuickCardsToggle } from '@/components/semantic/quick-cards-toggle'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { TabBar } from '@/components/semantic/tab-bar'
import { TabsProvider } from '@/shared/tabs/tabs-context'
import { type ChartConfig } from '@/components/ui/chart'
import { type ColumnDef } from '@/components/ui/data-table'
import { useForm } from 'react-hook-form'
import { COMPONENT_REGISTRY } from '@/modules/design-system/registry'
import { toast } from '@/components/ui/toast'
import { Menu, MenuCheckboxItem, MenuGroupLabel, MenuItem, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuShortcut, MenuSub, MenuSubPopup, MenuSubTrigger, MenuTrigger } from '@/components/ui/menu'
import { ContextMenu, createMenuItems } from '@/components/ui/context-menu'
import { DatePicker } from '@/components/ui/date-picker'
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from '@/components/ui/number-field'
import { Autocomplete, AutocompleteEmpty, AutocompleteInput, AutocompleteItem, AutocompleteList, AutocompletePopup, useAutocompleteFilter } from '@/components/ui/autocomplete'
import { CheckboxGroup } from '@/components/ui/checkbox-group'
import { Meter, MeterIndicator, MeterLabel, MeterTrack, MeterValue } from '@/components/ui/meter'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { cn } from '@/lib/utils'
import { RunStation } from '@/modules/workflow/components/run-view/build-run-view'
import { OrdoRefLink } from '@/shared/ordo-ref/ordo-ref-chip'
import { OrdoRefKind } from '@ordo/shared/ordo-ref'
import { SlashRefTextarea } from '@/shared/entity-ref/slash-ref-textarea'
import { RoutePreviewTrigger } from '@/shared/route-preview/route-preview-trigger'

export const SECTIONS = [
  // 组件裁决面置首：人类原话「组件仍然不删除，但是要在 design-system 页面标记，我看过后再删」
  // ——② 人看必须在第一屏可达；本区只读，不改任何组件、不做裁决。
  // 分区体系（2026-10-27 二轮重组）：在一轮「组件类型」11 组基础上按「使用者查找心智」
// 重新归组为 12 组——图表族/统计卡自 Data Display 立组 Data Visualization；设置壳族
// （settings-header/scrubber/section-card/save-bar/field-row/path-input/patterns）立组 Settings；
// AI 治理八件（verdict/confidence/cost/approval/autonomy/context/exec-tree/inline-diff）与
// workflow-run-timeline 归位 AI Execution；编辑器三件归 Controls；sortable/chip/nav-status-dot
// 归 Data Display；状态定义族与语义总展台归 Governance；subtask-badge/detail-section 归 App Patterns。
// 仅改 group 字段与本数组排序（数组顺序=索引页组内呈现序），正文 JSX 锚块物理序未动
// （数组顺序 ≠ 正文物理序的既定口径不受影响）；分区 id 一律不改，registry section 字段与路由兼容。
  { id: 'component-review', label: '组件裁决面', group: 'Governance' },
  { id: 'registry-audit', label: 'Registry 对账区', group: 'Governance' },
  // G 类批 G0：语义组件分区框架（首批收录随批 G1 Chip 示范组件落地。raw 原语按裁决 G6 不出画廊。）
  { id: 'semantic-components', label: '语义组件', group: 'Governance' },
  { id: 'definition-row', label: 'Definition Row', group: 'Governance' },
  { id: 'status-definition-list', label: 'Status Definition List', group: 'Governance' },
  { id: 'colors', label: 'Color Tokens', group: 'Foundations' },
  { id: 'typography', label: 'Typography', group: 'Foundations' },
  { id: 'spacing', label: 'Spacing', group: 'Foundations' },
  { id: 'radius', label: 'Border Radius', group: 'Foundations' },
  { id: 'shadows', label: 'Shadows', group: 'Foundations' },
  { id: 'buttons', label: 'Buttons', group: 'Controls' },
  { id: 'forms', label: 'Forms', group: 'Controls' },
  { id: 'number-field', label: 'Number Field', group: 'Controls' },
  { id: 'autocomplete', label: 'Autocomplete', group: 'Controls' },
  { id: 'checkbox-group', label: 'Checkbox Group', group: 'Controls' },
  { id: 'button-group', label: 'Button Group', group: 'Controls' },
  { id: 'toggle', label: 'Toggle & Segmented', group: 'Controls' },
  { id: 'calendar', label: 'Calendar', group: 'Controls' },
  { id: 'date-picker', label: 'Date Picker', group: 'Controls' },
  { id: 'input-otp', label: 'Input OTP', group: 'Controls' },
  { id: 'input-group', label: 'Input Group', group: 'Controls' },
  { id: 'select-field', label: 'Select Field', group: 'Controls' },
  { id: 'markdown-editor', label: 'Markdown Editor', group: 'Controls' },
  { id: 'markdown-live-editor', label: 'Markdown Live Editor', group: 'Controls' },
  // 存量补注册（2026-09-29）：正文 prompt-editor 锚块早已存在（PromptEditor 演示段），
  // SECTIONS 漏登导致导航不可达，此处补齐（位于正文 markdown-live-editor 与 entity-ref 之间）。
  { id: 'prompt-editor', label: 'Prompt Editor', group: 'Controls' },
  { id: 'theme-mode-card', label: 'Theme Mode Card', group: 'Controls' },
  { id: 'badges', label: 'Badges', group: 'Data Display' },
  { id: 'tags', label: 'Tags / Chips', group: 'Data Display' },
  { id: 'avatars', label: 'Avatars', group: 'Data Display' },
  { id: 'member-identity', label: 'Member Identity', group: 'Data Display' },
  { id: 'progress', label: 'Progress', group: 'Data Display' },
  { id: 'icon-stack', label: 'Icon Stack', group: 'Data Display' },
  { id: 'meter', label: 'Meter', group: 'Data Display' },
  { id: 'table', label: 'Table', group: 'Data Display' },
  { id: 'data-table', label: 'Data Table', group: 'Data Display' },
  { id: 'kbd', label: 'Kbd', group: 'Data Display' },
  { id: 'status-pill', label: 'Status Pill', group: 'Data Display' },
  { id: 'status-icon-frame', label: 'Status Icon Frame', group: 'Data Display' },
  { id: 'markdown', label: 'Markdown View', group: 'Data Display' },
  { id: 'entity-ref', label: 'Entity Ref System', group: 'Data Display' },
  { id: 'sortable', label: 'Sortable', group: 'Data Display' },
  // 语义组件逐件注册（2026-10-03）：正文各 demo 子段原位嵌套 SectionAnchor（无副作用
  // <section> 包裹，零 JSX 搬移），与 registry section:'Semantic' 逐件对齐；
  // status-definition-dialog 走 galleryExempt 不设条目（由 status-definition-list demo 间接覆盖）。
  { id: 'chip', label: 'Chip', group: 'Data Display' },
  { id: 'nav-status-dot', label: 'Nav Status Dot', group: 'Data Display' },
  // 产物管理标准件（CAP-A-32，2026-10-27）：两件 semantic 入画廊 Data Display 组
  { id: 'file-type-icon', label: 'File Type Icon', group: 'Data Display' },
  { id: 'artifact-source-badge', label: 'Artifact Source Badge', group: 'Data Display' },
  { id: 'stat-tiles', label: 'Stat Tiles', group: 'Data Visualization' },
  { id: 'charts', label: 'Charts', group: 'Data Visualization' },
  { id: 'chart-card', label: 'Chart Card', group: 'Data Visualization' },
  { id: 'stat-tile', label: 'Stat Tile', group: 'Data Visualization' },
  { id: 'metric-row', label: 'Metric Row', group: 'Data Visualization' },
  { id: 'chart-legend-grid', label: 'Chart Legend Grid', group: 'Data Visualization' },
  { id: 'donut-chart', label: 'Donut Chart', group: 'Data Visualization' },
  { id: 'proportion-bar', label: 'Proportion Bar', group: 'Data Visualization' },
  // registry 口径本就是 section:'Semantic' 的两件：侧边栏组从层组归位（锚块物理位不动，
  // 数组顺序 ≠ 正文物理序的既定口径不受影响）
  { id: 'stat-cards', label: 'Stat Cards', group: 'Data Visualization' },
  { id: 'alerts', label: 'Alerts', group: 'Feedback' },
  { id: 'toast', label: 'Toast', group: 'Feedback' },
  { id: 'spinner', label: 'Spinner', group: 'Feedback' },
  { id: 'skeleton', label: 'Skeleton', group: 'Feedback' },
  { id: 'empty', label: 'Empty States', group: 'Feedback' },
  { id: 'loading-states', label: 'Loading & Empty', group: 'Feedback' },
  { id: 'stepper', label: 'Stepper', group: 'Navigation' },
  { id: 'tabs', label: 'Tabs', group: 'Navigation' },
  { id: 'tab-bar', label: 'Tab Bar', group: 'Navigation' },
  { id: 'accordion', label: 'Accordion', group: 'Navigation' },
  { id: 'menu', label: 'Menu (coss)', group: 'Navigation' },
  { id: 'breadcrumb', label: 'Breadcrumb', group: 'Navigation' },
  { id: 'pagination', label: 'Pagination', group: 'Navigation' },
  { id: 'menubar', label: 'Menubar', group: 'Navigation' },
  { id: 'collapsible', label: 'Collapsible', group: 'Navigation' },
  { id: 'command', label: 'Command Palette', group: 'Navigation' },
  { id: 'tooltip', label: 'Tooltip & Menu', group: 'Overlays' },
  { id: 'overlays', label: 'Overlays', group: 'Overlays' },
  { id: 'popover', label: 'Popover & Combobox', group: 'Overlays' },
  { id: 'hover-card', label: 'Hover Card', group: 'Overlays' },
  { id: 'emoji-picker', label: 'Emoji Picker', group: 'Overlays' },
  { id: 'cards', label: 'Cards', group: 'Layout & Shells' },
  { id: 'item', label: 'Item', group: 'Layout & Shells' },
  { id: 'auth-surface', label: 'Auth Surface', group: 'Layout & Shells' },
  { id: 'scroll-area', label: 'Scroll Area', group: 'Layout & Shells' },
  { id: 'aspect-ratio', label: 'Aspect Ratio', group: 'Layout & Shells' },
  { id: 'chapter-scrubber', label: 'Chapter Scrubber', group: 'Layout & Shells' },
  { id: 'page-layout', label: 'Page Layout', group: 'Layout & Shells' },
  { id: 'sidebar-panel', label: 'Sidebar Panel', group: 'Layout & Shells' },
  { id: 'detail-page-frame', label: 'Detail Page Frame', group: 'Layout & Shells' },
  { id: 'settings-header', label: 'Settings Header', group: 'Settings' },
  { id: 'section-scrubber', label: 'Section Scrubber', group: 'Settings' },
  { id: 'settings-section-card', label: 'Settings Section Card', group: 'Settings' },
  { id: 'sticky-save-bar', label: 'Sticky Save Bar', group: 'Settings' },
  { id: 'settings-field-row', label: 'Settings Field Row', group: 'Settings' },
  { id: 'path-input', label: 'Path Input', group: 'Settings' },
  { id: 'settings-patterns', label: 'Settings Patterns', group: 'Settings' },
  { id: 'page-header', label: 'Page Header', group: 'App Patterns' },
  { id: 'toolbar', label: 'Toolbar Row', group: 'App Patterns' },
  { id: 'filter-chips', label: 'Filter Chips', group: 'App Patterns' },
  { id: 'sub-page-toolbar', label: 'Sub Page Toolbar', group: 'App Patterns' },
  { id: 'task-atoms', label: 'Task Atoms', group: 'App Patterns' },
  { id: 'task-rows', label: 'Task Rows', group: 'App Patterns' },
  { id: 'create-card', label: 'Create / CTA', group: 'App Patterns' },
  { id: 'delivery-row', label: 'Delivery Row', group: 'App Patterns' },
  { id: 'doc-cards', label: 'Document Cards', group: 'App Patterns' },
  { id: 'assembly-primitives', label: 'Assembly Primitives', group: 'App Patterns' },
  { id: 'subtask-badge', label: 'Subtask Badge', group: 'App Patterns' },
  { id: 'detail-section', label: 'Detail Section', group: 'App Patterns' },
  { id: 'ai-density-cards', label: 'AI High-Density Cards [AI]', group: 'AI Execution' },
  { id: 'workflow-run-timeline', label: 'Workflow Run Timeline', group: 'AI Execution' },
  { id: 'ai-verdict-pill', label: 'AI Verdict Pill', group: 'AI Execution' },
  { id: 'confidence-bar', label: 'Confidence Bar', group: 'AI Execution' },
  // 组件规划账本 B1-B6 + A3 登记批（2026-10-27 重建：原条目随未提交改动丢失，按 registry 登记补回）
  { id: 'cost-figure', label: 'Cost Figure', group: 'AI Execution' },
  { id: 'approval-card', label: 'Approval Card', group: 'AI Execution' },
  { id: 'autonomy-dial', label: 'Autonomy Dial', group: 'AI Execution' },
  { id: 'context-usage', label: 'Context Usage', group: 'AI Execution' },
  { id: 'exec-tree', label: 'Exec Tree', group: 'AI Execution' },
  { id: 'inline-diff', label: 'Inline Diff', group: 'AI Execution' },
]

/** Settings Patterns demo：ChapterScrubber 栏目清单（模块级常量，避免 observer 重建） */
export const SETTINGS_DEMO_SECTIONS = [
  { id: 'set-demo-theme', label: '主题' },
  { id: 'set-demo-notify', label: '通知' },
  { id: 'set-demo-integration', label: '集成' },
]

/** Settings Patterns demo：StatusDefinitionList 静态只读数据（无回调 = 无新建/编辑/拖拽提交） */
export const SETTINGS_DEMO_STATUSES = [
  { id: 'st-1', key: 'triage', name: '待分派', group: 'triage', order: 1, description: '新进入需要人工确认的条目' },
  { id: 'st-2', key: 'started', name: '进行中', group: 'started', order: 2, color: '#3b82f6' },
  { id: 'st-3', key: 'done', name: '已完成', group: 'completed', order: 3, isFinal: true },
]

export const WORKFLOW_TIMELINE_STATIC: RunStation[] = [
  {
    id: 'prep', type: 'llm', title: '起草演示代码', status: 'pending', settled: 0, total: 0, rounds: 0,
    pills: [{ key: 'prep:static:prep', nodeId: 'prep', label: '起草演示代码', type: 'llm', status: 'pending', attempt: 0 }],
  },
  {
    id: 'review', type: 'fan-out', title: '逐个文件评审', status: 'pending', settled: 0, total: 0, rounds: 0,
    pills: [
      { key: 'review:static:rv-a', nodeId: 'rv-a', label: '评审员 math', type: 'llm', status: 'pending', attempt: 0 },
      { key: 'review:static:rv-b', nodeId: 'rv-b', label: '评审员 string', type: 'llm', status: 'pending', attempt: 0 },
      { key: 'review:static:rv-c', nodeId: 'rv-c', label: '复核员', type: 'agent', status: 'pending', attempt: 0 },
    ],
  },
  {
    id: 'report', type: 'agent', title: '汇总产出讲解报告', status: 'pending', settled: 0, total: 0, rounds: 0,
    pills: [{ key: 'report:static:report', nodeId: 'report', label: '汇总产出讲解报告', type: 'agent', status: 'pending', attempt: 0 }],
  },
]

export const WORKFLOW_TIMELINE_RUNNING: RunStation[] = [
  {
    id: 'prep', type: 'llm', title: '起草演示代码', status: 'done', settled: 1, total: 1, rounds: 0,
    pills: [{ key: 'prep', nodeId: 'prep', label: '起草演示代码', type: 'llm', status: 'succeeded', attempt: 1 }],
  },
  {
    id: 'review', type: 'fan-out', title: '逐个文件评审', status: 'done', settled: 6, total: 6, rounds: 0,
    pills: [
      { key: 'rv-a@i0', nodeId: 'rv-a', label: '评审员 math', type: 'llm', status: 'succeeded', attempt: 1 },
      { key: 'rv-b@i1', nodeId: 'rv-b', label: '评审员 string', type: 'llm', status: 'succeeded', attempt: 1 },
      { key: 'rv-c@i2', nodeId: 'rv-c', label: '复核员 #1', type: 'agent', status: 'succeeded', attempt: 1 },
      { key: 'rv-c@i3', nodeId: 'rv-c', label: '复核员 #2', type: 'agent', status: 'succeeded', attempt: 1 },
    ],
  },
  {
    id: 'fix', type: 'loop', title: '修复最关键的问题', status: 'failed', settled: 2, total: 3, rounds: 2,
    pills: [
      { key: 'fix@r1', nodeId: 'fix', label: '修复员', type: 'agent', status: 'failed', attempt: 1, error: 'agent_execution_failed' },
      { key: 'fix@r2', nodeId: 'fix', label: '修复员 #2', type: 'agent', status: 'succeeded', attempt: 1 },
    ],
  },
  {
    id: 'report', type: 'agent', title: '汇总产出讲解报告', status: 'running', settled: 0, total: 1, rounds: 0,
    pills: [{ key: 'report', nodeId: 'report', label: '汇报审阅员', type: 'agent', status: 'running', attempt: 1 }],
  },
]

export function SortableDemo() {
  const [items, setItems] = useState(['连接仓库', '扫描考古', '校对入库', '归档完成'])
  return (
    <Sortable
      value={items}
      onValueChange={setItems}
      getItemValue={(item) => item}
      className="divide-y divide-border rounded-lg border border-border bg-card"
    >
      {items.map((item) => (
        <SortableItem key={item} value={item} className="flex items-center gap-2 bg-card px-3 py-2">
          <SortableItemHandle
            render={<button type="button" aria-label="拖拽排序" />}
            className="touch-none text-muted-foreground"
          >
            <GripVertical className="size-3.5" />
          </SortableItemHandle>
          <span className="text-sm">{item}</span>
        </SortableItem>
      ))}
    </Sortable>
  )
}

export function SortableGridDemo() {
  const [tiles, setTiles] = useState(['To Do', 'In Progress', 'In Review', 'Done', 'Blocked', 'Backlog'])
  return (
    <Sortable
      value={tiles}
      onValueChange={setTiles}
      getItemValue={(tile) => tile}
      strategy="grid"
      className="grid grid-cols-3 gap-2"
    >
      {tiles.map((tile) => (
        <SortableItem
          key={tile}
          value={tile}
          className="rounded-md border border-border bg-card px-3 py-4 text-center text-xs font-medium"
        >
          {tile}
        </SortableItem>
      ))}
    </Sortable>
  )
}

// 画廊分区体系（2026-09-29 重组）：按组件类型的 11 组，顺序即导航组序与 SECTIONS 数组组间序
export const SECTION_GROUPS = ['Governance', 'Foundations', 'Controls', 'Data Display', 'Data Visualization', 'Feedback', 'Navigation', 'Overlays', 'Layout & Shells', 'Settings', 'App Patterns', 'AI Execution']

/** SubPageToolbar 演示：返回 + 面包屑 + 居中页签 + 翻页器/按钮组/侧栏开关 */
export function SubPageToolbarDemo({ withPager, withSidebar }: { withPager?: boolean; withSidebar?: boolean }) {
  const [tab, setTab] = React.useState('overview');
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-background">
      <SubPageToolbar
        breadcrumbs={[
          { label: 'Projects', to: '/app/projects' },
          { label: 'Nebula Core' },
          { label: 'Board' },
        ]}
        tabs={{
          value: tab,
          onChange: setTab,
          items: [
            { value: 'overview', label: 'Overview', icon: BarChart3 },
            { value: 'board', label: 'Board', icon: Kanban, tone: 'blue' as const },
            { value: 'milestones', label: 'Milestones', icon: CalendarRange, tone: 'purple' as const },
          ],
        }}
        pager={
          withPager
            ? { hasPrev: true, hasNext: true, onPrev: () => {}, onNext: () => {}, position: '3/12' }
            : undefined
        }
        actions={<HeaderActionButton icon={Plus} label="New Item" variant="outline" />}
        sidebar={withSidebar ? { open: sidebarOpen, onToggle: () => setSidebarOpen((v) => !v) } : undefined}
      />
      <div className="px-6 py-4 text-xs text-muted-foreground">
        tab: {tab}
        {withSidebar ? ` · sidebar: ${sidebarOpen ? 'open' : 'hidden'}` : ''} — 返回按钮默认 history back；面包屑中间层可点击
      </div>
    </div>
  );
}

/** ToolbarRow 交互演示：真实组件 + 本地状态，可切换/添加视图、打开各下拉 */
export function ToolbarRowDemo({ demoKey, styleOptions }: { demoKey: string; styleOptions: ToolbarViewStyleOption[] }) {
  const [styleValue, setStyleValue] = React.useState(styleOptions[0]?.value ?? 'list');
  const [status, setStatus] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const toolbar = useToolbarViews({
    key: `design-system-${demoKey}`,
    defaults: [{ id: 'default', name: 'Default View', icon: 'list', builtIn: true, snapshot: {} }],
  });

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-background">
      <ToolbarRow
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        viewStyle={{ value: styleValue, onChange: setStyleValue, options: styleOptions }}
        filterMenu={{
          badge: status !== 'all' ? 1 : 0,
          search: { value: query, onChange: setQuery, placeholder: 'Search…' },
          items: [
            { type: 'label', label: 'Status' },
            ...['all', 'todo', 'in progress', 'done'].map((value) => ({
              id: `st-${value}`,
              type: 'checkbox' as const,
              label: value === 'all' ? 'All' : value.replace('in progress', 'In Progress').replace('done', 'Done').replace('todo', 'Todo'),
              checked: status === value,
              onSelect: () => setStatus(value),
            })),
          ],
        }}
        displayMenu={{
          items: [
            { type: 'label', label: 'Density' },
            { id: 'd-comfortable', type: 'checkbox', label: 'Comfortable', checked: true },
            { id: 'd-compact', type: 'checkbox', label: 'Compact' },
          ],
        }}
        downloadMenu={{
          items: [
            { type: 'label', label: 'Export' },
            { id: 'csv', type: 'item', label: 'CSV', disabled: true },
            { id: 'json', type: 'item', label: 'JSON', disabled: true },
          ],
        }}
      />
      <div className="px-6 py-4 text-xs text-muted-foreground">
        style: {styleValue} · status: {status}{query ? ` · query: "${query}"` : ''} — 点击已激活视图胶囊可重命名/换图标/删除，"+" 新建视图会快照当前状态
      </div>
    </div>
  );
}

export const FILTER_DEMO_FIELDS: FilterFieldDef[] = [
  {
    id: 'status',
    label: 'Status',
    icon: Circle,
    operators: ['is', 'isNot'],
    options: [
      { value: 'todo', label: 'Todo', icon: <Circle className="size-3.5 text-muted-foreground" /> },
      { value: 'in_progress', label: 'In Progress', icon: <Loader className="size-3.5 text-accent-blue" /> },
      { value: 'done', label: 'Done', icon: <CircleCheck className="size-3.5 text-accent-green" /> },
    ],
  },
  {
    id: 'priority',
    label: 'Priority',
    icon: Flag,
    operators: ['is', 'isNot'],
    options: [
      { value: 'urgent', label: 'Urgent', icon: <span className="size-2.5 shrink-0 rounded-full bg-accent-red" /> },
      { value: 'high', label: 'High', icon: <span className="size-2.5 shrink-0 rounded-full bg-accent-orange" /> },
      { value: 'medium', label: 'Medium', icon: <span className="size-2.5 shrink-0 rounded-full bg-accent-yellow" /> },
      { value: 'low', label: 'Low', icon: <span className="size-2.5 shrink-0 rounded-full bg-muted-foreground/40" /> },
    ],
  },
]

/** FilterChipsRow 演示：Linear 风格条件条（字段｜算子｜值｜× 拼接 chip + 追加 + Clear/Save） */
export function FilterChipsDemo() {
  const [conditions, setConditions] = React.useState<FilterCondition[]>([
    { id: 'demo-status', fieldId: 'status', operator: 'is', values: ['todo', 'in_progress'] },
    { id: 'demo-priority', fieldId: 'priority', operator: 'isNot', values: ['low'] },
  ])

  return (
    <div className="space-y-2">
      <FilterChipsRow
        fields={FILTER_DEMO_FIELDS}
        conditions={conditions}
        onChange={setConditions}
        onSaveToView={() => undefined}
        onSaveAsNewView={() => undefined}
      />
      <div className="flex items-center gap-3">
        <FilterCascadeMenu
          fields={FILTER_DEMO_FIELDS}
          conditions={conditions}
          onChange={setConditions}
          badge={conditions.filter((c) => c.values.length > 0).length}
        />
        <span className="text-xs text-muted-foreground">漏斗按钮二级级联菜单：字段搜索 + 值子菜单直接勾选，与条件条操作同一份状态</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {conditions.length} condition(s) — 点字段清单追加（允许同字段多条件），Save 菜单演示保存到视图/另存为新视图
      </div>
    </div>
  )
}

export const COLOR_GROUPS = [
  { label: 'Base', tokens: [
    { name: '--background', tw: 'bg-background' },
    { name: '--foreground', tw: 'bg-foreground' },
    { name: '--border', tw: 'bg-border' },
    { name: '--ring', tw: 'bg-ring' },
  ]},
  { label: 'Brand', tokens: [
    { name: '--primary', tw: 'bg-primary' },
    { name: '--primary-foreground', tw: 'bg-primary-foreground' },
    { name: '--secondary', tw: 'bg-secondary' },
    { name: '--secondary-foreground', tw: 'bg-secondary-foreground' },
  ]},
  { label: 'Surface', tokens: [
    { name: '--card', tw: 'bg-card' },
    { name: '--muted', tw: 'bg-muted' },
    { name: '--accent', tw: 'bg-accent' },
    { name: '--popover', tw: 'bg-popover' },
  ]},
  { label: 'Semantic', tokens: [
    { name: '--destructive', tw: 'bg-destructive' },
    { name: '--destructive-foreground', tw: 'bg-destructive-foreground' },
  ]},
  { label: 'Charts', tokens: [
    { name: '--chart-1', tw: 'bg-chart-1' },
    { name: '--chart-2', tw: 'bg-chart-2' },
    { name: '--chart-3', tw: 'bg-chart-3' },
    { name: '--chart-4', tw: 'bg-chart-4' },
    { name: '--chart-5', tw: 'bg-chart-5' },
  ]},
  { label: 'Sidebar', tokens: [
    { name: '--sidebar', tw: 'bg-sidebar' },
    { name: '--sidebar-accent', tw: 'bg-sidebar-accent' },
    { name: '--sidebar-primary', tw: 'bg-sidebar-primary' },
  ]},
]

export const RADIUS_VALUES = [
  { label: 'xs', cls: 'rounded-xs', value: '2px', usage: '标签内小标 / 热力格 / 勾选指示器' },
  { label: 'sm', cls: 'rounded-sm', value: '8px', usage: '行内 code·kbd、小控件内嵌块、紧凑按钮' },
  { label: 'md', cls: 'rounded-md', value: '10px', usage: '控件默认（按钮 / 输入 / 选择 / 触发器）' },
  { label: 'lg', cls: 'rounded-lg', value: '12px', usage: '卡片 / 面板 / 区块容器' },
  { label: 'xl', cls: 'rounded-xl', value: '16px', usage: '模态 / 浮层 / 大容器' },
  { label: 'chip', cls: 'rounded-chip', value: '999px', usage: '胶囊（badge / pill / 头像 / 开关）' },
]

export const SHADOW_VALUES = [
  { label: 'shadow-xs', cls: 'shadow-xs' },
  { label: 'shadow', cls: 'shadow' },
  { label: 'shadow-md', cls: 'shadow-md' },
  { label: 'shadow-lg', cls: 'shadow-lg' },
  { label: 'shadow-xl', cls: 'shadow-xl' },
  { label: 'shadow-2xl', cls: 'shadow-2xl' },
]

export const SPACING_SCALE = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64]

// ── H 类批 H2：覆盖率补齐 demo（12 件 canonical 缺口，registry §4.2 ④ 门禁配套）──

/** QuickCardsToggle：页头快捷卡片显隐开关（幽灵钮，激活态主色高亮） */
export function QuickCardsToggleDemo() {
  const [visible, setVisible] = useState(true)
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
      <QuickCardsToggle visible={visible} onToggle={() => setVisible((v) => !v)} />
      <span className="text-xs text-muted-foreground">
        {visible ? 'Cards visible — aria-pressed=true，主色高亮' : 'Cards hidden'}
      </span>
    </div>
  )
}

/** RHF Form 套件：FormField/FormItem/FormLabel/FormControl/FormDescription/FormMessage 全链
 *  （画廊演示不经 <form> 提交——F3.6 表单容器铁律，handleSubmit 由按钮直调） */
export function RhfFormDemo() {
  const form = useForm<{ name: string }>({ defaultValues: { name: '' } })
  return (
    <Form {...form}>
      <div className="max-w-sm space-y-4">
        <FormField
          control={form.control}
          name="name"
          rules={{ required: 'Name is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Inc." {...field} />
              </FormControl>
              <FormDescription>Shown across the workspace.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="button" size="sm" onClick={form.handleSubmit(() => {})}>Submit</Button>
      </div>
    </Form>
  )
}

/** TabBar：浏览器式页签栏（路由驱动自动建签；完整交互挂在主框架 TabsProvider 下） */
export function TabBarDemo() {
  return (
    <TabsProvider>
      <div className="h-9 w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-sidebar">
        <TabBar />
      </div>
    </TabsProvider>
  )
}

export const DEMO_CHART_CONFIG = {
  value: { label: 'Completions', color: 'var(--color-primary)' },
} satisfies ChartConfig

/** H 类批 H3：Registry 对账区——galleryExempt 豁免清单（门禁 fail-closed 的实机可见面） */
export function RegistryAuditTable() {
  const exempt = COMPONENT_REGISTRY.filter((e) => e.galleryExempt)
  if (exempt.length === 0) return null
  return (
    <div className="max-w-3xl">
      <SubLabel>
        画廊豁免清单（galleryExempt）— {exempt.length} 件 · demo 豁免 ≠ 清退豁免，改判 keep 则豁免失效
      </SubLabel>
      <div className="rounded-lg border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>组件</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>文件</TableHead>
              <TableHead>豁免理由</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exempt.map((e) => (
              <TableRow key={e.name}>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell className="text-muted-foreground">{e.status}</TableCell>
                <TableCell className="font-mono text-2xs text-muted-foreground">{e.file}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.galleryExempt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export interface DemoIssueRow { id: string; title: string; status: string; points: number }
export const DEMO_ISSUE_ROWS: DemoIssueRow[] = [
  { id: 'Ordo-1', title: 'AI chat interface', status: 'done', points: 5 },
  { id: 'Ordo-2', title: 'Kanban board view', status: 'in_progress', points: 8 },
  { id: 'Ordo-4', title: 'AI velocity scoring', status: 'in_review', points: 3 },
  { id: 'ACR-1', title: 'Stripe webhook handler', status: 'todo', points: 2 },
  { id: 'Ordo-10', title: 'Concurrent state updates', status: 'canceled', points: 13 },
]
export const DEMO_ISSUE_COLUMNS: ColumnDef<DemoIssueRow, unknown>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'title', header: 'Title' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'points', header: 'Points' },
]

export const CHART_DATA = [
  { month: 'Jan', value: 42, bugs: 8, revenue: 12400 },
  { month: 'Feb', value: 68, bugs: 14, revenue: 18900 },
  { month: 'Mar', value: 55, bugs: 6, revenue: 15300 },
  { month: 'Apr', value: 80, bugs: 20, revenue: 24100 },
  { month: 'May', value: 73, bugs: 11, revenue: 21700 },
  { month: 'Jun', value: 91, bugs: 4, revenue: 28400 },
]

export const PIE_DATA = [
  { name: 'Done', value: 44, fill: 'hsl(var(--chart-2, 190 65% 48%))' },
  { name: 'In Progress', value: 28, fill: 'hsl(var(--chart-1, 25 80% 54%))' },
  { name: 'In Review', value: 16, fill: 'hsl(var(--chart-4, 60 75% 65%))' },
  { name: 'Open', value: 12, fill: 'hsl(var(--chart-3, 230 50% 42%))' },
]

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled'
export type Priority = 'urgent' | 'high' | 'medium' | 'low'
export type Severity = 'critical' | 'high' | 'medium' | 'low'

export const STATUS_CFG: Record<TaskStatus, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  todo: { label: 'Todo', Icon: Circle, color: 'text-muted-foreground', bg: 'bg-muted/50' },
  in_progress: { label: 'In Progress', Icon: Loader, color: 'text-accent-blue', bg: 'bg-accent-blue-light' },
  in_review: { label: 'In Review', Icon: AlertCircle, color: 'text-accent-yellow', bg: 'bg-accent-yellow-light' },
  done: { label: 'Done', Icon: CheckCircle2, color: 'text-accent-green', bg: 'bg-accent-green-light' },
  canceled: { label: 'Canceled', Icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted/50' },
}

export const PRIORITY_CFG: Record<Priority, { label: string; Icon: React.ElementType; color: string }> = {
  urgent: { label: 'Urgent', Icon: ChevronsUp, color: 'text-accent-red' },
  high: { label: 'High', Icon: ArrowUp, color: 'text-accent-orange' },
  medium: { label: 'Medium', Icon: Minus, color: 'text-accent-blue' },
  low: { label: 'Low', Icon: ArrowDown, color: 'text-muted-foreground' },
}

export const SEVERITY_CFG: Record<Severity, { label: string; bar: string; text: string }> = {
  critical: { label: 'Critical', bar: 'bg-accent-red', text: 'text-accent-red' },
  high: { label: 'High', bar: 'bg-accent-orange', text: 'text-accent-orange' },
  medium: { label: 'Medium', bar: 'bg-accent-yellow', text: 'text-accent-yellow' },
  low: { label: 'Low', bar: 'bg-muted-foreground/30', text: 'text-muted-foreground' },
}

export const MILESTONE_COLORS = [
  { bg: 'bg-accent-blue-light', text: 'text-accent-blue', border: 'border-accent-blue/20' },
  { bg: 'bg-accent-purple-light', text: 'text-accent-purple', border: 'border-accent-purple/20' },
  { bg: 'bg-accent-green-light', text: 'text-accent-green', border: 'border-accent-green/20' },
  { bg: 'bg-accent-yellow-light', text: 'text-accent-yellow', border: 'border-accent-yellow/20' },
]

export const ACCEPT_STAGES: Record<string, { label: string; color: string; bg: string }> = {
  unit: { label: 'Unit Test', color: 'text-accent-blue', bg: 'bg-accent-blue-light' },
  internal: { label: 'Internal', color: 'text-accent-purple', bg: 'bg-accent-purple-light' },
  dev: { label: 'Dev Team', color: 'text-accent-green', bg: 'bg-accent-green-light' },
  pm: { label: 'PM', color: 'text-accent-yellow', bg: 'bg-accent-yellow-light' },
  client: { label: 'Client', color: 'text-muted-foreground', bg: 'bg-muted/60' },
}

export function SectionAnchor({ id, children }: { id: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-6">{children}</section>
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border flex items-center gap-2">
      {children}
    </h2>
  )
}

export function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-3xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{children}</p>
  )
}

export function TokenLabel({ name }: { name: string }) {
  const { copyToClipboard, isCopied: copied } = useCopyToClipboard({ timeout: 1200 })
  return (
    <button onClick={() => copyToClipboard(name)} className="flex items-center gap-1 text-3xs text-muted-foreground hover:text-foreground font-mono group transition-colors">
      <span>{name}</span>
      {copied
        ? <Check className="w-2.5 h-2.5 text-emerald-500" />
        : <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />}
    </button>
  )
}

/* ── coss 新组件演示（2026-08 引入） ─────────────────────────── */

export function MarkdownEditorDemo() {
  const [value, setValue] = useState(
    '左侧输入，右侧实时渲染 —— **加粗**、`code`、- 列表\n\n支持高度限制与组件内滚动显示。\n\n' +
      Array.from({ length: 8 }, (_, i) => `段落 ${i + 1}：超出高度上限后采用组件内滚动显示，不再撑大外层容器。`).join('\n\n'),
  )
  return (
    <MarkdownEditor
      value={value}
      onChange={setValue}
      rows={4}
      preview="live"
      maxHeight={200}
      placeholder="live 分栏实时预览（宽容器）"
    />
  )
}

/* ── 块级所见即所得编辑器演示（CAP-A-04 描述区形态） ───────────────── */

export function MarkdownLiveEditorDemo() {
  const [value, setValue] = useState(
    '点哪编哪：非活跃块恒为渲染态，点击块就地编辑。\n\n支持 **加粗**、`code`、- 列表、> 引用。\n\n失焦或 Esc 回渲染态。\n\n' +
      Array.from({ length: 8 }, (_, i) => `块级内容 ${i + 1}：超出合理范围采用组件内滚动显示，保证页面其他组件不被挤压。`).join('\n\n'),
  )
  return (
    <MarkdownLiveEditor
      value={value}
      onChange={setValue}
      rows={2}
      maxHeight={220}
      placeholder="添加描述…"
    />
  )
}

/* ── 提示词编辑器演示（CAP-A-24：编辑态所见即所得 / 只读态纯渲染） ── */

export function PromptEditorDemo({ mode }: { mode: 'edit' | 'readonly' }) {
  const [value, setValue] = useState(
    '# 项目协作约定\n\n- 提交前跑 **lint + test**\n- 引用任务用 `ordo://` 链接\n',
  )
  return mode === 'edit' ? (
    <PromptEditor
      value={value}
      onChange={setValue}
      placeholder="项目提示词…"
      rows={3}
    />
  ) : (
    <PromptEditor value={value} readOnly />
  )
}

/* ── 全局实体引用系统演示（CAP-A-23）：胶囊 / 斜杠命令 / 路由预览卡 ── */

export const REF_KIND_SAMPLES: Array<{ kind: OrdoRefKind; label: string; href: string }> = [
  { kind: 'doc', label: '需求分析报告', href: 'ordo://Ordo/doc/D17' },
  { kind: 'issue', label: '修复登录超时', href: 'ordo://Ordo/issue/Ordo-PF-001' },
  { kind: 'bug', label: '列表分页失效', href: 'ordo://Ordo/bug/Ordo-BF-014' },
  { kind: 'member', label: '王小明', href: 'ordo://Ordo/member/M7' },
  { kind: 'team', label: '平台组', href: 'ordo://Ordo/team/T2' },
  { kind: 'acceptance', label: '登录流验收', href: 'ordo://Ordo/acceptance/AC9' },
  { kind: 'release', label: 'v0.7.4', href: 'ordo://Ordo/release/R12' },
]

export function RefCapsuleDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {REF_KIND_SAMPLES.map((sample) => (
        <OrdoRefLink key={sample.kind} href={sample.href}>
          {sample.label}
        </OrdoRefLink>
      ))}
    </div>
  )
}

export function RefMarkdownDemo() {
  return (
    <MarkdownView
      content={[
        '任务拆解见 [修复登录超时](ordo://Ordo/issue/Ordo-PF-001)，依据 [需求分析报告](ordo://Ordo/doc/D17)，评审人 [王小明](ordo://Ordo/member/M7)。',
        '',
        '外链保持原样：[Ordo 文档站](https://example.com/docs)。',
      ].join('\n')}
    />
  )
}

export function SlashRefDemo() {
  const [value, setValue] = useState('')
  return (
    <SlashRefTextarea
      value={value}
      onChange={setValue}
      rows={2}
      placeholder="键入 / 引用任务、Bug、文档、成员…"
    />
  )
}

/** 路由预览卡样例：占位 ID 无真实数据时卡片呈加载/错误态，真实实体即富数据 */
export const PREVIEW_ROUTE_SAMPLES: Array<{ label: string; path: string }> = [
  { label: '项目', path: '/app/projects/demo-project' },
  { label: '任务', path: '/app/issues/demo-issue' },
  { label: 'Bug', path: '/app/bugs/demo-bug' },
  { label: '文档', path: '/app/documents/demo-doc' },
  { label: '仓库', path: '/app/repositories/demo-repo' },
  { label: '成员', path: '/app/members/demo-member' },
  { label: '团队', path: '/app/teams/demo-team' },
  { label: '验收', path: '/app/acceptance/demo-acc' },
  { label: '执行', path: '/app/executions/demo-exec' },
  { label: '发版', path: '/app/releases/demo-release' },
  { label: '工作流', path: '/app/workflows/demo-workflow' },
]

export function RoutePreviewDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PREVIEW_ROUTE_SAMPLES.map((sample) => (
        <RoutePreviewTrigger key={sample.path} path={sample.path} side="top">
          <span
            title={sample.path}
            className="inline-flex cursor-pointer items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs text-primary transition-colors hover:bg-primary/10"
          >
            {sample.label}
          </span>
        </RoutePreviewTrigger>
      ))}
    </div>
  )
}

/* coss p-command 演示（base-ui autocomplete 引擎，与全局面板同源实现） */

export type CommandDemoItem = {
  id: string
  label: string
  keywords?: string[]
  shortcut?: string
  icon?: StatusIconComponent
}

export const commandDemoGroups: Array<{ value: string; label: string; items: CommandDemoItem[] }> = [
  {
    value: 'nav',
    label: '导航',
    items: (
      [
        { entity: 'project', label: '打开项目', keywords: ['project', '项目'] },
        { entity: 'issue', label: '打开任务', keywords: ['task', '任务'] },
        { entity: 'workflow', label: '打开工作流', keywords: ['workflow'] },
        { entity: 'acceptance', label: '打开验收', keywords: ['acceptance'] },
        { entity: 'decision', label: '打开决策', keywords: ['decision'] },
        { entity: 'repository', label: '打开仓库', keywords: ['repo'] },
      ] as const
    ).map(({ entity, label, keywords }) => ({
      id: `demo-${entity}`,
      label,
      keywords: [...keywords],
      icon: getEntityIcon(entity).icon,
    })),
  },
  {
    value: 'actions',
    label: '操作',
    items: [
      { id: 'demo-ask-ai', label: '问主 AI', keywords: ['ai', 'assistant'], shortcut: 'Alt A', icon: MessagesSquare },
      { id: 'demo-theme', label: '切换到深色 / 浅色模式', keywords: ['theme', 'dark', 'light'], icon: SunMoon },
    ],
  },
]

export function CommandPaletteDemo() {
  const [query, setQuery] = useState('')
  // 引擎同款过滤（accent/大小写不敏感 contains + keywords），预滤掉空组避免渲染孤儿标题
  const { contains } = useAutocompleteFilter({ sensitivity: 'base' })
  const filterItem = useCallback((item: CommandDemoItem, q: string): boolean => {
    if (!q.trim()) return true
    if (contains(item.label, q)) return true
    return (item.keywords ?? []).some((keyword) => contains(keyword, q))
  }, [contains])
  const trimmed = query.trim()
  const visibleGroups = useMemo(
    () =>
      commandDemoGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => filterItem(item, query)),
        }))
        .filter((group) => group.items.length > 0),
    [filterItem, query]
  )

  return (
    <div className="flex justify-center">
      <div className="w-140 overflow-hidden rounded-xl border border-border shadow-2xl bg-card">
        <Command items={visibleGroups} filter={filterItem}>
          <div className="relative flex items-center *:first:flex-1">
            <CommandInput
              placeholder="输入命令或搜索…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <CommandPanel>
            <CommandEmpty className="not-empty:py-12">
              <p className="text-muted-foreground text-sm">
                {trimmed ? `没有匹配「${trimmed}」的命令` : '没有匹配的命令'}
              </p>
            </CommandEmpty>
            <CommandList>
              {(group: (typeof visibleGroups)[number]) => (
                <CommandGroup items={group.items} key={group.value}>
                  <CommandGroupLabel>{group.label}</CommandGroupLabel>
                  <CommandCollection>
                    {(item: CommandDemoItem) => {
                      const Icon = item.icon
                      return (
                        <CommandItem key={item.id} value={item} onClick={() => undefined}>
                          {Icon ? <Icon className="text-muted-foreground" /> : null}
                          <span className="flex-1">{item.label}</span>
                          {item.shortcut ? <CommandShortcut>{item.shortcut}</CommandShortcut> : null}
                        </CommandItem>
                      )
                    }}
                  </CommandCollection>
                </CommandGroup>
              )}
            </CommandList>
          </CommandPanel>
          <CommandFooter>
            <div className="flex items-center gap-4">
              <span>↑↓ 导航</span>
              <span>↵ 选择</span>
              <span>ESC 关闭</span>
            </div>
            <span className="text-3xs">coss p-command · base-ui autocomplete 引擎</span>
          </CommandFooter>
        </Command>
      </div>
    </div>
  )
}

export function ToastDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => toast.success('Event has been created', { description: 'Monday, January 3rd at 6:00pm' })}>
        Success
      </Button>
      <Button size="sm" variant="outline" onClick={() => toast.error('Something went wrong', { description: 'Check the console for details.' })}>
        Error
      </Button>
      <Button size="sm" variant="outline" onClick={() => toast.info('New version available')}>
        Info
      </Button>
      <Button size="sm" variant="outline" onClick={() => toast.warning('This action may have consequences')}>
        Warning
      </Button>
      <Button size="sm" variant="outline" onClick={() => toast('Deploy started', { action: { label: 'View logs', onClick: () => toast.info('Opening logs…') } })}>
        With Action
      </Button>
      <Button size="sm" variant="outline" onClick={() => toast.promise(new Promise((r) => setTimeout(r, 1500)), { loading: 'Uploading…', success: 'Upload complete', error: 'Upload failed' })}>
        Promise
      </Button>
    </div>
  )
}

export function MenuDemo() {
  const [shuffle, setShuffle] = React.useState(false)
  const [sort, setSort] = React.useState('artist')
  return (
    <div className="flex flex-wrap items-start gap-3">
      <Menu>
        <MenuTrigger render={<Button variant="outline">Open Menu</Button>} />
        <MenuPopup className="min-w-52">
          <MenuGroupLabel>Playback</MenuGroupLabel>
          <MenuItem onClick={() => undefined}>
            Play <MenuShortcut>⌘P</MenuShortcut>
          </MenuItem>
          <MenuItem disabled>Pause</MenuItem>
          <MenuSeparator />
          <MenuCheckboxItem checked={shuffle} onCheckedChange={setShuffle}>
            Shuffle
          </MenuCheckboxItem>
          <MenuRadioGroup value={sort} onValueChange={setSort}>
            <MenuRadioItem value="artist">Sort by artist</MenuRadioItem>
            <MenuRadioItem value="album">Sort by album</MenuRadioItem>
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuSub>
            <MenuSubTrigger>Add to playlist</MenuSubTrigger>
            <MenuSubPopup>
              <MenuItem>Favorites</MenuItem>
              <MenuItem>Focus</MenuItem>
            </MenuSubPopup>
          </MenuSub>
          <MenuItem variant="destructive" onClick={() => toast.warning('Deleted (demo)')}>
            Delete
          </MenuItem>
        </MenuPopup>
      </Menu>
      <ContextMenu
        items={createMenuItems([
          { label: 'Edit', icon: <Edit2 className="size-4" />, onClick: () => undefined },
          { label: 'Duplicate', icon: <Copy className="size-4" />, separatorAfter: true },
          { label: 'Delete', icon: <Trash2 className="size-4" />, destructive: true, onClick: () => undefined },
        ])}
      >
        <div className="rounded-md border border-dashed px-4 py-3 text-xs text-muted-foreground">
          右键点击这里（coss 设计弹出层）
        </div>
      </ContextMenu>
    </div>
  )
}

export function DatePickerDemo() {
  const [date, setDate] = React.useState<Date | undefined>(undefined)
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 86_400_000)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <DatePicker value={date} onValueChange={setDate} />
      <DatePicker
        value={date}
        onValueChange={setDate}
        placeholder="With presets"
        presets={[
          { label: 'Today', date: today },
          { label: 'Tomorrow', date: tomorrow },
        ]}
      />
    </div>
  )
}

export function NumberFieldDemo() {
  const [value, setValue] = React.useState<number | null>(4)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <NumberField value={value} onValueChange={setValue} min={0} step={0.5} size="sm">
        <NumberFieldGroup>
          <NumberFieldDecrement aria-label="Decrease" />
          <NumberFieldInput />
          <NumberFieldIncrement aria-label="Increase" />
        </NumberFieldGroup>
      </NumberField>
      <NumberField value={value} onValueChange={setValue} min={0} step={0.5}>
        <NumberFieldGroup>
          <NumberFieldDecrement aria-label="Decrease" />
          <NumberFieldInput />
          <NumberFieldIncrement aria-label="Increase" />
        </NumberFieldGroup>
      </NumberField>
      <NumberField value={value} onValueChange={setValue} min={0} step={0.5} size="lg">
        <NumberFieldGroup>
          <NumberFieldDecrement aria-label="Decrease" />
          <NumberFieldInput />
          <NumberFieldIncrement aria-label="Increase" />
        </NumberFieldGroup>
      </NumberField>
    </div>
  )
}

export const AUTOCOMPLETE_FRUITS = ['Apple', 'Banana', 'Cherry', 'Grape', 'Mango', 'Peach', 'Pear', 'Pineapple']

export function AutocompleteDemo() {
  const [value, setValue] = React.useState('')
  const filter = useAutocompleteFilter()
  const options = AUTOCOMPLETE_FRUITS.filter((fruit) => filter.contains(fruit, value))
  return (
    <div className="w-full max-w-xs">
      <Autocomplete value={value} onValueChange={setValue}>
        <AutocompleteInput placeholder="Type to filter fruits…" showClear />
        <AutocompletePopup>
          <AutocompleteList>
            <AutocompleteEmpty>No results found.</AutocompleteEmpty>
            {options.map((fruit) => (
              <AutocompleteItem key={fruit} value={fruit}>
                {fruit}
              </AutocompleteItem>
            ))}
          </AutocompleteList>
        </AutocompletePopup>
      </Autocomplete>
    </div>
  )
}

export function CheckboxGroupDemo() {
  const [channels, setChannels] = React.useState<string[]>(['email'])
  return (
    <CheckboxGroup value={channels} onValueChange={setChannels}>
      {['Email', 'Push', 'SMS'].map((channel) => (
        <label key={channel} className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox value={channel} />
          {channel}
        </label>
      ))}
    </CheckboxGroup>
  )
}

export function MeterDemo() {
  return (
    <div className="w-full max-w-sm space-y-4">
      <Meter value={72} min={0} max={100}>
        <div className="flex items-baseline justify-between">
          <MeterLabel>Storage used</MeterLabel>
          <MeterValue>{(formatted) => formatted}</MeterValue>
        </div>
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      </Meter>
      <Meter value={38} min={0} max={100} />
      <Meter value={96} min={0} max={100}>
        <div className="flex items-baseline justify-between">
          <MeterLabel>Quota (critical)</MeterLabel>
          <MeterValue>{(formatted) => formatted}</MeterValue>
        </div>
        <MeterTrack>
          <MeterIndicator className="bg-accent-red" />
        </MeterTrack>
      </Meter>
    </div>
  )
}

export const SCRUBBER_CHAPTERS: Chapter[] = [
  { id: 'intake', meta: 'Phase 01', title: '需求录入与拆解', description: '产品将原始需求整理为结构化任务，附验收标准与优先级。' },
  { id: 'assign', meta: 'Phase 02', title: 'AI 智能分派', description: '按成员技能与负载推荐执行人，Agent 可认领自动化任务。' },
  { id: 'exec', meta: 'Phase 03', title: '执行与过程追踪', description: '执行运行面板实时回传步骤输出，动态时间线记录关键事件。' },
  { id: 'review', meta: 'Phase 04', title: '完成评审', description: '产出物进入完成评审流，评审人逐项核对验收标准。' },
  { id: 'accept', meta: 'Phase 05', title: '多级验收', description: '单元/内部/开发/PM/客户五级验收链逐级放行。' },
  { id: 'sync', meta: 'Phase 06', title: 'Linear 同步', description: '任务状态双向同步到 Linear，外部协作不断档。' },
  { id: 'retro', meta: 'Phase 07', title: '复盘与归档', description: '动态时间线沉淀为项目档案，结论进入知识库。' },
  { id: 'release', meta: 'Phase 08', title: '发布与巡检', description: '稳定化巡检通过后对外发布并归档版本。' },
]

export function ChapterScrubberDemo() {
  const [current, setCurrent] = React.useState(2)
  const [active, setActive] = React.useState<Chapter | null>(null)
  const shown = active ?? SCRUBBER_CHAPTERS[current]
  return (
    <div className="flex items-center gap-8 rounded-xl border border-border bg-background px-8 py-6">
      <ChapterScrubber
        chapters={SCRUBBER_CHAPTERS}
        currentIndex={current}
        onSelect={(_, index) => setCurrent(index)}
        onActiveChange={setActive}
      />
      <div className="min-w-0">
        <div className="text-3xs font-medium tabular-nums text-muted-foreground">{shown.meta}</div>
        <div className="truncate text-sm font-semibold">{shown.title}</div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{shown.description}</p>
        <p className="mt-3 text-3xs text-muted-foreground">
          {active ? 'hover 预览中 — 点击切换 current（主色刻度）' : '悬停刻度出现放大波与预览卡，点击/方向键切换章节'}
        </p>
      </div>
    </div>
  )
}

/** 演示件 = 业务映射薄包装：视觉全部来自真组件 StatusIconFrame（list 档）+ tone 唯一链路 */
export function StatusChip({ status }: { status: TaskStatus }) {
  const visual = TASK_STATUS_VISUALS[status]
  return (
    <StatusIconFrame
      icon={visual.icon}
      tone={visual.tone}
      size="list"
      spin={status === 'in_progress'}
      title={STATUS_CFG[status].label}
    />
  )
}

export function PriorityIcon({ priority }: { priority: Priority }) {
  const visual = PRIORITY_VISUALS[priority]
  return (
    <StatusIconFrame icon={visual.icon} tone={visual.tone} size="list" title={PRIORITY_CFG[priority].label} />
  )
}

export function MilestonePill({ name, idx = 0 }: { name: string; idx?: number }) {
  const c = MILESTONE_COLORS[idx % MILESTONE_COLORS.length]
  return (
    <span className={cn('inline-flex items-center text-2xs font-medium h-5.5 px-2 rounded-md border whitespace-nowrap truncate', c.bg, c.text, c.border)}>
      {name}
    </span>
  )
}

export function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center text-3xs h-5.5 px-1.5 rounded-sm font-medium whitespace-nowrap bg-muted/60 text-foreground border border-border/40"
      style={{ color }}>
      {name}
    </span>
  )
}

// SubtaskBadge：语义组件 semantic/subtask-badge（22px 标准，进度环与边框等距贴合）——画廊直接演示真件

export function AssigneeAvatar({ initials, color }: { initials?: string; color?: string }) {
  if (!initials) {
    return (
      <div className="w-5.5 h-5.5 rounded-full border border-dashed border-border flex items-center justify-center shrink-0">
        <User className="h-3 w-3 text-muted-foreground/40" />
      </div>
    )
  }
  return (
    <div className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-primary-foreground text-3xs font-semibold shrink-0 bg-primary/80 border border-primary/20"
      style={color ? { backgroundColor: color } : undefined}>
      {initials}
    </div>
  )
}

export function AvatarPickerShowcase() {
  const [value, setValue] = useState<string | null>('nice-avatar:alex')
  return (
    <div className="space-y-3 max-w-xl">
      <div className="rounded-lg border border-border/70 p-3.5 bg-muted/10 space-y-2">
        <p className="text-xs font-medium text-foreground">双表面预设（人类同事 NiceAvatar 插画肖像 & AI 智能体 Avvvatars 算法几何）</p>
        <AvatarPickerField value={value} onValueChange={setValue} />
        <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
          <span>当前选择路径:</span>
          <code className="font-mono text-2xs px-1.5 py-0.5 rounded bg-muted text-foreground">
            {value ?? '（未选择）'}
          </code>
        </div>
      </div>
    </div>
  )
}

export function ColorPickerShowcase() {
  const [value, setValue] = useState<string>('#5E6AD2')
  const [presetOnly, setPresetOnly] = useState<string>('#22c55e')
  return (
    <div className="space-y-3 max-w-xl">
      <div className="rounded-lg border border-border/70 p-3.5 bg-muted/10 space-y-2">
        <p className="text-xs font-medium text-foreground">预设色板 + react-colorful 色域 + Hex 输入（allowCustom）</p>
        <div className="flex items-center gap-3">
          <ColorPicker value={value} onValueChange={setValue} />
          <span className="text-xs text-muted-foreground">当前值:</span>
          <code className="font-mono text-2xs px-1.5 py-0.5 rounded bg-muted text-foreground">
            {value}
          </code>
        </div>
      </div>
      <div className="rounded-lg border border-border/70 p-3.5 bg-muted/10 space-y-2">
        <p className="text-xs font-medium text-foreground">纯预设模式（allowCustom=false，标签色等受约束场景）</p>
        <ColorPicker value={presetOnly} onValueChange={setPresetOnly} allowCustom={false} />
      </div>
    </div>
  )
}

export function AvatarModernizationShowcase() {
  const [humanSeed, setHumanSeed] = useState('Alex Chen')
  const [humanNonce, setHumanNonce] = useState(0)
  const [agentSeed, setAgentSeed] = useState('claude-code')
  const [avStyle, setAvStyle] = useState<'shape' | 'character'>('shape')
  const [avShadow, setAvShadow] = useState(true)

  const humanPresets = ['Alex Chen', 'Sarah Lin', 'Leo Zhang', 'David Wu', 'Emma Zhao', 'Lucas Gray']
  const agentPresets = ['claude-code', 'codex', 'zcode', 'doc-bot', 'qa-bot', 'guardian']

  // 模拟团队人类同事（react-nice-avatar）与 AI 同事（avvvatars）全景花名册
  const humanTeam = [
    { name: 'Alex Chen', role: '系统架构师', handle: 'alex', status: 'online' as const },
    { name: 'Sarah Lin', role: '研发技术主管', handle: 'sarah', status: 'online' as const },
    { name: 'Leo Zhang', role: '全栈工程师', handle: 'leo', status: 'online' as const },
    { name: 'David Wu', role: '数据架构师', handle: 'david', status: 'offline' as const },
    { name: 'Emma Zhao', role: '体验设计主管', handle: 'emma', status: 'online' as const },
    { name: 'Lucas Gray', role: '交付与质保', handle: 'lucas', status: 'busy' as const },
  ]

  const agentTeam = [
    { name: 'Claude Coder', role: '主工程智能体', handle: 'claude-code', model: 'Claude 3.7', status: 'active' as const },
    { name: 'Codex Reviewer', role: '代码审查智能体', handle: 'codex', model: 'Codex CLI', status: 'active' as const },
    { name: 'ZCode Daemon', role: '运行时守护', handle: 'zcode', model: 'Runtime Agent', status: 'idle' as const },
    { name: 'Doc Architect', role: '知识库与契约', handle: 'doc-bot', model: 'Knowledge AI', status: 'active' as const },
    { name: 'QA Gatekeeper', role: '门禁与回流', handle: 'qa-bot', model: 'Evidence Guard', status: 'active' as const },
    { name: 'Guardian Bot', role: '安全与风险审计', handle: 'guardian', model: 'Security Agent', status: 'idle' as const },
  ]

  const effectiveHumanSeed = humanNonce > 0 ? `${humanSeed}#${humanNonce}` : humanSeed
  const currentNiceConfig = genConfig(effectiveHumanSeed)

  return (
    <div className="space-y-4 max-w-3xl rounded-xl border border-border p-4 bg-card/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent-purple" />
            <h3 className="text-sm font-semibold text-foreground">
              双表面头像体系（人类同事: react-nice-avatar × AI 同事: avvvatars）
            </h3>
            <Badge variant="outline" className="text-3xs text-accent-blue border-accent-blue/30">官方定夺</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            全面舍弃其他非标方案。人类同事采用 <code>react-nice-avatar</code> 确定性插画肖像；AI 同事采用 <code>avvvatars</code> 算法几何。纯本地 SVG 驱动，零外网依赖。
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-3xs text-accent-green bg-accent-green/10 border-accent-green/30">
            双表面 100% 确定性生成
          </Badge>
        </div>
      </div>

      {/* 双工作台：人类肖像 vs AI 几何 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 左栏：人类同事肖像生成器 (react-nice-avatar) */}
        <div className="rounded-xl border border-accent-blue/30 bg-background/90 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <User className="size-4 text-accent-blue" />
              <span className="text-xs font-semibold text-foreground">人类同事肖像引擎</span>
            </div>
            <Badge variant="secondary" className="text-3xs text-accent-blue bg-accent-blue/10">react-nice-avatar</Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="size-16 rounded-full overflow-hidden border-2 border-accent-blue/40 shadow-sm shrink-0">
              <NiceAvatar style={{ width: '100%', height: '100%' }} shape="circle" {...currentNiceConfig} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground truncate">{humanSeed}</span>
                <button
                  type="button"
                  onClick={() => setHumanNonce((n) => n + 1)}
                  className="px-2 py-0.5 rounded text-3xs font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
                >
                  随机变幻
                </button>
              </div>
              <div className="flex flex-wrap gap-1 text-3xs font-mono text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-muted/60">性别: {currentNiceConfig.sex}</span>
                <span className="px-1.5 py-0.5 rounded bg-muted/60">发型: {currentNiceConfig.hairStyle}</span>
                <span className="px-1.5 py-0.5 rounded bg-muted/60">服饰: {currentNiceConfig.shirtStyle}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-3xs text-muted-foreground">测试 Seed / 姓名:</span>
              <div className="flex flex-wrap gap-1">
                {humanPresets.slice(0, 4).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setHumanSeed(p); setHumanNonce(0); }}
                    className={cn(
                      'px-1.5 py-0.5 rounded text-3xs font-mono transition-colors',
                      humanSeed === p ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    )}
                  >
                    {p.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            <Input
              value={humanSeed}
              onChange={(e) => { setHumanSeed(e.target.value || 'User'); setHumanNonce(0); }}
              placeholder="输入人类成员姓名或邮箱…"
              className="h-7 text-xs font-mono"
            />
          </div>
        </div>

        {/* 右栏：AI 同事算法几何生成器 (avvvatars) */}
        <div className="rounded-xl border border-accent-purple/30 bg-background/90 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bot className="size-4 text-accent-purple" />
              <span className="text-xs font-semibold text-foreground">AI 同事几何符号引擎</span>
            </div>
            <Badge variant="secondary" className="text-3xs text-accent-purple bg-accent-purple/10">avvvatars-react</Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="size-16 rounded-full overflow-hidden border-2 border-accent-purple/40 shadow-sm shrink-0 flex items-center justify-center">
              <Avvvatars value={agentSeed} size={64} style={avStyle} shadow={avShadow} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground truncate">@{agentSeed}</span>
                <div className="inline-flex rounded-md border border-border p-0.5 bg-muted/40">
                  <button
                    type="button"
                    onClick={() => setAvStyle('shape')}
                    className={cn(
                      'px-1.5 py-0.5 text-3xs font-medium rounded transition-colors',
                      avStyle === 'shape' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground'
                    )}
                  >
                    Shape
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvStyle('character')}
                    className={cn(
                      'px-1.5 py-0.5 text-3xs font-medium rounded transition-colors',
                      avStyle === 'character' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground'
                    )}
                  >
                    Char
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 text-3xs font-mono text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-muted/60">模式: {avStyle}</span>
                <span className="px-1.5 py-0.5 rounded bg-muted/60">60 几何哈希</span>
                <button
                  type="button"
                  onClick={() => setAvShadow(!avShadow)}
                  className="px-1.5 py-0.5 rounded bg-muted/60 hover:bg-muted text-accent-purple"
                >
                  {avShadow ? '阴影: 开' : '阴影: 关'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-3xs text-muted-foreground">测试智能体 Handle:</span>
              <div className="flex flex-wrap gap-1">
                {agentPresets.slice(0, 4).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAgentSeed(p)}
                    className={cn(
                      'px-1.5 py-0.5 rounded text-3xs font-mono transition-colors',
                      agentSeed === p ? 'bg-accent-purple text-white font-semibold' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    )}
                  >
                    @{p.split('-')[0]}
                  </button>
                ))}
              </div>
            </div>
            <Input
              value={agentSeed}
              onChange={(e) => setAgentSeed(e.target.value || 'agent')}
              placeholder="输入智能体标识…"
              className="h-7 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* 全景团队画廊 */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Users className="size-3.5 text-primary" />
            全景人机协同画廊（人类同事 react-nice-avatar vs AI 同事 avvvatars）
          </span>
          <span className="text-3xs text-muted-foreground font-mono">2 大引擎 · 12 位协同成员</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 人类同事阵列 */}
          <div className="rounded-xl border border-border/80 bg-background p-3 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
              <span className="text-xs font-semibold text-accent-blue flex items-center gap-1">
                <User className="size-3" /> 人类工程师与产品团队
              </span>
              <Badge variant="outline" className="text-3xs text-accent-blue border-accent-blue/30">插画肖像</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {humanTeam.map((h) => (
                <div key={h.name} className="flex flex-col items-center text-center p-2 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors">
                  <div className="relative size-11 rounded-full overflow-hidden border border-border/60 shadow-xs mb-1.5">
                    <NiceAvatar style={{ width: '100%', height: '100%' }} shape="circle" {...genConfig(h.name)} />
                    <span className={cn(
                      'absolute bottom-0 right-0 size-2.5 rounded-full border border-background',
                      h.status === 'online' ? 'bg-accent-green' : h.status === 'busy' ? 'bg-accent-yellow' : 'bg-muted-foreground'
                    )} />
                  </div>
                  <span className="text-xs font-medium text-foreground truncate max-w-24">{h.name}</span>
                  <span className="text-3xs text-muted-foreground truncate max-w-24">{h.role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI 同事智能体阵列 */}
          <div className="rounded-xl border border-border/80 bg-background p-3 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
              <span className="text-xs font-semibold text-accent-purple flex items-center gap-1">
                <Bot className="size-3" /> AI 智能体执行面
              </span>
              <Badge variant="outline" className="text-3xs text-accent-purple border-accent-purple/30">算法几何</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {agentTeam.map((a) => (
                <div key={a.handle} className="flex flex-col items-center text-center p-2 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors">
                  <div className="relative size-11 rounded-full overflow-hidden border border-border/60 shadow-xs mb-1.5 flex items-center justify-center">
                    <Avvvatars value={a.handle} size={44} style={avStyle} shadow={false} />
                    <span className={cn(
                      'absolute bottom-0 right-0 size-2.5 rounded-full border border-background',
                      a.status === 'active' ? 'bg-accent-purple animate-pulse' : 'bg-muted-foreground'
                    )} />
                  </div>
                  <span className="text-xs font-medium text-foreground truncate max-w-24">{a.name}</span>
                  <span className="text-3xs text-accent-purple font-mono truncate max-w-24">@{a.handle}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 架构裁决横幅 */}
      <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 p-3.5 text-xs space-y-1.5">
        <div className="flex items-center gap-2 text-accent-green font-semibold">
          <CheckCircle2 className="size-4" />
          <span>架构裁决：已舍弃其余非标方案，确立人类 (react-nice-avatar) 与 AI (avvvatars) 唯一标准</span>
        </div>
        <p className="text-2xs text-muted-foreground leading-relaxed">
          全仓统一由 <code>MemberAvatar</code> 组件自动承接：人类成员根据名称或标识确定性生成精美人物肖像；AI 智能体自动渲染极具未来感的算法几何符号。无需配置外部图片或 CDN，在离线与 Electron 桌面端具备 100% 稳定性与极致性能。
        </p>
      </div>
    </div>
  )
}

export function MentionShowcase() {
  const [text, setText] = useState('这个任务交给 @claude-coder 处理，@alice 负责评审。')
  return (
    <div className="space-y-2 max-w-lg">
      <MentionTextarea value={text} onChange={setText} rows={2} placeholder="输入 @ 提及成员…" />
      <div className="rounded-md border border-border p-2 text-sm">
        <MentionRenderer text={text} />
      </div>
    </div>
  )
}

export function ActivityHeatmapShowcase() {
  const data = Array.from({ length: 91 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (90 - i))
    const seed = Math.sin(i * 12.9898) * 43758.5453
    const count = Math.floor(Math.abs(seed % 1) * 8) - 4
    return { date: d.toISOString().slice(0, 10), count: Math.max(0, count) }
  })
  return <ActivityHeatmap data={data} days={91} className="max-w-lg" />
}

export function SeverityBar({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CFG[severity]
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-1 h-5.5 rounded-full shrink-0', cfg.bar)} />
      <span className={cn('text-xs font-medium', cfg.text)}>{cfg.label}</span>
    </div>
  )
}

export function AcceptPill({ stage, passed }: { stage: string; passed: boolean | null }) {
  const cfg = ACCEPT_STAGES[stage]
  if (passed === null) {
    return (
      <span className="inline-flex items-center text-2xs h-5.5 px-2 rounded-md border border-dashed border-border text-muted-foreground/50">
        {cfg.label}
      </span>
    )
  }
  if (passed) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-2xs h-5.5 px-2 rounded-md border border-transparent', cfg.bg, cfg.color)}>
        <Check className="w-2.5 h-2.5" /> {cfg.label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-2xs h-5.5 px-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
      <X className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  )
}

export function AgentPill({ name, status }: { name: string; status: 'active' | 'contributed' | 'idle' | 'not_used' }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
    contributed: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
    idle: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
    not_used: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span className={cn('inline-flex items-center text-2xs font-medium h-5.5 px-2 rounded-md border', colors[status])}>
      {name}
    </span>
  )
}

