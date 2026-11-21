/**
 * AssistantOpeningReport —— 主仓 i18n 适配层。
 *
 * 展示实现已迁至 @mox-hub/patterns；本文件只注入 react-i18next 文案。
 */
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { AssistantOpeningReport as PatternAssistantOpeningReport } from '@mox-hub/patterns/components/assistant-opening-report';

export function AssistantOpeningReport(
  props: ComponentProps<typeof PatternAssistantOpeningReport>,
) {
  const { t } = useTranslation();
  return (
    <PatternAssistantOpeningReport
      {...props}
      labels={{
        title: t('assistant.report.title'),
        // patterns 接收 {{name}} 模板并在组件内替换，这里让 i18next 保留占位符。
        intro: t('assistant.report.intro', { name: '{{name}}' }),
        pending: t('decision.metrics.pending'),
        blocking: t('decision.metrics.blocking'),
        advisory: t('decision.metrics.advisory'),
        ...props.labels,
      }}
    />
  );
}
