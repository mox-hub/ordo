import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '../../src/components/primitives';
import { PressableRow, StaticRow } from '../../src/components/list';
import { AsyncBoundary, Screen, SectionTitle } from '../../src/components/screen';
import { getAppContainer } from '../../src/infrastructure/container';
import { useWorkspacesPublic } from '../../src/modules/workspace/api';
import { t } from '../../src/i18n';
import { formatDateTime } from '../../src/lib/format';
import { spacing } from '../../src/theme/tokens';

export default function WorkspaceScreen() {
  const { session } = getAppContainer();
  const router = useRouter();
  const workspaces = useWorkspacesPublic();
  const [error, setError] = useState<string | null>(null);
  const status = session((state) => state.status);

  if (status === 'anonymous') return <Redirect href="/login" />;

  async function choose(id: string) {
    setError(null);
    try {
      await session.getState().activateWorkspace(id);
      router.replace('/inbox');
    } catch {
      setError(t('workspace.activateFailed'));
    }
  }

  const items = workspaces.data?.workspaces ?? [];

  return (
    <Screen scroll padded refreshing={workspaces.isRefetching} onRefresh={() => void workspaces.refetch()}>
      <View style={{ gap: spacing.xs, paddingTop: spacing.xl }}>
        <AppText variant="headline" weight="semibold">
          {t('workspace.title')}
        </AppText>
        <AppText variant="bodySm" color="textSecondary">
          {t('workspace.subtitle')}
        </AppText>
      </View>

      <AsyncBoundary
        loading={workspaces.isLoading}
        error={workspaces.error}
        retry={() => void workspaces.refetch()}
        isEmpty={items.length === 0}
        emptyText={t('workspace.empty')}
      >
        <SectionTitle />
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {items.map((workspace) => (
            <PressableRow key={workspace.id} onPress={() => void choose(workspace.id)}>
              <View style={{ gap: 4 }}>
                <AppText weight="medium">{workspace.name}</AppText>
                <AppText variant="caption" color="textMuted">
                  {formatDateTime(workspace.lastOpenedAt)}
                </AppText>
              </View>
            </PressableRow>
          ))}
        </View>
      </AsyncBoundary>

      {error ? (
        <StaticRow style={{ marginTop: spacing.md }}>
          <AppText variant="bodySm" color="danger">
            {error}
          </AppText>
        </StaticRow>
      ) : null}
    </Screen>
  );
}
