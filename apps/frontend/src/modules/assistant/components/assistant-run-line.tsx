/**
 * AssistantRunLine —— 主仓轮询/事件/mutation 适配层。
 *
 * 展示壳已迁至 @mox-hub/patterns；本文件保留 5s 轮询、run.updated 事件失效、
 * 失败重试 mutation、运行详情弹窗与执行中心跳转。
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AssistantRunLine as PatternAssistantRunLine } from '@mox-hub/patterns/components/assistant-run-line';
import { toast } from '@/components/ui/toast';
import { eventClient } from '@/infrastructure/event-client';
import { RunDetailsDialog } from '@/modules/executions';
import { aiHubApi } from '@/modules/ai-hub/api/ai-hub-api';
import { assistantApi } from '../api/assistant-api';
import { decisionKeys } from '@/modules/decision/hooks/use-decisions';
import type { AssistantRunEntry } from '../hooks/use-assistant-dispatch';

const TERMINAL_STATUSES = ['completed', 'failed', 'blocked', 'superseded', 'cancelled'];

type RunStatus = string | undefined;

export function AssistantRunLine({
  entry,
  projectId,
}: {
  entry: AssistantRunEntry;
  projectId?: string | null;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [detailOpen, setDetailOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['assistant', 'run-status', entry.runId],
    queryFn: () => aiHubApi.getExecutionStatus(entry.runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status as RunStatus;
      return status && TERMINAL_STATUSES.includes(status) ? false : 5000;
    },
  });

  const status = data?.status as RunStatus;
  const isTerminal = !!status && TERMINAL_STATUSES.includes(status);
  const isFailed = status === 'failed' || status === 'blocked' || status === 'cancelled';

  // 服务端 execution.run.updated 事件驱动失效（兜底改造批 1），轮询仅兜底
  useEffect(() => {
    const invalidate = (payload: unknown) => {
      const p = payload as { executionRunId?: string };
      if (p?.executionRunId === entry.runId) {
        qc.invalidateQueries({ queryKey: ['assistant', 'run-status', entry.runId] });
      }
    };
    eventClient.on('execution.run.updated', invalidate);
    return () => {
      eventClient.off('execution.run.updated', invalidate);
    };
  }, [entry.runId, qc]);

  // 失败重试：同内容重新派发 CLI 执行（新 run 新行，本行保留失败现场）
  const retry = useMutation({
    mutationFn: () => {
      if (!projectId) {
        return Promise.reject(new Error('execution requires a project scope'));
      }
      return assistantApi.dispatch(entry.content, projectId);
    },
    onSuccess: () => {
      toast.success(t('assistant.run.dispatched'));
    },
    onError: (error) => {
      toast.error(
        t('assistant.run.dispatchFailed', {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    },
  });

  // 终态回流：失效待决缓存，CLI 回写的建议卡出现在「待你决定」区
  useEffect(() => {
    if (isTerminal) {
      qc.invalidateQueries({ queryKey: decisionKeys.all });
    }
  }, [isTerminal, qc]);

  return (
    <>
      <PatternAssistantRunLine
        entry={entry}
        status={status}
        error={data?.error}
        retrying={retry.isPending}
        onViewDetail={() => setDetailOpen(true)}
        onOpenExecutions={() => navigate('/app/executions')}
        onRetry={isFailed && projectId ? () => retry.mutate() : undefined}
        labels={{
          running: t('assistant.run.running'),
          failed: t('assistant.run.failed'),
          completed: t('assistant.run.completed'),
          retry: t('assistant.run.retry'),
          viewDetail: t('runDetails.viewDetail'),
          openExecutions: t('assistant.run.viewDetail'),
        }}
      />

      <RunDetailsDialog runId={entry.runId} open={detailOpen} onOpenChange={setDetailOpen} />
    </>
  );
}
