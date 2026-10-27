/**
 * 审阅收场仪式行为级测试（设计宪法 §22.4）：
 * ① 决定后先约 1s 确认态（决定图标 + 文案），不无声消失；
 * ② 离场折叠为凭证行（决定 + 时间 + 撤销入口），Undo 恢复待决态并回调取消；
 * ③ 连批自动升起下一件，队列清空呈现完成态（本次批阅计数 + 完成语）；
 * ④ 待决数量变化经 aria-live="polite" 播报。
 * 全部用假时钟驱动节奏（1000ms 确认 + 380ms 滑出），断言锚定 data-* 埋点而非文案语言。
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import i18n from '@/i18n';
import { DecisionCard } from './decision-card';
import { DecisionDeckStack } from './decision-deck-stack';
import { DecisionReviewModal } from './decision-review-modal';
import type { Decision } from './types';

beforeAll(async () => {
  // 仪式文案断言锚定 zh-CN（与 decision-card-shell.test.tsx 同款）
  await i18n.changeLanguage('zh-CN');
});

const CONFIRM_MS = 1000;
const DISMISS_MS = 380;

function makeDecision(id: string, title: string): Decision {
  return {
    id,
    kind: 'approval',
    sourceId: id.split(':')[1],
    status: 'pending',
    title,
    urgency: 'advisory',
    proposer: { type: 'ai_agent', name: 'Bot' },
    payload: {},
    createdAt: new Date().toISOString(),
  };
}

const d1 = makeDecision('approval:app1', '批准发布候选版本');
const d2 = makeDecision('approval:app2', '批准扩容预算申请');
const d3 = makeDecision('approval:app3', '批准数据迁移计划');

/** 取动作栏第 n 个动作键（与快捷键序号一致，1 基） */
function actionButton(container: HTMLElement, nth: number): HTMLButtonElement {
  const bar = container.querySelector('[data-decision-actions]');
  expect(bar).toBeTruthy();
  const btn = bar!.querySelectorAll('button')[nth - 1] as HTMLButtonElement | undefined;
  expect(btn).toBeTruthy();
  return btn!;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DecisionCard 收场仪式（单卡：确认态 → 凭证行 → Undo）', () => {
  it('① 批准后立即进入「已通过」确认态（决定图标 + 文案覆盖层），上送即刻发生', () => {
    const onAction = vi.fn();
    const { container } = render(<DecisionCard decision={d1} onAction={onAction} />);

    fireEvent.click(actionButton(container, 1));

    // 上送不被仪式延迟（闭环即刻发起）；opts 缺省保持 2 参调用（既有契约）
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('accept', d1);
    // 确认态覆盖层：决定图标 + 文案（role="status" 供读屏器播报）
    const confirm = container.querySelector('[data-decision-confirm="passed"]');
    expect(confirm).toBeTruthy();
    expect(confirm!.getAttribute('role')).toBe('status');
    expect(confirm!.textContent).toContain('已通过');
    // 确认态期间动作栏锁定（busy 传导），不可重复决议
    expect(actionButton(container, 1).disabled).toBe(true);
  });

  it('② 确认态满约 1s 后原位折叠为凭证行（决定 + 时间），卡片本体不再渲染', async () => {
    const onAction = vi.fn();
    const { container } = render(<DecisionCard decision={d1} onAction={onAction} />);

    fireEvent.click(actionButton(container, 1));
    await act(async () => {
      vi.advanceTimersByTime(CONFIRM_MS);
    });

    // 凭证行留痕：决定 + 时间；确认态与卡面离场
    const receipt = container.querySelector('[data-decision-receipt]');
    expect(receipt).toBeTruthy();
    expect(receipt!.getAttribute('data-decision-id')).toBe(d1.id);
    expect(receipt!.getAttribute('data-decision-outcome')).toBe('passed');
    expect(receipt!.textContent).toContain('已通过');
    expect(receipt!.textContent).toContain(d1.title);
    expect(container.querySelector('[data-decision-confirm]')).toBeNull();
  });

  it('③ 凭证行 Undo：恢复待决态并回调取消（decision/action/outcome 原样回传）', async () => {
    const onAction = vi.fn();
    const onUndo = vi.fn();
    const { container } = render(
      <DecisionCard decision={d1} onAction={onAction} onUndo={onUndo} />,
    );

    fireEvent.click(actionButton(container, 1));
    await act(async () => {
      vi.advanceTimersByTime(CONFIRM_MS);
    });

    // Undo 点击 → 回调取消 + 卡片恢复待决态（动作栏回来、凭证行消失）
    const undoBtn = container.querySelector('[data-ai="decision-receipt-undo"]');
    expect(undoBtn).toBeTruthy();
    fireEvent.click(undoBtn as HTMLElement);

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onUndo.mock.calls[0][0]).toMatchObject({
      decision: d1,
      action: 'accept',
      outcome: 'passed',
    });
    expect(container.querySelector('[data-decision-receipt]')).toBeNull();
    expect(container.querySelector('[data-decision-actions]')).toBeTruthy();
    expect(screen.getByText(d1.title)).toBeTruthy();
  });

  it('④ 未传 onUndo / undoable 时凭证行不渲染撤销入口（可撤销与否由消费方决定）', async () => {
    const onAction = vi.fn();
    const { container } = render(<DecisionCard decision={d1} onAction={onAction} />);

    fireEvent.click(actionButton(container, 1));
    await act(async () => {
      vi.advanceTimersByTime(CONFIRM_MS);
    });

    expect(container.querySelector('[data-decision-receipt]')).toBeTruthy();
    expect(container.querySelector('[data-ai="decision-receipt-undo"]')).toBeNull();
  });

  it('⑤ 上送失败：确认态回滚为待决态，绝不折叠出未落账的凭证行', async () => {
    const onAction = vi.fn().mockRejectedValue(new Error('server 409'));
    const { container } = render(<DecisionCard decision={d1} onAction={onAction} />);

    fireEvent.click(actionButton(container, 1));
    expect(container.querySelector('[data-decision-confirm]')).toBeTruthy();

    // flush promise rejection（失败即回滚，不等确认时长）
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector('[data-decision-confirm]')).toBeNull();
    expect(container.querySelector('[data-decision-receipt]')).toBeNull();
    expect(screen.getByText(d1.title)).toBeTruthy();

    // 之后确认时长走完也不再收场
    await act(async () => {
      vi.advanceTimersByTime(CONFIRM_MS);
    });
    expect(container.querySelector('[data-decision-receipt]')).toBeNull();
  });

  it('⑥ 驳回走同一仪式：确认态 =「已驳回」，凭证 outcome = rejected', async () => {
    const onAction = vi.fn();
    const { container } = render(<DecisionCard decision={d1} onAction={onAction} />);

    // approval 第二键 = 驳回（needsReason 弹原因 chips，此处直验 chips 提交路径）
    fireEvent.click(actionButton(container, 2));
    const chip = container.querySelector('[data-decision-actions] button');
    expect(chip).toBeTruthy();
    fireEvent.click(chip as HTMLElement);

    const confirm = container.querySelector('[data-decision-confirm="rejected"]');
    expect(confirm).toBeTruthy();
    expect(confirm!.textContent).toContain('已驳回');
    expect(onAction).toHaveBeenCalledWith('reject', d1, expect.objectContaining({ reason: expect.any(String) }));

    await act(async () => {
      vi.advanceTimersByTime(CONFIRM_MS);
    });
    expect(container.querySelector('[data-decision-receipt]')).toBeTruthy();
    expect(
      container.querySelector('[data-decision-receipt]')!.getAttribute('data-decision-outcome'),
    ).toBe('rejected');
  });
});

