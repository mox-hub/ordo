import { useMemo, useState } from 'react';

import { RawButton } from '@/components/raw/raw-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TONE_CLASS, type Tone } from '@/components/ui/tone';
import { formatCompact, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * ContextUsage - [AI] 模型上下文占用格场（组件规划账本 B4 / 宪法 §22.5 活性可感知、§17.6 结论式 aria）。
 *
 * 「模型上下文快满了 / 还装得下多少」的透明化承载件：上下文窗口渲染为一排定量格子，
 * 各分区（系统提示 / 工具定义 / 记忆 / 对话历史 / 文件）按 token 占比从左到右填充，
 * 未占满的尾部格子渲染为虚框（free）。悬停分区点亮该段、其余降透明度，tooltip 给出
 * 「分区名 · token 数 · 占比」。一期纯展示；compaction（压缩）动画二期再评估（占比
 * 变化已可静态表达收敛）。
 *
 * - **格场分配**：总格数固定 24（compact 档 12），每格代表 limit/格数 的 token 量；
 *   分区跨界格按占比四舍五入取整分配，取整溢出从尾部回收、误差落 free（见
 *   allocateContextSegments）。低于半格的分区不占格（格场分辨率限制），token 数仍
 *   计入结论 aria-label 与汇总行的已用量——诚实不丢数。
 * - **阈值语义色**：整体占用 <70% 中性 / 70-90% warning 琥珀 / >90% danger 红，
 *   只落在汇总读数与 data-usage-level 上；格子恒用所在分区色（边缘格不参与阈值染色）。
 *   阈值常量导出供测试（CONTEXT_USAGE_WARNING_THRESHOLD / CONTEXT_USAGE_DANGER_THRESHOLD）。
 * - **防御归一**：tokens 负数 / NaN / Infinity 一律按 0 计；分区总和超过 limit 时
 *   等比收缩到恰好铺满 100%——诚实渲染到满，不溢出不诈减（相对占比保留）。limit
 *   非有限数或 ≤0 时无法得出任何诚实结论，整件不渲染（返回 null）。
 * - **a11y 取舍**（二选一取后者）：整体 role="img" + 单一结论 aria-label（§17.6，
 *   如「上下文已用 62%，对话历史占最多」）+ 每分区 title 兜底；不给 24 格逐格发
 *   tabIndex（键盘 tab 风暴）。有 onSegmentClick 时分区升级为 <button>（§8.5 第 7 条，
 *   禁 div onClick），容器改 role="group"，焦点态与悬停态同样点亮。
 * - **动效克制**：仅 hover/focus 的 opacity 过渡（duration-fast 120ms，§7.1 白名单）；
 *   无常驻动画。§7.4 reduced-motion 由全局规则接管。
 *
 * 受控纯展示件：…props 透传、ref 到根（§10.7）。文案中文硬编码（先例 activity-heatmap；
 * i18n 收编随登记批）。数据源现状：前端尚无「窗口上限 limit」契约（execution 详情只有
 * totalTokens 总量，assistant usage 是单次调用开销）——真实接线方案见
 * .roadmap-handoff/context-usage-handoff.md，禁在消费方手造 limit 常量（§22.2 禁造假数）。
 */

/** 阈值语义色档（导出供测试） */
export type ContextUsageLevel = 'neutral' | 'warning' | 'danger';

/** 占用 <70% 中性（导出供测试） */
export const CONTEXT_USAGE_WARNING_THRESHOLD = 0.7;
/** 占用 >90% danger（70-90% 区间含端点为 warning；导出供测试） */
export const CONTEXT_USAGE_DANGER_THRESHOLD = 0.9;

/** 标准档总格数 */
export const CONTEXT_USAGE_CELLS = 24;
/** 紧凑档总格数（面板窄栏） */
export const CONTEXT_USAGE_CELLS_COMPACT = 12;

/** 分区色档（§5.3 语义色表达分类；red 留给超限强调与消费方覆写） */
export type ContextTone = 'neutral' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'red';

export interface ContextSegment {
  /** 分区标识：system / tools / memory / history / files（free 由组件派生，传入即忽略） */
  key: string;
  /** 分区名（中文，tooltip 与结论 aria 用） */
  label: string;
  /** 该分区 token 数（负数 / NaN / Infinity 防御归一为 0） */
  tokens: number;
  /** 可选色；缺省按 key 从内置档位表取（未知 key 按 fallback 色序轮转） */
  tone?: ContextTone;
}

export interface ContextUsageProps extends React.ComponentProps<'div'> {
  /** 各分区占用（顺序即渲染顺序） */
  segments: ContextSegment[];
  /** 上下文窗口总量（token）；非有限数或 ≤0 时整件不渲染 */
  limit: number;
  /** 紧凑档：格数减半、隐藏汇总行（面板窄栏） */
  compact?: boolean;
  /** 点分区回调（如跳转记忆管理）；提供时分区渲染为 button，容器 role 改 group */
  onSegmentClick?: (key: string) => void;
}

export interface ContextAllocatedSegment {
  key: string;
  label: string;
  /** 归一后的 token 数（超限时等比收缩过） */
  tokens: number;
  /** 分到的格数（0 = 低于半格，不占格但计入已用量） */
  cells: number;
  tone: ContextTone;
}

export interface ContextAllocation {
  filled: ContextAllocatedSegment[];
  /** 虚框格数（≥0） */
  freeCells: number;
  usedTokens: number;
  freeTokens: number;
  /** 0..1（超限时恰为 1） */
  usedFraction: number;
  /** 输入总和 > limit（已等比收缩渲染到 100%） */
  overLimit: boolean;
}

/** 内置分区默认色档 */
const DEFAULT_TONE_BY_KEY: Record<string, ContextTone> = {
  system: 'purple',
  tools: 'blue',
  memory: 'green',
  history: 'orange',
  files: 'yellow',
};

/** 未知 key 的 fallback 色序（按出现顺序轮转，避免同色相邻歧义） */
const FALLBACK_TONES: ContextTone[] = ['blue', 'purple', 'green', 'orange', 'yellow'];

/**
 * 色档 → 语义 token 引用（SERIES_COLORS 同款惯例：内联 style 写 var() 引用，§5.1 禁字面色）。
 * 分区色是「分类」语义（§5.3），非状态——不走 status tone 链；阈值档文字色才走 TONE_CLASS。
 */
const TONE_COLOR: Record<ContextTone, string> = {
  neutral: 'hsl(var(--muted-foreground))',
  purple: 'hsl(var(--accent-purple))',
  blue: 'hsl(var(--accent-blue))',
  green: 'hsl(var(--accent-green))',
  yellow: 'hsl(var(--accent-yellow))',
  orange: 'hsl(var(--accent-orange))',
  red: 'hsl(var(--accent-red))',
};

/** 阈值档 → status tone（唯一视觉链路 §19.5：文字色经 TONE_CLASS 取值；neutral 无状态即 default） */
const LEVEL_TONE: Record<ContextUsageLevel, Tone> = {
  neutral: 'default',
  warning: 'warning',
  danger: 'danger',
};

/**
 * 占用比 → 阈值档：<70% neutral / 70-90%（含端点）warning / >90% danger。
 * 纯函数，导出供测试。
 */
export function contextUsageLevel(usedFraction: number): ContextUsageLevel {
  if (usedFraction > CONTEXT_USAGE_DANGER_THRESHOLD) return 'danger';
  if (usedFraction >= CONTEXT_USAGE_WARNING_THRESHOLD) return 'warning';
  return 'neutral';
}

/**
 * 格场分配（纯函数，导出供测试）：
 * ① tokens 负数 / NaN / Infinity → 0（诚实归零，不诈减其他分区）；
 * ② 分区总和 > limit → 等比收缩到恰好铺满 100%（保留相对占比，误差不溢出）；
 * ③ 每分区按 tokens/(limit/格数) 四舍五入取格，总量以 round(占用比×格数) 封顶——
 *    溢出从尾部回收，误差只落 free（格场永不多画）；
 * ④ limit / cellCount 非有限数或 ≤0 → null（无法诚实渲染）。
 */
export function allocateContextSegments(
  segments: ContextSegment[],
  limit: number,
  cellCount: number,
): ContextAllocation | null {
  if (!Number.isFinite(limit) || limit <= 0) return null;
  if (!Number.isFinite(cellCount) || cellCount <= 0) return null;

  // free 由组件派生，传入即忽略；负数 / 非有限数归一为 0
  const safe = segments
    .filter((s) => s.key !== 'free')
    .map((s) => ({
      ...s,
      tokens: Number.isFinite(s.tokens) && s.tokens > 0 ? s.tokens : 0,
    }));
  const rawSum = safe.reduce((acc, s) => acc + s.tokens, 0);
  const overLimit = rawSum > limit;
  const scale = overLimit && rawSum > 0 ? limit / rawSum : 1;
  const usedTokens = overLimit ? limit : rawSum;
  const cellTokens = limit / cellCount;
  // 总格数上限 = round(真实占用比 × 格数)：逐段四舍五入会系统性上偏（如 24 段各 0.6 格
  // 全进位成满格），以真实占用封顶后格场永不多画——取整误差只落 free，不诈满
  const maxFilled = Math.round((usedTokens / limit) * cellCount);

  let cumulative = 0;
  let fallbackIndex = 0;
  const filled = safe.map((s) => {
    const tokens = s.tokens * scale;
    // 按占比取整分配；取整溢出从尾部回收（误差落 free）
    const cells = Math.max(0, Math.min(Math.round(tokens / cellTokens), maxFilled - cumulative));
    cumulative += cells;
    const tone =
      s.tone ?? DEFAULT_TONE_BY_KEY[s.key] ?? FALLBACK_TONES[fallbackIndex++ % FALLBACK_TONES.length];
    return { key: s.key, label: s.label, tokens, cells, tone };
  });

  return {
    filled,
    freeCells: cellCount - cumulative,
    usedTokens,
    freeTokens: limit - usedTokens,
    usedFraction: usedTokens / limit,
    overLimit,
  };
}

interface RenderGroup {
  key: string;
  label: string;
  cells: number;
  tone: ContextTone;
  tokens: number;
  free?: boolean;
}

export function ContextUsage({
  segments,
  limit,
  compact = false,
  onSegmentClick,
  className,
  ...rest
}: ContextUsageProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const cellCount = compact ? CONTEXT_USAGE_CELLS_COMPACT : CONTEXT_USAGE_CELLS;
  const allocation = useMemo(
    () => allocateContextSegments(segments, limit, cellCount),
    [segments, limit, cellCount],
  );
  // limit 非法：无诚实结论可下，整件不渲染（同 ProportionBar denom<=0 先例）
  if (!allocation) return null;

  const { filled, freeCells, usedTokens, freeTokens, usedFraction, overLimit } = allocation;
  const interactive = typeof onSegmentClick === 'function';
  const level = contextUsageLevel(usedFraction);
  const pctText = formatPercent(usedFraction);
  // 结论式 aria（§17.6）：占最多的分区点名，不依赖视觉传达
  const top = filled.reduce<ContextAllocatedSegment | null>(
    (best, s) => (best === null || s.tokens > best.tokens ? s : best),
    null,
  );
  const conclusion =
    usedTokens <= 0
      ? `上下文全部空闲（0 / ${formatCompact(limit)} tokens）`
      : overLimit
        ? `上下文已满（${pctText}），内容已超出窗口，${top?.label ?? ''}占最多`
        : `上下文已用 ${pctText}，${top?.label ?? ''}占最多`;

  const groups: RenderGroup[] = [
    ...filled
      .filter((s) => s.cells > 0)
      .map((s) => ({ key: s.key, label: s.label, cells: s.cells, tone: s.tone, tokens: s.tokens })),
    ...(freeCells > 0
      ? [{ key: 'free', label: '剩余空间', cells: freeCells, tone: 'neutral' as const, tokens: freeTokens, free: true }]
      : []),
  ];

  return (
    <div
      data-slot="context-usage"
      data-ai-component="context-usage"
      data-usage-level={level}
      data-compact={compact ? 'true' : undefined}
      className={cn('space-y-1.5', className)}
      {...rest}
    >
      {/* 格场行：role=img（只读）承载结论式 aria；interactive 时降为 group（img 内禁交互子元素） */}
      <div
        data-slot="context-usage-grid"
        role={interactive ? 'group' : 'img'}
        aria-label={conclusion}
        className="flex w-full gap-0.5"
      >
        {groups.map((group) => {
          const active = activeKey === group.key;
          const dimmed = activeKey !== null && !active;
          const share = group.tokens / limit;
          const title = `${group.label} ${formatNumber(group.tokens)} tokens（${formatPercent(share)}）`;
          const cells = Array.from({ length: group.cells }, (_, i) =>
            group.free ? (
              <div
                key={i}
                data-cell
                data-free="true"
                className="h-2.5 min-w-0 flex-1 rounded-xs border border-dashed border-border"
              />
            ) : (
              <div
                key={i}
                data-cell
                className="h-2.5 min-w-0 flex-1 rounded-xs"
                style={{ backgroundColor: TONE_COLOR[group.tone] }}
              />
            ),
          );
          const groupProps = {
            'data-segment-key': group.key,
            'data-cells': group.cells,
            'data-active': active || undefined,
            'data-dimmed': dimmed || undefined,
            className: cn(
              'flex min-w-0 gap-0.5 transition-opacity duration-fast ease-standard',
              dimmed && 'opacity-40',
            ),
            style: { flexGrow: group.cells, flexBasis: 0 },
            onMouseEnter: () => setActiveKey(group.key),
            onMouseLeave: () => setActiveKey((k) => (k === group.key ? null : k)),
            onFocus: () => setActiveKey(group.key),
            onBlur: () => setActiveKey((k) => (k === group.key ? null : k)),
          };
          const tip = (
            <TooltipContent side="top">
              <span className="font-medium">{group.label}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{formatNumber(group.tokens)} tokens</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{formatPercent(share)}</span>
            </TooltipContent>
          );
          return (
            <div key={group.key} {...groupProps}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    interactive ? (
                      // RawButton：分区热区是「可选中区域」非动作钮（原语层出口的既定用途），
                      // 形态（无 padding/无底色）完全由本件负责
                      <RawButton
                        aria-label={`${group.label}，${formatNumber(group.tokens)} tokens，占 ${formatPercent(share)}`}
                        title={title}
                        onClick={() => onSegmentClick(group.key)}
                        className="flex min-w-0 flex-1 gap-0.5"
                      >
                        {cells}
                      </RawButton>
                    ) : (
                      <div title={title} className="flex min-w-0 flex-1 gap-0.5">
                        {cells}
                      </div>
                    )
                  }
                />
                {tip}
              </Tooltip>
            </div>
          );
        })}
      </div>
      {/* 汇总行：视觉强化，结论已由 aria 承载故 aria-hidden；compact 窄栏省略 */}
      {!compact && (
        <div
          aria-hidden="true"
          data-slot="context-usage-summary"
          className={cn('flex items-center gap-1.5 text-xs', TONE_CLASS[LEVEL_TONE[level]].text)}
        >
          <span>已用</span>
          <span className="font-mono tabular-nums">{pctText}</span>
          <span className="text-content-text-muted">·</span>
          <span className="font-mono tabular-nums text-content-text-muted">
            {formatCompact(usedTokens)} / {formatCompact(limit)} tokens
          </span>
          {overLimit ? <span>· 已超限</span> : null}
        </div>
      )}
    </div>
  );
}
