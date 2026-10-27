/**
 * 决策集中批阅全屏悬浮弹窗（Decision Review Modal）
 * 触发后以毛玻璃全屏悬浮弹出卡片堆，支持用户一张一张快速勾选/批阅通过，带堆叠、翻页、翻面与滑出动画。
 * 消费方：通知中心快速审阅 + 助理面板待决卡片挂条（2026-10-02 起为唯一批阅遮罩形态）。
 * Portal 到 body：助理浮窗祖先带 transform，fixed 定位会以 transformed 祖先为包含块、
 * 被裁进浮窗盒内而非铺满视口；根节点带 `data-ai-collab-overlay`，
 * 供浮层判定（点击不关面板 / Esc 先行消费）。
 *
 * 审阅收场仪式（§22.4）：批阅节奏由 DecisionDeckStack 內建（确认态→凭证行→Undo→
 * 自动下一件→完成态）；本弹窗负责把待决数量的变化经 aria-live 播报
 * （「还有 N 项需要你处理」/ 清空时「全部处理完 + 本次批阅计数」）。
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Layers, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  Decision,
  DecisionActionOptions,
  DecisionUndoHandler,
} from './types';
import { DecisionDeckStack } from './decision-deck-stack';
import { DEFAULT_CONFIRM_DURATION_MS } from './decision-card';
import {
  DEFAULT_CEREMONY_TEXTS,
  type DecisionCeremonyTexts,
} from './decision-receipt';

export interface DecisionReviewModalProps {
  open: boolean;
  onClose: () => void;
  decisions: Decision[];
  busyId?: string | null;
  onAction: (
    action: string,
    decision: Decision,
    opts?: DecisionActionOptions,
  ) => void;
  /** 撤销回调：透传卡片堆；传入即视为可撤销，凭证行渲染 Undo 入口 */
  onUndo?: DecisionUndoHandler;
  /** 显式声明可撤销（onUndo 未传时兜底开启 Undo 入口） */
  undoable?: boolean;
  /** 确认态时长（毫秒），缺省 1000 */
  confirmDurationMs?: number;
  /** 仪式文案覆写（缺省中文常量，i18n 登记批统一接入） */
  ceremonyTexts?: Partial<DecisionCeremonyTexts>;
}

export function DecisionReviewModal({
  open,
  onClose,
  decisions,
  busyId,
  onAction,
  onUndo,
  undoable,
  confirmDurationMs = DEFAULT_CONFIRM_DURATION_MS,
  ceremonyTexts,
}: DecisionReviewModalProps) {
  const { t } = useTranslation();
  // 稳定引用：ceremonyTexts 未传时合成对象不随渲染重建（onProgress 的 useCallback 依赖它）
  const texts = useMemo(
    () => ({ ...DEFAULT_CEREMONY_TEXTS, ...ceremonyTexts }),
    [ceremonyTexts],
  );
  const [progress, setProgress] = useState({ current: 1, total: decisions.length });
  // aria-live 播报内容：待决数量变化 / 队列清空完成语（§22.4 计数播报）
  const [liveText, setLiveText] = useState('');

  const handleIndexChange = useCallback((current: number, totalCount: number) => {
    setProgress((prev) => {
      if (prev.current === current && prev.total === totalCount) return prev;
      return { current, total: totalCount };
    });
  }, []);

  const handleProgress = useCallback(
    (info: { pending: number; resolvedCount: number; total: number }) => {
      // 播报文本用仪式文案常量组装（i18n 登记批统一接入；清空时带本次批阅计数）
      const next =
        info.pending > 0
          ? texts.pendingLive(info.pending)
          : `${texts.doneLive}，${texts.batchDone(info.resolvedCount)}`;
      setLiveText((prev) => (prev === next ? prev : next));
    },
    [texts],
  );

  // Escape 键退出
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const total = decisions.length;
  const percent = total > 0 ? Math.min(100, Math.round((progress.current / total) * 100)) : 100;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('decision.review.modalTitle')}
      data-ai-collab-overlay=""
      className="fixed inset-0 z-modal flex flex-col bg-background/85 backdrop-blur-md transition-all duration-normal"
    >
      {/* 待决计数播报（§8.5/§22.4：aria-live polite；清空时播报完成语） */}
      <p role="status" aria-live="polite" className="sr-only" data-decision-live-count="">
        {liveText}
      </p>

      {/* ── 顶部导航条 ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {t('decision.review.modalTitle')}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {t('decision.review.progress', {
                  current: progress.current,
                  total: progress.total,
                })}
              </span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-slow"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 右侧关闭按钮 */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-9 rounded-full"
            aria-label={t('common.close')}
            title="Esc"
          >
            <X className="size-5" />
          </Button>
        </div>
      </header>

      {/* ── 中间主舞台（卡片堆居中呈现） ── */}
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-6">
        <DecisionDeckStack
          decisions={decisions}
          busyId={busyId}
          onAction={onAction}
          onAllDone={onClose}
          onIndexChange={handleIndexChange}
          onProgress={handleProgress}
          onUndo={onUndo}
          undoable={undoable}
          confirmDurationMs={confirmDurationMs}
          ceremonyTexts={ceremonyTexts}
        />
      </main>
    </div>,
    document.body,
  );
}
