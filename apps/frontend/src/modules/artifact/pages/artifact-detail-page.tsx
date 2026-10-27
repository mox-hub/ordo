import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, ExternalLink, Package } from 'lucide-react';
import { DetailPageFrame } from '@/components/semantic/detail-page-frame';
import { SubPageToolbar } from '@/components/semantic/sub-page-toolbar';
import { PropertyRow, PropsCard } from '@/shared/components/property-panel';
import { Button } from '@/components/ui/button';
import { FileTypeIcon } from '@/components/semantic/file-type-icon';
import { ArtifactSourceBadge } from '@/components/semantic/artifact-source-badge';
import { AsyncState } from '@/components/semantic/async-state';
import { FilePreviewer } from '@/shared/components/artifact/file-previewer';
import { ArtifactVersionList } from '@/shared/components/artifact/artifact-version-list';
import { ArtifactPreviewDialog } from '@/shared/components/artifact/artifact-preview-dialog';
import { useArtifactDetail, useArtifactVersions } from '@/modules/artifact/hooks/use-artifacts';
import { artifactApi, type Artifact } from '@/modules/artifact/api/artifact-api';
import { formatBytes, formatDateTime } from '@/lib/format';

/**
 * 产物详情页（CAP-A-32）：主栏 = 分级预览器 + 版本账；
 * 右栏 = 属性（类型/大小/指纹/时间）与溯源（工单/项目/文档/执行）。
 */
