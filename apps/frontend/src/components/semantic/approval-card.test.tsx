import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApprovalCard } from './approval-card';
import type { ConfidenceSignal } from './ai-verdict-pill';

/**
 * ApprovalCard 测试（宪法 §18：状态逻辑 / 键盘交互 / 决后收场仪式必须测）。
 * 仪式时序用假时钟驱动（CONFIRM_MS=1s 确认覆盖层 → 凭证行）。
 */
const NOW = new Date('2026-10-27T10:00:00');

describe('ApprovalCard（审批操作统一件 · §22.1/§22.4）', () => {
  it('待决态：role=group + aria-label，批准/拒绝两键并排，风险档恒显', () => {
    render(<ApprovalCard title="批准执行 X 的步骤 Y" riskSignal={3} />);

    const group = screen.getByRole('group', { name: '批准执行 X 的步骤 Y' });
    expect(group.getAttribute('data-risk-tier')).toBe('3');
    // 风险方向渲染：3=高风险（与置信方向相反，绝不能落绿档文案）
    expect(screen.getByText('高风险')).toBeTruthy();
    expect(screen.getByRole('button', { name: '批准' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '拒绝' })).toBeTruthy();
  });

  it('风险档折算与防御归一：null→0 未知灰档；越界 7 归一到 3；riskLabel 可覆写档名', () => {
    const { rerender } = render(<ApprovalCard title="T" riskSignal={null} />);
    expect(screen.getByText('风险未知')).toBeTruthy();
    expect(screen.getByRole('group').getAttribute('data-risk-tier')).toBe('0');

    // 越界字面量故意破坏类型收窄：运行时经 normalizeConfidenceSignal 防御归一钳到 3（强档）
    rerender(<ApprovalCard title="T" riskSignal={7 as ConfidenceSignal} />);
    expect(screen.getByText('高风险')).toBeTruthy();
    expect(screen.getByRole('group').getAttribute('data-risk-tier')).toBe('3');

    // 消费方按场景给档名（如执行审批段的「只读/写操作/高风险」i18n 文案）
    rerender(<ApprovalCard title="T" riskSignal={1} riskLabel="只读" />);
    expect(screen.getByText('只读')).toBeTruthy();
    expect(screen.queryByText('低风险')).toBeNull();
  });

  it('busy 语境：显示暂停提示 + aria-busy，但不阻塞操作键', () => {
    render(<ApprovalCard title="T" busy />);
    expect(screen.getByText('等待 AI 完成当前步')).toBeTruthy();
    expect(screen.getByRole('group').getAttribute('aria-busy')).toBe('true');
    expect((screen.getByRole('button', { name: '批准' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('disabled：两键与快捷键全部封禁', () => {
    const onResolve = vi.fn();
    render(<ApprovalCard title="T" disabled onResolve={onResolve} />);
    expect((screen.getByRole('button', { name: '批准' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.keyDown(screen.getByRole('group'), { key: 'Enter', ctrlKey: true });
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('快捷键：Ctrl+Enter 批准、Esc 拒绝（焦点在卡内即生效；已决卡不再受理）', () => {
    const onResolve = vi.fn();
    const first = render(<ApprovalCard title="T" onResolve={onResolve} />);
    fireEvent.keyDown(first.getByRole('group'), { key: 'Enter', ctrlKey: true });
    expect(onResolve).toHaveBeenNthCalledWith(1, 'approve');

    // 同步回调下批准即进确认态——同卡快捷键封禁，拒绝另起一张卡验证
    first.unmount();
    const second = render(<ApprovalCard title="T" onResolve={onResolve} />);
    fireEvent.keyDown(second.getByRole('group'), { key: 'Escape' });
    expect(onResolve).toHaveBeenNthCalledWith(2, 'reject');
  });

  it('快捷键不干扰输入框焦点：焦点在卡内 input 时按键不触发裁决', () => {
    const onResolve = vi.fn();
    render(
      <ApprovalCard title="T" onResolve={onResolve} preview={<input aria-label="命令" />} />,
    );
    fireEvent.keyDown(screen.getByLabelText('命令'), { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(screen.getByLabelText('命令'), { key: 'Escape' });
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('决后收场仪式（假时钟）：点击批准 → 确认覆盖层（role=status）约 1s → 折叠为凭证行（决定 + 时间）', () => {
    vi.useFakeTimers({ now: NOW });
    try {
      const onResolve = vi.fn();
      render(<ApprovalCard title="批准上线" onResolve={onResolve} />);

      fireEvent.click(screen.getByRole('button', { name: '批准' }));
      expect(onResolve).toHaveBeenCalledWith('approve');
      // 第 1 拍：确认覆盖层，决定图标 + 文案，读屏经 role=status 播报
      expect(screen.getByRole('status').getAttribute('data-approval-confirm')).toBe('approve');
      expect(screen.getByText('已批准')).toBeTruthy();
      // 确认期内不得重复裁决
      fireEvent.keyDown(screen.getByRole('group', { name: '批准上线' }), {
        key: 'Enter',
        ctrlKey: true,
      });
      expect(onResolve).toHaveBeenCalledTimes(1);

      // 第 2 拍：约 1s 后折叠为凭证行，不再可操作
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.getByText('已批准')).toBeTruthy();
      // 假时钟下决定时刻=当前时刻 → 相对时间「刚刚」
      expect(screen.getByText('刚刚')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('onResolve 返回 Promise：落定前禁双击（submitting），落定后进确认态', async () => {
    vi.useFakeTimers({ now: NOW });
    try {
      let settle!: () => void;
      const onResolve = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            settle = resolve;
          }),
      );
      render(<ApprovalCard title="T" onResolve={onResolve} />);

      fireEvent.click(screen.getByRole('button', { name: '批准' }));
      expect((screen.getByRole('button', { name: '批准' }) as HTMLButtonElement).disabled).toBe(
        true,
      );
      expect(screen.queryByRole('status')).toBeNull();

      await act(async () => {
        settle();
      });
      expect(screen.getByRole('status')).toBeTruthy();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('已批准')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('Promise 拒绝 = 未落定：回滚待决态，两键恢复可用（错误呈现归消费方）', async () => {
    const onResolve = vi.fn(() => Promise.reject(new Error('网络中断')));
    render(<ApprovalCard title="T" onResolve={onResolve} />);

    fireEvent.click(screen.getByRole('button', { name: '拒绝' }));
    await act(async () => {});
    expect((screen.getByRole('button', { name: '拒绝' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText('已拒绝')).toBeNull();
  });

  it('受控模式：resolved 数据直接驱动终态，无内部确认层；neutral 处置凭证 + 文案覆写', () => {
    const onResolve = vi.fn();
    const { container, rerender } = render(
      <ApprovalCard title="T" resolved="approve" onResolve={onResolve} />,
    );
    // 凭证行是只读收场行（非操作组），用 data-approval-card 定位
    const receipt = container.querySelector('[data-approval-card]');
    expect(receipt?.getAttribute('data-approval-state')).toBe('approve');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();

    rerender(<ApprovalCard title="T" resolved={null} onResolve={onResolve} />);
    expect(screen.getByRole('group').getAttribute('data-approval-state')).toBe('pending');
    expect(screen.getByRole('button', { name: '批准' })).toBeTruthy();

    // 系统处置（过期/取消）：neutral 徽记 + 消费方处置文案，不冒充人决
    rerender(
      <ApprovalCard title="T" resolved="neutral" resolvedLabel="已过期" onResolve={onResolve} />,
    );
    expect(container.querySelector('[data-approval-card]')?.getAttribute('data-approval-state')).toBe(
      'neutral',
    );
    expect(screen.getByText('已过期')).toBeTruthy();
  });

  it('受控模式只发回调：快捷键/点击均透传 onResolve，不自行收场', () => {
    const onResolve = vi.fn();
    render(<ApprovalCard title="T" resolved={null} onResolve={onResolve} />);
    fireEvent.click(screen.getByRole('button', { name: '批准' }));
    fireEvent.keyDown(screen.getByRole('group'), { key: 'Escape' });
    expect(onResolve).toHaveBeenNthCalledWith(1, 'approve');
    expect(onResolve).toHaveBeenNthCalledWith(2, 'reject');
    expect(screen.getByRole('group').getAttribute('data-approval-state')).toBe('pending');
  });

  it('onDismiss 可选：不传不渲染跳过键；传入可点且回调可达', () => {
    const { rerender } = render(<ApprovalCard title="T" />);
    expect(screen.queryByText('跳过')).toBeNull();

    const onDismiss = vi.fn();
    rerender(<ApprovalCard title="T" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: '跳过' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('labels 文案覆写生效（中文缺省可整体替换）', () => {
    render(<ApprovalCard title="T" labels={{ approve: '通过', busyNote: 'AI 执行中' }} busy />);
    expect(screen.getByRole('button', { name: '通过' })).toBeTruthy();
    expect(screen.getByText('AI 执行中')).toBeTruthy();
  });
});
