import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 执行产物源文件读取响应（CAP-A-32 批二）。
 * kind='unavailable' 为诚实降级（worktree TTL 清理且主区无此文件），HTTP 仍 200——
 * 降级是查询结果而非传输错误，前端按 kind 分支呈现。
 */
export class ArtifactSourceResponseDto {
  @ApiProperty({
    type: String,
    enum: ['text', 'image', 'unavailable'],
    description: '读取结果形态',
  })
  kind: 'text' | 'image' | 'unavailable';

  @ApiPropertyOptional({
    type: String,
    description: '文本内容（kind=text；>1MB 截断并置 truncated）',
  })
  content?: string;

  @ApiPropertyOptional({
    type: String,
    description: '图片 data URL（kind=image，≤2MB）',
  })
  dataUrl?: string;

  @ApiPropertyOptional({ type: Boolean, description: '文本是否被截断' })
  truncated?: boolean;

  @ApiPropertyOptional({
    type: String,
    enum: ['worktree', 'workspace'],
    description: '实际读取现场',
  })
  readFrom?: 'worktree' | 'workspace';

  @ApiPropertyOptional({
    type: String,
    description: '执行合入状态（pending-review=未合入 / merged 等）',
    nullable: true,
  })
  integrationStatus?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'unavailable 时的诚实说明',
  })
  message?: string;
}
