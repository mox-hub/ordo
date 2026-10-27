import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentProps,
} from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronRight,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatLiveDuration } from '@/lib/format';
import { TONE_CLASS, type Tone } from '@/components/ui/tone';
import { Button } from '@/components/ui/button';
import { CostFigure } from './cost-figure';

/**
 * ExecTree —— 执行编排树（semantic 层；组件规划账本 B1 · P0，宪法 §22.1/§22.2/§22.3）。
 *
 * 「一个编排者 + 多个子执行」的树形态视图：每卡状态 / 成本 / 耗时，成本沿分支汇总，
 * 失败分支保留（§22.3），等人分支琥珀高亮且头部可计数（§22.1）。形态为**纵向缩进树**
 * （根在上、子级缩进、左侧连线沿纵深走），适配详情弹窗窄宽度——刻意不做横向组织架构树。
 * 交互语义参考 affectUI Agent Tree（只学 API 形状，样式体系为本仓 tone 链路）。
 *
 * ## 数据契约（给数据层与调用方的承诺）
 * - `root` 每次全量传入；节点以 `id` 保位（展开面板等局部状态挂在行组件上，id 稳定即不丢）。
 * - `cost` / `tokens` 只传**节点自身值**，分支与全树汇总由本组件遍历现算——禁传预汇总值
 *   （§22.2，两处口径必漂移）。汇总遍历全树、与折叠态无关：**折叠不隐账**。
 * - 失败者保留：重试产生**新节点**（新 id）由数据层挂为 children，本组件只渲染、不做覆盖
 *   （§22.3——UI 层不得先于数据层抹掉失败故事）。
 * - `now` 时钟注入：运行 / 等人计时以注入值为准（测试与跨组件时钟对齐用）；缺省组件自跑
 *   1s tick（仅存在 running 节点时启动）。
 *
 * ## 折叠实现裁决
 * 折叠分支**条件渲染（卸载）**而非纯 CSS 隐藏：§22.5 要求折叠收起区禁焦点落入，卸载是比
 * inert 更强的保证；深树全量常驻渲染违背 §21 渲染窗口精神；且 `display:none` 内容本就不可
 * Ctrl+F / 读屏，「不卸载保搜索」前提不成立。折叠分支的账目由父卡「+N 子执行 · 分支合计」
 * 行与头部汇总栏承载，不因折叠丢失。
 *
 * 受控纯展示件：…props 透传、ref 到根（§10.7）；文案中文常量 + `labels` 覆写（§16）；
 * 动效仅 running 呼吸点（motion-safe:animate-pulse，§7 / §22.5）与 CostFigure running 态。
 */

// ── 类型 ──────────────────────────────────────────────────────────────

export type ExecTreeStatus =
  | 'queued'
  | 'running'
  | 'waiting'
  | 'done'
  | 'failed'
  | 'stopped';

/** waiting/failed 的处置动作（approve/reject/dismiss 对 waiting；retry 对 failed） */
export type ExecTreeResolveAction = 'approve' | 'reject' | 'retry' | 'dismiss';

export interface ExecTreeNode {
  id: string;
  /** 节点名（Agent 名 / 步骤名） */
  name: string;
  /** 一句话任务描述（截断展示） */
  task?: string;
  /** 执行模型（mono 小字） */
  model?: string;
  status: ExecTreeStatus;
  /** waiting 语境：等人要决什么（卡上直显） */
  statusLabel?: string;
  /** failed 错误信息（展开显 mono 红字） */
  error?: string;
  /** 本节点自身成本（金额）——分支 / 全树汇总由组件现算，禁传预汇总值 */
  cost?: number | null;
  /** 本节点自身 token 数 */
  tokens?: number | null;
  /** 开始时间（epoch ms） */
  startedAt?: number | null;
  /** 结束时间（epoch ms；终态节点静态计时用） */
  endedAt?: number | null;
  children?: ExecTreeNode[];
}

