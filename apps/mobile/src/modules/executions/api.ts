import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { components } from '@ordo/api-types';
import { getAppContainer } from '../../infrastructure/container';
import { DomainEventTypes } from '../../infrastructure/event-client';

type Schemas = components['schemas'];

export type ExecutionEvent = Schemas['ExecutionEventDto'];

const RUNS_PAGE_LIMIT = 20;

/**
 * /execution/runs 的 200 未标注 schema（openapi 缺口）——按 server
 * listExecutionRuns 实测返回 {runs, total} 最小视图收口，M2 契约补全后改指生成类型。
 */
export interface ExecutionRunSummary {
  id: string;
  status: string;
  subjectType?: string | null;
  subjectName?: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  stepsCount?: number;
  artifactsCount?: number;
  issue?: { id: string; title: string } | null;
  project?: { id: string; name: string } | null;
}

export interface RunsListResponse {
  runs: ExecutionRunSummary[];
  total: number;
}

export function useRunsInfinite() {
  const api = getAppContainer().api;
  return useInfiniteQuery({
    queryKey: ['executions', 'runs'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api.get<RunsListResponse>('/execution/runs', {
        offset: pageParam as number,
        limit: RUNS_PAGE_LIMIT,
      }),
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const next = (lastPageParam as number) + RUNS_PAGE_LIMIT;
      return next < lastPage.total ? next : undefined;
    },
  });
}

export function useExecutionRun(id: string) {
  const api = getAppContainer().api;
  return useQuery({
    queryKey: ['executions', 'detail', id],
    queryFn: () => api.get<ExecutionRunSummary>(`/execution/runs/${id}`),
  });
}

export function useExecutionEvents(id: string) {
  const api = getAppContainer().api;
  return useQuery({
    queryKey: ['executions', 'events', id],
    queryFn: async () => {
      const res = await api.get<unknown>(`/execution/runs/${id}/events`);
      return normalizeEvents(res);
    },
  });
}

/** 事件流形状做归一（数组直返 / {events} 包裹两种兼容），服务端真相不变 */
export function normalizeEvents(input: unknown): ExecutionEvent[] {
  if (Array.isArray(input)) return input as ExecutionEvent[];
  if (input && typeof input === 'object' && Array.isArray((input as { events?: unknown }).events)) {
    return (input as { events: ExecutionEvent[] }).events;
  }
  return [];
}

/** 执行族事件实时失效（详情页订阅口径，蓝图 §2.3） */
export const EXECUTION_EVENT_TYPES = [
  DomainEventTypes.ExecutionRunUpdated,
  DomainEventTypes.ExecutionStepCreated,
  DomainEventTypes.ExecutionStepUpdated,
  DomainEventTypes.ExecutionCompleted,
] as const;
