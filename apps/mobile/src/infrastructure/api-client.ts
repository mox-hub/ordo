import { OrdoClient } from '@ordo/shared/http/ordo-client';

/**
 * 后端基址单一入口（工程接入方案 §六：环境配置全部经 infrastructure，禁止页面直连 axios）。
 *
 * - 默认指本机 dev 后端（NestJS 全局前缀 /_api 由 OrdoClient 统一补）。
 * - Android 模拟器访问宿主机须用 http://10.0.2.2:4300（localhost 指模拟器自身）；
 *   iOS 模拟器与宿主共享网络栈，localhost 可直连。
 * - 经 EXPO_PUBLIC_BACKEND_URL 环境变量覆盖（Expo 会内联进客户端产物）。
 */
export const DEFAULT_BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:4300';

export type ApiClient = OrdoClient;

export interface ApiClientOptions {
  baseUrl?: string;
  getToken?: () => string | undefined;
  getWorkspaceId?: () => string | undefined;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return new OrdoClient({
    backend: options.baseUrl ?? DEFAULT_BACKEND_URL,
    getToken: options.getToken,
    // OrdoClient 的 workspaceId 是构造期常量；移动端工作区可切换，
    // 经 extraHeaders 回调在每个请求时动态注入 x-workspace-id。
    extraHeaders: () => {
      const workspaceId = options.getWorkspaceId?.();
      const headers: Record<string, string> = {};
      if (workspaceId) headers['x-workspace-id'] = workspaceId;
      return headers;
    },
  });
}
