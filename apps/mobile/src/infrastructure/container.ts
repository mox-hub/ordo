import { createApiClient, DEFAULT_BACKEND_URL, type ApiClient } from './api-client';
import { secureTokenStorage } from './secure-store';
import { EventClient } from './event-client';
import { createSessionStore, type SessionStore } from '../stores/session';

/**
 * 组合根：把 RN 专属实现（SecureStore / 单例 socket）注入纯 TS 层。
 * 页面与模块只从这里取依赖，测试用替身自建（对标前端 infrastructure 注入层约定）。
 */
export interface AppContainer {
  api: ApiClient;
  session: SessionStore;
  events: EventClient;
}

let container: AppContainer | null = null;

export function getAppContainer(): AppContainer {
  if (!container) {
    let sessionRef: SessionStore | null = null;
    const api = createApiClient({
      getToken: () => sessionRef?.getState().token ?? undefined,
      getWorkspaceId: () => sessionRef?.getState().workspaceId ?? undefined,
    });
    const session = createSessionStore({ storage: secureTokenStorage, api });
    sessionRef = session;
    const events = new EventClient(
      DEFAULT_BACKEND_URL,
      () => sessionRef?.getState().token ?? undefined,
    );
    container = { api, session, events };
  }
  return container;
}
