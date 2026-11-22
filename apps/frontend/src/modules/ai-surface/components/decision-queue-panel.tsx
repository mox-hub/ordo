/**
 * DecisionQueuePanel —— 主仓 decision hook/卡片适配层。
 *
 * 待办区展示壳已迁至 @mox-hub/patterns；本文件保留 useDecisionQueue /
 * useDecisionActions，并把主仓 DecisionCard 经 renderDecision 注入。
 */
import {
  DecisionQueuePanelView as PatternDecisionQueuePanelView,
} from '@mox-hub/patterns/components/decision-queue-panel';
import type {
  DecisionQueue as PatternDecisionQueue,
} from '@mox-hub/patterns/components/decision-queue-panel';
import { DecisionCard } from '@/shared/decision-card/decision-card';
import type { Decision } from '@/shared/decision-card/types';
import { useDecisionActions } from '@/modules/decision/hooks/use-decision-actions';
import { useDecisionQueue, type DecisionQueue } from '../hooks/use-decision-queue';

export { formatWaiting } from '@mox-hub/patterns/components/decision-queue-panel';
export type { DecisionQueue } from '@mox-hub/patterns/components/decision-queue-panel';

export function DecisionQueuePanel() {
  const { queue, isPending, isError } = useDecisionQueue();
  // 与收件箱**同一个**动作接线（含成功/失败 toast）——不在此另写一份 mutate
  const { handleAction, busyId } = useDecisionActions();

  return (
    <DecisionQueuePanelView
      queue={queue}
      isPending={isPending}
      isError={isError}
      sourceNote="来自通知中心同一端点"
      onAction={handleAction}
      busyId={busyId}
    />
  );
}

/**
 * 待办区的**渲染本体**：只吃 props，不碰任何 hook。
 * 展示壳在 @mox-hub/patterns，主仓在此注入 DecisionCard（决策文法唯一实现）。
 */
export function DecisionQueuePanelView({
  queue,
  onAction,
  ...props
}: {
  queue: DecisionQueue;
  isPending: boolean;
  isError: boolean;
  sourceNote: string;
  onAction: (action: string, d: Decision, opts?: { reason?: string; answer?: string }) => void;
  busyId: string | null;
  readOnly?: boolean;
  readOnlyNote?: string;
  waitingNowMs?: number;
}) {
  return (
    <PatternDecisionQueuePanelView
      {...props}
      queue={queue as unknown as PatternDecisionQueue}
      onAction={(action, decision, opts) =>
        onAction(action, decision as unknown as Decision, opts)
      }
      renderDecision={(decision, ctx) => (
        <DecisionCard
          decision={decision as unknown as Decision}
          onAction={onAction}
          busy={ctx.busy}
          readOnly={ctx.readOnly}
          readOnlyNote={ctx.readOnlyNote}
        />
      )}
    />
  );
}
