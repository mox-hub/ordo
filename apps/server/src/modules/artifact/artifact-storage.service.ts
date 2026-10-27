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
import * as os from 'os';
import * as crypto from 'crypto';

export interface ArtifactStorageConfig {
  basePath: string;
  /** 单文件上限（字节）；multer 拦截层另有静态硬顶 */
  maxBytes: number;
}

export const ARTIFACT_STORAGE_CONFIG_KEY = 'artifact.storage.config';
const STORAGE_SCOPE = 'global';
/** multer 内存存储静态硬顶（拦截层兜底，可配置上限不得高于此值） */
export const ARTIFACT_UPLOAD_HARD_LIMIT_BYTES = 50 * 1024 * 1024;

function defaultStorageConfig(): ArtifactStorageConfig {
  const homeDir = os.homedir();
  return {
    basePath: path.join(homeDir, 'ordo', 'artifacts'),
    maxBytes: 50 * 1024 * 1024,
  };
}

/** 文件名消毒：剥路径分隔符/控制字符，防 Windows 保留尾点尾空格，首尾连字符一并剥除，超长截断 */
export function sanitizeFileName(input: string): string {
  const cleaned = input

    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '-')
    .replace(/[\s.]+$/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return cleaned || 'file';
}

@Injectable()
export class ArtifactStorageService {
  private readonly logger = new Logger(ArtifactStorageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getConfig(): Promise<ArtifactStorageConfig> {
    const record = await this.prisma.appConfig.findFirst({
      where: { key: ARTIFACT_STORAGE_CONFIG_KEY, scope: STORAGE_SCOPE },
    });
    if (!record) {
      return defaultStorageConfig();
    }
    const value = (record.value ?? {}) as Partial<ArtifactStorageConfig>;
    return { ...defaultStorageConfig(), ...value };
  }

  private configRecordId(): string {
    return `appconfig_${STORAGE_SCOPE}_${ARTIFACT_STORAGE_CONFIG_KEY}`;
  }

  /** 版本级受管存储相对路径（POSIX 风格入库，磁盘按平台 join） */
  buildVersionRelPath(
    artifactId: string,
    version: number,
    fileName: string,
  ): string {
    return `${artifactId}/v${version}/${sanitizeFileName(fileName)}`;
  }

  /** 相对路径 → 绝对路径，并强制约束在 basePath 之内（拒越界） */
  async resolveAbsolute(relPath: string): Promise<string> {
    const cfg = await this.getConfig();
    const basePath = path.resolve(cfg.basePath);
    const absolute = path.resolve(basePath, relPath);
    const relFromBase = path.relative(basePath, absolute);
    if (relFromBase.startsWith('..') || path.isAbsolute(relFromBase)) {
      throw new BadRequestException('存储路径越界');
    }
    return absolute;
  }

  async saveVersionBuffer(relPath: string, buffer: Buffer): Promise<void> {
    const absolute = await this.resolveAbsolute(relPath);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, buffer);
  }

  async readVersionBuffer(relPath: string): Promise<Buffer> {
    const absolute = await this.resolveAbsolute(relPath);
    try {
      return await fs.readFile(absolute);
    } catch {
      throw new NotFoundException(`产物文件缺失: ${relPath}`);
    }
  }

  async checksumBuffer(buffer: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /** 硬删时清理产物目录（软删保留现场） */
  async deleteArtifactDir(artifactId: string): Promise<boolean> {
    const cfg = await this.getConfig();
    const dir = path.resolve(path.resolve(cfg.basePath), artifactId);
    const relFromBase = path.relative(path.resolve(cfg.basePath), dir);
    if (relFromBase.startsWith('..') || path.isAbsolute(relFromBase)) {
      return false;
    }
    try {
      await fs.rm(dir, { recursive: true, force: true });
      return true;
    } catch (err) {
      this.logger.warn(`Failed to remove artifact dir: ${dir} - ${err}`);
      return false;
    }
  }
}
