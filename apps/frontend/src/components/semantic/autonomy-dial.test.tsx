import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AutonomyDial, type AutonomyLevel } from './autonomy-dial';

/**
 * AutonomyDial 组件测试（§18 组件测试基线：含键盘交互 / 焦点管理 / role 语义，必测件）。
 *
 * 断言重心：
 * ① radiogroup/radio 语义与 aria-checked 唯一性（§8.5——选中不能只靠滑块颜色）；
 * ② 键盘切档（方向键 / Home / End）+ 焦点随选择移动（APG radiogroup，本件手动实现）；
 * ③ locked 锁形标识只挂锁定档（§8.5#4 图标 + 文案双通道）；
 * ④ 样例滑轨只展示不可点（无 button 语义）且档位名有 sr-only 兜底；
 * ⑤ 受控契约：点击后 aria-checked 跟随外部 value，不内部改态。
 *
 * 未测（§18.2「不测样式」）：滑块位移 / tone 配色等视觉类名不在此断言。
 */

const SAMPLES = [
  { label: '改了 README', level: 'auto' as const },
  { label: '建了分支 feat/x', level: 'ask' as const },
  { label: '想删一条数据', level: 'locked' as const },
];

function setup(value: AutonomyLevel = 'ask', onChange = vi.fn(), extra = {}) {
  const utils = render(
    <AutonomyDial value={value} onValueChange={onChange} {...extra} />,
  );
  return { onChange, ...utils };
}

const option = (level: AutonomyLevel) =>
  screen.getByRole('radio', { name: new RegExp(optionName(level)) });

/** 档位可访问名 = 档名 + 说明（segment 内两行文本同处一个 radio） */
function optionName(level: AutonomyLevel): string {
  switch (level) {
    case 'locked':
      return '锁定必问';
    case 'ask':
      return '先问我';
    case 'auto':
      return '自己跑';
  }
}

/** 带状态受控壳：键盘钳位测试需要 value 真正跟随回调（纯 spy 下受控值不动） */
function Harness({ initial }: { initial: AutonomyLevel }) {
  const [value, setValue] = useState(initial);
  return <AutonomyDial value={value} onValueChange={setValue} />;
}

