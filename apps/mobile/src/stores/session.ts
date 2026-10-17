import { create } from 'zustand';
import type { components } from '@ordo/api-types';
import type { TokenStorage } from '../infrastructure/token-storage';
import type { ApiClient } from '../infrastructure/api-client';

export type AuthUser = components['schemas']['AuthUserDto'];

export type SessionStatus = 'restoring' | 'anonymous' | 'authenticated';

export interface LoginResult {
  /** 登录成功但尚无激活工作区——需先走工作区选择 */
  needsWorkspace: boolean;
}

export interface SessionDeps {
  storage: TokenStorage;
  api: Pick<ApiClient, 'get' | 'post' | 'delete'>;
}

export interface SessionState {
  status: SessionStatus;
  token: string | null;
  user: AuthUser | null;
  workspaceId: string | null;
  /** 冷启恢复：有 token 则静默拉 /auth/me 校验，失效即降级匿名 */
  restore(): Promise<void>;
  login(username: string, password: string): Promise<LoginResult>;
  activateWorkspace(workspaceId: string): Promise<void>;
  logout(): Promise<void>;
}

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

interface MeResponse {
  user: AuthUser;
}

interface CurrentWorkspaceResponse {
  workspaceId: string | null;
}

/**
 * 会话状态机（spike 判据 2 认证链）：
 * restoring → anonymous → (login) → authenticated[?workspace] → (activate) → ready
 * 真相源 = 服务端；本地只存 token（SecureStore）与展示态。
 */
export function createSessionStore(deps: SessionDeps) {
  return create<SessionState>()((set) => ({
    status: 'restoring',
    token: null,
    user: null,
    workspaceId: null,

    async restore() {
      const token = await deps.storage.getToken();
      if (!token) {
        set({ status: 'anonymous', token: null, user: null, workspaceId: null });
        return;
      }
      set({ token });
      try {
        const [me, current] = await Promise.all([
          deps.api.get<MeResponse>('/auth/me'),
          deps.api.get<CurrentWorkspaceResponse>('/workspaces/current'),
        ]);
        set({
          status: 'authenticated',
          user: me.user,
          workspaceId: current.workspaceId ?? null,
        });
      } catch {
        await deps.storage.clear();
        set({ status: 'anonymous', token: null, user: null, workspaceId: null });
      }
    },

    async login(username, password) {
      const res = await deps.api.post<LoginResponse>('/auth/login', { username, password });
      await deps.storage.saveToken(res.accessToken);
      set({ token: res.accessToken, user: res.user });
      let workspaceId: string | null = null;
      try {
        const current = await deps.api.get<CurrentWorkspaceResponse>('/workspaces/current');
        workspaceId = current.workspaceId ?? null;
      } catch {
        workspaceId = null;
      }
      set({ status: 'authenticated', workspaceId });
      return { needsWorkspace: !workspaceId };
    },

    async activateWorkspace(workspaceId) {
      await deps.api.post(`/workspaces/${workspaceId}/activate`);
      set({ workspaceId });
    },

    async logout() {
      // 服务端登出失败不阻断本地清理（token 已在本地撤销）
      try {
        await deps.api.post('/auth/logout');
      } catch {
        // 忽略
      }
      await deps.storage.clear();
      set({ status: 'anonymous', token: null, user: null, workspaceId: null });
    },
  }));
}

export type SessionStore = ReturnType<typeof createSessionStore>;
