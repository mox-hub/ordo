import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageOpen, Plus } from 'lucide-react';
import { DetailSection } from '@/components/semantic/detail-section';
import { FileTypeIcon } from '@/components/semantic/file-type-icon';
import { ArtifactSourceBadge } from '@/components/semantic/artifact-source-badge';
import { Button } from '@/components/ui/button';
import { useArtifacts } from '@/modules/artifact/hooks/use-artifacts';
import type { Artifact } from '@/modules/artifact/api/artifact-api';
import { formatBytes, formatRelative } from '@/lib/format';
import { ArtifactUploadDialog } from './artifact-upload-dialog';
import { ArtifactPreviewDialog } from './artifact-preview-dialog';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * 产物区块（CAP-A-32 标准嵌入件）：工单详情/项目详情等业务页面即插即用。
 * props 收敛为归属（projectId + issueId?），上传/列表/预览/溯源全内置——
 * 宿主页面不接触 artifact 模块内部。
 */
export interface ArtifactSectionProps {
  projectId: string;
  /** 传则只列该工单的产物并自动挂新上传；不传列项目级产物库 */
  issueId?: string;
  title?: string;
  defaultCollapsed?: boolean;
}

export function ArtifactSection({
  projectId,
  issueId,
  title,
  defaultCollapsed,
}: ArtifactSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewing, setPreviewing] = useState<Artifact | null>(null);
  const { data, isLoading } = useArtifacts({
    projectId,
    issueId,
    pageSize: 50,
  });
  const items = data?.data ?? [];

  const handleItemClick = (item: Artifact) => {
    if (item.kind === 'document' && item.documentId) {
      navigate(`/app/documents/${item.documentId}`);
      return;
    }
    setPreviewing(item);
  };

  return (
    <>
      <DetailSection
        icon={<PackageOpen className="size-3.5" />}
        title={title ?? t('artifact.section.title', '产物')}
        count={items.length}
        action={
          <Button variant="ghost" size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="size-4" />
            {t('artifact.section.upload', '上传')}
          </Button>
        }
        defaultCollapsed={defaultCollapsed}
      >
        {isLoading && (
          <p className="px-6 py-3 text-sm text-muted-foreground">
            {t('common.loading', '加载中…')}
          </p>
        )}
        {!isLoading && items.length === 0 && (
          <p className="px-6 py-3 text-sm text-muted-foreground">
            {t('artifact.section.empty', '暂无产物；可上传文件，AI 任务执行产生的文件会自动出现在这里')}
          </p>
        )}
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleItemClick(item)}
                className="flex w-full items-center gap-2.5 border-b border-border px-6 py-2 text-left transition-colors last:border-b-0 hover:bg-muted/50"
              >
                <FileTypeIcon name={item.name} mimeType={item.mimeType} />
                <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                <ArtifactSourceBadge
                  kind={item.kind as Artifact['kind']}
                  to={
                    item.kind === 'execution'
                      ? '/app/executions'
                      : item.kind === 'document' && item.documentId
                        ? `/app/documents/${item.documentId}`
                        : undefined
                  }
                />
                {item.sizeBytes != null && (
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatBytes(item.sizeBytes)}
                  </span>
                )}
                <span className="w-16 text-right text-xs text-muted-foreground">
                  {formatRelative(item.updatedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </DetailSection>

      <ArtifactUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projectId={projectId}
        issueId={issueId}
      />
      <ArtifactPreviewDialog
        artifact={previewing}
        open={previewing !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewing(null);
        }}
      />
    </>
  );
}
