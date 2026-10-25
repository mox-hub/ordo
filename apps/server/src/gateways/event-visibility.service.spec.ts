import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EventVisibilityService } from './event-visibility.service';
import { LoggerService } from '../core/logger/logger.service';

/**
 * T1 WS 定向推送的可见性裁决单测（P0 安全修）：
 * - private 项目只有项目成员收得到；
 * - 非 private 项目按「项目所在库有 User 行」放行（跨库用户天然被拒）；
 * - 项目解析失败 fail-closed 返回空（宁可不推，绝不回退广播）；
 * - 解析结果带缓存（第二次同项目不再查库）。
 */

// 注册表走真实 fs 工具：把 registry 指到临时文件（default + ws-a 两个工作区）
let registryFile = '';

vi.mock('../core/database/workspace-context', () => ({
  workspaceALS: { getStore: () => null },
  getCurrentWorkspaceId: () => null,
}));

function makeLogger(): LoggerService {
  return {
    setContext: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
    error: vi.fn(),
  } as never;
}

function makePrisma(clients: Record<string, unknown>): unknown {
  return {
    workspaceClient: (wsId: string | null) =>
      clients[wsId ?? 'default'] ?? null,
  };
}

describe('EventVisibilityService', () => {
  let service: EventVisibilityService;
  let defaultClient: {
    project: { findUnique: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
  };
  let wsAClient: {
    project: { findUnique: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    registryFile = path.join(os.tmpdir(), `evs-registry-${Date.now()}.json`);
    fs.writeFileSync(
      registryFile,
      JSON.stringify([
        {
          id: 'default',
          name: '默认工作区',
          path: null,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'ws-a',
          name: 'A 区',
          path: '/tmp/ws-a',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    );
    process.env.WORKSPACE_REGISTRY_PATH = registryFile;

    const makeClient = () => ({
      project: { findUnique: vi.fn().mockResolvedValue(null) },
      user: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    defaultClient = makeClient();
    wsAClient = makeClient();
    service = new EventVisibilityService(
      makePrisma({ default: defaultClient, 'ws-a': wsAClient }) as never,
      makeLogger(),
    );
  });

  afterEach(() => {
    delete process.env.WORKSPACE_REGISTRY_PATH;
    if (fs.existsSync(registryFile)) fs.rmSync(registryFile);
  });

  it('private 项目：仅项目成员可见，非成员被拒', async () => {
    wsAClient.project.findUnique.mockResolvedValue({
      visibility: 'private',
      members: [{ userId: 'u-owner' }, { userId: 'u-dev' }],
    });

    const visible = await service.visibleUserIdsForProject('p1', [
      'u-owner',
      'u-outsider',
      'u-dev',
    ]);
    expect(visible.sort()).toEqual(['u-dev', 'u-owner']);
  });

  it('非 private 项目：项目所在库有 User 行者可见，跨库用户被拒', async () => {
    wsAClient.project.findUnique.mockResolvedValue({
      visibility: 'internal',
      members: [{ userId: 'u-owner' }],
    });
    // 项目库（ws-a）只认得 u-owner 和 u-guest
    wsAClient.user.findUnique.mockImplementation(async ({ where }) =>
      ['u-owner', 'u-guest'].includes(where.id) ? { id: where.id } : null,
    );

    const visible = await service.visibleUserIdsForProject('p2', [
      'u-owner',
      'u-guest',
      'u-from-other-db',
    ]);
    expect(visible.sort()).toEqual(['u-guest', 'u-owner']);
  });

  it('项目不存在：fail-closed 返回空，不误投任何人', async () => {
    const visible = await service.visibleUserIdsForProject('ghost', [
      'u-anyone',
    ]);
    expect(visible).toEqual([]);
  });

  it('无 projectId 的事件：按发布时工作区同库用户过滤', async () => {
    defaultClient.user.findUnique.mockImplementation(async ({ where }) =>
      where.id === 'u-in-db' ? { id: where.id } : null,
    );

    const visible = await service.visibleUserIdsForWorkspace('default', [
      'u-in-db',
      'u-not-in-db',
    ]);
    expect(visible).toEqual(['u-in-db']);
  });

  it('解析结果带缓存：同项目第二次裁决不再查库', async () => {
    wsAClient.project.findUnique.mockResolvedValue({
      visibility: 'private',
      members: [{ userId: 'u-owner' }],
    });

    await service.visibleUserIdsForProject('p3', ['u-owner']);
    await service.visibleUserIdsForProject('p3', ['u-owner']);
    expect(wsAClient.project.findUnique).toHaveBeenCalledTimes(1);
  });
});
