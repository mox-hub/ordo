/**
 * ★ 画廊 demo 本体（生成文件）——2026-10-27 展示层路由化批由一次性切分脚本机械产生：
 * 原 design-system-page.tsx 巨型单页的 105 个 <SectionAnchor> 锚块，一锚一块一组件，
 * 内容零改动（子锚块以组件引用原位嵌套，保留 DOM id 供滚动定位）。
 * 映射表 GALLERY_SECTIONS 供单页路由（design-system-section-page）按 id 渲染；
 * 画廊覆盖率门禁（check-component-registry.mjs §4.2 ④）自本批起改扫 sections/ 目录。
 * 此后按普通代码维护，不再机械再生；demo 内容级修改直接改对应 Sec_* 组件。
 */
import * as React from 'react'
import { Activity, AlertCircle, AlertTriangle, Bell, Bookmark, BookOpen, Bot, Briefcase, Bug, CalendarRange, Building2, Check, CheckCircle2, CheckSquare, ChevronDown, ChevronRight, Circle, ClipboardCheck, Clock, Code2, Download, Edit2, ExternalLink, FileText, Flag, FlaskConical, FolderKanban, GitBranch, Inbox, GitPullRequest, GitCommit, Info, Kanban, Layers, LayoutGrid, List, Loader, Loader2, Mail, Milestone, Minus, MoreHorizontal, Palette, PanelRight, Plus, RefreshCw, Rocket, Search, Settings, Share2, SlidersHorizontal, Sparkles, Star, Tag, Target, Trash2, TrendingDown, TrendingUp, User, Users, X, XCircle, CircleCheck, ShieldCheck, ListChecks, AlignLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MemberAvatar } from '@/modules/team-member/components/member-avatar'
import { TrustLevelBadge } from '@/modules/team-member/components/trust-level-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'
import { HoverCard, HoverCardArrow, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { PreviewFooterMeta, PreviewRow, PreviewSection } from '@/shared/route-preview/previews/preview-fields'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Spinner } from '@/components/ui/spinner'
import { Stepper, StepperDescription, StepperIndicator, StepperItem, StepperNav, StepperSeparator, StepperTitle, StepperTrigger } from '@/components/ui/stepper'
import { IconStack } from '@/components/semantic/icon-stack'
import { StatusPill } from '@/components/semantic/status-pill'
import { AiVerdictPill } from '@/components/semantic/ai-verdict-pill'
import { ConfidenceBar } from '@/components/semantic/confidence-bar'
import { SubtaskBadge } from '@/components/semantic/subtask-badge'
import { StatusIconFrame } from '@/shared/status/status-icon-frame'
import { TASK_STATUS_VISUALS } from '@/shared/status/status-visuals'
import { MarkdownView } from '@/shared/components/markdown-view'
import { MarkdownEditor } from '@/shared/components/markdown-editor'
import { EmojiPicker } from '@/shared/components/emoji-picker/emoji-picker'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Calendar } from '@/components/ui/calendar'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { SelectField } from '@/components/ui/select-field'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Menubar, MenubarContent, MenubarItem, MenubarLabel, MenubarMenu, MenubarSeparator, MenubarTrigger } from '@/components/ui/menubar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { PageHeader, nodeToText } from '@/components/semantic/page-header'
import { FavoriteToggle } from '@/shared/components/favorite-toggle'
import { PageShell } from '@/components/semantic/page-shell'
import { HeaderActionButton } from '@/components/semantic/header-action-button'
import { SectionCard } from '@/components/semantic/section-card'
import { Chip } from '@/components/semantic/chip'
import { NavStatusDot } from '@/components/semantic/nav-status-dot'
import { ThemeModeCard } from '@/components/semantic/theme-mode-card'
import { SettingsHeader } from '@/components/semantic/settings-header'
import { SectionScrubber } from '@/components/semantic/section-scrubber'
import { SettingsSectionCard } from '@/components/semantic/settings-section-card'
import { SettingsFieldRow } from '@/components/semantic/settings-field-row'
import { PathInput } from '@/components/semantic/path-input'
import { StickySaveBar } from '@/components/semantic/sticky-save-bar'
import { z } from 'zod'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { FormDialog } from '@/components/semantic/form-dialog'
import { DefinitionRow } from '@/components/semantic/definition-row'
import { StatusDefinitionList } from '@/components/semantic/status-definition-list'
import { ChartCard } from '@/components/semantic/chart-card'
import { StatTile } from '@/components/semantic/stat-tile'
import { MetricRow } from '@/components/semantic/metric-row'
// H 类批 H2：画廊覆盖率补齐——12 件 canonical 缺口的 demo 收录（check-component-registry §4.2 ④ 门禁配套）
import { AiAgentBadge } from '@/modules/issue/components/ai-agent-badge'
import { AiContextSummary } from '@/modules/project/components/ai-context-summary'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item'
import { SidebarPanel } from '@/components/semantic/sidebar-panel'
import { DetailSection } from '@/components/semantic/detail-section'
import { DetailPageFrame } from '@/components/semantic/detail-page-frame'
import { RightSidebar, SidebarButton, SidebarButtonGroup } from '@/components/semantic/right-sidebar'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { DataTable } from '@/components/ui/data-table'
import { toast } from '@/components/ui/toast'
import { StatsCard } from '@/components/semantic/stats-card'
import { ChartLegendGrid, SERIES_COLORS } from '@/components/semantic/chart-legend-grid'
import { DonutChart } from '@/components/semantic/donut-chart'
import { ProportionBar } from '@/components/semantic/proportion-bar'
import { IconMetric } from '@/components/semantic/icon-metric'
import { DataTableShell } from '@/components/semantic/data-table-shell'
import { EmptyState } from '@/components/semantic/empty-state'
import { AsyncState } from '@/components/semantic/async-state'
import { DataList } from '@/shared/components/data-list'
import { PropsCard, PropertyRow } from '@/shared/components/property-panel'
import { LoadingOverlay } from '@/components/semantic/loading-overlay'
import { cn } from '@/lib/utils'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as RechartTooltip, XAxis, YAxis } from 'recharts'
import { AgentHandoffCard } from '@/modules/office/components/agent-handoff-card'
import { DualTrackMetricPill } from '@/components/semantic/dual-track-metric-pill'
import { IssueTypePill } from '@/shared/components/issue-type-pill'
import { AssistantToolCard } from '@/modules/assistant/components/assistant-tool-card'
import { WorkflowRunTimeline } from '@/modules/workflow/components/workflow-run-timeline'
import { DecisionCardShell } from '@/shared/decision-card/decision-card-shell'
import { MemberCard } from '@/modules/auth/components/member-card'
import { ComponentReviewBoard } from '@/modules/design-system/sections/component-review-board'
import type { TaskStatus, Priority, Severity } from '../gallery-kit'
import { SETTINGS_DEMO_SECTIONS, SETTINGS_DEMO_STATUSES, WORKFLOW_TIMELINE_STATIC, WORKFLOW_TIMELINE_RUNNING, SortableDemo, SortableGridDemo, SubPageToolbarDemo, ToolbarRowDemo, FilterChipsDemo, COLOR_GROUPS, RADIUS_VALUES, SHADOW_VALUES, SPACING_SCALE, QuickCardsToggleDemo, RhfFormDemo, TabBarDemo, DEMO_CHART_CONFIG, RegistryAuditTable, DEMO_ISSUE_ROWS, DEMO_ISSUE_COLUMNS, CHART_DATA, PIE_DATA, STATUS_CFG, PRIORITY_CFG, SEVERITY_CFG, SectionAnchor, SectionTitle, SubLabel, TokenLabel, MarkdownEditorDemo, MarkdownLiveEditorDemo, PromptEditorDemo, RefCapsuleDemo, RefMarkdownDemo, SlashRefDemo, RoutePreviewDemo, CommandPaletteDemo, ToastDemo, MenuDemo, DatePickerDemo, NumberFieldDemo, AutocompleteDemo, CheckboxGroupDemo, MeterDemo, ChapterScrubberDemo, StatusChip, PriorityIcon, MilestonePill, LabelChip, AssigneeAvatar, AvatarPickerShowcase, ColorPickerShowcase, AvatarModernizationShowcase, MentionShowcase, ActivityHeatmapShowcase, SeverityBar, AcceptPill, AgentPill } from '../gallery-kit'

function GallerySec_component_review() {
  return (
    <>

            <SectionTitle>组件裁决面 (Component Review Board)</SectionTitle>
            <ComponentReviewBoard />
          
    </>
  )
}

