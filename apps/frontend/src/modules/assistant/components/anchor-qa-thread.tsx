/**
 * AnchorQaThread —— 主仓 query/store/router/i18n 适配层。
 *
 * 线程展示壳已迁至 @mox-hub/patterns；本文件保留 useAnchorQa、升级草稿、
 * 办公室跳转与 react-i18next 文案。
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MarkdownView } from '@/shared/components/markdown-view';
import { useAppStore } from '@/infrastructure/store/app-store';
import {
  AnchorQaThread as PatternAnchorQaThread,
  type AnchorQaAction,
} from '@mox-hub/patterns/components/anchor-qa-thread';
import type { PatternTranslate } from '@mox-hub/patterns/lib/translate';
import { useAnchorQa } from '../hooks/use-anchor-qa';

export interface AnchorQaThreadProps {
  issueId: string;
  projectId?: string;
  /** 动作就地落库（任务详情页注入 updateField），返回 void 表示已完成 */
  onApplyAction?: (action: AnchorQaAction) => Promise<void>;
  /** 展开态变化（父级渲染幽灵按钮激活样式） */
  onOpenChange?: (open: boolean) => void;
}

export function AnchorQaThread({
  issueId,
  projectId,
  onApplyAction,
  onOpenChange,
}: AnchorQaThreadProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const anchorQa = useAnchorQa(projectId, issueId);
  const openAssistantWithDraft = useAppStore((s) => s.openAssistantWithDraft);

  const translate: PatternTranslate = (key, fallbackOrOptions) =>
    typeof fallbackOrOptions === 'string'
      ? t(key, fallbackOrOptions)
      : t(key, fallbackOrOptions as Record<string, unknown>);

  return (
    <PatternAnchorQaThread
      onAsk={(question) => anchorQa.mutateAsync(question)}
      onApplyAction={onApplyAction}
      onEscalatePanel={(draft) => openAssistantWithDraft(draft)}
      onEscalateOffice={() => navigate('/app/office')}
      onOpenChange={onOpenChange}
      renderMarkdown={(content) => <MarkdownView content={content} className="text-xs" />}
      translate={translate}
    />
  );
}

export { AnchorQaGhostButton } from '@mox-hub/patterns/components/anchor-qa-thread';
export type {
  AnchorQaResult,
  QaEntry,
} from '@mox-hub/patterns/components/anchor-qa-thread';
