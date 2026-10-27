import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  confidenceToSignal,
  normalizeConfidenceSignal,
  type ConfidenceSignal,
} from './ai-verdict-pill';

/**
 * 档位 → 概率条视觉（§5.3 语义色表状态：无=中性灰 · 弱=黄 · 良=蓝 · 强=绿；
 * 轨道用 -light 配对、填充用本色——与既有黄/紫配对惯例同构）。
 * 档 0 填充用 muted-foreground 中性灰（非语义色，不做状态表达，符合 §5.3）。
 */
const TIER_TRACK: Record<ConfidenceSignal, string> = {
  0: 'bg-muted',
  1: 'bg-accent-yellow-light',
  2: 'bg-accent-blue-light',
  3: 'bg-accent-green-light',
};
const TIER_FILL: Record<ConfidenceSignal, string> = {
  0: 'bg-muted-foreground/60',
  1: 'bg-accent-yellow',
  2: 'bg-accent-blue',
  3: 'bg-accent-green',
};
const TIER_TEXT: Record<ConfidenceSignal, string> = {
  0: 'text-content-text-muted',
  1: 'text-accent-yellow',
  2: 'text-accent-blue',
  3: 'text-accent-green',
};

export interface ConfidenceBarProps {
  /** [轨 A·兼容] 概率 0-1；内部按 A4 口径折算档位渲染（阈值见
   *  ai-verdict-pill 的 CONFIDENCE_SIGNAL_THRESHOLDS，勿在此重复换算）。
   *  有限值照常显示条 + 百分比（越界截断到 [0,1]）；NaN/Infinity 防御性归一为
   *  「无信号」档（四格信号计空档呈现，不再整件消失）。与 signal 同传时 signal 优先。 */
  value?: number;
  /** [轨 B·新增] 四档信号直传（0=无/1=弱/2=良/3=强）：渲染四格信号计（格数=档位，
   *  §8.5 第 4 条档位不靠颜色单独传达），无百分比。运行时经 normalizeConfidenceSignal
   *  防御性归一。 */
  signal?: ConfidenceSignal | null;
  /** 左侧标签（如「AI 预估达成」）；缺省用「AI 预估」 */
  label?: string;
  /** 隐藏右侧百分比数字（空间紧张的行内/选项内嵌场景；仅轨 A 数值态有效） */
  hidePercent?: boolean;
  className?: string;
}

/**
 * ConfidenceBar - [AI] JEV 概率条（CAP-A-27 扩展批；组件规划账本 A4 四档信号升级）
 * 轨 A（数值）：0-100% 细条 + 百分比，色随折算档位（原紫系 AI 标识色按 A4 退役为
 * 四档语义色：无=灰 · 弱=黄 · 良=蓝 · 强=绿）；轨 B（直传档）：四格信号计，格数即档位。
 * tooltip 恒挂 advisory 声明（保留不动）。手搓 div 条与 completion-review
 * 既有范式一致，不走 base-ui Indicator 的值注入（细条场景几何需自持）。
 */
export function ConfidenceBar({
  value,
  signal,
  label,
  hidePercent,
  className,
}: ConfidenceBarProps) {
  const { t } = useTranslation();
  const direct = signal !== null && signal !== undefined;
  const tier: ConfidenceSignal | null = direct
    ? normalizeConfidenceSignal(signal)
    : value === undefined
      ? null
      : confidenceToSignal(value);
  if (tier === null) return null;
  const level: ConfidenceSignal = tier;
  // 轨 A 数值态：有限值照常条 + 百分比；NaN/直传档走四格信号计（无诚实数字可显）
  const numeric = !direct && value !== undefined && Number.isFinite(value);
  const pct = numeric ? Math.max(0, Math.min(1, value as number)) : null;
  const pct100 = pct !== null ? Math.round(pct * 100) : null;
  const resolvedLabel = label ?? t('aiJudge.estimatedProbability');
  return (
    <span
      title={t('aiJudge.advisoryTooltip')}
      data-ai-component="confidence-bar"
      data-confidence={pct ?? undefined}
      data-confidence-signal={level}
      className={cn('inline-flex items-center gap-1.5 select-none', className)}
    >
      {resolvedLabel && (
        <span className="shrink-0 text-2xs text-content-text-muted">
          {resolvedLabel}
        </span>
      )}
      {numeric ? (
        <span
          className={cn(
            'relative inline-block h-1 w-14 shrink-0 overflow-hidden rounded-full',
            TIER_TRACK[level],
          )}
        >
          <span
            className={cn(
              'absolute inset-y-0 left-0 rounded-full',
              TIER_FILL[level],
            )}
            style={{ width: `${pct100}%` }}
          />
        </span>
      ) : (
        <span aria-hidden className="flex shrink-0 items-center gap-0.5">
          {([1, 2, 3, 4] as const).map((cell) => (
            <span
              key={cell}
              className={cn(
                'h-1 w-2.5 rounded-xs',
                cell <= level ? TIER_FILL[level] : 'bg-muted',
              )}
            />
          ))}
        </span>
      )}
      {!hidePercent && pct100 !== null && (
        <span
          className={cn(
            'shrink-0 font-mono text-2xs tabular-nums',
            TIER_TEXT[level],
          )}
        >
          {pct100}%
        </span>
      )}
    </span>
  );
}