function GallerySec_colors() {
  return (
    <>

            <SectionTitle>Color Tokens</SectionTitle>
            <div className="space-y-6">
              {COLOR_GROUPS.map((group) => (
                <div key={group.label}>
                  <SubLabel>{group.label}</SubLabel>
                  <div className="grid grid-cols-4 gap-3">
                    {group.tokens.map((t) => (
                      <div key={t.name} className="flex flex-col gap-1.5">
                        <div className={cn('h-12 rounded-lg border border-border/50', t.tw)} />
                        <TokenLabel name={t.name} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <SubLabel>Semantic States</SubLabel>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Success', bg: 'bg-emerald-500', name: 'emerald-500' },
                    { label: 'Warning', bg: 'bg-amber-500', name: 'amber-500' },
                    { label: 'Error', bg: 'bg-red-500', name: 'red-500' },
                    { label: 'Info', bg: 'bg-blue-500', name: 'blue-500' },
                  ].map((c) => (
                    <div key={c.name} className="flex flex-col gap-1.5">
                      <div className={cn('h-12 rounded-lg', c.bg)} />
                      <span className="text-3xs text-muted-foreground font-mono">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_typography() {
  return (
    <>

            <SectionTitle>Typography</SectionTitle>
            <div className="space-y-6">
              <div>
                <SubLabel>Font Families</SubLabel>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-border bg-muted/20">
                    <p className="text-3xs text-muted-foreground font-mono mb-2">Inter — sans-serif</p>
                    <p className="text-2xl font-normal">The quick brown fox</p>
                    <p className="text-sm text-muted-foreground">ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789</p>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-muted/20">
                    <p className="text-3xs text-muted-foreground font-mono mb-2">JetBrains Mono — monospace</p>
                    <p className="font-mono text-xl font-normal">const x = 42;</p>
                    <p className="font-mono text-sm text-muted-foreground">npm run build --watch</p>
                  </div>
                </div>
              </div>
              <div>
                <SubLabel>Type Scale</SubLabel>
                <div className="space-y-3 p-4 rounded-lg border border-border">
                  {[
                    { cls: 'text-2xl', label: 'text-2xl', sample: 'Page Title' },
                    { cls: 'text-xl', label: 'text-xl', sample: 'Section Header' },
                    { cls: 'text-lg', label: 'text-lg', sample: 'Card Title' },
                    { cls: 'text-base', label: 'text-base', sample: 'Body Text' },
                    { cls: 'text-sm', label: 'text-sm', sample: 'Secondary Text' },
                    { cls: 'text-xs', label: 'text-xs', sample: 'Caption / Label' },
                    { cls: 'text-2xs', label: 'text-2xs', sample: 'Badge / Meta' },
                    { cls: 'text-3xs', label: 'text-3xs', sample: 'Micro Numeric' },
                  ].map(({ cls, label, sample }) => (
                    <div key={cls} className="flex items-baseline gap-4">
                      <code className="w-20 text-3xs text-muted-foreground shrink-0">{label}</code>
                      <span className={cn(cls, 'text-foreground leading-none')}>{sample}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <SubLabel>Font Weights</SubLabel>
                <div className="flex flex-wrap gap-4 p-4 rounded-lg border border-border">
                  {[
                    { cls: 'font-normal', label: 'Regular (400)' },
                    { cls: 'font-medium', label: 'Medium (500)' },
                    { cls: 'font-semibold', label: 'Semibold (600)' },
                  ].map(({ cls, label }) => (
                    <div key={cls} className="flex flex-col gap-1">
                      <span className={cn(cls, 'text-lg text-foreground')}>Ag</span>
                      <span className="text-3xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_spacing() {
  return (
    <>

            <SectionTitle>Spacing Scale</SectionTitle>
            <div className="space-y-2">
              {SPACING_SCALE.map((n) => (
                <div key={n} className="flex items-center gap-4">
                  <code className="w-8 text-3xs text-muted-foreground text-right shrink-0">{n}</code>
                  <div className="h-5 bg-primary/20 rounded-sm border border-primary/30" style={{ width: `${n * 4}px` }} />
                  <span className="text-3xs text-muted-foreground">{n * 4}px</span>
                </div>
              ))}
            </div>
          
    </>
  )
}

function GallerySec_radius() {
  return (
    <>

            <SectionTitle>Border Radius</SectionTitle>
            <div className="flex flex-wrap gap-6">
              {RADIUS_VALUES.map(({ cls, value, usage }) => (
                <div key={cls} className="flex flex-col items-center gap-2">
                  <div className={cn('w-16 h-16 bg-primary/15 border-2 border-primary/40', cls)} />
                  <code className="text-3xs text-foreground font-mono">{cls}</code>
                  <span className="text-3xs text-muted-foreground">{value}</span>
                  <span className="text-3xs text-muted-foreground max-w-28 text-center">{usage}</span>
                </div>
              ))}
            </div>
          
    </>
  )
}

function GallerySec_shadows() {
  return (
    <>

            <SectionTitle>Shadows</SectionTitle>
            <div className="flex flex-wrap gap-8">
              {SHADOW_VALUES.map(({ label, cls }) => (
                <div key={cls} className="flex flex-col items-center gap-3">
                  <div className={cn('w-20 h-20 rounded-xl bg-card border border-border', cls)} />
                  <code className="text-3xs text-muted-foreground">{label}</code>
                </div>
              ))}
            </div>
          
    </>
  )
}

function GallerySec_buttons() {
  return (
    <>

            <SectionTitle>Buttons</SectionTitle>
            <div className="space-y-5">
              <div>
                <SubLabel>Variants</SubLabel>
                <div className="flex flex-wrap gap-3">
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>
              <div>
                <SubLabel>Sizes</SubLabel>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="lg">Large</Button>
                  <Button size="default">Default</Button>
                  <Button size="sm">Small</Button>
                  <Button size="icon"><Settings /></Button>
                </div>
              </div>
              <div>
                <SubLabel>With Icons</SubLabel>
                <div className="flex flex-wrap gap-3">
                  <Button><Plus /> New Item</Button>
                  <Button variant="outline"><Mail /> Send</Button>
                  <Button variant="secondary"><Star /> Favorite</Button>
                  <Button variant="destructive"><Trash2 /> Delete</Button>
                </div>
              </div>
              <div>
                <SubLabel>States</SubLabel>
                <div className="flex flex-wrap gap-3">
                  <Button>Active</Button>
                  <Button disabled>Disabled</Button>
                  <Button disabled><Loader2 className="animate-spin" /> Loading…</Button>
                  <Button variant="outline" disabled>Disabled Outline</Button>
                </div>
              </div>
              <div>
                <SubLabel>Icon toolbar</SubLabel>
                <div className="flex gap-1 p-2 rounded-lg border border-border bg-muted/20 w-fit">
                  {[Edit2, Trash2, Star, Bell, Settings].map((Icon, i) => (
                    <Button key={i} variant="ghost" size="icon"><Icon className="w-4 h-4" /></Button>
                  ))}
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_badges() {
  return (
    <>

            <SectionTitle>Badges</SectionTitle>
            <div className="space-y-4">
              <div>
                <SubLabel>System Variants</SubLabel>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>
              </div>
              <div>
                <SubLabel>Status Labels</SubLabel>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Active', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
                    { label: 'In Progress', cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' },
                    { label: 'In Review', cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
                    { label: 'Done', cls: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800' },
                    { label: 'Blocked', cls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' },
                    { label: 'Canceled', cls: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
                  ].map(({ label, cls }) => (
                    <span key={label} className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', cls)}>{label}</span>
                  ))}
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_tags() {
  return (
    <>

            <SectionTitle>Tags / Chips</SectionTitle>
            <div className="space-y-5">
              <div>
                <SubLabel>Label Tags (color-coded)</SubLabel>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Frontend', color: '#3B82F6' },
                    { name: 'Backend', color: '#10B981' },
                    { name: 'Design', color: '#8B5CF6' },
                    { name: 'Bug', color: '#EF4444' },
                    { name: 'CI/CD', color: '#F59E0B' },
                    { name: 'Docs', color: '#EC4899' },
                    { name: 'API', color: '#14B8A6' },
                    { name: 'Security', color: '#F97316' },
                  ].map(({ name, color }) => (
                    <LabelChip key={name} name={name} color={color} />
                  ))}
                </div>
              </div>
              <div>
                <SubLabel>Closeable Tags</SubLabel>
                <div className="flex flex-wrap gap-2">
                  {['React', 'TypeScript', 'Tailwind', 'Vite', 'Radix UI'].map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium border border-border">
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                      <button className="ml-0.5 hover:text-destructive transition-colors">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-border text-muted-foreground text-xs hover:border-primary hover:text-primary transition-colors">
                    <Plus className="w-2.5 h-2.5" /> Add tag
                  </button>
                </div>
              </div>
              <div>
                <SubLabel>Milestone Pills</SubLabel>
                <div className="flex flex-wrap gap-2">
                  {['Phase 1 · Core UI', 'Phase 2 · Intelligence', 'Phase 3 · Quality', 'v1.0 Release'].map((m, i) => (
                    <MilestonePill key={m} name={m} idx={i} />
                  ))}
                </div>
              </div>
              <div>
                <SubLabel>Category Chips</SubLabel>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '需求文档', Icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800' },
                    { label: '设计文档', Icon: Palette, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-200 dark:border-violet-800' },
                    { label: 'API文档', Icon: Code2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' },
                    { label: '测试文档', Icon: CheckSquare, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-800' },
                    { label: '用户指南', Icon: BookOpen, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-800' },
                  ].map(({ label, Icon, color, bg, border }) => (
                    <span key={label} className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium', bg, border)}>
                      <Icon className={cn('w-3 h-3', color)} />
                      <span className={color}>{label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_avatars() {
  return (
    <>

            <SectionTitle>Avatars</SectionTitle>
            <div className="space-y-4">
              <div>
                <SubLabel>Sizes</SubLabel>
                <div className="flex items-end gap-4">
                  {[{ cls: 'size-6', text: '6' }, { cls: 'size-8', text: '8' }, { cls: 'size-10', text: '10' }, { cls: 'size-12', text: '12' }, { cls: 'size-16', text: '16' }].map(({ cls, text }) => (
                    <div key={cls} className="flex flex-col items-center gap-2">
                      <Avatar className={cls}>
                        <AvatarFallback className={cn('text-3xs font-semibold', cls)}>AK</AvatarFallback>
                      </Avatar>
                      <span className="text-3xs text-muted-foreground">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <SubLabel>Color Variants + Stacked Group</SubLabel>
                <div className="flex items-center gap-4 flex-wrap">
                  {[
                    { i: 'AK', bg: 'bg-violet-500' }, { i: 'BM', bg: 'bg-blue-500' },
                    { i: 'CR', bg: 'bg-emerald-500' }, { i: 'DS', bg: 'bg-amber-500' },
                    { i: 'EL', bg: 'bg-red-500' }, { i: 'FM', bg: 'bg-pink-500' },
                  ].map(({ i, bg }) => (
                    <Avatar key={i}>
                      <AvatarFallback className={cn(bg, 'text-white text-xs font-semibold')}>{i}</AvatarFallback>
                    </Avatar>
                  ))}
                  <div className="flex -space-x-2 ml-2">
                    {['AK', 'BM', 'CR', 'DS'].map((i, idx) => (
                      <Avatar key={i} className="size-8 ring-2 ring-background" style={{ zIndex: 4 - idx }}>
                        <AvatarFallback className="text-3xs font-semibold bg-primary text-primary-foreground">{i}</AvatarFallback>
                      </Avatar>
                    ))}
                    <Avatar className="size-8 ring-2 ring-background">
                      <AvatarFallback className="text-3xs font-semibold bg-muted text-muted-foreground">+4</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_member_identity() {
  return (
    <>

            <SectionTitle>Member Identity</SectionTitle>
            <div className="space-y-4">
              <div>
                <SubLabel>AvatarPickerField（人类插画肖像 + AI 算法几何 + 自定义 URL）</SubLabel>
                <AvatarPickerShowcase />
              </div>
              <div>
                <SubLabel>MemberAvatar 实体头像矩阵（人类: NiceAvatar 插画 vs AI: Avvvatars 几何 · 5 级尺寸阶梯）</SubLabel>
                <div className="space-y-3 rounded-lg border border-border/70 p-3.5 bg-muted/10 max-w-2xl">
                  {/* 人类成员尺寸阶梯 */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-xs text-muted-foreground w-24 shrink-0 font-medium">人类成员:</span>
                    {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                      <div key={sz} className="flex flex-col items-center gap-1">
                        <MemberAvatar
                          size={sz}
                          member={{
                            type: 'human',
                            displayName: 'Alex Chen',
                            handle: 'alex',
                            isOnline: true,
                          }}
                        />
                        <span className="text-3xs text-muted-foreground font-mono">{sz}</span>
                      </div>
                    ))}
                    {/* Fallback 纯文本模式 */}
                    <div className="flex flex-col items-center gap-1">
                      <MemberAvatar
                        size="md"
                        useInitials
                        member={{
                          type: 'human',
                          displayName: 'Sarah Connor',
                          handle: 'sarah',
                          isOnline: false,
                        }}
                      />
                      <span className="text-3xs text-muted-foreground font-mono">initials</span>
                    </div>
                  </div>

                  {/* AI 智能体尺寸阶梯 */}
                  <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground w-24 shrink-0 font-medium">AI 智能体:</span>
                    {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                      <div key={sz} className="flex flex-col items-center gap-1">
                        <MemberAvatar
                          size={sz}
                          member={{
                            type: 'ai_agent',
                            displayName: 'Claude Coder',
                            handle: 'claude-coder',
                            isOnline: true,
                          }}
                        />
                        <span className="text-3xs text-muted-foreground font-mono">{sz}</span>
                      </div>
                    ))}
                    {/* AI 字符模式 */}
                    <div className="flex flex-col items-center gap-1">
                      <MemberAvatar
                        size="md"
                        avvvatarsStyle="character"
                        member={{
                          type: 'ai_agent',
                          displayName: 'DeepSeek Architect',
                          handle: 'deepseek-r1',
                          isOnline: true,
                        }}
                      />
                      <span className="text-3xs text-muted-foreground font-mono">char-mode</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <SubLabel>双表面头像系统实装展台（人类: react-nice-avatar × AI: avvvatars）</SubLabel>
                <AvatarModernizationShowcase />
              </div>
              <div>
                <SubLabel>TrustLevelBadge（信任三级：观察者/协助者/受托者）</SubLabel>
                <div className="flex items-center gap-2 flex-wrap">
                  <TrustLevelBadge level={null} />
                  {[1, 2, 3].map((level) => (
                    <TrustLevelBadge key={level} level={level} />
                  ))}
                </div>
              </div>
              <div>
                <SubLabel>MentionTextarea / MentionRenderer（@ 提及）</SubLabel>
                <MentionShowcase />
              </div>
              <div>
                <SubLabel>ActivityHeatmap（活跃热力图）</SubLabel>
                <ActivityHeatmapShowcase />
              </div>
            </div>
          
    </>
  )
}

function GallerySec_cards() {
  return (
    <>

            <SectionTitle>Cards</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Basic Card</CardTitle>
                  <CardDescription className="text-xs">Header + content pattern.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Uses <code className="font-mono text-2xs bg-muted px-1 rounded">bg-card</code> and <code className="font-mono text-2xs bg-muted px-1 rounded">rounded-xl</code>.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Card with Footer</CardTitle>
                  <CardDescription className="text-xs">Action footer row.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Footer holds primary and secondary actions.</p>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button size="sm">Confirm</Button>
                  <Button size="sm" variant="outline">Cancel</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Tasks</p>
                      <p className="text-2xl font-semibold mt-1">248</p>
                      <p className="text-xs text-emerald-600 mt-1">+12% from last week</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Elevated Card</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={72} />
                  <Progress value={45} className="[&>div]:bg-amber-500" />
                  <Progress value={18} className="[&>div]:bg-red-500" />
                </CardContent>
              </Card>
            </div>
          
    </>
  )
}

function GallerySec_item() {
  return (
    <>

            <SectionTitle>Item</SectionTitle>
            <p className="text-xs text-muted-foreground mb-4">
              通用条目组合件（media/content/actions 槽 + variant/size 轴），列表项、设置行、结果行的统一形态。
            </p>
            <ItemGroup className="max-w-xl">
              <Item variant="outline" size="sm">
                <ItemMedia variant="icon"><GitBranch /></ItemMedia>
                <ItemContent>
                  <ItemTitle>origin/main</ItemTitle>
                  <ItemDescription>Last synced 2 minutes ago</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button variant="ghost" size="xs">Sync</Button>
                </ItemActions>
              </Item>
              <Item variant="muted" size="sm">
                <ItemMedia variant="icon"><Bot /></ItemMedia>
                <ItemContent>
                  <ItemTitle>Claude — platform AI member</ItemTitle>
                  <ItemDescription>Running: acceptance evidence collection</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button variant="outline" size="xs">Open</Button>
                </ItemActions>
              </Item>
            </ItemGroup>
          
    </>
  )
}

function GallerySec_forms() {
  const [sliderVal, setSliderVal] = React.useState(40)

  return (
    <>

            <SectionTitle>Forms</SectionTitle>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <SubLabel>Text Inputs</SubLabel>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-i1" className="text-xs">Default</Label>
                  <Input id="ds-i1" placeholder="Enter a value…" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-i2" className="text-xs">With Icon</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input id="ds-i2" className="pl-8" placeholder="Search…" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-i3" className="text-xs">Disabled</Label>
                  <Input id="ds-i3" disabled placeholder="Not editable" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-ta" className="text-xs">Textarea</Label>
                  <Textarea id="ds-ta" placeholder="Write a description…" rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Select</Label>
                  <Select
                    items={[
                      { value: 'a', label: 'Option Alpha' },
                      { value: 'b', label: 'Option Beta' },
                      { value: 'c', label: 'Option Gamma' },
                    ]}
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Choose…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">Option Alpha</SelectItem>
                      <SelectItem value="b">Option Beta</SelectItem>
                      <SelectItem value="c">Option Gamma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <SubLabel>ColorPicker（Popover + 预设色板 + react-colorful）</SubLabel>
                  <ColorPickerShowcase />
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <SubLabel>Checkboxes</SubLabel>
                  {['Notifications enabled', 'Auto-save drafts', 'Disabled option'].map((lbl, i) => (
                    <div key={lbl} className="flex items-center gap-2">
                      <Checkbox id={`chk-${i}`} defaultChecked={i < 2} disabled={i === 2} />
                      <Label htmlFor={`chk-${i}`} className={cn('text-xs cursor-pointer', i === 2 && 'opacity-50')}>{lbl}</Label>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <SubLabel>Switches</SubLabel>
                  {[
                    { label: 'Email notifications', checked: true },
                    { label: 'Push notifications', checked: false },
                    { label: 'Disabled', checked: false, disabled: true },
                  ].map(({ label, checked, disabled }) => (
                    <div key={label} className="flex items-center justify-between">
                      <Label className={cn('text-xs', disabled && 'opacity-50')}>{label}</Label>
                      <Switch defaultChecked={checked} disabled={disabled} />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <SubLabel>Radio Group</SubLabel>
                  <RadioGroup defaultValue="beta">
                    {['Alpha', 'Beta', 'Gamma'].map((v) => (
                      <div key={v} className="flex items-center gap-2">
                        <RadioGroupItem value={v.toLowerCase()} id={`r-${v}`} />
                        <Label htmlFor={`r-${v}`} className="text-xs cursor-pointer">{v}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-3">
                  <SubLabel>Slider</SubLabel>
                  <Slider min={0} max={100} value={sliderVal} onValueChange={(v) => setSliderVal(Number(v))} />
                  <p className="text-xs text-muted-foreground">Value: {sliderVal}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <SubLabel>Form 套件（RHF）— FormField / FormItem / FormLabel / FormControl / FormDescription / FormMessage</SubLabel>
              <RhfFormDemo />
              <SubLabel>Field — 表单域布局槽（label/description/error 三件套，label 支持 xs 字号与 muted 色调轴）</SubLabel>
              <div className="max-w-sm">
                <FieldGroup>
                  <Field>
                    <FieldLabel size="xs" variant="muted">Workspace slug</FieldLabel>
                    <FieldDescription>Used in API paths and CLI commands.</FieldDescription>
                    <Input placeholder="acme-inc" />
                    <FieldError>Only lowercase letters and dashes are allowed.</FieldError>
                  </Field>
                </FieldGroup>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_number_field() {
  return (
    <>

            <SectionTitle>Number Field</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">coss 配方（base-ui NumberField）——步进按钮 / 键盘上下键 / 滚轮调值，任务估时已在用。</p>
            <NumberFieldDemo />
          
    </>
  )
}

function GallerySec_autocomplete() {
  return (
    <>

            <SectionTitle>Autocomplete</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">coss 配方（base-ui Autocomplete）——自由输入 + 建议 过滤，适合 @提及 / label 输入类场景。</p>
            <AutocompleteDemo />
          
    </>
  )
}

function GallerySec_checkbox_group() {
  return (
    <>

            <SectionTitle>Checkbox Group</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">coss Checkbox（分层阴影 + 勾选填充 + indeterminate）+ CheckboxGroup 组值管理。</p>
            <CheckboxGroupDemo />
          
    </>
  )
}

function GallerySec_alerts() {
  return (
    <>

            <SectionTitle>Alerts</SectionTitle>
            <div className="max-w-2xl space-y-3">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>This is an informational alert for neutral messages.</AlertDescription>
              </Alert>
              <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 [&>svg]:text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle className="text-emerald-800 dark:text-emerald-300">Success</AlertTitle>
                <AlertDescription className="text-emerald-700 dark:text-emerald-400">Operation completed. Changes have been saved.</AlertDescription>
              </Alert>
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 [&>svg]:text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-amber-800 dark:text-amber-300">Warning</AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-400">This action may have unintended consequences.</AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Something went wrong. Check the console for details.</AlertDescription>
              </Alert>
            </div>
          
    </>
  )
}

function GallerySec_toast() {
  return (
    <>

            <SectionTitle>Toast</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">coss Toast（base-ui 配方，2026-08 替换 sonner）——堆叠/悬停展开/滑动关闭；命令式 API 兼容历史 toast.success/error/…。</p>
            <ToastDemo />
          
    </>
  )
}

function GallerySec_progress() {
  return (
    <>

            <SectionTitle>Progress</SectionTitle>
            <div className="space-y-5">
              <div>
                <SubLabel>Progress Bars</SubLabel>
                <div className="space-y-3">
                  {[
                    { v: 100, label: '100% — Complete', cls: '' },
                    { v: 72, label: '72% — Good', cls: '' },
                    { v: 45, label: '45% — Midway', cls: '[&>div]:bg-amber-500' },
                    { v: 18, label: '18% — Critical', cls: '[&>div]:bg-red-500' },
                    { v: 0, label: '0% — Not started', cls: '' },
                  ].map(({ v, label, cls }) => (
                    <div key={label} className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground w-36 shrink-0">{label}</span>
                      <Progress value={v} className={cn('flex-1', cls)} />
                      <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{v}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <SubLabel>Circular Rings</SubLabel>
                <div className="flex gap-8">
                  {[25, 50, 75, 100].map((pct) => {
                    const r = 22
                    const circ = 2 * Math.PI * r
                    return (
                      <div key={pct} className="flex flex-col items-center gap-2">
                        <svg width="56" height="56" viewBox="0 0 56 56">
                          <circle cx="28" cy="28" r={r} strokeWidth="4" className="stroke-primary/20 fill-none" />
                          <circle cx="28" cy="28" r={r} strokeWidth="4" className="stroke-primary fill-none"
                            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
                            strokeLinecap="round" transform="rotate(-90 28 28)" />
                          <text x="28" y="33" textAnchor="middle" className="fill-foreground" style={{ fontSize: 10, fontWeight: 500 }}>{pct}%</text>
                        </svg>
                        <span className="text-3xs text-muted-foreground">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_stepper() {
  return (
    <>

            <SectionTitle>Stepper</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">reui base-nova 配方（base-ui 复合式）——向导场景放 Trigger 可点击导航，状态机推进场景只放 Indicator + Title 纯展示；纵向变体用于清单/时间线。</p>
            <div className="space-y-8">
              <div>
                <SubLabel>Navigable Wizard — Trigger 可点击 + 键盘导航</SubLabel>
                <Stepper defaultValue={2}>
                  <StepperNav>
                    {['Account', 'Profile', 'Workspace', 'Done'].map((label, i, arr) => (
                      <StepperItem key={label} step={i + 1}>
                        <StepperTrigger className="gap-1.5">
                          <StepperIndicator className="size-5 text-3xs font-medium">{i + 1}</StepperIndicator>
                          <StepperTitle className="text-xs whitespace-nowrap">{label}</StepperTitle>
                        </StepperTrigger>
                        {i < arr.length - 1 && <StepperSeparator />}
                      </StepperItem>
                    ))}
                  </StepperNav>
                </Stepper>
              </div>
              <div>
                <SubLabel>Status Chain — 纯展示 + completed/loading 指示器</SubLabel>
                <Stepper
                  value={3}
                  indicators={{
                    completed: <Check className="size-3" />,
                    loading: <Spinner size="sm" className="size-3.5 text-primary-foreground" />,
                  }}
                >
                  <StepperNav>
                    {['Draft', 'Gated', 'Approved', 'Publishing', 'Released'].map((label, i, arr) => (
                      <StepperItem key={label} step={i + 1} loading={i === 3}>
                        <div className="flex items-center gap-2">
                          <StepperIndicator className="size-5 text-3xs font-medium">{i + 1}</StepperIndicator>
                          <StepperTitle className="text-xs whitespace-nowrap">{label}</StepperTitle>
                        </div>
                        {i < arr.length - 1 && <StepperSeparator />}
                      </StepperItem>
                    ))}
                  </StepperNav>
                </Stepper>
              </div>
              <div>
                <SubLabel>Vertical — 纵向 + 标题/描述（连接线随状态点亮）</SubLabel>
                <div className="max-w-80">
                  <Stepper orientation="vertical" value={2}>
                    <StepperNav>
                      {[
                        { title: '连接仓库', desc: '绑定本地路径与远端地址' },
                        { title: '扫描考古', desc: '解析提交历史并生成档案草稿' },
                        { title: '校对入库', desc: '人工确认后进入项目档案' },
                      ].map((s, i, arr) => (
                        <StepperItem key={s.title} step={i + 1} className="w-full">
                          <div className="flex w-full items-start gap-3">
                            <div className="flex flex-col items-center self-stretch">
                              <StepperIndicator className="text-3xs font-medium">{i + 1}</StepperIndicator>
                              {i < arr.length - 1 && (
                                <StepperSeparator className="m-0 w-0.5 flex-1 rounded-full" />
                              )}
                            </div>
                            <div className={cn('min-w-0 flex-1', i < arr.length - 1 && 'pb-6')}>
                              <StepperTitle>{s.title}</StepperTitle>
                              <StepperDescription className="mt-1 text-xs">{s.desc}</StepperDescription>
                            </div>
                          </div>
                        </StepperItem>
                      ))}
                    </StepperNav>
                  </Stepper>
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_sortable() {
  return (
    <>

            <SectionTitle>Sortable</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">reui base-nova 配方（@dnd-kit）——同列表条目重排专用；看板跨列/画布节点继续用 dnd-kit 原语。落放一次性提交，onValueChange 即持久化缝，onValueCommit 附带回滚快照。</p>
            <div className="space-y-8">
              <div>
                <SubLabel>Vertical — 把手拖拽（键盘可达：聚焦把手后 Space 拾起、方向键移动、Space 落放）</SubLabel>
                <div className="max-w-sm">
                  <SortableDemo />
                </div>
              </div>
              <div>
                <SubLabel>Grid — 网格策略（整卡可拖）</SubLabel>
                <div className="max-w-sm">
                  <SortableGridDemo />
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_icon_stack() {
  return (
    <>

            <SectionTitle>Icon Stack</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">reui base-nova 配方——等距层叠图标插画容器（装饰性，纯视觉请 aria-hidden）：空态/引导/完成时刻的深度感图标，尺寸经 className、语义色经 text-* 传入。</p>
            <div className="space-y-8">
              <div>
                <SubLabel>Sizes & Colors</SubLabel>
                <div className="flex flex-wrap items-end gap-8">
                  {[
                    { label: 'default / muted', cls: '', icon: <Inbox className="size-4" /> },
                    { label: 'primary', cls: 'text-primary', icon: <Rocket className="size-4 text-primary" /> },
                    { label: 'success', cls: 'text-accent-green', icon: <CheckCircle2 className="size-4 text-accent-green" /> },
                    { label: 'lg', cls: 'h-28 w-25', icon: <FileText className="size-5" /> },
                  ].map(({ label, cls, icon }) => (
                    <div key={label} className="flex flex-col items-center gap-2">
                      <IconStack aria-hidden="true" className={cls}>
                        {icon}
                      </IconStack>
                      <span className="text-3xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <SubLabel>Empty State — EmptyState variant=page + visual 插画（整页大空态）</SubLabel>
                <div className="h-60 max-w-md">
                  <EmptyState
                    variant="page"
                    visual={
                      <IconStack aria-hidden="true" className="text-primary">
                        <FileText className="size-4 text-primary" />
                      </IconStack>
                    }
                    title="暂无文档"
                    description="开始创建你的第一个文档"
                  />
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_auth_surface() {
  return (
    <>

            <SectionTitle>Auth Surface</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">CAP-A-22 认证面改版件——MemberCard 身份工牌（欢迎页右栏仪式件，环形口号 + 成员编号/入职日期/签名）；AuthShell 分栏壳与 AuthVisual 拼贴见 /login 实页。</p>
            <div className="rounded-xl border border-border bg-secondary p-8 flex justify-center">
              <MemberCard displayName="张三" memberNo="03057317" joinedAt="2026-09-20T00:00:00.000Z" />
            </div>
          
    </>
  )
}

function GallerySec_meter() {
  return (
    <>

            <SectionTitle>Meter</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">coss 配方（base-ui Meter）——有界量程表（配额 / 用量），语义不同于 Progress（进度）。</p>
            <MeterDemo />
          
    </>
  )
}

function GallerySec_tabs() {
  return (
    <>

            <SectionTitle>Tabs — segmented (sliding button)</SectionTitle>
            <div className="space-y-6">
              <div>
                <SubLabel>Segmented slider (fixed-height panel below)</SubLabel>
                <div className="w-full max-w-md">
                  <Tabs defaultValue="overview" className="h-60">
                    <TabsList variant="segmented">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="min-h-0 p-4 overflow-auto rounded-lg border border-border bg-muted/20">
                      <p className="text-sm text-muted-foreground">Overview panel. Switch tabs to see the slider move.</p>
                    </TabsContent>
                    <TabsContent value="activity" className="min-h-0 p-4 overflow-auto rounded-lg border border-border bg-muted/20 space-y-2">
                      {['Alice committed 3 files', 'Bob opened PR #42', 'CI pipeline passed'].map((item) => (
                        <div key={item} className="flex items-center gap-3 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </TabsContent>
                    <TabsContent value="settings" className="min-h-0 p-4 overflow-auto rounded-lg border border-border bg-muted/20">
                      <p className="text-sm text-muted-foreground">Settings panel content.</p>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
              <div>
                <SubLabel>Line variant (underline indicator)</SubLabel>
                <div className="w-full max-w-md">
                  <Tabs defaultValue="overview">
                    <TabsList variant="line">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="mt-4 p-4 rounded-lg border border-border bg-muted/20">
                      <p className="text-sm text-muted-foreground">Line variant with underline indicator.</p>
                    </TabsContent>
                    <TabsContent value="activity" className="mt-4 p-4 rounded-lg border border-border bg-muted/20">
                      <p className="text-sm text-muted-foreground">Activity panel content.</p>
                    </TabsContent>
                    <TabsContent value="settings" className="mt-4 p-4 rounded-lg border border-border bg-muted/20">
                      <p className="text-sm text-muted-foreground">Settings panel content.</p>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_tab_bar() {
  return (
    <>

            <SectionTitle>Tab Bar</SectionTitle>
            <p className="text-xs text-muted-foreground mb-4">
              浏览器式页签栏（固定页 pin / 右键菜单 / 滚动箭头）。路由驱动自动建签——完整交互挂在主框架
              TabsProvider 下，此处为空态形态演示。
            </p>
            <TabBarDemo />
          
    </>
  )
}

function GallerySec_accordion() {
  return (
    <>

            <SectionTitle>Accordion</SectionTitle>
            <Accordion>
              {[
                { title: 'What is a design token?', body: 'Design tokens are named entities that store visual design attributes. We use them in place of hard-coded values to ensure a flexible and unified visual design language across all platforms.' },
                { title: 'How are tokens organized?', body: 'Tokens are organized by category: colors, typography, spacing, border radius, and shadows — each mapping to a CSS custom property and a Tailwind utility class.' },
                { title: 'Can I extend the system?', body: 'Yes. Add new tokens to theme.css and map them in the @theme inline block. New Tailwind utilities will be generated automatically.' },
              ].map(({ title, body }) => (
                <AccordionItem key={title}>
                  <AccordionTrigger className="text-sm w-full">
                    {title}
                    <ChevronDown className="w-4 h-4 shrink-0 transition-transform" />
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4">{body}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          
    </>
  )
}

function GallerySec_table() {
  return (
    <>

            <SectionTitle>Table — headless task list</SectionTitle>
            <div className="rounded-lg border border-border bg-background overflow-hidden">
              <div className="divide-y divide-border/60">
                {[
                  { id: 'Ordo-1', title: 'AI chat interface', status: 'done' as TaskStatus, priority: 'high' as Priority, assignee: 'AK', due: 'Mar 8' },
                  { id: 'Ordo-2', title: 'Kanban board view', status: 'in_progress' as TaskStatus, priority: 'high' as Priority, assignee: 'ML', due: 'Mar 20' },
                  { id: 'Ordo-4', title: 'AI velocity scoring', status: 'in_review' as TaskStatus, priority: 'urgent' as Priority, assignee: 'BK', due: 'Mar 25' },
                  { id: 'ACR-1', title: 'Stripe webhook handler', status: 'todo' as TaskStatus, priority: 'urgent' as Priority, assignee: '', due: 'Apr 5' },
                  { id: 'Ordo-10', title: 'Concurrent state updates', status: 'canceled' as TaskStatus, priority: 'medium' as Priority, assignee: '', due: 'Apr 22' },
                ].map((row) => (
                  <div key={row.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                    <StatusChip status={row.status} />
                    <PriorityIcon priority={row.priority} />
                    <span className="w-16 shrink-0 font-mono text-2xs text-muted-foreground">{row.id}</span>
                    <span className="flex-1 truncate text-sm font-medium text-foreground">{row.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{row.due}</span>
                    <AssigneeAvatar initials={row.assignee || undefined} />
                  </div>
                ))}
              </div>
            </div>

            <SubLabel>Table 套件 — semantic 元素封装（dense/comfortable 两档行高，表头固定 h-10）</SubLabel>
            <div className="rounded-lg border border-border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { id: 'Ordo-1', title: 'AI chat interface', status: 'Done', due: 'Mar 8' },
                    { id: 'Ordo-2', title: 'Kanban board view', status: 'In Progress', due: 'Mar 20' },
                    { id: 'Ordo-4', title: 'AI velocity scoring', status: 'In Review', due: 'Mar 25' },
                  ].map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-2xs text-muted-foreground">{row.id}</TableCell>
                      <TableCell className="font-medium">{row.title}</TableCell>
                      <TableCell className="text-muted-foreground">{row.status}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.due}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          
    </>
  )
}

function GallerySec_data_table() {
  return (
    <>

            <SectionTitle>Data Table</SectionTitle>
            <p className="text-xs text-muted-foreground mb-4">
              TanStack Table 封装：列定义驱动、排序/选择/分页内建，配合 DataTableShell 做外壳。
            </p>
            <DataTable columns={DEMO_ISSUE_COLUMNS} data={DEMO_ISSUE_ROWS} maxHeight="220px" />
          
    </>
  )
}

function GallerySec_tooltip() {
  return (
    <>

            <SectionTitle>Tooltip &amp; Dropdown Menu</SectionTitle>
            <div className="space-y-6">
              <div>
                <SubLabel>Tooltips (hover)</SubLabel>
                <TooltipProvider>
                  <div className="flex gap-4 flex-wrap">
                    {[
                      { side: 'top' as const, label: 'Tooltip Top' },
                      { side: 'bottom' as const, label: 'Tooltip Bottom' },
                      { side: 'left' as const, label: 'Tooltip Left' },
                      { side: 'right' as const, label: 'Tooltip Right' },
                    ].map(({ side, label }) => (
                      <Tooltip key={side}>
                        <TooltipTrigger render={<Button variant="outline" size="sm" />}>
                          {label}
                        </TooltipTrigger>
                        <TooltipContent side={side}>
                          <p className="text-xs">This is a {side} tooltip</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    <Tooltip>
                      <TooltipTrigger render={<Button variant="ghost" size="icon" />}>
                        <Settings />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Settings <kbd className="ml-1 px-1 rounded bg-muted text-3xs">⌘,</kbd></p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
              <div>
                <SubLabel>Dropdown Menu</SubLabel>
                <div className="flex gap-8 items-start flex-wrap">
                  <div className="space-y-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="outline" />}>
                        <MoreHorizontal className="w-4 h-4" /> Actions
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem><Edit2 className="w-4 h-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem><Star className="w-4 h-4" /> Favorite</DropdownMenuItem>
                        <DropdownMenuItem><ExternalLink className="w-4 h-4" /> Open in new tab</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem><Share2 className="w-4 h-4" /> Share</DropdownMenuItem>
                        <DropdownMenuItem><Bookmark className="w-4 h-4" /> Bookmark</DropdownMenuItem>
                        <DropdownMenuItem><Download className="w-4 h-4" /> Export</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_menu() {
  return (
    <>

            <SectionTitle>Menu (coss)</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">coss Menu 标准件（分组/勾选/单选/子菜单/快捷键/破坏性项）+ coss 设计的右键菜单弹出层。</p>
            <MenuDemo />
          
    </>
  )
}

function GallerySec_overlays() {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [alertOpen, setAlertOpen] = React.useState(false)

  return (
    <>

            <SectionTitle>Overlays</SectionTitle>
            <div className="space-y-6">
              <div>
                <SubLabel>Dialog — functional (base-ui)</SubLabel>
                <div className="flex gap-3">
                  <Button onClick={() => setDialogOpen(true)}><Plus /> Open Dialog</Button>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Project</DialogTitle>
                        <DialogDescription>Fill in the details to create a new project.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-2">
                        <Label className="text-xs">Project name</Label>
                        <Input placeholder="Ordo Platform" />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => setDialogOpen(false)}>Create</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div>
                <SubLabel>Alert Dialog — confirmation</SubLabel>
                <div className="flex gap-3">
                  <Button variant="destructive" onClick={() => setAlertOpen(true)}><Trash2 /> Delete Item</Button>
                  <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAlertOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => setAlertOpen(false)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div>
                <SubLabel>Sheet — right side panel</SubLabel>
                <Sheet>
                  <SheetTrigger render={<Button variant="outline" />}>Open Sheet</SheetTrigger>
                  <SheetContent className="w-full max-w-sm rounded-l-lg">
                    <SheetHeader>
                      <SheetTitle>Details</SheetTitle>
                      <SheetDescription>Right side panel content.</SheetDescription>
                    </SheetHeader>
                    <div className="py-4 text-sm text-muted-foreground">Sheet body content goes here.</div>
                    <SheetFooter>
                      <Button size="sm">Save</Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>
              <div>
                <SubLabel>Drawer — bottom sheet</SubLabel>
                <Drawer>
                  <DrawerTrigger render={<Button variant="outline" />}>Open Drawer</DrawerTrigger>
                  <DrawerContent className="mx-auto w-full max-w-md">
                    <DrawerHeader>
                      <DrawerTitle>Actions</DrawerTitle>
                      <DrawerDescription>Bottom drawer content.</DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                      <Button size="sm">Confirm</Button>
                      <Button size="sm" variant="outline">Cancel</Button>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_popover() {
  const [ownerValue, setOwnerValue] = React.useState('')

  return (
    <>

            <SectionTitle>Popover &amp; Combobox</SectionTitle>
            <div className="space-y-6">
              <div>
                <SubLabel>Popover — functional (base-ui)</SubLabel>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" size="sm" className="gap-2">
                        <Bell className="w-4 h-4" /> Notifications
                      </Button>
                    }
                  />
                  <PopoverContent className="w-72">
                    <PopoverHeader>
                      <PopoverTitle>Notifications</PopoverTitle>
                      <PopoverDescription>Latest activity in your workspace.</PopoverDescription>
                    </PopoverHeader>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>Alice commented on Ordo-1</p>
                      <p>CI pipeline passed</p>
                      <p>Bob opened PR #42</p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <SubLabel>Combobox — searchable select (functional)</SubLabel>
                <div className="w-72">
                  <Combobox value={ownerValue} onValueChange={setOwnerValue}>
                    <ComboboxInput className="w-full" placeholder="Select owner..." />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxItem value="alex">Alex Chen</ComboboxItem>
                        <ComboboxItem value="sam">Sam Liu</ComboboxItem>
                        <ComboboxItem value="maria">Maria Lopez</ComboboxItem>
                        <ComboboxItem value="kim">Kim Park</ComboboxItem>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_hover_card() {
  return (
    <>

            <SectionTitle>Hover Card（浮动预览卡片）</SectionTitle>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              用于光标悬停在触发元素时呈现上下文补充信息、富实体预览或路由直觉感知。基于{' '}
              <code className="font-mono text-2xs bg-muted px-1 py-0.5 rounded">@base-ui/react/preview-card</code>{' '}
              封装，支持避障定位、无障碍语义与开闭过渡动画。
            </p>

            <div className="space-y-8">
              {/* ① 尺寸规范阶梯 */}
              <div>
                <SubLabel>① 尺寸规格阶梯（Sizes: sm / md / lg / xl）</SubLabel>
                <div className="flex flex-wrap items-center gap-4">
                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs font-mono text-accent-blue hover:underline">
                      size="sm" (w-56)
                    </HoverCardTrigger>
                    <HoverCardContent size="sm">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">Compact Card</span>
                          <Badge variant="outline" className="text-3xs px-1">sm</Badge>
                        </div>
                        <p className="text-2xs text-muted-foreground leading-relaxed">
                          适用于窄栏、密集表格单元格或单行轻量指标说明。
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>

                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs font-mono text-accent-blue hover:underline">
                      size="md" (w-64 · 默认)
                    </HoverCardTrigger>
                    <HoverCardContent size="md">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">Standard Card</span>
                          <Badge variant="outline" className="text-3xs px-1">md</Badge>
                        </div>
                        <p className="text-2xs text-muted-foreground leading-relaxed">
                          通用默认卡片宽度，满足绝大部分简短详情与状态预览。
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>

                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs font-mono text-accent-blue hover:underline">
                      size="lg" (w-72 · 路由标准)
                    </HoverCardTrigger>
                    <HoverCardContent size="lg">
                      <HoverCardArrow />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">Large Card + Arrow</span>
                          <Badge variant="secondary" className="text-3xs px-1">lg</Badge>
                        </div>
                        <p className="text-2xs text-muted-foreground leading-relaxed">
                          对齐 <code>route-preview</code> 规范标准宽，兼顾内容信息量与弹出留白。
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>

                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs font-mono text-accent-blue hover:underline">
                      size="xl" (w-80 · 富实体宽)
                    </HoverCardTrigger>
                    <HoverCardContent size="xl">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">Extra Large Card</span>
                          <Badge variant="secondary" className="text-3xs px-1">xl</Badge>
                        </div>
                        <p className="text-2xs text-muted-foreground leading-relaxed">
                          用于成员履历、AI 智能体运行态面板等高信息密度复合组件展示。
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>

              {/* ② 方位与对齐矩阵 */}
              <div>
                <SubLabel>② 四向方位与对齐矩阵（Placements &amp; Alignments）</SubLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
                  {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
                    <div key={side} className="p-3 rounded-lg border border-border/60 bg-muted/10 flex flex-col items-center gap-2">
                      <span className="text-3xs font-mono text-muted-foreground uppercase">side="{side}"</span>
                      <HoverCard>
                        <HoverCardTrigger
                          render={
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              Hover {side}
                            </Button>
                          }
                        />
                        <HoverCardContent side={side} size="sm">
                          <HoverCardArrow />
                          <p className="text-xs font-medium text-foreground">side="{side}"</p>
                          <p className="text-3xs text-muted-foreground mt-0.5">自动避障且居中锚定</p>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  ))}
                </div>
              </div>

              {/* ③ 箭头与视觉修饰对比 */}
              <div>
                <SubLabel>③ 视觉修饰对比（无箭头默认 vs 显式气泡箭头 HoverCardArrow）</SubLabel>
                <div className="flex flex-wrap items-center gap-6">
                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs text-muted-foreground hover:text-foreground underline decoration-dotted">
                      无箭头平整卡片（Clean Minimal）
                    </HoverCardTrigger>
                    <HoverCardContent size="sm">
                      <p className="text-xs font-semibold text-foreground">无箭头紧凑浮层</p>
                      <p className="text-2xs text-muted-foreground mt-1">适合紧贴在按钮或操作栏下方的提示。</p>
                    </HoverCardContent>
                  </HoverCard>

                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs text-muted-foreground hover:text-foreground underline decoration-dotted">
                      带气泡指向箭头（With HoverCardArrow）
                    </HoverCardTrigger>
                    <HoverCardContent size="sm">
                      <HoverCardArrow />
                      <p className="text-xs font-semibold text-foreground">带指向箭头</p>
                      <p className="text-2xs text-muted-foreground mt-1">显式放入 children，明确视觉指示来源。</p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>

              {/* ④ 延迟策略 */}
              <div>
                <SubLabel>④ 响应延迟策略（Timings: 即时调试 vs 防误触人机工程）</SubLabel>
                <div className="flex flex-wrap items-center gap-4">
                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs font-mono px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground">
                      delay=0 (即时)
                    </HoverCardTrigger>
                    <HoverCardContent size="sm">
                      <p className="text-xs font-medium text-foreground">即时展开 (0ms)</p>
                      <p className="text-2xs text-muted-foreground mt-1">鼠标触碰瞬间展开，适合调试测试。</p>
                    </HoverCardContent>
                  </HoverCard>

                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs font-mono px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground">
                      delay=300 · closeDelay=150 (推荐生产配置)
                    </HoverCardTrigger>
                    <HoverCardContent size="sm">
                      <HoverCardArrow />
                      <p className="text-xs font-medium text-foreground">推荐延迟 (300ms/150ms)</p>
                      <p className="text-2xs text-muted-foreground mt-1">避免鼠标横穿屏幕时引发走马灯式闪烁。</p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>

              {/* ⑤ 真实业务场景卡片全景 */}
              {/* ⑤ Ordo 全流程核心业务卡片矩阵（6 大核心业务深度特色） */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <SubLabel>⑤ Ordo 全流程核心业务卡片矩阵（统一架构 × 模块特色）</SubLabel>
                  <span className="text-3xs text-muted-foreground">
                    严格遵循「四层三列」外舒内紧架构，突出各模块专属第一视觉信号 (Hero Visual)
                  </span>
                </div>

                {/* A. 交互悬停体验栏 (Interactive Hover Triggers) */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/10 space-y-2">
                  <p className="text-2xs font-medium text-foreground">
                    交互悬浮测试（鼠标滑过以下实体，检验定位避障、气泡箭头与浮层开闭手感）：
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* 1. 任务卡 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors group">
                        <CheckSquare className="size-3.5 text-accent-blue" />
                        <span className="group-hover:text-accent-blue">任务: #ISSUE-104</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
                              <CheckSquare className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              重构 Design System 侧栏导航与悬停规范
                            </span>
                            <Badge variant="outline" className="text-3xs shrink-0">Task</Badge>
                          </div>
                          {/* Hero 带：状态 + 优先级 + 迭代 */}
                          <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                            <div className="flex items-center gap-1.5">
                              <StatusPill tone="info">In Progress</StatusPill>
                              <span className="inline-flex items-center gap-1 text-3xs text-accent-red font-medium">
                                <Flag className="size-2.5 fill-accent-red" /> High
                              </span>
                            </div>
                            <span className="text-3xs font-mono text-muted-foreground">Sprint 24</span>
                          </div>
                          <PreviewSection title="工单属性">
                            <PreviewRow label="负责人">
                              <div className="flex items-center gap-1.5">
                                <MemberAvatar
                                  size="xs"
                                  member={{
                                    type: 'human',
                                    displayName: 'Alex Chen',
                                    handle: 'alex',
                                    isOnline: true,
                                  }}
                                />
                                <span>Alex Chen (@alex)</span>
                              </div>
                            </PreviewRow>
                            <PreviewRow label="所属项目">Ordo</PreviewRow>
                            <PreviewRow label="工时进度">
                              <div className="flex items-center gap-2 flex-1">
                                <Progress value={62} className="h-1.5 flex-1" />
                                <span className="font-mono text-3xs text-muted-foreground">2.5h / 4h</span>
                              </div>
                            </PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span>分支: <code>feat/design-system</code></span>
                            <span className="ml-auto font-mono text-3xs">截止 2026-09-15</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 2. 缺陷阻断卡 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-accent-red/30 bg-accent-red/5 hover:bg-accent-red/10 text-xs font-medium text-accent-red transition-colors group">
                        <Bug className="size-3.5" />
                        <span className="group-hover:underline">缺陷: #BUG-42 (阻断)</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-red/10 text-accent-red">
                              <Bug className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              工作区路由并发死锁（阻断发版）
                            </span>
                            <Badge variant="destructive" className="text-3xs shrink-0">Bug</Badge>
                          </div>
                          {/* Hero 带：严重性标尺 + 阻断发版警示 */}
                          <div className="flex items-center justify-between p-2 rounded-md bg-accent-red/10 border border-accent-red/30">
                            <div className="flex items-center gap-2">
                              <SeverityBar severity="critical" />
                              <span className="text-3xs font-semibold text-accent-red uppercase tracking-wider">
                                阻塞发布 (Blocker)
                              </span>
                            </div>
                            <StatusPill tone="danger">Open</StatusPill>
                          </div>
                          <PreviewSection title="排查上下文">
                            <PreviewRow label="复现环境">Node 20.14 · SQLite WAL · macOS 15</PreviewRow>
                            <PreviewRow label="根因分类">AsyncLocalStorage 作用域穿透竞态</PreviewRow>
                            <PreviewRow label="修复关联">已关联工单 #ISSUE-112</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span className="text-accent-red flex items-center gap-1 font-medium">
                              <AlertCircle className="size-3" /> P0 紧急响应中
                            </span>
                            <span className="ml-auto font-mono text-3xs">报障人: @qa-bot</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 3. 工程治理验收卡 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-accent-green/30 bg-accent-green/5 hover:bg-accent-green/10 text-xs font-medium text-accent-green transition-colors group">
                        <ShieldCheck className="size-3.5" />
                        <span className="group-hover:underline">验收: ACC-2026-09</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="xl">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-green/10 text-accent-green">
                              <ShieldCheck className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              v2.4 核心质量门禁收口与闭环
                            </span>
                            <Badge variant="secondary" className="text-3xs shrink-0 text-accent-green bg-accent-green/10">
                              Acceptance
                            </Badge>
                          </div>
                          {/* Hero 带：门禁通过率点阵 + 进度 */}
                          <div className="space-y-1.5 p-2 rounded-md bg-accent-green/10 border border-accent-green/30">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-accent-green flex items-center gap-1">
                                <CheckCircle2 className="size-3.5" /> 门禁通过率: 3/4 Passed
                              </span>
                              <span className="font-mono text-3xs font-semibold text-accent-green">75%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="h-1.5 flex-1 rounded-full bg-accent-green" title="单测覆盖率: Passed" />
                              <span className="h-1.5 flex-1 rounded-full bg-accent-green" title="API 契约零漂移: Passed" />
                              <span className="h-1.5 flex-1 rounded-full bg-accent-green" title="文档同步对齐: Passed" />
                              <span className="h-1.5 flex-1 rounded-full bg-accent-yellow animate-pulse" title="破坏性静态扫描: Pending" />
                            </div>
                          </div>
                          <PreviewSection title="证据回流与治理">
                            <PreviewRow label="证据链">12 条 CI/PR 自动化回流证据</PreviewRow>
                            <PreviewRow label="AI 代写状态">AI 同事已草拟验收标准，待人审签署</PreviewRow>
                            <PreviewRow label="阻断风险">1 项破坏性代码扫描待确认</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span className="text-accent-yellow flex items-center gap-1 font-medium">
                              <Clock className="size-3" /> 等待人工签署确认
                            </span>
                            <span className="ml-auto font-mono text-3xs">对应 #ISSUE-104</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 4. 项目全景卡 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors group">
                        <FolderKanban className="size-3.5 text-primary" />
                        <span className="group-hover:text-primary">项目: Nebula Core</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <FolderKanban className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              Nebula Core (Ordo 核心平台)
                            </span>
                            <Badge variant="outline" className="text-3xs shrink-0">Project</Badge>
                          </div>
                          {/* Hero 带：健康度 + 交付进度 */}
                          <div className="space-y-1.5 pb-1 border-b border-border/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <StatusPill tone="success">On Track</StatusPill>
                                <span className="text-2xs font-medium text-foreground">健康度 94 分</span>
                              </div>
                              <span className="text-3xs font-mono text-muted-foreground">已完成 48/60 工单</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={80} className="h-1.5 flex-1" />
                              <span className="font-mono text-3xs text-muted-foreground">80%</span>
                            </div>
                          </div>
                          <PreviewSection title="项目大盘">
                            <PreviewRow label="核心仓库">ordo (develop)</PreviewRow>
                            <PreviewRow label="协作团队">4 位人类工程师 + 2 位 AI 同事</PreviewRow>
                            <PreviewRow label="双轨成本">累计 186k Tokens ($1.42) · 38h</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span>负责人: @alex</span>
                            <span className="ml-auto font-mono text-3xs">目标 GA: 2026-09-30</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 5. AI 执行与审批卡 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-accent-purple/30 bg-accent-purple/5 hover:bg-accent-purple/10 text-xs font-medium text-accent-purple transition-colors group">
                        <Bot className="size-3.5" />
                        <span className="group-hover:underline">执行审批: EXEC-891</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="xl">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-purple/10 text-accent-purple">
                              <Bot className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              EXEC-891: 全局样式 Token 批量重构
                            </span>
                            <Badge variant="outline" className="text-3xs shrink-0 text-accent-purple border-accent-purple/40">
                              Execution
                            </Badge>
                          </div>
                          {/* Hero 带：等待审批 + 冷却倒计时 + 双轨消耗 */}
                          <div className="p-2 rounded-md bg-accent-purple/10 border border-accent-purple/30 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-accent-purple flex items-center gap-1">
                                <Clock className="size-3" /> 等待人审决议 (Pending Approval)
                              </span>
                              <span className="text-3xs font-mono px-1.5 py-0.5 rounded bg-accent-red/20 text-accent-red font-semibold">
                                高风险拦截
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DualTrackMetricPill tokens={4280} durationMs={2400} costUsd={0.0064} model="Claude 3.7" />
                            </div>
                          </div>
                          <PreviewSection title="执行影响分析">
                            <PreviewRow label="触发源">CLI Dispatch (`claude-code` 运行时)</PreviewRow>
                            <PreviewRow label="破坏性评估">波及 14 个组件，涉及 28 处基础色板变更</PreviewRow>
                            <PreviewRow label="回滚保护">Git Worktree 独立隔离，支持一键丢弃</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span className="text-accent-purple font-medium">3s 冷却门禁已解除</span>
                            <span className="ml-auto font-mono text-3xs">按键 1 确认 / 2 驳回</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 6. 版本发布卡 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-accent-orange/30 bg-accent-orange/5 hover:bg-accent-orange/10 text-xs font-medium text-accent-orange transition-colors group">
                        <Rocket className="size-3.5" />
                        <span className="group-hover:underline">发版: Release v2.4.0</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-orange/10 text-accent-orange">
                              <Rocket className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              Release v2.4.0 (Spring GA 稳定版)
                            </span>
                            <Badge variant="outline" className="text-3xs shrink-0 text-accent-orange border-accent-orange/40">
                              Release
                            </Badge>
                          </div>
                          {/* Hero 带：发布状态 + Git Tag + 门禁收口 */}
                          <div className="space-y-1.5 pb-1 border-b border-border/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <StatusPill tone="success">Published</StatusPill>
                                <span className="text-2xs font-mono font-medium text-foreground">tag: v2.4.0</span>
                              </div>
                              <span className="text-3xs font-mono text-muted-foreground">commit 9f8e12a</span>
                            </div>
                            <div className="flex items-center justify-between text-3xs text-muted-foreground pt-0.5">
                              <span className="flex items-center gap-1 text-accent-green font-medium">
                                <ShieldCheck className="size-3" /> 门禁归档 100% 审计闭环
                              </span>
                              <span className="font-mono">4/4 全绿</span>
                            </div>
                          </div>
                          <PreviewSection title="发版资产与元数据">
                            <PreviewRow label="变更真相源">CHANGELOG.md (单向再生完成)</PreviewRow>
                            <PreviewRow label="归档工单">28 项工单 · 6 项治理验收闭环</PreviewRow>
                            <PreviewRow label="多端分发">Web (Vite) / Desktop (Electron) / CLI</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span>签发人: @alex (双签审计)</span>
                            <span className="ml-auto font-mono text-3xs">2026-09-11 GA</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                </div>

                {/* B. 全景平铺审查画廊 (Expanded Spec Gallery) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-2xs font-medium text-foreground">
                      全景平铺审查画廊（无需悬停，直接对比各模块卡片的统一底盘与差异化第一视觉）：
                    </p>
                    <Badge variant="secondary" className="text-3xs">静态展开对比</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* 卡片 1: 任务工单卡 */}
                    <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
                            <CheckSquare className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            #ISSUE-104: 重构侧栏与 HoverCard
                          </span>
                          <Badge variant="outline" className="text-3xs shrink-0">Task</Badge>
                        </div>
                        <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                          <div className="flex items-center gap-1.5">
                            <StatusPill tone="info">In Progress</StatusPill>
                            <span className="inline-flex items-center gap-1 text-3xs text-accent-red font-medium">
                              <Flag className="size-2.5 fill-accent-red" /> High
                            </span>
                          </div>
                          <span className="text-3xs font-mono text-muted-foreground">Sprint 24</span>
                        </div>
                        <PreviewSection title="工单属性">
                          <PreviewRow label="负责人">@alex (Alex Chen)</PreviewRow>
                          <PreviewRow label="所属项目">Ordo</PreviewRow>
                          <PreviewRow label="工时进度">2.5h / 4h (62%)</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span>分支: <code>feat/design-system</code></span>
                        <span className="ml-auto font-mono text-3xs">截止 09-15</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 2: 缺陷阻断卡 */}
                    <div className="rounded-xl border border-accent-red/40 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-red/10 text-accent-red">
                            <Bug className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            #BUG-42: 工作区路由并发死锁
                          </span>
                          <Badge variant="destructive" className="text-3xs shrink-0">Bug</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-accent-red/10 border border-accent-red/30">
                          <div className="flex items-center gap-2">
                            <SeverityBar severity="critical" />
                            <span className="text-3xs font-semibold text-accent-red uppercase tracking-wider">
                              阻塞发布 (Blocker)
                            </span>
                          </div>
                          <StatusPill tone="danger">Open</StatusPill>
                        </div>
                        <PreviewSection title="排查上下文">
                          <PreviewRow label="复现环境">Node 20.14 · SQLite WAL</PreviewRow>
                          <PreviewRow label="根因分类">AsyncLocalStorage 穿透竞态</PreviewRow>
                          <PreviewRow label="修复关联">关联工单 #ISSUE-112</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span className="text-accent-red flex items-center gap-1 font-medium">
                          <AlertCircle className="size-3" /> P0 紧急响应中
                        </span>
                        <span className="ml-auto font-mono text-3xs">@qa-bot</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 3: 工程验收卡 */}
                    <div className="rounded-xl border border-accent-green/40 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-green/10 text-accent-green">
                            <ShieldCheck className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            ACC-2026-09: 核心门禁收口
                          </span>
                          <Badge variant="secondary" className="text-3xs shrink-0 text-accent-green bg-accent-green/10">
                            Acceptance
                          </Badge>
                        </div>
                        <div className="space-y-1.5 p-2 rounded-md bg-accent-green/10 border border-accent-green/30">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-accent-green flex items-center gap-1">
                              <CheckCircle2 className="size-3.5" /> 门禁通过率: 3/4 Passed
                            </span>
                            <span className="font-mono text-3xs font-semibold text-accent-green">75%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 flex-1 rounded-full bg-accent-green" />
                            <span className="h-1.5 flex-1 rounded-full bg-accent-green" />
                            <span className="h-1.5 flex-1 rounded-full bg-accent-green" />
                            <span className="h-1.5 flex-1 rounded-full bg-accent-yellow animate-pulse" />
                          </div>
                        </div>
                        <PreviewSection title="证据回流与治理">
                          <PreviewRow label="证据链">12 条 CI/PR 回流证据</PreviewRow>
                          <PreviewRow label="AI 审计状态">AI 已草拟标准，待人审</PreviewRow>
                          <PreviewRow label="阻断风险">1 项静态扫描待裁决</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span className="text-accent-yellow flex items-center gap-1 font-medium">
                          <Clock className="size-3" /> 等待签署确认
                        </span>
                        <span className="ml-auto font-mono text-3xs">#ISSUE-104</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 4: 项目全景卡 */}
                    <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <FolderKanban className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            Nebula Core
                          </span>
                          <Badge variant="outline" className="text-3xs shrink-0">Project</Badge>
                        </div>
                        <div className="space-y-1.5 pb-1 border-b border-border/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <StatusPill tone="success">On Track</StatusPill>
                              <span className="text-2xs font-medium text-foreground">健康度 94 分</span>
                            </div>
                            <span className="text-3xs font-mono text-muted-foreground">48/60 工单</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={80} className="h-1.5 flex-1" />
                            <span className="font-mono text-3xs text-muted-foreground">80%</span>
                          </div>
                        </div>
                        <PreviewSection title="项目大盘">
                          <PreviewRow label="核心仓库">ordo</PreviewRow>
                          <PreviewRow label="协作团队">4 位成员 + 2 位 AI</PreviewRow>
                          <PreviewRow label="双轨成本">186k Tokens ($1.42) · 38h</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span>负责人: @alex</span>
                        <span className="ml-auto font-mono text-3xs">GA 09-30</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 5: AI 执行审批卡 */}
                    <div className="rounded-xl border border-accent-purple/40 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-purple/10 text-accent-purple">
                            <Bot className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            EXEC-891: 全局样式重构
                          </span>
                          <Badge variant="outline" className="text-3xs shrink-0 text-accent-purple border-accent-purple/40">
                            Execution
                          </Badge>
                        </div>
                        <div className="p-2 rounded-md bg-accent-purple/10 border border-accent-purple/30 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-accent-purple flex items-center gap-1">
                              <Clock className="size-3" /> 等待人审决议
                            </span>
                            <span className="text-3xs font-mono px-1.5 py-0.5 rounded bg-accent-red/20 text-accent-red font-semibold">
                              高风险拦截
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DualTrackMetricPill tokens={4280} durationMs={2400} costUsd={0.0064} model="Claude 3.7" />
                          </div>
                        </div>
                        <PreviewSection title="执行影响分析">
                          <PreviewRow label="触发源">CLI Dispatch (`claude-code`)</PreviewRow>
                          <PreviewRow label="破坏性评估">波及 14 个组件，改动 28 处样式</PreviewRow>
                          <PreviewRow label="回滚保护">Git Worktree 隔离</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span className="text-accent-purple font-medium">3s 门禁已解除</span>
                        <span className="ml-auto font-mono text-3xs">按键 1 确认 / 2 驳回</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 6: 版本发布归档卡 */}
                    <div className="rounded-xl border border-accent-orange/40 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-orange/10 text-accent-orange">
                            <Rocket className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            Release v2.4.0-GA
                          </span>
                          <Badge variant="outline" className="text-3xs shrink-0 text-accent-orange border-accent-orange/40">
                            Release
                          </Badge>
                        </div>
                        <div className="space-y-1.5 pb-1 border-b border-border/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <StatusPill tone="success">Published</StatusPill>
                              <span className="text-2xs font-mono font-medium text-foreground">tag: v2.4.0</span>
                            </div>
                            <span className="text-3xs font-mono text-muted-foreground">commit 9f8e12a</span>
                          </div>
                          <div className="flex items-center justify-between text-3xs text-muted-foreground pt-0.5">
                            <span className="flex items-center gap-1 text-accent-green font-medium">
                              <ShieldCheck className="size-3" /> 门禁归档闭环
                            </span>
                            <span className="font-mono text-3xs text-accent-green font-semibold">100% 审计</span>
                          </div>
                        </div>
                        <PreviewSection title="发版资产与元数据">
                          <PreviewRow label="变更真相源">CHANGELOG.md (单向再生)</PreviewRow>
                          <PreviewRow label="归档工单">28 项工单 · 6 项验收闭环</PreviewRow>
                          <PreviewRow label="多端产物">Web · Desktop · CLI</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span>签发人: @alex (双签审计)</span>
                        <span className="ml-auto font-mono text-3xs">09-11 GA</span>
                      </PreviewFooterMeta>
                    </div>
                  </div>
                </div>
              </div>

              {/* ⑥ 孪生成员卡片体系（Twin Identity Cards: 人类同事 vs AI同事 · 对称底盘 × 异构度量） */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <SubLabel>⑥ 孪生成员卡片体系（Twin Identity Cards: 人类同事 vs AI 同事）</SubLabel>
                  <span className="text-3xs text-muted-foreground">
                    双表面核心：相同底盘框架（Header 3列 / 统一 Hero 焦点带 / 统一 PreviewSection），特化异构数据
                  </span>
                </div>

                {/* A. 交互悬停体验栏 */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/10 space-y-2">
                  <p className="text-2xs font-medium text-foreground">
                    孪生成员交互悬浮体验（分别悬停人类同事与 AI 同事，体验相同视觉底盘下的异构数据呈现）：
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* 人类同事 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors group">
                        <MemberAvatar
                          size="xs"
                          member={{
                            type: 'human',
                            displayName: 'Alex Chen',
                            handle: 'alex',
                            isOnline: true,
                          }}
                        />
                        <span className="group-hover:text-accent-blue">人类同事: Alex Chen (@alex)</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="xl">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          {/* 统一三列 Header */}
                          <div className="flex items-start gap-3">
                            <MemberAvatar
                              size="lg"
                              member={{
                                type: 'human',
                                displayName: 'Alex Chen',
                                handle: 'alex',
                                isOnline: true,
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-foreground truncate">Alex Chen</h4>
                                <span className="inline-flex items-center gap-1 text-3xs text-accent-green font-medium">
                                  <span className="size-1.5 rounded-full bg-accent-green" /> 在职在线
                                </span>
                              </div>
                              <p className="text-2xs text-muted-foreground truncate">资深全栈架构师 · @alex</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <TrustLevelBadge level={2} />
                                <Badge variant="outline" className="text-3xs py-0">PR 评审 / 生产发布</Badge>
                              </div>
                            </div>
                          </div>
                          {/* Hero 焦点带：工时负荷 + 技术栈 */}
                          <div className="p-2 rounded-md bg-muted/40 border border-border/60 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-2xs font-medium text-foreground flex items-center gap-1">
                                <Activity className="size-3 text-accent-blue" /> 本周负荷 32h / 40h
                              </span>
                              <span className="font-mono text-3xs text-muted-foreground">80% · 3 个活跃工单</span>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              {['React 19', 'NestJS 10', 'Tailwind v4', 'SQLite'].map((tech) => (
                                <span key={tech} className="text-3xs font-mono px-1.5 py-0.5 rounded bg-background border border-border/60 text-muted-foreground">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                          {/* 属性小节 */}
                          <PreviewSection title="协作与职责">
                            <PreviewRow label="所属团队">前端架构组 (Team Lead)</PreviewRow>
                            <PreviewRow label="核心模块">Design System · 实时协同引擎</PreviewRow>
                            <PreviewRow label="当前攻坚">#ISSUE-104: 重构侧栏与 HoverCard</PreviewRow>
                          </PreviewSection>
                          {/* 底部元信息 */}
                          <PreviewFooterMeta>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3 text-muted-foreground" /> 远程 · UTC+8 (5m 前活跃)
                            </span>
                            <span className="ml-auto font-mono text-3xs">alex@ordo.dev</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* AI 同事 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-accent-purple/30 bg-accent-purple/5 hover:bg-accent-purple/10 text-xs font-medium text-accent-purple transition-colors group">
                        <MemberAvatar
                          size="xs"
                          member={{
                            type: 'ai_agent',
                            displayName: 'Claude Coder',
                            handle: 'claude-coder',
                            isOnline: true,
                          }}
                        />
                        <span className="group-hover:underline">AI 同事: Claude Coder (@claude-coder)</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="xl">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          {/* 统一三列 Header */}
                          <div className="flex items-start gap-3">
                            <MemberAvatar
                              size="lg"
                              member={{
                                type: 'ai_agent',
                                displayName: 'Claude Coder',
                                handle: 'claude-coder',
                                isOnline: true,
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-foreground truncate">Claude Coder</h4>
                                <span className="inline-flex items-center gap-1 text-3xs text-accent-green font-medium">
                                  <span className="size-1.5 rounded-full bg-accent-green animate-pulse" /> 常驻就绪
                                </span>
                              </div>
                              <p className="text-2xs text-muted-foreground truncate">全栈执行 Agent · Claude 3.7 Sonnet</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <TrustLevelBadge level={3} />
                                <Badge variant="outline" className="text-3xs py-0">自主编码权限</Badge>
                              </div>
                            </div>
                          </div>
                          {/* Hero 焦点带：Token 消耗 + CLI 工具流 */}
                          <div className="p-2 rounded-md bg-accent-purple/10 border border-accent-purple/30 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <DualTrackMetricPill tokens={4280} durationMs={2400} costUsd={0.0064} model="Claude 3.7" />
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              {['Git Worktree', 'CLI Dispatch', 'Jest/Vitest', 'API Contract'].map((tool) => (
                                <span key={tool} className="text-3xs font-mono px-1.5 py-0.5 rounded bg-background/80 border border-accent-purple/30 text-accent-purple">
                                  {tool}
                                </span>
                              ))}
                            </div>
                          </div>
                          {/* 属性小节 */}
                          <PreviewSection title="执行表现度量">
                            <PreviewRow label="门禁通过率">96.8% (31/32 门禁一次性通过)</PreviewRow>
                            <PreviewRow label="常驻守护">ordo-runtime 节点 #rt-08</PreviewRow>
                            <PreviewRow label="授权边界">自主编码测试 · 生产合流需人审</PreviewRow>
                          </PreviewSection>
                          {/* 底部元信息 */}
                          <PreviewFooterMeta>
                            <span className="text-accent-green flex items-center gap-1">
                              <CheckCircle2 className="size-3" /> 契约巡检零偏差
                            </span>
                            <span className="ml-auto font-mono text-3xs">活跃分支: feat/*</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                </div>

                {/* B. 孪生卡片对称 1:1 对比画廊 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-2xs font-medium text-foreground">
                      孪生卡片 1:1 对称平铺画廊（验证三列头部、中间 Hero 焦点带、PreviewSection 高度节奏一致性）：
                    </p>
                    <Badge variant="secondary" className="text-3xs">对称规范对比</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                    {/* 左：人类同事卡 */}
                    <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <MemberAvatar
                            size="lg"
                            member={{
                              type: 'human',
                              displayName: 'Alex Chen',
                              handle: 'alex',
                              isOnline: true,
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-semibold text-foreground truncate">Alex Chen</h4>
                              <span className="inline-flex items-center gap-1 text-3xs text-accent-green font-medium">
                                <span className="size-1.5 rounded-full bg-accent-green" /> 在职在线
                              </span>
                            </div>
                            <p className="text-2xs text-muted-foreground truncate">资深全栈架构师 · @alex</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <TrustLevelBadge level={2} />
                              <Badge variant="outline" className="text-3xs py-0">PR 评审 / 生产发布</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="p-2 rounded-md bg-muted/40 border border-border/60 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-2xs font-medium text-foreground flex items-center gap-1">
                              <Activity className="size-3 text-accent-blue" /> 本周负荷 32h / 40h
                            </span>
                            <span className="font-mono text-3xs text-muted-foreground">80% · 3 工单</span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {['React 19', 'NestJS 10', 'Tailwind v4', 'SQLite'].map((tech) => (
                              <span key={tech} className="text-3xs font-mono px-1.5 py-0.5 rounded bg-background border border-border/60 text-muted-foreground">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>

                        <PreviewSection title="协作与职责">
                          <PreviewRow label="所属团队">前端架构组 (Team Lead)</PreviewRow>
                          <PreviewRow label="核心模块">Design System · 实时协同引擎</PreviewRow>
                          <PreviewRow label="当前攻坚">#ISSUE-104: 重构侧栏与 HoverCard</PreviewRow>
                        </PreviewSection>
                      </div>

                      <PreviewFooterMeta>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 text-muted-foreground" /> 远程 · UTC+8 (5m 前活跃)
                        </span>
                        <span className="ml-auto font-mono text-3xs">alex@ordo.dev</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 右：AI 同事卡 */}
                    <div className="rounded-xl border border-accent-purple/40 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <MemberAvatar
                            size="lg"
                            member={{
                              type: 'ai_agent',
                              displayName: 'Claude Coder',
                              handle: 'claude-coder',
                              isOnline: true,
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-semibold text-foreground truncate">Claude Coder</h4>
                              <span className="inline-flex items-center gap-1 text-3xs text-accent-green font-medium">
                                <span className="size-1.5 rounded-full bg-accent-green animate-pulse" /> 常驻就绪
                              </span>
                            </div>
                            <p className="text-2xs text-muted-foreground truncate">全栈执行 Agent · Claude 3.7 Sonnet</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <TrustLevelBadge level={3} />
                              <Badge variant="outline" className="text-3xs py-0">自主编码权限</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="p-2 rounded-md bg-accent-purple/10 border border-accent-purple/30 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <DualTrackMetricPill tokens={4280} durationMs={2400} costUsd={0.0064} model="Claude 3.7" />
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {['Git Worktree', 'CLI Dispatch', 'Jest/Vitest', 'API Contract'].map((tool) => (
                              <span key={tool} className="text-3xs font-mono px-1.5 py-0.5 rounded bg-background/80 border border-accent-purple/30 text-accent-purple">
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>

                        <PreviewSection title="执行表现度量">
                          <PreviewRow label="门禁通过率">96.8% (31/32 门禁一次通过)</PreviewRow>
                          <PreviewRow label="常驻守护">ordo-runtime 守护节点 #rt-08</PreviewRow>
                          <PreviewRow label="授权边界">自主编码测试 · 生产合流需人审</PreviewRow>
                        </PreviewSection>
                      </div>

                      <PreviewFooterMeta>
                        <span className="text-accent-green flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> 契约巡检零偏差
                        </span>
                        <span className="ml-auto font-mono text-3xs">活跃分支: feat/*</span>
                      </PreviewFooterMeta>
                    </div>
                  </div>
                </div>
              </div>

              {/* ⑦ 轻量级特殊属性卡片族（Lightweight Attribute Cards: 里程碑 / 团队 / PR 审查 / Git 提交） */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <SubLabel>⑦ 轻量级特殊属性卡片族（Lightweight Attribute Cards: 里程碑 / 团队 / PR / Git）</SubLabel>
                  <span className="text-3xs text-muted-foreground">
                    面向高频元属性上下文提供轻快、聚焦的预览能力，统一采用 size="lg" 紧凑结构
                  </span>
                </div>

                {/* A. 交互悬停体验栏 */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/10 space-y-2">
                  <p className="text-2xs font-medium text-foreground">
                    轻量属性交互悬浮测试（鼠标滑过以下微实体，体验轻巧灵动的属性卡片）：
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* 1. 里程碑 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors group">
                        <Milestone className="size-3.5 text-accent-blue" />
                        <span className="group-hover:text-accent-blue">里程碑: v2.4 门禁收口</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
                              <Milestone className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              v2.4 质量门禁收口与闭环
                            </span>
                            <StatusPill tone="info">进行中</StatusPill>
                          </div>
                          <div className="space-y-1.5 pb-1 border-b border-border/50">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-2xs font-medium text-foreground">18 / 24 工单完成</span>
                              <span className="font-mono text-3xs text-muted-foreground">75% · 剩余 3 天</span>
                            </div>
                            <Progress value={75} className="h-1.5" />
                            <div className="flex items-center justify-between text-3xs text-muted-foreground">
                              <span className="flex items-center gap-1 text-accent-green">
                                <TrendingUp className="size-3" /> 燃尽速率平稳
                              </span>
                              <span>目标 2026-09-15</span>
                            </div>
                          </div>
                          <PreviewSection title="排期与交付关联">
                            <PreviewRow label="关联迭代">Sprint 24 (09-01 ~ 09-15)</PreviewRow>
                            <PreviewRow label="关联发版">Release v2.4.0-rc.2</PreviewRow>
                            <PreviewRow label="阻断风险">0 项 Blocker (风险可控)</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span>负责人: @alex</span>
                            <span className="ml-auto font-mono text-3xs">健康度: 92%</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 2. 团队 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors group">
                        <Users className="size-3.5 text-accent-purple" />
                        <span className="group-hover:text-accent-purple">团队: 前端架构组</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-purple/10 text-accent-purple">
                              <Users className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              前端架构与工程团队
                            </span>
                            <Badge variant="outline" className="text-3xs shrink-0">Core Team</Badge>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/60">
                            <div className="flex items-center -space-x-2">
                              <MemberAvatar size="sm" member={{ type: 'human', displayName: 'Alex Chen', handle: 'alex', isOnline: true }} className="ring-2 ring-background" />
                              <MemberAvatar size="sm" member={{ type: 'human', displayName: 'Sarah Lin', handle: 'sarah', isOnline: true }} className="ring-2 ring-background" />
                              <MemberAvatar size="sm" member={{ type: 'human', displayName: 'Leo Zhang', handle: 'leo', isOnline: true }} className="ring-2 ring-background" />
                              <MemberAvatar size="sm" member={{ type: 'ai_agent', displayName: 'Claude Coder', handle: 'claude-coder', isOnline: true }} className="ring-2 ring-background" />
                            </div>
                            <div className="text-right">
                              <span className="text-2xs font-medium text-foreground block">4 位协同成员</span>
                              <span className="text-3xs text-muted-foreground block">3 人类 + 1 AI 同事</span>
                            </div>
                          </div>
                          <PreviewSection title="团队范畴与负荷">
                            <PreviewRow label="核心职责">Web · Electron 桌面壳 · UI 规范</PreviewRow>
                            <PreviewRow label="活跃负荷">14 个工单在跑 · 3 个分支</PreviewRow>
                            <PreviewRow label="交付效能">本周 22 PR 合入 · 零缺陷</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span>Team Lead: @alex</span>
                            <span className="ml-auto font-mono text-3xs text-accent-green flex items-center gap-1">
                              <span className="size-1.5 rounded-full bg-accent-green" /> 全员协同就绪
                            </span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 3. Pull Request Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors group">
                        <GitPullRequest className="size-3.5 text-accent-blue" />
                        <span className="group-hover:text-accent-blue">PR: #128 HoverCard 体系</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
                              <GitPullRequest className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              #128: 核心 HoverCard 体系规范化
                            </span>
                            <StatusPill tone="success">Approved</StatusPill>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/60">
                            <div className="flex items-center gap-1.5 font-mono text-2xs text-foreground min-w-0 truncate">
                              <GitBranch className="size-3 text-muted-foreground shrink-0" />
                              <span className="truncate">feat/design-system</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-accent-blue font-semibold">develop</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-3xs shrink-0">
                              <span className="text-accent-green font-semibold">+248</span>
                              <span className="text-accent-red font-semibold">-36</span>
                            </div>
                          </div>
                          <PreviewSection title="审查与门禁验证">
                            <PreviewRow label="CI 门禁">5/5 Passed (SWC, Vitest, Doc, Lint)</PreviewRow>
                            <PreviewRow label="签署决议">@sarah (已批准) · @qa-bot (签署)</PreviewRow>
                            <PreviewRow label="关联工单">#ISSUE-104: 重构侧栏与 HoverCard</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span className="text-accent-green flex items-center gap-1 font-medium">
                              <CheckCircle2 className="size-3" /> 可无冲突 Squash 合并
                            </span>
                            <span className="ml-auto font-mono text-3xs">15 分钟前更新</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 4. Git 提交 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors group">
                        <GitCommit className="size-3.5 text-muted-foreground" />
                        <span className="group-hover:text-foreground">提交: 7a3f8c1 (fix ALS)</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                              <GitCommit className="size-3.5" />
                            </span>
                            <span className="font-mono text-xs font-semibold text-foreground">
                              commit 7a3f8c1
                            </span>
                            <Badge variant="outline" className="text-3xs shrink-0 text-accent-green border-accent-green/40 flex items-center gap-0.5">
                              <ShieldCheck className="size-2.5" /> Verified
                            </Badge>
                          </div>
                          <div className="p-2 rounded-md bg-muted/40 border border-border/60">
                            <p className="text-xs font-medium text-foreground leading-snug">
                              fix(runtime): resolve AsyncLocalStorage scope penetration race
                            </p>
                          </div>
                          <PreviewSection title="变更上下文">
                            <PreviewRow label="提交作者">Alex Chen (@alex) · 12 分钟前</PreviewRow>
                            <PreviewRow label="变更规模">3 个文件变更 (+42 / -8 行代码)</PreviewRow>
                            <PreviewRow label="CI 流水线">Commit Build #982 Passed (38s)</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span>所在分支: <code>develop</code></span>
                            <span className="ml-auto font-mono text-3xs">关联 #ISSUE-112</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                </div>

                {/* B. 全景平铺审查画廊 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-2xs font-medium text-foreground">
                      轻量属性卡片平铺全景画廊（4 大高频元属性规范对比）：
                    </p>
                    <Badge variant="secondary" className="text-3xs">轻量元卡对比</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 卡片 1: 里程碑卡 */}
                    <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
                            <Milestone className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            v2.4 质量门禁收口
                          </span>
                          <StatusPill tone="info">进行中</StatusPill>
                        </div>
                        <div className="space-y-1.5 pb-1 border-b border-border/50">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-2xs font-medium text-foreground">18 / 24 工单</span>
                            <span className="font-mono text-3xs text-muted-foreground">75% · 剩3天</span>
                          </div>
                          <Progress value={75} className="h-1.5" />
                          <div className="flex items-center justify-between text-3xs text-muted-foreground">
                            <span className="flex items-center gap-1 text-accent-green">
                              <TrendingUp className="size-3" /> 燃尽平稳
                            </span>
                            <span>09-15</span>
                          </div>
                        </div>
                        <PreviewSection title="排期与交付关联">
                          <PreviewRow label="关联迭代">Sprint 24</PreviewRow>
                          <PreviewRow label="关联发版">v2.4.0-rc.2</PreviewRow>
                          <PreviewRow label="阻断风险">0 项 Blocker</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span>负责人: @alex</span>
                        <span className="ml-auto font-mono text-3xs">健康度: 92%</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 2: 团队协同卡 */}
                    <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-purple/10 text-accent-purple">
                            <Users className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            前端架构组
                          </span>
                          <Badge variant="outline" className="text-3xs shrink-0">Core</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/60">
                          <div className="flex items-center -space-x-2">
                            <MemberAvatar size="sm" member={{ type: 'human', displayName: 'Alex Chen', handle: 'alex', isOnline: true }} className="ring-2 ring-background" />
                            <MemberAvatar size="sm" member={{ type: 'human', displayName: 'Sarah Lin', handle: 'sarah', isOnline: true }} className="ring-2 ring-background" />
                            <MemberAvatar size="sm" member={{ type: 'human', displayName: 'Leo Zhang', handle: 'leo', isOnline: true }} className="ring-2 ring-background" />
                            <MemberAvatar size="sm" member={{ type: 'ai_agent', displayName: 'Claude Coder', handle: 'claude-coder', isOnline: true }} className="ring-2 ring-background" />
                          </div>
                          <div className="text-right">
                            <span className="text-2xs font-medium text-foreground block">4 位成员</span>
                            <span className="text-3xs text-muted-foreground block">3人+1AI</span>
                          </div>
                        </div>
                        <PreviewSection title="团队范畴与负荷">
                          <PreviewRow label="核心职责">Web · Desktop · UI</PreviewRow>
                          <PreviewRow label="活跃负荷">14 工单 · 3 分支</PreviewRow>
                          <PreviewRow label="交付效能">22 PR · 零缺陷</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span>Lead: @alex</span>
                        <span className="ml-auto font-mono text-3xs text-accent-green flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-accent-green" /> 全员就绪
                        </span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 3: PR 审查卡 */}
                    <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
                            <GitPullRequest className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            #128: HoverCard
                          </span>
                          <StatusPill tone="success">Approved</StatusPill>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/60">
                          <div className="flex items-center gap-1 font-mono text-3xs text-foreground min-w-0 truncate">
                            <GitBranch className="size-3 text-muted-foreground shrink-0" />
                            <span className="truncate">feat/ui</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-accent-blue font-semibold">dev</span>
                          </div>
                          <div className="flex items-center gap-1 font-mono text-3xs shrink-0">
                            <span className="text-accent-green font-semibold">+248</span>
                            <span className="text-accent-red font-semibold">-36</span>
                          </div>
                        </div>
                        <PreviewSection title="审查与门禁验证">
                          <PreviewRow label="CI 门禁">5/5 Passed</PreviewRow>
                          <PreviewRow label="签署决议">@sarah · @qa-bot</PreviewRow>
                          <PreviewRow label="关联工单">#ISSUE-104</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span className="text-accent-green flex items-center gap-1 font-medium">
                          <CheckCircle2 className="size-3" /> 可无冲突合并
                        </span>
                        <span className="ml-auto font-mono text-3xs">15m 前</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 4: Git 提交卡 */}
                    <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                            <GitCommit className="size-3.5" />
                          </span>
                          <span className="font-mono text-xs font-semibold text-foreground">
                            7a3f8c1
                          </span>
                          <Badge variant="outline" className="text-3xs shrink-0 text-accent-green border-accent-green/40 flex items-center gap-0.5">
                            <ShieldCheck className="size-2.5" /> Verified
                          </Badge>
                        </div>
                        <div className="p-2 rounded-md bg-muted/40 border border-border/60">
                          <p className="text-2xs font-medium text-foreground leading-snug line-clamp-2">
                            fix(runtime): resolve AsyncLocalStorage scope penetration race
                          </p>
                        </div>
                        <PreviewSection title="变更上下文">
                          <PreviewRow label="提交作者">Alex Chen · 12m前</PreviewRow>
                          <PreviewRow label="变更规模">3 文件 (+42 / -8)</PreviewRow>
                          <PreviewRow label="流水线">Build #982 Passed</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span>分支: <code>develop</code></span>
                        <span className="ml-auto font-mono text-3xs">#ISSUE-112</span>
                      </PreviewFooterMeta>
                    </div>
                  </div>
                </div>
              </div>

              {/* ⑧ HoverCard 现存问题诊断与优化点看板 */}
              <div>
                <SubLabel>⑧ 现行 HoverCard 样式诊断与优化点审查（Design System Audit）</SubLabel>
                <div className="rounded-xl border border-accent-yellow/30 bg-accent-yellow/5 p-4 space-y-3 max-w-3xl">
                  <div className="flex items-center gap-2 text-accent-yellow font-semibold text-xs">
                    <AlertTriangle className="size-4" />
                    <span>HoverCard 现状审查清单与 5 大改进建议</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs">
                    <div className="p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <span className="text-accent-red">1. 暗色模式边缘对比度较弱</span>
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        现状仅使用 <code className="text-3xs bg-muted px-1 py-0.5 rounded">ring-1 ring-foreground/10 shadow-md</code>，在纯暗色或半透明底板上阴影被吸收，卡片边界不够清晰。建议补充 <code className="text-3xs bg-muted px-1 py-0.5 rounded">border border-border/80 dark:shadow-black/70</code>。
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <span className="text-accent-orange">2. HoverCardArrow 边缘描边断层</span>
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        箭头是旋转小方块，但未带 border。当主卡片有清晰边框时，箭头两侧与主卡片接合部会形成 1px 缺失断层。建议在 Arrow 上追加对齐的主边框色。
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <span className="text-accent-blue">3. 移动端/触控环境降级缺失</span>
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        在触控屏或移动设备上无 hover 状态，Trigger 会直接跳转或失效。建议为纯 Trigger 增加点击弹出切换（Click Fallback）或长按呼出。
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <span className="text-accent-purple">4. 视口越界高度与溢出滚动保护</span>
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        长内容卡片在低分辨率屏幕或视口边缘时可能被浏览器底部裁切。HoverCardContent 需具备默认的 <code className="text-3xs bg-muted px-1 py-0.5 rounded">max-h-96 overflow-y-auto</code> 安全线。
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-1 sm:col-span-2">
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <span className="text-accent-green">5. 统一数据加载态骨架屏（Skeleton规范）</span>
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        当 HoverCardContent 挂载时触发异步请求（如获取成员实时任务或 Git 提交），目前缺乏标准通用的 <code className="text-3xs bg-muted px-1 py-0.5 rounded">HoverCardSkeleton</code>，易出现高度剧烈跳跃（Layout Shift）。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_breadcrumb() {
  return (
    <>

            <SectionTitle>Breadcrumb</SectionTitle>
            <div className="rounded-lg border border-border p-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem><BreadcrumbLink href="#">Documents</BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbLink href="#">Ordo</BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbPage>API Specification</BreadcrumbPage></BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          
    </>
  )
}

function GallerySec_button_group() {
  return (
    <>

            <SectionTitle>Button Group</SectionTitle>
            <div className="space-y-4">
              <div>
                <SubLabel>Segmented actions</SubLabel>
                <ButtonGroup>
                  <Button variant="outline" size="sm">Bold</Button>
                  <Button variant="outline" size="sm">Italic</Button>
                  <Button variant="outline" size="sm">Underline</Button>
                </ButtonGroup>
              </div>
              <div>
                <SubLabel>With text block</SubLabel>
                <ButtonGroup>
                  <ButtonGroupText><FileText className="w-3.5 h-3.5" /> 12 items selected</ButtonGroupText>
                  <Button size="sm" variant="outline"><Plus /> Add</Button>
                  <Button size="sm" variant="outline"><Trash2 /> Delete</Button>
                </ButtonGroup>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_toggle() {
  const [segValue, setSegValue] = React.useState<string>('list')

  return (
    <>

            <SectionTitle>Toggle &amp; Segmented Control</SectionTitle>
            <div className="space-y-5">
              <div>
                <SubLabel>Toggle (functional)</SubLabel>
                <div className="flex gap-3">
                  <Toggle>Bold</Toggle>
                  <Toggle pressed>Italic</Toggle>
                  <Toggle disabled>Strikethrough</Toggle>
                </div>
              </div>
              <div>
                <SubLabel>Toggle Group</SubLabel>
                <ToggleGroup>
                  <ToggleGroupItem data-state="on">Bold</ToggleGroupItem>
                  <ToggleGroupItem>Italic</ToggleGroupItem>
                  <ToggleGroupItem>Underline</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div>
                <SubLabel>Segmented Control (functional)</SubLabel>
                <SegmentedControl
                  value={segValue}
                  options={[
                    { value: 'list', label: 'List', icon: <List className="w-3.5 h-3.5" /> },
                    { value: 'grid', label: 'Grid', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                  ]}
                  onChange={setSegValue}
                />
              </div>
            </div>
          
    </>
  )
}

function GallerySec_kbd() {
  return (
    <>

            <SectionTitle>Kbd</SectionTitle>
            <div className="flex flex-wrap items-center gap-6">
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <Kbd>Shift</Kbd>
                <Kbd>P</Kbd>
              </KbdGroup>
              <Kbd>Esc</Kbd>
              <Kbd>↵</Kbd>
            </div>
          
    </>
  )
}

function GallerySec_spinner() {
  return (
    <>

            <SectionTitle>Spinner</SectionTitle>
            <div className="flex items-end gap-6">
              {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <Spinner size={s} />
                  <span className="text-3xs text-muted-foreground">{s}</span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-2">
                <Spinner size="lg" className="text-primary" />
                <span className="text-3xs text-muted-foreground">primary</span>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_status_pill() {
  return (
    <>

            <SectionTitle>Status Pill</SectionTitle>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="default">Default</StatusPill>
              <StatusPill tone="success">On Track</StatusPill>
              <StatusPill tone="warning">At Risk</StatusPill>
              <StatusPill tone="danger">Off Track</StatusPill>
              <StatusPill tone="info">In Review</StatusPill>
            </div>
          
    </>
  )
}

function GallerySec_status_icon_frame() {
  return (
    <>

            <SectionTitle>Status Icon Frame</SectionTitle>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(TASK_STATUS_VISUALS).map(([value, visual]) => (
                  <span key={value} className="flex items-center gap-1.5">
                    <StatusIconFrame
                      icon={visual.icon}
                      tone={visual.tone}
                      spin={visual.icon === TASK_STATUS_VISUALS.in_progress.icon}
                    />
                    <span className="text-xs text-muted-foreground">{value}</span>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusIconFrame icon={CircleCheck} tone="success" size="xs" />
                <StatusIconFrame icon={CircleCheck} tone="success" size="sm" />
                <StatusIconFrame icon={CircleCheck} tone="success" size="list" />
                <StatusIconFrame icon={CircleCheck} tone="success" size="md" />
                <StatusIconFrame icon={CircleCheck} tone="success" size="lg" />
                <span className="text-xs text-muted-foreground">xs / sm / list / md / lg（list = Task Atoms 22px 标准芯片）</span>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_markdown() {
  return (
    <>

            <SectionTitle>Markdown View</SectionTitle>
            <div className="max-w-150 rounded-lg border border-border p-4">
              <MarkdownView
                content={[
                  '## GFM Support',
                  '',
                  '- [x] 完成项',
                  '- [ ] 待办项',
                  '',
                  '| Field | Value |',
                  '| ----- | ----- |',
                  '| status | `done` |',
                  '',
                  '```js',
                  "const ok = 'code block';",
                  '```',
                  '',
                  '> 引用块 ~~删除线~~ **加粗** [链接](https://example.com)',
                ].join('\n')}
              />
            </div>
          
    </>
  )
}

function GallerySec_markdown_editor() {
  return (
    <>

            <SectionTitle>Markdown Editor</SectionTitle>
            <div className="flex flex-col gap-4">
              <MarkdownEditorDemo />
              <div className="max-w-100">
                <MarkdownEditor
                  value=""
                  onChange={() => {}}
                  rows={2}
                  preview="toggle"
                  placeholder="Write / Preview 切换模式（窄容器）"
                />
              </div>
            </div>
          
    </>
  )
}

function GallerySec_markdown_live_editor() {
  return (
    <>

            <SectionTitle>Markdown Live Editor</SectionTitle>
            <MarkdownLiveEditorDemo />
          
    </>
  )
}

function GallerySec_prompt_editor() {
  return (
    <>

            <SectionTitle>Prompt Editor</SectionTitle>
            <div className="flex flex-col gap-4">
              <PromptEditorDemo mode="edit" />
              <PromptEditorDemo mode="readonly" />
            </div>
          
    </>
  )
}

function GallerySec_entity_ref() {
  return (
    <>

            <SectionTitle>Entity Ref System</SectionTitle>
            <div className="flex flex-col gap-4">
              <div className="max-w-150 rounded-lg border border-border p-4">
                <p className="mb-3 text-xs text-muted-foreground">
                  引用胶囊 · ordo:// 全部 kind（hover 出预览卡，点击直达详情路由）
                </p>
                <RefCapsuleDemo />
              </div>
              <div className="max-w-150 rounded-lg border border-border p-4">
                <p className="mb-2 text-xs text-muted-foreground">
                  Markdown 原文保留 [标题](ordo://…) 形态，渲染为胶囊；外链不受影响
                </p>
                <RefMarkdownDemo />
              </div>
              <div className="max-w-150">
                <SlashRefDemo />
                <p className="mt-1 text-xs text-muted-foreground">
                  键入 / 触发实体补全：类型筛选 + 键入过滤 + ↑↓/Enter 插入（评论框、描述区、文档编辑器同源）
                </p>
              </div>
              <div className="max-w-150 rounded-lg border border-border p-4">
                <p className="mb-3 text-xs text-muted-foreground">
                  路由预览卡 · 全部实体类型（hover 出卡；示例 ID 无真实数据时呈错误态，真实实体显示富数据）
                </p>
                <RoutePreviewDemo />
              </div>
            </div>
          
    </>
  )
}

function GallerySec_emoji_picker() {
  return (
    <>

            <SectionTitle>Emoji Picker</SectionTitle>
            <div className="rounded-lg border border-border">
              <EmojiPicker onSelect={() => {}} />
            </div>
          
    </>
  )
}

function GallerySec_pagination() {
  return (
    <>

            <SectionTitle>Pagination</SectionTitle>
            <Pagination>
              <PaginationContent>
                <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
                <PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem>
                <PaginationItem><PaginationLink href="#" isActive>2</PaginationLink></PaginationItem>
                <PaginationItem><PaginationLink href="#">3</PaginationLink></PaginationItem>
                <PaginationItem><PaginationEllipsis /></PaginationItem>
                <PaginationItem><PaginationNext href="#" /></PaginationItem>
              </PaginationContent>
            </Pagination>
          
    </>
  )
}

function GallerySec_calendar() {
  return (
    <>

            <SectionTitle>Calendar</SectionTitle>
            <div className="rounded-lg border border-border w-fit">
              <Calendar
                mode="single"
                numberOfMonths={2}
                month={new Date(2026, 4, 1)}
                selected={new Date(2026, 4, 15)}
                onSelect={() => {}}
                className="[--cell-size:--spacing(9)]"
              />
            </div>
          
    </>
  )
}

function GallerySec_date_picker() {
  return (
    <>

            <SectionTitle>Date Picker</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">coss 组合模式（Popover + Calendar + Button）——支持自定义触发器（胶囊）与 presets。</p>
            <DatePickerDemo />
          
    </>
  )
}

function GallerySec_input_otp() {
  return (
    <>

            <SectionTitle>Input OTP</SectionTitle>
            <InputOTP maxLength={6}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          
    </>
  )
}

function GallerySec_input_group() {
  return (
    <>

            <SectionTitle>Input Group</SectionTitle>
            <div className="space-y-4">
              <div>
                <SubLabel>Icon + input + action</SubLabel>
                <InputGroup className="w-80">
                  <InputGroupAddon align="inline-start"><Search className="w-4 h-4" /></InputGroupAddon>
                  <InputGroupInput placeholder="Search tasks..." />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton size="icon-xs" variant="ghost"><Settings /></InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>
              <div>
                <SubLabel>Input + button</SubLabel>
                <InputGroup className="w-80">
                  <InputGroupInput placeholder="Enter email address..." />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton size="sm">Subscribe</InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_select_field() {
  return (
    <>

            <SectionTitle>Select Field</SectionTitle>
            <SelectField defaultValue="active" className="w-48">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </SelectField>
          
    </>
  )
}

function GallerySec_scroll_area() {
  return (
    <>

            <SectionTitle>Scroll Area</SectionTitle>
            <ScrollArea className="h-40 w-full max-w-sm rounded-lg border border-border">
              <div className="p-4 space-y-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-muted-foreground">Activity item {i + 1}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          
    </>
  )
}

function GallerySec_aspect_ratio() {
  return (
    <>

            <SectionTitle>Aspect Ratio</SectionTitle>
            <div className="flex gap-6">
              <AspectRatio ratio={16 / 9} className="w-64 overflow-hidden rounded-lg border border-border" style={{ aspectRatio: '16 / 9' }}>
                <div className="flex h-full w-full items-center justify-center bg-muted/50 text-xs text-muted-foreground">16:9</div>
              </AspectRatio>
              <AspectRatio ratio={4 / 3} className="w-48 overflow-hidden rounded-lg border border-border" style={{ aspectRatio: '4 / 3' }}>
                <div className="flex h-full w-full items-center justify-center bg-muted/50 text-xs text-muted-foreground">4:3</div>
              </AspectRatio>
            </div>
          
    </>
  )
}

function GallerySec_menubar() {
  return (
    <>

            <SectionTitle>Menubar</SectionTitle>
            <div className="space-y-4">
              <div>
                <SubLabel>Menu bar</SubLabel>
                <Menubar>
                  <MenubarMenu>
                    <MenubarTrigger>File</MenubarTrigger>
                    <MenubarContent>
                      <MenubarLabel>Actions</MenubarLabel>
                      <MenubarItem>New File</MenubarItem>
                      <MenubarItem>Open…</MenubarItem>
                      <MenubarSeparator />
                      <MenubarItem>Save All</MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>
                  <MenubarMenu>
                    <MenubarTrigger>Edit</MenubarTrigger>
                  </MenubarMenu>
                  <MenubarMenu>
                    <MenubarTrigger>View</MenubarTrigger>
                  </MenubarMenu>
                </Menubar>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_collapsible() {
  return (
    <>

            <SectionTitle>Collapsible</SectionTitle>
            <Collapsible className="w-full max-w-md">
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors [&>svg]:transition-transform data-[panel-open]:[&>svg]:rotate-180">
                <ChevronDown className="w-4 h-4" />
                Show details
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                This is collapsible content that reveals additional information on demand.
              </CollapsibleContent>
            </Collapsible>
          
    </>
  )
}

function GallerySec_skeleton() {
  return (
    <>

            <SectionTitle>Skeleton</SectionTitle>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <SubLabel>List Loading</SubLabel>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <SubLabel>Card Loading</SubLabel>
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-8 w-20 rounded-md" />
                    <Skeleton className="h-8 w-20 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_empty() {
  return (
    <>

            <SectionTitle>Empty States</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">空态三分场景：Page（整页主体空态，variant="page" 撑满内容区 + IconStack 插画 + 首个功能入口）/ In-Card（卡片/分区内空态，默认 card + muted 圆块图标，不用插画）/ Filter Results（筛选无结果，card + SearchX + 清除筛选动作）。</p>
            <div className="space-y-8">
              <div>
                <SubLabel>Page — 整页空态（h-full 撑满父容器 + min-h-100 兜底）</SubLabel>
                <div className="h-100">
                  <EmptyState
                    variant="page"
                    visual={
                      <IconStack aria-hidden="true" className="text-primary">
                        <FileText className="size-4 text-primary" />
                      </IconStack>
                    }
                    title="暂无文档"
                    description="开始创建你的第一个文档"
                    action={<Button size="sm"><Plus className="w-3 h-3" /> New Document</Button>}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <SubLabel>In-Card — 分区/卡片空态（默认）</SubLabel>
                  <EmptyState
                    icon={CheckSquare}
                    title="No tasks yet"
                    description="You're all caught up! Create a new task to get started."
                    action={<Button size="sm"><Plus className="w-3 h-3" /> New Task</Button>}
                  />
                </div>
                <div>
                  <SubLabel>Filter Results — 筛选无结果（+ 清除筛选）</SubLabel>
                  <EmptyState
                    icon={Search}
                    title="No matching items"
                    description="Try adjusting your search query or clearing the filters."
                    action={<Button size="sm" variant="outline">Clear filters</Button>}
                  />
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_stat_tiles() {
  return (
    <>

            <SectionTitle>Stat Tiles</SectionTitle>
            <div className="space-y-4">
              <div>
                <SubLabel>KPI Row</SubLabel>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total Tasks', value: '248', delta: '+12%', color: 'text-emerald-600', Icon: CheckSquare, accent: 'bg-emerald-500' },
                    { label: 'Open Bugs', value: '13', delta: '-3', color: 'text-red-600', Icon: AlertCircle, accent: 'bg-red-500' },
                    { label: 'Milestones', value: '4/6', delta: '+1', color: 'text-blue-600', Icon: Star, accent: 'bg-blue-500' },
                    { label: 'AI Executions', value: '1.2k', delta: '+8%', color: 'text-violet-600', Icon: Sparkles, accent: 'bg-violet-500' },
                  ].map(({ label, value, delta, color, Icon, accent }) => (
                    <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', accent + '/10')}>
                          <Icon className={cn('w-3.5 h-3.5', accent.replace('bg-', 'text-'))} />
                        </div>
                      </div>
                      <div>
                        <p className="text-2xl font-semibold">{value}</p>
                        <p className={cn('text-xs mt-0.5', color)}>{delta} from last week</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <SubLabel>Horizontal Stats Strip</SubLabel>
                <div className="flex rounded-lg border border-border bg-muted/20 overflow-hidden divide-x divide-border">
                  {[
                    { label: 'Done', value: 44, color: 'text-emerald-600' },
                    { label: 'In Progress', value: 28, color: 'text-blue-600' },
                    { label: 'In Review', value: 16, color: 'text-amber-600' },
                    { label: 'Open', value: 12, color: 'text-slate-500' },
                    { label: 'Canceled', value: 8, color: 'text-muted-foreground' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex-1 px-4 py-3 flex flex-col items-center gap-0.5">
                      <span className={cn('text-lg font-semibold', color)}>{value}</span>
                      <span className="text-3xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_charts() {
  return (
    <>

            <SectionTitle>Charts</SectionTitle>
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-medium">Bar Chart</CardTitle>
                  <CardDescription className="text-xs">Monthly task completions</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={CHART_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
                      <Bar dataKey="value" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-medium">Area Chart</CardTitle>
                  <CardDescription className="text-xs">Bug count over time</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={CHART_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="bugGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-destructive)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--color-destructive)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
                      <Area type="monotone" dataKey="bugs" stroke="var(--color-destructive)" fill="url(#bugGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-medium">Line Chart</CardTitle>
                  <CardDescription className="text-xs">Multi-series trend</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={CHART_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1, 25 80% 54%))" strokeWidth={2} dot={{ r: 3 }} name="Completed" />
                      <Line type="monotone" dataKey="bugs" stroke="hsl(var(--chart-2, 190 65% 48%))" strokeWidth={2} dot={{ r: 3 }} name="Bugs" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-medium">Pie / Donut Chart</CardTitle>
                  <CardDescription className="text-xs">Task status distribution</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-4">
                    <PieChart width={160} height={160}>
                      <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {PIE_DATA.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                      </Pie>
                      <RechartTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
                    </PieChart>
                    <div className="space-y-2">
                      {PIE_DATA.map((e) => (
                        <div key={e.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: e.fill }} />
                          <span className="text-xs text-muted-foreground">{e.name}</span>
                          <span className="text-xs font-medium ml-auto pl-3">{e.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-medium">ChartContainer — theme-aware chart 套件</CardTitle>
                  <CardDescription className="text-xs">config 驱动 tooltip 文案与 CSS 变量着色</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ChartContainer config={DEMO_CHART_CONFIG} className="h-50 w-full">
                    <BarChart data={CHART_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          
    </>
  )
}

function GallerySec_chapter_scrubber() {
  return (
    <>

            <SectionTitle>Chapter Scrubber</SectionTitle>
            <div className="space-y-4">
              <ChapterScrubberDemo />
              <p className="text-xs text-muted-foreground">
                纵向章节刻度轨：单一 spring 驱动的余弦放大波，预览卡自动测高钳位、贴视口边自动换边；listbox 语义 + roving tabindex 键盘可达，prefers-reduced-motion 降级为即时响应。
              </p>
            </div>
          
    </>
  )
}

function GallerySec_page_header() {
  return (
    <>

            <SectionTitle>Page Header</SectionTitle>
            <div className="space-y-4">
              <SubLabel>Standard Header — 单行高度 · 裸图标与标题同高 · 收藏星标</SubLabel>
              <div className="rounded-xl border border-border overflow-hidden">
                <PageHeader
                  title="All Tasks"
                  favorites={<FavoriteToggle label={nodeToText("All Tasks").trim()} />}
                  icon={CheckSquare}
                  iconColor="text-accent-blue"
                  metrics={[{ id: 'tasks', label: 'Tasks', value: 248 }]}
                  actions={<HeaderActionButton icon={Plus} label="New Task" />}
                />
              </div>

              <SubLabel>Action Button Group — 正圆形仅图标，hover 展开为胶囊，兄弟按钮自然位移</SubLabel>
              <div className="rounded-xl border border-border overflow-hidden">
                <PageHeader
                  title="Project Roles"
                  favorites={<FavoriteToggle label={nodeToText("Project Roles").trim()} />}
                  icon={Briefcase}
                  metrics={[{ id: 'roles', label: 'Roles', value: 6 }]}
                  actions={
                    <>
                      <HeaderActionButton icon={RefreshCw} label="Sync Templates" variant="outline" />
                      <HeaderActionButton icon={Plus} label="New Role" />
                    </>
                  }
                />
              </div>

              <SubLabel>Counter Tags — 收藏星标后的计数胶囊：文本 + 数字，integration 风格 + 语义色调</SubLabel>
              <div className="rounded-xl border border-border overflow-hidden">
                <PageHeader
                  title="All Bugs"
                  favorites={<FavoriteToggle label={nodeToText("All Bugs").trim()} />}
                  icon={Bug}
                  iconColor="text-accent-red"
                  metrics={[
                    { id: 'total', label: 'Total', value: 42 },
                    { id: 'open', label: 'Open', value: 13, tone: 'warning' },
                    { id: 'critical', label: 'Critical', value: 4, tone: 'danger' },
                    { id: 'resolved', label: 'Resolved', value: 25, tone: 'success' },
                  ]}
                  actions={<HeaderActionButton icon={Plus} label="Report Bug" variant="danger" />}
                />
              </div>

              <SubLabel>QuickCardsToggle — 页头快捷卡片显隐开关（幽灵钮，激活态主色高亮 + aria-pressed）</SubLabel>
              <div className="rounded-xl border border-border overflow-hidden px-4 py-3">
                <QuickCardsToggleDemo />
              </div>

            </div>
          
    </>
  )
}

function GallerySec_settings_patterns() {
  return (
    <>

            <SectionTitle>Settings Patterns</SectionTitle>
            <div className="space-y-5">
              <SectionAnchor id="settings-header"><GallerySec_settings_header /></SectionAnchor>
              <SectionAnchor id="settings-section-card"><GallerySec_settings_section_card /></SectionAnchor>
              <SectionAnchor id="sticky-save-bar"><GallerySec_sticky_save_bar /></SectionAnchor>
              <SectionAnchor id="settings-field-row"><GallerySec_settings_field_row /></SectionAnchor>
              <SectionAnchor id="path-input"><GallerySec_path_input /></SectionAnchor>
              <SectionAnchor id="definition-row"><GallerySec_definition_row /></SectionAnchor>
              <SectionAnchor id="status-definition-list"><GallerySec_status_definition_list /></SectionAnchor>
            </div>
          
    </>
  )
}

function GallerySec_settings_header() {
  return (
    <>

              <SectionAnchor id="section-scrubber"><GallerySec_section_scrubber /></SectionAnchor>
              
    </>
  )
}

function GallerySec_section_scrubber() {
  return (
    <>

              <div>
                <SubLabel>SettingsHeader + SectionScrubber — 设置页双态吸顶头（在下方盒子内滚动体验：常态大标题无框 → 吸顶毛玻璃卡 + 栏目跳转行）</SubLabel>
                <div className="h-72 overflow-y-auto rounded-xl border border-border">
                  <div className="flex flex-col gap-4 p-4">
                    <SettingsHeader
                      icon={Palette}
                      tone="purple"
                      title="外观"
                      description="主题外观、字体与语言偏好。滚动下方内容，标题收缩为吸顶卡并出现栏目跳转。"
                      actions={<HeaderActionButton icon={Plus} label="操作" variant="outline" />}
                      scrubber={<SectionScrubber sections={SETTINGS_DEMO_SECTIONS} />}
                    />
                    <SettingsSectionCard
                      id="set-demo-theme"
                      icon={Palette}
                      tone="purple"
                      title="主题模式"
                      description="日间 / 夜间 / 跟随系统。"
                    >
                      <p className="text-xs text-content-text-muted">内容区占位：可嵌入表单、行列表等任意内容（§20.6 内容区不放嵌套卡）。</p>
                    </SettingsSectionCard>
                    <SettingsSectionCard
                      id="set-demo-notify"
                      icon={Bell}
                      tone="blue"
                      title="通知偏好"
                      description="提及、订阅与定向推送的接收策略。"
                      actions={<Button variant="outline" size="xs">全部免打扰</Button>}
                    >
                      <p className="text-xs text-content-text-muted">内容区占位（撑出滚动高度用）。</p>
                      <p className="mt-2 text-xs text-content-text-muted">滚动体验 scrubber：点击 chips 平滑跳转，滚动时当前栏目自动高亮。</p>
                    </SettingsSectionCard>
                    <SettingsSectionCard
                      id="set-demo-integration"
                      icon={GitBranch}
                      tone="green"
                      title="集成"
                      description="Git 供应商与外部工具连接。"
                    >
                      <p className="text-xs text-content-text-muted">内容区占位。</p>
                    </SettingsSectionCard>
                  </div>
                </div>
              </div>
              
    </>
  )
}

function GallerySec_settings_section_card() {
  return (
    <>

              <div>
                <SubLabel>SettingsSectionCard · danger — Danger Zone 封闭档（红框红标题，置于页底，破坏性操作配确认弹窗）</SubLabel>
                <SettingsSectionCard
                  icon={AlertTriangle}
                  tone="danger"
                  title="危险区"
                  description="删除工作区不可恢复。"
                  actions={<Button variant="destructive" size="xs">删除工作区</Button>}
                >
                  <p className="text-xs text-content-text-muted">破坏性操作占位。</p>
                </SettingsSectionCard>
              </div>
              
    </>
  )
}

function GallerySec_sticky_save_bar() {
  return (
    <>

              <div>
                <SubLabel>StickySaveBar — 脏状态保存栏（dirty 时浮出，置内容流末尾：短页停尾部、长页滚动吸附视口底；此处静态 dirty 态演示）</SubLabel>
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-2 text-xs text-content-text-muted">上方表单区占位……</p>
                  <StickySaveBar
                    dirty
                    onSave={() => {}}
                    onDiscard={() => {}}
                    hint="Git 配置已修改"
                  />
                </div>
              </div>
              
    </>
  )
}

function GallerySec_settings_field_row() {
  return (
    <>

              <div>
                <SubLabel>SettingsFieldRow — 设置字段行（左说明右控件；立即生效型 Switch / 纯说明行）</SubLabel>
                <div className="flex flex-col gap-2">
                  <SettingsFieldRow
                    title="常驻显示"
                    description="Dock 栏在应用内常驻可见"
                    control={<Switch defaultChecked aria-label="常驻显示" />}
                  />
                  <SettingsFieldRow title="仅说明行（无控件槽）" description="用于提示性条目" />
                </div>
              </div>
              
    </>
  )
}

function GallerySec_path_input() {
  return (
    <>

              <div>
                <SubLabel>PathInput — 路径输入统一件（CAP-A-28：手输+桌面壳系统选择器[仅壳内渲染]+后端实测验证+失效一键创建+保底报错）</SubLabel>
                <div className="flex max-w-xl flex-col gap-4">
                  <PathInput
                    label="本地路径（已验证回显）"
                    description="项目在本机的目录路径"
                    value="D:\\code\\my-project"
                    onChange={() => {}}
                    savedStatus="valid"
                    savedValidatedAt="2026-10-03T09:30:00Z"
                    onValidate={() => Promise.resolve({ status: 'valid', gitRepoDetected: true })}
                  />
                  <PathInput
                    label="本地路径（目录缺失）"
                    description="验证结论 missing 时出现「创建目录」动作"
                    value="D:\\code\\gone-project"
                    onChange={() => {}}
                    onValidate={() => Promise.resolve({ status: 'invalid', error: 'Local path does not exist', suggestion: '创建目录或重新选择', missing: true })}
                    onCreate={() => Promise.resolve({ status: 'invalid', error: '.git directory not found', gitRepoDetected: false })}
                  />
                  <PathInput
                    label="可执行文件（kind=file）"
                    description="Git 可执行文件路径——桌面壳内可唤起系统文件选择器"
                    value=""
                    onChange={() => {}}
                    kind="file"
                    placeholder="C:\\Program Files\\Git\\bin\\git.exe"
                  />
                </div>
              </div>
              
    </>
  )
}

function GallerySec_definition_row() {
  return (
    <>

              <div>
                <SubLabel>DefinitionRow — 定义类管理页行骨架（补登记演示：前导底框图标 / 双行文本 / 尾部槽；拖拽形态须置于 Sortable 内，此处静态形态）</SubLabel>
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <div className="divide-y divide-border/60">
                    <DefinitionRow
                      id="demo-row-1"
                      sortable={false}
                      leading={<span className="flex size-8 items-center justify-center rounded-lg bg-accent-blue-light"><CheckSquare className="size-4 text-accent-blue" /></span>}
                      title={<span className="text-sm font-medium text-foreground">待办</span>}
                      description="已确认尚未开始"
                      trailing={<span className="text-xs text-content-text-muted">12</span>}
                    />
                    <DefinitionRow
                      id="demo-row-2"
                      sortable={false}
                      singleLine
                      leading={<span className="flex size-8 items-center justify-center rounded-lg bg-accent-red-light"><Bug className="size-4 text-accent-red" /></span>}
                      title={<span className="text-sm font-medium text-foreground">阻塞</span>}
                      description="被外部依赖阻断"
                      trailing={<Button variant="ghost" size="icon-xs" aria-label="编辑"><Edit2 className="size-3.5" /></Button>}
                    />
                  </div>
                </div>
              </div>
              
    </>
  )
}

function GallerySec_status_definition_list() {
  return (
    <>

              <div>
                <SubLabel>StatusDefinitionList — 状态定义分组列表（补登记演示：静态只读形态，无回调 = 无新建/编辑/拖拽提交）</SubLabel>
                <StatusDefinitionList definitions={SETTINGS_DEMO_STATUSES} />
              </div>
              
    </>
  )
}

function GallerySec_toolbar() {
  return (
    <>

            <SectionTitle>Toolbar Row</SectionTitle>
            <div className="space-y-4">
              <SubLabel>Standard — 视图胶囊（记忆筛选/样式/排序快照）+ 居中样式切换（≤3 种）+ 筛选/显示/下载按钮组，无上下分界线</SubLabel>
              <ToolbarRowDemo
                demoKey="standard"
                styleOptions={[
                  { value: 'list', label: 'List', icon: List },
                  { value: 'board', label: 'Board', icon: Kanban },
                ]}
              />

              <SubLabel>Three Styles — 3 种样式仍居中（滑动胶囊，参考 delivery 视图设计）</SubLabel>
              <ToolbarRowDemo
                demoKey="three"
                styleOptions={[
                  { value: 'list', label: 'List', icon: List },
                  { value: 'board', label: 'Board', icon: Kanban },
                  { value: 'gantt', label: 'Gantt', icon: CalendarRange },
                ]}
              />

              <SubLabel>Dropdown Form — 样式 &gt;3 种时自动收进右侧常驻下拉按钮（viewStyle.layout 可强制 centered/dropdown）</SubLabel>
              <ToolbarRowDemo
                demoKey="dropdown"
                styleOptions={[
                  { value: 'list', label: 'List', icon: List },
                  { value: 'board', label: 'Board', icon: Kanban },
                  { value: 'gantt', label: 'Gantt', icon: CalendarRange },
                  { value: 'grid', label: 'Grid', icon: LayoutGrid },
                ]}
              />
            </div>
          
    </>
  )
}

function GallerySec_filter_chips() {
  return (
    <>

            <SectionTitle>Filter Chips</SectionTitle>
            <div className="space-y-4">
              <SubLabel>Linear 风格条件条 — 工具栏下单开一行：[字段｜算子｜值｜×] 拼接 chip，行尾 + 追加条件，右侧 Clear / Save（保存到当前视图 / 另存为新视图）</SubLabel>
              <FilterChipsDemo />
            </div>
          
    </>
  )
}

function GallerySec_sub_page_toolbar() {
  return (
    <>

            <SectionTitle>Sub Page Toolbar</SectionTitle>
            <div className="space-y-4">
              <SubLabel>Standard — 返回按钮 + 面包屑 + 居中子页签（rect 滑块）+ 自定义按钮组 + 侧栏开关</SubLabel>
              <SubPageToolbarDemo withSidebar />

              <SubLabel>With Pager — 翻页器 + 选项高亮色调（tone 按页面传入，激活滑块着色）</SubLabel>
              <SubPageToolbarDemo withPager withSidebar />
            </div>
          
    </>
  )
}

function GallerySec_task_atoms() {
  return (
    <>

            <SectionTitle>Task Atoms</SectionTitle>
            <div className="space-y-6">

              <div>
                <SubLabel>StatusChip — 22×22 标准芯片（StatusIconFrame list 档 · tone 唯一链路）</SubLabel>
                <div className="flex flex-wrap gap-4">
                  {(Object.keys(STATUS_CFG) as TaskStatus[]).map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <StatusChip status={s} />
                      <span className="text-xs text-muted-foreground">{STATUS_CFG[s].label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <SubLabel>PriorityIcon</SubLabel>
                <div className="flex flex-wrap gap-4">
                  {(Object.keys(PRIORITY_CFG) as Priority[]).map((p) => (
                    <div key={p} className="flex items-center gap-2">
                      <PriorityIcon priority={p} />
                      <span className="text-xs text-muted-foreground">{PRIORITY_CFG[p].label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <SubLabel>IssueTypePill — 类型胶囊（pill / frame）</SubLabel>
                <div className="flex flex-wrap items-center gap-4">
                  <IssueTypePill meta={{ name: '任务', icon: 'ListTodo', color: '#5E6AD2' }} />
                  <IssueTypePill meta={{ name: '缺陷', icon: 'Bug', color: '#E5484D' }} />
                  <IssueTypePill meta={{ name: '需求', icon: 'Lightbulb', color: '#F5A623' }} />
                  <IssueTypePill meta={{ name: '未配置', icon: 'Circle' }} />
                  <IssueTypePill meta={{ name: '任务', icon: 'ListTodo', color: '#5E6AD2' }} variant="frame" />
                  <IssueTypePill meta={{ name: '缺陷', icon: 'Bug', color: '#E5484D' }} variant="frame" />
                </div>
              </div>

              <div>
                <SubLabel>SeverityBar (Bugs)</SubLabel>
                <div className="flex flex-wrap gap-6">
                  {(Object.keys(SEVERITY_CFG) as Severity[]).map((s) => (
                    <SeverityBar key={s} severity={s} />
                  ))}
                </div>
              </div>

              <div>
                <SubLabel>MilestonePill</SubLabel>
                <div className="flex flex-wrap gap-2">
                  {['Phase 1 · Core UI', 'Phase 2 · Intelligence', 'Phase 3 · Quality', 'v1.0 Release'].map((m, i) => (
                    <MilestonePill key={m} name={m} idx={i} />
                  ))}
                </div>
              </div>

              <div>
                <SubLabel>LabelChip (color-coded by hex)</SubLabel>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Frontend', color: '#3B82F6' },
                    { name: 'Backend', color: '#10B981' },
                    { name: 'Design', color: '#8B5CF6' },
                    { name: 'Bug', color: '#EF4444' },
                    { name: 'CI/CD', color: '#F59E0B' },
                  ].map(({ name, color }) => <LabelChip key={name} name={name} color={color} />)}
                </div>
              </div>

              <SectionAnchor id="subtask-badge"><GallerySec_subtask_badge /></SectionAnchor>
              <SectionAnchor id="ai-verdict-pill"><GallerySec_ai_verdict_pill /></SectionAnchor>

              <div>
                <SubLabel>MemberAvatar — 实体头像（sm 实档 24px）+ 空头像预设</SubLabel>
                <div className="flex items-center gap-3">
                  <MemberAvatar size="sm" member={{ type: 'human', displayName: 'Alex Chen', handle: 'alex' }} />
                  <MemberAvatar size="sm" member={{ type: 'ai_agent', displayName: 'Claude Coder', handle: 'claude-coder' }} />
                  <MemberAvatar size="sm" useInitials member={{ type: 'human', displayName: 'Sarah Connor', handle: 'sarah' }} />
                  <MemberAvatar size="sm" member={null} />
                  <span className="text-xs text-muted-foreground">末位为空头像预设（member 为空 → ? 回落）</span>
                </div>
              </div>

              <div>
                <SubLabel>Acceptance Pills</SubLabel>
                <div className="flex flex-wrap gap-2">
                  <AcceptPill stage="unit" passed={true} />
                  <AcceptPill stage="internal" passed={true} />
                  <AcceptPill stage="dev" passed={false} />
                  <AcceptPill stage="pm" passed={null} />
                  <AcceptPill stage="client" passed={null} />
                </div>
              </div>

              <div>
                <SubLabel>Agent Status Pills</SubLabel>
                <div className="flex flex-wrap gap-2">
                  <AgentPill name="Claude Code" status="active" />
                  <AgentPill name="Cursor" status="contributed" />
                  <AgentPill name="Copilot" status="idle" />
                  <AgentPill name="Codex" status="not_used" />
                  <AgentPill name="Windsurf" status="contributed" />
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_subtask_badge() {
  return (
    <>

              <div>
                <SubLabel>SubtaskBadge — progress ring + count capsule（semantic/subtask-badge · 环与左/上/下边框等距）</SubLabel>
                <div className="flex items-center gap-4">
                  <SubtaskBadge done={3} total={3} />
                  <SubtaskBadge done={2} total={3} />
                  <SubtaskBadge done={1} total={4} />
                  <SubtaskBadge done={0} total={2} />
                </div>
              </div>
              
    </>
  )
}

function GallerySec_ai_verdict_pill() {
  return (
    <>

              <SectionAnchor id="confidence-bar"><GallerySec_confidence_bar /></SectionAnchor>
              
    </>
  )
}

function GallerySec_confidence_bar() {
  return (
    <>


              <div>
                <SubLabel>AiVerdictPill / ConfidenceBar — JEV 判断徽注与概率条（semantic/ai-verdict-pill · confidence-bar · 紫=AI 预估，黄=低置信）</SubLabel>
                <div className="flex flex-wrap items-center gap-3">
                  <AiVerdictPill label="建议批准" confidence={0.92} />
                  <AiVerdictPill label="benign" confidence={0.55} size="xs" />
                  <AiVerdictPill label="高风险" />
                  <ConfidenceBar value={0.87} label="AI 预估达成" />
                  <ConfidenceBar value={0.42} />
                  <ConfidenceBar value={0.96} hidePercent />
                </div>
              </div>
              
    </>
  )
}

function GallerySec_task_rows() {
  const [groupCollapsed, setGroupCollapsed] = React.useState(false)

  return (
    <>

            <SectionTitle>Task Rows</SectionTitle>
            <div className="space-y-4">
              <SubLabel>GroupRow — collapsible section header</SubLabel>
              <div className="rounded-lg border border-border overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-2 bg-muted/25 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => setGroupCollapsed(!groupCollapsed)}
                >
                  <button className="w-4 h-4 flex items-center justify-center text-muted-foreground shrink-0">
                    {groupCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <StatusIconFrame
                    icon={TASK_STATUS_VISUALS.in_progress.icon}
                    tone={TASK_STATUS_VISUALS.in_progress.tone}
                    size="list"
                    spin
                    title="In Progress"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">In Progress</span>
                  <span className="text-2xs text-muted-foreground/50 font-mono">3</span>
                  <div className="flex items-center gap-2 flex-1 max-w-45">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: '40%' }} />
                    </div>
                    <span className="text-3xs text-muted-foreground shrink-0">1/3</span>
                  </div>
                  <button className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent transition-colors">
                    <Plus className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>

                {!groupCollapsed && (
                  <>
                    {[
                      { id: 'Ordo-1', title: 'AI chat interface', status: 'in_progress' as TaskStatus, priority: 'high' as Priority, subtasks: { done: 2, total: 3 }, milestone: 'Phase 1 · Core UI', labels: [{ name: 'Frontend', color: '#3B82F6' }], assignee: 'AK', color: '#6366F1', due: 'Mar 12' },
                      { id: 'Ordo-2', title: 'Kanban board view', status: 'in_progress' as TaskStatus, priority: 'high' as Priority, subtasks: { done: 1, total: 3 }, milestone: 'Phase 1 · Core UI', labels: [{ name: 'Frontend', color: '#3B82F6' }, { name: 'Design', color: '#8B5CF6' }], assignee: 'ML', color: '#F59E0B', due: 'Mar 20' },
                      { id: 'Ordo-4', title: 'AI velocity scoring', status: 'in_progress' as TaskStatus, priority: 'urgent' as Priority, subtasks: { done: 0, total: 2 }, milestone: 'Phase 2 · Intelligence', labels: [{ name: 'Backend', color: '#10B981' }], assignee: 'BK', color: '#EF4444', due: 'Mar 25' },
                    ].map((task, issueIdx) => (
                      <div key={task.id}>
                        <div className="flex items-center gap-2 px-4 py-1.5 hover:bg-accent/20 transition-colors cursor-pointer">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="w-4 h-4 shrink-0" />
                            <StatusChip status={task.status} />
                            <span className="w-15 shrink-0 text-2xs font-mono text-muted-foreground/50">{task.id}</span>
                            <PriorityIcon priority={task.priority} />
                            <p className="flex-1 text-xs text-foreground truncate min-w-0">{task.title}</p>
                            <SubtaskBadge done={task.subtasks.done} total={task.subtasks.total} />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="w-20 text-2xs text-muted-foreground truncate">Ordo</span>
                            <div className="w-35 flex gap-1 overflow-hidden">
                              {task.labels.map((l) => <LabelChip key={l.name} name={l.name} color={l.color} />)}
                            </div>
                            <MilestonePill name={task.milestone} idx={issueIdx} />
                            <div className="w-18 flex items-center gap-1 text-2xs text-muted-foreground">
                              <Clock className="w-3 h-3 shrink-0" />{task.due}
                            </div>
                            <AssigneeAvatar initials={task.assignee} color={task.color} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-1 hover:bg-accent/20 transition-colors cursor-default bg-muted/5">
                          <div className="flex items-center gap-2 flex-1 min-w-0 pl-5">
                            <span className="w-4 h-4 shrink-0" />
                            <StatusChip status="done" />
                            <span className="w-15 shrink-0 text-2xs font-mono text-muted-foreground/40">{task.id}.1</span>
                            <PriorityIcon priority="medium" />
                            <p className="flex-1 text-xs text-muted-foreground truncate min-w-0">Sub-task: initial implementation</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="w-20 text-2xs text-muted-foreground truncate">Ordo</span>
                            <div className="w-35" />
                            <MilestonePill name={task.milestone} idx={issueIdx} />
                            <div className="w-18" />
                            <AssigneeAvatar initials={task.assignee} color={task.color} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 px-4 py-1.5 border-t border-border/50 text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/10 cursor-pointer transition-colors">
                      <span className="w-4 shrink-0" />
                      <Plus className="w-3 h-3" />
                      <span className="text-xs">Add task</span>
                    </div>
                  </>
                )}
              </div>

              <SubLabel>Bug List Row (with severity bar)</SubLabel>
              <div className="rounded-lg border border-border overflow-hidden">
                {(['critical', 'high', 'medium', 'low'] as Severity[]).map((sev) => (
                  <div key={sev} className="flex items-center gap-2 px-4 py-1.5 hover:bg-accent/20 border-b last:border-0 border-border/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-4 shrink-0" />
                      <div className={cn('w-1 h-5 rounded-full shrink-0', SEVERITY_CFG[sev].bar)} />
                      <StatusChip status={sev === 'critical' ? 'in_progress' : sev === 'high' ? 'in_review' : sev === 'medium' ? 'todo' : 'done'} />
                      <span className="w-15 shrink-0 text-2xs font-mono text-muted-foreground/50">BUG-{String((Object.keys(SEVERITY_CFG).indexOf(sev) + 1)).padStart(3, '0')}</span>
                      <p className="flex-1 text-xs text-foreground truncate">{
                        sev === 'critical' ? 'Stripe webhook fires duplicate charges on retry' :
                        sev === 'high' ? 'TasksPage render time exceeds 500 ms threshold' :
                        sev === 'medium' ? 'Race condition in concurrent status updates' :
                        'Tooltip positioning off-screen on small viewports'
                      }</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                      <SeverityBar severity={sev} />
                      <AssigneeAvatar initials={sev === 'critical' ? 'BK' : sev === 'high' ? 'AK' : undefined} color={sev === 'critical' ? '#EF4444' : '#6366F1'} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          
    </>
  )
}

function GallerySec_create_card() {
  return (
    <>

            <SectionTitle>Create / CTA Patterns</SectionTitle>
            <div className="space-y-4">
              <SubLabel>New item card (dashed border CTA)</SubLabel>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { Icon: CheckSquare, label: 'New Task', sub: 'Add to current sprint' },
                  { Icon: FileText, label: 'New Document', sub: 'Markdown or rich text' },
                  { Icon: FolderKanban, label: 'New Project', sub: 'Start from scratch' },
                ].map(({ Icon, label, sub }) => (
                  <button
                    key={label}
                    className="group flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-center"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                      <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</p>
                      <p className="text-3xs text-muted-foreground/60 mt-0.5">{sub}</p>
                    </div>
                  </button>
                ))}
              </div>

              <SubLabel>Inline add row</SubLabel>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/10 cursor-pointer transition-colors border-t border-border/50">
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs">Add task to In Progress…</span>
                </div>
              </div>

              <SubLabel>Modal / drawer trigger</SubLabel>
              <div className="flex gap-3">
                <Button><Plus /> New Task</Button>
                <Button variant="outline"><Plus /> New Document</Button>
                <Button variant="secondary"><Plus /> New Bug</Button>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_delivery_row() {
  return (
    <>

            <SectionTitle>Delivery Row</SectionTitle>
            <SubLabel>Tree-structured delivery table — sticky first column, icon-only accept cells, progress bars, agent status icons</SubLabel>
            {(() => {
              type DsAcceptStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'waived' | 'blocked'
              type DsAgentKey = 'claudeCode' | 'cursor' | 'copilot'
              type DsAgentStatus = 'active' | 'idle' | 'contributed' | 'not_used'
              type DsLevel = 'project' | 'milestone' | 'feature'

              const DS_STATUS: Record<DsAcceptStatus, { icon: React.ElementType; cls: string; label: string }> = {
                pending: { icon: Circle, cls: 'text-muted-foreground/30', label: '待验收' },
                in_progress: { icon: Loader, cls: 'text-blue-500', label: '验收中' },
                passed: { icon: Check, cls: 'text-emerald-500', label: '通过' },
                failed: { icon: X, cls: 'text-red-500', label: '未通过' },
                waived: { icon: Minus, cls: 'text-amber-500', label: '豁免' },
                blocked: { icon: AlertTriangle, cls: 'text-orange-500', label: '阻塞' },
              }
              const DS_AGENT_STATUS: Record<DsAgentStatus, { icon: React.ElementType; cls: string; label: string }> = {
                active: { icon: Activity, cls: 'text-emerald-500', label: '活跃' },
                idle: { icon: Minus, cls: 'text-muted-foreground/40', label: '待机' },
                contributed: { icon: Check, cls: 'text-blue-500', label: '已贡献' },
                not_used: { icon: Circle, cls: 'text-muted-foreground/20', label: '未使用' },
              }
              const DS_AGENT: Record<DsAgentKey, { color: string; shortLabel: string; icon: React.ElementType }> = {
                claudeCode: { color: 'text-violet-500', shortLabel: 'Claude', icon: Sparkles },
                cursor: { color: 'text-blue-500', shortLabel: 'Cursor', icon: Bot },
                copilot: { color: 'text-slate-500', shortLabel: 'Copilot', icon: Bot },
              }
              const DS_LEVEL_INDENT: Record<DsLevel, number> = { project: 0, milestone: 20, feature: 40 }
              const DS_LEVEL_ICON: Record<DsLevel, React.ElementType> = { project: Target, milestone: Flag, feature: Layers }
              const DS_LEVEL_STYLE: Record<DsLevel, string> = {
                project: 'font-semibold text-sm bg-muted/30',
                milestone: 'font-medium text-xs',
                feature: 'text-xs',
              }
              const DS_RISK = {
                low: { label: '低风险', icon: TrendingDown, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' },
                medium: { label: '中风险', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800' },
                high: { label: '高风险', icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-800' },
              }

              const CW = { name: 260, progress: 100, coverage: 72, bugs: 56, risk: 80, claude: 60, cursor: 56, copilot: 56, unit: 56, internal: 56, dev: 56, pm: 56, user: 56, due: 80, owner: 90 }
              const totalW = Object.values(CW).reduce((a, b) => a + b, 0)

              const AGENT_KEYS: DsAgentKey[] = ['claudeCode', 'cursor', 'copilot']
              const AGENT_WIDTHS: Record<DsAgentKey, number> = { claudeCode: CW.claude, cursor: CW.cursor, copilot: CW.copilot }
              const STAGE_COLS = [
                { key: 'unit' as const, label: 'UT', icon: Code2, w: CW.unit },
                { key: 'internal' as const, label: 'IT', icon: FlaskConical, w: CW.internal },
                { key: 'dev' as const, label: 'Dev', icon: Building2, w: CW.dev },
                { key: 'pm' as const, label: 'PM', icon: ClipboardCheck, w: CW.pm },
                { key: 'user' as const, label: 'User', icon: Users, w: CW.user },
              ] as { key: string; label: string; icon: React.ElementType; w: number }[]

              const rows: {
                id: string; level: DsLevel; title: string;
                progress: number; coverage: number | null; bugs: number; risk: 'low' | 'medium' | 'high' | null;
                agents: Record<DsAgentKey, DsAgentStatus>;
                accept: Record<string, DsAcceptStatus>;
                due: string; owner: string; hasChildren?: boolean; expanded?: boolean;
              }[] = [
                {
                  id: 'p1', level: 'project', title: 'Ordo Platform v1.0',
                  progress: 64, coverage: 72, bugs: 8, risk: 'medium',
                  agents: { claudeCode: 'active', cursor: 'active', copilot: 'idle' },
                  accept: { unit: 'passed', internal: 'passed', dev: 'in_progress', pm: 'pending', user: 'pending' },
                  due: '2026-04-30', owner: 'Alex Chen', hasChildren: true, expanded: true,
                },
                {
                  id: 'm1', level: 'milestone', title: 'Phase 1 · Core UI',
                  progress: 95, coverage: 85, bugs: 2, risk: 'low',
                  agents: { claudeCode: 'active', cursor: 'contributed', copilot: 'idle' },
                  accept: { unit: 'passed', internal: 'passed', dev: 'passed', pm: 'passed', user: 'pending' },
                  due: '2026-03-15', owner: 'Alex Chen', hasChildren: true, expanded: true,
                },
                {
                  id: 'f1', level: 'feature', title: 'AI Hub 对话界面',
                  progress: 100, coverage: 91, bugs: 0, risk: 'low',
                  agents: { claudeCode: 'active', cursor: 'contributed', copilot: 'not_used' },
                  accept: { unit: 'passed', internal: 'passed', dev: 'passed', pm: 'passed', user: 'passed' },
                  due: '2026-03-08', owner: 'Alex Chen',
                },
                {
                  id: 'f2', level: 'feature', title: 'Kanban Board',
                  progress: 88, coverage: 78, bugs: 2, risk: null,
                  agents: { claudeCode: 'contributed', cursor: 'idle', copilot: 'not_used' },
                  accept: { unit: 'passed', internal: 'passed', dev: 'passed', pm: 'waived', user: 'pending' },
                  due: '2026-03-15', owner: 'Sam Liu',
                },
                {
                  id: 'm2', level: 'milestone', title: 'Phase 2 · AI Integration',
                  progress: 41, coverage: 55, bugs: 6, risk: 'medium',
                  agents: { claudeCode: 'active', cursor: 'active', copilot: 'not_used' },
                  accept: { unit: 'in_progress', internal: 'pending', dev: 'pending', pm: 'pending', user: 'pending' },
                  due: '2026-04-20', owner: 'Alex Chen', hasChildren: true, expanded: false,
                },
                {
                  id: 'f5', level: 'feature', title: 'Agent Pipeline Engine',
                  progress: 35, coverage: 42, bugs: 4, risk: 'high',
                  agents: { claudeCode: 'active', cursor: 'idle', copilot: 'not_used' },
                  accept: { unit: 'in_progress', internal: 'pending', dev: 'pending', pm: 'pending', user: 'blocked' },
                  due: '2026-04-15', owner: 'Maria Lopez',
                },
              ]

              return (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: totalW }}>
                      <div className="flex items-center h-9 bg-muted/50 border-b border-border text-3xs font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 z-20">
                        <div className="sticky left-0 z-20 bg-muted/50 flex items-center px-3 border-r border-border/40 shrink-0" style={{ width: CW.name, minWidth: CW.name }}>
                          交付项目
                        </div>
                        <div style={{ width: CW.progress, minWidth: CW.progress }} className="shrink-0 px-2">进度</div>
                        <div style={{ width: CW.coverage, minWidth: CW.coverage }} className="shrink-0 flex items-center justify-center px-1">覆盖率</div>
                        <div style={{ width: CW.bugs, minWidth: CW.bugs }} className="shrink-0 flex items-center justify-center px-1">Bugs</div>
                        <div style={{ width: CW.risk, minWidth: CW.risk }} className="shrink-0 flex items-center justify-center px-1">风险</div>
                        {AGENT_KEYS.map((ak) => {
                          const ac = DS_AGENT[ak]
                          const AgentIcon = ac.icon
                          return (
                            <div key={ak} style={{ width: AGENT_WIDTHS[ak], minWidth: AGENT_WIDTHS[ak] }} className="shrink-0 flex flex-col items-center justify-center border-l border-border/30 gap-0.5 h-full px-1">
                              <AgentIcon className={cn('w-3 h-3', ac.color)} />
                              <span className="text-3xs">{ac.shortLabel}</span>
                            </div>
                          )
                        })}
                        {STAGE_COLS.map(({ key, label, icon: StageIcon, w }) => (
                          <div key={key} style={{ width: w, minWidth: w }} className="flex flex-col items-center justify-center border-l border-border/30 shrink-0 h-full gap-0.5 px-1">
                            <StageIcon className="w-3 h-3" />
                            <span className="text-3xs">{label}</span>
                          </div>
                        ))}
                        <div style={{ width: CW.due, minWidth: CW.due }} className="shrink-0 px-2 border-l border-border/30">截止日</div>
                        <div style={{ width: CW.owner, minWidth: CW.owner }} className="shrink-0 px-2 border-l border-border/30">负责人</div>
                      </div>

                      {rows.map((row) => {
                        const indent = DS_LEVEL_INDENT[row.level]
                        const LevelIcon = DS_LEVEL_ICON[row.level]
                        const pColor = row.progress === 100 ? 'bg-emerald-500' : row.progress >= 60 ? 'bg-blue-500' : row.progress >= 30 ? 'bg-amber-500' : 'bg-red-500'
                        return (
                          <div key={row.id} className={cn('flex items-center min-h-9 border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors', DS_LEVEL_STYLE[row.level])}>
                            <div
                              className="sticky left-0 z-10 bg-inherit flex items-center gap-1.5 shrink-0 border-r border-border/40"
                              style={{ width: CW.name, minWidth: CW.name, paddingLeft: 12 + indent, paddingRight: 12, paddingTop: 6, paddingBottom: 6 }}
                            >
                              <div className={cn('w-4 h-4 flex items-center justify-center rounded shrink-0 text-muted-foreground', !row.hasChildren && 'opacity-0 pointer-events-none')}>
                                {row.hasChildren && (row.expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
                              </div>
                              <LevelIcon className={cn('w-3.5 h-3.5 shrink-0', row.level === 'project' ? 'text-primary' : row.level === 'milestone' ? 'text-violet-500' : 'text-muted-foreground/60')} />
                              <span className="truncate">{row.title}</span>
                            </div>
                            <div style={{ width: CW.progress, minWidth: CW.progress }} className="shrink-0 px-2">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className={cn('h-full rounded-full transition-all', pColor)} style={{ width: `${row.progress}%` }} />
                                </div>
                                <span className="text-3xs tabular-nums text-muted-foreground w-7 text-right">{row.progress}%</span>
                              </div>
                            </div>
                            <div style={{ width: CW.coverage, minWidth: CW.coverage }} className="shrink-0 flex items-center justify-center">
                              {row.coverage != null
                                ? <span className={cn('text-xs font-mono font-medium', row.coverage >= 80 ? 'text-emerald-600' : row.coverage >= 60 ? 'text-amber-600' : 'text-red-600')}>{row.coverage}%</span>
                                : <span className="text-3xs text-muted-foreground/30">—</span>}
                            </div>
                            <div style={{ width: CW.bugs, minWidth: CW.bugs }} className="shrink-0 flex items-center justify-center">
                              {row.bugs > 0
                                ? <span className="inline-flex items-center gap-1 text-3xs px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 font-medium"><AlertTriangle className="w-2.5 h-2.5" />{row.bugs}</span>
                                : <span className="text-3xs text-muted-foreground/30">—</span>}
                            </div>
                            <div style={{ width: CW.risk, minWidth: CW.risk }} className="shrink-0 flex items-center justify-center">
                              {row.risk ? (() => { const rc = DS_RISK[row.risk]; const RI = rc.icon; return (
                                <span className={cn('inline-flex items-center gap-1 text-3xs px-1.5 py-0.5 rounded-full border font-medium', rc.bg, rc.color, rc.border)}>
                                  <RI className="w-2.5 h-2.5" />{rc.label}
                                </span>
                              ) })() : <span className="text-3xs text-muted-foreground/30">—</span>}
                            </div>
                            {AGENT_KEYS.map((ak) => {
                              const sCfg = DS_AGENT_STATUS[row.agents[ak]]
                              const AgentStatusIcon = sCfg.icon
                              return (
                                <div key={ak} style={{ width: AGENT_WIDTHS[ak], minWidth: AGENT_WIDTHS[ak] }} className="shrink-0 border-l border-border/20 h-full flex items-center justify-center py-2">
                                  <AgentStatusIcon className={cn('w-3.5 h-3.5', sCfg.cls)} />
                                </div>
                              )
                            })}
                            {STAGE_COLS.map(({ key, w }) => {
                              const status = row.accept[key] as DsAcceptStatus
                              const scfg = DS_STATUS[status]
                              const AccIcon = scfg.icon
                              return (
                                <div key={key} style={{ width: w, minWidth: w }} className="shrink-0 h-full flex items-center border-l border-border/30">
                                  <div className="w-full flex items-center justify-center py-2" title={scfg.label}>
                                    <AccIcon className={cn('w-3.5 h-3.5', scfg.cls, status === 'in_progress' && 'animate-spin')}
                                      style={status === 'in_progress' ? { animationDuration: '2s' } : undefined} />
                                  </div>
                                </div>
                              )
                            })}
                            <div style={{ width: CW.due, minWidth: CW.due }} className="shrink-0 px-2 border-l border-border/30">
                              <div className="flex items-center gap-1 text-2xs whitespace-nowrap text-muted-foreground">
                                <Clock className="w-3 h-3 shrink-0" />
                                {new Date(row.due).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                              </div>
                            </div>
                            <div style={{ width: CW.owner, minWidth: CW.owner }} className="shrink-0 px-2 text-2xs text-muted-foreground truncate border-l border-border/30">
                              {row.owner}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 bg-muted/20 border-t border-border text-3xs text-muted-foreground">
                    <span className="font-semibold">验收：</span>
                    {(['pending', 'in_progress', 'passed', 'failed', 'waived', 'blocked'] as DsAcceptStatus[]).map((s) => {
                      const c = DS_STATUS[s]
                      const LIcon = c.icon
                      return <span key={s} className="flex items-center gap-1"><LIcon className={cn('w-3 h-3', c.cls)} />{c.label}</span>
                    })}
                    <span className="ml-2 font-semibold">Agent：</span>
                    {(['active', 'idle', 'contributed', 'not_used'] as DsAgentStatus[]).map((s) => {
                      const c = DS_AGENT_STATUS[s]
                      const LIcon = c.icon
                      return <span key={s} className="flex items-center gap-1"><LIcon className={cn('w-3 h-3', c.cls)} />{c.label}</span>
                    })}
                  </div>
                </div>
              )
            })()}
          
    </>
  )
}

function GallerySec_doc_cards() {
  return (
    <>

            <SectionTitle>Document Cards</SectionTitle>
            <div className="space-y-4">
              <SubLabel>Grid view</SubLabel>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { title: 'API Specification v2.0', cat: 'API文档', Icon: Code2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', status: 'published', tags: ['REST', 'v2'], project: 'Ordo', updated: '2 days ago' },
                  { title: 'UI/UX Design Guidelines', cat: '设计文档', Icon: Palette, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/40', status: 'review', tags: ['Design'], project: 'Ordo', updated: '5 days ago' },
                  { title: 'Product Requirements', cat: '需求文档', Icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40', status: 'draft', tags: ['PRD'], project: 'ACR-Web', updated: '1 week ago' },
                ].map(({ title, cat, Icon, color, bg, status, tags, project, updated }) => {
                  const statusCls = status === 'published'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : status === 'review'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  return (
                    <div key={title} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-all cursor-pointer space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', bg)}>
                          <Icon className={cn('w-4 h-4', color)} />
                        </div>
                        <span className={cn('text-2xs font-medium px-1.5 py-0.5 rounded-md', statusCls)}>
                          {status === 'published' ? '已发布' : status === 'review' ? '审核中' : '草稿'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground line-clamp-2">{title}</p>
                        <p className={cn('text-3xs font-medium mt-1', color)}>{cat}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tags.map((t) => (
                          <span key={t} className="text-3xs px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-3xs text-muted-foreground pt-1 border-t border-border/50">
                        <span>{project}</span>
                        <span>{updated}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <SubLabel>List view row</SubLabel>
              <div className="rounded-lg border border-border overflow-hidden">
                {[
                  { title: 'API Specification v2.0', Icon: Code2, color: 'text-emerald-600', status: 'published', project: 'Ordo', author: 'AK', updated: '2 days ago' },
                  { title: 'UI/UX Design Guidelines', Icon: Palette, color: 'text-violet-600', status: 'review', project: 'Ordo', author: 'ML', updated: '5 days ago' },
                  { title: 'Product Requirements Doc', Icon: FileText, color: 'text-blue-600', status: 'draft', project: 'ACR-Web', author: 'BK', updated: '1 week ago' },
                ].map(({ title, Icon, color, status, project, author, updated }) => {
                  const statusCls = status === 'published'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : status === 'review'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  return (
                    <div key={title} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 border-b last:border-0 border-border/50 transition-colors cursor-pointer">
                      <Icon className={cn('w-4 h-4 shrink-0', color)} />
                      <span className="flex-1 text-sm font-medium text-foreground truncate">{title}</span>
                      <span className={cn('text-3xs px-1.5 py-0.5 rounded shrink-0', statusCls)}>
                        {status === 'published' ? '已发布' : status === 'review' ? '审核中' : '草稿'}
                      </span>
                      <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">{project}</span>
                      <AssigneeAvatar initials={author} />
                      <span className="text-3xs text-muted-foreground w-20 shrink-0 text-right">{updated}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          
    </>
  )
}

function GallerySec_command() {
  return (
    <>

            <SectionTitle>Command Palette</SectionTitle>
            <SubLabel>coss ui p-command 配方（base-ui autocomplete 引擎，components/ui/command）—— 全局面板同源，⌘K / Ctrl+K 唤起真实面板</SubLabel>
            <CommandPaletteDemo />
          
    </>
  )
}

function GallerySec_page_layout() {
  return (
    <>

            <SectionTitle>Page Layout Components</SectionTitle>
            <div className="space-y-4">
              <SubLabel>PageShell + PageHeader + SectionCard + DataTableShell</SubLabel>
              <div className="rounded-xl border border-border overflow-hidden">
                <PageShell className="bg-background">
                  <PageHeader
                    title="Projects"
                    favorites={<FavoriteToggle label={nodeToText("Projects").trim()} />}
                    icon={FolderKanban}
                    metrics={[{ id: 'projects', label: 'Projects', value: 12 }]}
                    actions={<HeaderActionButton icon={Plus} label="New Project" />}
                  />
                  <div className="p-4 space-y-4">
                    <SectionCard
                      title="Overview"
                      description="Project health summary"
                      actions={<Badge variant="outline">v2.0</Badge>}
                    >
                      <p className="text-sm text-muted-foreground">
                        SectionCard combines Card primitives with a header, description and action slot.
                      </p>
                    </SectionCard>
                    <DataTableShell className="p-4">
                      <p className="text-sm text-muted-foreground">
                        DataTableShell wraps data tables in a bordered, rounded container.
                      </p>
                    </DataTableShell>
                  </div>
                </PageShell>
              </div>

              <SubLabel>RightSidebar — 详情右栏容器（360px 全站唯一档，收起不占位）+ SidebarButtonGroup / SidebarButton</SubLabel>
              <div className="flex h-44 overflow-hidden rounded-lg border border-border">
                <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">Main content area</div>
                <RightSidebar className="h-full">
                  <SidebarButtonGroup>
                    <SidebarButton icon={PanelRight} label="Panels" />
                    <SidebarButton icon={User} label="Assignee" />
                    <SidebarButton icon={Sparkles} label="Ask AI" variant="capsule" />
                  </SidebarButtonGroup>
                  <p className="text-xs text-muted-foreground">Sidebar content — buttons fixed in one row.</p>
                </RightSidebar>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_sidebar_panel() {
  return (
    <>

            <SectionTitle>Sidebar Panel</SectionTitle>
            <p className="text-xs text-muted-foreground mb-4">
              右侧栏统一折叠面板：展开圆角矩形 ↔ 收起紧凑胶囊，grid-rows 动画；支持受控与不受控。
            </p>
            <div className="max-w-sm space-y-3">
              <SidebarPanel title="Properties" icon={<SlidersHorizontal className="size-3.5" />} iconClassName="text-accent-blue">
                <p className="px-1 py-1 text-xs text-muted-foreground">Expand / collapse via the chevron.</p>
              </SidebarPanel>
              <SidebarPanel title="Collapsed by default" defaultCollapsed>
                <p className="px-1 py-1 text-xs text-muted-foreground">Compact pill while collapsed.</p>
              </SidebarPanel>
            </div>
          
    </>
  )
}

function GallerySec_detail_section() {
  return (
    <>

            <SectionTitle>Detail Section</SectionTitle>
            <p className="text-xs text-muted-foreground mb-4">
              详情页主栏统一「可收缩分区」平铺件（与 SidebarPanel 同构不同形：无卡底）：分区头
              icon + uppercase 小标题（text-xs）+ 计数 + action 槽 + 内置收缩三角，grid-rows 动画；
              collapsible=false 供描述区等常开分区。
            </p>
            <div className="max-w-2xl space-y-1">
              <DetailSection
                icon={<ListChecks className="size-3.5" />}
                title="Subtasks"
                count="2/5"
              >
                <p className="pb-2 text-xs text-muted-foreground">Collapsible section content.</p>
              </DetailSection>
              <DetailSection
                icon={<AlignLeft className="size-3.5" />}
                title="Description"
                collapsible={false}
                headerClassName="px-6 pt-4 pb-2"
                contentClassName="px-6 pb-4"
                action={<Badge variant="outline">action</Badge>}
              >
                <p className="text-xs text-muted-foreground">Non-collapsible variant (description-style section).</p>
              </DetailSection>
            </div>
          
    </>
  )
}

function GallerySec_detail_page_frame() {
  return (
    <>

            <SectionTitle>Detail Page Frame</SectionTitle>
            <p className="text-xs text-muted-foreground mb-4">
              L2 详情页双栏母版（§20.2）：SubPageToolbar 槽（sidebar 二态内聚下发）+ 主栏自滚动
              居中宽档（L1 总表分发）+ RightSidebar；受控/非受控双模。task/bug/member/team 四详情页消费。
            </p>
            <div className="flex h-44 overflow-hidden rounded-lg border border-border">
              <DetailPageFrame
                aiPage="design-system.preview"
                toolbar={({ sidebar }) => (
                  <button
                    type="button"
                    className="border-b px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                    onClick={sidebar.onToggle}
                  >
                    toolbar slot · sidebar {sidebar.open ? 'open' : 'closed'}
                  </button>
                )}
                main={<div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">Main（reading 档居中）</div>}
                aside={<div className="p-3 text-xs text-muted-foreground">Aside content</div>}
              />
            </div>
          
    </>
  )
}

function GallerySec_stat_cards() {
  return (
    <>

            <SectionTitle>Stat Cards</SectionTitle>
            <div className="space-y-5">
              <div>
                <SubLabel>StatsCard · compact（标准形态，原 ui/stats-card）</SubLabel>
                <StatsCard
                  columns={4}
                  items={[
                    { key: 'tasks', value: 248, label: 'Tasks', icon: CheckSquare, tone: 'blue' },
                    { key: 'bugs', value: 13, label: 'Open Bugs', icon: AlertCircle, tone: 'red' },
                    { key: 'milestones', value: '4/6', label: 'Milestones', icon: Star, tone: 'yellow' },
                    { key: 'ai', value: '1.2k', label: 'AI Runs', icon: Sparkles, tone: 'purple' },
                  ]}
                />
              </div>
              <div>
                <SubLabel>StatsCard · featured（摘要大卡变种，原 ui/stat-card 收编）</SubLabel>
                <StatsCard
                  layout="featured"
                  columns={3}
                  items={[
                    { key: 'total', value: 248, label: 'Total Tasks', hint: 'Across all projects', icon: CheckSquare, tone: 'green' },
                    { key: 'bugs', value: 13, label: 'Open Bugs', hint: 'Needs triage', icon: AlertCircle, tone: 'red' },
                    { key: 'ai', value: '1.2k', label: 'AI Executions', hint: 'This quarter', icon: Sparkles, tone: 'purple' },
                  ]}
                />
              </div>
              <div>
                <SubLabel>StatsCard · muted 卡底 + 数值彩色（coloredValue）</SubLabel>
                <StatsCard
                  columns={4}
                  items={[
                    { key: 'progress', value: '82%', label: 'Avg Progress', surface: 'muted' },
                    { key: 'done', value: '91%', label: 'Done Rate', tone: 'green', coloredValue: true, surface: 'muted' },
                    { key: 'overdue', value: 7, label: 'Overdue', tone: 'red', coloredValue: true, surface: 'muted' },
                    { key: 'cost', value: '$128.40', label: 'Cost', tone: 'purple', coloredValue: true },
                  ]}
                />
              </div>
              <div>
                <SubLabel>IconMetric</SubLabel>
                <div className="flex gap-3">
                  <IconMetric icon={<Sparkles className="w-4 h-4" />} label="AI Executions" value="1.2k" />
                  <IconMetric icon={<GitBranch className="w-4 h-4" />} label="Repositories" value="12" />
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_loading_states() {
  return (
    <>

            <SectionTitle>Loading &amp; Empty States</SectionTitle>
            <div className="space-y-5">
              <div>
                <SubLabel>LoadingOverlay — inline mode</SubLabel>
                <div className="rounded-lg border border-border bg-muted/10 p-6">
                  <LoadingOverlay visible mode="inline" message="Loading data..." description="Fetching latest results" />
                </div>
              </div>
              <div>
                <SubLabel>AsyncState（emptyVariant / emptyVisual 透传：page 空态走插画）</SubLabel>
                <div className="space-y-3">
                  <AsyncState isLoading>
                    <p className="text-sm text-muted-foreground">Loaded content</p>
                  </AsyncState>
                  <AsyncState isEmpty emptyTitle="No tasks yet" emptyDescription="Create a task to get started">
                    <p className="text-sm text-muted-foreground">Loaded content</p>
                  </AsyncState>
                  <AsyncState
                    isEmpty
                    emptyVariant="page"
                    emptyTitle="No documents"
                    emptyVisual={
                      <IconStack aria-hidden="true" className="text-primary">
                        <FileText className="size-4 text-primary" />
                      </IconStack>
                    }
                  >
                    <p className="text-sm text-muted-foreground">Loaded content</p>
                  </AsyncState>
                  <AsyncState error="Failed to load data" onRetry={() => {}}>
                    <p className="text-sm text-muted-foreground">Loaded content</p>
                  </AsyncState>
                </div>
              </div>
              <div>
                <SubLabel>EmptyState — In-Card（默认 card）</SubLabel>
                <EmptyState
                  icon={FileText}
                  title="No documents found"
                  description="Start building your knowledge base"
                  action={<Button size="sm"><Plus /> New Document</Button>}
                />
              </div>
              <div>
                <SubLabel>EmptyState — Filter Results（筛选无结果 + 清筛选）</SubLabel>
                <div className="rounded-lg border border-border/60 bg-card p-2">
                  <EmptyState
                    icon={Search}
                    title="No matching items"
                    description="Try adjusting your search query or clearing the filters."
                    action={<Button size="sm" variant="outline">Clear filters</Button>}
                  />
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_assembly_primitives() {
  return (
    <>

            <SectionTitle>Assembly Primitives</SectionTitle>
            <p className="text-xs text-muted-foreground">
              页面装配原语（宪法 §10.2）：DataList 列表原语、PropertyRow / PropsCard 属性面板原语。新页面必须由装配原语 + ui 基础组件构成。
            </p>
            <div className="space-y-5">
              <div>
                <SubLabel>DataList</SubLabel>
                <div className="rounded-lg border border-border">
                  <DataList
                    items={[
                      { id: 'demo-1' },
                      { id: 'demo-2' },
                      { id: 'demo-3' },
                    ]}
                    renderLeading={(item) => (
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">List row {item.id.slice(-1)}</p>
                        <p className="truncate text-xs text-muted-foreground">Secondary metadata line</p>
                      </div>
                    )}
                    renderTrailing={() => (
                      <StatusPill tone="success">Done</StatusPill>
                    )}
                    onItemClick={() => {}}
                  />
                </div>
              </div>
              <div>
                <SubLabel>PropertyRow + PropsCard</SubLabel>
                <div className="max-w-sm rounded-lg border border-border p-2">
                  <PropsCard title="Properties" collapsed={false} onToggleCollapse={() => {}}>
                    <PropertyRow icon={<Sparkles className="w-3.5 h-3.5" />} label="AI assignee">
                      <span className="text-xs text-foreground">Unassigned</span>
                    </PropertyRow>
                    <PropertyRow icon={<GitBranch className="w-3.5 h-3.5" />} label="Repository">
                      <span className="text-xs text-foreground">ordo</span>
                    </PropertyRow>
                    <PropertyRow icon={<Plus className="w-3.5 h-3.5" />} label="Estimate">
                      <span className="text-xs text-foreground">3h</span>
                    </PropertyRow>
                  </PropsCard>
                </div>
              </div>
            </div>
          
    </>
  )
}

function GallerySec_workflow_run_timeline() {
  return (
    <>

            <SectionTitle>Workflow Run Timeline</SectionTitle>
            <p className="text-xs text-muted-foreground mb-4">
              workflow v2 运行阶段时间线（modules/workflow，ZCode 工作流卡复刻）：站=根层节点（状态灯 done 绿 / failed 红 / running 黄脉冲 / pending 空心 + settled/total 计数徽标 + loop 轮数），站下执行药丸列（类型色瓦片 + 尾部状态图标）。未执行站回填静态模板药丸（灰态）。消费方：workflow 详情页运行面板 / v2 静态预览卡。
            </p>
            <div className="space-y-8">
              <div>
                <SubLabel>静态预览态 — 未执行站回填模板药丸（workflow 详情页默认态）</SubLabel>
                <WorkflowRunTimeline stations={WORKFLOW_TIMELINE_STATIC} />
              </div>
              <div>
                <SubLabel>运行态 — 混合状态（done / failed / running / pending + loop 轮数）</SubLabel>
                <WorkflowRunTimeline stations={WORKFLOW_TIMELINE_RUNNING} />
              </div>
            </div>
          
    </>
  )
}

function GallerySec_ai_density_cards() {
  return (
    <>

            <SectionTitle>AI High-Density Cards [AI]</SectionTitle>
            <p className="text-xs text-muted-foreground mb-4">
              AI 执行面高信息密度卡片矩阵（DESIGN.md §6.1）：承载复杂多样化执行状态、推理链、工件交接、冷却门禁与双轨成本。
            </p>

            <div className="space-y-6">
              {/* ② 工具与命令执行胶囊 (AssistantToolCard) */}
              <div>
                <SubLabel>② 工具与命令执行胶囊 (AssistantToolCard) — 单行折叠 · 动词×实体 · 结果常显</SubLabel>
                <div className="space-y-2 max-w-xl">
                  <AssistantToolCard
                    part={{
                      type: 'tool-call',
                      toolName: 'update_task',
                      state: 'output-available',
                      input: { taskId: 'ISSUE-104', priority: 'high', status: 'in_progress' },
                      output: {
                        taskId: 'ISSUE-104',
                        title: '重构 Design System 紧凑型卡片',
                        status: 'in_progress',
                      },
                    }}
                  />
                  <AssistantToolCard
                    part={{
                      type: 'tool-call',
                      toolName: 'list_project_tasks',
                      state: 'output-available',
                      input: { projectId: 'p-core', limit: 10 },
                      output: {
                        count: 8,
                        samples: [
                          'ISSUE-101: 优化暗色模式色阶对比度',
                          'ISSUE-102: 修复 PopoverTrigger 双嵌套',
                          'ISSUE-103: 接入 DualTrackMetricPill',
                        ],
                      },
                    }}
                  />
                </div>
              </div>

              {/* ③ 多 Agent 协作交接卡 (AgentHandoffCard) */}
              <div>
                <SubLabel>③ 多 Agent 协作交接卡 (AgentHandoffCard) — 跨角色流转 · 显式契约门禁</SubLabel>
                <div className="max-w-xl">
                  <AgentHandoffCard
                    fromAgent={{ name: 'Alice PM', role: '需求主管' }}
                    toAgent={{ name: 'Claude Coder', role: '全栈执行 Agent' }}
                    artifact={{
                      title: 'DESIGN.md - Ordo 全局设计系统规范 v2.0',
                      type: 'Architecture Spec',
                    }}
                    description="完成低饱和多色色阶、外舒内紧卡片、多端 13px/14px 双层字阶与动效白名单制定，请按清单完成卡片收口。"
                    gates={[
                      { id: 'g1', label: '契约绑定', status: 'passed' },
                      { id: 'g2', label: '测试覆盖', status: 'passed' },
                      { id: 'g3', label: '破坏性拦截', status: 'pending' },
                    ]}
                    metrics={{ tokens: 4280, durationMs: 2400, costUsd: 0.0064 }}
                  />
                </div>
              </div>

              {/* ④ 决策证据抽屉卡 (DecisionCardShell) */}
              <div>
                <SubLabel>④ 决策证据抽屉卡 (DecisionCardShell) — 证据强制 · 3s 冷却门禁 · 1~4 快捷键</SubLabel>
                <div className="max-w-xl">
                  <DecisionCardShell
                    decision={{
                      id: 'dec-ds-01',
                      kind: 'approval',
                      sourceId: 'dec-ds-01',
                      status: 'pending',
                      urgency: 'blocking',
                      riskLevel: 'high_risk',
                      title: '执行破坏性样式重构：全面清理 276 处非语义裸色与废弃伪组件',
                      proposer: { type: 'ai_agent', name: 'Design Architect Agent' },
                      createdAt: new Date().toISOString(),
                      payload: { affectedFiles: 14, tokensChanged: 28, deletedLines: 120 },
                    }}
                    requireEvidence={true}
                    cooldownSecs={3}
                    impact={[
                      { label: '波及组件', value: '18 个', tone: 'orange', icon: Sparkles },
                      { label: '预估耗时', value: '5 分钟', tone: 'blue', icon: Clock },
                      { label: '回滚策略', value: 'Git 分支保护', tone: 'green', icon: CheckCircle2 },
                    ]}
                    evidence={
                      <div className="space-y-1 font-mono text-2xs text-content-text-muted bg-content-bg-secondary p-2 rounded">
                        <p className="text-accent-green">+ 引入 5 组低饱和多色色阶 (--accent-blue/green/amber/crimson/violet)</p>
                        <p className="text-accent-red">- 移除 276 处 text-orange-500, bg-blue-50 等硬编码裸色</p>
                        <p className="text-accent-blue">• 统一 Card 内边距为 p-3.5，CardTitle 设为 text-base font-semibold</p>
                      </div>
                    }
                    onAction={(act) => toast.info(`触发决议动作: ${act}`)}
                  />
                </div>
              </div>

              {/* ⑤ 双轨成本微徽章 (DualTrackMetricPill) */}
              <div>
                <SubLabel>⑤ 双轨成本与执行微徽章 (DualTrackMetricPill) — 11px Mono · 低调角落常驻</SubLabel>
                <div className="flex flex-wrap items-center gap-3">
                  <DualTrackMetricPill
                    tokens={3420}
                    durationMs={1820}
                    costUsd={0.0051}
                    model="Claude 3.7 Sonnet"
                  />
                  <DualTrackMetricPill
                    tokens={12400}
                    durationMs={4500}
                    costUsd={0.0186}
                  />
                  <DualTrackMetricPill
                    durationMs={620}
                    model="Gemini 2.5 Flash"
                  />
                </div>
              </div>

              <div>
                <SubLabel>AiAgentBadge — AI 执行者徽标（sm/md 双档，可携带执行者名）</SubLabel>
                <div className="flex items-center gap-3">
                  <AiAgentBadge />
                  <AiAgentBadge agentName="Claude" />
                  <AiAgentBadge agentName="Codex" size="md" />
                </div>
              </div>

              <div>
                <SubLabel>AiContextSummary — 项目 AI 上下文摘要（chips + meta + health 进度）</SubLabel>
                <div className="max-w-md rounded-lg border border-border bg-background p-3">
                  <AiContextSummary
                    context={{
                      techStack: ['React 19', 'NestJS', 'Prisma'],
                      frameworks: ['Vite', 'Turbo'],
                      lifecyclePhase: 'growth',
                      complexityLevel: 'high',
                      teamSizeCategory: 'small',
                      healthScore: 86,
                    }}
                  />
                </div>
              </div>
            </div>
          
    </>
  )
}


function GallerySec_form_dialog() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
              <div>
                <SubLabel>FormDialog — 标准化实体创建/编辑对话框（RHF+Zod+提交态+脏确认一次封死；§10.8 default 档）</SubLabel>
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-3 text-xs text-content-text-muted">
                    消费方只声明 schema / defaultValues / onSubmit / fields(render prop)，不再手写骨架。
                    点按钮打开体验：Zod 校验（onBlur + 提交）、提交中内联 Spinner、脏表单关闭确认。
                  </p>
                  <Button size="sm" onClick={() => setOpen(true)}>打开示例表单</Button>
                  <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title="创建示例实体"
                    description="标准化骨架演示：名称必填、备注选填"
                    schema={z.object({ name: z.string().min(1, '请输入名称'), note: z.string().optional() })}
                    defaultValues={{ name: '', note: '' }}
                    onSubmit={async () => { await new Promise((r) => setTimeout(r, 600)) }}
                    submitLabel="创建"
                    fields={(form) => (
                      <>
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>名称</FormLabel>
                              <FormControl><Input placeholder="实体名称" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="note"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>备注</FormLabel>
                              <FormControl><Input placeholder="选填" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  />
                </div>
              </div>
    </>
  )
}

function GallerySec_semantic_components() {
  return (
    <>

            <SectionTitle>语义组件 (Semantic)</SectionTitle>
            <p className="text-xs text-muted-foreground mb-4">
              G 类分层解耦的语义组件层（src/components/semantic/，今后新增组件的默认落点）。
              现有六件：Chip（批 G1 示范）、NavStatusDot、ThemeModeCard、ChartCard / StatTile / MetricRow（批二三件）。
              三件均 props 面封闭——不接 className / variant，判例见 semantic/README.md；
              raw 原语按裁决 G6 不出画廊（registry internal 态）。
              画廊分区已按组件类型分组（2026-09-29 重组：正文物理序未动，物理搬移登记为后续独立批）。
              2026-10-03 起语义组件逐件注册侧边栏：各 demo 子段嵌套独立锚点，左侧 Semantic 组直达单件；
              其余语义件的锚点分布在 settings-patterns / task-atoms 等块内（组内可达，物理位不动）。
            </p>
            <SectionAnchor id="chip"><GallerySec_chip /></SectionAnchor>
            <SectionAnchor id="nav-status-dot"><GallerySec_nav_status_dot /></SectionAnchor>
            <SectionAnchor id="theme-mode-card"><GallerySec_theme_mode_card /></SectionAnchor>
            <SectionAnchor id="chart-card"><GallerySec_chart_card /></SectionAnchor>
            <SectionAnchor id="stat-tile"><GallerySec_stat_tile /></SectionAnchor>
            <SectionAnchor id="metric-row"><GallerySec_metric_row /></SectionAnchor>
            <SectionAnchor id="chart-legend-grid"><GallerySec_chart_legend_grid /></SectionAnchor>
            <SectionAnchor id="donut-chart"><GallerySec_donut_chart /></SectionAnchor>
            <SectionAnchor id="proportion-bar"><GallerySec_proportion_bar /></SectionAnchor>
            <SectionAnchor id="form-dialog"><GallerySec_form_dialog /></SectionAnchor>
          
    </>
  )
}

function GallerySec_chip() {
  return (
    <>

            <div className="mb-4">
              <SubLabel>Chip — 标签 / 胶囊 / 可关闭标签</SubLabel>
              <div className="flex flex-wrap items-center gap-2">
                <Chip>默认标签</Chip>
                <Chip shape="soft">soft 标签</Chip>
                <Chip tone="danger" onRemove={() => {}}>
                  驳回原因（悬停转红）
                </Chip>
                <Chip tone="primary" onClick={() => {}}>
                  <Plus className="size-3" /> Add tag
                </Chip>
                <Chip onRemove={() => {}} icon={<GitBranch className="size-3" />}>
                  带图标
                </Chip>
                <Chip onClick={() => {}} disabled>
                  禁用态
                </Chip>
              </div>
            </div>
            
    </>
  )
}

function GallerySec_nav_status_dot() {
  return (
    <>

            <div className="mb-4">
              <SubLabel>NavStatusDot — 导航条目状态点（8px）</SubLabel>
              <div className="mb-2 flex flex-wrap items-center gap-x-6 gap-y-3">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <NavStatusDot tone="success" label="就绪" />
                  success — 就绪
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <NavStatusDot tone="danger" label="不可用" />
                  danger — 不可用 · 需处理
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <NavStatusDot tone="default" label="无人在线" />
                  default — 中性（未接入 / 无人在线）
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <NavStatusDot tone="default" label="检查中" loading />
                  loading — 检查中（ping 动画）
                </span>
              </div>
              <p className="text-2xs text-muted-foreground/70">
                三个 props（tone / label / loading）封闭，不接 className；label 必填，同时作
                aria-label 与 title——§8.5#4 要求颜色之外必须有第二信号。status → tone 由业务层
                负责（§19.5 上层），本件只做 tone → class。
              </p>
            </div>
            
    </>
  )
}

function GallerySec_theme_mode_card() {
  return (
    <>

            <div className="mb-4">
              <SubLabel>ThemeModeCard — 主题模式卡片（日间 / 夜间 / 跟随系统）</SubLabel>
              {/* 静态陈列：本组件不碰 i18n 也不依赖 ThemeProvider，文案由调用方注入 */}
              <div className="mb-2 max-w-3xl">
                <ThemeModeCard
                  value="system"
                  onChange={() => {}}
                  title="主题模式"
                  options={{
                    light: { label: '浅色模式', desc: '清爽明亮，适合白天使用' },
                    dark: { label: '深色模式', desc: '柔和护眼，适合夜间使用' },
                    system: { label: '跟随系统', desc: '自动匹配系统的外观设置' },
                  }}
                />
              </div>
              <p className="text-2xs text-muted-foreground/70">
                选中「跟随系统」态（✓ 徽标落在第三档）。预览缩略图用字面色（bg-white / bg-zinc-950）
                而非 token——预览要展示「那个主题长什么样」，随当前主题走就失真；该豁免单列登记
                宪法附录 A.1 行 A8 + check-palette.mjs 同名谓词（成对改动），行内已声明该谓词是
                整文件粒度、顺带覆盖了选中徽标的 text-white（**登记在案的越界，非已批准设计**）。
                每档为 RawButton + aria-pressed；选中态除色环外还有 ✓ 徽标与 aria-pressed 两个
                非颜色信号（§8.5#4）。
              </p>
            </div>
            
    </>
  )
}

function GallerySec_chart_card() {
  return (
    <>

            <div className="mb-4">
              <SubLabel>ChartCard — 图表卡壳（定高图表容器）</SubLabel>
              <div className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                <ChartCard title="迭代燃尽" hint="近 7 天" height="md">
                  <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                    图表区（children 自组，md = h-40）
                  </div>
                </ChartCard>
                <ChartCard
                  title="任务分布"
                  action={
                    <Chip shape="soft" onClick={() => {}}>
                      周报
                    </Chip>
                  }
                  height="sm"
                >
                  <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                    图表区（children 自组，sm = h-30）
                  </div>
                </ChartCard>
              </div>
              <p className="text-2xs text-muted-foreground/70">
                卡壳 = ui/card + CardTitle(text-sm) 基线，卡头左标题右 hint/action，children 容器
                按 height 档定高（sm=h-30 / md=h-40 / lg=h-56，映射自现用图表容器实测值）；
                图表实现留 children，内部用 h-full 填充。
              </p>
            </div>
            
    </>
  )
}

function GallerySec_stat_tile() {
  return (
    <>

            <div className="mb-4">
              <SubLabel>StatTile — mini 统计块</SubLabel>
              <div className="mb-2 grid max-w-2xl grid-cols-3 gap-3">
                <StatTile label="成员总数" value={12} />
                <StatTile
                  label="AI 会话"
                  value={<span className="text-accent-purple">{48}</span>}
                />
                <StatTile
                  label="平均负载"
                  value="64%"
                  icon={<Activity className="size-3.5" />}
                  hint="近 7 天均值"
                />
              </div>
              <p className="text-2xs text-muted-foreground/70">
                形态照抄 dashboard 下钻弹窗原本地 StatTile（bg-muted/50 + text-2xl 值）；
                值语义色不设样式口子，由调用方包 span 注入（第二例 accent-purple）。
              </p>
            </div>
            
    </>
  )
}

function GallerySec_metric_row() {
  return (
    <>

            <div className="mb-4">
              <SubLabel>MetricRow — 标签 + 进度条 + 数值行</SubLabel>
              <div className="mb-2 max-w-xl space-y-2.5">
                <MetricRow label="档案完备度" value={72} tone="blue" />
                <MetricRow label="验收通过率" value={58} max={100} tone="green" />
                <MetricRow
                  value={85}
                  tone="red"
                  icon={<span className="size-2.5 shrink-0 rounded-full bg-accent-red" />}
                  trailing={<span className="text-3xs text-muted-foreground">9/20 槽位</span>}
                />
              </div>
              <p className="text-2xs text-muted-foreground/70">
                value/max 换算为百分数（max 默认 100），tone 走 ui/progress indicator
                既有色档选择器；label 可选（表格进度列形态），trailing 放原文案附加。
              </p>
            </div>
            
    </>
  )
}

function GallerySec_chart_legend_grid() {
  return (
    <>

            <div className="mb-4">
              <SubLabel>ChartLegendGrid — 图表图例网格（色点 + 标签 + 数值 + 占比）</SubLabel>
              <div className="mb-2 grid max-w-2xl gap-3 md:grid-cols-2">
                <ChartLegendGrid
                  columns={1}
                  items={[
                    { key: 'a', label: 'System Prompt', color: SERIES_COLORS[0], value: '47.4k', percentage: '18%' },
                    { key: 'b', label: 'Tool Results', color: SERIES_COLORS[1], value: '≈1.8M', percentage: '68%' },
                    { key: 'c', label: 'Assistant Messages', color: SERIES_COLORS[2], value: '≈355k', percentage: '13%' },
                    { key: 'd', label: 'Output', color: SERIES_COLORS[3], value: '15.6k', percentage: '1%' },
                  ]}
                />
                <ChartLegendGrid
                  columns={2}
                  items={[
                    { key: 'a', label: '已完成', color: SERIES_COLORS[0], value: '32', percentage: '64%' },
                    { key: 'b', label: '进行中', color: SERIES_COLORS[1], value: '10', percentage: '20%' },
                    { key: 'c', label: '待评审', color: SERIES_COLORS[2], value: '5', percentage: '10%' },
                    { key: 'd', label: '待办', color: SERIES_COLORS[3], value: '3', percentage: '6%' },
                  ]}
                />
              </div>
              <p className="text-2xs text-muted-foreground/70">
                donut-chart / proportion-bar 内建消费，也可独立用于分段着色图；色值只收语义
                token 引用（SERIES_COLORS = --chart-1..5，§17.2 序列顺序即色序），禁字面色；
                列数 1/2/3 封闭档。
              </p>
            </div>
            
    </>
  )
}

function GallerySec_donut_chart() {
  return (
    <>

            <div className="mb-4">
              <SubLabel>DonutChart — 环形占比图（中心总计 + 图例网格）</SubLabel>
              <div className="mb-2 grid max-w-3xl gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <DonutChart
                    size="md"
                    totalLabel="合计"
                    ariaLabel="各系列占比环形图"
                    items={[
                      { key: 'tools', label: 'Tool Results', value: 1_800_000 },
                      { key: 'assistant', label: 'Assistant Messages', value: 355_000 },
                      { key: 'system', label: 'System Prompt', value: 47_400 },
                      { key: 'schema', label: 'Tool Schemas', value: 21_600 },
                    ]}
                  />
                </div>
                <div className="rounded-lg border border-border p-4">
                  <DonutChart
                    size="sm"
                    legendColumns={1}
                    total="$13.91"
                    totalLabel="30 天合计"
                    formatValue={(v) => `$${v.toFixed(2)}`}
                    ariaLabel="各模型支出构成"
                    items={[
                      { key: 'claude', label: 'claude-code', value: 13.91 },
                      { key: 'deepseek', label: 'deepseek', value: 0.11 },
                    ]}
                  />
                </div>
              </div>
              <p className="text-2xs text-muted-foreground/70">
                recharts Pie 走 ui/chart 唯一封装（§17.1），环心叠放总计（total 缺省 = 合计走
                formatValue）；环径 sm=size-28 / md=size-40；合计为 0 时渲染 empty 槽位
                （§17.5 禁空白坐标系），不留样式透传口子（G8）。
              </p>
            </div>
            
    </>
  )
}

function GallerySec_proportion_bar() {
  return (
    <>

            <div className="mb-4">
              <SubLabel>ProportionBar — 分段比例条（斜纹余量 + 图例网格）</SubLabel>
              <div className="mb-2 max-w-2xl space-y-6">
                <ProportionBar
                  ariaLabel="工单按优先级的占比构成"
                  segments={[
                    { key: 'urgent', label: 'Urgent', value: 120 },
                    { key: 'high', label: 'High', value: 340 },
                    { key: 'medium', label: 'Medium', value: 860 },
                    { key: 'low', label: 'Low', value: 480 },
                  ]}
                  total={2400}
                />
                <ProportionBar
                  legendColumns={1}
                  ariaLabel="模型支出构成条"
                  formatValue={(v) => `$${v.toFixed(2)}`}
                  segments={[
                    { key: 'claude', label: 'claude-code', value: 13.91 },
                    { key: 'deepseek', label: 'deepseek', value: 0.11 },
                  ]}
                />
              </div>
              <p className="text-2xs text-muted-foreground/70">
                各段按占比拼接，total 大于各段合计时余量以斜纹呈现（repeating-linear-gradient
                + border token，无字面色）；纯 div 实现不进坐标系，段色序走 SERIES_COLORS；
                总量为 0 时渲染 empty 槽位。
              </p>
            </div>
            
    </>
  )
}

function GallerySec_registry_audit() {
  return (
    <>

            <SectionTitle>Registry 对账区（Registry Audit）</SectionTitle>
            <p className="text-xs text-muted-foreground mb-4">
              按 COMPONENT_REGISTRY 遍历生成（H 类批 H3）：画廊覆盖率门禁（check-component-registry §4.2 ④，
              ui + semantic 双层、排除 internal 与 galleryExempt）的实机对账面——豁免账在此可见；
              未收录缺口由门禁机器强制（缺失即 CI 红），常态应为零。
            </p>
            <RegistryAuditTable />
          
    </>
  )
}

// ── 账本 B1-B6 + A3 demo 补录（2026-10-27 重建）─────────────────────────────
// 原 demo 随巨型单页的未提交改动丢失，按组件 props 契约与 registry aiNotes 重写；
// 演示造数仅存在于画廊（§9：生产消费方禁造假数据）。组件 import 即画廊覆盖证明（门禁口径）。
import { ApprovalCard } from '@/components/semantic/approval-card'
import { AutonomyDial } from '@/components/semantic/autonomy-dial'
import type { AutonomyLevel } from '@/components/semantic/autonomy-dial'
import { ContextUsage } from '@/components/semantic/context-usage'
import { CostFigure } from '@/components/semantic/cost-figure'
import { FileTypeIcon } from '@/components/semantic/file-type-icon'
import { ArtifactSourceBadge } from '@/components/semantic/artifact-source-badge'
import { ExecTree } from '@/components/semantic/exec-tree'
import type { ExecTreeNode } from '@/components/semantic/exec-tree'
import { InlineDiff } from '@/components/semantic/inline-diff'

const EXEC_TREE_DEMO_NODE: ExecTreeNode = {
  id: 'demo-orchestrator',
  name: 'Orchestrator',
  task: '重写登录模块的校验层',
  status: 'running',
  cost: 0.41,
  tokens: 132_000,
  startedAt: Date.now() - 150_000,
  children: [
    { id: 'demo-researcher', name: 'Researcher', task: '盘点现有登录实现与依赖', status: 'done', cost: 0.22, tokens: 74_000, startedAt: Date.now() - 90_000, endedAt: Date.now() - 40_000 },
    { id: 'demo-writer', name: 'Writer', task: '实现新登录表单与校验', status: 'failed', cost: 0.09, tokens: 31_000, startedAt: Date.now() - 40_000, endedAt: Date.now() - 18_000, error: "TypeError: Cannot read properties of undefined (reading 'schema')\n    at validate (src/auth/validate.ts:42:11)", children: [
      { id: 'demo-writer-retry', name: 'Writer (retry)', task: '修复 schema 引用后重跑', status: 'running', cost: 0.05, tokens: 18_000, startedAt: Date.now() - 8_000 },
    ] },
    { id: 'demo-scanner', name: 'Scanner', task: '待调度的回归扫描', status: 'queued' },
    { id: 'demo-deployer', name: 'Deployer', task: '被人工叫停的发布步骤', status: 'stopped' },
    { id: 'demo-reviewer', name: 'Reviewer', task: '验收新登录流', status: 'waiting', statusLabel: '等待验收标准确认：验收单 AC-3 待批', startedAt: Date.now() - 120_000 },
  ],
}

function GallerySec_cost_figure() {
  return (
    <>
      <SectionTitle>Cost Figure — 成本一等公民承载件（§22.2 · A3）</SectionTitle>
      <div className="space-y-4">
        <div className="flex items-end gap-8 flex-wrap">
          <div className="space-y-1">
            <SubLabel>双轨（金额 + token）</SubLabel>
            <CostFigure amount={0.2247} tokens={74_000} size="md" />
          </div>
          <div className="space-y-1">
            <SubLabel>单边金额</SubLabel>
            <CostFigure amount={0.05} size="md" />
          </div>
          <div className="space-y-1">
            <SubLabel>单边 token</SubLabel>
            <CostFigure tokens={31_000} size="md" />
          </div>
          <div className="space-y-1">
            <SubLabel>双缺席 → 诚实降级「—」</SubLabel>
            <CostFigure size="md" />
          </div>
        </div>
        <div className="space-y-1">
          <SubLabel>running 动效（240ms 数字滚动 + 微光，reduced-motion 直出终值）</SubLabel>
          <CostFigure amount={0.318} tokens={96_500} running size="md" />
        </div>
      </div>
    </>
  )
}

function GallerySec_file_type_icon() {
  return (
    <>
      <SectionTitle>File Type Icon — 文件类型图标（CAP-A-32）</SectionTitle>
      <p className="text-3xs text-muted-foreground mb-3">
        扩展名优先 → MIME 兜底两级映射；产物列表/预览/上传唯一出口。
      </p>
      <div className="flex items-center gap-6 flex-wrap">
        {[
          { name: 'spec.pdf' },
          { name: '报告.docx' },
          { name: '数据.xlsx' },
          { name: '汇报.pptx' },
          { name: 'app.tsx' },
          { name: 'schema.prisma' },
          { name: 'README.md' },
          { name: '现场截图.png' },
          { name: '打包.zip' },
          { name: 'demo.mp4' },
          { name: '未知格式.xyz' },
        ].map((item) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <FileTypeIcon name={item.name} />
            <span className="text-xs text-muted-foreground">{item.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <FileTypeIcon mimeType="application/octet-stream" />
          <span className="text-xs text-muted-foreground">仅 MIME（未知扩展）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileTypeIcon name="hero.png" size="md" />
          <span className="text-xs text-muted-foreground">md 档</span>
        </div>
      </div>
    </>
  )
}

function GallerySec_artifact_source_badge() {
  return (
    <>
      <SectionTitle>Artifact Source Badge — 产物来源徽标（CAP-A-32）</SectionTitle>
      <p className="text-3xs text-muted-foreground mb-3">
        upload/execution/document 三源标注；不传 to 为纯标注，传 to 整枚为溯源跳转。
      </p>
      <div className="flex items-center gap-4 flex-wrap">
        <ArtifactSourceBadge kind="upload" />
        <ArtifactSourceBadge kind="execution" />
        <ArtifactSourceBadge kind="document" />
        <ArtifactSourceBadge kind="execution" to="/app/executions" />
        <ArtifactSourceBadge kind="document" to="/app/documents" />
      </div>
    </>
  )
}

function GallerySec_exec_tree() {
  const noop = React.useCallback(() => {}, [])
  return (
    <>
      <SectionTitle>Exec Tree — 执行编排树（B1 · P0）</SectionTitle>
      <p className="text-3xs text-muted-foreground mb-3">
        演示造数：waiting 琥珀必显（§22.1）· 成本沿分支现算折叠不隐账（§22.2）· 失败分支保留可重试（§22.3）。
      </p>
      <ExecTree root={EXEC_TREE_DEMO_NODE} onSelect={noop} onResolve={noop} />
    </>
  )
}

function GallerySec_approval_card() {
  return (
    <>
      <SectionTitle>Approval Card — 审批操作统一件（B2 · §22.4）</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
        <ApprovalCard
          title="重写 src/auth/validate.ts 的校验逻辑"
          riskSignal={2}
          riskNote="AI 自报：该文件另有 3 处测试引用，改动会连带更新"
          preview={<p className="text-xs text-muted-foreground font-mono">~42 行改动 · 2 文件</p>}
        />
        <ApprovalCard
          title="清理构建缓存目录"
          riskSignal={0}
          preview={<p className="text-xs text-muted-foreground font-mono">只读操作 · node_modules/.cache</p>}
        />
        <ApprovalCard
          title="受控已决凭证（approve）"
          riskSignal={1}
          resolved="approve"
        />
        <ApprovalCard
          title="删除生产环境数据表"
          riskSignal={3}
          riskLabel="破坏性"
          riskNote="不可逆操作：需项目管理员二次确认"
        />
      </div>
    </>
  )
}

function GallerySec_autonomy_dial() {
  const [level, setLevel] = React.useState<AutonomyLevel>('ask')
  return (
    <>
      <SectionTitle>Autonomy Dial — 自治边界拨盘（B5 · §22.1 配置面）</SectionTitle>
      <div className="space-y-4 max-w-xl">
        <AutonomyDial
          value={level}
          onValueChange={setLevel}
          samples={[
            { label: '读取 issue 详情', level: 'auto' },
            { label: '提交代码变更', level: 'ask' },
            { label: '合并 pull request', level: 'locked' },
            { label: '运行测试套件', level: 'auto' },
          ]}
        />
        <AutonomyDial
          value="locked"
          onValueChange={() => {}}
          lockedLabel="信任等级未达协助者，由管理员锁定"
          size="sm"
        />
      </div>
    </>
  )
}

function GallerySec_context_usage() {
  return (
    <>
      <SectionTitle>Context Usage — 上下文占用格场（B4 · standby 待契约接线）</SectionTitle>
      <div className="space-y-4 max-w-2xl">
        <p className="text-3xs text-muted-foreground">
          演示造数：limit 为假设值；真实消费须等服务端 contextWindow 契约（§22.2 禁估算冒充，无 limit 即整件不渲染）。
        </p>
        <ContextUsage
          limit={128_000}
          segments={[
            { key: 'system', label: '系统提示', tokens: 14_200 },
            { key: 'tools', label: '工具定义', tokens: 21_800 },
            { key: 'memory', label: '记忆', tokens: 9_600 },
            { key: 'history', label: '对话', tokens: 38_400 },
            { key: 'files', label: '文件', tokens: 12_300 },
          ]}
        />
        <ContextUsage
          limit={128_000}
          compact
          segments={[
            { key: 'system', label: '系统提示', tokens: 14_200 },
            { key: 'tools', label: '工具定义', tokens: 21_800 },
            { key: 'history', label: '对话', tokens: 38_400 },
          ]}
        />
      </div>
    </>
  )
}

const INLINE_DIFF_BEFORE = '部署脚本使用 pm2 重启服务。\n备份数据库后执行迁移。\n通知 PM 完成结果。'
const INLINE_DIFF_AFTER = '部署脚本使用 systemd 单元重启服务。\n备份数据库后执行迁移，并校验迁移后行数。\n灰度 10% 流量观察 10 分钟后全量。\n通知 PM 完成结果。'

function GallerySec_inline_diff() {
  return (
    <>
      <SectionTitle>Inline Diff — diff 优先律承载件（§22.6 · B6 · standby 待接线）</SectionTitle>
      <p className="text-3xs text-muted-foreground mb-3">
        AI 修改既有内容默认 diff 形态：逐段接受/拒绝，「应用修改」时才合成 appliedText（零依赖词级 LCS）。
      </p>
      <InlineDiff before={INLINE_DIFF_BEFORE} after={INLINE_DIFF_AFTER} />
    </>
  )
}

export const GALLERY_SECTIONS: Record<string, React.ComponentType> = {
  'component-review': GallerySec_component_review,
  'colors': GallerySec_colors,
  'typography': GallerySec_typography,
  'spacing': GallerySec_spacing,
  'radius': GallerySec_radius,
  'shadows': GallerySec_shadows,
  'buttons': GallerySec_buttons,
  'badges': GallerySec_badges,
  'tags': GallerySec_tags,
  'avatars': GallerySec_avatars,
  'member-identity': GallerySec_member_identity,
  'cards': GallerySec_cards,
  'item': GallerySec_item,
  'forms': GallerySec_forms,
  'number-field': GallerySec_number_field,
  'autocomplete': GallerySec_autocomplete,
  'checkbox-group': GallerySec_checkbox_group,
  'alerts': GallerySec_alerts,
  'toast': GallerySec_toast,
  'progress': GallerySec_progress,
  'stepper': GallerySec_stepper,
  'sortable': GallerySec_sortable,
  'icon-stack': GallerySec_icon_stack,
  'auth-surface': GallerySec_auth_surface,
  'meter': GallerySec_meter,
  'tabs': GallerySec_tabs,
  'tab-bar': GallerySec_tab_bar,
  'accordion': GallerySec_accordion,
  'table': GallerySec_table,
  'data-table': GallerySec_data_table,
  'tooltip': GallerySec_tooltip,
  'menu': GallerySec_menu,
  'overlays': GallerySec_overlays,
  'popover': GallerySec_popover,
  'hover-card': GallerySec_hover_card,
  'breadcrumb': GallerySec_breadcrumb,
  'button-group': GallerySec_button_group,
  'toggle': GallerySec_toggle,
  'kbd': GallerySec_kbd,
  'spinner': GallerySec_spinner,
  'status-pill': GallerySec_status_pill,
  'status-icon-frame': GallerySec_status_icon_frame,
  'markdown': GallerySec_markdown,
  'markdown-editor': GallerySec_markdown_editor,
  'markdown-live-editor': GallerySec_markdown_live_editor,
  'prompt-editor': GallerySec_prompt_editor,
  'entity-ref': GallerySec_entity_ref,
  'emoji-picker': GallerySec_emoji_picker,
  'pagination': GallerySec_pagination,
  'calendar': GallerySec_calendar,
  'date-picker': GallerySec_date_picker,
  'input-otp': GallerySec_input_otp,
  'input-group': GallerySec_input_group,
  'select-field': GallerySec_select_field,
  'scroll-area': GallerySec_scroll_area,
  'aspect-ratio': GallerySec_aspect_ratio,
  'menubar': GallerySec_menubar,
  'collapsible': GallerySec_collapsible,
  'skeleton': GallerySec_skeleton,
  'empty': GallerySec_empty,
  'stat-tiles': GallerySec_stat_tiles,
  'charts': GallerySec_charts,
  'chapter-scrubber': GallerySec_chapter_scrubber,
  'page-header': GallerySec_page_header,
  'settings-patterns': GallerySec_settings_patterns,
  'settings-header': GallerySec_settings_header,
  'section-scrubber': GallerySec_section_scrubber,
  'settings-section-card': GallerySec_settings_section_card,
  'sticky-save-bar': GallerySec_sticky_save_bar,
  'settings-field-row': GallerySec_settings_field_row,
  'path-input': GallerySec_path_input,
  'definition-row': GallerySec_definition_row,
  'status-definition-list': GallerySec_status_definition_list,
  'toolbar': GallerySec_toolbar,
  'filter-chips': GallerySec_filter_chips,
  'sub-page-toolbar': GallerySec_sub_page_toolbar,
  'task-atoms': GallerySec_task_atoms,
  'subtask-badge': GallerySec_subtask_badge,
  'ai-verdict-pill': GallerySec_ai_verdict_pill,
  'confidence-bar': GallerySec_confidence_bar,
  'task-rows': GallerySec_task_rows,
  'create-card': GallerySec_create_card,
  'delivery-row': GallerySec_delivery_row,
  'doc-cards': GallerySec_doc_cards,
  'command': GallerySec_command,
  'page-layout': GallerySec_page_layout,
  'sidebar-panel': GallerySec_sidebar_panel,
  'detail-section': GallerySec_detail_section,
  'detail-page-frame': GallerySec_detail_page_frame,
  'stat-cards': GallerySec_stat_cards,
  'loading-states': GallerySec_loading_states,
  'assembly-primitives': GallerySec_assembly_primitives,
  'workflow-run-timeline': GallerySec_workflow_run_timeline,
  'ai-density-cards': GallerySec_ai_density_cards,
  'semantic-components': GallerySec_semantic_components,
  'chip': GallerySec_chip,
  'nav-status-dot': GallerySec_nav_status_dot,
  'theme-mode-card': GallerySec_theme_mode_card,
  'chart-card': GallerySec_chart_card,
  'stat-tile': GallerySec_stat_tile,
  'metric-row': GallerySec_metric_row,
  'chart-legend-grid': GallerySec_chart_legend_grid,
  'donut-chart': GallerySec_donut_chart,
  'proportion-bar': GallerySec_proportion_bar,
  'form-dialog': GallerySec_form_dialog,
  'registry-audit': GallerySec_registry_audit,
  'cost-figure': GallerySec_cost_figure,
  'file-type-icon': GallerySec_file_type_icon,
  'artifact-source-badge': GallerySec_artifact_source_badge,
  'exec-tree': GallerySec_exec_tree,
  'approval-card': GallerySec_approval_card,
  'autonomy-dial': GallerySec_autonomy_dial,
  'context-usage': GallerySec_context_usage,
  'inline-diff': GallerySec_inline_diff,
}
