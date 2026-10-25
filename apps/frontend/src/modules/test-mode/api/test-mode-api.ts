/**
 * 实机测试模式 API 层（CAP-A-31 批 1）：desktop 壳命令封装 + 建单直映射。
 * 建单走既有 POST /issues（taskApi.create 同款请求体），bug 专用字段零后端改动直映射——
 * 对账口径见 buildBugIssuePayload（GAP-T-71 测试义务逐字段锚定）。
 */
import type { CreateTaskRequest, BugSeverity } from '@/modules/issue/api/issue-api';
import {
  invoke,
  isDesktopShellAvailable,
  type BugReportQueueItem,
  type BugReportSaveArgs,
  type BugReportSaveResult,
  type TestModeCaptureResult,
  type TestModeStatusResult,
} from '@/shared/types/electron-api';

export const testModeApi = {
  available(): boolean {
    return isDesktopShellAvailable();
  },
  start(): Promise<TestModeStatusResult> {
    return invoke<TestModeStatusResult>('test_mode_start');
  },
  stop(): Promise<TestModeStatusResult> {
    return invoke<TestModeStatusResult>('test_mode_stop');
  },
  status(): Promise<TestModeStatusResult> {
    return invoke<TestModeStatusResult>('test_mode_status');
  },
  capture(): Promise<TestModeCaptureResult> {
    return invoke<TestModeCaptureResult>('test_mode_capture');
  },
  saveReport(args: BugReportSaveArgs): Promise<BugReportSaveResult> {
    return invoke<BugReportSaveResult>('bug_report_save', args as unknown as Record<string, unknown>);
  },
  queueAdd(args: { bundlePath: string; payload: Record<string, unknown>; error?: string }): Promise<{ ok: true }> {
    return invoke('bug_report_queue_add', args as unknown as Record<string, unknown>);
  },
  queueList(): Promise<{ items: BugReportQueueItem[] }> {
    return invoke('bug_report_queue_list');
  },
  queueRemove(args: { id: string }): Promise<{ ok: boolean }> {
    return invoke('bug_report_queue_remove', args as unknown as Record<string, unknown>);
  },
};

export interface BugIssueForm {
  title: string;
  description?: string;
  severity: BugSeverity;
  expectedResult?: string;
  actualResult?: string;
  /** 用户改写后的复现步骤；空则回落抓取现场的自动生成稿 */
  stepsToReproduce?: string;
}

/**
 * 建单直映射（CreateTaskRequest bug 专用字段逐一对账，GAP-T-71）：
 * title→title；description→description（拼 bundle 路径引用）；severity→severity；
 * 四个 bug* 字段一一对应；type 恒 'bug'；tags 恒 ['实机测试']（溯源入口）。
 */
export function buildBugIssuePayload(
  form: BugIssueForm,
  report: { stepsToReproduce: string; environmentText: string },
  bundlePath: string,
): CreateTaskRequest {
  const parts = [
    form.description?.trim(),
    bundlePath ? `[实机测试现场] ${bundlePath}` : '',
  ].filter(Boolean);
  return {
    title: form.title.trim(),
    description: parts.length > 0 ? parts.join('\n\n') : undefined,
    type: 'bug',
    severity: form.severity,
    tags: ['实机测试'],
    bugStepsToReproduce: form.stepsToReproduce?.trim() || report.stepsToReproduce || undefined,
    bugEnvironment: report.environmentText || undefined,
    bugExpectedResult: form.expectedResult?.trim() || undefined,
    bugActualResult: form.actualResult?.trim() || undefined,
  };
}
