import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { AppButton, AppText } from '../../../src/components/primitives';
import { PressableRow, StaticRow } from '../../../src/components/list';
import { Screen, SectionTitle } from '../../../src/components/screen';
import { getAppContainer } from '../../../src/infrastructure/container';
import { t } from '../../../src/i18n';
import { spacing } from '../../../src/theme/tokens';

export default function MeScreen() {
  const { session } = getAppContainer();
  const router = useRouter();
  const user = session((state) => state.user);
  const workspaceId = session((state) => state.workspaceId);

  async function logout() {
    await session.getState().logout();
    router.replace('/login');
  }

  return (
    <Screen scroll padded>
      <View style={{ paddingTop: spacing.lg }}>
        <AppText variant="title" weight="semibold">
          {t('me.title')}
        </AppText>
      </View>

      <SectionTitle>{user?.displayName ?? user?.username ?? ''}</SectionTitle>
      <StaticRow>
        <View style={{ gap: 2 }}>
          <AppText weight="medium">{user?.displayName ?? user?.username}</AppText>
          {user?.email ? (
            <AppText variant="caption" color="textMuted">
              {user.email}
            </AppText>
          ) : null}
        </View>
      </StaticRow>

      <SectionTitle>{t('me.workspace')}</SectionTitle>
      <StaticRow>
        <AppText variant="bodySm" color="textSecondary" numberOfLines={1}>
          {workspaceId ?? '—'}
        </AppText>
      </StaticRow>

      <SectionTitle>{t('me.preferences')}</SectionTitle>
      <StaticRow>
        <View style={{ gap: 2 }}>
          <AppText variant="bodySm" color="textSecondary">
            {t('me.preferencesReadonly')}
          </AppText>
        </View>
      </StaticRow>

      <SectionTitle />
      <PressableRow onPress={() => router.push('/me/about')}>
        <AppText weight="medium">{t('me.about')}</AppText>
      </PressableRow>

      <View style={{ marginTop: spacing.xl }}>
        <AppButton label={t('common.logout')} variant="secondary" onPress={() => void logout()} />
      </View>
    </Screen>
  );
}
