import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@ordo/api-types';
import { getAppContainer } from '../../infrastructure/container';
import { DomainEventTypes } from '../../infrastructure/event-client';

type Schemas = components['schemas'];

// 判据 7 证据：移动端 type-check 直接消费 contract:generate 的契约类型（type-only，
// 运行时零拷贝；M1 契约单源化后此 import 改指 apm-contract 单源产物）
export type NotificationItem = Schemas['NotificationResponseDto'];

/** { data, meta } 列表包裹（NotificationListResponseDto 契约形状） */
export interface NotificationListResponse {
  data: NotificationItem[];
  meta: { page: number; pageSize: number; total: number };
}

export interface UnreadCountResponse {
  count: number;
}

export const NOTIFICATIONS_KEY = ['notifications'] as const;
export const UNREAD_COUNT_KEY = ['notifications', 'unread-count'] as const;

const NOTIFICATIONS_PAGE_SIZE = 20;

/** 分页纪律（原语映射 P15）：下拉刷新 + 触底加载，不做滚动全量 */
export function useNotificationsInfinite() {
  const api = getAppContainer().api;
  return useInfiniteQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'list'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<NotificationListResponse>('/notifications', {
        page: pageParam as number,
        pageSize: NOTIFICATIONS_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => {
      const { page, pageSize, total } = lastPage.meta;
      const next = page + 1;
      return next * pageSize < total ? next : undefined;
    },
  });
}

/**
 * 未读数 + 实时失效：订阅 NotificationCreated（事件名单源），收到即失效
 * 通知族查询（spike 判据 3 徽标自增链的移动端实现）。
 */
export function useUnreadCount() {
  const api = getAppContainer().api;
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: () => api.get<UnreadCountResponse>('/notifications/unread-count'),
    staleTime: 15_000,
  });

  useEffect(() => {
    const { events } = getAppContainer();
    return events.on(DomainEventTypes.NotificationCreated, () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    });
  }, [queryClient]);

  return query;
}

export function useMarkNotificationsRead() {
  const api = getAppContainer().api;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.post('/notifications/read', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}
