/**
 * AssistantContextChip —— 主仓 store/i18n 适配层。
 *
 * 展示实现已迁至 @mox-hub/patterns；本文件读取 app-store 的 viewing 状态
 * 并注入中文/英文文案，保留既有行为。
 */
import { useTranslation } from 'react-i18next';
import { AssistantContextChip as PatternAssistantContextChip } from '@mox-hub/patterns/components/assistant-context-chip';
import { useAppStore } from '@/infrastructure/store/app-store';

const TYPE_KEYS = {
  task: 'assistant.context.task',
  bug: 'assistant.context.bug',
  document: 'assistant.context.document',
  repository: 'assistant.context.repository',
  member: 'assistant.context.member',
  project: 'assistant.context.project',
} as const;

export function AssistantContextChip() {
  const { t } = useTranslation();
  const viewing = useAppStore((s) => s.viewing);
  const setViewing = useAppStore((s) => s.setViewing);

  if (!viewing) return null;

  return (
    <PatternAssistantContextChip
      type={viewing.type}
      title={viewing.title ?? ''}
      onRemove={() => setViewing(null)}
      labels={{
        type: {
          task: t(TYPE_KEYS.task),
          bug: t(TYPE_KEYS.bug),
          document: t(TYPE_KEYS.document),
          repository: t(TYPE_KEYS.repository),
          member: t(TYPE_KEYS.member),
          project: t(TYPE_KEYS.project),
        },
        remove: t('assistant.context.remove'),
      }}
    />
  );
}