describe('DecisionDeckStack 收场仪式（连批：确认 → 凭证 → 自动升起 → 完成态）', () => {
  function renderDeck(overrides?: {
    onUndo?: (r: { decision: Decision; action: string; outcome: string }) => void;
    onActionFail?: boolean;
  }) {
    const onAction = overrides?.onActionFail
      ? vi.fn().mockRejectedValue(new Error('conflict'))
      : vi.fn();
    const onUndo = overrides?.onUndo ?? vi.fn();
    const onProgress = vi.fn();
    const { container } = render(
      <DecisionDeckStack
        decisions={[d1, d2, d3]}
        onAction={onAction}
        onUndo={onUndo}
        onProgress={onProgress}
      />,
    );
    const pass = () => fireEvent.click(container.querySelector('[data-ai="deck-pass"]') as HTMLElement);
    return { container, onAction, onUndo, onProgress, pass };
  }

  /** 走完一次批阅节奏：1s 确认态 + 380ms 滑出 */
  async function runOneBeat() {
    await act(async () => {
      vi.advanceTimersByTime(CONFIRM_MS);
    });
    await act(async () => {
      vi.advanceTimersByTime(DISMISS_MS);
    });
  }

  it('① 点击批准先盖印确认态约 1s（决定不上送、不升起下一件）', () => {
    const { container, onAction, pass } = renderDeck();

    pass();
    expect(container.querySelector('.decision-stamp-passed')).toBeTruthy();
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByText(d1.title)).toBeTruthy();

    // 确认态期间进入滑出（380ms 内仍未上送）
    act(() => {
      vi.advanceTimersByTime(CONFIRM_MS);
    });
    expect(onAction).not.toHaveBeenCalled();
  });

  it('② 离场后上送 + 折叠凭证行 + 下一件自动升起进入焦点', async () => {
    const { container, onAction, pass } = renderDeck();

    pass();
    await runOneBeat();

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('accept', d1);
    // 下一件自动升起（不是空白）
    expect(screen.getByText(d2.title)).toBeTruthy();
    // 凭证行留痕：决定 + 时间，最新在前
    const receipts = container.querySelectorAll('[data-decision-receipt]');
    expect(receipts.length).toBe(1);
    expect(receipts[0].getAttribute('data-decision-id')).toBe(d1.id);
  });

  it('③ 连批三件后队列清空呈现完成态：完成语 + 本次批阅计数，不给空白', async () => {
    const { container, onAction, onProgress, pass } = renderDeck();

    pass();
    await runOneBeat();
    pass();
    await runOneBeat();
    pass();
    await runOneBeat();

    expect(onAction).toHaveBeenCalledTimes(3);
    // 完成态：计数归零 + 完成语 + 本次批阅计数
    const done = container.querySelector('[data-decision-deck-done]');
    expect(done).toBeTruthy();
    expect(done!.getAttribute('role')).toBe('status');
    expect(done!.textContent).toContain('本次批阅 3 项');
    expect(done!.textContent).toContain('全部批阅完成');
    // 进度播报：剩余 0
    expect(onProgress).toHaveBeenLastCalledWith({ pending: 0, resolvedCount: 3, total: 3 });
  });

  it('④ 凭证行 Undo：恢复该卡为待决态且回到焦点，onUndo 回调取消', async () => {
    const onUndo = vi.fn();
    const { container, onAction, pass } = renderDeck({ onUndo });

    pass();
    await runOneBeat();
    expect(screen.getByText(d2.title)).toBeTruthy();

    // 撤销刚才对 d1 的决定
    fireEvent.click(container.querySelector('[data-ai="decision-receipt-undo"]') as HTMLElement);

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onUndo.mock.calls[0][0]).toMatchObject({ decision: d1, action: 'accept', outcome: 'passed' });
    // d1 恢复待决并回到焦点顶层；凭证行消失
    expect(screen.getByText(d1.title)).toBeTruthy();
    expect(container.querySelector('[data-decision-receipt]')).toBeNull();
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('⑤ 待决数量变化经 aria-live polite 播报', async () => {
    const { container, pass } = renderDeck();

    const live = container.querySelector('[data-decision-live-count]');
    expect(live).toBeTruthy();
    expect(live!.getAttribute('aria-live')).toBe('polite');
    expect(live!.textContent).toContain('3 项待处理');

    pass();
    await runOneBeat();
    expect(live!.textContent).toContain('2 项待处理');
  });

  it('⑥ onAction 上送失败：卡片回到待决态，不记凭证、不升下一件', async () => {
    const { container, pass } = renderDeck({ onActionFail: true });

    pass();
    await runOneBeat();
    // flush promise rejection
    await act(async () => {
      await Promise.resolve();
    });

    // 失败：印章/滑出复位，d1 仍待决，无凭证行
    expect(container.querySelector('.decision-stamp-passed')).toBeNull();
    expect(screen.getByText(d1.title)).toBeTruthy();
    expect(container.querySelector('[data-decision-receipt]')).toBeNull();
  });
});

