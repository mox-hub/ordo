import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';
import { formatCompact, formatCurrency } from '@/lib/format';

/**
 * CostFigure - [AI] 成本一等公民承载件（宪法 §22.2 成本一等公民律 / 组件规划账本 A3）。
 *
 * Agent 执行类界面（执行卡片 / 行 / 详情面板）的成本必显位：
 * - **双轨显示**：金额（@/lib/format formatCurrency，§14.1 唯一入口）与 token 数
 *   （formatCompact 大数缩写）并显，`font-mono tabular-nums` 等宽数字（§14.4）。
 * - **诚实降级**：amount 与 tokens 均缺席（null / 非有限数）渲染「—」占位——
 *   不渲染 0、不整件消失（禁造假数）；单边缺席只显示另一边。
 * - **运行态动效**：running 且值变化时数字滚动（240ms rAF odometer，§7.1 duration-slow 档）
 *   + 微光扫过（transform 渐变带）；终态不传 running 即静默直出。
 *   reduced-motion 下不渲染任何动效、直出终值（注意：index.css 全局 reduce 规则只覆盖
 *   .motion-* 家族，本件的循环动画在注入样式中自带 reduce 兜底，见 COST_FIGURE_STYLE）。
 * - **汇总契约（§22.2）**：本件只渲染调用方传入的自身值；组 / 分支级汇总必须由父级
 *   从成员自身值现算后再传单值——禁传预汇总值（两处口径必漂移）。
 *
 * 受控纯展示件：…props 透传、ref 到根（§10.7）；颜色继承调用方文字档（§6.3），
 * 金额高亮色（如 run-info-panel 的 hl 绿）由消费方容器控制。
 */

/** 运行态数字滚动时长（§7.1 白名单上限档 240ms） */
const ROLL_DURATION_MS = 240;
/** 里程表位数轴：0-9 加一个尾随 0，供 9→0 上滚时无缝过渡 */
const ROLL_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0] as const;

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

/** matchMedia 可用性防御（jsdom / 老环境无 matchMedia 时按「未要求减少动效」处理） */
type MediaQueryLike = Pick<
  MediaQueryList,
  'matches' | 'addEventListener' | 'removeEventListener'
>;

function matchReduceQuery(): MediaQueryLike | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(REDUCE_QUERY);
}

function subscribePrefersReducedMotion(onChange: () => void): () => void {
  const mql = matchReduceQuery();
  if (!mql) return () => {};
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/** reduced-motion 偏好（useSyncExternalStore：客户端快照 + SSR 快照恒 false） */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribePrefersReducedMotion,
    () => matchReduceQuery()?.matches ?? false,
    () => false,
  );
}

// ---------------------------------------------------------------------------
// 注入样式（React 19 <style href precedence> 自动提升到 head；keyframes 不进
// index.css——本件自持，避免为单一组件动效扩全局 token 面）
// ---------------------------------------------------------------------------
const COST_FIGURE_STYLE = `
@keyframes ordo-cost-figure-sweep {
  0% { transform: translateX(-160%); }
  12% { transform: translateX(260%); }
  100% { transform: translateX(260%); }
}
.ordo-cost-roll { display: inline-flex; white-space: pre; line-height: 1.1; }
.ordo-cost-roll-col { display: inline-block; height: 1.1em; overflow: hidden; }
.ordo-cost-roll-stack { display: flex; flex-direction: column; will-change: transform; }
.ordo-cost-roll-cell, .ordo-cost-roll-char { display: block; height: 1.1em; }
.ordo-cost-shine-band { animation: ordo-cost-figure-sweep 2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .ordo-cost-shine-band { animation: none !important; opacity: 0 !important; }
}
`;

