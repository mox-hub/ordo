import { ArtifactSourceService } from './artifact-source.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'path';

/**
 * 执行产物源文件读取单测（CAP-A-32 批二 / GAP-T-75）：
 * worktree 现场读取 / 主工作区回落 / 越界拒绝 / unavailable 诚实降级。
 */
function buildPrisma() {
  return {
    artifact: { findUnique: vi.fn() },
    artifactVersion: { findFirst: vi.fn() },
    execution: { findUnique: vi.fn() },
    projectWorkspace: { findUnique: vi.fn() },
    appConfig: { findFirst: vi.fn() },
    repository: { findFirst: vi.fn() },
  };
}

const makeService = (prisma: ReturnType<typeof buildPrisma>) =>
  new ArtifactSourceService(prisma as any, { get: vi.fn() } as any);

function stubArtifactChain(
  prisma: ReturnType<typeof buildPrisma>,
  opts: {
    artifact?: Record<string, unknown>;
    isolation?: Record<string, unknown>;
    integrationStatus?: string;
    missingVersion?: boolean;
  },
) {
  prisma.artifact.findUnique.mockResolvedValue(
    opts.artifact ?? {
      id: 'a1',
      projectId: 'p1',
      kind: 'execution',
      logicalPath: 'src/app.ts',
      isDeleted: false,
    },
  );
  prisma.artifactVersion.findFirst.mockResolvedValue(
    opts.missingVersion ? null : { id: 'v1', version: 1, executionId: 'e1' },
  );
  prisma.execution.findUnique.mockResolvedValue({
    id: 'e1',
    metadata: {
      isolation: opts.isolation ?? {
        mode: 'worktree',
        worktreePath: '/tmp/wt',
        projectRoot: '/tmp/main',
      },
      integration: opts.integrationStatus
        ? { status: opts.integrationStatus }
        : undefined,
    },
  });
}

describe('ArtifactSourceService.readExecutionSource', () => {
  let worktreeDir: string;
  let mainDir: string;

  beforeEach(async () => {
    worktreeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ordo-artifact-wt-'));
    mainDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ordo-artifact-main-'));
    await fs.mkdir(path.join(worktreeDir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(worktreeDir, 'src', 'app.ts'),
      'console.log(1);\n',
    );
    defaultPrisma = buildPrisma();
    stubArtifactChain(defaultPrisma, {});
  });

  let defaultPrisma: ReturnType<typeof buildPrisma>;

  afterEach(async () => {
    await fs.rm(worktreeDir, { recursive: true, force: true });
    await fs.rm(mainDir, { recursive: true, force: true });
  });

  it('未合入：从 worktree 现场读取文本并带 integrationStatus', async () => {
    const prisma = defaultPrisma;
    prisma.execution.findUnique.mockResolvedValue({
      id: 'e1',
      metadata: {
        isolation: {
          mode: 'worktree',
          worktreePath: worktreeDir,
          projectRoot: mainDir,
        },
        integration: { status: 'pending-review' },
      },
    });

    const result = await makeService(prisma).readExecutionSource('a1');

    expect(result.kind).toBe('text');
    expect(result.content).toBe('console.log(1);\n');
    expect(result.readFrom).toBe('worktree');
    expect(result.integrationStatus).toBe('pending-review');
  });

  it('worktree 已清理 → 回落主工作区（三级回退：ProjectWorkspace.localPath）', async () => {
    const prisma = defaultPrisma;
    prisma.execution.findUnique.mockResolvedValue({
      id: 'e1',
      metadata: {
        isolation: {
          mode: 'worktree',
          worktreePath: '/tmp/ordo-cleared-wt',
          projectRoot: mainDir,
        },
        integration: { status: 'merged' },
      },
    });
    prisma.projectWorkspace.findUnique.mockResolvedValue({
      localPath: mainDir,
    });
    await fs.mkdir(path.join(mainDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(mainDir, 'src', 'app.ts'), 'merged version');

    const result = await makeService(prisma).readExecutionSource('a1');

    expect(result.kind).toBe('text');
    expect(result.content).toBe('merged version');
    expect(result.readFrom).toBe('workspace');
  });

  it('worktree 与主工作区均无此文件 → unavailable 诚实降级', async () => {
    const prisma = defaultPrisma;
    prisma.execution.findUnique.mockResolvedValue({
      id: 'e1',
      metadata: {
        isolation: {
          mode: 'worktree',
          worktreePath: '/tmp/ordo-cleared-wt',
          projectRoot: mainDir,
        },
        integration: { status: 'pending-review' },
      },
    });
    prisma.projectWorkspace.findUnique.mockResolvedValue({
      localPath: mainDir,
    });

    const result = await makeService(prisma).readExecutionSource('a1');

    expect(result.kind).toBe('unavailable');
    expect(result.message).toContain('执行现场已清理');
  });

  it('非 execution 产物拒绝源文件读取；版本缺失 404', async () => {
    stubArtifactChain(defaultPrisma, {
      artifact: { id: 'a1', kind: 'upload', isDeleted: false },
    });
    await expect(
      makeService(defaultPrisma).readExecutionSource('a1'),
    ).rejects.toThrow(BadRequestException);

    stubArtifactChain(defaultPrisma, { missingVersion: true });
    await expect(
      makeService(defaultPrisma).readExecutionSource('a1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('图片扩展名走 dataUrl 内联', async () => {
    const prisma = defaultPrisma;
    await fs.writeFile(
      path.join(worktreeDir, 'src', 'shot.png'),
      Buffer.from([0x89, 0x50]),
    );
    prisma.execution.findUnique.mockResolvedValue({
      id: 'e1',
      metadata: {
        isolation: {
          mode: 'worktree',
          worktreePath: worktreeDir,
          projectRoot: mainDir,
        },
      },
    });
    prisma.artifact.findUnique.mockResolvedValue({
      id: 'a1',
      projectId: 'p1',
      kind: 'execution',
      logicalPath: 'src/shot.png',
      isDeleted: false,
    });

    const result = await makeService(prisma).readExecutionSource('a1');

    expect(result.kind).toBe('image');
    expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
