import { Lock } from 'lucide-react';
import { useRef } from 'react';
import type React from 'react';

import { RawButton } from '@/components/raw/raw-button';
import { cn } from '@/lib/utils';

/**
 * AutonomyDial - [AI] 自治边界拨盘（组件规划账本 B5，需求卡 B-07 三级分级授权）。
 *
 * 回答「哪些动作它可以自己跑、哪些必先问我」的运行时边界操作 UI：三档段选拨盘——
 * 锁定必问（locked）/ 先问我（ask）/ 自己跑（auto），从严到宽左→右排列；
 * locked 档带 lucide Lock 锁形标识（§6.1）。视觉语言对齐 ui/segmented-control
 * 的 pill 滑块（rect 变体）：滑块 translateX 归位表达「档位间滑动」。
 *
 * **数据契约（真实形状，不造配置模型）**：B-07 授权配置的唯一持久化形状是
 * `Member.trustLevel`（1=观察者 / 2=协助者 / 3=受托者，`PATCH /members/:id` 写入，
 * server trust.service 只认三级数值）。本件是通用语义件，value 走自治语义词表
 * `AutonomyLevel`；真实档位 ↔ 自治档位的映射（受托者=auto / 协助者=ask /
 * 观察者=locked，1:1 无损）由消费方持有——领域词表不进语义层。
 *
 * **样例滑轨**：samples（该成员近期真实动作 + 落档）存在时在拨盘下方一行小字展示
 * 「它的真实行为分布」——色点表档位 + sr-only 档位名兜底（§8.5#4 不只靠颜色），
 * 纯展示不可点（无 button 语义、零交互）。
 *
 * **受控约定**：value 必受控（本件是授权配置入口，不持有态；§10.7「受控须同时
 * 支持非受控」在本件被任务裁决豁免——配置入口做非受控会出现「界面已切档、持久化
 * 未跟」的双真相）。禁在组件内部 useState 缓存传入值（§10.7）。
 *
 * **a11y（§8.5）**：`role="radiogroup"` + 三 `role="radio"` + `aria-checked`；
 * roving tabindex（选中档 tabIndex=0，其余 -1）+ 方向键 / Home / End 切档
 * （焦点随选择移动，APG radiogroup 模式；与 ui/stepper 同款手办——role=radio 的
 * button 不自然获得原生方向键行为，须手动实现）。disabled 时各档 aria-disabled、
 * 原生 disabled 兜底、整件退出键盘流。焦点可见走 `focus-visible:ring-ring`（§8.1）。
 *
 * 原语通道：段位是「非动作钮」（radio 语义把手），经 RawButton（原语层出口，
 * 语义件既定通道）渲染；...props 透传根元素（§10.7）；文案中文常量 + labels 覆写
 * （§16）。
 */

/** 自治档位：locked=锁定必问 / ask=先问我 / auto=自己跑（拨盘从左到右由严到宽） */
export type AutonomyLevel = 'locked' | 'ask' | 'auto';

/** 样例：该成员近期一条真实动作 + 它落在的档位（展示「真实行为分布」，不可点） */
export interface AutonomySample {
  label: string;
  level: AutonomyLevel;
}

/** 单档文案覆写：label=档名、desc=一句人话说明 */
export interface AutonomyLevelLabels {
  label?: string;
  desc?: string;
}

export interface AutonomyDialLabels {
  /** 读屏组名（radiogroup 可访问名），默认「自治边界」 */
  group?: string;
  /** 样例滑轨前缀标题，默认「近期动作」 */
  samples?: string;
  locked?: AutonomyLevelLabels;
  ask?: AutonomyLevelLabels;
  auto?: AutonomyLevelLabels;
}

export interface AutonomyDialProps extends React.ComponentProps<'div'> {
  /** 当前档位（必受控：本件是授权配置入口，不持有态） */
  value: AutonomyLevel;
  /** 切档回调（点击 / 方向键 / Home / End 均走此处） */
  onValueChange: (level: AutonomyLevel) => void;
  /** 该成员近期真实动作样例（可选）；缺席则不渲染样例滑轨 */
  samples?: AutonomySample[];
  /** 锁定档说明（为什么锁定）；仅在当前档为 locked 时显示 */
  lockedLabel?: string;
  /** 尺寸档：sm=对话框/卡片内 / md=面板默认 */
  size?: 'sm' | 'md';
  /** 整件禁用（各档 aria-disabled + 原生 disabled，退出键盘流） */
  disabled?: boolean;
  /** 文案覆写（§16：默认中文常量，消费方可覆写为 i18n 词条） */
  labels?: AutonomyDialLabels;
  className?: string;
}

/** 拨盘档序：从左到右由严到宽（锁定必问 → 先问我 → 自己跑） */
const LEVEL_ORDER: readonly AutonomyLevel[] = ['locked', 'ask', 'auto'];

/** 默认文案（§16 中文常量；labels 逐档覆写） */
const DEFAULT_LEVEL_TEXT: Record<AutonomyLevel, Required<AutonomyLevelLabels>> = {
  locked: { label: '锁定必问', desc: '一切动作先问，不可自助' },
  ask: { label: '先问我', desc: '每步先给你确认' },
  auto: { label: '自己跑', desc: '按它的信任等级直接执行' },
};

/** 档位语义色（§5.3 分类语义）：locked=黄（谨慎）/ ask=蓝（常规）/ auto=绿（受托），
 *  与 TrustLevelBadge 三级配色同源（观察者黄 / 协助者蓝 / 受托者绿） */
