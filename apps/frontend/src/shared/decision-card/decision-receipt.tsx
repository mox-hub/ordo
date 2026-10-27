/**
 * 决策凭证行（审阅收场仪式 §22.4 第 2 拍）：决定不无声消失——
 * 卡片离场后在原位折叠为一行凭证：决定图标 + 决定文案 + 主题 + 时间 + 决定人 + 撤销入口。
 * 被 DecisionCard（单卡收场）与 DecisionDeckStack（连批凭证条）共用。
 *
 * 文案采用组件内中文常量 + props 覆写（i18n 登记批统一接入）；
 * 决定文案缺省与印章同源（decision.review.passStamp / rejectStamp）。
 */
import './decision-card.css';
import { Check, History, Minus, Undo2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { DecisionOutcome, DecisionReceiptData } from './types';

/** 审阅收场仪式文案（中文缺省，props 可覆写；i18n 登记批统一接入） */
export interface DecisionCeremonyTexts {
  /** Undo 按钮文案 */
  undo: string;
  /** 决定人缺省名（当前操作者） */
  actor: string;
  /** 待决计数播报（n = 剩余待决数） */
  pendingLive: (n: number) => string;
  /** 队列清空播报 */
  doneLive: string;
  /** 完成态批阅计数（n = 本次已处理数） */
  batchDone: (n: number) => string;
}

export const DEFAULT_CEREMONY_TEXTS: DecisionCeremonyTexts = {
  undo: '撤销',
  actor: '我',
  pendingLive: (n) => `${n} 项待处理`,
  doneLive: '全部处理完',
  batchDone: (n) => `本次批阅 ${n} 项`,
};

/** 中性结果的展示文案（i18n 键注入前的中文缺省） */
export const NEUTRAL_RECEIPT_LABEL = '已处理';

const OUTCOME_ICON: Record<DecisionOutcome, typeof Check> = {
  passed: Check,
  rejected: X,
  neutral: Minus,
};

const OUTCOME_CLS: Record<DecisionOutcome, string> = {
  passed: 'text-accent-green bg-accent-green-light',
  rejected: 'text-accent-red bg-accent-red-light',
  neutral: 'text-content-text-secondary bg-content-bg-secondary',
};

export interface DecisionReceiptRowProps {
  receipt: DecisionReceiptData;
  /** 传入即渲染撤销入口（由消费方决定是否可撤销，§22.4） */
  onUndo?: (receipt: DecisionReceiptData) => void;
  /** Undo 按钮文案；缺省取 DEFAULT_CEREMONY_TEXTS.undo */
  undoLabel?: string;
  /** 决定人缺省名覆写 */
  actorLabel?: string;
  className?: string;
}

/** 主题截断：凭证行只留一行，超出省略（完整标题在决定前的卡面上已读过） */
function truncate(text: string, max = 32): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * 凭证行：决定 + 主题 + 时间 + 决定人（+ 撤销入口）。
 * `data-decision-receipt` / `data-decision-id` 供行为测试与回放定位。
 */
export function DecisionReceiptRow({
  receipt,
  onUndo,
  undoLabel,
  actorLabel,
  className,
}: DecisionReceiptRowProps) {
  const { t } = useTranslation();
  const Icon = OUTCOME_ICON[receipt.outcome];
  const label =
    receipt.label ??
    (receipt.outcome === 'neutral'
      ? NEUTRAL_RECEIPT_LABEL
      : t(
          receipt.outcome === 'passed'
            ? 'decision.review.passStamp'
            : 'decision.review.rejectStamp',
        ));
  const time = new Date(receipt.resolvedAt);
  // 决定时间：当日只给时分，跨日给月日时分（决策是当日操作，默认读法是「刚做的」）
  const timeText = Number.isNaN(time.getTime())
    ? '—'
    : new Date().toDateString() === time.toDateString()
      ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : time.toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div
      data-decision-receipt=""
      data-decision-id={receipt.decision.id}
      data-decision-outcome={receipt.outcome}
      className={cn(
        'decision-receipt-in flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-xs',
        className,
      )}
    >
      {/* 决定图标 + 文案（状态不只靠颜色，§5.3/§8.5：图标 + 文案 + 语义色三重编码） */}
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full',
          OUTCOME_CLS[receipt.outcome],
        )}
      >
        <Icon className="size-3" />
      </span>
      <span
        className={cn(
          'shrink-0 font-semibold whitespace-nowrap',
          receipt.outcome === 'passed' && 'text-accent-green',
          receipt.outcome === 'rejected' && 'text-accent-red',
          receipt.outcome === 'neutral' && 'text-content-text-secondary',
        )}
      >
        {label}
      </span>

      {/* 主题（一行截断） */}
      <span className="min-w-0 flex-1 truncate text-content-text-secondary" title={receipt.decision.title}>
        {truncate(receipt.decision.title)}
      </span>

      {/* 时间 + 决定人 */}
      <span className="shrink-0 font-mono text-3xs text-content-text-muted tabular-nums whitespace-nowrap">
        {timeText}
      </span>
      <span className="shrink-0 text-3xs text-content-text-muted whitespace-nowrap">
        {receipt.actor ?? actorLabel ?? DEFAULT_CEREMONY_TEXTS.actor}
      </span>

      {/* 撤销入口：消费方传入 onUndo 才渲染（可撤销操作必须提供 Undo，§22.4）。
          quiet 档 = 弱文字色无底色（与凭证行的静默留痕气质一致），xs = 紧行内凭证几何 */}
      {onUndo ? (
        <Button
          type="button"
          variant="quiet"
          size="xs"
          onClick={() => onUndo(receipt)}
          data-ai="decision-receipt-undo"
          title={undoLabel ?? DEFAULT_CEREMONY_TEXTS.undo}
          aria-label={`${undoLabel ?? DEFAULT_CEREMONY_TEXTS.undo}：${receipt.decision.title}`}
        >
          <Undo2 className="size-3 shrink-0" />
          <span className="whitespace-nowrap">{undoLabel ?? DEFAULT_CEREMONY_TEXTS.undo}</span>
        </Button>
      ) : (
        <History className="size-3 shrink-0 text-content-text-muted/40" aria-hidden="true" />
      )}
    </div>
  );
}