/** 文案覆写槽（§16：组件内中文常量为默认，调用方按语境覆写） */
export interface ExecTreeLabels {
  title: string;
  /** 头部汇总：'共 {count} 节点' */
  nodesTotal: string;
  /** 头部汇总：'运行中 {count}' */
  runningCount: string;
  /** waiting 徽：'需要你处理'（§22.1 头部计数徽与卡上徽共用） */
  waitingBadge: string;
  /** 头部汇总：'失败 {count}' */
  failedCount: string;
  totalCost: string;
  statusQueued: string;
  statusRunning: string;
  statusWaiting: string;
  statusDone: string;
  statusFailed: string;
  statusStopped: string;
  /** waiting 处置入口按钮 */
  resolve: string;
  approve: string;
  reject: string;
  dismiss: string;
  retry: string;
  /** failed 错误展开钮 */
  errorToggle: string;
  /** 折叠分支汇总：'+{count} 子执行' */
  subtreeMore: string;
  subtreeCost: string;
  /** 折叠钮 aria-label：'展开 {name} 的 {count} 个子执行' */
  expand: string;
  collapse: string;
}

// onSelect 与 HTML 原生 select 事件处理器撞名，须从基类 Omit 后才能声明节点选中回调
export interface ExecTreeProps extends Omit<ComponentProps<'div'>, 'onSelect'> {
  root: ExecTreeNode;
  /** 受控折叠：集合内的节点 id = 其子级收起 */
  collapsedIds?: string[];
  /** 非受控折叠初值 */
  defaultCollapsedIds?: string[];
  onCollapsedChange?: (ids: string[]) => void;
  /** 点卡片（打开详情）——树卡 / Enter 触发；卡内按钮各自 stopPropagation */
  onSelect?: (node: ExecTreeNode) => void;
  /** waiting（approve/reject/dismiss）与 failed（retry）的处置回调；缺省则不渲染处置入口 */
  onResolve?: (node: ExecTreeNode, action: ExecTreeResolveAction) => void;
  /** 时钟注入（epoch ms，运行 / 等人计时用）；缺省组件自跑 1s tick */
  now?: number;
  /** 头部标题（默认「执行编排」） */
  title?: string;
  labels?: Partial<ExecTreeLabels>;
}

// ── 常量与纯函数 ──────────────────────────────────────────────────────

const DEFAULT_LABELS: ExecTreeLabels = {
  title: '执行编排',
  nodesTotal: '共 {count} 节点',
  runningCount: '运行中 {count}',
  waitingBadge: '需要你处理',
  failedCount: '失败 {count}',
  totalCost: '总成本',
  statusQueued: '排队中',
  statusRunning: '运行中',
  statusWaiting: '需要你处理',
  statusDone: '已完成',
  statusFailed: '失败',
  statusStopped: '已停止',
  resolve: '处理',
  approve: '批准',
  reject: '拒绝',
  dismiss: '忽略',
  retry: '重试',
  errorToggle: '错误详情',
  subtreeMore: '+{count} 子执行',
  subtreeCost: '分支合计',
  expand: '展开 {name} 的 {count} 个子执行',
  collapse: '折叠 {name} 的 {count} 个子执行',
};

const NO_IDS: string[] = [];

/** 六态视觉映射（tone 走 §19.5 唯一词表；running=呼吸点，done/failed/stopped=专属图标） */
const STATUS_META: Record<
  ExecTreeStatus,
  {
    tone: Tone;
    labelKey: keyof ExecTreeLabels;
    visual:
      | { kind: 'dot'; pulse?: boolean }
      | { kind: 'icon'; icon: typeof Ban };
  }
> = {
  queued: { tone: 'default', labelKey: 'statusQueued', visual: { kind: 'dot' } },
  running: { tone: 'info', labelKey: 'statusRunning', visual: { kind: 'dot', pulse: true } },
  waiting: { tone: 'warning', labelKey: 'statusWaiting', visual: { kind: 'dot' } },
  done: { tone: 'success', labelKey: 'statusDone', visual: { kind: 'icon', icon: CheckCircle2 } },
  failed: { tone: 'danger', labelKey: 'statusFailed', visual: { kind: 'icon', icon: XCircle } },
  stopped: { tone: 'default', labelKey: 'statusStopped', visual: { kind: 'icon', icon: Ban } },
};

/** 模板填充：'{count} 子执行' + {count: 2} → '+2 子执行' 的占位替换（未知占位原样保留） */
function tpl(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (raw, key: string) =>
    key in vars ? String(vars[key]) : raw,
  );
}

