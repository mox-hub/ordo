/**
 * 数字与日期格式化的唯一入口（设计宪法 §14「数字与日期格式化」[MUST]）。
 *
 * 约定（全仓统一，改动须同步宪法 §14）：
 *
 * 1. **唯一入口**：组件内禁止直接调用 `toLocaleDateString` / `toLocaleString` /
 *    `Intl.*` / `date-fns` 裸函数，一律走本模块（§14.1）。
 * 2. **无效输入一律返回空串 `''`，绝不抛异常**。`null` / `undefined` / 非法日期串 /
 *    `NaN` / `Infinity` / 负数耗时都归入此类。调用方需要占位符时自己写
 *    `formatDate(x) || '—'`——本模块不替调用方决定占位符长什么样，也不让一个脏数据
 *    把整棵 React 树炸掉（`date-fns` 对 Invalid Date 是抛 RangeError 的，必须在边界挡住）。
 *    唯一例外是 `formatLiveDuration`：负值**钳 0**（live 计时竞态出的小负差值显 `0ms`
 *    比空串诚实，见其 JSDoc）。
 * 3. **时区**：一律按用户**本地时区**渲染，存 UTC（§14.5）。不做 timeZone 入参——
 *    需要固定时区的是测试，不是产品。
 * 4. **locale**：默认取 i18n 的 `DEFAULT_LOCALE`（`zh-CN`）。输出会随语言变化的函数
 *    （`formatRelative` / `formatDateShort` / 全部数字函数）都收第二入参按调用点覆盖，
 *    以承接 `toLocaleDateString(i18n.language)` 这类存量调用；**仅识别两档**：
 *    `zh*` → 简体中文，其余 → 英文；非法 locale 串不会触发 Intl 的 RangeError。
 *    而 `formatDate` / `formatDateTime` / `formatTime` 的输出**与 locale 无关**
 *    （§14.2 把这三档的形态钉死为 `2026-09-27` / `2026-09-27 14:32` / `14:32`），
 *    故刻意不收 locale——收一个用不上的参数只会制造「传了也不生效」的误解。
 *    需要随语言变化的短日期请用 `formatDateShort`。
 * 5. **等宽数字**：本模块只出文本，`font-mono tabular-nums` 由调用点负责（§14.4）。
 *
 * 纯函数：无 React 依赖、无副作用、无全局状态，可直接单测。
 */

import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isValid,
  parseISO,
} from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';

import { DEFAULT_LOCALE } from '@/i18n/config';

/** 日期入参：Date / ISO 8601 字符串 / 毫秒时间戳，允许空值 */
export type DateInput = Date | string | number | null | undefined;

/** 数字入参：允许空值 */
export type NumberInput = number | null | undefined;

/** 本模块支持的 locale 档（i18n 的 supportedLngs 同一口径） */
type SupportedLocale = 'zh-CN' | 'en';

const DATE_FNS_LOCALES: Record<SupportedLocale, DateFnsLocale> = {
  'zh-CN': zhCN,
  en: enUS,
};

/** 默认档（由 i18n 的 DEFAULT_LOCALE 推出），供空 locale 回落 */
const FALLBACK_LOCALE: SupportedLocale = DEFAULT_LOCALE.toLowerCase().startsWith('zh')
  ? 'zh-CN'
  : 'en';

/**
 * 宽松归一化 locale：`zh-TW` / `zh-Hans` 都落到简体档，其余一律英文；
 * `undefined` / `''` / 纯空白视为「未指定」，回落默认档（不会被空串悄悄切成英文）。
 * 永不抛错——绝不把 RangeError 留给 Intl。
 */
function normalizeLocale(locale?: string): SupportedLocale {
  const raw = (locale ?? '').trim().toLowerCase();
  if (raw === '') return FALLBACK_LOCALE;
  return raw.startsWith('zh') ? 'zh-CN' : 'en';
}

/**
 * 归一化为有效 Date；无效返回 null。
 *
 * 字符串一律走 `parseISO`（只认 ISO 8601）：`'2026-09-27'` 按**本地零点**解析。
 * 不要换成 `new Date('2026-09-27')`——它按 UTC 零点解析，在西半球时区会整体偏一天，
 * 是「日期莫名少一天」类线上问题的经典来源。
 */
