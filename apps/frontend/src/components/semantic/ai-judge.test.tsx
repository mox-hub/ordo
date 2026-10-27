import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import {
  AiVerdictPill,
  confidenceToSignal,
  normalizeConfidenceSignal,
  type ConfidenceSignal,
} from './ai-verdict-pill';
import { ConfidenceBar } from './confidence-bar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('置信信号归一（账本 A4 · 防御性归一）', () => {
  it('非法输入五例收敛合法档：NaN→0 / 负数→0 / 超大→3 / 字符串数字→2 / 小数→3', () => {
    expect(normalizeConfidenceSignal(Number.NaN)).toBe(0);
    expect(normalizeConfidenceSignal(-1)).toBe(0);
    expect(normalizeConfidenceSignal(7)).toBe(3);
    expect(normalizeConfidenceSignal('2')).toBe(2);
    expect(normalizeConfidenceSignal(2.6)).toBe(3);
  });

  it('数值→档位折算口径（0-1：≥0.85 强 / ≥0.60 良 / ≥0.30 弱 / 其余无；边界含）', () => {
    expect(confidenceToSignal(0.85)).toBe(3);
    expect(confidenceToSignal(0.84)).toBe(2);
    expect(confidenceToSignal(0.6)).toBe(2);
    expect(confidenceToSignal(0.59)).toBe(1);
    expect(confidenceToSignal(0.3)).toBe(1);
    expect(confidenceToSignal(0.29)).toBe(0);
    // 非法值防御：NaN/负数→无信号；>1 折算落强档
    expect(confidenceToSignal(Number.NaN)).toBe(0);
    expect(confidenceToSignal(-0.2)).toBe(0);
    expect(confidenceToSignal(7)).toBe(3);
    // 缺席语义：null/undefined = 无置信度（区别于有值的无信号）
    expect(confidenceToSignal(null)).toBeNull();
    expect(confidenceToSignal(undefined)).toBeNull();
  });
});

