import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';
import { AppText, Chip } from '../../../src/components/primitives';
import { PressableRow } from '../../../src/components/list';
import { AsyncBoundary, Screen } from '../../../src/components/screen';
import { useIssuesInfinite, type IssueListItem } from '../../../src/modules/issues/api';
import { t } from '../../../src/i18n';
import { spacing } from '../../../src/theme/tokens';

type PriorityTone = 'danger' | 'warning' | 'info' | 'neutral';

function priorityTone(priority?: string | null): PriorityTone {
  switch ((priority ?? '').toLowerCase()) {
    case 'urgent':
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'neutral';
  }
}

export default function IssuesScreen() {
  const router = useRouter();
  const issues = useIssuesInfinite();
  const items = issues.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Screen scroll={false} padded={false}>
      <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
        <AppText variant="title" weight="semibold">
          {t('issues.title')}
        </AppText>
      </View>
      <AsyncBoundary
        loading={issues.isLoading}
        error={issues.error}
        retry={() => void issues.refetch()}
        isEmpty={items.length === 0}
      >
        <FlatList
          data={items}
          keyExtractor={(issue: IssueListItem) => issue.id}
          contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: spacing.xxl, gap: spacing.sm }}
          onEndReached={() => {
            if (issues.hasNextPage && !issues.isFetchingNextPage) void issues.fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          refreshing={issues.isRefetching}
          onRefresh={() => void issues.refetch()}
          renderItem={({ item }) => (
            <PressableRow onPress={() => router.push(`/issues/${item.id}`)}>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                  <AppText variant="footnote" color="textMuted">
                    {item.shortId}
                  </AppText>
                  <Chip label={item.status} />
                  {item.priority ? <Chip label={item.priority} tone={priorityTone(item.priority)} /> : null}
                </View>
                <AppText weight="medium" numberOfLines={2}>
                  {item.title}
                </AppText>
              </View>
            </PressableRow>
          )}
        />
      </AsyncBoundary>
    </Screen>
  );
}
