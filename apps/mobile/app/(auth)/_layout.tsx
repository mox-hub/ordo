import { Redirect, Stack } from 'expo-router';
import { getAppContainer } from '../../src/infrastructure/container';
import { Splash } from '../../src/components/screen';

export default function AuthLayout() {
  const { session } = getAppContainer();
  const status = session((state) => state.status);
  const workspaceId = session((state) => state.workspaceId);

  if (status === 'restoring') return <Splash />;
  // 已认证且有工作区：认证面不再可达
  if (status === 'authenticated' && workspaceId) return <Redirect href="/inbox" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
