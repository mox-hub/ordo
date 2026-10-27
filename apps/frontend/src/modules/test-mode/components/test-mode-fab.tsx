/**
 * 实机测试模式浮动入口（CAP-A-31 批 1）：仅桌面壳显示（web 隐藏）。
 * 点击不直进面板，而是弹快捷菜单（实机反馈第 5 条）：抓取全屏 / 选择组件抓取 /
 * 从头开始录制 / 清除已录操作 / 退出——方便连续录制多份现场。
 * 层级用宪法七档最高的 z-toast——报障入口必须高于一切业务弹窗遮罩；
 * 拾取/抓取进行中或面板打开时隐藏球，避免出现在截图与拾取里。
 */
import { Bug, Camera, Eraser, FlaskConical, Focus, RotateCcw, StopCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { testModeApi } from '../api/test-mode-api';
import { useTestModeOpsControls, useTestModeStatus, useTestModeToggle } from '../hooks/use-test-mode';
import { useTestModeStore } from '../store/test-mode-store';
import { TestModePanel } from './test-mode-panel';

export function TestModeFab() {
  const { t } = useTranslation();
  const menuOpen = useTestModeStore((s) => s.menuOpen);
  const setMenuOpen = useTestModeStore((s) => s.setMenuOpen);
  const panelOpen = useTestModeStore((s) => s.panelOpen);
  const capturing = useTestModeStore((s) => s.capturing);
  const picking = useTestModeStore((s) => s.picking);
  const setPhase = useTestModeStore((s) => s.setPhase);
  const runCapture = useTestModeStore((s) => s.runCapture);
  const clearCapture = useTestModeStore((s) => s.clearCapture);

  const statusQuery = useTestModeStatus();
  const { start, stop } = useTestModeToggle();
  const { recordStart, clear } = useTestModeOpsControls();

  if (!testModeApi.available()) {
    return null;
  }

  const active = statusQuery.data?.active ?? false;
  const hidden = panelOpen || menuOpen || capturing || picking;

  async function handleEnter(): Promise<void> {
    try {
      await start.mutateAsync();
      setPhase('active');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleExit(): Promise<void> {
    setMenuOpen(false);
    try {
      await stop.mutateAsync();
      setPhase('idle');
      clearCapture();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      {!hidden && (
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          title={t('testMode.fabTitle')}
          aria-label={t('testMode.fabTitle')}
          data-ordo-test-mode-ui
          className="fixed right-6 bottom-44 z-toast flex size-10 items-center justify-center rounded-full border border-border bg-background/95 text-content-text-secondary shadow-xs backdrop-blur-xs transition-colors hover:bg-muted hover:text-content-text"
        >
          <FlaskConical className="size-4.5" />
        </button>
      )}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-toast" onClick={() => setMenuOpen(false)} />
          <div
            data-ordo-test-mode-ui
            className="fixed right-6 bottom-56 z-toast flex w-56 flex-col gap-0.5 rounded-xl border border-border/70 bg-popover/95 p-1.5 shadow-xs backdrop-blur-xs"
          >
            {!active ? (
              <MenuButton icon={<Bug className="size-3.5" />} onClick={handleEnter} busy={start.isPending}>
                {t('testMode.enter')}
              </MenuButton>
            ) : (
              <>
                <MenuButton icon={<Camera className="size-3.5" />} onClick={() => void runCapture('full')}>
                  {t('testMode.captureFull')}
                </MenuButton>
                <MenuButton icon={<Focus className="size-3.5" />} onClick={() => void runCapture('element')}>
                  {t('testMode.captureElement')}
                </MenuButton>
                <div className="my-0.5 h-px bg-border/70" />
                <MenuButton
                  icon={<RotateCcw className="size-3.5" />}
                  onClick={() => void recordStart.mutateAsync()}
                  busy={recordStart.isPending}
                >
                  {t('testMode.record.restart')}
                </MenuButton>
                <MenuButton
                  icon={<Eraser className="size-3.5" />}
                  onClick={() => void clear.mutateAsync()}
                  busy={clear.isPending}
                >
                  {t('testMode.record.clear')}
                </MenuButton>
                <div className="my-0.5 h-px bg-border/70" />
                <MenuButton
                  icon={<StopCircle className="size-3.5" />}
                  onClick={handleExit}
                  busy={stop.isPending}
                  className="text-accent-red hover:text-accent-red"
                >
                  {t('testMode.exit')}
                </MenuButton>
              </>
            )}
          </div>
        </>
      )}
      <TestModePanel />
    </>
  );
}

function MenuButton({
  icon,
  children,
  onClick,
  busy,
  className,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('w-full justify-start gap-2 px-2.5', className)}
      onClick={onClick}
      disabled={busy}
    >
      {icon}
      {children}
    </Button>
  );
}