describe('AiVerdictPill（JEV 判断徽注）', () => {
  it('轨 A 数值兼容：渲染判定文案 + 置信度百分比，0.92 折算强档（绿系）', () => {
    const { container } = render(
      <AiVerdictPill label="建议批准" confidence={0.92} />,
    );
    expect(screen.getByText('建议批准')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute(
      'data-ai-component',
      'ai-verdict-pill',
    );
    expect(container.firstElementChild).toHaveAttribute('data-confidence', '0.92');
    expect(container.firstElementChild).toHaveAttribute('data-confidence-signal', '3');
    expect(container.firstElementChild).toHaveClass('text-accent-green');
    expect(container.firstElementChild).not.toHaveTextContent('aiJudge.lowConfidence');
  });

  it('轨 A 折算档位视觉：0.7 良（蓝）/ 0.55 弱（黄 + 低置信）/ 0.2 无信号（中性灰）', () => {
    const { container: fair } = render(<AiVerdictPill label="可" confidence={0.7} />);
    expect(fair.firstElementChild).toHaveClass('text-accent-blue');
    const { container: weak } = render(<AiVerdictPill label="benign" confidence={0.55} />);
    expect(weak.firstElementChild).toHaveClass('text-accent-yellow');
    expect(screen.getByText('aiJudge.lowConfidence')).toBeInTheDocument();
    const { container: none } = render(<AiVerdictPill label="弱" confidence={0.2} />);
    expect(none.firstElementChild).toHaveClass('text-content-text-muted');
  });

  it('轨 B 档位直传：渲染信号图标（不渲染百分比），signal 优先于 confidence', () => {
    const { container } = render(
      <AiVerdictPill label="benign" signal={2} confidence={0.1} />,
    );
    expect(container.firstElementChild).toHaveAttribute('data-confidence-signal', '2');
    expect(container.firstElementChild).toHaveClass('text-accent-blue');
    expect(container.querySelector('.lucide-signal-medium')).toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('轨 B 防御性归一：越界/字符串数字收敛合法档渲染', () => {
    const { container: big } = render(
      <AiVerdictPill label="x" signal={7 as ConfidenceSignal} />,
    );
    expect(big.firstElementChild).toHaveAttribute('data-confidence-signal', '3');
    const { container: str } = render(
      <AiVerdictPill label="x" signal={'1' as unknown as ConfidenceSignal} />,
    );
    expect(str.firstElementChild).toHaveAttribute('data-confidence-signal', '1');
  });

  it('无置信度时保持缺席语义：不渲染百分比与低置信标注，仅判定文案', () => {
    render(<AiVerdictPill label="高风险" />);
    expect(screen.getByText('高风险')).toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    expect(screen.queryByText('aiJudge.lowConfidence')).not.toBeInTheDocument();
  });

  it('NaN 置信度防御性归一：无信号档呈现，绝不产出「NaN%」垃圾输出', () => {
    const { container } = render(
      <AiVerdictPill label="x" confidence={Number.NaN} />,
    );
    expect(container.firstElementChild).toHaveAttribute('data-confidence-signal', '0');
    expect(container.firstElementChild).not.toHaveAttribute('data-confidence');
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('advisory 声明恒挂（title），size=xs 走 2xs 字阶（行内紧凑位）', () => {
    const { container } = render(
      <AiVerdictPill label="benign" confidence={0.9} size="xs" />,
    );
    expect(container.firstElementChild).toHaveAttribute(
      'title',
      'aiJudge.advisoryTooltip',
    );
    expect(container.firstElementChild).toHaveClass('text-2xs');
  });
});

describe('ConfidenceBar（JEV 概率条）', () => {
  it('轨 A 数值兼容：标签 + 概率条 + 百分比，0.87 折算强档（绿系）', () => {
    const { container } = render(
      <ConfidenceBar value={0.87} label="AI 预估达成" />,
    );
    expect(screen.getByText('AI 预估达成')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByText('87%')).toHaveClass('text-accent-green');
    expect(container.firstElementChild).toHaveAttribute(
      'data-ai-component',
      'confidence-bar',
    );
    expect(container.firstElementChild).toHaveAttribute('data-confidence-signal', '3');
    // 条内填充宽度 = 概率（手搓 div 几何自持）
    const fill = container.querySelector('[style*="width"]');
    expect(fill).toHaveStyle({ width: '87%' });
  });

  it('轨 A 良档（0.6-0.85）转蓝', () => {
    const { container } = render(<ConfidenceBar value={0.72} />);
    expect(container.firstElementChild).toHaveAttribute('data-confidence-signal', '2');
    expect(screen.getByText('72%')).toHaveClass('text-accent-blue');
  });

  it('轨 A 弱档转黄：0.42 填充与百分比同为黄', () => {
    const { container } = render(<ConfidenceBar value={0.42} />);
    expect(container.firstElementChild).toHaveClass('select-none');
    expect(container.querySelector('[style*="width"]')).toHaveStyle({
      width: '42%',
    });
    expect(screen.getByText('42%')).toHaveClass('text-accent-yellow');
  });

  it('hidePercent 隐藏右侧数字（行内紧凑位）', () => {
    render(<ConfidenceBar value={0.96} hidePercent />);
    expect(screen.queryByText('96%')).not.toBeInTheDocument();
  });

  it('轨 A 越界有限值截断到 [0,1]（数值消费方渲染不变形）', () => {
    const { container } = render(<ConfidenceBar value={1.5} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(container.querySelector('[style*="width"]')).toHaveStyle({
      width: '100%',
    });
  });

  it('轨 A 非法值（NaN/Infinity）防御性归一为无信号档：四格信号计空档呈现，不再整件消失', () => {
    const { container: nanBox } = render(
      <ConfidenceBar value={Number.NaN} label="AI 预估" />,
    );
    expect(nanBox.firstElementChild).not.toBeNull();
    expect(nanBox.firstElementChild).toHaveAttribute('data-confidence-signal', '0');
    expect(nanBox.firstElementChild).not.toHaveAttribute('data-confidence');
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    // 四格全空（bg-muted），无档位色填充
    const meter = nanBox.firstElementChild?.querySelector('[aria-hidden]');
    expect(meter?.children).toHaveLength(4);
    expect(meter?.children[0]).toHaveClass('bg-muted');
    const { container: infBox } = render(
      <ConfidenceBar value={Number.POSITIVE_INFINITY} />,
    );
    expect(infBox.firstElementChild).toHaveAttribute('data-confidence-signal', '0');
  });

  it('轨 B 档位直传：四格信号计格数 = 档位（§8.5 第 4 条非色觉传达），无百分比', () => {
    const { container } = render(<ConfidenceBar signal={3} label="就绪度" />);
    expect(container.firstElementChild).toHaveAttribute('data-confidence-signal', '3');
    const meter = container.querySelector('[aria-hidden]');
    expect(meter?.children).toHaveLength(4);
    const cells = Array.from(meter?.children ?? []).map((el) => el.className);
    expect(cells[0]).toContain('bg-accent-green');
    expect(cells[1]).toContain('bg-accent-green');
    expect(cells[2]).toContain('bg-accent-green');
    expect(cells[3]).toContain('bg-muted');
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('轨 B 越界归一：signal=7 收敛强档', () => {
    const { container } = render(
      <ConfidenceBar signal={7 as ConfidenceSignal} />,
    );
    expect(container.firstElementChild).toHaveAttribute('data-confidence-signal', '3');
  });

  it('value 与 signal 均缺席时不渲染（调用方错误用法不产生噪音）', () => {
    const { container } = render(<ConfidenceBar label="x" />);
    expect(container.firstElementChild).toBeNull();
  });

  it('缺省标签走 i18n 键（调用方可覆写具体文案）', () => {
    render(<ConfidenceBar value={0.8} />);
    expect(screen.getByText('aiJudge.estimatedProbability')).toBeInTheDocument();
  });
});
