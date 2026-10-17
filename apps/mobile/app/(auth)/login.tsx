import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { AppButton, AppText, TextField } from '../../src/components/primitives';
import { Screen } from '../../src/components/screen';
import { getAppContainer } from '../../src/infrastructure/container';
import { t } from '../../src/i18n';
import { spacing } from '../../src/theme/tokens';

export default function LoginScreen() {
  const { session } = getAppContainer();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!username.trim() || !password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // spike 判据 2 认证链第一环：POST /auth/login → SecureStore 存 token
      const result = await session.getState().login(username.trim(), password);
      router.replace(result.needsWorkspace ? '/workspace' : '/inbox');
    } catch {
      setError(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll padded>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ gap: spacing.lg, paddingTop: spacing.xxxl }}>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="headline" weight="semibold">
              {t('auth.title')}
            </AppText>
            <AppText variant="bodySm" color="textSecondary">
              {t('auth.subtitle')}
            </AppText>
          </View>
          <TextField label={t('auth.username')} value={username} onChangeText={setUsername} />
          <TextField
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error ? (
            <AppText variant="bodySm" color="danger">
              {error}
            </AppText>
          ) : null}
          <AppButton
            label={submitting ? t('auth.submitting') : t('auth.submit')}
            onPress={() => void handleSubmit()}
            loading={submitting}
            disabled={!username.trim() || !password}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
