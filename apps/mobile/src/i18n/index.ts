import { zhCN, type I18nKey } from './zh-CN';
import { en } from './en';

export type Locale = 'zh-CN' | 'en';

export const dictionaries: Record<Locale, Record<I18nKey, string>> = {
  'zh-CN': zhCN,
  en,
};

let currentLocale: Locale = 'zh-CN';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/** 轻量 t()：{var} 插值；缺键回落 zh-CN，再缺回落键名本身 */
export function t(key: I18nKey, vars?: Record<string, string | number>): string {
  const template = dictionaries[currentLocale][key] ?? zhCN[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`,
  );
}

export type { I18nKey };
