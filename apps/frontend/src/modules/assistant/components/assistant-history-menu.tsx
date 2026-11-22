/**
 * AssistantHistoryMenu —— 主仓 i18n 适配层。
 *
 * 展示实现已迁至 @mox-hub/patterns；本文件注入 react-i18next 文案与相对时间，
 * 保留既有语言切换行为。
 */
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AssistantHistoryList as PatternAssistantHistoryList,
  AssistantHistoryMenu as PatternAssistantHistoryMenu,
} from '@mox-hub/patterns/components/assistant-history-menu';

type ListProps = ComponentProps<typeof PatternAssistantHistoryList>;
type MenuProps = ComponentProps<typeof PatternAssistantHistoryMenu>;

function useHistoryAdapters() {
  const { t } = useTranslation();
  const labels = {
    new: t('assistant.history.new'),
    empty: t('assistant.history.empty'),
    untitled: t('assistant.history.untitled'),
    open: t('assistant.history.open'),
  };
  const formatUpdatedAt = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const diffMins = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return t('assistant.history.justNow');
    if (diffMins < 60) return t('assistant.history.minutesAgo', { n: diffMins });
    if (diffHours < 24) return t('assistant.history.hoursAgo', { n: diffHours });
    if (diffDays < 7) return t('assistant.history.daysAgo', { n: diffDays });
    return date.toLocaleDateString();
  };
  return { labels, formatUpdatedAt };
}

export function AssistantHistoryList(props: ListProps) {
  const { labels, formatUpdatedAt } = useHistoryAdapters();
  return (
    <PatternAssistantHistoryList
      {...props}
      labels={{ ...labels, ...props.labels }}
      formatUpdatedAt={props.formatUpdatedAt ?? formatUpdatedAt}
    />
  );
}

export function AssistantHistoryMenu(props: MenuProps) {
  const { labels, formatUpdatedAt } = useHistoryAdapters();
  return (
    <PatternAssistantHistoryMenu
      {...props}
      labels={{ ...labels, ...props.labels }}
      formatUpdatedAt={props.formatUpdatedAt ?? formatUpdatedAt}
    />
  );
}
