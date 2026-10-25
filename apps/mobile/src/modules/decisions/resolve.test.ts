import { describe, expect, it } from 'vitest';
import type { components } from '@ordo/api-types';
import {
  isDecisionActionable,
  planDecisionResolve,
  type DecisionItem,
} from './resolve';

type DecisionDto = components['schemas']['DecisionDto'];

function makeDecision(overrides: Partial<DecisionDto> = {}): DecisionItem {
  const base = {
    id: 'd1',
    kind: 'proposal',
    sourceId: 'src1',
    status: 'pending',
    title: '决策标题',
    urgency: 'blocking',
    actionType: 'none',
    contentFingerprint: 'fp-1',
    createdAt: '2026-10-17T00:00:00.000Z',
  } as unknown as DecisionDto;
  return { ...base, ...overrides };
}

describe('planDecisionResolve', () => {
  it('approval 走审批通道且动作映射为 status', () => {
    const decision = makeDecision({ kind: 'approval', sourceId: 'ap-9' });
    const approve = planDecisionResolve(decision, 'approve', 'ok');
    expect(approve.path).toBe('/execution/approvals/ap-9/resolve');
    expect(approve.body).toEqual({ status: 'approved', comment: 'ok' });

    const reject = planDecisionResolve(decision, 'reject', '不行');
    expect(reject.body).toEqual({ status: 'rejected', comment: '不行' });
  });

  it('非 approval 走提案统一通道且携带指纹', () => {
    const decision = makeDecision({ kind: 'contract_conflict', contentFingerprint: 'fp-cc' });
    const plan = planDecisionResolve(decision, 'reject', '理由');
    expect(plan.path).toBe('/decisions/proposals/d1/resolve');
    expect(plan.body).toEqual({
      action: 'reject',
      expectedFingerprint: 'fp-cc',
      reason: '理由',
    });
  });

  it('无指纹的提案不携带 expectedFingerprint 字段', () => {
    const decision = makeDecision({ contentFingerprint: undefined });
    const plan = planDecisionResolve(decision, 'approve', '');
    expect(plan.body).not.toHaveProperty('expectedFingerprint');
    expect(plan.body).not.toHaveProperty('reason');
  });
});

describe('isDecisionActionable', () => {
  it('approval 无指纹也可拍板（审批通道无指纹字段）', () => {
    expect(isDecisionActionable(makeDecision({ kind: 'approval', contentFingerprint: undefined }))).toBe(true);
  });

  it('提案缺指纹不可拍板（红线 D7：指纹闸门）', () => {
    expect(isDecisionActionable(makeDecision({ contentFingerprint: undefined }))).toBe(false);
  });

  it('adjust/alternative 动作只读', () => {
    expect(isDecisionActionable(makeDecision({ actionType: 'adjust' }))).toBe(false);
    expect(isDecisionActionable(makeDecision({ actionType: 'alternative' }))).toBe(false);
  });

  it('acceptance 类归 M-05，不在决策拍板页处理', () => {
    expect(isDecisionActionable(makeDecision({ kind: 'acceptance' }))).toBe(false);
  });
});