const LEVEL_TONE: Record<AutonomyLevel, { slider: string; text: string; dot: string }> = {
  locked: {
    slider: 'border-accent-yellow/50 bg-accent-yellow-light',
    text: 'text-accent-yellow',
    dot: 'bg-accent-yellow',
  },
  ask: {
    slider: 'border-accent-blue/40 bg-accent-blue-light',
    text: 'text-accent-blue',
    dot: 'bg-accent-blue',
  },
  auto: {
    slider: 'border-accent-green/40 bg-accent-green-light',
    text: 'text-accent-green',
    dot: 'bg-accent-green',
  },
};

/** 尺寸档：字号与图标 px 软配对（§6.2：text-xs 配 14px / text-2xs 配 12px） */
const SIZE_CLASS: Record<NonNullable<AutonomyDialProps['size']>, {
  label: string;
  desc: string;
  icon: string;
}> = {
  sm: { label: 'text-xs', desc: 'text-2xs', icon: 'size-3' },
  md: { label: 'text-sm', desc: 'text-xs', icon: 'size-3.5' },
};

export function AutonomyDial({
  value,
  onValueChange,
  samples,
  lockedLabel,
  size = 'md',
  disabled = false,
  labels,
  className,
  ...rest
}: AutonomyDialProps) {
  const segmentRefs = useRef(new Map<AutonomyLevel, HTMLButtonElement>());

  // 未知值防御：钳到最严档（locked），不渲染幽灵选中态
  const activeIndex = Math.max(0, LEVEL_ORDER.indexOf(value));
  const activeTone = LEVEL_TONE[LEVEL_ORDER[activeIndex]];
  const sizeClass = SIZE_CLASS[size];
  const levelText = (level: AutonomyLevel): Required<AutonomyLevelLabels> => ({
    ...DEFAULT_LEVEL_TEXT[level],
    ...labels?.[level],
  });

  /** APG radiogroup：方向键 / Home / End 切档，焦点随选择移动 */
  const moveTo = (index: number) => {
    const next = Math.min(Math.max(index, 0), LEVEL_ORDER.length - 1);
    onValueChange(LEVEL_ORDER[next]);
    segmentRefs.current.get(LEVEL_ORDER[next])?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const currentIndex = LEVEL_ORDER.indexOf(value);
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        moveTo(currentIndex + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        moveTo(currentIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        moveTo(0);
        break;
      case 'End':
        event.preventDefault();
        moveTo(LEVEL_ORDER.length - 1);
        break;
    }
  };

  return (
    <div
      data-slot="autonomy-dial"
      data-ai-component="autonomy-dial"
      data-value={value}
      {...rest}
      role="radiogroup"
      aria-label={labels?.group ?? '自治边界'}
      aria-disabled={disabled || undefined}
      onKeyDown={(event) => {
        handleKeyDown(event);
        rest.onKeyDown?.(event);
      }}
      className={cn('w-full', className)}
    >
      {/* 滑块轨道：视觉语言对齐 segmented-control rect 变体（inset 半格 + tone 滑块） */}
      <div className="relative grid w-full grid-cols-3 overflow-hidden rounded-lg border border-border bg-muted/50 p-0.5">
        <span
          aria-hidden="true"
          data-slot="autonomy-dial-slider"
          className={cn(
            'pointer-events-none absolute inset-y-0.5 left-0.5 rounded-sm border bg-muted/50 shadow-xs transition-transform duration-slow ease-out',
            activeTone.slider,
          )}
          style={{
            width: 'calc((100% - 4px) / 3)',
            transform: `translateX(calc(${activeIndex} * 100%))`,
          }}
        />
        {LEVEL_ORDER.map((level) => {
          const text = levelText(level);
          return (
            <RawButton
              key={level}
              ref={(el) => {
                if (el) segmentRefs.current.set(level, el);
                else segmentRefs.current.delete(level);
              }}
              role="radio"
              aria-checked={value === level}
              aria-disabled={disabled || undefined}
              disabled={disabled}
              tabIndex={disabled ? -1 : value === level ? 0 : -1}
              onClick={() => onValueChange(level)}
              data-slot="autonomy-dial-option"
              data-level={level}
              className={cn(
                'relative z-sticky flex flex-col items-center gap-0.5 rounded-sm px-2 py-1.5 text-center outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                value === level
                  ? activeTone.text
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className={cn('inline-flex items-center gap-1 font-medium', sizeClass.label)}>
                {level === 'locked' ? (
                  <Lock data-slot="autonomy-dial-lock" aria-hidden="true" className={sizeClass.icon} />
                ) : null}
                {text.label}
              </span>
              <span className={cn('leading-snug', sizeClass.desc)}>{text.desc}</span>
            </RawButton>
          );
        })}
      </div>

      {/* 锁定档说明（为什么锁定）：仅当前档为 locked 时出现 */}
      {value === 'locked' && lockedLabel ? (
        <p
          data-slot="autonomy-dial-locked-note"
          className="mt-1.5 flex items-start gap-1 text-2xs leading-snug text-muted-foreground"
        >
          <Lock aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
          {lockedLabel}
        </p>
      ) : null}

      {/* 样例滑轨：近期真实动作落在哪档（色点 + sr-only 档名兜底 §8.5#4）；仅展示不可点 */}
      {samples?.length ? (
        <div
          data-slot="autonomy-dial-samples"
          className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1"
        >
          <span className="text-2xs text-muted-foreground">{labels?.samples ?? '近期动作'}</span>
          {samples.map((sample, index) => (
            <span
              key={`${sample.label}-${index}`}
              title={`${sample.label}（${levelText(sample.level).label}）`}
              className="inline-flex items-center gap-1 text-2xs text-muted-foreground"
            >
              <span
                aria-hidden="true"
                className={cn('size-1.5 shrink-0 rounded-full', LEVEL_TONE[sample.level].dot)}
              />
              {sample.label}
              <span className="sr-only">（{levelText(sample.level).label}）</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
