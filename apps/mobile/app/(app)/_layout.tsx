import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAppContainer } from '../../src/infrastructure/container';
import { Splash } from '../../src/components/screen';
import { useUnreadCount } from '../../src/modules/inbox/api';
import { t } from '../../src/i18n';
import { usePalette } from '../../src/theme/tokens';

export default function AppLayout() {
  const { session } = getAppContainer();
  const status = session((state) => state.status);
  const workspaceId = session((state) => state.workspaceId);
  const palette = usePalette();
  const unread = useUnreadCount();

  if (status === 'restoring') return <Splash />;
  if (status === 'anonymous') return <Redirect href="/login" />;
  if (!workspaceId) return <Redirect href="/workspace" />;

  const unreadCount = unread.data?.count ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
      }}
    >
      <Tabs.Screen
        name="inbox"
        options={{
          title: t('tab.inbox'),
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={String(color)} size={size} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="executions"
        options={{
          title: t('tab.executions'),
          tabBarIcon: ({ color, size }) => <Ionicons name="play-circle-outline" color={String(color)} size={size} />,
        }}
      />
      <Tabs.Screen
        name="issues"
        options={{
          title: t('tab.issues'),
          tabBarIcon: ({ color, size }) => <Ionicons name="layers-outline" color={String(color)} size={size} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: t('tab.me'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={String(color)} size={size} />,
        }}
      />
    </Tabs>
  );
}
