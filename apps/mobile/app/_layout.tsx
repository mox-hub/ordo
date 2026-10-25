import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getAppContainer } from '../src/infrastructure/container';
import { usePalette } from '../src/theme/tokens';
import { t } from '../src/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15_000 },
  },
});

export default function RootLayout() {
  const { session, events } = getAppContainer();
  const status = session((state) => state.status);
  const palette = usePalette();

  // 冷启恢复会话（SecureStore → /auth/me 校验）
  useEffect(() => {
    void session.getState().restore();
  }, [session]);

  // 实时通道生命周期：认证后连、登出断
  useEffect(() => {
    if (status === 'authenticated') {
      events.connect();
    } else {
      events.disconnect();
    }
  }, [events, status]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="decisions/[id]" options={{ headerShown: true, title: t('inbox.decisions') }} />
          <Stack.Screen name="notifications/[id]" options={{ headerShown: true, title: t('notifications.title') }} />
          <Stack.Screen name="executions/[id]" options={{ headerShown: true, title: t('executions.detail') }} />
          <Stack.Screen name="issues/[id]" options={{ headerShown: true, title: t('issues.detail') }} />
          <Stack.Screen name="me/about" options={{ headerShown: true, title: t('about.title') }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
