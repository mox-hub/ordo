import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateArtifactDto {
  @ApiPropertyOptional({ description: '展示名（含扩展名）' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    type: String,
    description: '主归属工单 ID（传空串清除归属；仅 upload 产物可改挂）',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  issueId?: string | null;
}
