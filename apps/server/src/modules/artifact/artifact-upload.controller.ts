import {
  Controller,
  Post,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ArtifactRegistryService } from './artifact-registry.service';
import { ArtifactService } from './artifact.service';
import {
  ArtifactResponseDto,
  ArtifactVersionResponseDto,
} from './dto/artifact-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiStandardErrors } from '../../common/decorators/api-response.decorator';
import {
  ARTIFACT_UPLOAD_HARD_LIMIT_BYTES,
  sanitizeFileName,
} from './artifact-storage.service';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** multer 内存存储的文件对象最小接口（避免引入 @types/multer） */
interface MulterFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export class UploadArtifactDto {
  @ApiProperty({ type: String, description: '归属项目 ID' })
  @IsString()
  projectId!: string;

  @ApiPropertyOptional({ type: String, description: '主归属工单 ID' })
  @IsString()
  @IsOptional()
  issueId?: string;
}

@ApiTags('Artifacts')
@ApiBearerAuth('JWT-auth')
@Controller('artifacts')
export class ArtifactUploadController {
  constructor(
    private readonly registry: ArtifactRegistryService,
    private readonly artifactService: ArtifactService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: ARTIFACT_UPLOAD_HARD_LIMIT_BYTES },
    }),
  )
  @ApiOperation({ summary: 'Upload a file as a new artifact (v1)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        issueId: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['projectId', 'file'],
    },
  })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: ArtifactResponseDto,
    description: '返回创建后的产物（v1 已落受管存储）',
  })
  async upload(
    @UploadedFile() file: MulterFileLike | undefined,
    @Body() body: UploadArtifactDto,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('缺少 file 字段（multipart/form-data）');
    }
    return this.registry.registerUpload({
      projectId: body.projectId,
      issueId: body.issueId || null,
      fileName: sanitizeFileName(file.originalname),
      mimeType: file.mimetype || null,
      buffer: file.buffer,
      userId: user.id,
    });
  }

  @Post(':id/versions')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: ARTIFACT_UPLOAD_HARD_LIMIT_BYTES },
    }),
  )
  @ApiOperation({ summary: 'Upload a new version for an existing artifact' })
  @ApiParam({ name: 'id', description: 'Artifact ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ArtifactVersionResponseDto,
    description: '返回追加的版本（v(n+1)）',
  })
  async uploadVersion(
    @Param('id') id: string,
    @UploadedFile() file: MulterFileLike | undefined,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('缺少 file 字段（multipart/form-data）');
    }
    // 存在性与归属校验（非软删、upload 产物）
    const artifact = await this.artifactService.findOne(id);
    if (artifact.kind !== 'upload') {
      throw new BadRequestException('仅 upload 产物支持重传版本');
    }
    const version = await this.registry.appendUploadVersion(id, {
      fileName: sanitizeFileName(file.originalname),
      mimeType: file.mimetype || null,
      buffer: file.buffer,
      userId: user.id,
    });
    return version;
  }
}
