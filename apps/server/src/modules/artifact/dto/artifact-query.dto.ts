import { IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const KIND_ENUM = ['upload', 'execution', 'document'] as const;

export class ArtifactQueryDto {
  @ApiPropertyOptional({ description: '按项目过滤' })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: '按主归属工单过滤' })
  @IsString()
  @IsOptional()
  issueId?: string;

  @ApiPropertyOptional({ description: '按来源执行过滤（execution 产物）' })
  @IsString()
  @IsOptional()
  executionId?: string;

  @ApiPropertyOptional({
    description: '按来源类型过滤',
    enum: [...KIND_ENUM, 'all'],
  })
  @IsIn([...KIND_ENUM, 'all'])
  @IsOptional()
  kind?: string;

  @ApiPropertyOptional({ description: '按文档 ID 过滤（document 产物）' })
  @IsString()
  @IsOptional()
  documentId?: string;

  @ApiPropertyOptional({ description: '按 MIME 前缀过滤（如 image/、text/）' })
  @IsString()
  @IsOptional()
  mime?: string;

  @ApiPropertyOptional({ description: '按名称搜索' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size', default: 20 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  pageSize?: number = 20;
}
