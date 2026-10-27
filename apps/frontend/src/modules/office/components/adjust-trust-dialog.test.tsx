import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdjustTrustDialog } from './adjust-trust-dialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

const mocks = vi.hoisted(() => ({
  patch: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/infrastructure/api-client', () => ({
  api: { patch: mocks.patch },
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: mocks.success, error: mocks.error },
}));

function setup(currentLevel: number | null = 2) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
  const onOpenChange = vi.fn();
  const utils = render(
    <QueryClientProvider client={qc}>
      <AdjustTrustDialog
        memberId="ai-1"
        memberName="小码"
        currentLevel={currentLevel}
        open
        onOpenChange={onOpenChange}
      />
    </QueryClientProvider>,
  );
  return { invalidateSpy, onOpenChange, ...utils };
}

/** 拨盘档位：role=radio，可访问名 = 自治档名 + 人话说明 */
function dialOption(level: 'locked' | 'ask' | 'auto') {
  const name = level === 'locked' ? '锁定必问' : level === 'ask' ? '先问我' : '自己跑';
  return screen.getByRole('radio', { name: new RegExp(name) });
}

describe('AdjustTrustDialog', () => {
  beforeEach(() => {
    mocks.patch.mockReset();
    mocks.success.mockClear();
    mocks.error.mockClear();
  });

  it('渲染拨盘、三级对照卡与红线说明，当前等级回显选中档', () => {
    setup(2);
    expect(screen.getByText('trust.adjustTitle:{"name":"小码"}')).toBeTruthy();
    // 拨盘三档齐备（自治语义词表）
    expect(dialOption('locked')).toBeTruthy();
    expect(dialOption('ask')).toBeTruthy();
    expect(dialOption('auto')).toBeTruthy();
    // 当前等级=协助者(2) → 先问我选中
    expect(dialOption('ask')).toHaveAttribute('aria-checked', 'true');
    // 三级对照卡（纯展示 div，官方词表）与红线说明
    expect(screen.getByText('trust.tier1.name')).toBeTruthy();
    expect(screen.getByText('trust.tier2.name')).toBeTruthy();
    expect(screen.getByText('trust.tier3.name')).toBeTruthy();
    expect(screen.getByText('trust.redlineNote')).toBeTruthy();
    // 对照卡不再是可点选择器（选择收敛到拨盘单入口）
    expect(screen.queryByRole('button', { name: /trust.tier/ })).toBeNull();
  });

  it('未评估（null）打开：兜底显最严档 + 未设定说明，保存禁用直至显式选择', () => {
    setup(null);
    expect(dialOption('locked')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('trust.unratedDesc')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'common.save' })).toHaveAttribute('disabled');
    fireEvent.click(dialOption('auto'));
    expect(screen.getByRole('button', { name: 'common.save' })).not.toHaveAttribute('disabled');
  });

  it('拨盘切档保存发 PATCH 并失效 office/members 查询', async () => {
    mocks.patch.mockResolvedValueOnce({});
    const { invalidateSpy, onOpenChange } = setup(2);
    fireEvent.click(dialOption('auto'));
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => {
      expect(mocks.patch).toHaveBeenCalledWith('/members/ai-1', { trustLevel: 3 });
    });
    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(['office']);
    expect(keys).toContainEqual(['members']);
    expect(mocks.success).toHaveBeenCalledWith('trust.adjustSaved');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('切到最严档保存写观察者（1），失败 toast 报错且不关闭对话框', async () => {
    mocks.patch.mockRejectedValueOnce(new Error('boom'));
    const { onOpenChange } = setup(3);
    fireEvent.click(dialOption('locked'));
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => {
      expect(mocks.patch).toHaveBeenCalledWith('/members/ai-1', { trustLevel: 1 });
      expect(mocks.error).toHaveBeenCalledWith('trust.adjustFailed');
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
