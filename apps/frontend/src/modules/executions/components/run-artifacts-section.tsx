import { useState } from 'react';
import { PackageOpen } from 'lucide-react';
import { DetailSection } from '@/components/semantic/detail-section';
import { FileTypeIcon } from '@/components/semantic/file-type-icon';
import { Button } from '@/components/ui/button';
import { useArtifacts } from '@/modules/artifact/hooks/use-artifacts';
import type { Artifact } from '@/modules/artifact/api/artifact-api';
import { ArtifactPreviewDialog } from '@/shared/components/artifact/artifact-preview-dialog';
import { formatBytes } from '@/lib/format';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * 执行详情产出区块（CAP-A-32 批二）：本次执行自动登记的变更文件产物，
 * 点击开预览（代码/图片读执行现场源文件）。无产物不占位。
 */

const INTEGRATION_BADGE: Record<string, { label: string; className: string }> = {
  'pending-review': {
    label: '未合入',
    className: 'bg-accent-yellow-light text-accent-yellow',
  },
  merged: {
    label: '已合入',
    className: 'bg-accent-green-light text-accent-green',
  },
  rejected: {
    label: '已拒绝',
    className: 'bg-accent-red-light text-accent-red',
  },
};

export function RunArtifactsSection({
  executionId,
  metadata,
}: {
  executionId: string;
  metadata?: Record<string, unknown> | null;
}) {
  const { t } = useTranslation();
  const [previewing, setPreviewing] = useState<Artifact | null>(null);
  const { data, isLoading } = useArtifacts({ executionId, pageSize: 50 });
  const items = data?.data ?? [];
  const integration = (metadata?.integration as { status?: string } | undefined)?.status;
  const integrationBadge = integration ? INTEGRATION_BADGE[integration] : undefined;

  if (!isLoading && items.length === 0) {
    return null;
  }

  return (
    <>
      <DetailSection
        icon={<PackageOpen className="size-3.5" />}
        title={t('artifact.section.title', '产物')}
        count={items.length}
        collapsible={false}
        action={
          integrationBadge ? (
            <span
              className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${integrationBadge.className}`}
            >
              {integrationBadge.label}
            </span>
          ) : undefined
        }
      >
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setPreviewing(item)}
                data-ai-component="executions.run-details.artifact-row"
                className="flex w-full items-center gap-2.5 px-4 py-1.5 text-left transition-colors hover:bg-muted/50"
              >
                <FileTypeIcon name={item.name} mimeType={item.mimeType} />
                <span className="font-mono text-xs text-muted-foreground">
                  {item.logicalPath}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  {item.sizeBytes != null && (
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {formatBytes(item.sizeBytes)}
                    </span>
                  )}
                  <Button variant="ghost" size="sm" tabIndex={-1}>
                    {t('artifact.versions.preview', '预览此版本')}
                  </Button>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </DetailSection>

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
