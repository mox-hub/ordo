/**
 * AI 就绪度推导（CAP-A-18「AI 就绪」第一公里三件套 ③悬浮提醒，GAP-T-72）。
 *
 * 后端无独立就绪端点，可用性由两份既有查询拼合（与设置页共享 query 缓存，
 * 配置变更的失效链即时回流横幅）：
 * - 「内置 AI 可用」= 存在 enabled 且已存 Key 的 AIProviderConfig
 *   （adapter-registry 装载条件，见 server adapter-registry.service.ts loadAdapters）；
 * - 「内置模型」= AppConfig key='ai.defaultModel'，未设置时消费链静默回落
 *   首个可用厂家（resolveBuiltinAdapter）。
 * 四态口径（设计文档 docs/roadmap/内置AI引导与AI员工创建方案-2026-10-26.md §1.1）：
 * - unavailable：零可用厂家 —— AI 助理/静默生成/评估全链 400（硬提醒不可暂关）
 * - unconfigured：有厂家但内置模型未设置或指向厂家已失效（软提醒）
 * - unverified：内置模型指向厂家最近一次实测失败 status==='error'（软提醒）
 * - ready：全就绪不渲染
 * loading/unknown 不渲染：查询失败时状态不可信，宁可沉默也不误报「未配置」，
 * 断线由 ConnectionBanner 负责。
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiHubApi, type AIProviderConfig } from '../api/ai-hub-api';
import { defaultModelKeys, providerKeys } from './use-ai-providers';

export type AiReadinessState =
  | 'loading'
  | 'unknown'
  | 'unavailable'
  | 'unconfigured'
  | 'unverified'
  | 'ready';

/** 推导只消费四个判定字段（测试构造最小对象即可，不必 mock 完整实体） */
export type AiReadinessProviderInput = Pick<
  AIProviderConfig,
  'provider' | 'enabled' | 'hasApiKey' | 'status'
>;

/**
 * 纯函数推导（单测直测四态边界，GAP-T-72）。
 * 口径对齐后端：有 Key 未实测（disconnected）不算不可用——适配器照样装载，
 * 只在内置模型指向厂家 status==='error'（最近实测失败）时报 unverified。
 */
export function deriveAiReadiness(
  providers: AiReadinessProviderInput[],
  defaultModel:
    | { provider?: string | null; model?: string | null }
    | null
    | undefined,
): Exclude<AiReadinessState, 'loading' | 'unknown'> {
  const usable = providers.filter((p) => p.enabled && p.hasApiKey);
  if (usable.length === 0) return 'unavailable';
  const target = defaultModel?.provider
    ? usable.find((p) => p.provider === defaultModel.provider)
    : undefined;
  if (!defaultModel?.provider || !defaultModel?.model || !target) {
    return 'unconfigured';
  }
  if (target.status === 'error') return 'unverified';
  return 'ready';
}

/** 60s 低频轮询兜底、页面隐藏暂停（useUnreadNotificationsCount / useActiveDispatchExists 同款惯例）；
 *  主刷新通道是配置变更后的 query 失效——横幅与设置页共享同 key 缓存。 */
const refetchWhenVisible = () => (document.hidden ? false : 60_000);

export function useAiReadiness() {
  const providersQuery = useQuery({
    queryKey: providerKeys.all,
    queryFn: () => aiHubApi.getProviders(),
    staleTime: 30_000,
    refetchInterval: refetchWhenVisible,
  });
  const defaultModelQuery = useQuery({
    queryKey: defaultModelKeys.all,
    queryFn: () => aiHubApi.getDefaultModel(),
    staleTime: 30_000,
    refetchInterval: refetchWhenVisible,
  });

  return useMemo(() => {
    if (providersQuery.isPending || defaultModelQuery.isPending) {
      return { state: 'loading' as const, detail: null };
    }
    if (providersQuery.isError || defaultModelQuery.isError) {
      return { state: 'unknown' as const, detail: null };
    }
    const providers = providersQuery.data ?? [];
    const state = deriveAiReadiness(providers, defaultModelQuery.data ?? null);
    const detail =
      state === 'unverified'
        ? (providers.find(
            (p) =>
              p.enabled &&
              p.hasApiKey &&
              p.provider === defaultModelQuery.data?.provider,
          )?.errorMessage ??
          null)
        : null;
    return { state, detail } as {
      state: AiReadinessState;
      detail: string | null;
    };
  }, [
    providersQuery.data,
    providersQuery.isPending,
    providersQuery.isError,
    defaultModelQuery.data,
    defaultModelQuery.isPending,
    defaultModelQuery.isError,
  ]);
}
