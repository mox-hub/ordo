import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { components } from '@ordo/api-types';
import { getAppContainer } from '../../infrastructure/container';

type Schemas = components['schemas'];

// 判据 7 证据：工单列表/详情消费契约生成类型（type-only）
export type IssueListItem = Schemas['IssueListItemDto'];
export type IssueDetail = Schemas['IssueDetailResponseDto'];

/** IssuePageResponseDto：{ data, meta } 包裹 */
export interface IssuePageResponse {
  data: IssueListItem[];
  meta: { page: number; pageSize: number; total: number };
}

const ISSUES_PAGE_SIZE = 20;

export function useIssuesInfinite() {
  const api = getAppContainer().api;
  return useInfiniteQuery({
    queryKey: ['issues', 'list'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<IssuePageResponse>('/issues/all', {
        page: pageParam as number,
        pageSize: ISSUES_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => {
      const { page, pageSize, total } = lastPage.meta;
      const next = page + 1;
      return next * pageSize < total ? next : undefined;
    },
  });
}

export function useIssueDetail(id: string) {
  const api = getAppContainer().api;
  return useQuery({
    queryKey: ['issues', 'detail', id],
    queryFn: () => api.get<IssueDetail>(`/issues/${id}`),
  });
}
