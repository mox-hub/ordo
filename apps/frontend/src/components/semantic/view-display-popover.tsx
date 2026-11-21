/**
 * ViewDisplayPopover —— 主仓 i18n 适配层。
 *
 * 展示实现已迁至 @mox-hub/patterns；本文件只注入 react-i18next 翻译函数，
 * 并保留原有默认选项/工具函数 re-export，业务调用方 API 不变。
 */
import { useTranslation } from 'react-i18next';
import {
  ViewDisplayPopover as PatternViewDisplayPopover,
  type ViewDisplayPopoverProps,
} from '@mox-hub/patterns/components/view-display-popover';
import type { PatternTranslate } from '@mox-hub/patterns/lib/translate';

export {
  DEFAULT_DISPLAY_PROPERTIES,
  DEFAULT_GROUP_OPTIONS,
  DEFAULT_ORDER_OPTIONS,
  DEFAULT_VIEW_OPTIONS,
  getDefaultDisplayProperties,
  getDefaultGroupOptions,
  getDefaultOrderOptions,
  getDefaultViewOptions,
} from '@mox-hub/patterns/components/view-display-popover';
export type {
  I18nTranslateFn,
  ViewDisplayPropertyItem,
  ViewDisplayPopoverProps,
} from '@mox-hub/patterns/components/view-display-popover';

export function ViewDisplayPopover(props: ViewDisplayPopoverProps) {
  const { t } = useTranslation();
  const translate: PatternTranslate = (key, fallbackOrOptions) =>
    typeof fallbackOrOptions === 'string'
      ? t(key, fallbackOrOptions)
      : t(key, fallbackOrOptions as Record<string, unknown>);
  return <PatternViewDisplayPopover {...props} translate={props.translate ?? translate} />;
}
