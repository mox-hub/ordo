import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TestModePanel } from './test-mode-panel';

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
    operations: [{ type: 'click', at: 1, target: { tag: 'button', id: 'b', text: '提交', entity: null } }],
    environmentText: '应用版本: 1.0.0',
    stepsToReproduce: '1. [点击] 提交',
  },
};

function mockInvoke(): void {
  invokeSpy.mockImplementation((cmd: string) => {
    switch (cmd) {
      case 'test_mode_status':
        return Promise.resolve({
          active: false, startedAt: null, networkCount: 0, consoleCount: 0, operationCount: 0, url: '',
        });
      case 'test_mode_start':
        return Promise.resolve({
          active: true, startedAt: 'x', networkCount: 3, consoleCount: 1, operationCount: 2, url: 'http://x',
        });
      case 'test_mode_capture':
        return Promise.resolve(CAPTURE_RESULT);
      case 'bug_report_save':
        return Promise.resolve({ id: 'bug-1', bundlePath: 'C:/ordo/bug-1.ordobug' });
      case 'bug_report_queue_list':
        return Promise.resolve({ items: [] });
      default:
        return Promise.resolve({ ok: true });
    }
  });
}

function renderPanel(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TestModePanel open onOpenChange={() => undefined} />
    </QueryClientProvider>,
  );
}

describe('TestModePanel 提交链（CAP-A-31 批 1）', () => {
  beforeEach(() => {
    invokeSpy.mockReset();
    createSpy.mockReset();
    mockInvoke();
  });

  it('未开启时显示进入按钮，点击后转入采集中并出现抓取入口', async () => {
    renderPanel();
    expect(await screen.findByText('testMode.enter')).toBeTruthy();
    fireEvent.click(screen.getByText('testMode.enter'));
    // start 链路（test_mode_start → 转 active）由下一用例的完整提交链共同覆盖
    expect(await screen.findByText('testMode.capture')).toBeTruthy();
    expect(screen.getByText('testMode.recording')).toBeTruthy();
  });

  it('抓取现场 → 表单预填 → 提交走 save + bug 字段直映射建单', async () => {
    createSpy.mockResolvedValue({ id: '42' });
    renderPanel();
    fireEvent.click(await screen.findByText('testMode.enter'));
    fireEvent.click(await screen.findByText('testMode.capture'));

    const titleInput = (await screen.findByLabelText('testMode.formTitle')) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: '列表页 500' } });
    const stepsArea = screen.getByLabelText('testMode.stepsToReproduce') as HTMLTextAreaElement;
    expect(stepsArea.value).toBe('1. [点击] 提交');

    fireEvent.click(screen.getByText('testMode.submit'));
    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));

    expect(invokeSpy).toHaveBeenCalledWith('bug_report_save', expect.objectContaining({ title: '列表页 500' }));
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
    fireEvent.click(await screen.findByText('testMode.enter'));
    fireEvent.click(await screen.findByText('testMode.capture'));
    fireEvent.change((await screen.findByLabelText('testMode.formTitle')) as HTMLInputElement, {
      target: { value: '断网报障' },
    });
    fireEvent.click(screen.getByText('testMode.submit'));
    await waitFor(() => expect(invokeSpy).toHaveBeenCalledWith('bug_report_queue_add', expect.objectContaining({ bundlePath: 'C:/ordo/bug-1.ordobug' })));
  });
});
