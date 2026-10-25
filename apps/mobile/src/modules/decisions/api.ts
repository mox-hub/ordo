import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAppContainer } from '../../infrastructure/container';
import {
  isDecisionActionable,
  planDecisionResolve,
  type DecisionAction,
  type DecisionsPendingResponse,
  type DecisionItem,
} from './resolve';

export const DECISIONS_PENDING_KEY = ['decisions', 'pending'] as const;

export function useDecisionsPending() {
  const api = getAppContainer().api;
  return useQuery({
    queryKey: DECISIONS_PENDING_KEY,
    queryFn: () => api.get<DecisionsPendingResponse>('/decisions/pending'),
  });
}

/** 拍板页数据源：复用 pending 队列按 id 取（决策完成即从队列消失） */
export function useDecisionById(id: string) {
  const api = getAppContainer().api;
  return useQuery({
    queryKey: DECISIONS_PENDING_KEY,
    queryFn: () => api.get<DecisionsPendingResponse>('/decisions/pending'),
    select: (data) => data.items.find((item) => item.id === id) ?? null,
  });
}

export function useResolveDecision() {
  const api = getAppContainer().api;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ decision, action, reason }: { decision: DecisionItem; action: DecisionAction; reason: string }) => {
      if (!isDecisionActionable(decision)) {
        return Promise.reject(new Error('decision-not-actionable'));
      }
      const plan = planDecisionResolve(decision, action, reason);
      return api.post(plan.path, plan.body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decisions'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
