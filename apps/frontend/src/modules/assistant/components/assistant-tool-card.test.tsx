import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  AssistantToolCard,
  AssistantToolGroup,
  type AssistantToolCardProps,
  type AssistantToolPart,
} from './assistant-tool-card';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && 'count' in opts ? `${key}:${opts.count}` : key,
  }),
}));

vi.mock('@/modules/decision/hooks/use-decision-actions', () => ({
  useDecisionActions: () => ({ handleAction: vi.fn(), busyId: null }),
}));

// 单元隔离：被测对象是工具卡本身，DecisionCard 以桩渲染（真实实现由 decision 模块自己的测试覆盖）
vi.mock('@/shared/decision-card/decision-card', () => ({
  DecisionCard: ({ decision }: { decision: { title: string } }) => (
    <div data-testid="decision-card-stub">{decision.title}</div>
  ),
}));

function cardEl(
  part: Partial<AssistantToolPart>,
  props?: Omit<AssistantToolCardProps, 'part'>,
) {
  const qc = new QueryClient();
  return (
    <QueryClientProvider client={qc}>
      <AssistantToolCard part={{ type: 'tool-x', ...part } as AssistantToolPart} {...props} />
    </QueryClientProvider>
  );
}

function renderCard(
  part: Partial<AssistantToolPart>,
  props?: Omit<AssistantToolCardProps, 'part'>,
) {
  return render(cardEl(part, props));
}

const header = () => screen.getByRole('button');
const liveRegion = () =>
  document.querySelector('[aria-live="polite"]') as HTMLElement | null;

describe('AssistantToolCard', () => {
  it('调用中渲染 spinner 态折叠卡（动词×实体组合标签 + 输入摘要）', () => {
    renderCard({
      type: 'tool-create_task',
      toolName: 'create_task',
      state: 'input-available',
      input: { title: '登录页改版', projectId: 'p1' },
    });

    // 标签出现在头部与 aria-live 播报中
    expect(screen.getAllByText(/verb\.create/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('登录页改版').length).toBeGreaterThanOrEqual(1);
    expect(
      document.querySelector('[data-tool-state="input-available"]'),
    ).toBeTruthy();
  });

  it('实体输出渲染标题/状态/详情跳转（bug 走 bugs 路由）', () => {
    renderCard({
      type: 'tool-create_task',
      toolName: 'create_task',
      state: 'output-available',
      input: { title: '登录页改版' },
      output: { issueId: 't1', shortId: 'AB12', title: '登录页改版', status: 'todo', type: 'bug' },
    });

    expect(screen.getAllByText('登录页改版').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('todo')).toBeTruthy();
    const link = screen.getByText('assistant.tool.view');
    expect((link as HTMLAnchorElement).getAttribute('href')).toBe('/app/bugs/t1');
    expect(
      document.querySelector('[data-tool-state="output-available"]'),
    ).toBeTruthy();
  });

  it('错误输出渲染可读错误（工具返回 error 字段）', () => {
    renderCard({
      type: 'tool-create_task',
      toolName: 'create_task',
      state: 'output-available',
      input: { title: 'x' },
      output: { error: 'Invalid status: xx' },
    });

    expect(screen.getByText('Invalid status: xx')).toBeTruthy();
    expect(document.querySelector('[data-tool-state="output-available"] svg.text-accent-red')).toBeTruthy();
  });

  it('列表输出渲染结果数与前 3 条样例', () => {
    renderCard({
      type: 'tool-list_project_tasks',
      toolName: 'list_project_tasks',
      state: 'output-available',
      input: {},
      output: {
        tasks: [
          { id: '1', title: '任务一' },
          { id: '2', title: '任务二' },
          { id: '3', title: '任务三' },
          { id: '4', title: '任务四' },
        ],
      },
    });

    expect(screen.getAllByText('assistant.tool.resultCount:4').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/任务一/)).toBeTruthy();
    expect(screen.getByText(/任务三/)).toBeTruthy();
    expect(screen.queryByText(/任务四/)).toBeNull();
  });

  it('propose_decision 完整输出内联决策卡；残缺输出回退普通工具卡', () => {
    const { unmount } = renderCard({
      type: 'tool-propose_decision',
      toolName: 'propose_decision',
      state: 'output-available',
      input: {},
      output: {
        proposalId: 'dp-1',
        status: 'pending',
        kind: 'plan',
        title: '重构登录模块',
        payload: { added: [{ title: '拆步骤' }] },
        createdAt: '2026-09-04T08:00:00Z',
      },
    });

    expect(
      document.querySelector('[data-ai-component="assistant.tool-decision"]'),
    ).toBeTruthy();
    expect(screen.getByText('重构登录模块')).toBeTruthy();
    unmount();

    renderCard({
      type: 'tool-propose_decision',
      toolName: 'propose_decision',
      state: 'output-available',
      input: {},
      output: { proposalId: 'p1' },
    });
    expect(
      document.querySelector('[data-ai-component="assistant.tool-card"]'),
    ).toBeTruthy();
  });
});

