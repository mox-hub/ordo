/**
 * 运行时间轴 —— 模型/工具双行活动条（对照运行详情设计稿中部）+ 运行中步骤 live 计时条。
 * 纯展示组件，数据由 computeTimelineRows 计算。
 *
 * 活性可感知（设计宪法 §22.5）：运行中步骤具备 live 计时器 + 呼吸脉冲状态点，
 * 步骤状态迁移经 sr-only 的 role="status" aria-live="polite" 播报；
 * 呼吸动效用 Tailwind animate-pulse（run-status.tsx 同款先例），
 * prefers-reduced-motion 由 index.css 全局规则静止，组件不绕过。
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatLiveDuration as formatLiveDurationMs } from '@/lib/format';
import type { ExecutionStepRecord } from '../api/execution-api';
import {
  computeTimelineRows,
  formatDurationMs,
  type TimelineRowData,
} from './run-details-format';

const BAR_TONE_CLASS: Record<TimelineRowData['bars'][number]['tone'], string> = {
  model: 'bg-accent-green',
  tools: 'bg-accent-blue',
  error: 'bg-accent-red',
};

const ROW_LABEL_KEY = {
  model: 'runDetails.timeline.model',
  tools: 'runDetails.timeline.tools',
} as const;

/** 运行中步骤条默认标签（组件内中文常量，runningLabel 可覆写，§16 新增文案规约） */
const DEFAULT_RUNNING_LABEL = '运行中';

/** 状态迁移播报默认模板（§22.5，组件内中文常量，announceTemplates 可覆写） */
const DEFAULT_ANNOUNCE_TEMPLATES = {
  started: '步骤 {name} 开始',
  completed: '步骤 {name} 完成，用时 {duration}',
  failed: '步骤 {name} 失败',
} as const;

/** 状态迁移播报模板覆写（{name}/{duration} 占位符） */
export interface RunTimelineAnnounceTemplates {
  started?: string;
  completed?: string;
  failed?: string;
}

/**
 * live 计时 hook：约 100ms tick；startedAt 注入起点；endAt 给出即终态定格
 * （静态差值，不再挂 interval）。步骤离开 running 态时行卸载，
 * 回落到 step.duration 的服务端终值，双路径定格。
 */
