/**
 * AssistantFab —— 主仓 store/ESC/点击外部适配层。
 *
 * 浮窗外壳已迁至 @mox-hub/patterns（AssistantFabShell）；本文件保留 store
 * 开合状态、点击外部关闭与 ESC 分层拦截，并挂载 AssistantPanel。
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AssistantFabShell } from '@mox-hub/patterns/components/assistant-fab';
import { useAppStore } from '@/infrastructure/store/app-store';
import { hasOpenInnerLayer, isWithinAiCollabSurface } from '@/shared/lib/floating-layers';
import { AssistantPanel } from './assistant-panel';

export function AssistantFab() {
  const { t } = useTranslation();
  const aiPanelOpen = useAppStore((s) => s.aiPanelOpen);
  const assistantExpanded = useAppStore((s) => s.assistantExpanded);
  const setAiPanelOpen = useAppStore((s) => s.setAiPanelOpen);

  // 退出判定区域 = 「AI 协同交互面」之外的区域。
  // 面内（对话浮窗自身、其按钮、决策侧栏、底部 Dock、Portal 弹出的内层浮层）
  // 一律不触发关闭——修复「点面板内部或点决策侧栏收起按钮却把主窗口一起关掉」。
  useEffect(() => {
    if (!aiPanelOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!isWithinAiCollabSurface(e.target)) {
        setAiPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [aiPanelOpen, setAiPanelOpen]);

  // ESC 关闭：内层浮层（模型选择器 / 历史菜单 / 嵌套弹窗 / 就地问答卡）已打开时，
  // 让它们先消费 ESC，不连带关闭本面板。
  useEffect(() => {
    if (!aiPanelOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (hasOpenInnerLayer()) return;
      setAiPanelOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [aiPanelOpen, setAiPanelOpen]);

  return (
    <AssistantFabShell
      open={aiPanelOpen}
      expanded={assistantExpanded}
      label={t('assistant.personaName')}
    >
      <AssistantPanel />
    </AssistantFabShell>
  );
}
