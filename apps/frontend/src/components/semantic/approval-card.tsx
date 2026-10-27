/**
 * ApprovalCard - [AI] 审批操作统一件（组件规划账本 B2 · 宪法 §22.1 等人一等状态律 / §22.4 审阅收场仪式）
 *
 * 「Agent 行动前请示」的统一操作面：风险档 + 行动预览 + 单键批准/拒绝 + 决后收场。
 * - §22.1：待人裁决是一等状态——左侧 3px warning 色条 + 风险档胶囊恒显（不随状态降级为灰）；
 *   风险档复用 ConfidenceSignal 四档枚举但按**风险方向**渲染（3=红 / 2=黄 / 1=蓝 / 0=灰，
 *   与置信方向相反——高风险必须红，消费方只折算枚举，配色内置于本件）。
 * - §22.4 收场仪式：裁决后不得无声消失——先确认覆盖层（约 1s，决定图标 + 文案，
 *   参考 decision-card-shell confirm 模式），再折叠为凭证行（决定 + 时间）。
 * - 双模（宪法 §10.7）：`resolved` 传 undefined = 非受控，仪式由本件自管；
 *   传 null / 'approve' / 'reject' / 'neutral' = 受控，终态由父级数据驱动，本件只发 onResolve 回调。
 * - `onResolve` 返回 Promise 时本件等待落定再进确认态；Promise reject 视为「未落定」回滚待决态
 *   （错误呈现归消费方，见 run-approvals-section 的 toast 先例）。
 */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  Check,
  Minus,
  PauseCircle,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { formatRelativeTime } from '@/shared/lib/date-format';
import { normalizeConfidenceSignal, type ConfidenceSignal } from './ai-verdict-pill';

/** 确认覆盖层停留时长（§22.4 第 1 拍「约 1s」） */
const CONFIRM_MS = 1000;

/** 卡面文案缺省（中文常量，宪法 §16；消费方经 labels 覆写接入 i18n） */
export interface ApprovalCardLabels {
  /** 批准键（动词开头） */
  approve: string;
  /** 拒绝键（破坏性，具体动词） */
  reject: string;
  /** 跳过键（onDismiss 传入才渲染） */
  dismiss: string;
  /** busy 暂停语境提示（AI 链路进行中） */
  busyNote: string;
  /** 确认覆盖层文案（批准） */
  confirmApprove: string;
  /** 确认覆盖层文案（拒绝） */
  confirmReject: string;
  /** 凭证行文案（批准） */
  receiptApprove: string;
  /** 凭证行文案（拒绝） */
  receiptReject: string;
  /** 凭证行缺省文案（neutral 系统处置；消费方应按处置语义覆写 resolvedLabel） */
  receiptNeutral: string;
  /** 风险档文案（0-3 缺省档名；可用 riskLabel 整体覆写） */
  riskUnknown: string;
  riskLow: string;
  riskMedium: string;
  riskHigh: string;
}

const DEFAULT_LABELS: ApprovalCardLabels = {
  approve: '批准',
  reject: '拒绝',
  dismiss: '跳过',
  busyNote: '等待 AI 完成当前步',
  confirmApprove: '已批准',
  confirmReject: '已拒绝',
  receiptApprove: '已批准',
  receiptReject: '已拒绝',
  receiptNeutral: '已关闭',
  riskUnknown: '风险未知',
  riskLow: '低风险',
  riskMedium: '中风险',
  riskHigh: '高风险',
};

/**
 * 风险档 → 胶囊视觉（**风险方向**，§5.3 语义色表状态：高=红 · 中=黄 · 低=蓝 · 未知=中性灰）。
 * 注意与 ai-verdict-pill 的置信方向相反：这里是档越高越危险，故 3 用红而非绿。
 */
const RISK_TIER_VISUALS: Record<ConfidenceSignal, string> = {
  0: 'border-border bg-muted/40 text-content-text-muted',
  1: 'border-accent-blue/30 bg-accent-blue-light/40 text-accent-blue',
  2: 'border-accent-yellow/30 bg-accent-yellow-light/40 text-accent-yellow',
  3: 'border-accent-red/30 bg-accent-red-light/40 text-accent-red',
};

