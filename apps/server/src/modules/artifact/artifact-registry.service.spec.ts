import { ArtifactRegistryService } from './artifact-registry.service';

/**
 * 三源登记核单测（CAP-A-32）：upload 版本账、document 挂接幂等、execution 合并键幂等。
 */
function buildPrisma() {
  return {
    artifact: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    artifactVersion: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  };
}

function buildStorage() {
  return {
    checksumBuffer: vi.fn(async (buf: Buffer) => `sha256:${buf.length}`),
    buildVersionRelPath: vi.fn(
      (artifactId: string, version: number, fileName: string) =>
        `${artifactId}/v${version}/${fileName}`,
    ),
    saveVersionBuffer: vi.fn(async () => undefined),
  };
}

describe('ArtifactRegistryService', () => {
  const make = () => {
    const prisma = buildPrisma();
    const storage = buildStorage();
    return {
      prisma,
      storage,
      registry: new ArtifactRegistryService(prisma as any, storage as any),
    };
  };

  describe('registerUpload / appendUploadVersion', () => {
    it('创建产物并落 v1（checksum + 受管存储路径）', async () => {
      const { prisma, registry } = make();
      prisma.artifact.create.mockResolvedValue({ id: 'art1', kind: 'upload' });
      prisma.artifactVersion.findFirst.mockResolvedValue(null);
      prisma.artifactVersion.create.mockImplementation(
        async ({ data }: any) => data,
      );
      prisma.artifact.update.mockResolvedValue({ id: 'art1' });

      const result = await registry.registerUpload({
        projectId: 'p1',
        issueId: 'i1',
        fileName: 'spec.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('hello'),
        userId: 'u1',
      });

      expect(prisma.artifact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 'p1',
          issueId: 'i1',
          kind: 'upload',
          checksum: 'sha256:5',
        }),
      });
      expect(prisma.artifactVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          artifactId: 'art1',
          version: 1,
          origin: 'upload',
          storagePath: 'art1/v1/spec.pdf',
        }),
      });
      expect(result.latestVersion).toBe(1);
    });

    it('重传追加 v(n+1) 并回填产物当前态', async () => {
      const { prisma, registry } = make();
      prisma.artifactVersion.findFirst.mockResolvedValue({ version: 2 });
      prisma.artifactVersion.create.mockImplementation(
        async ({ data }: any) => data,
      );
      prisma.artifact.update.mockResolvedValue({ id: 'art1' });

      const version = await registry.appendUploadVersion('art1', {
        fileName: 'spec-v2.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('hello world'),
        userId: 'u1',
      });

      expect(version.version).toBe(3);
      expect(prisma.artifact.update).toHaveBeenCalledWith({
        where: { id: 'art1' },
        data: expect.objectContaining({ checksum: 'sha256:11' }),
      });
    });
  });

  describe('syncDocument', () => {
    it('新文档且挂项目 → 创建引用行', async () => {
      const { prisma, registry } = make();
      prisma.artifact.findFirst.mockResolvedValue(null);
      prisma.artifact.create.mockResolvedValue({ id: 'art-doc' });

      await registry.syncDocument({
        documentId: 'doc1',
        title: '需求分析报告',
        projectId: 'p1',
      });

      expect(prisma.artifact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 'p1',
          kind: 'document',
          documentId: 'doc1',
          name: '需求分析报告',
        }),
      });
    });

    it('已存在 → 名称同步不裂行', async () => {
      const { prisma, registry } = make();
      prisma.artifact.findFirst.mockResolvedValue({
        id: 'art-doc',
        name: '旧标题',
      });
      prisma.artifact.update.mockResolvedValue({ id: 'art-doc' });

      await registry.syncDocument({
        documentId: 'doc1',
        title: '新标题',
        projectId: 'p1',
      });

      expect(prisma.artifact.create).not.toHaveBeenCalled();
      expect(prisma.artifact.update).toHaveBeenCalledWith({
        where: { id: 'art-doc' },
        data: expect.objectContaining({ name: '新标题', isDeleted: false }),
      });
    });

    it('未挂项目的新文档不登记（产物以项目为归属主键）', async () => {
      const { prisma, registry } = make();
      prisma.artifact.findFirst.mockResolvedValue(null);

      const result = await registry.syncDocument({
        documentId: 'doc1',
        title: '未挂项目',
        projectId: null,
      });

      expect(result).toBeNull();
      expect(prisma.artifact.create).not.toHaveBeenCalled();
    });

    it('文档软删 → 引用行标记 isDeleted', async () => {
      const { prisma, registry } = make();
      prisma.artifact.findFirst.mockResolvedValue({ id: 'art-doc' });
      prisma.artifact.update.mockResolvedValue({ id: 'art-doc' });

      await registry.syncDocument({
        documentId: 'doc1',
        title: 't',
        projectId: 'p1',
        isDeleted: true,
      });

      const arg = prisma.artifact.update.mock.calls[0][0];
      expect(arg.data.isDeleted).toBe(true);
      expect(arg.data.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('upsertExecutionArtifact', () => {
    const base = {
      projectId: 'p1',
      logicalPath: 'src/app.ts',
      fileName: 'app.ts',
      executionId: 'exec1',
      commitSha: 'abc123',
      diffStat: { insertions: 10, deletions: 2, filesTotal: 1 },
      sizeBytes: 1200,
    };

    it('新文件 → 创建产物 + 追加 v1', async () => {
      const { prisma, registry } = make();
      prisma.artifact.findFirst.mockResolvedValue(null);
      prisma.artifact.create.mockResolvedValue({
        id: 'art-exec',
        issueId: null,
        sizeBytes: null,
        checksum: null,
      });
      prisma.artifactVersion.findFirst.mockResolvedValue(null);
      prisma.artifactVersion.create.mockResolvedValue({});
      prisma.artifact.update.mockResolvedValue({});

      await registry.upsertExecutionArtifact(base);

      expect(prisma.artifact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          kind: 'execution',
          logicalPath: 'src/app.ts',
        }),
      });
      expect(prisma.artifactVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          version: 1,
          executionId: 'exec1',
          commitSha: 'abc123',
        }),
      });
    });

    it('同执行同文件重复登记幂等跳过', async () => {
      const { prisma, registry } = make();
      prisma.artifact.findFirst.mockResolvedValue({ id: 'art-exec' });
      prisma.artifactVersion.findFirst
        .mockResolvedValueOnce({ executionId: 'exec1', version: 1 }) // duplicate 检查
        .mockResolvedValueOnce({ version: 1 });

      const result = await registry.upsertExecutionArtifact(base);

      expect(result.id).toBe('art-exec');
      expect(prisma.artifactVersion.create).not.toHaveBeenCalled();
    });

    it('同文件跨执行 → 追加新版本不裂行', async () => {
      const { prisma, registry } = make();
      prisma.artifact.findFirst.mockResolvedValue({ id: 'art-exec' });
      prisma.artifactVersion.findFirst
        .mockResolvedValueOnce(null) // duplicate 检查：本执行未登记
        .mockResolvedValueOnce({ version: 4 }); // 最新版本号
      prisma.artifactVersion.create.mockResolvedValue({});
      prisma.artifact.update.mockResolvedValue({});

      await registry.upsertExecutionArtifact({ ...base, executionId: 'exec2' });

      const arg = prisma.artifactVersion.create.mock.calls[0][0];
      expect(arg.data.version).toBe(5);
      expect(arg.data.executionId).toBe('exec2');
    });

    it('大文件（>5MB）跳过 checksum 诚实置空', async () => {
      const { prisma, storage, registry } = make();
      prisma.artifact.findFirst.mockResolvedValue({ id: 'art-exec' });
      prisma.artifactVersion.findFirst.mockResolvedValue(null);
      prisma.artifactVersion.create.mockResolvedValue({});
      prisma.artifact.update.mockResolvedValue({});

      await registry.upsertExecutionArtifact({
        ...base,
        sizeBytes: 6 * 1024 * 1024,
        contentProvider: async () => Buffer.from('big'),
      });

      expect(storage.checksumBuffer).not.toHaveBeenCalled();
      expect(
        prisma.artifactVersion.create.mock.calls[0][0].data.checksum,
      ).toBeNull();
    });
  });
});
