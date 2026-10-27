/**
 * 统一创建面板深链检测 hook——把「location.state 携带 openCreate 时自动打开
 * 创建面板（刷新不重复弹）」的样板收敛为单一实现（原 tasks-page/members-page
 * 各自一份渲染期 diff + replaceState 清参）。
 *
 * 消费方在页面顶层调用一次即可；openCreateDialog 走 app-store，全局实例承接，
 * 页面无需再本地挂载 UnifiedCreateDialog。state 支持透传预置负责人/项目
 * （成员卡「派发任务」等入口）。
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore, type CreateDialogType } from '@/infrastructure/store/app-store';

interface CreateDeepLinkState {
  openCreate?: boolean;
  presetAssigneeId?: string;
  presetProjectId?: string;
}

export function useCreateDialogDeepLink(options?: { type?: CreateDialogType }) {
  const location = useLocation();
  const openCreateDialog = useAppStore((s) => s.openCreateDialog);

  // 渲染期间检测 state 变化调整面板状态，replaceState 副作用留在独立 effect
  const [prevLocationState, setPrevLocationState] = useState(location.state);
  if (prevLocationState !== location.state) {
    setPrevLocationState(location.state);
    const st = (location.state ?? {}) as CreateDeepLinkState;
    if (st.openCreate) {
      openCreateDialog({
        type: options?.type ?? 'task',
        assigneeId: st.presetAssigneeId,
        projectId: st.presetProjectId,
      });
    }
  }
  useEffect(() => {
    const st = (location.state ?? {}) as CreateDeepLinkState;
    if (st.openCreate) {
      // 清掉 state 防止刷新重复打开
      window.history.replaceState({}, '');
    }
  }, [location.state]);
}
