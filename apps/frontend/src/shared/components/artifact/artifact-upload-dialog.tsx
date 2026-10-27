import { useCallback, useRef, useState } from 'react';
import { CheckCircle2, FileUp, TriangleAlert, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileTypeIcon } from '@/components/semantic/file-type-icon';
import { useUploadArtifacts } from '@/modules/artifact/hooks/use-artifacts';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

/**
 * 产物上传对话框（CAP-A-32）：拖拽 + 多选，逐个上传并按文件呈现状态。
 * 归属（projectId/issueId）由宿主页面注入——嵌入工单页即自动挂工单。
 */
export interface ArtifactUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  issueId?: string;
  /** 全部上传完成后回调（宿主刷新列表） */
  onUploaded?: () => void;
}

type UploadState = 'pending' | 'uploading' | 'done' | 'error';

interface UploadItem {
  file: File;
  state: UploadState;
}

export function ArtifactUploadDialog({
  open,
  onOpenChange,
  projectId,
  issueId,
  onUploaded,
}: ArtifactUploadDialogProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadArtifacts();

  const startUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setItems(files.map((file) => ({ file, state: 'uploading' })));
      let allDone = true;
      for (let index = 0; index < files.length; index++) {
        try {
          await uploadMutation.mutateAsync({
            file: files[index],
            projectId,
            issueId,
          });
        } catch {
          allDone = false;
          setItems((prev) =>
            prev.map((item, i) => (i === index ? { ...item, state: 'error' } : item)),
          );
          continue;
        }
        setItems((prev) =>
          prev.map((item, i) => (i === index ? { ...item, state: 'done' } : item)),
        );
      }
      if (allDone) onUploaded?.();
    },
    [uploadMutation, projectId, issueId, onUploaded],
  );

  const resetAndClose = (next: boolean) => {
    if (!next) setItems([]);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent size="default" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('artifact.upload.title', '上传产物')}</DialogTitle>
          <DialogDescription>
            {t('artifact.upload.description', '支持多选与拖拽；单文件上限 50MB。')}
          </DialogDescription>
        </DialogHeader>

        <div
          role="button"
          tabIndex={0}
          aria-label={t('artifact.upload.dropzone', '选择或拖入文件')}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void startUpload(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors',
            dragging ? 'border-ring bg-muted/50' : 'border-border',
            items.length > 0 && 'hidden',
          )}
        >
          <FileUp className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            {t('artifact.upload.dropTitle', '拖入文件，或点击选择')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('artifact.upload.dropHint', '上传后自动进入产物库，可随时预览与版本管理')}
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              void startUpload(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
        </div>

        {items.length > 0 && (
          <ul className="flex max-h-64 flex-col gap-1 overflow-auto" aria-live="polite">
            {items.map((item) => (
              <li
                key={item.file.name + item.file.size}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
              >
                <FileTypeIcon name={item.file.name} mimeType={item.file.type} />
                <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
                {item.state === 'uploading' && (
                  <span className="text-xs text-muted-foreground">
                    {t('artifact.upload.uploading', '上传中…')}
                  </span>
                )}
                {item.state === 'done' && (
                  <CheckCircle2 aria-hidden className="size-4 text-accent-green" />
                )}
                {item.state === 'error' && (
                  <span className="flex items-center gap-1 text-xs text-accent-red">
                    <TriangleAlert aria-hidden className="size-3.5" />
                    {t('artifact.upload.failed', '失败')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => resetAndClose(false)}>
            {items.some((i) => i.state === 'error')
              ? t('common.close', '关闭')
              : t('common.done', '完成')}
          </Button>
          {items.length > 0 && (
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" />
              {t('artifact.upload.more', '继续添加')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
