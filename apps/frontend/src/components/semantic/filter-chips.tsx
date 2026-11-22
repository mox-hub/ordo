/**
 * FilterChipsRow —— 主仓 i18n 适配层。
 *
 * 展示与筛选条件工具已迁至 @mox-hub/patterns；本文件只注入 react-i18next
 * 翻译函数，业务调用方 API 不变。
 */
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FilterCascadeMenu as PatternFilterCascadeMenu,
  FilterChipsRow as PatternFilterChipsRow,
} from '@mox-hub/patterns/components/filter-chips';
import type { PatternTranslate } from '@mox-hub/patterns/lib/translate';

export {
  FilterFieldMenuList,
  countBy,
  createFilterCondition,
  filterConditionSets,
  matchesConditionSets,
} from '@mox-hub/patterns/components/filter-chips';
export type {
  FilterChipsRowProps,
  FilterCondition,
  FilterFieldDef,
  FilterOperatorId,
  FilterValueOption,
} from '@mox-hub/patterns/components/filter-chips';

function usePatternTranslate(): PatternTranslate {
  const { t } = useTranslation();
  return (key, fallbackOrOptions) =>
    typeof fallbackOrOptions === 'string'
      ? t(key, fallbackOrOptions)
      : t(key, fallbackOrOptions as Record<string, unknown>);
}

export function FilterChipsRow(props: ComponentProps<typeof PatternFilterChipsRow>) {
  const translate = usePatternTranslate();
  return <PatternFilterChipsRow {...props} translate={props.translate ?? translate} />;
}

export function FilterCascadeMenu(props: ComponentProps<typeof PatternFilterCascadeMenu>) {
  const translate = usePatternTranslate();
  return <PatternFilterCascadeMenu {...props} translate={props.translate ?? translate} />;
}
