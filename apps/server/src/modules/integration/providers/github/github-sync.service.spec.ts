import 'reflect-metadata';
import { GitHubSyncService } from './github-sync.service';
import type { PrismaService } from '@/core/database/prisma.service';
import type { MessageBusService } from '@/core/message-bus/message-bus.service';
import type { EncryptionService } from '@/core/crypto/encryption.service';
import type { GitHubSDKService } from './github-sdk.service';
import type { TrustService } from '@/modules/trust/trust.service';

/**
 * CAP-B-08 二期余留清偿（2026-10-30）：findIntegrationByRepo 多 repo 集成解析——
 * 单配置兼容既有口径；多配置优先 configJson/metadata.repos 精确匹配，
 * 未声明名单的配置兜底收未声明 repo（声明者不越界）。
 */

function buildService(
  configs: Array<Record<string, unknown>>,
  decryptJsonResult: unknown = null,
) {
  const prisma = {
    integrationConfig: { findMany: vi.fn().mockResolvedValue(configs) },
  } as unknown as PrismaService;
  const encryption = {
    decryptJson: vi.fn().mockImplementation(() => {
      if (decryptJsonResult instanceof Error) throw decryptJsonResult;
      return decryptJsonResult ?? {};
    }),
  } as unknown as EncryptionService;
  return {
    service: new GitHubSyncService(
      prisma,
      {} as MessageBusService,
      encryption,
      {} as GitHubSDKService,
      {} as TrustService,
    ),
    encryption,
  };
}

describe('GitHubSyncService.findIntegrationByRepo（多 repo 解析，CAP-B-08）', () => {
  it('单 enabled 配置：无论是否声明 repos，维持既有口径返回该配置', async () => {
    const { service } = buildService([
      { id: 'only', configJson: {}, metadata: null },
    ]);
    const picked = await (service as any).findIntegrationByRepo('org/any');
    expect(picked.id).toBe('only');
  });

  it('多配置：configJson 对象 repos 精确匹配路由到声明配置', async () => {
    const { service } = buildService([
      { id: 'a', configJson: { repos: ['org/alpha'] }, metadata: null },
      { id: 'b', configJson: { repos: ['org/beta'] }, metadata: null },
    ]);
    expect((await (service as any).findIntegrationByRepo('org/beta')).id).toBe(
      'b',
    );
    expect((await (service as any).findIntegrationByRepo('org/alpha')).id).toBe(
      'a',
    );
  });

  it('多配置：加密串 configJson 经 decryptJson 读取 repos 后匹配', async () => {
    const { service } = buildService(
      [
        { id: 'enc', configJson: 'ENCIPHERED', metadata: null },
        { id: 'plain', configJson: {}, metadata: null },
      ],
      { repos: ['org/secret'] },
    );
    expect(
      (await (service as any).findIntegrationByRepo('org/secret')).id,
    ).toBe('enc');
  });

  it('多配置：未声明的 repo 回落到未声明名单的配置，声明者不越界', async () => {
    const { service } = buildService([
      { id: 'declared', configJson: { repos: ['org/alpha'] }, metadata: null },
      { id: 'fallback', configJson: {}, metadata: null },
    ]);
    expect(
      (await (service as any).findIntegrationByRepo('org/unknown')).id,
    ).toBe('fallback');
  });

  it('多配置且全部声明名单：未命中 repo 回落首个（不返回 null 丢事件）', async () => {
    const { service } = buildService([
      { id: 'a', configJson: { repos: ['org/alpha'] }, metadata: null },
      { id: 'b', configJson: { repos: ['org/beta'] }, metadata: null },
    ]);
    expect((await (service as any).findIntegrationByRepo('org/other')).id).toBe(
      'a',
    );
  });

  it('metadata.repos 作为 configJson 未声明时的兜底来源', async () => {
    const { service } = buildService([
      { id: 'meta', configJson: {}, metadata: { repos: ['org/from-meta'] } },
      { id: 'x', configJson: {}, metadata: null },
    ]);
    expect(
      (await (service as any).findIntegrationByRepo('org/from-meta')).id,
    ).toBe('meta');
  });

  it('解密失败的加密串按未声明处理，不抛异常（可作未声明兜底）', async () => {
    const { service } = buildService(
      [
        { id: 'enc', configJson: 'ENCIPHERED', metadata: null },
        { id: 'plain', configJson: {}, metadata: null },
      ],
      new Error('decrypt failed'),
    );
    // enc 解密失败=读不出名单=未声明；它是首个未声明者故作兜底
    // （与单集成现状行为兼容：配置损坏不影响其继续收 webhook）
    await expect(
      (service as any).findIntegrationByRepo('org/any'),
    ).resolves.toMatchObject({ id: 'enc' });
  });
});