function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const fromMs = new Date(value);
    return isValid(fromMs) ? fromMs : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = parseISO(trimmed);
    return isValid(parsed) ? parsed : null;
  }
  return null;
}

/** 归一化为有限数字；无效返回 null */
function toNumber(value: NumberInput): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

/** 日期格式化选项 */
export interface DateFormatOptions {
  /** BCP-47 locale，默认 `DEFAULT_LOCALE`（zh-CN） */
  locale?: string;
}

/** 数字格式化选项 */
export interface NumberFormatOptions {
  /** BCP-47 locale，默认 `DEFAULT_LOCALE`（zh-CN） */
  locale?: string;
  /** 最大小数位；不传则用 Intl 该 style 的默认档 */
  maximumFractionDigits?: number;
}

/** 金额格式化选项 */
export interface CurrencyFormatOptions {
  /** BCP-47 locale，默认 `DEFAULT_LOCALE`（zh-CN） */
  locale?: string;
  /** ISO 4217 币种码，默认 `'USD'`——本仓金额的主要来源是 AI 用量成本（美元计价） */
  currency?: string;
  /** 小数位，默认 2 */
  fractionDigits?: number;
}

/**
 * 列表主行的日期：`2026-09-27`（ISO 形态，与 locale 无关，便于排序对读）。
 * 无效输入返回 `''`。
 */
export function formatDate(value: DateInput): string {
  const date = toDate(value);
  if (date === null) return '';
  return format(date, 'yyyy-MM-dd');
}

/**
 * 详情页时间戳：`2026-09-27 14:32`（本地时区，精确到分；与 locale 无关）。
 * 无效输入返回 `''`。
 */
export function formatDateTime(value: DateInput): string {
  const date = toDate(value);
  if (date === null) return '';
  return format(date, 'yyyy-MM-dd HH:mm');
}

/**
 * 活动流相对时间：`3 分钟前` / `3 minutes ago`。
 * 超过 7 天退化为绝对日期（§14.5），退化后输出同 `formatDate`。
 * 无效输入返回 `''`。
 */
export function formatRelative(value: DateInput, options?: DateFormatOptions): string {
  const date = toDate(value);
  if (date === null) return '';
  const now = new Date();
  if (Math.abs(differenceInCalendarDays(date, now)) > 7) {
    return formatDate(date);
  }
  return formatDistanceToNowStrict(date, {
    addSuffix: true,
    locale: DATE_FNS_LOCALES[normalizeLocale(options?.locale)],
  });
}

/**
 * 短日期（图表轴 / 紧凑位置）：中文 `9月27日`，英文 `Sep 27`。
 * 无效输入返回 `''`。
 */
export function formatDateShort(value: DateInput, options?: DateFormatOptions): string {
  const date = toDate(value);
  if (date === null) return '';
  const locale = normalizeLocale(options?.locale);
  return locale === 'zh-CN'
    ? format(date, 'M月d日')
    : format(date, 'MMM d', { locale: DATE_FNS_LOCALES[locale] });
}

/**
 * 纯时间：`14:32`（本地时区，24 小时制；与 locale 无关，§14.2）。
 * 无效输入返回 `''`。
 */
export function formatTime(value: DateInput): string {
  const date = toDate(value);
  if (date === null) return '';
  return format(date, 'HH:mm');
}

/**
 * 计数（千分位）：`1,234,567`。
 * 无效输入返回 `''`。
 */
export function formatNumber(value: NumberInput, options?: NumberFormatOptions): string {
  const n = toNumber(value);
  if (n === null) return '';
  return new Intl.NumberFormat(normalizeLocale(options?.locale), {
    maximumFractionDigits: options?.maximumFractionDigits,
  }).format(n);
}

/**
 * 大数缩写：中文 `1.2万`，英文 `12K` / `3.4M`（输出随 locale 变化，这是预期行为）。
 * 无效输入返回 `''`。
 */
export function formatCompact(value: NumberInput, options?: NumberFormatOptions): string {
  const n = toNumber(value);
  if (n === null) return '';
  return new Intl.NumberFormat(normalizeLocale(options?.locale), {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: options?.maximumFractionDigits ?? 1,
  }).format(n);
}

/**
 * 文件大小（字节入参，产物管理 CAP-A-32）：`1.5 MB` / `832 KB` / `24 B`。
 * 1024 进制二档单位；<1KB 显示字节；无效/负数返回 `''`。
 */
