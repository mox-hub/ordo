import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'path';
import { ExecutionService } from '../execution/execution.service';

/**
 * 执行产物登记钩子单测（CAP-A-32 批二 / GAP-T-75）：
 * completeExecution → collectChanges 后逐文件登记（logicalPath/commitSha/sizeBytes），
 * 登记读现场但不改现场；单文件失败不阻断其余文件。
 */

function buildService(registryCalls: unknown[]) {
  const artifactRegistry = {
    upsertExecutionArtifact: vi.fn(async (params: unknown) => {
      registryCalls.push(params);
      return { id: `art-${registryCalls.length}` };
    }),
  };
  const service = new ExecutionService(
    {} as any, // prisma（钩子直测不经 DB）
    { setContext: vi.fn(), warn: vi.fn(), log: vi.fn() } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    artifactRegistry as any,
  );
  return { service, artifactRegistry };
}

describe('ExecutionService.registerExecutionArtifacts（批二钩子）', () => {
  let worktreeDir: string;

  beforeEach(async () => {
    worktreeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ordo-exec-art-'));
    await fs.writeFile(path.join(worktreeDir, 'a.ts'), 'export {};');
    await fs.mkdir(path.join(worktreeDir, 'lib'), { recursive: true });
    await fs.writeFile(
      path.join(worktreeDir, 'lib', 'b.ts'),
      'export const b = 1;',
    );
  });

  afterEach(async () => {
    await fs.rm(worktreeDir, { recursive: true, force: true });
  });

  it('变更文件逐个登记：logicalPath/commitSha/sizeBytes/聚合 diffStat', async () => {
    const calls: unknown[] = [];
    const { service } = buildService(calls);

    await service['registerExecutionArtifacts'](
      { id: 'exec1', projectId: 'p1', issueId: 'i1' },
      {
        mode: 'worktree',
        worktreePath: worktreeDir,
        branch: 'ordo/exec/exec1',
        baseRef: 'HEAD',
        projectRoot: worktreeDir,
      },
      {
        hasChanges: true,
        commitCount: 1,
        diffStat: ' 2 files changed',
        insertions: 3,
        deletions: 1,
        files: ['a.ts', 'lib/b.ts'],
        headRef: 'abc1234',
      },
    );

    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      projectId: 'p1',
      issueId: 'i1',
      logicalPath: 'a.ts',
      executionId: 'exec1',
      commitSha: 'abc1234',
      diffStat: { insertions: 3, deletions: 1, filesTotal: 2 },
    });
    expect((calls[0] as { sizeBytes: number }).sizeBytes).toBe(
      'export {};'.length,
    );
    expect((calls[1] as { fileName: string }).fileName).toBe('b.ts');
  });

  it('现场文件缺失：sizeBytes 置空仍登记清单；单文件失败不阻断其余', async () => {
    const calls: unknown[] = [];
    const { service, artifactRegistry } = buildService(calls);
    // 让第一个文件触发 registry 抛错（模拟登记失败）
    artifactRegistry.upsertExecutionArtifact.mockImplementationOnce(
      async () => {
        throw new Error('boom');
      },
    );

    await service['registerExecutionArtifacts'](
      { id: 'exec1', projectId: 'p1', issueId: null },
      {
        mode: 'worktree',
        worktreePath: worktreeDir,
        branch: 'x',
        baseRef: 'HEAD',
        projectRoot: worktreeDir,
      },
      {
        hasChanges: true,
        commitCount: 1,
        diffStat: '',
        insertions: 0,
        deletions: 0,
        files: ['a.ts', 'ghost-deleted.ts', 'lib/b.ts'],
        headRef: 'abc1234',
      },
    );

    // 第一个抛错、第二个现场缺失仍登记（sizeBytes null）、第三个继续
    expect(calls).toHaveLength(2);
    expect((calls[0] as { logicalPath: string }).logicalPath).toBe(
      'ghost-deleted.ts',
    );
    expect((calls[0] as { sizeBytes: number | null }).sizeBytes).toBeNull();
    expect((calls[1] as { logicalPath: string }).logicalPath).toBe('lib/b.ts');
  });
});
