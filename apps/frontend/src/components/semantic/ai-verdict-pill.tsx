/**
 * AiVerdictPill —— 主仓 i18n 适配层。
 *
 * 展示实现与置信信号工具已迁至 @mox-hub/patterns；本文件只注入 react-i18next
 * 文案，并保留原有工具函数/类型 re-export，业务调用方 API 不变。
 */
import { useTranslation } from 'react-i18next';
import {
  AiVerdictPill as PatternAiVerdictPill,
  type AiVerdictPillProps,
} from '@mox-hub/patterns/components/ai-verdict-pill';

export {
  CONFIDENCE_SIGNAL_THRESHOLDS,
  confidenceToSignal,
  normalizeConfidenceSignal,
} from '@mox-hub/patterns/components/ai-verdict-pill';
export type {
  AiVerdictPillLabels,
  AiVerdictPillProps,
  ConfidenceSignal,
} from '@mox-hub/patterns/components/ai-verdict-pill';

export function AiVerdictPill(props: AiVerdictPillProps) {
  const { t } = useTranslation();
  return (
    <PatternAiVerdictPill
      {...props}
      labels={{
        advisory: t('aiJudge.advisoryTooltip'),
        lowConfidence: t('aiJudge.lowConfidence'),
        ...props.labels,
      }}
    />
  );
}
