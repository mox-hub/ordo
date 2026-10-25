import { ActivityIndicator, Platform, RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppText } from './primitives';
import { pageMargin, spacing, usePalette } from '../theme/tokens';
import { t } from '../i18n';

interface ScreenProps {
  scroll?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/** 页面骨架：安全区（§2.2）+ 页边距 16（§5.3）+ 可选滚动与下拉刷新 */
export function Screen({ scroll = true, padded = true, refreshing, onRefresh, style, children }: ScreenProps) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const content = (
    <View style={[{ flexGrow: 1, paddingHorizontal: padded ? pageMargin : 0 }, style]}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.xxl, flexGrow: 1 }}
          refreshControl={
            // RN-Web 不实现 RefreshControl——仅原生端挂下拉刷新
            onRefresh && Platform.OS !== 'web' ? (
              <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
            ) : undefined
          }
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

interface AsyncBoundaryProps {
  loading: boolean;
  error: unknown;
  retry?: () => void;
  isEmpty?: boolean;
  emptyText?: string;
  children: React.ReactNode;
}

/** 三态语义（加载/错误可重试/空态）——沿用前端 AsyncState 口径，不新造 */
export function AsyncBoundary({ loading, error, retry, isEmpty, emptyText, children }: AsyncBoundaryProps) {
  const palette = usePalette();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl }}>
        <ActivityIndicator color={palette.primary} />
        <AppText variant="footnote" color="textMuted" style={{ marginTop: spacing.sm }}>
          {t('common.loading')}
        </AppText>
      </View>
    );
  }
  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, gap: spacing.md }}>
        <AppText color="danger">{t('common.error')}</AppText>
        {retry ? (
          <AppButton label={t('common.retry')} onPress={retry} variant="secondary" />
        ) : null}
      </View>
    );
  }
  if (isEmpty) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl }}>
        <AppText variant="bodySm" color="textMuted">
          {emptyText ?? t('common.empty')}
        </AppText>
      </View>
    );
  }
  return <>{children}</>;
}

export function SectionTitle({ children, right }: { children?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
      }}
    >
      {children ? (
        <AppText variant="footnote" weight="semibold" color="textSecondary">
          {children}
        </AppText>
      ) : null}
      {right}
    </View>
  );
}

/** 会话恢复期占位（restoring 态不闪登录页） */
export function Splash() {
  const palette = usePalette();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}>
      <ActivityIndicator color={palette.primary} />
    </View>
  );
}