describe('DecisionReviewModal 收场仪式（播报与透传）', () => {
  it('队列清空时经 aria-live 播报完成语 + 本次批阅计数', async () => {
    const onAction = vi.fn();
    render(
      <DecisionReviewModal
        open
        onClose={vi.fn()}
        decisions={[d1, d2]}
        onAction={onAction}
        onUndo={vi.fn()}
      />,
    );

    // modal Portal 到 body：作用域用 document.body
    const live = document.body.querySelectorAll('[data-decision-live-count]');
    expect(live.length).toBeGreaterThanOrEqual(1);

    // 批阅两件
    for (let i = 0; i < 2; i += 1) {
      fireEvent.click(document.body.querySelector('[data-ai="deck-pass"]') as HTMLElement);
      await act(async () => {
        vi.advanceTimersByTime(CONFIRM_MS);
      });
      await act(async () => {
        vi.advanceTimersByTime(DISMISS_MS);
      });
    }

    // 完成语播报（modal 级 live 区域 + 卡堆完成态）
    expect(document.body.textContent).toContain('全部处理完');
    expect(document.body.textContent).toContain('本次批阅 2 项');
  });

  it('onUndo / undoable / confirmDurationMs 透传卡片堆（凭证行出现 Undo 入口）', async () => {
    const onAction = vi.fn();
    const onUndo = vi.fn();
    render(
      <DecisionReviewModal
        open
        onClose={vi.fn()}
        decisions={[d1]}
        onAction={onAction}
        onUndo={onUndo}
      />,
    );

    fireEvent.click(document.body.querySelector('[data-ai="deck-pass"]') as HTMLElement);
    await act(async () => {
      vi.advanceTimersByTime(CONFIRM_MS);
    });
    await act(async () => {
      vi.advanceTimersByTime(DISMISS_MS);
    });

    const undoBtn = document.body.querySelector('[data-ai="decision-receipt-undo"]');
    expect(undoBtn).toBeTruthy();
    fireEvent.click(undoBtn as HTMLElement);
    expect(onUndo).toHaveBeenCalledTimes(1);
    // Undo 后 d1 回到焦点（完成态退场）
    expect(screen.getByText(d1.title)).toBeTruthy();
  });
});
