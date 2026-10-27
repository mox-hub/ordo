import { Link } from 'react-router-dom';
import { FileText, Play, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE_CLASS } from '@/components/ui/tone';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * 产物来源徽标（CAP-A-32）：upload 上传 / execution 执行产物 / document 文档。
 * 传 `to` 时整枚徽标为溯源跳转（执行详情 / 文档详情）；不传为纯标注。
 */
export interface ArtifactSourceBadgeProps {
  kind: 'upload' | 'execution' | 'document';
  /** 溯源跳转路由（如 /app/executions、/app/documents/:id） */
  to?: string;
}

const SOURCE_META = {
  upload: { icon: Upload, tone: 'default' as const, labelKey: 'artifact.kind.upload', fallback: '上传' },
  execution: { icon: Play, tone: 'info' as const, labelKey: 'artifact.kind.execution', fallback: '执行产物' },
  document: { icon: FileText, tone: 'info' as const, labelKey: 'artifact.kind.document', fallback: '文档' },
} as const;

export function ArtifactSourceBadge({ kind, to }: ArtifactSourceBadgeProps) {
  const { t } = useTranslation();
  const meta = SOURCE_META[kind] ?? SOURCE_META.upload;
  const Icon = meta.icon;

  const content = (
    <>
      <Icon aria-hidden className="size-3" />
      <span>{t(meta.labelKey, meta.fallback)}</span>
    </>
  );

  const classes = cn(
    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold',
    TONE_CLASS[meta.tone].light,
    to && 'transition-colors hover:brightness-95',
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }
  return <span className={classes}>{content}</span>;
}
