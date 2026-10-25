import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { AppText, Chip } from '../../src/components/primitives';
import { StaticRow } from '../../src/components/list';
import { AsyncBoundary, Screen, SectionTitle } from '../../src/components/screen';
import { useIssueDetail } from '../../src/modules/issues/api';
import { t } from '../../src/i18n';
import { formatDateTime } from '../../src/lib/format';
import { spacing } from '../../src/theme/tokens';

interface AssigneeView {
  displayName?: string | null;
  username?: string | null;
  name?: string | null;
}

export default function IssueDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const issue = useIssueDetail(id);

  const assigneeView = issue.data?.assignee as AssigneeView | null | undefined;
  const assigneeLabel =
    assigneeView?.displayName ?? assigneeView?.username ?? assigneeView?.name ?? t('issues.unassigned');

  return (
    <Screen scroll padded>
      <AsyncBoundary
        loading={issue.isLoading}
        error={issue.error}
        retry={() => void issue.refetch()}
      >
        {issue.data ? (
          <View style={{ gap: spacing.md, paddingTop: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
              <AppText variant="footnote" color="textMuted">
                {issue.data.shortId}
              </AppText>
              <Chip label={issue.data.status} />
              {issue.data.priority ? <Chip label={issue.data.priority} tone="warning" /> : null}
              {issue.data.type ? <Chip label={issue.data.type} tone="neutral" /> : null}
            </View>

            <AppText variant="headline" weight="semibold">
              {issue.data.title}
            </AppText>

            <SectionTitle>{t('issues.description')}</SectionTitle>
            <StaticRow>
              <AppText variant="bodySm" color="textSecondary">
                {issue.data.description || '—'}
              </AppText>
            </StaticRow>

            <SectionTitle>{t('issues.assignee')}</SectionTitle>
            <StaticRow>
              <AppText variant="bodySm" color="textSecondary">
                {assigneeLabel}
              </AppText>
            </StaticRow>

            <SectionTitle />
            <StaticRow>
              <AppText variant="caption" color="textMuted">
                {formatDateTime(issue.data.createdAt)}
              </AppText>
            </StaticRow>
          </View>
        ) : null}
      </AsyncBoundary>
    </Screen>
  );
}
