/**
 * i18next configuration
 * @see https://www.i18next.com/
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhCN from './locales/zh-CN.json';

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from './config';

// 双语包约 540KB 常驻主 chunk（启动提速批拆分）：默认语言 zh-CN 随入口加载，
// en 按需动态 import 补挂——不切英文就永远不付这份体积。en 资源在
// languageChanged（含探测首启与 changeLanguage）时补齐；changeLanguage 先补包
// 再切换，await 返回即英文键可用（测试的 await changeLanguage('en') 因此确定性成立）。
let enLoaded = false;

export async function ensureLocaleBundle(lng: string): Promise<void> {
  if (lng !== 'en' || enLoaded) return;
  enLoaded = true;
  const en = (await import('./locales/en.json')).default;
  i18n.addResourceBundle('en', 'translation', en, true, true);
}

export const resources = {
  en: { translation: {} },
  'zh-CN': { translation: zhCN },
} as const;

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: ['en', 'zh-CN'],
    defaultNS: 'translation',
    ns: ['translation'],

    // Language detection options
    detection: {
      // Order of preference for language detection
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Cache the language detection result
      caches: ['localStorage'],
      // Lookup from localStorage key
      lookupLocalStorage: LOCALE_STORAGE_KEY,
    },

    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // React options
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },
  } as Parameters<typeof i18n.init>[0]);

// 探测首启/外部切语都经 languageChanged 补挂 en 包（useSuspense 期间组件悬挂等待）。
// init 同步完成时发出的 languageChanged 早于本监听器注册，故注册后按当前语言补发一次。
i18n.on('languageChanged', (lng) => {
  void ensureLocaleBundle(lng);
});
void ensureLocaleBundle(i18n.language);

export default i18n;

/**
 * Change the current language
 * @param locale - Target locale
 */
export async function changeLanguage(locale: string): Promise<void> {
  // 先补包再切换：await 返回即目标语言键可用（en 包按需加载的确定性入口）
  await ensureLocaleBundle(locale);
  await i18n.changeLanguage(locale);
  // Also save to localStorage explicitly
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

/**
 * Get current language
 */
export function getCurrentLanguage(): string {
  return i18n.language;
}

/**
 * Check if current language is RTL
 * Currently returns false, reserved for RTL language support
 */
export function isRTL(): boolean {
  return false;
}