describe('AssistantToolCard 失败自动展开 / 恢复自动收起（§22.5）', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('状态变 error 自动展开详情，恢复 success 自动收起', () => {
    const view = renderCard({ toolName: 'create_task', state: 'input-available', input: { title: 'x' } });
    expect(header().getAttribute('aria-expanded')).toBe('false');

    view.rerender(
      cardEl({ toolName: 'create_task', state: 'output-error', errorText: 'boom' }),
    );
    expect(header().getAttribute('aria-expanded')).toBe('true');

    view.rerender(
      cardEl({ toolName: 'create_task', state: 'output-available', output: { ok: 1 } }),
    );
    expect(header().getAttribute('aria-expanded')).toBe('false');
  });

  it('恢复到 running（重跑）同样自动收起', () => {
    const view = renderCard({ state: 'input-available' });
    view.rerender(cardEl({ state: 'output-error', errorText: 'boom' }));
    expect(header().getAttribute('aria-expanded')).toBe('true');
    view.rerender(cardEl({ state: 'input-available' }));
    expect(header().getAttribute('aria-expanded')).toBe('false');
  });

  it('用户手动切换过展开态后不再自动干预', () => {
    const view = renderCard({ state: 'input-available', input: { title: 'x' } });
    // 手动开→关
    fireEvent.click(header());
    expect(header().getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(header());
    expect(header().getAttribute('aria-expanded')).toBe('false');

    // 之后失败不再自动展开
    view.rerender(cardEl({ state: 'output-error', errorText: 'boom' }));
    expect(header().getAttribute('aria-expanded')).toBe('false');
  });

  it('受控 open 传入时不做自动干预', () => {
    const onOpenChange = vi.fn();
    const view = render(
      cardEl({ state: 'input-available' }, { open: false, onOpenChange }),
    );
    view.rerender(
      cardEl({ state: 'output-error', errorText: 'boom' }, { open: false, onOpenChange }),
    );
    expect(header().getAttribute('aria-expanded')).toBe('false');
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe('AssistantToolCard 计时（§22.2 成本一等公民 · live 计时）', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('运行中 live 计时（100ms tick）', () => {
    vi.useFakeTimers();
    renderCard({ state: 'input-available' });
    act(() => {
      vi.advanceTimersByTime(12_340);
    });
    expect(screen.getByText('12.3s')).toBeTruthy();
  });

  it('startedAt 从 props 注入（服务端时间）', () => {
    vi.useFakeTimers();
    const t0 = Date.now();
    vi.advanceTimersByTime(5_000);
    renderCard({ state: 'input-available' }, { startedAt: t0 });
    expect(screen.getByText('5.0s')).toBeTruthy();
  });

  it('重试间歇累加（多段运行时间求和，不从零重计）', () => {
    vi.useFakeTimers();
    const view = renderCard({ state: 'input-available' });
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(screen.getByText('2.0s')).toBeTruthy();

    // 中途定格为终态
    view.rerender(cardEl({ state: 'output-available', output: { ok: 1 } }));
    expect(screen.getByText('2.0s')).toBeTruthy();

    // 重跑：从上一段累计
    view.rerender(cardEl({ state: 'input-available' }));
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText('3.0s')).toBeTruthy();
  });

  it('终态时长渐进精度（duration 注入：420ms / 12.3s / 2m 05s / 3h 12m / 2d 4h）', () => {
    const cases: Array<[number, string]> = [
      [420, '420ms'],
      [12_300, '12.3s'],
      [125_000, '2m 05s'],
      [11_520_000, '3h 12m'],
      [187_200_000, '2d 4h'],
    ];
    const view = render(cardEl({ state: 'output-available', output: { ok: 1 } }, { duration: 420 }));
    for (const [ms, label] of cases) {
      view.rerender(cardEl({ state: 'output-available', output: { ok: 1 } }, { duration: ms }));
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('无计时数据（历史消息）诚实降级不显示时长', () => {
    renderCard({ state: 'output-available', output: { ok: 1 } });
    expect(document.querySelector('[data-tool-status="success"] .tabular-nums')).toBeNull();
  });
});

describe('AssistantToolCard JSON 高亮与代码块', () => {
  it('参数对象 pretty-print 并四类 token 高亮', () => {
    renderCard({
      toolName: 'search_web',
      state: 'output-available',
      input: { query: '登录页', limit: 5, exact: true },
    });
    fireEvent.click(header());

    const code = document.querySelector('pre code');
    expect(code?.textContent).toContain('"query"');
    expect(code?.querySelector('.text-accent-green')?.textContent).toBe('"登录页"');
    expect(code?.querySelector('.text-accent-orange')?.textContent).toBe('5');
    expect(code?.querySelector('.text-accent-purple')?.textContent).toBe('true');
    expect(code?.querySelector('.text-content-text')?.textContent).toBe('"query"');
  });

  it('JSON 字符串尝试解析为 pretty-print', () => {
    renderCard({ state: 'output-available', output: '{"a":1}' });
    fireEvent.click(header());
    const code = document.querySelector('pre code');
    expect(code?.textContent).toContain('"a"');
    expect(code?.textContent).toContain('\n'); // pretty-print 换行
  });

  it('非 JSON 文本原样展示（无高亮 span）', () => {
    renderCard({ state: 'output-available', output: 'plain text result' });
    fireEvent.click(header());
    const code = document.querySelector('pre code');
    expect(code?.textContent).toBe('plain text result');
    expect(code?.querySelector('span')).toBeNull();
  });

  it('高度封顶三段式：超 220px 渐隐 + 显示全部；展开后超 640px 内部滚动', () => {
    Object.defineProperty(HTMLPreElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 700,
    });
    try {
      renderCard({ state: 'output-available', input: { big: 'x'.repeat(2000) } });
      fireEvent.click(header());

      const pre = document.querySelector('pre') as HTMLPreElement;
      expect(pre.getAttribute('data-capped')).toBe('');
      expect(pre.style.maxHeight).toBe('220px');

      const more = screen.getByText('显示全部');
      expect(more.getAttribute('aria-expanded')).toBe('false');
      fireEvent.click(more);
      // 700 > 640 → 展开后改内部滚动
      expect(pre.getAttribute('data-scroll')).toBe('');
      expect(pre.style.maxHeight).toBe('640px');
      expect(pre.className).toContain('overflow-y-auto');
      expect(screen.getByText('收起')).toBeTruthy();
    } finally {
      delete (HTMLPreElement.prototype as unknown as Record<string, unknown>).scrollHeight;
    }
  });

  it('高度不足不出现显示全部按钮', () => {
    renderCard({ state: 'output-available', input: { a: 1 }, output: { ok: 1 } });
    fireEvent.click(header());
    expect(screen.queryByText('显示全部')).toBeNull();
  });
});

describe('AssistantToolCard 无障碍（§22.5 / §8.5）', () => {
  it('状态迁移经 aria-live 播报（运行中/已完成/失败）', () => {
    const view = renderCard({ toolName: 'create_task', state: 'input-available' });
    expect(liveRegion()?.textContent).toContain('运行中');

    view.rerender(
      cardEl({
        toolName: 'create_task',
        state: 'output-available',
        output: { issueId: 't1', title: 'x' },
      }),
    );
    expect(liveRegion()?.textContent).toContain('已完成');

    view.rerender(
      cardEl({ toolName: 'create_task', state: 'output-error', errorText: 'x' }),
    );
    expect(liveRegion()?.textContent).toContain('失败');
  });

  it('折叠区 inert 防焦点落入，展开后解除', () => {
    renderCard({ state: 'output-available', input: { a: 1 }, output: { ok: 1 } });
    const bodyId = header().getAttribute('aria-controls');
    const body = document.getElementById(bodyId ?? '');
    expect(body?.hasAttribute('inert')).toBe(true);

    fireEvent.click(header());
    expect(body?.hasAttribute('inert')).toBe(false);
  });
});

describe('AssistantToolGroup（连续工具卡汇总）', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function groupEl(
    cards: Array<{ part: Partial<AssistantToolPart>; duration?: number; startedAt?: number }>,
  ) {
    return (
      <QueryClientProvider client={new QueryClient()}>
        <AssistantToolGroup>
          {cards.map((card, i) => (
            <AssistantToolCard
              key={i}
              part={{ type: 'tool-x', ...card.part } as AssistantToolPart}
              duration={card.duration}
              startedAt={card.startedAt}
            />
          ))}
        </AssistantToolGroup>
      </QueryClientProvider>
    );
  }

  it('汇总行「已用 N 个工具 · 用时 · M 失败」，点开得卡片列表', () => {
    render(
      groupEl([
        {
          part: { toolName: 'get_project', state: 'output-available', output: { projectId: 'p1', title: 'P' } },
          duration: 1000,
        },
        {
          part: { toolName: 'search_web', state: 'output-available', input: { q: 'x' }, output: { ok: 1 } },
          duration: 2000,
        },
        {
          part: { toolName: 'create_task', state: 'output-error', errorText: 'boom', input: { title: 'y' } },
          duration: 500,
        },
      ]),
    );

    expect(screen.getByText('已用 3 个工具')).toBeTruthy();
    expect(screen.getByText('1 个失败')).toBeTruthy();
    expect(screen.getByText('3.5s')).toBeTruthy(); // 从成员 duration 现算求和

    // 收起时子卡不可见（hidden + inert），点开得卡片列表
    const groupBody = document.getElementById(header().getAttribute('aria-controls') ?? '');
    expect(groupBody?.hasAttribute('hidden')).toBe(true);
    expect(groupBody?.hasAttribute('inert')).toBe(true);
    fireEvent.click(header());
    expect(groupBody?.hasAttribute('hidden')).toBe(false);
    expect(screen.getByText('boom')).toBeTruthy();
    expect(document.querySelectorAll('[data-ai-component="assistant.tool-card"]').length).toBe(3);
  });

  it('运行中组显示运行标签，组计时从最早 startedAt 起算', () => {
    vi.useFakeTimers();
    const t0 = Date.now();
    vi.advanceTimersByTime(5_000);
    render(
      groupEl([
        { part: { toolName: 'search_web', state: 'output-available', output: { ok: 1 } }, duration: 800 },
        { part: { toolName: 'create_task', state: 'input-available', input: { title: 'y' } }, startedAt: t0 },
      ]),
    );

    expect(screen.getByText('正在调用工具…')).toBeTruthy();
    // 组头与运行中子卡都会按各自口径显示 5.0s（组从最早 startedAt 起算）
    expect(screen.getAllByText('5.0s').length).toBeGreaterThanOrEqual(1);
  });
});
