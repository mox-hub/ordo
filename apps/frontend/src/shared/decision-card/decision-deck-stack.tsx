/**
 * 决策卡片堆叠与集中批阅组件（Card Deck Stack）
 * 实现实体卡片堆叠（Deck Stacking）、3D 翻面（Card Flip）、印章落下与顺滑滑走（Dismiss Animation）、卡片翻页。
 *
 * 审阅收场仪式（设计宪法 §22.4，2026-10-27）：
 * - 决定后先盖印确认态约 1s（决定图标 + 文案），再滑出离场——不无声消失；
 * - 离场即在本卡组下方折叠为一行凭证（决定 + 时间 + 撤销入口），Undo 可恢复为待决态；
 * - 一件离场后下一件自动升起进入焦点（按 id 过滤已决卡，父级刷新缩短列表不跳卡）；
 * - 队列清空呈现完成态：完成语 + 本次批阅计数；待决数量变化经 aria-live 播报。
 */
import './decision-card.css';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  Decision,
  DecisionActionOptions,
  DecisionReceiptData,
  DecisionUndoHandler,
} from './types';
import { resolveActionOutcome } from './types';
import { DecisionCard, DEFAULT_CONFIRM_DURATION_MS } from './decision-card';
import {
  DecisionReceiptRow,
  DEFAULT_CEREMONY_TEXTS,
  type DecisionCeremonyTexts,
} from './decision-receipt';

export interface DecisionDeckStackProps {
  decisions: Decision[];
  busyId?: string | null;
  onAction: (
    action: string,
    decision: Decision,
    opts?: DecisionActionOptions,
  ) => void;
  onAllDone?: () => void;
  onIndexChange?: (index: number, total: number) => void;
  className?: string;
  /** 伴随式紧凑尺寸（用于助手面板等受限视口伴随式呈现） */
  compact?: boolean;
  /** 确认态时长（毫秒，§22.4 约定约 1s），缺省 1000 */
  confirmDurationMs?: number;
  /** 撤销回调：传入即视为可撤销，凭证行渲染 Undo 入口；点击恢复该卡为待决态并回调 */
  onUndo?: DecisionUndoHandler;
  /** 显式声明可撤销（onUndo 未传时兜底开启 Undo 入口，仅本地恢复待决态） */
  undoable?: boolean;
  /** 批阅进度变化（剩余待决 / 本次已处理 / 总数），供宿主 aria-live 播报与完成语 */
  onProgress?: (info: { pending: number; resolvedCount: number; total: number }) => void;
  /** 仪式文案覆写（缺省中文常量，i18n 登记批统一接入） */
  ceremonyTexts?: Partial<DecisionCeremonyTexts>;
}

/** 确认态后滑出（印章落下 → 滑出）的滑出时长，与 decision-card.css 滑走动效对齐 */
const DISMISS_MS = 380;

