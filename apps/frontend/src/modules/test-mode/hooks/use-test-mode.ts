/**
 * 实机测试模式 hooks（CAP-A-31 批 1）：模式开关/抓取/落盘/队列的 React Query 封装。
 * 仅桌面壳可用（web 端 enabled=false 恒禁用）。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { testModeApi } from '../api/test-mode-api';

const QUEUE_KEY = ['test-mode-queue'] as const;
const STATUS_KEY = ['test-mode-status'] as const;

export function useTestModeStatus(options?: { refetchWhileActive?: boolean }) {
  return useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => testModeApi.status(),
    enabled: testModeApi.available(),
    refetchInterval:
      options?.refetchWhileActive !== false && testModeApi.available() ? 5_000 : false,
  });
}

export function useTestModeToggle() {
  const queryClient = useQueryClient();
  const start = useMutation({
    mutationFn: () => testModeApi.start(),
    onSuccess: (status) => queryClient.setQueryData(STATUS_KEY, status),
  });
  const stop = useMutation({
    mutationFn: () => testModeApi.stop(),
    onSuccess: (status) => queryClient.setQueryData(STATUS_KEY, status),
  });
  return { start, stop };
}

export function useTestModeCapture() {
  return useMutation({ mutationFn: () => testModeApi.capture() });
}

export function useBugReportQueue(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUEUE_KEY,
    queryFn: () => testModeApi.queueList(),
    enabled: testModeApi.available() && (options?.enabled ?? true),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUEUE_KEY });
  const remove = useMutation({
    mutationFn: (id: string) => testModeApi.queueRemove({ id }),
    onSuccess: invalidate,
  });
  return { queue: query, remove };
}
