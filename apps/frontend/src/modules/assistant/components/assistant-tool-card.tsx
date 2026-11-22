/**
 * AssistantToolCard —— 主仓 i18n/决策卡适配层。
 *
 * 折叠工具卡展示壳已迁至 @mox-hub/patterns；本文件注入 react-i18next 文案，
 * 并把 propose_decision 的完整输出交给主仓 DecisionCard（沿用既有动作接线）。
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  AssistantToolCard as PatternAssistantToolCard,
  type AssistantToolCardProps,
} from '@mox-hub/patterns/components/assistant-tool-card';
import type { PatternTranslate } from '@mox-hub/patterns/lib/translate';
import { DecisionCard } from '@/shared/decision-card/decision-card';
import type { Decision } from '@/shared/decision-card/types';
import { useDecisionActions } from '@/modules/decision/hooks/use-decision-actions';
import { decisionKeys } from '@/modules/decision/hooks/use-decisions';

export {
  AssistantToolGroup,
  isDecisionToolPart,
  toolPartStatus,
} from '@mox-hub/patterns/components/assistant-tool-card';
export type {
  AssistantToolCardProps,
  AssistantToolGroupProps,
  AssistantToolPart,
  ToolPartStatus,
} from '@mox-hub/patterns/components/assistant-tool-card';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** propose_decision 完整输出 → 内联决策卡（落库后失效待决缓存，顶部 strip 同步） */
function ProposedDecisionInline({ output }: { output: unknown }) {
  const o = asRecord(output) ?? {};
  const proposalId = typeof o.proposalId === 'string' ? o.proposalId : '';
  const kind = o.kind as Decision['kind'] | undefined;
  const title = typeof o.title === 'string' ? o.title : '';
  if (!proposalId || !kind || !title) return null;

  return <ProposedDecisionCard o={o} proposalId={proposalId} kind={kind} title={title} />;
}

function ProposedDecisionCard({
  o,
  proposalId,
  kind,
  title,
}: {
  o: Record<string, unknown>;
  proposalId: string;
  kind: Decision['kind'];
  title: string;
}) {
  const qc = useQueryClient();
  const { handleAction, busyId } = useDecisionActions();

  useEffect(() => {
    void qc.invalidateQueries({ queryKey: decisionKeys.all });
  }, [proposalId, qc]);

  const decision: Decision = {
    id: `${kind}:${proposalId}`,
    kind,
    sourceId: proposalId,
    status: 'pending',
    title,
    detail: typeof o.detail === 'string' ? o.detail : undefined,
    urgency: 'advisory',
    projectId: typeof o.projectId === 'string' ? o.projectId : undefined,
    proposer: { type: 'ai_agent', id: 'main-assistant' },
    payload: (asRecord(o.payload) ?? {}) as Record<string, unknown>,
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date(0).toISOString(),
  };

  return (
    <DecisionCard
      decision={decision}
      onAction={handleAction}
      busy={busyId === decision.id}
    />
  );
}

export function AssistantToolCard(props: AssistantToolCardProps) {
  const { t } = useTranslation();
  const translator: PatternTranslate = (key, fallbackOrOptions) =>
    typeof fallbackOrOptions === 'string'
      ? t(key, fallbackOrOptions)
      : t(key, fallbackOrOptions as Record<string, unknown>);

  return (
    <PatternAssistantToolCard
      {...props}
      translator={props.translator ?? translator}
      renderDecision={
        props.renderDecision ??
        ((output) => <ProposedDecisionInline output={output} />)
      }
    />
  );
}
