import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import {
  fontWeightToken,
  hitTarget,
  radius,
  spacing,
  typeScale,
  usePalette,
  type TypeScaleToken,
} from '../theme/tokens';

export type ColorRole =
  | 'primary'
  | 'textPrimary'
  | 'textSecondary'
  | 'textMuted'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'onPrimary';

interface AppTextProps {
  variant?: TypeScaleToken;
  weight?: keyof typeof fontWeightToken;
  color?: ColorRole;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

/** 字阶唯一出口（§4.2 七档；裸 fontSize 禁用，行高按 §4.4 倍率） */
export function AppText({
  variant = 'body',
  weight = 'regular',
  color = 'textPrimary',
  numberOfLines,
  style,
  children,
}: AppTextProps) {
  const palette = usePalette();
  const lineHeightRatio = variant === 'title' || variant === 'headline' || variant === 'display' ? 1.3 : 1.5;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: typeScale[variant],
          lineHeight: Math.round(typeScale[variant] * lineHeightRatio),
          fontWeight: fontWeightToken[weight],
          color: palette[color],
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
}

/** 命中区 ≥48（§3.1）、按下态（§3.3）、圆角 8（§5.4） */
export function AppButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
}: PrimaryButtonProps) {
  const palette = usePalette();
  const bg =
    variant === 'primary' ? palette.primary : variant === 'danger' ? palette.danger : 'transparent';
  const fgRole: ColorRole = variant === 'primary' || variant === 'danger' ? 'onPrimary' : 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          minHeight: hitTarget,
          borderRadius: radius.input,
          backgroundColor: bg,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: palette.border,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
          opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
        },
        style,
      ]}
    >
      <AppText weight="medium" color={fgRole}>
        {loading ? '…' : label}
      </AppText>
    </Pressable>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  placeholder?: string;
}

export function TextField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  autoCapitalize = 'none',
  placeholder,
}: TextFieldProps) {
  const palette = usePalette();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="footnote" color="textSecondary">
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        style={{
          minHeight: hitTarget,
          borderRadius: radius.input,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: palette.border,
          backgroundColor: palette.surface,
          color: palette.textPrimary,
          paddingHorizontal: spacing.md,
          fontSize: typeScale.body,
        }}
      />
    </View>
  );
}

type ChipTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const TONE_COLOR: Record<ChipTone, ColorRole> = {
  neutral: 'textSecondary',
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
};

interface ChipProps {
  label: string;
  tone?: ChipTone;
  outlined?: boolean;
}

/** 胶囊=半高（§5.4）；状态同时以文本传达（§10.5 不靠色单传） */
export function Chip({ label, tone = 'neutral', outlined = true }: ChipProps) {
  const palette = usePalette();
  const color = palette[TONE_COLOR[tone]];
  return (
    <View
      style={{
        borderRadius: radius.pill,
        borderWidth: outlined ? StyleSheet.hairlineWidth : 0,
        borderColor: color,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        backgroundColor: outlined ? 'transparent' : palette.surfaceMuted,
        alignSelf: 'flex-start',
      }}
    >
      <AppText variant="footnote" weight="medium" style={{ color }}>
        {label}
      </AppText>
    </View>
  );
}
