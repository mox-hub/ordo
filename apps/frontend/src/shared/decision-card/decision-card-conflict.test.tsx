import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@/i18n';
import { DecisionCard } from './decision-card';
import { useExpertise } from '@/modules/decision/hooks/use-expertise';
import type { Decision } from './types';

vi.mock('@/modules/decision/hooks/use-expertise', () => ({
  useExpertise: vi.fn(),
}));

const mockUseExpertise = vi.mocked(useExpertise);

/**
 * 契约冲突卡（contract_conflict）回归背景：
 * 该 kind 曾不在前端 PROPOSAL_KINDS 词表里——卡面落入占位渲染器
 * （「该决策类型的主体渲染器待类型落地」），点「接受」被兜底路由到
 * 验收端点 acceptCompletion（404 Acceptance not found）。
 * 本文件钉住：卡面渲染冲突事实（文件路径/派生标记/差异区间）+ 四键动作栏接线。
 */

const derivedConflict: Decision = {
  id: 'contract_conflict:cc-1',
  kind: 'contract_conflict',
  sourceId: 'cc-1',
  status: 'pending',
  title: '派生契约文件被手改：CLAUDE.md',
  detail: '该文件由平台派生（真相在 DB）。',
  urgency: 'advisory',
  projectId: 'p1',
  projectName: 'Ordo',
  proposer: { type: 'system' },
  payload: {
    bindingId: 'b-1',
    filePath: 'CLAUDE.md',
    derived: true,
  },
  contentFingerprint: 'fp-1',
  createdAt: new Date().toISOString(),
};

const managedConflict: Decision = {
  ...derivedConflict,
  id: 'contract_conflict:cc-2',
  title: '契约托管区冲突：AGENTS.md',
  payload: {
    bindingId: 'b-2',
    filePath: 'AGENTS.md',
    blocks: [
      {
        id: 'intro',
        state: 'file_differs',
        fileSide: '文件侧现值第一行',
        dbSide: '平台侧托管第一行',
      },
    ],
  },
};

function setup() {
  const onAction = vi.fn();
  const { container } = render(
    <DecisionCard decision={derivedConflict} onAction={onAction} />,
  );
  return { onAction, container };
}

describe('DecisionCard contract_conflict（契约冲突卡）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseExpertise.mockReturnValue({
      domains: [],
      level: vi.fn(() => 'detailed' as never),
      feedback: vi.fn().mockResolvedValue(undefined),
      isLoading: false,
    });
  });

  it('卡面渲染冲突事实：文件路径原文 + 冲突主体（不再是占位渲染器）', () => {
    const { container } = setup();

    // 冲突主体由 buildContractConflictSlots 渲染，埋点属性存在
    expect(container.querySelector('[data-ai="decision-conflict-body"]')).toBeTruthy();
    // 文件路径是 payload 原文（非 i18n），必须原样可见（主体行 + 影响行至少各一处）
    expect(screen.getAllByText('CLAUDE.md').length).toBeGreaterThanOrEqual(1);
    // 占位文案不再出现
    expect(screen.queryByText(/decision\.body\.placeholder/)).toBeNull();
  });

  it('派生型卡渲染差异说明而不渲染区间对照（派生冲突无 blocks）', () => {
    setup();
    // 派生提示的 i18n 键在文案注入前回落为键名，但托管说明键不应出现
    expect(screen.queryByText(/decision\.conflict\.managedHint/)).toBeNull();
  });

  it('托管型卡渲染差异区间对照（两侧摘要）', () => {
    const { container } = render(
      <DecisionCard decision={managedConflict} onAction={vi.fn()} />,
    );
    expect(screen.getAllByText('AGENTS.md').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/文件侧现值第一行/)).toBeTruthy();
    expect(screen.getByText(/平台侧托管第一行/)).toBeTruthy();
    expect(container.querySelector('[data-ai="decision-conflict-body"]')).toBeTruthy();
  });

  it('动作栏四键：三个裁决键 + 驳回，裁决键点击把动作名透传给 onAction', () => {
    // 收场仪式（§22.4）开启后首次决议即进入确认态、动作栏锁定——
    // 因此每个裁决键各用一张新卡验证透传（键位序不变：accept_file / accept_db / detach）。
    const clickKey = (nth: number): { onAction: ReturnType<typeof vi.fn>; container: HTMLElement } => {
      const onAction = vi.fn();
      const { container } = render(
        <DecisionCard decision={derivedConflict} onAction={onAction} />,
      );
      const bar = container.querySelector('[data-decision-actions]');
      expect(bar).toBeTruthy();
      expect(bar!.querySelectorAll('button').length).toBe(4);
      fireEvent.click(bar!.querySelectorAll('button')[nth]);
      return { onAction, container };
    };

    const first = clickKey(0);
    expect(first.onAction.mock.calls[0][0]).toBe('accept_file');
    expect(first.onAction.mock.calls[0][1]).toBe(derivedConflict);
    // 首键点击后确认态出现（收场仪式第 1 拍），动作栏锁定防重复决议
    expect(first.container.querySelector('[data-decision-confirm="passed"]')).toBeTruthy();
    expect(
      (first.container.querySelector('[data-decision-actions] button') as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    expect(clickKey(1).onAction.mock.calls[0][0]).toBe('accept_db');
    expect(clickKey(2).onAction.mock.calls[0][0]).toBe('detach');
  });
});
