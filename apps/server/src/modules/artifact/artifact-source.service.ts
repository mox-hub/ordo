import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import * as fs from 'node:fs/promises';
import * as path from 'path';

/** 文本预览上限（超过截断并如实标记） */
const TEXT_SOURCE_MAX_BYTES = 1024 * 1024;
/** 图片内联上限（base64 前原始字节） */
const IMAGE_SOURCE_MAX_BYTES = 2 * 1024 * 1024;

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'ico',
]);

export interface ExecutionSourceResult {
  kind: 'text' | 'image' | 'unavailable';
  content?: string;
  dataUrl?: string;
  truncated?: boolean;
  readFrom?: 'worktree' | 'workspace';
  integrationStatus?: string | null;
  message?: string;
}

/**
 * 执行产物源文件读取（CAP-A-32 批二）：文件本体不落库（版本行只记
 * commitSha/diffStat），预览即读执行现场——未合入读 worktree，已合入或
 * worktree 已清理读主工作区（三级回退与 dispatch.getWorkspaceRoot 同口径）。
 * worktree TTL 清理且主区无此文件 → kind='unavailable' 诚实降级（元数据与
 * diff 摘要仍在产物行上）。只读，绝不写执行现场。
 */
@Injectable()
export class ArtifactSourceService {
  private readonly logger = new Logger(ArtifactSourceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async readExecutionSource(
    artifactId: string,
    version?: number,
  ): Promise<ExecutionSourceResult> {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id: artifactId },
    });
    if (!artifact || artifact.isDeleted) {
      throw new NotFoundException(`Artifact not found: ${artifactId}`);
    }
    if (artifact.kind !== 'execution' || !artifact.logicalPath) {
      throw new BadRequestException('仅 execution 产物提供源文件读取');
    }

    const target = version
      ? await this.prisma.artifactVersion.findFirst({
          where: { artifactId, version },
        })
      : await this.prisma.artifactVersion.findFirst({
          where: { artifactId },
          orderBy: { version: 'desc' },
        });
    if (!target?.executionId) {
      throw new NotFoundException(
        `Artifact version not found: ${artifactId}@${version ?? 'latest'}`,
      );
    }

    const execution = await this.prisma.execution.findUnique({
      where: { id: target.executionId },
    });
    const metadata = (execution?.metadata as Record<string, unknown>) ?? {};
    const isolation = metadata.isolation as
      | { mode?: string; worktreePath?: string; projectRoot?: string }
      | undefined;
    const integration = metadata.integration as { status?: string } | undefined;

    // 候选读取点：未合入优先 worktree 现场（合入后可能已清理），再回落主工作区
    const candidates: Array<{ root: string; from: 'worktree' | 'workspace' }> =
      [];
    if (isolation?.mode === 'worktree' && isolation.worktreePath) {
      candidates.push({ root: isolation.worktreePath, from: 'worktree' });
    }
    const mainRoot = await this.resolveWorkspaceRoot(artifact.projectId);
    if (mainRoot) {
      candidates.push({ root: mainRoot, from: 'workspace' });
    }

    for (const candidate of candidates) {
      // 拒绝逻辑路径越界（logicalPath 入库时已规范为相对 POSIX，仍防线校验）
      const absolute = path.resolve(candidate.root, artifact.logicalPath);
      const relFromRoot = path.relative(path.resolve(candidate.root), absolute);
      if (relFromRoot.startsWith('..') || path.isAbsolute(relFromRoot)) {
        continue;
      }
      let stat: Awaited<ReturnType<typeof fs.stat>>;
      try {
        stat = await fs.stat(absolute);
      } catch {
        continue; // 现场不存在，试下一候选
      }
      return this.readFile(
        absolute,
        stat.size,
        candidate.from,
        integration?.status ?? null,
        artifact.logicalPath,
      );
    }

    return {
      kind: 'unavailable',
      integrationStatus: integration?.status ?? null,
      message:
        '执行现场已清理（worktree TTL）且主工作区无此文件；产物元数据与 diff 摘要仍可追溯',
    };
  }

  private async readFile(
    absolute: string,
    size: number,
    readFrom: 'worktree' | 'workspace',
    integrationStatus: string | null,
    logicalPath: string,
  ): Promise<ExecutionSourceResult> {
    const ext = logicalPath.includes('.')
      ? (logicalPath.split('.').pop() ?? '').toLowerCase()
      : '';
    if (IMAGE_EXTENSIONS.has(ext)) {
      if (size > IMAGE_SOURCE_MAX_BYTES) {
        return {
          kind: 'unavailable',
          readFrom,
          integrationStatus,
          message: '图片超过 2MB 内联上限',
        };
      }
      const buf = await fs.readFile(absolute);
      const mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      return {
        kind: 'image',
        dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
        readFrom,
        integrationStatus,
      };
    }
    const buf = await fs.readFile(absolute);
    const truncated = size > TEXT_SOURCE_MAX_BYTES;
    const content = truncated
      ? buf.subarray(0, TEXT_SOURCE_MAX_BYTES).toString('utf8')
      : buf.toString('utf8');
    return { kind: 'text', content, truncated, readFrom, integrationStatus };
  }

  /** 工作区根三级回退（与 dispatch.getWorkspaceRoot 同口径） */
  private async resolveWorkspaceRoot(
    projectId: string,
  ): Promise<string | null> {
    const workspace = await this.prisma.projectWorkspace.findUnique({
      where: { projectId },
    });
    if (workspace?.localPath) return workspace.localPath;

    const config = await this.prisma.appConfig.findFirst({
      where: { scope: 'project', projectId, key: 'git.workspaceRoot' },
    });
    if (config) {
      return (config.value as { path?: string })?.path || null;
    }

    const repo = await this.prisma.repository.findFirst({
      where: { projectId },
    });
    return repo?.localPath || null;
  }
}
