import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, View } from 'react-native';
import { AppText, Chip } from '../../src/components/primitives';
import { StaticRow } from '../../src/components/list';
import { AsyncBoundary, Screen, SectionTitle } from '../../src/components/screen';
import { getAppContainer } from '../../src/infrastructure/container';
import { DomainEventTypes } from '../../src/infrastructure/event-client';
import {
  useExecutionEvents,
  useExecutionRun,
} from '../../src/modules/executions/api';
import { t } from '../../src/i18n';
import { formatDateTime } from '../../src/lib/format';
import { spacing } from '../../src/theme/tokens';

export default function ExecutionDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const run = useExecutionRun(id);
  const events = useExecutionEvents(id);

  // 实时：订阅执行族事件（断线不伪装实时——刷新即最新，横幅语义属 M2 降级流）
  useEffect(() => {
    const { events: eventClient } = getAppContainer();
    const offs = [
      DomainEventTypes.ExecutionRunUpdated,
      DomainEventTypes.ExecutionStepCreated,
      DomainEventTypes.ExecutionStepUpdated,
      DomainEventTypes.ExecutionCompleted,
    ].map((type) =>
      eventClient.on(type, () => {
        void run.refetch();
        void events.refetch();
      }),
    );
    return () => offs.forEach((off) => off());
  }, [run, events]);

  const rows = events.data ?? [];

  return (
    <Screen scroll={false} padded={false}>
      <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.md, gap: spacing.md }}>
        <AsyncBoundary loading={run.isLoading} error={run.error} retry={() => void run.refetch()}>
          {run.data ? (
            <StaticRow>
              <View style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                  <Chip label={run.data.status} tone="info" />
                  {run.data.issue?.title ? (
                    <AppText weight="medium" numberOfLines={1} style={{ flex: 1 }}>
                      {run.data.issue.title}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="caption" color="textMuted">
                  {[
                    run.data.project?.name,
                    run.data.stepsCount !== undefined
                      ? t('executions.stepsCount', { count: run.data.stepsCount })
                      : null,
                    formatDateTime(run.data.createdAt),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              </View>
            </StaticRow>
          ) : null}
        </AsyncBoundary>
      </View>

      <SectionTitle>{t('executions.events')}</SectionTitle>
      <AsyncBoundary loading={events.isLoading} error={events.error} isEmpty={rows.length === 0}>
        <FlatList
          data={rows}
          keyExtractor={(event, index) => `${event.eventType}-${index}`}
          contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: spacing.xxl, gap: spacing.sm }}
          renderItem={({ item }) => (
            <StaticRow>
              <View style={{ gap: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                  <AppText variant="footnote" weight="medium">
                    {item.eventType}
                  </AppText>
                  <AppText variant="caption" color="textMuted">
                    {formatDateTime(item.timestamp)}
                  </AppText>
                </View>
                {item.summary ? (
                  <AppText variant="bodySm" color="textSecondary" numberOfLines={3}>
                    {item.summary}
                  </AppText>
                ) : null}
              </View>
            </StaticRow>
          )}
        />
      </AsyncBoundary>
    </Screen>
  );
}
