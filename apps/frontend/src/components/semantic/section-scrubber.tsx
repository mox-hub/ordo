/**
 * SectionScrubber —— 主仓 i18n 适配层。
 *
 * 展示/observer 实现已迁至 @mox-hub/patterns；本文件只注入栏目标签文案。
 */
import { useTranslation } from 'react-i18next';
import {
  SectionScrubber as PatternSectionScrubber,
  type SectionScrubberProps,
} from '@mox-hub/patterns/components/section-scrubber';

export type { ScrubberSection, SectionScrubberProps } from '@mox-hub/patterns/components/section-scrubber';

export function SectionScrubber(props: SectionScrubberProps) {
  const { t } = useTranslation();
  return (
    <PatternSectionScrubber
      {...props}
      labels={{ sectionNav: t('settings.sectionNav'), ...props.labels }}
    />
  );
}
