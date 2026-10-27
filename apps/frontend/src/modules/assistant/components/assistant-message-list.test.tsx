import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AssistantChatMessage } from '../hooks/use-assistant-chat';
import { AssistantChatSession } from '../hooks/use-assistant-chat';
import { AssistantMessageList } from './assistant-message-list';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  // MarkdownView 链会加载 @/i18n 实例（CAP-A-23），i18n.init 需要 initReactI18next
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// 单元隔离：内联决策卡以桩渲染，工具卡分组逻辑不依赖 decision-card 真实实现
vi.mock('@/shared/decision-card/decision-card', () => ({
  DecisionCard: ({ decision }: { decision: { title: string } }) => (
    <div data-testid="decision-card-stub">{decision.title}</div>
  ),
}));

function renderList(messages: AssistantChatMessage[]) {
  return render(
    <AssistantChatSession initialMessages={messages} conversationId="conv-1">
      <AssistantMessageList />
    </AssistantChatSession>,
  );
}

describe('AssistantMessageList', () => {
  it('user/assistant 气泡按 parts 渲染（text 经 Markdown 视图）', () => {
    renderList([
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: '项目进展如何' }] },
      {
        id: 'a1',
        role: 'assistant',
        metadata: { runStatus: 'done' },
        parts: [{ type: 'text', state: 'done', text: '**结论**：正常' }],
      },
    ]);

    expect(screen.getByText('项目进展如何')).toBeTruthy();
    expect(screen.getByText(/结论/)).toBeTruthy();
    expect(
      document.querySelector('[data-ai-component="assistant.message-assistant"]'),
    ).toBeTruthy();
  });

  it('running 占位（空 parts + runStatus running）渲染工作指示', () => {
    renderList([
      {
        id: 'a-run',
        role: 'assistant',
        metadata: { runStatus: 'running', executionRunId: 'run-1' },
        parts: [],
      },
    ]);

    expect(screen.getByText('assistant.chat.working')).toBeTruthy();
    expect(
      document.querySelector('[data-ai-component="assistant.message-pending"]'),
    ).toBeTruthy();
  });

  it('工具调用段渲染折叠工具卡（残缺决策输出回退普通卡），text 段照常渲染', () => {
    renderList([
      {
        id: 'a-tool',
        role: 'assistant',
        parts: [
          {
            type: 'tool-propose_decision',
            toolCallId: 't1',
            toolName: 'propose_decision',
            state: 'output-available',
            input: {},
            output: { proposalId: 'p1' },
          },
          { type: 'text', state: 'done', text: '已给出建议卡' },
        ].map((p) =>
          p.type.startsWith('tool-')
            ? ({ ...p, toolName: 'propose_decision' } as never)
            : p,
        ) as AssistantChatMessage['parts'],
      },
    ]);

    expect(
      document.querySelector('[data-ai-component="assistant.tool-card"]'),
    ).toBeTruthy();
    expect(screen.getByText('已给出建议卡')).toBeTruthy();
  });

  it('连续 ≥2 张工具卡折叠为组汇总行（决策建议卡除外），text 段不被卷入', () => {
    renderList([
      {
        id: 'a-tools',
        role: 'assistant',
        parts: [
          {
            type: 'tool-search_web',
            toolCallId: 't1',
            toolName: 'search_web',
            state: 'output-available',
            input: { query: 'x' },
            output: { ok: 1 },
          },
          {
            type: 'tool-search_web',
            toolCallId: 't2',
            toolName: 'search_web',
            state: 'output-available',
            input: { query: 'y' },
            output: { ok: 2 },
          },
          { type: 'text', state: 'done', text: '查询完成' },
        ] as AssistantChatMessage['parts'],
      },
    ]);

    expect(
      document.querySelector('[data-ai-component="assistant.tool-group"]'),
    ).toBeTruthy();
    // 头部与 aria-live 播报都会出现该文案
    expect(screen.getAllByText('已用 2 个工具').length).toBeGreaterThanOrEqual(1);
    // 组默认收起；text 段不被卷入组
    expect(screen.getByText('查询完成')).toBeTruthy();
    const groupHeader = screen
      .getAllByText('已用 2 个工具')
      .find((el) => el.closest('button'))?.closest('button');
    const groupBody = document.getElementById(
      groupHeader?.getAttribute('aria-controls') ?? '',
    );
    expect(groupBody?.hasAttribute('hidden')).toBe(true);
  });

  it('单个工具段保持独立卡片渲染，不强制成组', () => {
    renderList([
      {
        id: 'a-one',
        role: 'assistant',
        parts: [
          {
            type: 'tool-search_web',
            toolCallId: 't1',
            toolName: 'search_web',
            state: 'output-available',
            input: { query: 'x' },
            output: { ok: 1 },
          },
          { type: 'text', state: 'done', text: '好了' },
        ] as AssistantChatMessage['parts'],
      },
    ]);

    expect(
      document.querySelector('[data-ai-component="assistant.tool-group"]'),
    ).toBeNull();
    expect(
      document.querySelector('[data-ai-component="assistant.tool-card"]'),
    ).toBeTruthy();
  });
});
