/**
 * ConfidenceBar —— 主仓 i18n 适配层。
 *
 * 展示实现已迁至 @mox-hub/patterns；本文件只负责把 react-i18next 文案
 * 注入 patterns 的 labels，业务调用方 API 不变。
 */
import { useTranslation } from 'react-i18next';
import {
  ConfidenceBar as PatternConfidenceBar,
  type ConfidenceBarProps,
} from '@mox-hub/patterns/components/confidence-bar';

export type { ConfidenceBarProps };

export function ConfidenceBar(props: ConfidenceBarProps) {
  const { t } = useTranslation();
  return (
    <PatternConfidenceBar
      {...props}
      labels={{
        advisory: t('aiJudge.advisoryTooltip'),
        estimatedProbability: t('aiJudge.estimatedProbability'),
        ...props.labels,
      }}
    />
  );
}
