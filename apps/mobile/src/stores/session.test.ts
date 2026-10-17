import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryTokenStorage } from '../infrastructure/token-storage';
import { createSessionStore } from './session';
import type { ApiClient } from '../infrastructure/api-client';

type ApiFake = Pick<ApiClient, 'get' | 'post' | 'delete'>;

function makeApi() {
  return { get: vi.fn(), post: vi.fn(), delete: vi.fn() };
}

type ApiMock = ReturnType<typeof makeApi>;

function makeStore(api: ApiMock) {
  const storage = createMemoryTokenStorage();
  const store = createSessionStore({ storage, api: api as unknown as ApiFake });
  return { store, storage, api };
}

const user = { id: 'u1', username: 'alice', displayName: 'Alice', email: '', avatarUrl: '', timezone: '' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('session store 认证链（spike 判据 2）', () => {
  it('无 token 冷启 → anonymous', async () => {
    const { store } = makeStore(makeApi());
    await store.getState().restore();
    expect(store.getState().status).toBe('anonymous');
  });

  it('有 token 且 /auth/me 通过 → authenticated + 工作区', async () => {
    const api = makeApi();
    api.get.mockImplementation((path: string) => {
      if (path === '/auth/me') return Promise.resolve({ user });
      if (path === '/workspaces/current') return Promise.resolve({ workspaceId: 'ws-1' });
      return Promise.reject(new Error('unknown path'));
    });
    const { store, storage } = makeStore(api);
    await storage.saveToken('tok-1');
    await store.getState().restore();
    expect(store.getState().status).toBe('authenticated');
    expect(store.getState().user?.username).toBe('alice');
    expect(store.getState().workspaceId).toBe('ws-1');
  });

  it('token 失效（/auth/me 401）→ 清存储降级匿名', async () => {
    const api = makeApi();
    api.get.mockRejectedValue(new Error('401'));
    const { store, storage } = makeStore(api);
    await storage.saveToken('expired');
    await store.getState().restore();
    expect(store.getState().status).toBe('anonymous');
    expect(await storage.getToken()).toBeNull();
  });

  it('login 成功存 token；已有工作区时 needsWorkspace=false', async () => {
    const api = makeApi();
    api.post.mockResolvedValue({ accessToken: 'tok-2', user });
    api.get.mockResolvedValue({ workspaceId: 'ws-1' });
    const { store, storage } = makeStore(api);
    const result = await store.getState().login('alice', 'pw');
    expect(await storage.getToken()).toBe('tok-2');
    expect(result.needsWorkspace).toBe(false);
    expect(api.post).toHaveBeenCalledWith('/auth/login', { username: 'alice', password: 'pw' });
  });

  it('login 后无激活工作区 → needsWorkspace=true（引导去工作区选择）', async () => {
    const api = makeApi();
    api.post.mockResolvedValue({ accessToken: 'tok-3', user });
    api.get.mockResolvedValue({ workspaceId: null });
    const { store } = makeStore(api);
    const result = await store.getState().login('alice', 'pw');
    expect(result.needsWorkspace).toBe(true);
  });

  it('activateWorkspace 激活并落状态', async () => {
    const api = makeApi();
    api.post.mockResolvedValue({});
    const { store } = makeStore(api);
    await store.getState().activateWorkspace('ws-9');
    expect(api.post).toHaveBeenCalledWith('/workspaces/ws-9/activate');
    expect(store.getState().workspaceId).toBe('ws-9');
  });

  it('logout 清空本地态；服务端登出失败不阻断', async () => {
    const api = makeApi();
    api.post.mockImplementation((path: string) =>
      path === '/auth/logout' ? Promise.reject(new Error('network')) : Promise.resolve({}),
    );
    const { store, storage } = makeStore(api);
    await storage.saveToken('tok-4');
    store.setState({ status: 'authenticated', token: 'tok-4', user, workspaceId: 'ws-1' });
    await store.getState().logout();
    expect(store.getState().status).toBe('anonymous');
    expect(await storage.getToken()).toBeNull();
  });
});
