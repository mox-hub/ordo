import Constants from 'expo-constants';
import { View } from 'react-native';
import { AppText } from '../../src/components/primitives';
import { StaticRow } from '../../src/components/list';
import { Screen, SectionTitle } from '../../src/components/screen';
import { getAppContainer } from '../../src/infrastructure/container';
import { DEFAULT_BACKEND_URL } from '../../src/infrastructure/api-client';
import { t } from '../../src/i18n';
import { spacing } from '../../src/theme/tokens';

export default function AboutScreen() {
  const { session } = getAppContainer();
  const workspaceId = session((state) => state.workspaceId);

  return (
    <Screen scroll padded>
      <View style={{ gap: spacing.sm, paddingTop: spacing.md }}>
        <SectionTitle>{t('about.version')}</SectionTitle>
        <StaticRow>
          <AppText variant="bodySm" color="textSecondary">
            {Constants.expoConfig?.version ?? '—'}
          </AppText>
        </StaticRow>

        <SectionTitle>{t('about.backend')}</SectionTitle>
        <StaticRow>
          <AppText variant="bodySm" color="textSecondary" numberOfLines={1}>
            {DEFAULT_BACKEND_URL}
          </AppText>
        </StaticRow>

        <SectionTitle>{t('about.workspace')}</SectionTitle>
        <StaticRow>
          <AppText variant="bodySm" color="textSecondary" numberOfLines={1}>
            {workspaceId ?? '—'}
          </AppText>
        </StaticRow>
      </View>
    </Screen>
  );
}
