/**
 * 实机测试模式会话状态（CAP-A-31 批 1 追加）：面板/浮动球/快捷菜单共享的会话面。
 * 核心编排 runCapture：先把测试模式自身 UI 全部藏起（否则面板会被拍进截图——
 * 实机反馈第 4 条），再抓取，组件模式先拾取元素并裁剪，最后以 composing 态开面板。
 */
import { create } from 'zustand';
import { toast } from '@/components/ui/toast';
import type { TestModeCaptureReport, TestModeElementMeta } from '@/shared/types/electron-api';
import { testModeApi } from '../api/test-mode-api';
import { cropImageToRect, pickElement, type PickedElement } from '../lib/element-picker';

export type TestModePhase = 'idle' | 'active' | 'composing';

export interface TestModeCaptureState {
  screenshotDataUrl: string;
  annotatedDataUrl: string;
  report: TestModeCaptureReport;
}

interface TestModeStore {
  panelOpen: boolean;
  phase: TestModePhase;
  /** 抓取进行中：测试模式 UI（球/菜单/面板）全部隐藏 */
  capturing: boolean;
  /** 组件拾取进行中：球与菜单隐藏，页内显示拾取高亮 */
  picking: boolean;
  menuOpen: boolean;
  captureState: TestModeCaptureState | null;
  setPanelOpen: (open: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  setPhase: (phase: TestModePhase) => void;
  clearCapture: () => void;
  /** 标注器回调：就地更新当前现场的合成图 */
  patchCapture: (patch: Partial<TestModeCaptureState>) => void;
  runCapture: (mode: 'full' | 'element') => Promise<void>;
}

const UI_HIDE_DELAY_MS = 350;

export const useTestModeStore = create<TestModeStore>((set, get) => ({
  panelOpen: false,
  phase: 'idle',
  capturing: false,
  picking: false,
  menuOpen: false,
  captureState: null,
  setPanelOpen: (open) => set({ panelOpen: open }),
  setMenuOpen: (open) => set({ menuOpen: open }),
  setPhase: (phase) => set({ phase }),
  clearCapture: () => set({ captureState: null }),
  patchCapture: (patch) =>
    set((state) => (state.captureState ? { captureState: { ...state.captureState, ...patch } } : state)),

  async runCapture(mode) {
    const { capturing, picking } = get();
    if (capturing || picking) {
      return;
    }
    set({ menuOpen: false, panelOpen: false, capturing: mode === 'full' });
    try {
      let element: TestModeElementMeta | null = null;
      let pickedRect: PickedElement['rect'] | null = null;
      if (mode === 'element') {
        set({ capturing: false, picking: true });
        const picked = await pickElement();
        set({ picking: false });
        if (!picked) {
          return; // Esc 取消，恢复原状
        }
        element = { selector: picked.selector, outerHTML: picked.outerHTML };
        pickedRect = picked.rect;
      } else {
        // 等面板/菜单卸载并完成一帧重绘，再拍才是用户看到的页面
        await new Promise((r) => setTimeout(r, UI_HIDE_DELAY_MS));
      }
      const result = await testModeApi.capture(element);
      const screenshotDataUrl = pickedRect
        ? await cropImageToRect(result.screenshotDataUrl, pickedRect)
        : result.screenshotDataUrl;
      set({
        captureState: {
          screenshotDataUrl,
          annotatedDataUrl: screenshotDataUrl,
          report: result.report,
        },
        phase: 'composing',
        panelOpen: true,
        capturing: false,
        picking: false,
      });
    } catch (err) {
      set({ capturing: false, picking: false, panelOpen: true });
      toast.error(err instanceof Error ? err.message : String(err));
    }
  },
}));
