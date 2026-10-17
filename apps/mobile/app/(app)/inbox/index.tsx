import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';
import { AppText, Chip } from '../../../src/components/primitives';
import { PressableRow } from '../../../src/components/list';
import { AsyncBoundary, Screen, SectionTitle } from '../../../src/components/screen';
import {
  useMarkNotificationsRead,
  useNotificationsInfinite,
  useUnreadCount,
  type NotificationItem,
} from '../../../src/modules/inbox/api';
import { useDecisionsPending } from '../../../src/modules/decisions/api';
import { isDecisionActionable } from '../../../src/modules/decisions/resolve';
import { t, type I18nKey } from '../../../src/i18n';
import { formatDateTime } from '../../../src/lib/format';
import { spacing, usePalette } from '../../../src/theme/tokens';

function decisionKindKey(kind: string): I18nKey {
  const candidate = `decision.kind.${kind}` as I18nKey;
  // 枚举外的新 kind 诚实回落，不臆造文案
  return t(candidate) === candidate ? 'decision.kind.proposal' : candidate;
}

export default function InboxScreen() {
  const router = useRouter();
  const palette = usePalette();
  const decisions = useDecisionsPending();
  const notifications = useNotificationsInfinite();
  const unread = useUnreadCount();
  const markRead = useMarkNotificationsRead();

  const items = notifications.data?.pages.flatMap((page) => page.data) ?? [];
  const decisionItems = decisions.data?.items ?? [];
  const loading = decisions.isLoading || notifications.isLoading;
  const error = decisions.error ?? notifications.error;
  const isEmpty = decisionItems.length === 0 && items.length === 0;

  function openNotification(notification: NotificationItem) {
    if (notification.status === 'unread') {
      markRead.mutate([notification.id]);
    }
    router.push(`/notifications/${notification.id}`);
  }

  return (
    <Screen scroll={false} padded={false}>
      <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <AppText variant="title" weight="semibold">
            {t('inbox.title')}
          </AppText>
          {unread.data && unread.data.count > 0 ? (
            <Chip label={t('inbox.unreadCount', { count: unread.data.count })} tone="primary" />
          ) : null}
        </View>
      </View>

      <AsyncBoundary loading={loading} error={error} isEmpty={isEmpty}>
        <FlatList
          data={items}
          keyExtractor={(notification) => notification.id}
          contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: spacing.xxl, gap: spacing.sm }}
          onEndReached={() => {
            if (notifications.hasNextPage && !notifications.isFetchingNextPage) {
              void notifications.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.3}
          refreshing={notifications.isRefetching}
          onRefresh={() => {
            void notifications.refetch();
            void decisions.refetch();
            void unread.refetch();
          }}
          ListHeaderComponent={
            <View>
              <SectionTitle
                right={
                  decisions.data && decisions.data.total > 0 ? (
                    <Chip
                      label={String(decisions.data.total)}
                      tone={decisions.data.blocking > 0 ? 'danger' : 'neutral'}
                    />
                  ) : undefined
                }
              >
                {t('inbox.decisions')}
              </SectionTitle>
              {decisionItems.length === 0 ? (
                <AppText variant="bodySm" color="textMuted">
                  {t('inbox.decisionQueueEmpty')}
                </AppText>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {decisionItems.map((decision) => (
                    <PressableRow
                      key={decision.id}
                      onPress={() => router.push(`/decisions/${decision.id}`)}
                    >
                      <View style={{ gap: 4 }}>
                        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                          <Chip
                            label={t(decisionKindKey(decision.kind))}
                            tone={decision.kind === 'approval' ? 'primary' : 'neutral'}
                          />
                          <Chip
                            label={t(
                              decision.urgency === 'blocking'
                                ? 'decision.urgency.blocking'
                                : 'decision.urgency.advisory',
                            )}
                            tone={decision.urgency === 'blocking' ? 'danger' : 'neutral'}
                          />
                        </View>
                        <AppText weight="medium" numberOfLines={1}>
                          {decision.title}
                        </AppText>
                        {decision.taskTitle ? (
                          <AppText variant="caption" color="textMuted" numberOfLines={1}>
                            {decision.taskTitle}
                          </AppText>
                        ) : null}
                        {!isDecisionActionable(decision) ? (
                          <AppText variant="caption" color="textMuted">
                            {t('decision.readOnlyDesktop')}
                          </AppText>
                        ) : null}
                      </View>
                    </PressableRow>
                  ))}
                </View>
              )}
              <SectionTitle right={undefined}>{t('inbox.notifications')}</SectionTitle>
            </View>
          }
          ListEmptyComponent={
            <AppText variant="bodySm" color="textMuted">
              {t('common.empty')}
            </AppText>
          }
          renderItem={({ item }) => (
            <PressableRow onPress={() => openNotification(item)}>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    marginTop: 6,
                    backgroundColor: item.status === 'unread' ? palette.primary : 'transparent',
                  }}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText
                    weight={item.status === 'unread' ? 'medium' : 'regular'}
                    numberOfLines={1}
                  >
                    {item.title}
                  </AppText>
                  {item.body ? (
                    <AppText variant="bodySm" color="textSecondary" numberOfLines={2}>
                      {item.body}
                    </AppText>
                  ) : null}
                  <AppText variant="caption" color="textMuted">
                    {formatDateTime(item.createdAt)}
                  </AppText>
                </View>
              </View>
            </PressableRow>
          )}
        />
      </AsyncBoundary>
    </Screen>
  );
}