export function DecisionDeckStack({
  decisions,
  busyId,
  onAction,
  onAllDone,
  onIndexChange,
  className,
  compact = false,
  confirmDurationMs = DEFAULT_CONFIRM_DURATION_MS,
  onUndo,
  undoable,
  onProgress,
  ceremonyTexts,
}: DecisionDeckStackProps) {
  const { t } = useTranslation();
  const texts = { ...DEFAULT_CEREMONY_TEXTS, ...ceremonyTexts };
  // 本卡组内已作出的决定（id → 凭证）：桥接「点决定 → 父级刷新移除该卡」之间的空窗，
  // 下一件按 id 过滤自动升起，父级列表缩短不跳卡、不双跳
  const [resolved, setResolved] = useState<Map<string, DecisionReceiptData>>(new Map());
  // Undo 恢复的待决卡（父级刷新尚未带回时本地兜底展示；带回后按 id 去重自然收敛）
  const [reinstated, setReinstated] = useState<Decision[]>([]);
  const [viewOffset, setViewOffset] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeStamp, setActiveStamp] = useState<'passed' | 'rejected' | null>(null);
  const [dismissDirection, setDismissDirection] = useState<'left' | 'right' | 'up' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  const canUndo = undoable === true || onUndo != null;

  /** 待决队列：Undo 兜底卡在前 + 父级列表过滤已决卡 */
  const pending = useMemo(() => {
    const base = decisions.filter((d) => !resolved.has(d.id));
    const extra = reinstated.filter(
      (r) => !resolved.has(r.id) && !decisions.some((d) => d.id === r.id),
    );
    return [...extra, ...base];
  }, [decisions, resolved, reinstated]);

  const total = decisions.length;
  const safeOffset = Math.max(0, Math.min(viewOffset, pending.length - 1));
  const currentDecision = pending[safeOffset] ?? null;

  const onIndexChangeRef = useRef(onIndexChange);
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onIndexChangeRef.current = onIndexChange;
    onProgressRef.current = onProgress;
  }, [onIndexChange, onProgress]);

  // 进度上报：当前张在源列表中的位置（1 基）+ 剩余待决 / 本次已处理（供宿主播报）
  useEffect(() => {
    if (unmountedRef.current) return;
    const pos = currentDecision
      ? Math.max(1, decisions.findIndex((d) => d.id === currentDecision.id) + 1)
      : total;
    onIndexChangeRef.current?.(Math.min(pos, total), total);
    onProgressRef.current?.({
      pending: pending.length,
      resolvedCount: resolved.size,
      total,
    });
  }, [currentDecision, decisions, total, pending.length, resolved.size]);

  const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

  /** 共用收场节奏：盖印确认态约 1s → 滑出 → 上送 → 记凭证 → 下一件自动升起 */
  const performAction = useCallback(
    async (
      action: 'accept' | 'reject',
      decision: Decision,
      opts?: DecisionActionOptions,
    ) => {
      if (isProcessing) return;
      setIsProcessing(true);
      setActiveStamp(action === 'accept' ? 'passed' : 'rejected');

      // §22.4 第 1 拍：确认态（印章 = 决定图标 + 文案）保持约 1s 再离场
      await sleep(confirmDurationMs);
      if (unmountedRef.current) return;
      setDismissDirection(action === 'accept' ? 'right' : 'left');

      // 滑出落地后再上送与记账（动作时刻即凭证时刻）；
      // opts 缺省时不占第三参，与既有 onAction 契约（2 参调用）保持逐字一致
      await sleep(DISMISS_MS);
      if (unmountedRef.current) return;
      try {
        // onAction 可能返回 void 或 Promise——Promise.resolve 统一等待，同步异常仍走下方 catch
        await Promise.resolve(
          opts === undefined
            ? onAction(action, decision)
            : onAction(action, decision, opts),
        );
      } catch (err) {
        // 上送失败：不升下一件、不记凭证，卡片回到待决态（错误提示由消费方 toast 负责）
        console.error('[DecisionDeckStack] resolve failed, card restored', err);
        setActiveStamp(null);
        setDismissDirection(null);
        setIsProcessing(false);
        return;
      }
      setResolved((prev) => {
        const next = new Map(prev);
        next.set(decision.id, {
          decision,
          action,
          outcome: resolveActionOutcome(action),
          resolvedAt: Date.now(),
          opts,
        });
        return next;
      });
      setActiveStamp(null);
      setDismissDirection(null);
      setIsFlipped(false);
      setViewOffset(0);
      setIsProcessing(false);
    },
    [isProcessing, onAction, confirmDurationMs],
  );

  // 勾选来过（通过并滑出）
  const handlePass = useCallback(() => {
    if (!currentDecision) return;
    void performAction('accept', currentDecision);
  }, [currentDecision, performAction]);

  // 驳回并滑出
  const handleReject = useCallback(
    (opts?: DecisionActionOptions) => {
      if (!currentDecision) return;
      void performAction('reject', currentDecision, opts);
    },
    [currentDecision, performAction],
  );

  // 撤销：凭证行 → 恢复待决态并回调取消（下一件让位，该卡自动回到焦点）
  const handleUndo = useCallback(
    (receipt: DecisionReceiptData) => {
      setResolved((prev) => {
        const next = new Map(prev);
        next.delete(receipt.decision.id);
        return next;
      });
      setReinstated((prev) => [
        receipt.decision,
        ...prev.filter((d) => d.id !== receipt.decision.id),
      ]);
      setViewOffset(0);
      onUndo?.(receipt);
    },
    [onUndo],
  );

  // 快捷翻面
  const handleToggleFlip = useCallback(() => {
    if (isProcessing) return;
    setIsFlipped((prev) => !prev);
  }, [isProcessing]);

  // 下一张 / 跳过
  const handleNext = useCallback(() => {
    if (isProcessing || safeOffset >= pending.length - 1) return;
    setIsFlipped(false);
    setViewOffset((prev) => Math.min(prev + 1, pending.length - 1));
  }, [isProcessing, safeOffset, pending.length]);

  // 上一张
  const handlePrev = useCallback(() => {
    if (isProcessing || safeOffset <= 0) return;
    setIsFlipped(false);
    setViewOffset((prev) => Math.max(prev - 1, 0));
  }, [isProcessing, safeOffset]);

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // 若焦点在 input/textarea 则不拦截
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'Enter' || e.key === '1') {
        e.preventDefault();
        handlePass();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleToggleFlip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePass, handleToggleFlip, handleNext, handlePrev]);

  // 凭证条：最新决定在前（与操作直觉一致：刚做的在最能看到的行）
  const receipts = [...resolved.values()].reverse();

  // 全部批阅完成态（§22.4：队列清空呈现完成态，计数归零 + 完成语播报，不给空白；
  // 凭证条随完成态保留——已决定的不消失，可撤销的仍可撤销）
  if (!currentDecision || pending.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-decision-deck-done=""
        className={cn('flex flex-col items-center justify-center p-8 text-center', className)}
      >
        <div className="flex size-16 items-center justify-center rounded-xl bg-accent-green-light text-accent-green shadow-xs">
          <Sparkles className="size-8" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          {t('decision.review.allDoneTitle')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('decision.review.allDoneHint')}
        </p>
        {resolved.size > 0 && (
          <p
            data-ai="deck-batch-count"
            className="mt-2 rounded-full bg-accent-green-light px-3 py-1 text-xs font-medium text-accent-green tabular-nums"
          >
            {texts.batchDone(resolved.size)}
          </p>
        )}
        {receipts.length > 0 && (
          <div
            data-decision-receipts=""
            className="mt-4 w-full max-w-lg space-y-1.5 overflow-y-auto max-h-32 text-left"
            aria-label={texts.batchDone(resolved.size)}
          >
            {receipts.map((receipt) => (
              <DecisionReceiptRow
                key={receipt.decision.id}
                receipt={receipt}
                undoLabel={texts.undo}
                actorLabel={texts.actor}
                onUndo={canUndo ? handleUndo : undefined}
              />
            ))}
          </div>
        )}
        {onAllDone && (
          <Button
            onClick={onAllDone}
            className="mt-6 gap-2"
            variant="outline"
            data-ai="deck-back-inbox"
          >
            {t('decision.review.backToInbox')}
          </Button>
        )}
      </div>
    );
  }

  // 准备堆叠显示的卡片（最多同时渲染当前张和后两张底牌）
  const visibleCards = pending.slice(safeOffset, safeOffset + 3);
  const remainingLive =
    pending.length > 0 ? texts.pendingLive(pending.length) : texts.doneLive;

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col items-center justify-center',
        compact && 'decision-deck-compact',
        className,
      )}
    >
      {/* 待决计数播报（§8.5/§22.4：数量变化经 aria-live polite 播报，视觉隐藏） */}
      <p role="status" aria-live="polite" className="sr-only" data-decision-live-count="">
        {remainingLive}
      </p>

      {/* ── 核心卡片堆叠舞台（Card Deck Stage） ── */}
      <div
        className={cn(
          'decision-deck-stage relative flex w-full items-center justify-center',
          compact ? 'decision-deck-stage-compact pt-1 pb-3' : 'max-w-lg pt-2 pb-6',
        )}
      >
        {visibleCards.map((decision, stackOffset) => {
          const isTop = stackOffset === 0;
          const stackClass =
            stackOffset === 0
              ? 'decision-deck-card-top relative z-banner'
              : stackOffset === 1
                ? 'decision-deck-card-under-1'
                : 'decision-deck-card-under-2';

          return (
            <div
              key={decision.id}
              className={cn(
                'w-full transition-all duration-slow flex justify-center',
                stackClass,
              )}
            >
              <DecisionCard
                decision={decision}
                ceremony={false}
                busy={busyId === decision.id || (isTop && isProcessing)}
                onAction={(action, d, opts) => {
                  if (action === 'accept') {
                    handlePass();
                  } else if (action === 'reject') {
                    handleReject(opts);
                  } else {
                    onAction(action, d, opts);
                  }
                }}
                isFlipped={isTop ? isFlipped : false}
                onFlipChange={isTop ? setIsFlipped : undefined}
                stamp={isTop ? activeStamp : null}
                dismissDirection={isTop ? dismissDirection : null}
                variant="vertical"
              />
            </div>
          );
        })}
      </div>

      {/* ── 底部快捷操作条（大尺寸触控 / 快捷批阅） ── */}
      <div
        className={cn(
          'flex w-full items-center justify-between px-2',
          compact ? 'mt-2 decision-deck-actions-compact gap-2' : 'mt-4 max-w-lg gap-3',
        )}
      >
        {/* 上一张 */}
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          disabled={safeOffset <= 0 || isProcessing}
          className={cn(
            'rounded-full border-border/80 shrink-0',
            compact ? 'size-8' : 'size-10',
          )}
          title={t('decision.review.prevCard')}
          aria-label={t('decision.review.prevCard')}
          data-ai="deck-prev"
        >
          <ChevronLeft className={compact ? 'size-4' : 'size-5'} />
        </Button>

        {/* 核心操作组 */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 驳回 */}
          <Button
            variant="outline"
            onClick={() => handleReject()}
            disabled={isProcessing}
            className={cn(
              'shrink-0 rounded-full border-accent-red/40 font-medium text-accent-red whitespace-nowrap hover:bg-accent-red-light hover:text-accent-red',
              compact ? 'gap-1 px-3 text-xs' : 'gap-1.5 px-4 text-xs',
            )}
            data-ai="deck-reject"
          >
            <X className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{t('decision.review.quickReject')}</span>
            <span className="font-mono text-3xs opacity-60 whitespace-nowrap shrink-0">(2)</span>
          </Button>

          {/* 翻面详情 */}
          <Button
            variant="secondary"
            onClick={handleToggleFlip}
            disabled={isProcessing}
            className={cn(
              'shrink-0 rounded-full font-medium whitespace-nowrap',
              compact ? 'gap-1 px-3 text-xs' : 'gap-1.5 px-4 text-xs',
            )}
            data-ai="deck-flip"
          >
            <RotateCw className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{isFlipped ? t('decision.review.flipFront') : t('decision.review.flipBack')}</span>
            <span className="font-mono text-3xs opacity-60 whitespace-nowrap shrink-0">(F)</span>
          </Button>

          {/* 勾选通过（高亮大按钮） */}
          <Button
            variant="default"
            onClick={handlePass}
            disabled={isProcessing}
            className={cn(
              'shrink-0 rounded-full font-semibold shadow-xs whitespace-nowrap',
              compact ? 'gap-1.5 px-4 text-xs' : 'gap-2 px-6 text-sm',
            )}
            data-ai="deck-pass"
          >
            <Check className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{t('decision.review.quickPass')}</span>
            <span className="font-mono text-3xs opacity-80 whitespace-nowrap shrink-0">(1/↵)</span>
          </Button>
        </div>

        {/* 下一张 */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={safeOffset >= pending.length - 1 || isProcessing}
          className={cn(
            'rounded-full border-border/80 shrink-0',
            compact ? 'size-8' : 'size-10',
          )}
          title={t('decision.review.nextCard')}
          aria-label={t('decision.review.nextCard')}
          data-ai="deck-next"
        >
          <ChevronRight className={compact ? 'size-4' : 'size-5'} />
        </Button>
      </div>

      {/* ── 凭证条（§22.4 第 2 拍）：已决定的不消失，折叠为一行凭证（决定 + 时间 + 撤销） ── */}
      {receipts.length > 0 && (
        <div
          data-decision-receipts=""
          className={cn(
            'mt-3 w-full space-y-1.5 overflow-y-auto',
            compact ? 'decision-deck-actions-compact max-h-24' : 'max-w-lg max-h-32',
          )}
          aria-label={texts.batchDone(resolved.size)}
        >
          {receipts.map((receipt) => (
            <DecisionReceiptRow
              key={receipt.decision.id}
              receipt={receipt}
              undoLabel={texts.undo}
              actorLabel={texts.actor}
              onUndo={canUndo ? handleUndo : undefined}
            />
          ))}
        </div>
      )}

      {/* 快捷键提示 */}
      <p className="mt-3 text-center text-2xs text-muted-foreground">
        {t('decision.review.shortcuts')}
      </p>
    </div>
  );
}
