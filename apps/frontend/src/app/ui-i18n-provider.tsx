/**
 * @mox-hub/ui I18nProvider 接线。
 *
 * UI 包组件（Dialog/Sheet/DataTable 等）内置 zh-CN 文案目录——不包 Provider 时
 * en 界面仍会渲染「关闭」等中文默认值。这里把主仓 i18next 当前语言映射为包内
 * locale（包内只区分 zh* / en*，其余回落 zh-CN），随语言切换实时更新。
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nProvider } from '@mox-hub/ui/i18n';

export function UiI18nProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const locale = i18n.language?.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';
  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
