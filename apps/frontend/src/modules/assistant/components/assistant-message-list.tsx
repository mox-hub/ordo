/**
 * AssistantMessageList —— 主仓 chat/Markdown/工具卡适配层。
 *
 * 消息流布局已迁至 @mox-hub/patterns；本文件保留 useAssistantChatHelpers，
 * 并注入 MarkdownView、工具卡/工具组与决策建议判定。
 */
import { useTranslation } from 'react-i18next';
import { MarkdownView } from '@/shared/components/markdown-view';
import {
  AssistantMessageList as PatternAssistantMessageList,
  type AssistantMessageView,
} from '@mox-hub/patterns/components/assistant-message-list';
import type { AssistantToolPart } from '@mox-hub/patterns/components/assistant-tool-card';
import { useAssistantChatHelpers } from '../hooks/use-assistant-chat';
import {
  AssistantToolCard,
  AssistantToolGroup,
  isDecisionToolPart,
} from './assistant-tool-card';

export function AssistantMessageList() {
  const { t } = useTranslation();
  const { messages, status, error, clearError } = useAssistantChatHelpers();

  return (
    <PatternAssistantMessageList
      messages={messages as unknown as AssistantMessageView[]}
      status={status}
      error={error ?? null}
      onDismissError={() => clearError()}
      renderText={(text) => <MarkdownView content={text} />}
      renderTool={(part) => <AssistantToolCard part={part as AssistantToolPart} />}
      renderToolGroup={(children, key) => (
        <AssistantToolGroup key={key}>{children}</AssistantToolGroup>
      )}
      isDecisionPart={(part) => isDecisionToolPart(part)}
      labels={{
        thinking: t('assistant.chat.thinking'),
        working: t('assistant.chat.working'),
        dismissError: t('assistant.chat.dismissError'),
      }}
    />
  );
}
