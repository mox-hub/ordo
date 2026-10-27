/**
 * StepDetailPanel 失败叙事保留（§22.3）测试：失败条目展开态含错误信息 + 耗时 + 重试入口
 * （onRetry 可选传入，无回调不显示按钮），非失败条目不受影响。
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StepDetailPanel } from './step-detail-panel';
import type { RunEventEntry } from './run-details-format';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  // run-details-format 依赖 '@/i18n'，真实 i18n 初始化需要该插件桩
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

function renderPanel(entry: RunEventEntry, onRetry?: (entry: RunEventEntry) => void, labels?: Parameters<typeof StepDetailPanel>[0]['labels']) {
  return render(
    <StepDetailPanel
      entry={entry}
      offsetLabel="+00:10"
      onClose={() => {}}
      onRetry={onRetry}
      labels={labels}
    />,
  );
}

const failedEntry: RunEventEntry = {
  id: 's1',
  kind: 'error',
  title: 'Bash',
  text: 'Boom: exit code 1',
  at: '2026-09-04T01:00:10Z',
  durationMs: 2000,
  detail: { input: 'ls -la', output: 'exit code 1' },
};

describe('StepDetailPanel 失败叙事（§22.3）', () => {
  it('失败条目展开态：错误信息 + 耗时，无回调不显示重试按钮', () => {
    renderPanel(failedEntry);

    expect(screen.getByText('错误信息')).toBeTruthy();
    expect(screen.getByText('Boom: exit code 1')).toBeTruthy();
    expect(screen.getByText('耗时 2s')).toBeTruthy(); // §14.4 font-mono tabular-nums
    expect(screen.queryByRole('button', { name: '重试' })).toBeNull();
  });

  it('传入 onRetry 显示重试入口，点击回调携带条目；labels 可覆写文案', () => {
    const onRetry = vi.fn();
    renderPanel(failedEntry, onRetry, { retry: '重新执行' });

    const button = screen.getByRole('button', { name: '重新执行' });
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(failedEntry);
  });

  it('错误文本缺失时诚实占位，不造假内容', () => {
    renderPanel({ id: 's2', kind: 'error', title: 'Bash' });

    expect(screen.getByText('错误信息')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('非失败条目不渲染失败叙事区', () => {
    renderPanel({
      id: 's3',
      kind: 'tool',
      title: 'Bash',
      text: 'ls -la',
      durationMs: 500,
    });

    expect(screen.queryByTestId('step-detail-error-section')).toBeNull();
  });

  it('失败条目的输入/产出区不受影响（回归）', () => {
    renderPanel(failedEntry);

    expect(screen.getByText('runDetails.stepInput')).toBeTruthy();
    expect(screen.getByText('runDetails.stepOutput')).toBeTruthy();
    expect(screen.getByText('ls -la')).toBeTruthy();
  });
});
