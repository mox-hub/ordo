import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import {
  ArtifactStorageService,
  ARTIFACT_UPLOAD_HARD_LIMIT_BYTES,
} from './artifact-storage.service';

/**
 * 三源登记核（CAP-A-32）：
 * - upload：人工上传，每次落一个新版本快照（受管存储）
 * - document：文档挂接（引用行 + 名称同步，版本代理 DocumentVersion，不落 ArtifactVersion 行）
 * - execution：执行产物（批二接线：completeExecution collectChanges 钩子），
 *   以 (projectId, logicalPath, 'execution') 为合并键，同文件跨执行追加版本不裂行
 */
@Injectable()
export class ArtifactRegistryService {
  private readonly logger = new Logger(ArtifactRegistryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ArtifactStorageService,
  ) {}

  /** 人工上传登记：创建产物 + v1 */
  async registerUpload(params: {
    projectId: string;
    issueId?: string | null;
    fileName: string;
    mimeType?: string | null;
    buffer: Buffer;
    userId: string;
  }) {
    const checksum = await this.storage.checksumBuffer(params.buffer);
    const artifact = await this.prisma.artifact.create({
      data: {
        projectId: params.projectId,
        issueId: params.issueId ?? null,
        kind: 'upload',
        name: params.fileName,
        mimeType: params.mimeType ?? null,
        sizeBytes: params.buffer.length,
        checksum,
        createdBy: params.userId,
      },
    });
    const version = await this.appendUploadVersion(artifact.id, params);
    return { ...artifact, versionsCount: 1, latestVersion: version.version };
  }

  /** 人工重传：追加版本 v(n+1) 并回填产物当前态 */
  async appendUploadVersion(
    artifactId: string,
    params: {
      fileName: string;
      mimeType?: string | null;
      buffer: Buffer;
      userId: string;
    },
  ) {
    if (params.buffer.length > ARTIFACT_UPLOAD_HARD_LIMIT_BYTES) {
      throw new Error('ARTIFACT_TOO_LARGE');
    }
    const latest = await this.prisma.artifactVersion.findFirst({
      where: { artifactId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latest?.version ?? 0) + 1;
    const storagePath = this.storage.buildVersionRelPath(
      artifactId,
      nextVersion,
      params.fileName,
    );
    await this.storage.saveVersionBuffer(storagePath, params.buffer);
    const checksum = await this.storage.checksumBuffer(params.buffer);

    const [version] = await this.prisma.$transaction([
      this.prisma.artifactVersion.create({
        data: {
          artifactId,
          version: nextVersion,
          origin: 'upload',
          storagePath,
          sizeBytes: params.buffer.length,
          checksum,
          createdBy: params.userId,
        },
      }),
      this.prisma.artifact.update({
        where: { id: artifactId },
        data: {
          name: params.fileName,
          mimeType: params.mimeType ?? undefined,
          sizeBytes: params.buffer.length,
          checksum,
        },
      }),
    ]);
    return version;
  }

  /** 文档挂接：幂等 upsert 引用行（名称/软删态随文档同步） */
  async syncDocument(params: {
    documentId: string;
    title: string;
    projectId?: string | null;
    isDeleted?: boolean;
  }) {
    const existing = await this.prisma.artifact.findFirst({
      where: { documentId: params.documentId, kind: 'document' },
    });

    if (existing) {
      return this.prisma.artifact.update({
        where: { id: existing.id },
        data: {
          name: params.title,
          isDeleted: params.isDeleted ?? false,
          deletedAt: params.isDeleted ? new Date() : null,
        },
      });
    }

    if (params.isDeleted) {
      return null;
    }
    if (!params.projectId) {
      // 未挂项目的文档不进产物视图（产物以项目为归属主键）
      return null;
    }

    return this.prisma.artifact.create({
      data: {
        projectId: params.projectId,
        kind: 'document',
        name: params.title,
        mimeType: 'text/markdown',
        documentId: params.documentId,
        createdBy: 'system',
      },
    });
  }

  /**
   * 执行产物登记（批二接线）：按 (projectId, logicalPath, 'execution') 幂等 upsert，
   * 同文件跨执行追加版本；checksum 仅对小文件（≤5MB）实算，大文件诚实置空。
   * 返回产物 ID 供调用方关联。
   */
  async upsertExecutionArtifact(params: {
    projectId: string;
    issueId?: string | null;
    logicalPath: string;
    fileName: string;
    executionId: string;
    commitSha?: string | null;
    diffStat?: {
      insertions?: number;
      deletions?: number;
      filesTotal?: number;
    } | null;
    sizeBytes?: number | null;
    contentProvider?: () => Promise<Buffer | null>;
    userId?: string | null;
  }) {
    let artifact = await this.prisma.artifact.findFirst({
      where: {
        projectId: params.projectId,
        logicalPath: params.logicalPath,
        kind: 'execution',
      },
    });

    if (!artifact) {
      artifact = await this.prisma.artifact.create({
        data: {
          projectId: params.projectId,
          issueId: params.issueId ?? null,
          kind: 'execution',
          name: params.fileName,
          logicalPath: params.logicalPath,
          createdBy: params.userId ?? 'system',
        },
      });
    }

    // 幂等防重：同一执行对同一文件只落一个版本
    const duplicate = await this.prisma.artifactVersion.findFirst({
      where: { artifactId: artifact.id, executionId: params.executionId },
    });
    if (duplicate) {
      return artifact;
    }

    const latest = await this.prisma.artifactVersion.findFirst({
      where: { artifactId: artifact.id },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    let checksum: string | null = null;
    let content: Buffer | null = null;
    if (params.contentProvider && (params.sizeBytes ?? 0) <= 5 * 1024 * 1024) {
      try {
        content = await params.contentProvider();
        if (content) {
          checksum = await this.storage.checksumBuffer(content);
        }
      } catch (err) {
        this.logger.warn(
          `Failed to read artifact content for checksum: ${params.logicalPath} - ${err}`,
        );
      }
    }

    await this.prisma.artifactVersion.create({
      data: {
        artifactId: artifact.id,
        version: nextVersion,
        origin: 'execution',
        executionId: params.executionId,
        commitSha: params.commitSha ?? null,
        diffStat: params.diffStat
          ? (params.diffStat as Prisma.InputJsonValue)
          : Prisma.DbNull,
        sizeBytes: params.sizeBytes ?? null,
        checksum,
      },
    });

    await this.prisma.artifact.update({
      where: { id: artifact.id },
      data: {
        issueId: params.issueId ?? artifact.issueId,
        sizeBytes: params.sizeBytes ?? artifact.sizeBytes,
        checksum: checksum ?? artifact.checksum,
      },
    });

    return artifact;
  }
}