export function ArtifactDetailPage() {
  const { artifactId } = useParams<{ artifactId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: artifact, isLoading, isError } = useArtifactDetail(artifactId);
  const { data: versions } = useArtifactVersions(artifactId);
  const [previewing, setPreviewing] = useState<{ artifact: Artifact; version: number } | null>(
    null,
  );
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [lineageCollapsed, setLineageCollapsed] = useState(false);

  const handleDownload = async (target: Artifact) => {
    const blob = await artifactApi.fetchBlob(target.id);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = target.name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const executionVersion = versions?.find((v) => v.executionId);

  if (isLoading || !artifact) {
    return (
      <DetailPageFrame
        aiPage="artifact-artifact-detail"
        toolbar={({ sidebar }) => (
          <SubPageToolbar
            aiId="artifacts.detail"
            onBack={() => navigate('/app/artifacts')}
            breadcrumbs={[{ label: t('artifact.title', '产物') }]}
            titleIcon={<Package className="size-4" />}
            sidebar={sidebar}
          />
        )}
        main={
          <AsyncState
            isLoading={isLoading}
            isEmpty={isError}
            emptyTitle={t('artifact.detail.notFound', '产物不存在或已被删除')}
            emptyVariant="page"
          >
            <span />
          </AsyncState>
        }
      />
    );
  }

  return (
    <>
      <DetailPageFrame
      aiPage="artifact-artifact-detail"
      toolbar={({ sidebar }) => (
        <SubPageToolbar
          aiId="artifacts.detail"
          breadcrumbs={[
            { label: t('artifact.title', '产物'), to: '/app/artifacts' },
            { label: artifact.name },
          ]}
          titleIcon={<Package className="size-4" />}
          actions={
            artifact.kind === 'upload' && (
              <Button
                variant="outline"
                size="sm"
                data-ai-action="artifact.artifact-detail.download.click"
                onClick={() => void handleDownload(artifact)}
              >
                <Download className="size-4" />
                {t('artifact.preview.download', '下载')}
              </Button>
            )
          }
          sidebar={sidebar}
        />
      )}
      main={
        <div className="flex flex-col gap-4">
          <div className="flex min-h-96 flex-col">
            <FilePreviewer artifact={artifact} />
          </div>
          <ArtifactVersionList
            artifact={artifact}
            onPreviewVersion={(version) => setPreviewing({ artifact, version })}
          />
        </div>
      }
      aside={
        <div className="flex flex-col gap-3">
          <PropsCard
            title={t('artifact.aside.properties', '属性')}
            icon={<Package className="size-3" />}
            collapsed={propsCollapsed}
            onToggleCollapse={() => setPropsCollapsed((v) => !v)}
          >
            <PropertyRow label={t('artifact.aside.name', '名称')} icon={<FileTypeIcon name={artifact.name} mimeType={artifact.mimeType} />}>
                <span className="break-all text-sm">{artifact.name}</span>
              </PropertyRow>
              <PropertyRow label={t('artifact.aside.kind', '来源')}>
                <ArtifactSourceBadge kind={artifact.kind as Artifact['kind']} />
              </PropertyRow>
              <PropertyRow label={t('artifact.aside.type', '类型')}>
                <span className="font-mono text-xs">
                  {artifact.mimeType ?? t('artifact.preview.unknownType', '未知类型')}
                </span>
              </PropertyRow>
              <PropertyRow label={t('artifact.aside.size', '大小')}>
                <span className="font-mono text-xs tabular-nums">
                  {artifact.sizeBytes != null ? formatBytes(artifact.sizeBytes) : '—'}
                </span>
              </PropertyRow>
              <PropertyRow label={t('artifact.aside.checksum', '指纹 (SHA-256)')}>
                <span
                  className="font-mono text-xs break-all"
                  title={artifact.checksum ?? undefined}
                >
                  {artifact.checksum
                    ? `${artifact.checksum.slice(0, 16)}…`
                    : t('artifact.aside.checksumSkipped', '未计算')}
                </span>
              </PropertyRow>
              <PropertyRow label={t('artifact.aside.createdAt', '创建时间')}>
                <span className="text-xs">{formatDateTime(artifact.createdAt)}</span>
              </PropertyRow>
              <PropertyRow label={t('artifact.aside.updatedAt', '更新时间')}>
                <span className="text-xs">{formatDateTime(artifact.updatedAt)}</span>
              </PropertyRow>
          </PropsCard>

          <PropsCard
            title={t('artifact.aside.lineage', '溯源')}
            icon={<ExternalLink className="size-3" />}
            collapsed={lineageCollapsed}
            onToggleCollapse={() => setLineageCollapsed((v) => !v)}
          >
            {artifact.issueId && (
                <PropertyRow label={t('artifact.aside.issue', '归属工单')}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/app/issues/${artifact.issueId}`)}
                  >
                    <span className="font-mono text-xs">{artifact.issueId.slice(0, 8)}</span>
                    <ExternalLink className="size-3" />
                  </Button>
                </PropertyRow>
              )}
              {executionVersion?.executionId && (
                <PropertyRow label={t('artifact.aside.execution', '来源执行')}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/app/executions')}
                  >
                    <span className="font-mono text-xs">
                      {executionVersion.commitSha?.slice(0, 7) ??
                        executionVersion.executionId.slice(0, 8)}
                    </span>
                    <ExternalLink className="size-3" />
                  </Button>
                </PropertyRow>
              )}
              {artifact.kind === 'document' && artifact.documentId && (
                <PropertyRow label={t('artifact.aside.document', '文档')}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/app/documents/${artifact.documentId}`)}
                  >
                    {t('artifact.aside.openDocument', '打开文档')}
                    <ExternalLink className="size-3" />
                  </Button>
                </PropertyRow>
              )}
              {!artifact.issueId && !executionVersion?.executionId && artifact.kind !== 'document' && (
                <p className="text-xs text-muted-foreground">
                  {t('artifact.aside.lineageEmpty', '人工上传产物')}
                </p>
              )}
          </PropsCard>
        </div>
      }
    />

      {/* 历史版本预览（版本列表「预览此版」入口） */}
      <ArtifactPreviewDialog
        artifact={previewing?.artifact ?? null}
        version={previewing?.version}
        open={previewing !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewing(null);
        }}
      />
    </>
  );
}