/** 档位图标（§8.5 第 4 条：风险档不得只靠颜色传达——信号格数即档位） */
const RISK_TIER_ICON: Record<ConfidenceSignal, LucideIcon> = {
  0: SignalZero,
  1: SignalLow,
  2: SignalMedium,
  3: SignalHigh,
};

/** 凭证行决定 → 图标 + 色调（§22.4 第 2 拍：决定可视可辨，不靠颜色单通道——图标即决定） */
const RECEIPT_VISUALS: Record<'approve' | 'reject' | 'neutral', { icon: LucideIcon; chip: string; text: string }> = {
  approve: { icon: Check, chip: 'bg-accent-green-light text-accent-green', text: 'text-accent-green' },
  reject: { icon: X, chip: 'bg-accent-red-light text-accent-red', text: 'text-accent-red' },
  neutral: { icon: Minus, chip: 'bg-muted text-content-text-muted', text: 'text-content-text-secondary' },
};

export type ApprovalResolvedState = 'approve' | 'reject' | 'neutral';

export interface ApprovalCardProps {
  /** 请求标题（做什么：如「批准执行 X 的步骤 Y」） */
  title: string;
  /** 请求者（AI 成员名 / 头像等任意节点；缺省不渲染） */
  requester?: ReactNode;
  /** 风险档四档（复用 ConfidenceSignal 枚举，风险方向渲染内置；非法值防御归一）。
   *  null/undefined 折算为 0（「风险未知」灰档）——风险位恒显，不缺席（§22.1）。 */
  riskSignal?: ConfidenceSignal | null;
  /** 风险档文案覆写（如 i18n 的「只读/写操作/高风险」；缺省用内置中文档名） */
  riskLabel?: ReactNode;
  /** AI 附注 / 风险说明（aiJudge advisory 徽注、自报偏差提示等，原样渲染） */
  riskNote?: ReactNode;
  /** 行动预览区（会做什么：命令 / 文件 / 差异摘要） */
  preview?: ReactNode;
  /** AI 链路进行中：显示暂停语境提示 + aria-busy，不阻塞操作（消费方可叠加 disabled） */
  busy?: boolean;
  /** 消费方整体禁用（禁两键、跳过与快捷键） */
  disabled?: boolean;
  /** 审批裁决回调：approve=批准 / reject=拒绝。返回 Promise 时等待落定再进确认态，
   *  reject 视为未决回滚待决态（错误呈现归消费方）。 */
  onResolve?: (action: 'approve' | 'reject') => void | Promise<void>;
  /** 跳过（可选；不传不渲染跳过键） */
  onDismiss?: () => void;
  /** 受控已决态：undefined=非受控（本件自管收场仪式）；null=受控待决；
   *  'approve'/'reject'=受控已决凭证；'neutral'=系统处置收场（过期/取消等非人决）。 */
  resolved?: ApprovalResolvedState | null;
  /** 受控凭证文案覆写（如「已自动通过」「已过期」；缺省按决定给默认文案） */
  resolvedLabel?: ReactNode;
  /** 文案覆写（缺省中文常量） */
  labels?: Partial<ApprovalCardLabels>;
  className?: string;
}

/** 非受控内部状态机：待决 → 提交中（Promise 落定前）→ 确认覆盖层（1s）→ 凭证行 */
type InternalPhase = 'pending' | 'submitting' | 'confirm' | 'done';

/**
 * ApprovalCard —— 审批操作统一件（账本 B2 销账即登记，登记材料见
 * apps/frontend/.roadmap-handoff/approval-card-handoff.md）。
 */
