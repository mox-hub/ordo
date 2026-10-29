import { describe, expect, it } from 'vitest';
import type { AcceptanceCriterion } from '../api/acceptance-api';
import {
  hasCurrentEvidence,
  hasInsufficientEvidence,
  hasStaleEvidenceOnly,
  isCurrentEvidence,
  isStaleEvidence,
  isVerifiableEvidence,
} from './evidence';

/** CAP-B-01 前端口径：版本有效性 + 证据充分性（须与服务端同判） */

function criterion(
  overrides: Record<string, unknown> = {},
): AcceptanceCriterion {
  return {
    id: 'c1',
    acceptanceId: 'a1',
    criteriaType: 'functional',
    content: '导出失败返回可读错误码',
    status: 'passed',
    severity: 'medium',
    order: 0,
    revision: 1,
    evidences: [],
    ...overrides,
  } as unknown as AcceptanceCriterion;
}

describe('证据版本有效性', () => {
  it('无快照按初版处理：revision=1 有效，revision=2 失效', () => {
    expect(isCurrentEvidence({ criteriaRevision: null }, 1)).toBe(true);
    expect(isCurrentEvidence({}, 2)).toBe(false);
    expect(isCurrentEvidence({ criteriaRevision: 2 }, 2)).toBe(true);
  });

  it('全部证据落后 → 待复核徽标；存在当版证据 → 不告警', () => {
    expect(
      hasStaleEvidenceOnly(
        criterion({ revision: 2, evidences: [{ criteriaRevision: 1 }] }),
      ),
    ).toBe(true);
    expect(
      hasStaleEvidenceOnly(
        criterion({
          revision: 2,
          evidences: [{ criteriaRevision: 1 }, { criteriaRevision: 2 }],
        }),
      ),
    ).toBe(false);
    expect(
      hasCurrentEvidence(criterion({ revision: 2, evidences: [] })),
    ).toBe(false);
  });

  it('单条证据落后判定按标准当前版本', () => {
    expect(
      isStaleEvidence({ criteriaRevision: 1 }, { revision: 2 }),
    ).toBe(true);
    expect(
      isStaleEvidence({ criteriaRevision: 2 }, { revision: 2 }),
    ).toBe(false);
  });
});

describe('证据充分性', () => {
  it('机器产出可核验；截图/日志需 storageRef；判定类不可核验', () => {
    expect(isVerifiableEvidence({ evidenceType: 'ci_result' })).toBe(true);
    expect(isVerifiableEvidence({ evidenceType: 'test_report' })).toBe(true);
    expect(isVerifiableEvidence({ evidenceType: 'screenshot' })).toBe(false);
    expect(
      isVerifiableEvidence({
        evidenceType: 'log',
        storageRef: 's3://run.log',
      }),
    ).toBe(true);
    expect(isVerifiableEvidence({ evidenceType: 'human_approval' })).toBe(
      false,
    );
    expect(isVerifiableEvidence({ evidenceType: 'model_evaluation' })).toBe(
      false,
    );
  });

  it('critical/high 仅判定类当版证据 → 提示需可核验证据', () => {
    expect(
      hasInsufficientEvidence(
        criterion({
          severity: 'critical',
          evidences: [{ criteriaRevision: 1, evidenceType: 'human_approval' }],
        }),
      ),
    ).toBe(true);
    expect(
      hasInsufficientEvidence(
        criterion({
          severity: 'high',
          evidences: [
            { criteriaRevision: 1, evidenceType: 'human_approval' },
            { criteriaRevision: 1, evidenceType: 'test_result' },
          ],
        }),
      ),
    ).toBe(false);
  });

  it('无当版证据不触发充分性告警（由「待复核」徽标覆盖，避免重复提示）', () => {
    // 只有旧版机器证据：当版证据为空 → 不告警充分性
    expect(
      hasInsufficientEvidence(
        criterion({
          severity: 'critical',
          revision: 2,
          evidences: [{ criteriaRevision: 1, evidenceType: 'ci_result' }],
        }),
      ),
    ).toBe(false);
    expect(
      hasInsufficientEvidence(
        criterion({ severity: 'critical', evidences: [] }),
      ),
    ).toBe(false);
  });

  it('medium/low 不受充分性约束', () => {
    expect(
      hasInsufficientEvidence(
        criterion({
          severity: 'medium',
          evidences: [{ criteriaRevision: 1, evidenceType: 'human_approval' }],
        }),
      ),
    ).toBe(false);
  });
});
