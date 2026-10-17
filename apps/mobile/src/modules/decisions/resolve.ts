import type { components } from '@ordo/api-types';

type Schemas = components['schemas'];

export type DecisionItem = Schemas['DecisionDto'];

export interface DecisionsPendingResponse {
  items: DecisionItem[];
  total: number;
  blocking: number;
  advisory: number;
}

/** 蓝图 §2.2（M-03 边界）：adjust/alternative 无移动端写路径 */
export const READ_ONLY_ACTION_TYPES = ['adjust', 'alternative'] as const;

/** 蓝图 §2.2：一期拍板三类 = approval / proposal / contract_conflict；acceptance 归 M-05 */
export const READ_ONLY_KINDS = [
  'acceptance',
] as const;

export type DecisionAction = 'approve' | 'reject';

/** POST /_api/execution/approvals/{id}/resolve（ResolveApprovalDto） */
export interface ApprovalResolveBody {
  status: 'approved' | 'rejected';
  comment?: string;
}

/**
 * POST /_api/decisions/proposals/{id}/resolve（ResolveProposalDto）。
 * expectedFingerprint 携带决策卡下发的 contentFingerprint——不匹配即 409，
 * 需刷新后重新决议（CAP-C-04 指纹闸门，红线 D7）。
 */
export interface ProposalResolveBody {
  action: 'accept' | 'reject' | 'cancel';
  expectedFingerprint?: string;
  reason?: string;
  answer?: string;
  conflictAction?: string;
}

export interface DecisionResolvePlan {
  path: string;
  body: ApprovalResolveBody | ProposalResolveBody;
}

/** 该决策卡在移动端是否可拍板（只读类型提示回桌面） */
export function isDecisionActionable(decision: DecisionItem): boolean {
  if (READ_ONLY_KINDS.includes(decision.kind as (typeof READ_ONLY_KINDS)[number])) return false;
  if (READ_ONLY_ACTION_TYPES.includes(decision.actionType as (typeof READ_ONLY_ACTION_TYPES)[number])) {
    return false;
  }
  // 审批通道无指纹字段（契约如此）；提案通道必须携带指纹
  if (decision.kind === 'approval') return true;
  return Boolean(decision.contentFingerprint);
}

/**
 * 拍板路由映射（纯函数，单测覆盖）：
 * - kind=approval → 审批通道 {status: approved|rejected, comment}
 * - 其余 kind → 提案统一通道 {action: accept|reject, expectedFingerprint, reason}
 * 空值字段不进请求体（缺指纹的提案在 isDecisionActionable 已被拦下）。
 */
export function planDecisionResolve(
  decision: DecisionItem,
  action: DecisionAction,
  reason: string,
): DecisionResolvePlan {
  if (decision.kind === 'approval') {
    const body: ApprovalResolveBody = {
      status: action === 'approve' ? 'approved' : 'rejected',
    };
    if (reason) body.comment = reason;
    return { path: `/execution/approvals/${decision.sourceId}/resolve`, body };
  }
  const body: ProposalResolveBody = {
    action: action === 'approve' ? 'accept' : 'reject',
  };
  if (decision.contentFingerprint) body.expectedFingerprint = decision.contentFingerprint;
  if (reason) body.reason = reason;
  return { path: `/decisions/proposals/${decision.id}/resolve`, body };
}
