import { useColorScheme } from 'react-native';

/**
 * 移动端 token 唯一入口（PRINCIPLES-MOBILE §4/§5/§6，工程接入方案 §一 src/theme）。
 *
 * 数值档位全部取自规范白名单：
 * - 间距 §5.2：4/8/12/16/20/24/32/40/48（4pt 基格）
 * - 字阶 §4.2：caption12/footnote13/bodySm14/body16/title20/headline24/display32
 * - 字重 §4.5：仅 400/500/600
 * - 圆角 §5.4：按钮/输入 8、卡片/弹层 12、胶囊=半高
 * - 命中区 §3.1：≥48；列表行 §3.4：单行≥56、双行≥72
 *
 * 色彩 §6：角色语义与前端口径同名；取值为移动端管道自供的初版
 * （对标前端角色名，暗色为基准环境 §6.5）——数值待设计评审定稿。
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export const radius = {
  input: 8,
  card: 12,
  pill: 999,
} as const;

export const typeScale = {
  caption: 12,
  footnote: 13,
  bodySm: 14,
  body: 16,
  title: 20,
  headline: 24,
  display: 32,
} as const;

export type TypeScaleToken = keyof typeof typeScale;

export const fontWeightToken = {
  regular: '400',
  medium: '500',
  semibold: '600',
} as const;

export const hitTarget = 48;
export const rowHeight = { single: 56, double: 72 } as const;
export const pageMargin = spacing.base;

export interface Palette {
  bg: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  overlay: string;
}

const light: Palette = {
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0F3',
  border: '#D9DDE3',
  textPrimary: '#171A20',
  textSecondary: '#4A5160',
  textMuted: '#8A90A0',
  primary: '#2F5FE8',
  onPrimary: '#FFFFFF',
  success: '#1E8E5A',
  warning: '#B26A00',
  danger: '#C93A3A',
  info: '#2F6FE8',
  overlay: 'rgba(0, 0, 0, 0.45)',
};

const dark: Palette = {
  bg: '#101319',
  surface: '#1A1E27',
  surfaceMuted: '#232936',
  border: '#333A4A',
  textPrimary: '#EDF0F5',
  textSecondary: '#B4BAC7',
  textMuted: '#7C8394',
  primary: '#6B93F2',
  onPrimary: '#0B1220',
  success: '#4CC08A',
  warning: '#E0A458',
  danger: '#E27272',
  info: '#6B93F2',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

/** §6.4 主题跟随系统（不提供独立主题设置页） */
export function usePalette(): Palette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}
