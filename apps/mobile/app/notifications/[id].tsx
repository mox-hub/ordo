import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { AppText } from '../../src/components/primitives';
import { AsyncBoundary, Screen } from '../../src/components/screen';
import { getAppContainer } from '../../src/infrastructure/container';
import type { NotificationListResponse } from '../../src/modules/inbox/api';
import { t } from '../../src/i18n';
import { formatDateTime } from '../../src/lib/format';
import { spacing } from '../../src/theme/tokens';

export default function NotificationDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const api = getAppContainer().api;

  // 通知无按 id 单取端点（蓝图口径：从列表取）——取首页后在缓存内定位
  const q = useQuery({
    queryKey: ['notifications', 'detail', id],
    queryFn: async () => {
      const res = await api.get<NotificationListResponse>('/notifications', { page: 1, pageSize: 50 });
      return res.data.find((item) => item.id === id) ?? null;
    },
  });

  const notification = q.data;

  return (
    <Screen scroll padded>
      <AsyncBoundary
        loading={q.isLoading}
        error={q.error}
        retry={() => void q.refetch()}
        isEmpty={!q.isLoading && !notification}
        emptyText={t('notifications.notFound')}
      >
        {notification ? (
          <View style={{ gap: spacing.md, paddingTop: spacing.md }}>
            <AppText variant="headline" weight="semibold">
              {notification.title}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {formatDateTime(notification.createdAt)}
            </AppText>
            {notification.body ? <AppText color="textSecondary">{notification.body}</AppText> : null}
          </View>
        ) : null}
      </AsyncBoundary>
    </Screen>
  );
}
