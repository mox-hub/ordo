import { useState } from 'react';
import { Download, Maximize2, Minimize2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileTypeIcon } from '@/components/semantic/file-type-icon';
import { ArtifactSourceBadge } from '@/components/semantic/artifact-source-badge';
import { FilePreviewer } from './file-previewer';
import { artifactApi, type Artifact } from '@/modules/artifact/api/artifact-api';
import { useArtifactVersions } from '@/modules/artifact/hooks/use-artifacts';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * 产物预览弹窗（CAP-A-32）：窗口二态制（默认 wide ↔ 最大化 full），
 * upload 产物支持选版本预览与下载；document 产物引导跳文档链路。
 */
export interface ArtifactPreviewDialogProps {
  artifact: Artifact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 打开时预览的版本序号（缺省最新；受控于宿主，关闭后由宿主置回） */
  version?: number;
}

export function ArtifactPreviewDialog({
  artifact,
  open,
  onOpenChange,
  version: initialVersion,
}: ArtifactPreviewDialogProps) {
  const { t } = useTranslation();
  const [maximized, setMaximized] = useState(false);
  const [version, setVersion] = useState<string>('latest');
  // 宿主指定历史版本时以受控值优先（如版本列表「预览此版」）
  const effectiveVersion = initialVersion ? String(initialVersion) : version;
  const { data: versions } = useArtifactVersions(
    open && artifact?.kind === 'upload' ? artifact.id : undefined,
  );

  const handleDownload = async () => {
    if (!artifact || artifact.kind !== 'upload') return;
    const blob = await artifactApi.fetchBlob(
      artifact.id,
      effectiveVersion === 'latest' ? undefined : Number(effectiveVersion),
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = artifact.name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size={maximized ? 'full' : 'wide'}
        className="flex h-[min(84vh,760px)] flex-col gap-0 overflow-hidden"
      >
        <DialogHeader className="shrink-0 border-b border-border pr-10">
          <div className="flex min-w-0 items-center gap-2">
            {artifact && (
              <>
                <FileTypeIcon name={artifact.name} mimeType={artifact.mimeType} />
                <DialogTitle className="truncate text-base">
                  {artifact.name}
                </DialogTitle>
                <ArtifactSourceBadge kind={artifact.kind as Artifact['kind']} />
                <DialogDescription className="sr-only">
                  {t('artifact.preview.dialogTitle', '产物预览')}
                </DialogDescription>
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  {artifact.kind === 'upload' && (versions?.length ?? 0) > 1 && (
                    <Select value={effectiveVersion} onValueChange={setVersion}>
                      <SelectTrigger size="sm" className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="latest">
                          {t('artifact.preview.latestVersion', '最新版')}
                        </SelectItem>
                        {versions?.map((v) => (
                          <SelectItem key={v.id} value={String(v.version)}>
                            v{v.version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {artifact.kind === 'upload' && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void handleDownload()}
                      aria-label={t('artifact.preview.download', '下载')}
                    >
                      <Download className="size-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setMaximized((v) => !v)}
                    aria-label={
                      maximized
                        ? t('artifact.preview.restore', '还原')
                        : t('artifact.preview.maximize', '最大化')
                    }
                  >
                    {maximized ? (
                      <Minimize2 className="size-4" />
                    ) : (
                      <Maximize2 className="size-4" />
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogHeader>
        {artifact && (
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <FilePreviewer
              key={`${artifact.id}@${effectiveVersion}`}
              artifact={artifact}
              version={effectiveVersion === 'latest' ? undefined : Number(effectiveVersion)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
