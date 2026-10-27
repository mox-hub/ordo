import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RunApprovalsSection } from './run-approvals-section';
import { api } from '@/infrastructure/api-client';
import { toast } from '@/components/ui/toast';

// i18n mock 仅透传键名，断言直接对着键写（run-isolation-badge.test 同款）
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/infrastructure/api-client', () => ({
  api: { post: vi.fn() },
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const base = {
  id: 'appr1',
  requestedAction: '提交工单「登录链路回归」的验收申请',
  actionType: 'execution_completion',
  riskLevel: 'medium',
  status: 'pending',
  requestedAt: '2026-10-02T00:00:00Z',
};

beforeEach(() => {
  vi.mocked(api.post).mockReset();
  vi.mocked(toast.error).mockClear();
});

describe('RunApprovalsSection（CAP-A-27 审批段 + AI 定级附注 → ApprovalCard 操作件）', () => {
  it('无审批单 → 整段不渲染', () => {
    const { container } = render(<RunApprovalsSection approvals={[]} />);
    expect(container.querySelector('[data-approval-card]')).toBeNull();
  });

  it('待决审批单渲染：requestedAction + 风险徽章（折算档位）+ 批准/拒绝操作键', () => {
    render(<RunApprovalsSection approvals={[{ ...base, riskLevel: 'high_risk' }]} />);

    expect(screen.getByText('提交工单「登录链路回归」的验收申请')).toBeTruthy();
    // 自报风险折算：high_risk → 档 3，档名沿用既有 i18n 键
    expect(screen.getByText('runApprovals.risk.high_risk')).toBeTruthy();
    const card = screen.getByRole('group');
    expect(card.getAttribute('data-risk-tier')).toBe('3');
    expect(screen.getByRole('button', { name: '批准' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '拒绝' })).toBeTruthy();
    // §22.1 可计数：段头有待决数
    expect(screen.getByTitle('待审 1')).toBeTruthy();
  });

  it('metadata.aiJudge 存在 → 渲染 AI 定级附注（高置信不带低置信标注）', () => {
    render(
      <RunApprovalsSection
        approvals={[
          {
            ...base,
            metadata: {
              aiJudge: {
                riskLevel: 'write',
                confidence: 0.92,
                safeToAutoApprove: 0.4,
                advisory: true,
              },
            },
          },
        ]}
      />,
    );

    expect(screen.getByText(/runApprovals\.risk\.write/)).toBeTruthy();
    expect(screen.getByText(/92%/)).toBeTruthy();
    expect(screen.queryByText('runApprovals.lowConfidence')).toBeNull();
  });

  it('低置信（<0.7）→ 显式标注低置信', () => {
    render(
      <RunApprovalsSection
        approvals={[
          {
            ...base,
            metadata: {
              aiJudge: { riskLevel: 'write', confidence: 0.41, advisory: true },
            },
          },
        ]}
      />,
    );

    expect(screen.getByText(/41%/)).toBeTruthy();
    expect(screen.getByText(/runApprovals\.lowConfidence/)).toBeTruthy();
  });

  it('AI 定级与自报不一致 → 渲染偏差提示（双轨对照观察位）', () => {
    render(
      <RunApprovalsSection
        approvals={[
          {
            ...base,
            riskLevel: 'read',
            metadata: {
              aiJudge: { riskLevel: 'high_risk', confidence: 0.9, advisory: true },
            },
          },
        ]}
      />,
    );

    expect(screen.getByText(/runApprovals\.riskMismatch/)).toBeTruthy();
  });

  it('metadata 无 aiJudge → 只渲染审批单本体，无 AI 附注', () => {
    render(<RunApprovalsSection approvals={[{ ...base, metadata: { source: 'manual' } }]} />);

    expect(screen.getByText('提交工单「登录链路回归」的验收申请')).toBeTruthy();
    expect(screen.queryByText(/AI /)).toBeNull();
  });

  it('点击批准 → 走既有 resolve 契约（POST /execution/approvals/:id/resolve，approved）', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({});
    render(<RunApprovalsSection approvals={[{ ...base }]} />);

    fireEvent.click(screen.getByRole('button', { name: '批准' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/execution/approvals/appr1/resolve', {
        resolution: 'approved',
      });
    });
    // 收场仪式第 1 拍：确认覆盖层
    await waitFor(() => {
      expect(screen.getByRole('status').getAttribute('data-approval-confirm')).toBe('approve');
    });
  });

  it('resolve 失败 → toast 具体原因 + 卡片回滚待决（两键恢复可用）', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('boom'));
    render(<RunApprovalsSection approvals={[{ ...base }]} />);

    fireEvent.click(screen.getByRole('button', { name: '拒绝' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/execution/approvals/appr1/resolve', {
        resolution: 'rejected',
      });
    });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('审批提交未完成：网络或服务异常，请重试');
    });
    await waitFor(() => {
      expect((screen.getByRole('button', { name: '拒绝' }) as HTMLButtonElement).disabled).toBe(
        false,
      );
    });
  });

  it('终态审批单渲染为凭证行（approved → 已通过），无操作键', () => {
    const { container } = render(
      <RunApprovalsSection approvals={[{ ...base, status: 'approved' }]} />,
    );

    expect(screen.getByText('runApprovals.statusApproved')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '批准' })).toBeNull();
    expect(container.querySelector('[data-approval-card]')?.getAttribute('data-approval-state')).toBe(
      'approve',
    );
    // 无待决 → 段头不渲染计数徽
    expect(screen.queryByTitle('待审 1')).toBeNull();
  });

  it('系统处置状态（expired）→ neutral 凭证行，不冒充人决', () => {
    const { container } = render(
      <RunApprovalsSection approvals={[{ ...base, status: 'expired' }]} />,
    );

    expect(screen.getByText('runApprovals.statusExpired')).toBeTruthy();
    expect(container.querySelector('[data-approval-card]')?.getAttribute('data-approval-state')).toBe(
      'neutral',
    );
  });

  it('混合状态：待决数只计 pending', () => {
    render(
      <RunApprovalsSection
        approvals={[
          { ...base, id: 'a1', status: 'pending' },
          { ...base, id: 'a2', status: 'approved' },
          { ...base, id: 'a3', status: 'rejected' },
        ]}
      />,
    );
    expect(screen.getByTitle('待审 1')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: '批准' })).toHaveLength(1);
  });

  it('act 冒烟：裁决回调 await 不抛未处理拒绝（组件内已兜底回滚）', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('boom'));
    render(<RunApprovalsSection approvals={[{ ...base }]} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '批准' }));
    });
    expect(toast.error).toHaveBeenCalled();
  });
});
