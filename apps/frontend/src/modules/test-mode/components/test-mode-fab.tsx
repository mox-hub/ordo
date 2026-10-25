/**
 * 实机测试模式浮动入口（CAP-A-31 批 1）：仅桌面壳显示（web 隐藏），
 * 挂 shell-layout 浮动件区（AssistantFab 之上），点击开测试面板。
 */
import { FlaskConical } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { testModeApi } from '../api/test-mode-api';
import { TestModePanel } from './test-mode-panel';

export function TestModeFab() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!testModeApi.available()) {
    return null;
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t('testMode.fabTitle')}
        aria-label={t('testMode.fabTitle')}
        className="fixed right-6 bottom-44 z-40 flex size-10 items-center justify-center rounded-full border border-border bg-background/95 text-text-secondary shadow-xs backdrop-blur-xs transition-colors hover:bg-muted hover:text-text-primary"
      >
        <FlaskConical className="size-4.5" />
      </button>
      <TestModePanel open={open} onOpenChange={setOpen} />
    </>
  );
}
