/**
 * ToolbarRow —— 主仓 i18n 适配层。
 *
 * 展示实现与 useToolbarViews 已迁至 @mox-hub/patterns；本文件只注入
 * react-i18next 翻译函数，业务调用方 API 不变。
 */
import { useTranslation } from 'react-i18next';
import {
  ToolbarRow as PatternToolbarRow,
  type ToolbarRowProps,
} from '@mox-hub/patterns/components/toolbar-row';
import type { PatternTranslate } from '@mox-hub/patterns/lib/translate';

export {
  TOOLBAR_VIEW_ICONS,
  normalizeFilterSelection,
  toggleFilterValue,
  useToolbarViews,
} from '@mox-hub/patterns/components/toolbar-row';
export type {
  ToolbarActionDescriptor,
  ToolbarMenuItem,
  ToolbarMenuSlot,
  ToolbarRowProps,
  ToolbarViewEntry,
  ToolbarViewStyleOption,
} from '@mox-hub/patterns/components/toolbar-row';

export function ToolbarRow(props: ToolbarRowProps) {
  const { t } = useTranslation();
  const translate: PatternTranslate = (key, fallbackOrOptions) =>
    typeof fallbackOrOptions === 'string'
      ? t(key, fallbackOrOptions)
      : t(key, fallbackOrOptions as Record<string, unknown>);
  return <PatternToolbarRow {...props} translate={props.translate ?? translate} />;
}
