import {
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/**
 * 四档置信信号枚举（宪法 §22 / 组件规划账本 A4，CAP-A-27 JEV）：
 * 0=无信号 · 1=弱信号 · 2=良信号 · 3=强信号。
 * AI 置信度本就是模糊量——四档枚举比伪精度小数诚实，且对脏数据免疫。
 */
export type ConfidenceSignal = 0 | 1 | 2 | 3;

/**
 * 数值置信度 → 档位折算口径（**集中定义处**，ai-verdict-pill / confidence-bar 两件共用，
 * 供后续统一调整）：0-1 口径下 ≥0.85 → 强 / ≥0.60 → 良 / ≥0.30 → 弱 / 其余 → 无信号。
 * 后端 0-100 概率等价 ≥85 / ≥60 / ≥30——调用方先 /100 再传入（仓内既有调用
 * `probability / 100` 已是此口径，勿在组件内重复换算）。
 * 低置信标注（aiJudge.lowConfidence）= 弱信号（档 1）。
 */
export const CONFIDENCE_SIGNAL_THRESHOLDS = {
  strong: 0.85,
  fair: 0.6,
  weak: 0.3,
} as const;

/**
 * 防御性归一：任何输入收敛到合法档（0-3）。
 * Number() 转换（字符串数字可救）→ NaN/Infinity → 0（无信号）→ round + clamp。
 * 例：NaN→0 · -1→0 · 7→3 · 2.6→3 · "2"→2。
 */
export function normalizeConfidenceSignal(input: unknown): ConfidenceSignal {
  const n = Number(input);
  if (!Number.isFinite(n)) return 0;
  return Math.min(3, Math.max(0, Math.round(n))) as ConfidenceSignal;
}

/**
 * 0-1 数值置信度 → 档位（轨 A 兼容折算，阈值见 {@link CONFIDENCE_SIGNAL_THRESHOLDS}）。
 * null/undefined = 「无置信度」缺席语义，返回 null（区别于「有值但收敛到无信号」的 0）；
 * 非法值（NaN/负数/越界）防御性归一：NaN→无信号、负数→无信号、>1 折算落强档。
 */
export function confidenceToSignal(
  value: number | null | undefined,
): ConfidenceSignal | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= CONFIDENCE_SIGNAL_THRESHOLDS.strong) return 3;
  if (n >= CONFIDENCE_SIGNAL_THRESHOLDS.fair) return 2;
  if (n >= CONFIDENCE_SIGNAL_THRESHOLDS.weak) return 1;
  return 0;
}

/** 档位 → 胶囊视觉（§5.3 语义色表状态：无=中性灰 · 弱=黄 · 良=蓝 · 强=绿）。 */
const TIER_PILL_VISUALS: Record<ConfidenceSignal, string> = {
  0: 'border-border bg-muted/40 text-content-text-muted',
  1: 'border-accent-yellow/30 bg-accent-yellow-light/40 text-accent-yellow',
  2: 'border-accent-blue/30 bg-accent-blue-light/40 text-accent-blue',
  3: 'border-accent-green/30 bg-accent-green-light/40 text-accent-green',
};

/** 档位 → 信号图标（§8.5 第 4 条：档位不得只靠颜色传达——图标格数即档位）。 */
const TIER_SIGNAL_ICON: Record<ConfidenceSignal, LucideIcon> = {
  0: SignalZero,
  1: SignalLow,
  2: SignalMedium,
  3: SignalHigh,
};

export interface AiVerdictPillProps {
  /** 判定文案（调用方按场景翻译结论，如「建议批准」「benign」） */
  label: string;
  /** [轨 A·兼容] 置信度 0-1；内部按 A4 口径折算档位渲染（阈值见 CONFIDENCE_SIGNAL_THRESHOLDS），
   *  有限值照常显示百分比。null/undefined = 无置信度（不渲染百分比）。
   *  非法值（NaN/越界/负数）防御性归一，绝不产出「NaN%」类垃圾输出。 */
  confidence?: number | null;
  /** [轨 B·新增] 四档信号直传（0=无/1=弱/2=良/3=强），优先于 confidence；
   *  直传态以信号图标呈现（不渲染百分比）。运行时经 normalizeConfidenceSignal 防御性归一。 */
  signal?: ConfidenceSignal | null;
  size?: 'xs' | 'sm';
  className?: string;
}

/**
 * AiVerdictPill - [AI] JEV 快速判断徽注（CAP-A-27 扩展批；组件规划账本 A4 四档信号升级）
 * 离散判定 + 四档置信信号的统一呈现；tooltip 恒挂「仅辅助参考」advisory 声明（保留不动）；
 * 视觉四档：无信号=中性灰 · 弱=黄（标低置信）· 良=蓝 · 强=绿（§5.3 语义色，非装饰用色）。
 * 无判定时由调用方整块隐藏——本组件不渲染「AI 失败」噪音。
 * 双轨入参：confidence（0-1 数值，展示层折算）或 signal（档位直传），signal 优先。
 */
export function AiVerdictPill({
  label,
  confidence,
  signal,
  size = 'sm',
  className,
}: AiVerdictPillProps) {
  const { t } = useTranslation();
  const direct = signal !== null && signal !== undefined;
  const tier: ConfidenceSignal | null = direct
    ? normalizeConfidenceSignal(signal)
    : confidenceToSignal(confidence);
  const hasConfidence = tier !== null;
  const level: ConfidenceSignal = tier ?? 0;
  // 轨 A 数值态：有限置信度照常显示百分比（NaN/直传档不显示——前者无诚实数字，后者无原始值）
  const numeric =
    !direct && hasConfidence && confidence != null && Number.isFinite(confidence);
  const SignalIcon = TIER_SIGNAL_ICON[level];
  return (
    <span
      title={t('aiJudge.advisoryTooltip')}
      data-ai-component="ai-verdict-pill"
      data-confidence={numeric ? confidence : undefined}
      data-confidence-signal={hasConfidence ? level : undefined}
      className={cn(
        'inline-flex max-w-full shrink-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 font-medium',
        TIER_PILL_VISUALS[level],
        size === 'xs' ? 'text-2xs' : 'text-xs',
        className,
      )}
    >
      <Sparkles className={cn('shrink-0', size === 'xs' ? 'size-2.5' : 'size-3')} />
      <span className="truncate">{label}</span>
      {numeric && (
        <span className="font-mono tabular-nums opacity-80">
          {Math.round((confidence as number) * 100)}%
        </span>
      )}
      {direct && (
        <SignalIcon
          aria-hidden
          className={cn('shrink-0', size === 'xs' ? 'size-2.5' : 'size-3')}
        />
      )}
      {level === 1 && (
        <span className="shrink-0 text-2xs opacity-90">{t('aiJudge.lowConfidence')}</span>
      )}
    </span>
  );
}
