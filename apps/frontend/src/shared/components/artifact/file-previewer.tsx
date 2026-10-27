import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { Download, FileWarning } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { artifactApi, type Artifact } from '@/modules/artifact/api/artifact-api';
import { FileTypeIcon } from '@/components/semantic/file-type-icon';
import { MarkdownView } from '@/shared/components/markdown-view';
import { formatBytes } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 文件预览器（CAP-A-32 分级预览唯一实现）：
 * image / markdown / 文本代码（rehype-highlight）/ pdf 全预览；
 * 其余格式诚实降级为元数据卡 + 下载，绝不假装预览。
 */
export type PreviewMode = 'image' | 'markdown' | 'code' | 'pdf' | 'fallback';

const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'go', 'rs', 'java', 'c', 'h',
  'cpp', 'hpp', 'cs', 'rb', 'php', 'swift', 'kt', 'sh', 'bat', 'ps1', 'sql',
  'html', 'htm', 'css', 'scss', 'less', 'json', 'yaml', 'yml', 'toml', 'xml',
  'vue', 'svelte', 'graphql', 'prisma',
]);

/** 文本预览上限：超过则降级为下载（1MB，避免大文件渲染卡顿） */
export const TEXT_PREVIEW_MAX_BYTES = 1024 * 1024;

export function resolvePreviewMode(artifact: {
  name: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
}): PreviewMode {
  const mime = artifact.mimeType ?? '';
  const ext = artifact.name.includes('.')
    ? (artifact.name.split('.').pop() ?? '').toLowerCase()
    : undefined;

  if (mime === 'image/svg+xml') return 'fallback'; // svg 有内联脚本面，一律下载
  if (mime.startsWith('image/')) return 'image';
  if (IMAGE_MIME_BY_EXT.has(ext ?? '')) return 'image';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (ext === 'md' || ext === 'markdown' || mime === 'text/markdown') {
    return (artifact.sizeBytes ?? 0) <= TEXT_PREVIEW_MAX_BYTES ? 'markdown' : 'fallback';
  }
  if (mime.startsWith('text/') || CODE_EXTENSIONS.has(ext ?? '')) {
    return (artifact.sizeBytes ?? 0) <= TEXT_PREVIEW_MAX_BYTES ? 'code' : 'fallback';
  }
  return 'fallback';
}

const IMAGE_MIME_BY_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico']);

export interface FilePreviewerProps {
  artifact: Artifact;
  /** 版本序号（缺省最新） */
  version?: number;
  className?: string;
}

export function FilePreviewer({ artifact, version, className }: FilePreviewerProps) {
  const { t } = useTranslation();
  const mode = useMemo(() => resolvePreviewMode(artifact), [artifact]);
  const [text, setText] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (mode === 'fallback') {
      setState('ready');
      return;
    }
    let revoked: string | null = null;
    let cancelled = false;
    setState('loading');
    artifactApi
      .fetchBlob(artifact.id, version)
      .then(async (blob) => {
        if (cancelled) return;
        if (mode === 'image' || mode === 'pdf') {
          revoked = URL.createObjectURL(blob);
          setBlobUrl(revoked);
        } else {
          setText(await blob.text());
        }
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [artifact.id, version, mode]);

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {state === 'loading' && mode !== 'fallback' && (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {t('artifact.preview.loading', '加载预览…')}
        </div>
      )}
      {state === 'error' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <FileWarning className="size-6" />
          {t('artifact.preview.error', '预览加载失败，请尝试下载后查看')}
        </div>
      )}
      {state === 'ready' && mode === 'fallback' && (
        <FallbackPreview artifact={artifact} />
      )}
      {state === 'ready' && mode === 'image' && blobUrl && (
        <div className="flex flex-1 items-center justify-center overflow-auto rounded-lg border border-border bg-muted/30 p-4">
          <img
            src={blobUrl}
            alt={artifact.name}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
      {state === 'ready' && mode === 'pdf' && blobUrl && (
        <iframe
          src={blobUrl}
          title={artifact.name}
          className="min-h-0 flex-1 rounded-lg border border-border"
        />
      )}
      {state === 'ready' && mode === 'markdown' && text !== null && (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border p-6">
          <MarkdownView content={text} />
        </div>
      )}
      {state === 'ready' && mode === 'code' && text !== null && (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
          <ReactMarkdown
            rehypePlugins={[rehypeHighlight]}
            components={{
              pre: ({ children }) => (
                <pre className="hljs m-0 p-4 font-mono text-xs leading-relaxed">
                  {children}
                </pre>
              ),
            }}
          >
            {/* 围栏包装触发 rehype-highlight 自动语言探测；正文以 ``` 开头的文件会渲染异常，可接受（预览非编辑） */}
            {'```\n' + text + '\n```'}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

/** 降级态：元数据卡 + 下载（Office/压缩包等二进制格式的诚实呈现） */
function FallbackPreview({ artifact }: { artifact: Artifact }) {
  const { t } = useTranslation();
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleDownload = async () => {
    const blob = await artifactApi.fetchBlob(artifact.id);
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    // 触发浏览器下载后不立刻 revoke（下载线程可能未读完）
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = artifact.name;
    anchor.click();
  };

  useEffect(() => () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  }, [downloadUrl]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border p-10">
      <FileTypeIcon name={artifact.name} mimeType={artifact.mimeType} size="md" />
      <div className="text-center">
        <p className="text-sm font-medium">{artifact.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {[
            artifact.mimeType ?? t('artifact.preview.unknownType', '未知类型'),
            artifact.sizeBytes != null ? formatBytes(artifact.sizeBytes) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <p className="mt-2 max-w-sm text-xs text-muted-foreground">
          {t(
            'artifact.preview.fallbackHint',
            '该格式暂不支持在线预览，可下载后查看。',
          )}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => void handleDownload()}>
        <Download className="size-4" />
        {t('artifact.preview.download', '下载')}
      </Button>
    </div>
  );
}