function useStopwatch({
  startedAt,
  endAt,
}: {
  startedAt?: string | null;
  endAt?: string | null;
}): number | null {
  const startMs = useMemo(() => {
    if (!startedAt) return null;
    const ms = new Date(startedAt).getTime();
    return Number.isFinite(ms) ? ms : null;
  }, [startedAt]);
  // 惰性初值取挂载时刻，之后仅由 interval 更新（渲染期保持稳定）
  const [nowMs, setNowMs] = useState(() => Date.now());
  const live = startMs != null && !endAt;

  useEffect(() => {
    if (!live) return;
    // 首拍在 100ms 内到，不做 effect 内同步 setState（避免级联渲染）
    const timer = window.setInterval(() => setNowMs(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [live]);

  if (startMs == null) return null;
  if (endAt) {
    const endMs = new Date(endAt).getTime();
    if (Number.isFinite(endMs)) return Math.max(0, endMs - startMs);
  }
  return Math.max(0, nowMs - startMs);
}

/**
 * 渐进精度时长（屏幕端 live 计时展示，§14.4 配 tabular-nums）：
 * <1s 毫秒 → <60s 0.1s → 分 → 时 → 天。
 *
 * 账本 G3 收编：口径唯一真相源是 `@/lib/format` 的 `formatLiveDuration`
 * （无效输入返回 `''`、负值钳 0、≥24h 有天档）；保留历史导出名 re-export，
 * 消费方（含测试）零破坏。
 */
export { formatLiveDurationMs };

/** 播报用中文时长（读屏友好，与屏幕端紧凑形态分开） */
function formatAnnounceDurationMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} 毫秒`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} 秒`;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} 小时 ${minutes} 分`;
  return `${minutes} 分 ${String(seconds).padStart(2, '0')} 秒`;
}

function fillTemplate(template: string, name: string, duration: string): string {
  return template.replaceAll('{name}', name).replaceAll('{duration}', duration);
}

/** 运行中步骤行：呼吸脉冲状态点 + 名称 + live 计时（font-mono tabular-nums） */
function RunningStepRow({ step }: { step: ExecutionStepRecord }) {
  const elapsed = useStopwatch({ startedAt: step.startedAt });
  const label = step.name ?? step.stepType;
  return (
    <div className="flex items-center gap-2" data-testid="run-timeline-running-step">
      {/* 呼吸脉冲状态点（§22.5）：motion-safe 限定——prefers-reduced-motion 下静止
          （index.css 全局 reduce 规则只覆盖 .motion-* 家族，不含 Tailwind 内置 keyframe） */}
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full bg-accent-blue motion-safe:animate-pulse"
      />
      <span className="min-w-0 truncate text-2xs text-content-text-secondary">{label}</span>
      {elapsed != null ? (
        <span className="ml-auto shrink-0 font-mono text-2xs tabular-nums text-accent-blue">
          {formatLiveDurationMs(elapsed)}
        </span>
      ) : null}
    </div>
  );
}

function TimelineTrack({ row }: { row: TimelineRowData }) {
  if (row.bars.length === 0) {
    return (
      <div className="h-2.5 flex-1 rounded-full bg-muted/50" />
    );
  }
  return (
    <div className="relative h-2.5 flex-1 rounded-full bg-muted/50">
      {row.bars.map((bar) => (
        <span
          key={bar.key}
          title={bar.name}
          className={cn(
            'absolute inset-y-0 rounded-full',
            BAR_TONE_CLASS[bar.tone],
          )}
          style={{ left: `${bar.leftPct}%`, width: `${bar.widthPct}%` }}
        />
      ))}
    </div>
  );
}

/** 步骤完成时的耗时：服务端 duration 优先，缺失时 started→completed 差值兜底 */
function stepDurationMs(step: ExecutionStepRecord): number | undefined {
  if (step.duration != null && Number.isFinite(step.duration) && step.duration >= 0) {
    return step.duration;
  }
  if (!step.startedAt || !step.completedAt) return undefined;
  const start = new Date(step.startedAt).getTime();
  const end = new Date(step.completedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return undefined;
  return end - start;
}

/** 步骤状态快照（播报 diff 用） */
type StepStatusSnapshot = Array<{ id: string; status: string }>;

function toSnapshot(steps: ExecutionStepRecord[]): StepStatusSnapshot {
  return steps.map((step) => ({ id: step.id, status: step.status }));
}

/**
 * 步骤状态迁移 → 播报文案（纯函数）。迁移规则：迁入 running 播「开始」、迁入 failed 播「失败」、
 * running → completed 播「完成，用时 N」；首见 running/failed 也播报（打开弹窗/新失败步骤），
 * 首见 completed 静默（避免历史回放刷屏）。
 */
function diffStepAnnouncements(
  prev: StepStatusSnapshot,
  steps: ExecutionStepRecord[],
  templates?: RunTimelineAnnounceTemplates,
): string[] {
  const prevMap = new Map(prev.map((x) => [x.id, x.status] as const));
  const messages: string[] = [];
  for (const step of steps) {
    const before = prevMap.get(step.id);
    if (before === step.status) continue;
    const name = step.name ?? step.stepType;
    if (step.status === 'running') {
      messages.push(
        fillTemplate(templates?.started ?? DEFAULT_ANNOUNCE_TEMPLATES.started, name, ''),
      );
    } else if (step.status === 'failed') {
      messages.push(
        fillTemplate(templates?.failed ?? DEFAULT_ANNOUNCE_TEMPLATES.failed, name, ''),
      );
    } else if (step.status === 'completed' && before === 'running') {
      const durationMs = stepDurationMs(step);
      messages.push(
        fillTemplate(
          templates?.completed ?? DEFAULT_ANNOUNCE_TEMPLATES.completed,
          name,
          durationMs != null ? formatAnnounceDurationMs(durationMs) : '',
        ),
      );
    }
  }
  return messages;
}

export function RunTimeline({
  steps,
  windowStart,
  windowEnd,
  announceTemplates,
  runningLabel = DEFAULT_RUNNING_LABEL,
  className,
}: {
  steps: ExecutionStepRecord[];
  windowStart: string;
  windowEnd: string;
  /** 状态迁移播报文案覆写（默认组件内中文常量） */
  announceTemplates?: RunTimelineAnnounceTemplates;
  /** 运行中步骤条标签覆写（默认「运行中」） */
  runningLabel?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const rows = computeTimelineRows(steps, windowStart, windowEnd);
  const runningSteps = useMemo(
    () => steps.filter((step) => step.status === 'running'),
    [steps],
  );

  // 状态迁移播报（§22.5）：React 官方「props 变化时调整状态」渲染期派生模式——
  // 播报文案与步骤变化同一 commit 提交（读屏及时性），无 effect 级联渲染
  const [announcer, setAnnouncer] = useState<{
    prev: StepStatusSnapshot;
    announcement: string;
  }>({ prev: [], announcement: '' });
  const nextSnapshot = toSnapshot(steps);
  const unchanged =
    announcer.prev.length === nextSnapshot.length &&
    announcer.prev.every(
      (item, i) =>
        item.id === nextSnapshot[i].id && item.status === nextSnapshot[i].status,
    );
  if (!unchanged) {
    const messages = diffStepAnnouncements(
      announcer.prev,
      steps,
      announceTemplates,
    );
    setAnnouncer({
      prev: nextSnapshot,
      announcement:
        messages.length > 0 ? messages.join('；') : announcer.announcement,
    });
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* 状态迁移播报（§22.5）：sr-only live region，迁移时经 aria-live polite 播报 */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcer.announcement}
      </div>
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-3">
          <div className="w-10 shrink-0 text-right">
            <p className="text-2xs text-content-text-secondary">
              {t(ROW_LABEL_KEY[row.key])}
            </p>
            {row.totalMs > 0 ? (
              <p className="text-3xs text-content-text-muted">
                {formatDurationMs(row.totalMs)}
              </p>
            ) : null}
          </div>
          <TimelineTrack row={row} />
        </div>
      ))}
      {runningSteps.length > 0 ? (
        <div className="flex items-start gap-3" data-testid="run-timeline-live-strip">
          <div className="w-10 shrink-0 pt-0.5 text-right">
            <p className="text-2xs text-accent-blue">{runningLabel}</p>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            {runningSteps.map((step) => (
              <RunningStepRow key={step.id} step={step} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
