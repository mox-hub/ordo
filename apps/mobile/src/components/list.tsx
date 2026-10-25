import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { rowHeight, spacing, usePalette } from '../theme/tokens';

interface PressableRowProps {
  onPress?: () => void;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/** 列表行原语：单行≥56/双行≥72（§3.4）+ 按下态（§3.3） */
export function PressableRow({ onPress, minHeight = rowHeight.double, style, children }: PressableRowProps) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight,
          backgroundColor: pressed ? palette.surfaceMuted : palette.surface,
          borderRadius: 12,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.md,
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** 不可点行（只读信息行） */
export function StaticRow({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const palette = usePalette();
  return (
    <View
      style={[
        {
          minHeight: rowHeight.single,
          backgroundColor: palette.surface,
          borderRadius: 12,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.md,
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
