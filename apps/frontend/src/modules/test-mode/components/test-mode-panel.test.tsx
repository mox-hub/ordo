import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TestModePanel } from './test-mode-panel';
import { useTestModeStore } from '../store/test-mode-store';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// jsdom 无 canvas 2d/toDataURL：标注器整体 mock（交互由组件级测试另覆盖的口径与既有测试一致）
vi.mock('./screenshot-annotator', () => ({
  ScreenshotAnnotator: ({ src }: { src: string }) => <div data-testid="annotator" data-src={src} />,
}));

const invokeSpy = vi.hoisted(() => vi.fn());
vi.mock('@/shared/types/electron-api', () => ({
  isDesktopShellAvailable: () => true,
  invoke: (cmd: string, args?: Record<string, unknown>) => invokeSpy(cmd, args),
}));

const createSpy = vi.hoisted(() => vi.fn());
vi.mock('@/modules/issue/hooks/use-project-tasks', () => ({
  useCreateTask: () => ({ mutateAsync: createSpy, isPending: false }),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const CAPTURE_RESULT = {
  screenshotDataUrl: 'data:image/png;base64,AAA',
  report: {
    capturedAt: '2026-10-25T00:00:00.000Z',
    url: 'http://localhost:5173/app/issues',
    title: '工单列表',
    networkSummary: [{ method: 'GET', url: 'http://x/api', status: 500 }],
    consoleLines: [],
    operations: [{ type: 'click' as const, at: 1, target: { tag: 'button', id: 'b', text: '提交', entity: null } }],
    environmentText: '应用版本: 1.0.0',
    stepsToReproduce: '1. [点击] 提交',
  },
};

function mockInvoke(): void {
  invokeSpy.mockImplementation((cmd: string) => {
    switch (cmd) {
      case 'test_mode_status':
        return Promise.resolve({
          active: false, startedAt: null, recordingOps: false, networkCount: 0, consoleCount: 0, operationCount: 0, url: '',
        });
      case 'test_mode_start':
        return Promise.resolve({
          active: true, startedAt: 'x', recordingOps: false, networkCount: 3, consoleCount: 1, operationCount: 2, url: 'http://x',
        });
      case 'test_mode_capture':
        return Promise.resolve(CAPTURE_RESULT);
      case 'bug_report_save':
        return Promise.resolve({ id: 'bug-1', bundlePath: 'C:/ordo/bug-1.ordobug' });
      case 'bug_report_screenshot_begin':
        return Promise.resolve({ uploadId: 'shot-test-1' });
      case 'bug_report_queue_list':
        return Promise.resolve({ items: [] });
      default:
        return Promise.resolve({ ok: true });
    }
  });
}

function resetStore(): void {
  useTestModeStore.setState({
    panelOpen: false,
    phase: 'idle',
    capturing: false,
    picking: false,
    menuOpen: false,
    captureState: null,
  });
}

function renderPanel(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TestModePanel />
    </QueryClientProvider>,
  );
}

describe('TestModePanel 提交链（CAP-A-31 批 1）', () => {
  beforeEach(() => {
    invokeSpy.mockReset();
    createSpy.mockReset();
    mockInvoke();
    resetStore();
  });

  it('未开启时显示进入按钮，点击后转入采集中并出现抓取入口与录制确认门', async () => {
    renderPanel();
    useTestModeStore.getState().setPanelOpen(true);
    expect(await screen.findByText('testMode.enter')).toBeTruthy();
    fireEvent.click(screen.getByText('testMode.enter'));
    expect(await screen.findByText('testMode.captureFull')).toBeTruthy();
    expect(screen.getByText('testMode.captureElement')).toBeTruthy();
    // 操作录制默认不开启（用户确认「开始录制」才记，实机反馈第 3 条）
    expect(screen.getByText('testMode.record.paused')).toBeTruthy();
    expect(screen.getByText('testMode.record.start')).toBeTruthy();
  });

  it('抓取全屏现场 → 表单预填 → 提交走 save + bug 字段直映射建单', async () => {
    createSpy.mockResolvedValue({ id: '42' });
    renderPanel();
    useTestModeStore.getState().setPhase('active');
    useTestModeStore.getState().setPanelOpen(true);
    fireEvent.click(await screen.findByText('testMode.captureFull'));

    // runCapture 藏 UI → 350ms 等待 → capture → composing
    const titleInput = (await screen.findByLabelText('testMode.formTitle', {}, { timeout: 3000 })) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: '列表页 500' } });
    const stepsArea = screen.getByLabelText('testMode.stepsToReproduce') as HTMLTextAreaElement;
    expect(stepsArea.value).toBe('1. [点击] 提交');

    fireEvent.click(screen.getByText('testMode.submit'));
    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));

    expect(invokeSpy).toHaveBeenCalledWith('bug_report_screenshot_begin', undefined);
    expect(invokeSpy).toHaveBeenCalledWith(
      'bug_report_save',
      expect.objectContaining({ title: '列表页 500', screenshotUploadId: 'shot-test-1' }),
    );
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '列表页 500',
        type: 'bug',
        severity: 'medium',
        tags: ['实机测试'],
        bugStepsToReproduce: '1. [点击] 提交',
        bugEnvironment: '应用版本: 1.0.0',
      }),
    );
  });

  it('建单失败时入补交队列并提示', async () => {
    createSpy.mockRejectedValue(new Error('ECONNREFUSED'));
    renderPanel();
    useTestModeStore.getState().setPhase('active');
    useTestModeStore.getState().setPanelOpen(true);
    fireEvent.click(await screen.findByText('testMode.captureFull'));
    fireEvent.change((await screen.findByLabelText('testMode.formTitle', {}, { timeout: 3000 })) as HTMLInputElement, {
      target: { value: '断网报障' },
    });
    fireEvent.click(screen.getByText('testMode.submit'));
    await waitFor(() => expect(invokeSpy).toHaveBeenCalledWith('bug_report_queue_add', expect.objectContaining({ bundlePath: 'C:/ordo/bug-1.ordobug' })));
  });

  it('组件模式现场：composing 态展示选择器字段并拼进建单描述', async () => {
    createSpy.mockResolvedValue({ id: '43' });
    renderPanel();
    useTestModeStore.setState({
      panelOpen: true,
      phase: 'composing',
      captureState: {
        screenshotDataUrl: 'data:image/png;base64,BBB',
        annotatedDataUrl: 'data:image/png;base64,BBB',
        report: {
          ...CAPTURE_RESULT.report,
          element: { selector: 'div > button#submit', outerHTML: '<button id="submit">提交</button>' },
        },
      },
    });
    const selectorInput = (await screen.findByLabelText('testMode.elementSelector')) as HTMLInputElement;
    expect(selectorInput.value).toBe('div > button#submit');
    expect(screen.getByText('testMode.elementMode')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('testMode.formTitle'), { target: { value: '组件模式报障' } });
    fireEvent.click(screen.getByText('testMode.submit'));
    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '组件模式报障',
        description: expect.stringContaining('[组件选择器] `div > button#submit`'),
      }),
    );
  });
});
