import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { ArtifactRegistryService } from './artifact-registry.service';

/**
 * 文档挂接订阅器（CAP-A-32）：文档三态事件 → 产物 kind=document 引用行同步。
 * 文档链路零改动，这里只做镜像登记；名称/软删态以文档现值为准（syncDocument 全量对齐）。
 */
@Injectable()
export class ArtifactDocumentSubscriber {
  private readonly logger = new Logger(ArtifactDocumentSubscriber.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ArtifactRegistryService,
  ) {}

  @OnEvent('document.created')
  async onDocumentCreated(payload: { documentId: string }) {
    await this.syncByDocumentId(payload.documentId);
  }

  @OnEvent('document.updated')
  async onDocumentUpdated(payload: { documentId: string }) {
    await this.syncByDocumentId(payload.documentId);
  }

  @OnEvent('document.deleted')
  async onDocumentDeleted(payload: { documentId: string }) {
    await this.syncByDocumentId(payload.documentId);
  }

  /** 以文档现值（标题/项目/软删态）对齐产物引用行，事件乱序安全 */
  private async syncByDocumentId(documentId: string) {
    try {
      const doc = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: { id: true, title: true, projectId: true, isDeleted: true },
      });
      await this.registry.syncDocument({
        documentId,
        title: doc?.title ?? '(已删除文档)',
        projectId: doc?.projectId ?? null,
        isDeleted: doc ? doc.isDeleted : true,
      });
    } catch (err) {
      // 挂接失败不阻断文档主流程；产物列表下次查询可由回填脚本修复
      this.logger.warn(
        `Failed to sync document artifact: ${documentId} - ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
