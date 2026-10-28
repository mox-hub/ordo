import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ArtifactService } from './artifact.service';
import { ArtifactStorageService } from './artifact-storage.service';
import { ArtifactSourceService } from './artifact-source.service';
import { ArtifactQueryDto } from './dto/artifact-query.dto';
import { UpdateArtifactDto } from './dto/update-artifact.dto';
import { ArtifactSourceResponseDto } from './dto/artifact-source-response.dto';
import {
  ArtifactResponseDto,
  ArtifactPageResponseDto,
  ArtifactVersionResponseDto,
} from './dto/artifact-response.dto';
import { ApiStandardErrors } from '../../common/decorators/api-response.decorator';

/** 可 inline 预览的 Content-Type 白名单（svg 因 XSS 面排除，一律 attachment） */
const INLINE_PREVIEW_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'application/pdf',
]);

export function resolveDisposition(
  mimeType: string | null,
): 'inline' | 'attachment' {
  if (!mimeType) return 'attachment';
  if (mimeType === 'image/svg+xml') return 'attachment';
  if (mimeType === 'text/html' || mimeType === 'application/xhtml+xml') {
    return 'attachment';
  }
  if (INLINE_PREVIEW_TYPES.has(mimeType)) return 'inline';
  if (mimeType.startsWith('text/')) return 'inline';
  return 'attachment';
}

@ApiTags('Artifacts')
@ApiBearerAuth('JWT-auth')
@Controller('artifacts')
export class ArtifactController {
  constructor(
    private readonly artifactService: ArtifactService,
    private readonly storage: ArtifactStorageService,
    private readonly sourceService: ArtifactSourceService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get artifacts with pagination' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ArtifactPageResponseDto,
    description:
      '产物分页列表（{ data, meta: { page, pageSize, total, totalPages } }）',
  })
  findAll(@Query() query: ArtifactQueryDto) {
    return this.artifactService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an artifact by ID' })
  @ApiParam({ name: 'id', description: 'Artifact ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ArtifactResponseDto,
    description: '产物详情（document 产物含文档摘要）',
  })
  findOne(@Param('id') id: string) {
    return this.artifactService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an artifact (rename / re-assign issue)' })
  @ApiParam({ name: 'id', description: 'Artifact ID' })
  @ApiStandardErrors()
  @ApiOkResponse({ type: ArtifactResponseDto, description: '返回更新后的产物' })
  update(@Param('id') id: string, @Body() dto: UpdateArtifactDto) {
    return this.artifactService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an artifact (soft delete)' })
  @ApiParam({ name: 'id', description: 'Artifact ID' })
  @ApiStandardErrors()
  @ApiOkResponse({ description: '删除成功' })
  remove(@Param('id') id: string) {
    return this.artifactService.remove(id);
  }

  @Get(':id/versions')
  @ApiOperation({
    summary: 'List artifact versions (document kind proxies DocumentVersion)',
  })
  @ApiParam({ name: 'id', description: 'Artifact ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: [ArtifactVersionResponseDto],
    description: '版本账（升序）',
  })
  listVersions(@Param('id') id: string) {
    return this.artifactService.listVersions(id);
  }

  @Get(':id/raw')
  @ApiOperation({
    summary: 'Stream artifact file content (upload kind, preview/download)',
  })
  @ApiParam({ name: 'id', description: 'Artifact ID' })
  @ApiQuery({
    name: 'version',
    required: false,
    description: '版本序号，缺省最新',
  })
  @ApiProduces('application/octet-stream')
  @ApiStandardErrors()
  async raw(
    @Param('id') id: string,
    @Query('version') versionRaw?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<StreamableFile> {
    let version: number | undefined;
    if (versionRaw !== undefined && versionRaw !== '') {
      version = Number(versionRaw);
      if (!Number.isInteger(version) || version < 1) {
        throw new BadRequestException('version 必须为正整数');
      }
    }
    const { artifact, version: target } =
      await this.artifactService.resolveUploadRaw(id, version);
    const buffer = await this.storage.readVersionBuffer(
      target.storagePath as string,
    );

    const disposition = resolveDisposition(artifact.mimeType);
    const fileName = artifact.name.replace(/["\\\r\n]/g, '_');
    res?.set({
      'Content-Type': artifact.mimeType || 'application/octet-stream',
      'Content-Length': String(buffer.length),
      'Content-Disposition': `${disposition}; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(artifact.name)}`,
      'Cache-Control': 'private, max-age=300',
    });
    return new StreamableFile(buffer);
  }

  @Get(':id/source')
  @ApiOperation({
    summary:
      'Read execution artifact source file (worktree or workspace, read-only)',
  })
  @ApiParam({ name: 'id', description: 'Artifact ID' })
  @ApiQuery({
    name: 'version',
    required: false,
    description: '版本序号，缺省最新',
  })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ArtifactSourceResponseDto,
    description:
      '源文件内容（text/image）或诚实降级（unavailable：worktree TTL 已清理且主区无此文件）',
  })
  async source(
    @Param('id') id: string,
    @Query('version') versionRaw?: string,
  ): Promise<ArtifactSourceResponseDto> {
    let version: number | undefined;
    if (versionRaw !== undefined && versionRaw !== '') {
      version = Number(versionRaw);
      if (!Number.isInteger(version) || version < 1) {
        throw new BadRequestException('version 必须为正整数');
      }
    }
    return this.sourceService.readExecutionSource(id, version);
  }
}
