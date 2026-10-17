import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';
import { AppText, Chip } from '../../../src/components/primitives';
import { PressableRow } from '../../../src/components/list';
import { AsyncBoundary, Screen } from '../../../src/components/screen';
import { useRunsInfinite, type ExecutionRunSummary } from '../../../src/modules/executions/api';
import { t } from '../../../src/i18n';
import { formatDateTime } from '../../../src/lib/format';
import { spacing } from '../../../src/theme/tokens';

type RunStatusTone = 'success' | 'danger' | 'info' | 'neutral' | 'warning';

function statusTone(status: string): RunStatusTone {
  const normalized = status.toLowerCase();
  if (normalized.includes('succe') || normalized.includes('complet')) return 'success';
  if (normalized.includes('fail') || normalized.includes('error')) return 'danger';
  if (normalized.includes('run') || normalized.includes('progress')) return 'info';
  if (normalized.includes('cancel')) return 'warning';
  return 'neutral';
}

export default function ExecutionsScreen() {
  const router = useRouter();
  const runs = useRunsInfinite();
  const items = runs.data?.pages.flatMap((page) => page.runs) ?? [];

  return (
    <Screen scroll={false} padded={false}>
      <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
        <AppText variant="title" weight="semibold">
          {t('executions.title')}
        </AppText>
      </View>
      <AsyncBoundary
        loading={runs.isLoading}
        error={runs.error}
        retry={() => void runs.refetch()}
        isEmpty={items.length === 0}
      >
        <FlatList
          data={items}
          keyExtractor={(run: ExecutionRunSummary) => run.id}
          contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: spacing.xxl, gap: spacing.sm }}
          onEndReached={() => {
            if (runs.hasNextPage && !runs.isFetchingNextPage) void runs.fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          refreshing={runs.isRefetching}
          onRefresh={() => void runs.refetch()}
          renderItem={({ item }) => (
            <PressableRow onPress={() => router.push(`/executions/${item.id}`)}>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                  <Chip label={item.status} tone={statusTone(item.status)} />
                  {item.issue?.title ? (
                    <AppText weight="medium" numberOfLines={1} style={{ flex: 1 }}>
                      {item.issue.title}
                    </AppText>
                  ) : (
                    <AppText weight="medium" color="textSecondary" numberOfLines={1} style={{ flex: 1 }}>
                      {item.subjectType ?? item.id}
                    </AppText>
                  )}
                </View>
                <AppText variant="caption" color="textMuted">
                  {[
                    item.project?.name,
                    item.stepsCount !== undefined ? t('executions.stepsCount', { count: item.stepsCount }) : null,
                    formatDateTime(item.createdAt),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              </View>
            </PressableRow>
          )}
        />
      </AsyncBoundary>
    </Screen>
  );
}