// ---------------------------------------------------------------------------
// RollingText —— odometer 式数字滚动（模式参考 affectui-research number-ticker，MIT，
// 只学机制未照抄：无 IntersectionObserver / 无入场动画 / 240ms 预算）。
// 非滚动态（!active）直接渲染文本；滚动态：静态字符原样、数字列纵向滚动到目标值，
// sr-only 文本承载可访问读数（轨道 aria-hidden）。
// ---------------------------------------------------------------------------

type RollPart =
  | { kind: 'digit'; key: string; digit: number }
  | { kind: 'char'; key: string; char: string };

/** "$48,240" → 从右往左拆 parts 并键控（d0/d1…、s0/s1…），个位列身份在位数增长时保持 */
function splitRollParts(text: string): RollPart[] {
  const reversed: RollPart[] = [];
  let digitIndex = 0;
  let charIndex = 0;
  for (const char of Array.from(text).reverse()) {
    if (char >= '0' && char <= '9') {
      reversed.push({ kind: 'digit', key: `d${digitIndex++}`, digit: char.charCodeAt(0) - 48 });
    } else {
      reversed.push({ kind: 'char', key: `s${charIndex++}`, char });
    }
  }
  return reversed.reverse();
}

const mod10 = (n: number) => ((n % 10) + 10) % 10;
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
/** 位数轴位置 → transform（栈内 0-9+尾 0 共 11 格，9→0 上滚时经尾 0 无缝回卷） */
const place = (el: HTMLElement, pos: number) => {
  el.style.transform = `translateY(${(-mod10(pos) / 11) * 100}%)`;
};

interface RollingTextProps {
  /** 格式化后的终值文本（也是 sr-only 可访问读数） */
  text: string;
  /** 原始数值（判定滚动方向：升上滚 / 降下滚） */
  value: number;
  /** true = 运行态滚动；false = 静态直出 */
  active: boolean;
}

