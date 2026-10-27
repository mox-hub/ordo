/**
 * 「AI 创建 AI 同事」专属页测试（CAP-A-18 切片，GAP-T-74 测试义务）：
 * L1 诚实降级双出口 / 生成→确认→提交全链（联调红线用例：AI 草稿→人改→落库值=人改值，
 * aiModelConfigId 走库记录解析）/ 必填缺失阻止创建 / AI 未给槽位提示 / 生成失败回退。
 * i18n mock 透传键名（onboarding-wizard.test 同款）；silent/aiHub/createMember mock 断链。
 */
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const navigateMock = vi.hoisted(() => vi.fn());
// 只覆盖 useNavigate（断言跳转），其余（Link/createMemoryRouter 等）走真实实现——
// renderWithProviders 的 RouterWrapper 依赖它们
vi.mock('react-router-dom', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const readinessMock = vi.hoisted(() => vi.fn());
vi.mock('@/modules/ai-hub/hooks/use-ai-readiness', () => ({
  useAiReadiness: () => readinessMock(),
}));

const silentMock = vi.hoisted(() => vi.fn());
vi.mock('@/modules/assistant/api/assistant-api', () => ({
  assistantApi: {
    silent: (...args: unknown[]) => silentMock(...args),
  },
}));

const getModelsMock = vi.hoisted(() => vi.fn());
vi.mock('@/modules/ai-hub/api/ai-hub-api', () => ({
  aiHubApi: {
    getModels: (...args: unknown[]) => getModelsMock(...args),
  },
}));

const createMemberMock = vi.hoisted(() => vi.fn());
vi.mock('../hooks', () => ({
  useCreateMember: () => createMemberMock(),
}));

// 环境步等共享件断链（页面树只涉 SubPageToolbar，不引它们，保底防漂移）
vi.mock('@/shared/ai-providers/provider-meta', () => ({
  getProviderMeta: (id: string) => ({ label: id, Icon: () => null, Color: undefined }),
}));

import { AiMemberCreatePage } from './ai-member-create-page';
import { renderWithProviders } from '@/test-utils/providers';

const DRAFT = {
  displayName: '评审官老王',
  handle: 'reviewer-laowang',
  title: '资深代码评审',
  description: '严格但给建设性意见',
  personalPrompt: '## 职责\n只评审不改码',
  thinkingLevel: 'high',
  defaultCliProviderId: 'claude-code',
  defaultExecutionRole: 'reviewer',
  suggestedProvider: 'glm',
  suggestedModel: 'glm-4.7',
  tags: ['review'],
  rationale: { model: 'GLM 上下文长', role: '职责是评审', prompt: '三段式' },
};

describe('AiMemberCreatePage', () => {
  beforeEach(() => {
    readinessMock.mockReset();
    silentMock.mockReset();
    getModelsMock.mockReset();
    createMemberMock.mockReset();
    readinessMock.mockReturnValue({ state: 'ready', detail: null });
    getModelsMock.mockResolvedValue([
      { id: 'cuid-glm47', name: 'glm-4.7', provider: 'glm', enabled: true },
    ]);
    createMemberMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'm-new' }),
      isPending: false,
    });
  });

  it('L1（内置 AI 完全不可用）：诚实降级卡 + 双出口 CTA，不渲染代写表单', () => {
    readinessMock.mockReturnValue({ state: 'unavailable', detail: null });
    renderWithProviders(<AiMemberCreatePage />);

    expect(screen.getByText('aiHub.readiness.unavailableTitle')).toBeTruthy();
    expect(screen.getByText('aiMemberCreate.manualFallback')).toBeTruthy();
    expect(screen.getByText('aiHub.readiness.goConfigure')).toBeTruthy();
    expect(screen.getByText('aiMemberCreate.openManual')).toBeTruthy();
    expect(screen.queryByText('aiMemberCreate.briefLabel')).toBeNull();
  });

  it('生成→确认→提交全链（红线用例）：AI 草稿→人改显示名→落库值=人改值，aiModelConfigId 走库记录', async () => {
    silentMock.mockResolvedValue({ scenario: 'member-profile-draft', data: DRAFT });
    renderWithProviders(<AiMemberCreatePage />);

    fireEvent.change(screen.getByLabelText('aiMemberCreate.briefLabel'), {
      target: { value: '要一个严格的评审同事' },
    });
    fireEvent.click(screen.getByText('aiMemberCreate.generate'));
    await waitFor(() => {
      expect(silentMock).toHaveBeenCalledWith(
        'member-profile-draft',
        expect.objectContaining({
          context: { brief: '要一个严格的评审同事' },
        }),
      );
    });

    // 生成成功进确认段，草稿回填
    await screen.findByText('aiMemberCreate.confirmHint');
    const nameInput = screen.getByDisplayValue('评审官老王') as HTMLInputElement;
    // 人改一个字段（「人确认」非走过场的结构化证明）
    fireEvent.change(nameInput, { target: { value: '评审官老王改' } });
    fireEvent.click(screen.getByText('aiMemberCreate.submit'));

    const mutateAsync = createMemberMock().mutateAsync as ReturnType<typeof vi.fn>;
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ai_agent',
        displayName: '评审官老王改',
        handle: 'reviewer-laowang',
        personalPrompt: '## 职责\n只评审不改码',
        thinkingLevel: 'high',
        defaultCliProviderId: 'claude-code',
        defaultExecutionRole: 'reviewer',
        aiModelConfigId: 'cuid-glm47',
        metadata: expect.objectContaining({ origin: 'ai-member-draft' }),
      }),
    );
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/members/m-new');
    });
  });

  it('AI 未给槽位（handle null）→ 「AI 未给出」提示；显示名缺失阻止提交', async () => {
    silentMock.mockResolvedValue({
      scenario: 'member-profile-draft',
      data: { ...DRAFT, displayName: null, handle: null },
    });
    renderWithProviders(<AiMemberCreatePage />);

    fireEvent.change(screen.getByLabelText('aiMemberCreate.briefLabel'), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByText('aiMemberCreate.generate'));
    await screen.findByText('aiMemberCreate.confirmHint');

    // 草稿 null 槽位出提示
    expect(screen.getAllByText('aiMemberCreate.aiNotGiven').length).toBeGreaterThan(0);

    // 显示名与模型缺失 → 阻止创建并出结构化报错
    fireEvent.click(screen.getByText('aiMemberCreate.submit'));
    expect(screen.getByText('aiMemberCreate.missingRequired')).toBeTruthy();
    const mutateAsync = createMemberMock().mutateAsync as ReturnType<typeof vi.fn>;
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('生成失败：回退描述段并透出错误，可重试', async () => {
    silentMock.mockRejectedValue(new Error('当前没有可用的 LLM provider'));
    renderWithProviders(<AiMemberCreatePage />);

    fireEvent.change(screen.getByLabelText('aiMemberCreate.briefLabel'), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByText('aiMemberCreate.generate'));

    await waitFor(() => {
      expect(
        screen.getByText(/当前没有可用的 LLM provider/),
      ).toBeTruthy();
    });
    // 回退到描述段（可重试），未卡死在生成态
    expect(screen.getByText('aiMemberCreate.generate')).toBeTruthy();
  });
});