interface ExecTreeStats {
  nodes: number;
  running: number;
  waiting: number;
  failed: number;
  /** 已知自身值之和（缺值不计入、不造 0） */
  cost: number | null;
  tokens: number | null;
}

function emptyStats(): ExecTreeStats {
  return { nodes: 0, running: 0, waiting: 0, failed: 0, cost: null, tokens: null };
}

/** 缺席值不污染合计：null 跳过（诚实降级，不造 0） */
function addTo(base: number | null, value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return base;
  return (base ?? 0) + value;
}

/** 遍历节点含后代，汇总计数与自身值合计（§22.2：汇总=组件现算，与折叠态无关） */
function collectStats(node: ExecTreeNode, into: ExecTreeStats): ExecTreeStats {
  into.nodes += 1;
  if (node.status === 'running') into.running += 1;
  if (node.status === 'waiting') into.waiting += 1;
  if (node.status === 'failed') into.failed += 1;
  into.cost = addTo(into.cost, node.cost);
  into.tokens = addTo(into.tokens, node.tokens);
  for (const child of node.children ?? []) collectStats(child, into);
  return into;
}

/** 直接后代（含更深层）的分支统计（折叠父卡的「+N 子执行 · 分支合计」行用） */
function descendantStats(node: ExecTreeNode): ExecTreeStats {
  const stats = emptyStats();
  for (const child of node.children ?? []) collectStats(child, stats);
  return stats;
}

/**
 * 节点计时（渐进精度展示用原始 ms）：
 * running / waiting 为 live（now - startedAt，等人时长同样要可见）；终态静态差值。
 * 数据不完整（缺起点 / 终点早于起点）返回 null——不造 0、不显负数。
 */
function nodeDurationMs(node: ExecTreeNode, now: number): number | null {
  const { startedAt, endedAt, status } = node;
  if (startedAt == null || !Number.isFinite(startedAt)) return null;
  if (status === 'running' || status === 'waiting') {
    return Math.max(0, now - startedAt);
  }
  if (endedAt != null && Number.isFinite(endedAt) && endedAt >= startedAt) {
    return endedAt - startedAt;
  }
  return null;
}

/**
 * 树内时钟：`injected` 提供即直用（受控，零副作用）；缺省自跑 1s tick——且仅当树内存在
 * running 节点时启动（终态树不空转）。惰性初值取挂载时刻（渲染期禁 Date.now，run-timeline
 * 同款先例）。
 */
function useTreeNow(injected: number | undefined, active: boolean): number {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (injected !== undefined || !active) return;
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [injected, active]);
  return injected ?? tick;
}

// ── 行内件 ────────────────────────────────────────────────────────────

/** 状态视觉槽：dot（queued/running/waiting）或专属图标（done/failed/stopped），颜色全走 tone 词表 */
function StatusVisual({ status }: { status: ExecTreeStatus }) {
  const meta = STATUS_META[status];
  if (meta.visual.kind === 'icon') {
    const Icon = meta.visual.icon;
    return (
      <Icon
        aria-hidden="true"
        className={cn('size-3.5 shrink-0', TONE_CLASS[meta.tone].text)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'size-2 shrink-0 rounded-full',
        TONE_CLASS[meta.tone].dot,
        meta.visual.pulse && 'motion-safe:animate-pulse',
      )}
    />
  );
}

/**
 * waiting 三键的 Button 形态（走 variant/tone 封闭轴，§19.2）：
 * approve=关键动作（primary 实底）；reject=红字 ghost；dismiss=quiet 降权。
 * success tone 零先例不立档（ui/button tone 轴裁决），approve 用 default 承重。
 */
const RESOLVE_BUTTON_PROPS: Record<
  'approve' | 'reject' | 'dismiss',
  { variant: 'default' } | { variant: 'ghost'; tone: 'danger' } | { variant: 'quiet' }
> = {
  approve: { variant: 'default' },
  reject: { variant: 'ghost', tone: 'danger' },
  dismiss: { variant: 'quiet' },
};