function RollingText({ text, value, active }: RollingTextProps) {
  const parts = useMemo(() => splitRollParts(text), [text]);
  const rollsRef = useRef(new Map<string, { pos: number; from: number; to: number }>());
  const stacksRef = useRef(new Map<string, HTMLElement>());
  const prevValueRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      // 退出运行态：清空滚动账目，下次进入时各列直接就位（终态静默）
      rollsRef.current.clear();
      prevValueRef.current = null;
      return;
    }
    const prev = prevValueRef.current;
    prevValueRef.current = value;
    // 首挂：各列已在 ref 回调按目标值就位，不做入场动画（诚实直出，不演假爬升）
    if (prev === null) return;

    const upward = value >= prev;
    const keys = new Set<string>();
    for (const part of parts) {
      if (part.kind !== 'digit') continue;
      keys.add(part.key);
      const roll = rollsRef.current.get(part.key);
      if (!roll) {
        // 位数增长的新列（9.99 → 10.00）：直接就位，不入场
        const fresh = { pos: part.digit, from: part.digit, to: part.digit };
        rollsRef.current.set(part.key, fresh);
        const el = stacksRef.current.get(part.key);
        if (el) place(el, fresh.pos);
        continue;
      }
      const delta = upward ? mod10(part.digit - roll.pos) : -mod10(roll.pos - part.digit);
      roll.from = roll.pos;
      roll.to = roll.pos + delta;
    }
    for (const key of [...rollsRef.current.keys()]) {
      if (!keys.has(key)) rollsRef.current.delete(key);
    }

    const apply = () => {
      for (const [key, roll] of rollsRef.current) {
        const el = stacksRef.current.get(key);
        if (el) place(el, roll.pos);
      }
    };
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ROLL_DURATION_MS);
      const eased = easeOutQuart(t);
      for (const roll of rollsRef.current.values()) {
        roll.pos = roll.from + (roll.to - roll.from) * eased;
      }
      apply();
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [parts, value, active]);

  if (!active) return <span>{text}</span>;

  return (
    <span className="relative">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" data-slot="cost-figure-roll" className="ordo-cost-roll">
        {parts.map((part) =>
          part.kind === 'digit' ? (
            <span key={part.key} className="ordo-cost-roll-col">
              <span
                className="ordo-cost-roll-stack"
                ref={(el) => {
                  if (!el) return;
                  stacksRef.current.set(part.key, el);
                  place(el, rollsRef.current.get(part.key)?.pos ?? part.digit);
                  return () => {
                    if (stacksRef.current.get(part.key) === el) {
                      stacksRef.current.delete(part.key);
                    }
                  };
                }}
              >
                {ROLL_DIGITS.map((n, i) => (
                  <span key={i} className="ordo-cost-roll-cell">
                    {n}
                  </span>
                ))}
              </span>
            </span>
          ) : (
            <span key={part.key} className="ordo-cost-roll-char">
              {part.char}
            </span>
          ),
        )}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// CostFigure 本体
// ---------------------------------------------------------------------------

export interface CostFigureProps extends React.ComponentProps<'span'> {
  /** 金额（币值口径由消费方保证）；null / undefined / 非有限数 = 无数据 */
  amount?: number | null;
  /** token 数（formatCompact 大数缩写）；null / undefined / 非有限数 = 无数据 */
  tokens?: number | null;
  /** ISO 4217 币种码，默认 'USD'（@/lib/format 同默认——本仓 AI 用量成本美元计价） */
  currency?: string;
  /** 运行中：数字滚动 + 微光扫过（爬升中的「活的」成本）；终态省略即静默（§22.2） */
  running?: boolean;
  /** 字阶档（§3.1）：xs=text-2xs（byModel 明细行）/ sm=text-xs（属性值行）/ md=text-sm（统计格） */
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const SIZE_CLASS = {
  xs: 'text-2xs',
  sm: 'text-xs',
  md: 'text-sm',
} as const;

export function CostFigure({
  amount,
  tokens,
  currency = 'USD',
  running = false,
  size = 'sm',
  className,
  ...rest
}: CostFigureProps) {
  const reduceMotion = usePrefersReducedMotion();
  const hasAmount = amount != null && Number.isFinite(amount);
  const hasTokens = tokens != null && Number.isFinite(tokens);
  // 动效只认「有值 + 运行中 + 未要求减少动效」；reduced-motion 直出终值（§22.2 / §7.4）
  const animate = running && (hasAmount || hasTokens) && !reduceMotion;
  const amountText = hasAmount ? formatCurrency(amount, { currency }) : '';
  const tokensText = hasTokens ? formatCompact(tokens) : '';

  return (
    <>
      <style href="ordo-cost-figure" precedence="default">
        {COST_FIGURE_STYLE}
      </style>
      <span
        data-slot="cost-figure"
        data-ai-component="cost-figure"
        data-running={running ? 'true' : undefined}
        className={cn(
          'relative inline-flex max-w-full items-center gap-1 font-mono tabular-nums',
          SIZE_CLASS[size],
          animate && 'overflow-hidden',
          className,
        )}
        {...rest}
      >
        {hasAmount ? <RollingText text={amountText} value={amount} active={animate} /> : null}
        {hasAmount && hasTokens ? (
          <span aria-hidden="true" className="opacity-50">
            ·
          </span>
        ) : null}
        {hasTokens ? <RollingText text={tokensText} value={tokens} active={animate} /> : null}
        {!hasAmount && !hasTokens ? (
          // 诚实降级占位：无数据显「—」，不渲染 0、不整件消失（§22.2 禁造假数）
          <span data-slot="cost-figure-empty">—</span>
        ) : null}
        {animate ? (
          // 微光扫过：每 2s 周期一次（扫过段占 240ms），只动 transform；reduced-motion 不渲染
          <span
            aria-hidden="true"
            data-slot="cost-figure-shine"
            className="ordo-cost-shine-band pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-current to-transparent opacity-20"
          />
        ) : null}
      </span>
    </>
  );
}
