import { Download, Eye, GitCommitHorizontal } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { artifactApi, type Artifact } from '@/modules/artifact/api/artifact-api';
import { useArtifactVersions } from '@/modules/artifact/hooks/use-artifacts';
import { formatBytes, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { DetailSection } from '@/components/semantic/detail-section';
import { ArtifactSourceBadge } from '@/components/semantic/artifact-source-badge';

/**
 * 产物版本账列表（CAP-A-32）：三源统一时间线。
 * upload 显示大小/checksum + 预览/下载；execution 显示 commitSha + diff 摘要；
 * document 为代理行（跳文档详情看内容）。
 */
export interface ArtifactVersionListProps {
  artifact: Artifact;
  /** 点击「预览此版」回调（upload 产物，宿主决定如何呈现） */
  onPreviewVersion?: (version: number) => void;
}

export function ArtifactVersionList({ artifact, onPreviewVersion }: ArtifactVersionListProps) {
  const { t } = useTranslation();
  const { data: versions, isLoading } = useArtifactVersions(artifact.id);

  const handleDownload = async (version: number) => {
    const blob = await artifactApi.fetchBlob(artifact.id, version);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = artifact.name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <DetailSection
      icon={<GitCommitHorizontal className="size-3.5" />}
      title={t('artifact.versions.title', '版本历史')}
      count={versions?.length}
    >
      {isLoading && (
        <p className="px-6 py-3 text-sm text-muted-foreground">
          {t('common.loading', '加载中…')}
        </p>
      )}
      {!isLoading && (versions?.length ?? 0) === 0 && (
        <p className="px-6 py-3 text-sm text-muted-foreground">
          {t('artifact.versions.empty', '暂无版本记录')}
        </p>
      )}
      <ul className="flex flex-col">
        {versions?.map((v) => (
          <li
            key={v.id}
            className="flex items-center gap-3 border-b border-border px-6 py-2.5 last:border-b-0"
          >
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              v{v.version}
            </span>
            <ArtifactSourceBadge kind={v.origin as Artifact['kind']} />
            <span className="text-xs text-muted-foreground">
              {formatDateTime(v.createdAt)}
            </span>
            {v.sizeBytes != null && (
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {formatBytes(v.sizeBytes)}
              </span>
            )}
            {v.commitSha && (
              <span
                className="font-mono text-xs tabular-nums text-muted-foreground"
                title={v.commitSha}
              >
                {v.commitSha.slice(0, 7)}
              </span>
            )}
            {v.diffStat && (
              <span className="font-mono text-xs tabular-nums">
                <span className="text-accent-green">+{v.diffStat.insertions ?? 0}</span>{' '}
                <span className="text-accent-red">−{v.diffStat.deletions ?? 0}</span>
              </span>
            )}
            <span className="ml-auto flex items-center gap-1">
              {artifact.kind === 'upload' && onPreviewVersion && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('artifact.versions.preview', '预览此版本')}
                  onClick={() => onPreviewVersion(v.version)}
                >
                  <Eye className="size-4" />
                </Button>
              )}
              {artifact.kind === 'upload' && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('artifact.versions.download', '下载此版本')}
                  onClick={() => void handleDownload(v.version)}
                >
                  <Download className="size-4" />
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </DetailSection>
  );
}
