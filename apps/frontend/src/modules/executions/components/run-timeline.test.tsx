/**
 * RunTimeline 活性可感知（§22.5）测试：运行中步骤 live 计时（useStopwatch 100ms tick /
 * startedAt 注入 / 终态定格）、呼吸脉冲状态点、状态迁移 aria-live 播报、渐进精度时长格式。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { RunTimeline, formatLiveDurationMs } from './run-timeline';
import type { ExecutionStepRecord } from '../api/execution-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  // run-details-format 依赖 '@/i18n'，真实 i18n 初始化需要该插件桩
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const NOW = new Date('2026-10-27T00:00:00Z').getTime();
const WINDOW_START = new Date(NOW - 60_000).toISOString();
const WINDOW_END = new Date(NOW + 60_000).toISOString();

function makeStep(overrides: Partial<ExecutionStepRecord> = {}): ExecutionStepRecord {
  return {
    id: 's1',
    executionRunId: 'run-1',
    stepType: 'tool_call',
    sequence: 1,
    name: 'Bash',
    status: 'completed',
    startedAt: new Date(NOW - 30_000).toISOString(),
    completedAt: new Date(NOW - 28_000).toISOString(),
    duration: 2000,
    ...overrides,
  };
}

function renderTimeline(steps: ExecutionStepRecord[], announceTemplates?: Parameters<typeof RunTimeline>[0]['announceTemplates']) {
  return render(
    <RunTimeline
      steps={steps}
      windowStart={WINDOW_START}
      windowEnd={WINDOW_END}
      announceTemplates={announceTemplates}
    />,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('formatLiveDurationMs（渐进精度：<1s 毫秒 → <60s 0.1s → 分/时/天；G3 收编 @/lib/format）', () => {
  it.each([
    [850, '850ms'],
    [12300, '12.3s'],
    [63000, '1m 03s'],
    [3_600_000, '1h 00m'],
    [3_661_000, '1h 01m'],
    [187_200_000, '2d 4h'],
  ])('%ms → %s', (ms, expected) => {
    expect(formatLiveDurationMs(ms)).toBe(expected);
  });

  it('负值钳 0（live 计时竞态脏差值显 0ms）', () => {
    expect(formatLiveDurationMs(-1)).toBe('0ms');
  });

  it.each([null, undefined, Number.NaN])('%s → 空串（模块无效输入约定）', (ms) => {
    expect(formatLiveDurationMs(ms as number)).toBe('');
  });
});

describe('RunTimeline 活性可感知（§22.5）', () => {
  it('running 步骤渲染 live 计时条：运行中标签 + 名称 + 计时 + 呼吸脉冲状态点', () => {
    vi.useFakeTimers({ now: NOW });
    const step = makeStep({
      status: 'running',
      startedAt: new Date(NOW - 1200).toISOString(),
      completedAt: null,
      duration: null,
    });
    renderTimeline([step]);

    // live 计时条：标签 + 步骤名 + 挂载时刻已流逝 1.2s
    expect(screen.getByTestId('run-timeline-live-strip')).toBeTruthy();
    expect(screen.getByText('运行中')).toBeTruthy();
    expect(screen.getByText('Bash')).toBeTruthy();
    expect(screen.getByText('1.2s')).toBeTruthy();
    // 呼吸脉冲状态点（motion-safe:animate-pulse；reduced-motion 下静止）
    const dot = document.querySelector('[class*="animate-pulse"]');
    expect(dot).toBeTruthy();
    expect(dot?.className).toContain('motion-safe:animate-pulse');
  });

  it('live 计时随时间推进（100ms tick）：1.2s → 1.5s', () => {
    vi.useFakeTimers({ now: NOW });
    const step = makeStep({
      status: 'running',
      startedAt: new Date(NOW - 1200).toISOString(),
      completedAt: null,
      duration: null,
    });
    renderTimeline([step]);
    expect(screen.getByText('1.2s')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText('1.5s')).toBeTruthy();
    expect(screen.queryByText('1.2s')).toBeNull();
  });

  it('终态步骤定格：无 live 条、无脉冲、静态展示服务端耗时', () => {
    vi.useFakeTimers({ now: NOW });
    renderTimeline([makeStep({ status: 'completed', duration: 2000 })]);

    expect(screen.queryByTestId('run-timeline-live-strip')).toBeNull();
    expect(document.querySelector('[class*="animate-pulse"]')).toBeNull();
  });

  it('播报节点存在：sr-only role=status + aria-live=polite；首见 running 播报开始', () => {
    vi.useFakeTimers({ now: NOW });
    const step = makeStep({ status: 'running', completedAt: null, duration: null });
    renderTimeline([step]);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('步骤 Bash 开始')).toBeTruthy();
  });

  it('running → completed 迁移播报完成与用时（服务端 duration 口径）', () => {
    vi.useFakeTimers({ now: NOW });
    const running = makeStep({ status: 'running', completedAt: null, duration: null });
    const { rerender } = renderTimeline([running]);

    const completed = makeStep({
      status: 'completed',
      completedAt: new Date(NOW).toISOString(),
      duration: 2000,
    });
    rerender(
      <RunTimeline
        steps={[completed]}
        windowStart={WINDOW_START}
        windowEnd={WINDOW_END}
      />,
    );
    expect(screen.getByText('步骤 Bash 完成，用时 2.0 秒')).toBeTruthy();
  });

  it('running → failed 迁移播报失败', () => {
    vi.useFakeTimers({ now: NOW });
    const running = makeStep({ status: 'running', completedAt: null, duration: null });
    const { rerender } = renderTimeline([running]);

    const failed = makeStep({ status: 'failed' });
    rerender(
      <RunTimeline
        steps={[failed]}
        windowStart={WINDOW_START}
        windowEnd={WINDOW_END}
      />,
    );
    expect(screen.getByText('步骤 Bash 失败')).toBeTruthy();
  });

  it('announceTemplates 覆写播报文案', () => {
    vi.useFakeTimers({ now: NOW });
    const step = makeStep({ status: 'running', completedAt: null, duration: null });
    renderTimeline([step], { started: '{name} 启动中' });

    expect(screen.getByText('Bash 启动中')).toBeTruthy();
  });
});