export function formatBytes(bytes: NumberInput): string {
  const n = toNumber(bytes);
  if (n === null || n < 0) return '';
  if (n < 1024) return `${Math.round(n)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = n / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * 百分比：入参是**比值**不是百分数——`0.425` → `42.5%`
 * （与仓内既有 `Math.round(ratio * 100)` 后拼 `%` 的写法同口径）。
 * 无效输入返回 `''`。
 */
export function formatPercent(value: NumberInput, options?: NumberFormatOptions): string {
  const n = toNumber(value);
  if (n === null) return '';
  return new Intl.NumberFormat(normalizeLocale(options?.locale), {
    style: 'percent',
    maximumFractionDigits: options?.maximumFractionDigits ?? 1,
  }).format(n);
}

/**
 * 金额：默认美元两位小数（`zh-CN` → `US$0.51`，`en` → `$0.51`）。
 * 币种可覆盖：`formatCurrency(v, { currency: 'CNY' })` → `¥1,234.50`。
 * 无效输入返回 `''`。
 */
export function formatCurrency(value: NumberInput, options?: CurrencyFormatOptions): string {
  const n = toNumber(value);
  if (n === null) return '';
  return new Intl.NumberFormat(normalizeLocale(options?.locale), {
    style: 'currency',
    currency: options?.currency ?? 'USD',
    maximumFractionDigits: options?.fractionDigits ?? 2,
  }).format(n);
}

/**
 * 耗时（毫秒入参，§14.3）：`1h 12m` / `9m 23s` / `45s` / `300ms`。
 * 分档规则：≥1h 只到分；≥1m 只到秒；<1m 到秒；<1s 显示毫秒（AI 调用/步骤耗时常见）。
 * 负数与非有限数视为无效（不是「负数时长」，是脏数据），返回 `''`。
 */
export function formatDuration(ms: NumberInput): string {
  const value = toNumber(ms);
  if (value === null || value < 0) return '';
  if (value < 1000) return `${Math.round(value)}ms`;

  const totalSeconds = Math.floor(value / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  return `${seconds}s`;
}

/** 两位补零（分/秒的固定宽度槽位，配合调用方 `tabular-nums` 不抖动） */
const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * live 耗时（毫秒入参，§14.3 渐进精度口径）：时长随流逝越短越精、越长越粗——
 *
 * | 区间          | 输出形态        | 示例                |
 * |---------------|-----------------|---------------------|
 * | < 1s          | 整毫秒          | `850ms` / `0ms`     |
 * | < 60s         | 0.1s 精度       | `12.3s`             |
 * | < 1h          | `m分 ss秒`（补零） | `2m 05s`         |
 * | < 24h         | `h时 mm分`（补零） | `3h 12m`         |
 * | ≥ 24h         | `d天 h时`（不补零）| `2d 4h`          |
 *
 * 与 `formatDuration` 的分工：`formatDuration` 服务存量终态耗时口径（分档截断、
 * 无天档、负数=脏数据返回 `''`），**保持不变**；本函数服务 live 计时/步骤耗时
 * 等渐进精度场景（执行时间轴 / AI 工具卡 / 编排树共用，账本 G3 收编三处私有实现）。
 *
 * 边界行为：
 * - **负值钳 0**——live 计时的 `now - startedAt` 在时钟竞态下可能出小负数，
 *   显示 `0ms` 比空串诚实（有别于 `formatDuration` 的脏数据语义）。
 * - `null` / `undefined` / `NaN` / ±Infinity 按模块惯例返回 `''`，不抛异常。
 * - 分档以**原始毫秒值**判定后再取整：999.6ms 归毫秒档显示 `1000ms`
 *   （与被收编的三处私有实现同行为，不额外聪明）。
 *
 * 输出仅文本；`font-mono tabular-nums` 由调用点负责（§14.4）。
 */
export function formatLiveDuration(ms: NumberInput): string {
  const value = toNumber(ms);
  if (value === null) return '';
  const clamped = Math.max(0, value);
  if (clamped < 1000) return `${Math.round(clamped)}ms`;
  if (clamped < 60_000) return `${(clamped / 1000).toFixed(1)}s`;

  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${pad2(minutes)}m`;
  return `${minutes}m ${pad2(seconds)}s`;
}
