/**
 * 实机测试模式 hooks（CAP-A-31 批 1）：模式开关/抓取/落盘/队列的 React Query 封装。
 * 仅桌面壳可用（web 端 enabled=false 恒禁用）。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { testModeApi } from '../api/test-mode-api';
import type { TestModeElementMeta } from '@/shared/types/electron-api';

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
  return useMutation({
    mutationFn: (element?: TestModeElementMeta | null) => testModeApi.capture(element),
  });
}

/** 操作录制控制（从头开始录制 / 清除已录操作）：成功后同步状态缓存 */
export function useTestModeOpsControls() {
  const queryClient = useQueryClient();
  const recordStart = useMutation({
    mutationFn: () => testModeApi.opsRecordStart(),
    onSuccess: (status) => queryClient.setQueryData(STATUS_KEY, status),
  });
  const clear = useMutation({
    mutationFn: () => testModeApi.opsClear(),
    onSuccess: (status) => queryClient.setQueryData(STATUS_KEY, status),
  });
  return { recordStart, clear };
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