describe('AutonomyDial（三档拨盘）', () => {
  describe('渲染与语义', () => {
    it('渲染 radiogroup + 三档 radio，档名与人话说明齐备', () => {
      setup('auto');
      expect(screen.getByRole('radiogroup', { name: '自治边界' })).toBeInTheDocument();
      for (const level of ['locked', 'ask', 'auto'] as const) {
        expect(option(level)).toBeInTheDocument();
      }
      expect(screen.getByText('一切动作先问，不可自助')).toBeInTheDocument();
      expect(screen.getByText('每步先给你确认')).toBeInTheDocument();
      expect(screen.getByText('按它的信任等级直接执行')).toBeInTheDocument();
    });

    it('aria-checked 只对当前档为 true（唯一选中）', () => {
      setup('ask');
      expect(option('ask')).toHaveAttribute('aria-checked', 'true');
      expect(option('locked')).toHaveAttribute('aria-checked', 'false');
      expect(option('auto')).toHaveAttribute('aria-checked', 'false');
    });

    it('locked 档带锁形标识，其余档没有（§6.1 lucide Lock）', () => {
      setup('locked');
      expect(
        option('locked').querySelectorAll('[data-slot="autonomy-dial-lock"]'),
      ).toHaveLength(1);
      expect(option('ask').querySelectorAll('[data-slot="autonomy-dial-lock"]')).toHaveLength(0);
      expect(option('auto').querySelectorAll('[data-slot="autonomy-dial-lock"]')).toHaveLength(0);
    });

    it('roving tabindex：选中档可 Tab 聚焦（0），其余档移出 Tab 序（-1）', () => {
      setup('auto');
      expect(option('auto')).toHaveAttribute('tabindex', '0');
      expect(option('locked')).toHaveAttribute('tabindex', '-1');
      expect(option('ask')).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('点击切档（受控）', () => {
    it('点击某档回传该档值，且选中态跟随外部 value 不内部改态', () => {
      const onChange = vi.fn();
      setup('ask', onChange);
      fireEvent.click(option('auto'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('auto');
      // 受控件：外部仍传 ask，选中态不变（不内部 useState）
      expect(option('ask')).toHaveAttribute('aria-checked', 'true');
      expect(option('auto')).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('键盘切档（APG radiogroup）', () => {
    it('ArrowRight / ArrowDown 向宽档移动，焦点随选择移动', () => {
      const onChange = vi.fn();
      const { container } = setup('ask', onChange);
      fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledWith('auto');
      expect(document.activeElement).toBe(option('auto'));
    });

    it('ArrowLeft / ArrowUp 向严档移动', () => {
      const onChange = vi.fn();
      const { container } = setup('ask', onChange);
      fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: 'ArrowLeft' });
      expect(onChange).toHaveBeenCalledWith('locked');
      expect(document.activeElement).toBe(option('locked'));
    });

    it('Home 跳最严档、End 跳最宽档；到边界不再越界', () => {
      render(<Harness initial="locked" />);
      const group = screen.getByRole('radiogroup');
      fireEvent.keyDown(group, { key: 'End' });
      expect(option('auto')).toHaveAttribute('aria-checked', 'true');
      fireEvent.keyDown(group, { key: 'ArrowRight' });
      expect(option('auto')).toHaveAttribute('aria-checked', 'true'); // 已在最宽档，钳位不越界
      fireEvent.keyDown(group, { key: 'Home' });
      expect(option('locked')).toHaveAttribute('aria-checked', 'true');
    });

    it('非方向键不触发切档', () => {
      const onChange = vi.fn();
      const { container } = setup('ask', onChange);
      fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: 'Enter' });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('样例滑轨', () => {
    it('samples 存在时展示动作名 + sr-only 档位名，纯展示不可点', () => {
      setup('ask', vi.fn(), { samples: SAMPLES });
      expect(screen.getByText('近期动作')).toBeInTheDocument();
      expect(screen.getByText('改了 README')).toBeInTheDocument();
      // 档位名 sr-only 兜底（§8.5#4 不只靠色点颜色）
      expect(screen.getByText('（自己跑）')).toBeInTheDocument();
      expect(screen.getByText('（先问我）')).toBeInTheDocument();
      expect(screen.getByText('（锁定必问）')).toBeInTheDocument();
      // 样例行内无任何 button（仅展示不可点）
      const strip = screen.getByText('改了 README').closest('[data-slot="autonomy-dial-samples"]');
      expect(strip?.querySelectorAll('button')).toHaveLength(0);
    });

    it('samples 缺席时不渲染样例滑轨', () => {
      setup('ask');
      expect(screen.queryByText('近期动作')).not.toBeInTheDocument();
    });
  });

  describe('锁定档说明', () => {
    it('value=locked 且传 lockedLabel 时显示说明', () => {
      setup('locked', vi.fn(), { lockedLabel: '因红线违规被管理员锁定' });
      expect(screen.getByText('因红线违规被管理员锁定')).toBeInTheDocument();
    });

    it('value 非 locked 时不显示（哪怕传了）', () => {
      setup('auto', vi.fn(), { lockedLabel: '因红线违规被管理员锁定' });
      expect(screen.queryByText('因红线违规被管理员锁定')).not.toBeInTheDocument();
    });
  });

  describe('disabled', () => {
    it('各档 aria-disabled、移出 Tab 序，点击与键盘均不回调', () => {
      const onChange = vi.fn();
      const { container } = setup('ask', onChange, { disabled: true });
      for (const level of ['locked', 'ask', 'auto'] as const) {
        expect(option(level)).toHaveAttribute('aria-disabled', 'true');
        expect(option(level)).toHaveAttribute('tabindex', '-1');
      }
      fireEvent.click(option('auto'));
      fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: 'ArrowRight' });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('文案覆写与透传（§10.7 / §16）', () => {
    it('labels 覆写档名 / 说明 / 组名 / 样例标题', () => {
      render(
        <AutonomyDial
          value="auto"
          onValueChange={vi.fn()}
          samples={[{ label: '跑了一次构建', level: 'auto' }]}
          labels={{
            group: '执行边界',
            samples: '最近在干嘛',
            auto: { label: '全自动', desc: '不用管它' },
          }}
        />,
      );
      expect(screen.getByRole('radiogroup', { name: '执行边界' })).toBeInTheDocument();
      expect(screen.getByText('全自动')).toBeInTheDocument();
      expect(screen.getByText('不用管它')).toBeInTheDocument();
      expect(screen.getByText('最近在干嘛')).toBeInTheDocument();
    });

    it('...props 透传根元素（data-* 可达）', () => {
      render(
        <AutonomyDial value="ask" onValueChange={vi.fn()} data-testid="dial-under-test" />,
      );
      expect(screen.getByTestId('dial-under-test')).toHaveAttribute('data-slot', 'autonomy-dial');
    });
  });
});
