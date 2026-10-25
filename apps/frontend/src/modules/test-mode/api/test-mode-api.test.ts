import { describe, expect, it } from 'vitest';
import { buildBugIssuePayload, type BugIssueForm } from './test-mode-api';

const REPORT = {
  stepsToReproduce: '1. [点击] 提交',
  environmentText: '应用版本: 1.0.0\n系统: win32',
};

const FORM: BugIssueForm = {
  title: '列表页 500',
  description: '打开工单列表就挂',
  severity: 'high',
  expectedResult: '正常加载',
  actualResult: '500 报错',
};

describe('buildBugIssuePayload（CreateTaskRequest bug 字段逐一对账，GAP-T-71）', () => {
  it('全字段直映射：type 恒 bug、tags 恒实机测试、四个 bug* 字段一一对应', () => {
    const payload = buildBugIssuePayload(FORM, REPORT, 'C:/ordo/bug-1.ordobug');
    expect(payload).toEqual({
      title: '列表页 500',
      description: '打开工单列表就挂\n\n[实机测试现场] C:/ordo/bug-1.ordobug',
      type: 'bug',
      severity: 'high',
      tags: ['实机测试'],
      bugStepsToReproduce: '1. [点击] 提交',
      bugEnvironment: '应用版本: 1.0.0\n系统: win32',
      bugExpectedResult: '正常加载',
      bugActualResult: '500 报错',
    });
  });

  it('用户改写复现步骤时优先于自动生成稿', () => {
    const payload = buildBugIssuePayload(
      { ...FORM, stepsToReproduce: '1. 打开列表\n2. 观察 500' },
      REPORT,
      'C:/x',
    );
    expect(payload.bugStepsToReproduce).toBe('1. 打开列表\n2. 观察 500');
  });

  it('未改写时回落抓取现场自动稿', () => {
    const payload = buildBugIssuePayload({ ...FORM, stepsToReproduce: undefined }, REPORT, 'C:/x');
    expect(payload.bugStepsToReproduce).toBe('1. [点击] 提交');
  });

  it('空可选字段输出 undefined（不发送空串）', () => {
    const payload = buildBugIssuePayload(
      { title: '  空字段检查  ', severity: 'low' },
      { stepsToReproduce: '', environmentText: '' },
      '',
    );
    expect(payload.title).toBe('空字段检查');
    expect(payload.description).toBeUndefined();
    expect(payload.bugStepsToReproduce).toBeUndefined();
    expect(payload.bugEnvironment).toBeUndefined();
    expect(payload.bugExpectedResult).toBeUndefined();
    expect(payload.bugActualResult).toBeUndefined();
  });
});
