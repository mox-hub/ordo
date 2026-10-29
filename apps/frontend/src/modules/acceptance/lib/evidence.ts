import type { AcceptanceCriterion, CriterionEvidence } from '../api/acceptance-api';

/**
 * CAP-B-01 证据判定（与服务端 `acceptance-criteria.service.ts` 同口径）。
 *
 * 两件事：
 * 1. 版本有效性——证据快照 revision 与标准当前 revision 一致才算当版；
 *    存量证据无快照（null）按 1（初版）处理。
 * 2. 证据充分性——critical/high 标准不能只靠判定类证据放行，必须有
 *    当版可核验证据（CI/测试/PR 记录，或带 storageRef 的日志/截图）。
 */

export function isCurrentEvidence(
  evidence: Pick<CriterionEvidence, 'criteriaRevision'>,
  criteriaRevision: number,
): boolean {
  return (evidence.criteriaRevision ?? 1) === criteriaRevision;
}

export function hasCurrentEvidence(c: AcceptanceCriterion): boolean {
  const revision = c.revision ?? 1;
  return (c.evidences ?? []).some((ev) => isCurrentEvidence(ev, revision));
}

/** 待复核：已有证据但全部落后于当前标准版本（标准修订后未重新提交证据） */
export function hasStaleEvidenceOnly(c: AcceptanceCriterion): boolean {
  return (c.evidences ?? []).length > 0 && !hasCurrentEvidence(c);
}

const MACHINE_VERIFIABLE_EVIDENCE_TYPES = new Set([
  'ci_result',
  'test_result',
  'test_report',
  'pr_review',
]);
const ARTIFACT_EVIDENCE_TYPES = new Set(['screenshot', 'log']);
const STRICT_SEVERITIES = new Set(['critical', 'high']);

export function isVerifiableEvidence(
  ev: Pick<CriterionEvidence, 'evidenceType' | 'storageRef'>,
): boolean {
  if (MACHINE_VERIFIABLE_EVIDENCE_TYPES.has(ev.evidenceType)) return true;
  return ARTIFACT_EVIDENCE_TYPES.has(ev.evidenceType) && !!ev.storageRef?.trim();
}

/**
 * 严格等级标准已有当版证据、但全部不可核验 → 接收时会被充分性门禁拦下。
 * 无当版证据的情况由「待复核」徽标覆盖，不重复告警。
 */
export function hasInsufficientEvidence(c: AcceptanceCriterion): boolean {
  if (!STRICT_SEVERITIES.has(c.severity)) return false;
  const revision = c.revision ?? 1;
  const current = (c.evidences ?? []).filter((ev) => isCurrentEvidence(ev, revision));
  if (current.length === 0) return false;
  return !current.some(isVerifiableEvidence);
}

/** 单条证据是否落后于标准当前版本（旧版证据不再为当前标准背书） */
export function isStaleEvidence(
  ev: Pick<CriterionEvidence, 'criteriaRevision'>,
  c: Pick<AcceptanceCriterion, 'revision'>,
): boolean {
  return (ev.criteriaRevision ?? 1) !== (c.revision ?? 1);
}
