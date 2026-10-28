import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { formatCompact, formatCurrency } from '@/lib/format';
import { RunDetailsDialog } from './run-details-dialog';
import type { ExecutionRunDetail } from '../api/execution-api';

vi.mock('@/hooks/use-copy-to-clipboard', () => ({
  useCopyToClipboard: () => ({
    copyToClipboard: vi.fn(),
    isCopied: false,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) =>
      opts && typeof opts.count === 'number' ? `${key}:${opts.count}` : key,
  }),
  // run-details-format 依赖 '@/i18n'（截断后缀 i18n.t），真实 i18n 初始化需要该插件桩
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// 产出区块（CAP-A-32）经项目封装 useTranslation + artifact hooks——同口径桩
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  }),
}));
vi.mock('@/modules/artifact/hooks/use-artifacts', () => ({
  useArtifacts: () => ({ data: { data: [], meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }, isLoading: false }),
  useUploadArtifacts: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
  useUploadArtifactVersion: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
  useArtifactVersions: () => ({ data: [] }),
  useArtifactDetail: () => ({ data: undefined }),
  useUpdateArtifact: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
  useDeleteArtifact: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));

const mockState = vi.hoisted(() => ({
  detail: undefined as ExecutionRunDetail | undefined,
  isLoading: false,
  events: [] as unknown[],
}));

vi.mock('../api/execution-api', () => ({
  isTerminalRunStatus: (status?: string | null) =>
    !!status && ['completed', 'failed', 'blocked', 'superseded'].includes(status),
  useExecutionRunDetail: () => ({
    data: mockState.detail,
    isLoading: mockState.isLoading,
  }),
  useExecutionRunEvents: () => ({ data: mockState.events }),
  useExecutionRunLogs: () => ({ data: [] }),
}));

function renderDialog() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RunDetailsDialog runId="run-1" open onOpenChange={() => {}} />
    </QueryClientProvider>,
  );
}

function makeDetail(overrides: Partial<ExecutionRunDetail> = {}): ExecutionRunDetail {
  return {
    id: 'run-1',
    projectId: 'p1',
    subjectType: 'platform_ai_member',
    subjectId: 'm1',
    subjectName: 'Mika',
    identitySource: 'cli',
    goal: '修复登录页',
    status: 'completed',
    createdAt: '2026-09-04T01:00:00Z',
    updatedAt: '2026-09-04T01:09:00Z',
    startedAt: '2026-09-04T01:00:00Z',
    completedAt: '2026-09-04T01:09:00Z',
    totalTokens: 17400,
    totalCost: 0.51,
    steps: [],
    artifacts: [],
    bindings: [],
    ...overrides,
  };
}

describe('RunDetailsDialog', () => {
  it('加载中渲染占位', () => {
    mockState.isLoading = true;
    mockState.detail = undefined;
    renderDialog();
    expect(screen.queryByRole('status')).toBeTruthy();
  });

  it('渲染头部：目标/状态/触发来源/tokens/费用与详情面板触发钮', () => {
    mockState.isLoading = false;
    mockState.detail = makeDetail();
    mockState.events = [];
    renderDialog();
    // 目标文案同现于头部标题与编排树 task 行，取 SheetTitle 锚定
    expect(document.querySelector('[data-slot="sheet-title"]')?.textContent).toContain(
      '修复登录页',
    );
    expect(screen.getByText('runDetails.status.completed')).toBeTruthy();
    expect(screen.getByText('runDetails.trigger.cli')).toBeTruthy();
    // tokens/费用三处：头部徽（存量 formatTokens/formatCost 字面口径）各 1 份；
    // 编排树头部汇总 + 根卡自身 CostFigure（§14.1 formatCompact/formatCurrency 口径）各 1 份
    expect(screen.getByText('17.4K')).toBeTruthy();
    expect(screen.getByText('$0.51')).toBeTruthy();
    expect(screen.getAllByText(formatCompact(17400))).toHaveLength(2);
    expect(screen.getAllByText(formatCurrency(0.51))).toHaveLength(2);
    expect(screen.getByTitle('runDetails.title')).toBeTruthy(); // ℹ 信息面板触发钮
  });

  it('编排树（B1 单根退化态）：数据层平铺时根=本次执行、无子级折叠', () => {
    mockState.isLoading = false;
    mockState.detail = makeDetail();
    mockState.events = [];
    renderDialog();
    expect(screen.getByRole('tree')).toBeTruthy();
    // subjectName 作节点名，completed → done 态（六态映射）
    expect(screen.getByRole('treeitem', { name: 'Mika，已完成' })).toBeTruthy();
    expect(screen.getByText('共 1 节点')).toBeTruthy();
    // 数据层无父子契约：无折叠钮、无 group（不造树形假数据）
    expect(document.querySelector('[role="group"]')).toBeNull();
    expect(document.querySelector('button[aria-expanded]')).toBeNull();
  });

  it('steps 存在时渲染时间轴双行与事件条目', () => {
    mockState.isLoading = false;
    mockState.detail = makeDetail({
      steps: [
        {
          id: 's1',
          executionRunId: 'run-1',
          stepType: 'tool_call',
          sequence: 1,
          name: 'Bash',
          input: { command: 'ls -la' },
          status: 'completed',
          startedAt: '2026-09-04T01:00:10Z',
          completedAt: '2026-09-04T01:00:12Z',
          duration: 2000,
        },
      ],
    });
    renderDialog();
    expect(screen.getByText('runDetails.timeline.model')).toBeTruthy();
    expect(screen.getByText('runDetails.timeline.tools')).toBeTruthy();
    expect(screen.getByText('Bash')).toBeTruthy();
    expect(screen.getByText('+00:10')).toBeTruthy();
  });

  it('artifacts 聚合为产出 chips', () => {
    mockState.isLoading = false;
    mockState.detail = makeDetail({
      artifacts: [
        { artifactType: 'file_path' },
        { artifactType: 'file_path' },
        { artifactType: 'command_output' },
      ] as never[],
    });
    renderDialog();
    expect(screen.getByText('runDetails.outputsFiles:2')).toBeTruthy();
    expect(screen.getByText('runDetails.outputsCommands:1')).toBeTruthy();
  });

  it('完整 Prompt 页签：无持久化载荷时空态说明，不报错', () => {
    mockState.isLoading = false;
    mockState.detail = makeDetail();
    renderDialog();
    fireEvent.click(screen.getByText('runDetails.tabFullPrompt'));
    expect(screen.getByText('runDetails.fullPromptEmptyTitle')).toBeTruthy();
    expect(screen.getByText('runDetails.fullPromptEmptyDesc')).toBeTruthy();
  });

  it('完整 Prompt 页签：展示派发真实载荷全文与字数', () => {
    mockState.isLoading = false;
    mockState.detail = makeDetail({
      input: { prompt: '# Task\n实现登录页' },
    });
    renderDialog();
    fireEvent.click(screen.getByText('runDetails.tabFullPrompt'));
    expect(screen.getByText(/# Task/)).toBeTruthy();
    expect(screen.getByText(/实现登录页/)).toBeTruthy();
    expect(screen.getByText('runDetails.fullPromptChars:12')).toBeTruthy();
    expect(screen.getByText('runDetails.fullPromptCopy')).toBeTruthy();
  });
});
