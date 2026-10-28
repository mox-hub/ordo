import { Module } from '@nestjs/common';
import { ArtifactController } from './artifact.controller';
import { ArtifactUploadController } from './artifact-upload.controller';
import { ArtifactService } from './artifact.service';
import { ArtifactRegistryService } from './artifact-registry.service';
import { ArtifactStorageService } from './artifact-storage.service';
import { ArtifactSourceService } from './artifact-source.service';
import { ArtifactDocumentSubscriber } from './artifact-document.subscriber';

/**
 * 产物管理（CAP-A-32）：统一产物层——upload 人工上传 / execution 执行产物（批二接线）/
 * document 文档挂接（事件订阅）三源登记，受管存储 + 版本账 + raw 预览。
 */
@Module({
  controllers: [ArtifactController, ArtifactUploadController],
  providers: [
    ArtifactService,
    ArtifactRegistryService,
    ArtifactStorageService,
    ArtifactSourceService,
    ArtifactDocumentSubscriber,
  ],
  exports: [
    ArtifactRegistryService,
    ArtifactStorageService,
    ArtifactSourceService,
  ],
})
export class ArtifactModule {}
