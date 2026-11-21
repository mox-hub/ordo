/**
 * StickySaveBar —— 主仓 i18n 适配层。
 *
 * 展示实现已迁至 @mox-hub/patterns；本文件只注入 react-i18next 文案。
 */
import { useTranslation } from 'react-i18next';
import {
  StickySaveBar as PatternStickySaveBar,
  type StickySaveBarProps,
} from '@mox-hub/patterns/components/sticky-save-bar';

export type { StickySaveBarProps };

export function StickySaveBar(props: StickySaveBarProps) {
  const { t } = useTranslation();
  return (
    <PatternStickySaveBar
      {...props}
      labels={{
        unsavedChanges: t('settings.unsavedChanges'),
        discardChanges: t('settings.discardChanges'),
        save: t('common.save'),
        saving: t('common.saving'),
        ...props.labels,
      }}
    />
  );
}
