import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Artifact 响应契约（CAP-A-32 产物管理）。
 * 裸数据口径，不含 TransformInterceptor 信封。
 */

export class ArtifactVersionResponseDto {
  @ApiProperty({ type: String, description: '版本记录 ID' })
  id: string;

  @ApiProperty({ type: String, description: '产物 ID' })
  artifactId: string;

  @ApiProperty({ type: Number, description: '产物内版本序号（1..n）' })
  version: number;

  @ApiProperty({
    type: String,
    enum: ['upload', 'execution', 'document'],
    description: '版本来源',
  })
  origin: string;

  @ApiPropertyOptional({
    type: String,
    description: '受管存储相对路径（upload）',
    nullable: true,
  })
  storagePath?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '来源执行 ID（execution）',
    nullable: true,
  })
  executionId?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '采集时 commit SHA（execution）',
    nullable: true,
  })
  commitSha?: string | null;

  @ApiPropertyOptional({
    description: 'diff 摘要 { insertions, deletions, filesTotal }（execution）',
    nullable: true,
  })
  diffStat?: {
    insertions?: number;
    deletions?: number;
    filesTotal?: number;
  } | null;

  @ApiPropertyOptional({ type: Number, description: '字节数', nullable: true })
  sizeBytes?: number | null;

  @ApiPropertyOptional({
    type: String,
    description: 'sha256 指纹',
    nullable: true,
  })
  checksum?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '代理的 DocumentVersion ID（document）',
    nullable: true,
  })
  documentVersionId?: string | null;

  @ApiPropertyOptional({ type: String, description: '创建人', nullable: true })
  createdBy?: string | null;

  @ApiProperty({ type: String, format: 'date-time', description: '创建时间' })
  createdAt: Date;
}

export class ArtifactResponseDto {
  @ApiProperty({ type: String, description: '产物 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目 ID' })
  projectId: string;

  @ApiPropertyOptional({
    type: String,
    description: '主归属工单 ID（可空 = 项目级产物）',
    nullable: true,
  })
  issueId?: string | null;

  @ApiProperty({
    type: String,
    enum: ['upload', 'execution', 'document'],
    description: '产物来源类型',
  })
  kind: string;

  @ApiProperty({ type: String, description: '展示名（含扩展名）' })
  name: string;

  @ApiPropertyOptional({
    type: String,
    description: '工作区根相对 POSIX 路径（execution 版本合并键）',
    nullable: true,
  })
  logicalPath?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '引用的文档 ID（kind=document）',
    nullable: true,
  })
  documentId?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'MIME 类型（upload；document 固定 text/markdown）',
    nullable: true,
  })
  mimeType?: string | null;

  @ApiPropertyOptional({
    type: Number,
    description: '当前版本字节数',
    nullable: true,
  })
  sizeBytes?: number | null;

  @ApiPropertyOptional({
    type: String,
    description: '当前版本 sha256（>5MB 执行产物诚实置空）',
    nullable: true,
  })
  checksum?: string | null;

  @ApiProperty({ type: String, description: '创建人用户 ID' })
  createdBy: string;

  @ApiProperty({ type: Boolean, description: '是否已删除' })
  isDeleted: boolean;

  @ApiProperty({ type: String, format: 'date-time', description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time', description: '更新时间' })
  updatedAt: Date;

  @ApiPropertyOptional({
    type: Number,
    description: '版本数（列表返回）',
  })
  versionsCount?: number;

  @ApiPropertyOptional({
    type: Object,
    description: 'document 产物的文档摘要（仅 findOne 的 kind=document 返回）',
    nullable: true,
  })
  document?: { id: string; title: string; status: string } | null;
}

export class ArtifactPageMetaDto {
  @ApiProperty({ type: Number, description: '当前页码' })
  page: number;

  @ApiProperty({ type: Number, description: '页大小' })
  pageSize: number;

  @ApiProperty({ type: Number, description: '总数' })
  total: number;

  @ApiProperty({ type: Number, description: '总页数' })
  totalPages: number;
}

export class ArtifactPageResponseDto {
  @ApiProperty({ type: [ArtifactResponseDto], description: '产物列表' })
  data: ArtifactResponseDto[];

  @ApiProperty({ type: ArtifactPageMetaDto, description: '分页元信息' })
  meta: ArtifactPageMetaDto;
}