interface NodeRowProps {
  node: ExecTreeNode;
  /** 折叠判定（按节点 id 查当前折叠集合——每行只认自己的子级折叠态） */
  isCollapsed: (node: ExecTreeNode) => boolean;
  onToggleCollapse: (node: ExecTreeNode) => void;
  onSelect?: (node: ExecTreeNode) => void;
  onResolve?: (node: ExecTreeNode, action: ExecTreeResolveAction) => void;
  now: number;
  labels: ExecTreeLabels;
}

/**
 * 单节点行（ARIA 组合树：外层 role=treeitem 承载焦点与 aria-expanded，内层 role=none
 * 承载卡视觉；展开处置面板 / 错误面板为行内局部态，随 id 保位）。
 */
function ExecTreeNodeRow({
  node,
  isCollapsed,
  onToggleCollapse,
  onSelect,
  onResolve,
  now,
  labels,
}: NodeRowProps) {
  const meta = STATUS_META[node.status];
  const statusText = labels[meta.labelKey];
  const groupId = useId();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);

  const children = node.children;
  const hasChildren = !!children && children.length > 0;
  const collapsed = isCollapsed(node);
  const branch = useMemo(
    () => (hasChildren ? descendantStats(node) : null),
    [hasChildren, node],
  );
  const isRunning = node.status === 'running';
  const isWaiting = node.status === 'waiting';
  const isFailed = node.status === 'failed';
  const durationMs = nodeDurationMs(node, now);
  // 渐进精度时长走 @/lib/format 唯一口径（账本 G3 收编；数据不完整 → '' 不渲染）
  const durationText = formatLiveDuration(durationMs);

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? !collapsed : undefined}
      aria-selected={false}
      aria-label={`${node.name}，${statusText}`}
      tabIndex={0}
      data-slot="exec-tree-node"
      data-node-id={node.id}
      data-status={node.status}
      onClick={() => onSelect?.(node)}
      onKeyDown={(event) => {
        // 内部按钮（折叠 / 处置 / 错误）自带 Enter 语义，只认树卡本体的 Enter/Space
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.(node);
        }
      }}
      className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-blue"
    >
      <div
        role="none"
        className={cn(
          'cursor-pointer border px-2 py-1.5 transition-colors',
          isWaiting
            ? // §22.1：等人分支视觉权级最高——琥珀警示底 + 描边，禁 muted 降级
              'border-accent-yellow/50 bg-accent-yellow-light/40 hover:bg-accent-yellow-light/60'
            : 'border-transparent hover:bg-muted/40',
        )}
      >
        {/* 第一行：折叠钮 + 状态 + 名称 + model + （waiting 徽）+ 计时 + 成本 + 错误钮 */}
        <div className="flex min-w-0 items-center gap-1.5 text-xs leading-relaxed">
          {hasChildren ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-2xs"
              aria-expanded={!collapsed}
              aria-controls={!collapsed ? groupId : undefined}
              aria-label={
                collapsed
                  ? tpl(labels.expand, { name: node.name, count: branch?.nodes ?? 0 })
                  : tpl(labels.collapse, { name: node.name, count: branch?.nodes ?? 0 })
              }
              onClick={(event) => {
                event.stopPropagation();
                onToggleCollapse(node);
              }}
              className="shrink-0"
            >
              <ChevronRight
                aria-hidden="true"
                className={cn('size-3 transition-transform', !collapsed && 'rotate-90')}
              />
            </Button>
          ) : null}
          <StatusVisual status={node.status} />
          <span className="min-w-0 shrink-0 truncate font-medium text-content-text">
            {node.name}
          </span>
          {node.model ? (
            <span className="hidden min-w-0 truncate font-mono text-2xs text-content-text-muted sm:inline">
              {node.model}
            </span>
          ) : null}
          {isWaiting ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-accent-yellow-light px-1.5 py-0.5 text-2xs font-semibold text-accent-yellow">
              <AlertTriangle aria-hidden="true" className="size-2.5" />
              {labels.waitingBadge}
            </span>
          ) : null}
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {durationText ? (
              <span
                className={cn(
                  'font-mono text-2xs tabular-nums',
                  isRunning
                    ? 'text-accent-blue'
                    : isWaiting
                      ? 'text-accent-yellow'
                      : 'text-content-text-muted',
                )}
              >
                {durationText}
              </span>
            ) : null}
            <CostFigure
              size="xs"
              amount={node.cost}
              tokens={node.tokens}
              running={isRunning}
              className={isRunning ? 'text-accent-blue' : undefined}
            />
          </span>
          {isFailed ? (
            <Button
              type="button"
              variant="ghost"
              tone="danger"
              size="xs"
              padding="px-1.5 py-0.5"
              aria-expanded={errorOpen}
              onClick={(event) => {
                event.stopPropagation();
                setErrorOpen((open) => !open);
              }}
              className="shrink-0"
            >
              {labels.errorToggle}
            </Button>
          ) : null}
        </div>

        {/* 第二行：任务一句话（截断） */}
        {node.task ? (
          <p className="mt-0.5 truncate pl-6 text-2xs text-content-text-muted">{node.task}</p>
        ) : null}

        {/* waiting 语境直显（§22.1：等人要决什么直接可见，不藏在展开区） */}
        {isWaiting && node.statusLabel ? (
          <p className="mt-0.5 truncate pl-6 text-2xs text-accent-yellow">{node.statusLabel}</p>
        ) : null}

        {/* waiting 处置：展开行 statusLabel + 三键（approve/reject/dismiss 走 onResolve） */}
        {isWaiting && onResolve ? (
          actionsOpen ? (
            <div className="mt-1.5 flex min-w-0 items-center gap-1.5 pl-6">
              {node.statusLabel ? (
                <span className="min-w-0 flex-1 truncate text-2xs text-accent-yellow">
                  {node.statusLabel}
                </span>
              ) : null}
              <span className="flex shrink-0 items-center gap-1">
                {(['approve', 'reject', 'dismiss'] as const).map((action) => (
                  <Button
                    key={action}
                    type="button"
                    size="xs"
                    padding="px-1.5 py-0.5"
                    data-action={action}
                    {...RESOLVE_BUTTON_PROPS[action]}
                    onClick={(event) => {
                      event.stopPropagation();
                      onResolve(node, action);
                      setActionsOpen(false);
                    }}
                  >
                    {labels[action]}
                  </Button>
                ))}
              </span>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="xs"
              padding="px-1.5 py-0.5"
              aria-expanded={false}
              onClick={(event) => {
                event.stopPropagation();
                setActionsOpen(true);
              }}
              className="mt-1 ml-6"
            >
              {labels.resolve}
            </Button>
          )
        ) : null}

        {/* failed 错误面板（§22.3 失败叙事保留：mono 红字 + 重试入口；重试=数据层挂新子节点） */}
        {isFailed && errorOpen ? (
          <div className="mt-1.5 space-y-1.5 pl-6">
            {node.error ? (
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-accent-red-light/50 p-1.5 font-mono text-2xs leading-relaxed text-accent-red">
                {node.error}
              </pre>
            ) : null}
            {onResolve ? (
              <Button
                type="button"
                variant="ghost"
                tone="info"
                size="xs"
                padding="px-1.5 py-0.5"
                data-action="retry"
                onClick={(event) => {
                  event.stopPropagation();
                  onResolve(node, 'retry');
                }}
              >
                {labels.retry}
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* 折叠分支汇总（§22.2：折叠不隐账——分支合计=后代自身值现算） */}
        {hasChildren && collapsed && branch ? (
          <p className="mt-1 flex min-w-0 items-center gap-1 pl-6 text-2xs text-content-text-muted">
            <span className="shrink-0 tabular-nums">
              {tpl(labels.subtreeMore, { count: branch.nodes })}
            </span>
            {branch.cost != null || branch.tokens != null ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">{labels.subtreeCost}</span>
                <CostFigure
                  size="xs"
                  amount={branch.cost}
                  tokens={branch.tokens}
                  className="text-content-text-muted"
                />
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      {/* 子级（折叠即卸载，见文件头「折叠实现裁决」；连线颜色跟随子分支状态 tone，queued/stopped 天然 muted 降权） */}
      {hasChildren && !collapsed && children ? (
        <div role="group" id={groupId} data-slot="exec-tree-children" className="ml-2.5">
          {children.map((child, index) => {
            const isLast = index === children.length - 1;
            const lineDot = TONE_CLASS[STATUS_META[child.status].tone].dot;
            return (
              <div key={child.id} className="relative pl-4">
                {/* 纵向连线段：末枝止于肘部，其余贯穿整行 */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-0 top-0 w-px opacity-30',
                    isLast ? 'h-4' : 'bottom-0',
                    lineDot,
                  )}
                />
                {/* 肘部横线：对齐子卡首行中线 */}
                <span
                  aria-hidden="true"
                  className={cn('absolute left-0 top-4 h-px w-3.5 opacity-30', lineDot)}
                />
                <ExecTreeNodeRow
                  node={child}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={onToggleCollapse}
                  onSelect={onSelect}
                  onResolve={onResolve}
                  now={now}
                  labels={labels}
                />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// ── 组件本体 ──────────────────────────────────────────────────────────

/**
 * 执行编排树。全量受控 + …props 透传（§10.7）；头部汇总栏全树现算（总节点 / 运行中 /
 * 需要你处理（§22.1 琥珀计数徽，aria-live）/ 失败 / 总成本），成本沿分支汇总、折叠不隐账。
 */
export function ExecTree({
  root,
  collapsedIds,
  defaultCollapsedIds,
  onCollapsedChange,
  onSelect,
  onResolve,
  now,
  title,
  labels: labelsOverride,
  className,
  ...rest
}: ExecTreeProps) {
  const labels = useMemo(
    () => ({ ...DEFAULT_LABELS, ...labelsOverride }),
    [labelsOverride],
  );
  // 折叠半受控模式：传 collapsedIds 即受控（状态归调用方），否则内部自持
  const [innerCollapsed, setInnerCollapsed] = useState<string[]>(
    defaultCollapsedIds ?? NO_IDS,
  );
  const isControlled = collapsedIds !== undefined;
  const collapsedList = isControlled ? collapsedIds : innerCollapsed;
  const collapsedSet = useMemo(() => new Set(collapsedList), [collapsedList]);

  const stats = useMemo(() => collectStats(root, emptyStats()), [root]);
  const resolvedNow = useTreeNow(now, stats.running > 0);
  const resolvedTitle = title !== undefined ? title : labels.title;

  const toggleCollapse = (node: ExecTreeNode) => {
    const next = collapsedSet.has(node.id)
      ? collapsedList.filter((id) => id !== node.id)
      : [...collapsedList, node.id];
    if (!isControlled) setInnerCollapsed(next);
    onCollapsedChange?.(next);
  };

  const isCollapsedNode = (node: ExecTreeNode) => collapsedSet.has(node.id);

  return (
    <div
      role="tree"
      aria-label={resolvedTitle}
      data-slot="exec-tree"
      data-ai-component="exec-tree"
      className={cn('min-w-0', className)}
      {...rest}
    >
      {/* 头部汇总栏（全部现算；waiting 琥珀计数徽 + aria-live，§22.1） */}
      <div
        data-slot="exec-tree-header"
        className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-content-text-muted"
      >
        <span className="text-xs font-semibold text-content-text">{resolvedTitle}</span>
        <span className="tabular-nums">{tpl(labels.nodesTotal, { count: stats.nodes })}</span>
        {stats.running > 0 ? (
          <span className="tabular-nums text-accent-blue">
            {tpl(labels.runningCount, { count: stats.running })}
          </span>
        ) : null}
        {stats.waiting > 0 ? (
          <span aria-live="polite">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-yellow-light px-1.5 py-0.5 font-semibold text-accent-yellow">
              <AlertTriangle aria-hidden="true" className="size-2.5" />
              {labels.waitingBadge}
              <span className="tabular-nums">{stats.waiting}</span>
            </span>
          </span>
        ) : null}
        {stats.failed > 0 ? (
          <span className="tabular-nums text-accent-red">
            {tpl(labels.failedCount, { count: stats.failed })}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1">
          <span className="shrink-0">{labels.totalCost}</span>
          <CostFigure
            size="xs"
            amount={stats.cost}
            tokens={stats.tokens}
            running={stats.running > 0}
          />
        </span>
      </div>

      <ExecTreeNodeRow
        node={root}
        isCollapsed={isCollapsedNode}
        onToggleCollapse={toggleCollapse}
        onSelect={onSelect}
        onResolve={onResolve}
        now={resolvedNow}
        labels={labels}
      />
    </div>
  );
}
