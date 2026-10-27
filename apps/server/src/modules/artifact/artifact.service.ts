import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ArtifactQueryDto } from './dto/artifact-query.dto';
import { UpdateArtifactDto } from './dto/update-artifact.dto';
import { ArtifactStorageService } from './artifact-storage.service';

@Injectable()
export class ArtifactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ArtifactStorageService,
  ) {}

  async findAll(query: ArtifactQueryDto) {
    const {
      projectId,
      issueId,
      executionId,
      kind,
      documentId,
      mime,
      q,
      page = 1,
      pageSize = 20,
    } = query;

    const where: any = { isDeleted: false };
    if (projectId) where.projectId = projectId;
    if (issueId) where.issueId = issueId;
    if (documentId) where.documentId = documentId;
    if (kind && kind !== 'all') where.kind = kind;
    if (mime) where.mimeType = { startsWith: mime };
    if (q) where.name = { contains: q };
    if (executionId) where.versions = { some: { executionId } };

    const [rows, total] = await Promise.all([
      this.prisma.artifact.findMany({
        where,
        include: { _count: { select: { versions: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.artifact.count({ where }),
    ]);

    const data = await this.enrichDocumentRows(
      rows.map(({ _count, ...row }) => ({
        ...row,
        versionsCount: _count.versions,
      })),
    );

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string) {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id },
      include: { _count: { select: { versions: true } } },
    });
    if (!artifact || artifact.isDeleted) {
      throw new NotFoundException(`Artifact not found: ${id}`);
    }
    const [enriched] = await this.enrichDocumentRows([
      {
        ...artifact,
        versionsCount: artifact._count.versions,
      } as any,
    ]);
    delete enriched.versionsCount;
    return enriched;
  }

  async update(id: string, dto: UpdateArtifactDto) {
    const artifact = await this.getExisting(id);
    if (dto.issueId !== undefined && artifact.kind !== 'upload') {
      throw new BadRequestException(
        '仅 upload 产物可改挂工单（execution/document 归属随来源）',
      );
    }
    return this.prisma.artifact.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        issueId:
          dto.issueId === undefined
            ? undefined
            : dto.issueId === ''
              ? null
              : dto.issueId,
      },
    });
  }

  async remove(id: string) {
    await this.getExisting(id);
    await this.prisma.artifact.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { id, deleted: true };
  }

  /** 版本账：upload/execution 读 ArtifactVersion；document 代理 DocumentVersion 不复制数据 */
  async listVersions(id: string) {
    const artifact = await this.getExisting(id);

    if (artifact.kind === 'document' && artifact.documentId) {
      const docVersions = await this.prisma.documentVersion.findMany({
        where: { documentId: artifact.documentId },
        orderBy: { createdAt: 'asc' },
      });
      return docVersions.map((dv, index) => ({
        id: `docver:${dv.id}`,
        artifactId: id,
        version: index + 1,
        origin: 'document' as const,
        storagePath: null,
        executionId: null,
        commitSha: null,
        diffStat: null,
        sizeBytes: null,
        checksum: null,
        documentVersionId: dv.id,
        createdBy: dv.createdBy,
        createdAt: dv.createdAt,
      }));
    }

    const versions = await this.prisma.artifactVersion.findMany({
      where: { artifactId: id },
      orderBy: { version: 'asc' },
    });
    return versions;
  }

  /** 解析 raw 预览/下载目标（upload 产物；version 缺省取最新） */
  async resolveUploadRaw(id: string, version?: number) {
    const artifact = await this.getExisting(id);
    if (artifact.kind !== 'upload') {
      throw new BadRequestException(
        `kind=${artifact.kind} 的产物无受管文件本体（document 走文档链路，execution 批二提供源文件读取）`,
      );
    }
    const target = version
      ? await this.prisma.artifactVersion.findFirst({
          where: { artifactId: id, version },
        })
      : await this.prisma.artifactVersion.findFirst({
          where: { artifactId: id },
          orderBy: { version: 'desc' },
        });
    if (!target?.storagePath) {
      throw new NotFoundException(
        `Artifact version not found: ${id}@${version ?? 'latest'}`,
      );
    }
    const absolute = await this.storage.resolveAbsolute(target.storagePath);
    return { artifact, version: target, absolute };
  }

  private async getExisting(id: string) {
    const artifact = await this.prisma.artifact.findUnique({ where: { id } });
    if (!artifact || artifact.isDeleted) {
      throw new NotFoundException(`Artifact not found: ${id}`);
    }
    return artifact;
  }

  /** document 产物行用文档现值（标题）充实，改名即反映 */
  private async enrichDocumentRows<
    T extends { kind: string; documentId?: string | null },
  >(rows: T[]): Promise<T[]> {
    const docIds = rows
      .filter((r) => r.kind === 'document' && r.documentId)
      .map((r) => r.documentId as string);
    if (docIds.length === 0) {
      return rows.map((r) => ({ ...r, document: null }));
    }
    const docs = await this.prisma.document.findMany({
      where: { id: { in: docIds } },
      select: { id: true, title: true, status: true },
    });
    const docMap = new Map(docs.map((d) => [d.id, d]));
    return rows.map((r) =>
      r.kind === 'document' && r.documentId
        ? { ...r, document: docMap.get(r.documentId) ?? null }
        : { ...r, document: null },
    );
  }
}
