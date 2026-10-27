import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Presentation,
  type LucideIcon,
} from 'lucide-react';
import { TONE_CLASS, type Tone } from '@/components/ui/tone';

/**
 * 文件类型图标（CAP-A-32）：按扩展名（优先）→ MIME（兜底）映射图标与语义 tone。
 * 产物列表/预览/上传对话框的 leading 图标唯一出口；禁页面自拼 File* 图标映射。
 */
export interface FileTypeIconProps {
  /** 文件名（含扩展名），扩展名判定优先 */
  name?: string | null;
  /** MIME 兜底（扩展名无法判定时） */
  mimeType?: string | null;
  size?: 'sm' | 'md';
}

interface FileTypeVisual {
  icon: LucideIcon;
  tone: Tone;
}

const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'go', 'rs', 'java', 'c', 'h',
  'cpp', 'hpp', 'cs', 'rb', 'php', 'swift', 'kt', 'sh', 'bat', 'ps1', 'sql',
  'html', 'htm', 'css', 'scss', 'less', 'json', 'yaml', 'yml', 'toml', 'xml',
  'vue', 'svelte', 'graphql', 'prisma',
]);

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'tiff']);
const ARCHIVE_EXTENSIONS = new Set(['zip', '7z', 'rar', 'tar', 'gz', 'tgz', 'bz2']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'flac', 'ogg', 'm4a']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm']);

function resolveVisual(name?: string | null, mimeType?: string | null): FileTypeVisual {
  const ext = name?.includes('.') ? (name.split('.').pop() ?? '').toLowerCase() : undefined;

  if (ext) {
    if (ext === 'md' || ext === 'mdx' || ext === 'txt' || ext === 'pdf') {
      return { icon: FileText, tone: ext === 'pdf' ? 'danger' : 'info' };
    }
    if (ext === 'doc' || ext === 'docx' || ext === 'rtf' || ext === 'odt') {
      return { icon: FileText, tone: 'info' };
    }
    if (ext === 'xls' || ext === 'xlsx' || ext === 'csv' || ext === 'ods') {
      return { icon: FileSpreadsheet, tone: 'success' };
    }
    if (ext === 'ppt' || ext === 'pptx' || ext === 'odp') {
      return { icon: Presentation, tone: 'warning' };
    }
    if (CODE_EXTENSIONS.has(ext)) return { icon: FileCode, tone: 'info' };
    if (IMAGE_EXTENSIONS.has(ext)) return { icon: FileImage, tone: 'info' };
    if (ARCHIVE_EXTENSIONS.has(ext)) return { icon: FileArchive, tone: 'warning' };
    if (AUDIO_EXTENSIONS.has(ext)) return { icon: FileAudio, tone: 'default' };
    if (VIDEO_EXTENSIONS.has(ext)) return { icon: FileVideo, tone: 'default' };
  }

  if (mimeType) {
    if (mimeType.startsWith('image/')) {
      return { icon: mimeType === 'image/svg+xml' ? FileCode : FileImage, tone: 'info' };
    }
    if (mimeType.startsWith('text/')) return { icon: FileText, tone: 'info' };
    if (mimeType.startsWith('audio/')) return { icon: FileAudio, tone: 'default' };
    if (mimeType.startsWith('video/')) return { icon: FileVideo, tone: 'default' };
    if (mimeType === 'application/pdf') return { icon: FileText, tone: 'danger' };
    if (mimeType.includes('zip') || mimeType.includes('compressed')) {
      return { icon: FileArchive, tone: 'warning' };
    }
  }

  return { icon: File, tone: 'default' };
}

export function FileTypeIcon({ name, mimeType, size = 'sm' }: FileTypeIconProps) {
  const { icon: Icon, tone } = resolveVisual(name, mimeType);
  return (
    <Icon
      aria-hidden
      className={
        size === 'md'
          ? `size-5 shrink-0 ${TONE_CLASS[tone].text}`
          : `size-4 shrink-0 ${TONE_CLASS[tone].text}`
      }
    />
  );
}