export function ApprovalCard({
  title,
  requester,
  riskSignal,
  riskLabel,
  riskNote,
  preview,
  busy = false,
  disabled = false,
  onResolve,
  onDismiss,
  resolved,
  resolvedLabel,
  labels,
  className,
}: ApprovalCardProps) {
  const L: ApprovalCardLabels = { ...DEFAULT_LABELS, ...labels };
  const tier = normalizeConfidenceSignal(riskSignal ?? 0);
  const RiskIcon = RISK_TIER_ICON[tier];
  const tierLabel = riskLabel ?? [L.riskUnknown, L.riskLow, L.riskMedium, L.riskHigh][tier];

  const controlled = resolved !== undefined;
  const [phase, setPhase] = useState<InternalPhase>('pending');
  const [decided, setDecided] = useState<'approve' | 'reject' | null>(null);
  const [decidedAt, setDecidedAt] = useState<Date | null>(null);
  const confirmTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (confirmTimer.current !== null) window.clearTimeout(confirmTimer.current);
    },
    [],
  );

  const runResolve = (action: 'approve' | 'reject') => {
    // 受控模式：本件只发回调，终态由父级 resolved 数据驱动（§10.7 禁内部缓存受控值）
    if (controlled) {
      void onResolve?.(action);
      return;
    }
    if (phase !== 'pending') return;
    const finish = () => {
      setDecided(action);
      setDecidedAt(new Date());
      setPhase('confirm');
      confirmTimer.current = window.setTimeout(() => setPhase('done'), CONFIRM_MS);
    };
    const result = onResolve?.(action);
    if (result && typeof (result as Promise<void>).then === 'function') {
      // Promise 落定前禁双击；reject = 未落定，回滚待决（错误呈现归消费方）
      setPhase('submitting');
      void (result as Promise<void>).then(finish, () => setPhase('pending'));
    } else {
      finish();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const pending = controlled ? resolved === null : phase === 'pending';
    if (!pending) return;
    // 快捷键不干扰输入框焦点（§8.5）：焦点在输入类控件内时不接管
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT')
    ) {
      return;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      runResolve('approve');
    } else if (event.key === 'Escape') {
      // 卡内 Esc = 拒绝并拦截外层浮层关闭——焦点在卡内时「收场」优先于「离开」
      event.preventDefault();
      event.stopPropagation();
      runResolve('reject');
    }
  };

  /* ── 终态：已决凭证行（§22.4 第 2 拍：决定 + 时间一行凭证，不再可操作）── */
  const receiptAction: ApprovalResolvedState | null = controlled
    ? (resolved ?? null)
    : phase === 'done'
      ? decided
      : null;
  if (receiptAction !== null) {
    const visual = RECEIPT_VISUALS[receiptAction];
    const Icon = visual.icon;
    const text =
      resolvedLabel ??
      (receiptAction === 'approve'
        ? L.receiptApprove
        : receiptAction === 'reject'
          ? L.receiptReject
          : L.receiptNeutral);
    return (
      <div
        data-approval-card=""
        data-approval-state={receiptAction}
        data-risk-tier={tier}
        className={cn(
          'flex items-center gap-2 rounded-md border border-border/60 bg-card px-2.5 py-1.5 text-xs',
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn('flex size-5 shrink-0 items-center justify-center rounded-full', visual.chip)}
        >
          <Icon className="size-3" />
        </span>
        <span className={cn('shrink-0 font-medium', visual.text)}>{text}</span>
        {/* 非受控仪式知道决定时刻；受控数据缺决定时间则不伪造（§9 数据真实性） */}
        {!controlled && decidedAt && (
          <span className="shrink-0 font-mono text-2xs text-content-text-muted">
            {formatRelativeTime(decidedAt)}
          </span>
        )}
        {riskSignal !== null && riskSignal !== undefined && (
          <span
            data-risk-pill=""
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 text-2xs font-medium',
              RISK_TIER_VISUALS[tier],
            )}
          >
            <RiskIcon aria-hidden="true" className="size-2.5" />
            {tierLabel}
          </span>
        )}
        <span className="min-w-0 truncate text-content-text-muted">{title}</span>
      </div>
    );
  }

  const actionBlocked = disabled || phase === 'submitting';

  return (
    <div
      role="group"
      aria-label={title}
      aria-busy={(busy || phase === 'submitting') || undefined}
      data-approval-card=""
      data-approval-state={phase}
      data-risk-tier={tier}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative overflow-hidden rounded-md border border-border/60 bg-card text-xs',
        className,
      )}
    >
      {/* §22.1 等人一等状态：左侧 2px（w-0.5 唯一合法半档）warning 色条——本卡整体就是「等人」件，警示不降级 */}
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-accent-yellow" />

      <div className="flex flex-col gap-1.5 py-2 pr-2.5 pl-3.5">
        {/* 行 1：风险档（恒显）+ 请求者 + busy 暂停语境 */}
        <div className="flex items-center gap-1.5">
          <span
            data-risk-pill=""
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 text-2xs font-medium',
              RISK_TIER_VISUALS[tier],
            )}
          >
            <RiskIcon aria-hidden="true" className="size-2.5" />
            {tierLabel}
          </span>
          {requester && (
            <span className="min-w-0 truncate text-2xs text-content-text-muted">{requester}</span>
          )}
          {busy && (
            <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-2xs text-accent-yellow">
              <PauseCircle aria-hidden="true" className="size-3" />
              {L.busyNote}
            </span>
          )}
        </div>

        {/* 行 2：标题 */}
        <p className="break-words font-medium text-content-text">{title}</p>

        {/* 行 3：行动预览（会做什么） */}
        {preview && (
          <div className="rounded-sm bg-muted/40 px-2 py-1.5 text-2xs break-words text-content-text-secondary">
            {preview}
          </div>
        )}

        {/* 行 4：AI 附注 / 风险说明（advisory 徽注、自报偏差提示等） */}
        {riskNote && (
          <div className="flex flex-wrap items-center gap-1 text-2xs text-content-text-muted">
            {riskNote}
          </div>
        )}

        {/* 行 5：操作区（单键批准/拒绝 + 快捷键提示 + 可选跳过） */}
        <div className="mt-0.5 flex items-center gap-1.5 border-t border-border/40 pt-2">
          <Button
            type="button"
            size="xs"
            disabled={actionBlocked}
            onClick={() => runResolve('approve')}
            data-ai-action="approval-card.approve"
          >
            <Check aria-hidden="true" />
            {L.approve}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="xs"
            disabled={actionBlocked}
            onClick={() => runResolve('reject')}
            data-ai-action="approval-card.reject"
          >
            <X aria-hidden="true" />
            {L.reject}
          </Button>
          {onDismiss && (
            <Button
              type="button"
              variant="quiet"
              size="xs"
              disabled={actionBlocked}
              onClick={onDismiss}
              data-ai-action="approval-card.dismiss"
            >
              {L.dismiss}
            </Button>
          )}
          {/* 快捷键提示：纯视觉记忆辅助，不向读屏重复播报（按钮自身已可达） */}
          <span
            aria-hidden="true"
            className={cn(
              'inline-flex items-center gap-1 text-2xs text-content-text-muted',
              !onDismiss && 'ml-auto',
            )}
          >
            <Kbd>Ctrl</Kbd>
            <Kbd>↵</Kbd>
            <span>{L.approve}</span>
            <Kbd className="ml-1">Esc</Kbd>
            <span>{L.reject}</span>
          </span>
        </div>
      </div>

      {/* ── 决后确认覆盖层（§22.4 第 1 拍）：拦截交互防连点，role="status" 播报决定 ── */}
      {phase === 'confirm' && decided !== null && (
        <div
          role="status"
          data-approval-confirm={decided}
          className={cn(
            'absolute inset-0 z-overlay flex flex-col items-center justify-center gap-2 rounded-md bg-background/85 backdrop-blur-sm duration-normal',
            'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95',
            decided === 'approve' ? 'text-accent-green' : 'text-accent-red',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'flex size-9 items-center justify-center rounded-full shadow-xs',
              decided === 'approve'
                ? 'bg-accent-green-light text-accent-green'
                : 'bg-accent-red-light text-accent-red',
            )}
          >
            {decided === 'approve' ? <Check className="size-5" /> : <X className="size-5" />}
          </span>
          <span className="font-semibold">
            {decided === 'approve' ? L.confirmApprove : L.confirmReject}
          </span>
        </div>
      )}
    </div>
  );
}
