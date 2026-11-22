/**
 * AssistantQuickPrompts —— 主仓 i18n 适配层。
 *
 * 展示实现已迁至 @mox-hub/patterns；本文件只注入 react-i18next 兜底问法。
 */
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { AssistantQuickPrompts as PatternAssistantQuickPrompts } from '@mox-hub/patterns/components/assistant-quick-prompts';

export function AssistantQuickPrompts(
  props: ComponentProps<typeof PatternAssistantQuickPrompts>,
) {
  const { t } = useTranslation();
  return (
    <PatternAssistantQuickPrompts
      {...props}
      labels={{
        prompt1: t('assistant.chat.quickPrompt1'),
        prompt2: t('assistant.chat.quickPrompt2'),
        prompt3: t('assistant.chat.quickPrompt3'),
        ...props.labels,
      }}
    />
  );
}
