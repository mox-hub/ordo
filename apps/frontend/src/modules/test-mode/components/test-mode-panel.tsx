/**
 * 实机测试模式面板（CAP-A-31 批 1）：模式开关 → 抓取现场 → 标注+填表 → 生成 bug 工单。
 * 本地优先：bundle 先落盘（bug_report_save），建单失败入补交队列可重试；
 * 「0 输入成单」——复现步骤/环境由抓取现场自动预填，人工只改必要的。
 * 会话状态走 test-mode-store；填表态为文档预览放大窗同款大窗（95vw×95vh 圆角居中，
 * 非真全屏——实机反馈第 1 条），左栏标注大空间 + 右栏 400px 表单。
 */
import { Bug, Copy, FlaskConical, Send, StopCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/spinner';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { cn } from '@/lib/utils';
import { useCreateTask } from '@/modules/issue/hooks/use-project-tasks';
import type { BugSeverity, CreateTaskRequest } from '@/modules/issue/api/issue-api';
import { buildBugIssuePayload, testModeApi, type BugIssueForm } from '../api/test-mode-api';
import {
  useBugReportQueue,
  useTestModeOpsControls,
  useTestModeStatus,
  useTestModeToggle,
} from '../hooks/use-test-mode';
import { useTestModeStore } from '../store/test-mode-store';
import { ScreenshotAnnotator } from './screenshot-annotator';

const SEVERITIES: BugSeverity[] = ['critical', 'high', 'medium', 'low'];

type PanelForm = BugIssueForm & { stepsToReproduce?: string; selector?: string };

export function TestModePanel() {
  const { t } = useTranslation();
  const { copyToClipboard } = useCopyToClipboard();
  const panelOpen = useTestModeStore((s) => s.panelOpen);
  const setPanelOpen = useTestModeStore((s) => s.setPanelOpen);
  const phase = useTestModeStore((s) => s.phase);
  const setPhase = useTestModeStore((s) => s.setPhase);
  const captureState = useTestModeStore((s) => s.captureState);
  const clearCapture = useTestModeStore((s) => s.clearCapture);
  const runCapture = useTestModeStore((s) => s.runCapture);
  const capturing = useTestModeStore((s) => s.capturing);
  const picking = useTestModeStore((s) => s.picking);
  const patchCapture = useTestModeStore((s) => s.patchCapture);

  const statusQuery = useTestModeStatus();
  const { start, stop } = useTestModeToggle();
  const { recordStart, clear: clearOps } = useTestModeOpsControls();
  const createTask = useCreateTask();
  const { queue, remove } = useBugReportQueue({ enabled: panelOpen });

  const [form, setForm] = useState<PanelForm>({ title: '', severity: 'medium' });
  const [submitting, setSubmitting] = useState(false);

  const active = statusQuery.data?.active ?? false;
  const recordingOps = statusQuery.data?.recordingOps ?? false;
  const composing = phase === 'composing';
  const elementMeta = captureState?.report.element ?? null;

  // 新现场到达：预填复现步骤与组件选择器（用户可改）
  const capturedAt = captureState?.report.capturedAt;
  useEffect(() => {
    if (captureState) {
      setForm((prev) => ({
        ...prev,
        stepsToReproduce: captureState.report.stepsToReproduce,
        selector: captureState.report.element?.selector ?? undefined,
      }));
    }
    // captureState 由 capturedAt 唯一驱动，避免标注回调改对象触发重复预填
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedAt]);

  async function handleEnter(): Promise<void> {
    try {
      await start.mutateAsync();
      setPhase('active');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleExit(): Promise<void> {
    try {
      await stop.mutateAsync();
      setPhase('idle');
      clearCapture();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSubmit(): Promise<void> {
    if (!captureState) {
      return;
    }
    if (!form.title.trim()) {
      toast.error(t('testMode.titleRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const saved = await testModeApi.saveReport({
        title: form.title,
        description: form.description,
        severity: form.severity,
        expectedResult: form.expectedResult,
        actualResult: form.actualResult,
        stepsToReproduce: form.stepsToReproduce,
        screenshotDataUrl: captureState.annotatedDataUrl,
      });
      const payload = buildBugIssuePayload(form, captureState.report, saved.bundlePath);
      try {
        await createTask.mutateAsync(payload);
        toast.success(t('testMode.submitSuccess'));
      } catch (issueErr) {
        const message = issueErr instanceof Error ? issueErr.message : String(issueErr);
        await testModeApi.queueAdd({ bundlePath: saved.bundlePath, payload: payload as unknown as Record<string, unknown>, error: message });
        toast.error(t('testMode.submitQueued'));
      }
      setPhase('active');
      clearCapture();
      setForm({ title: '', severity: 'medium' });
    } catch (err) {
      toast.error(`${t('testMode.saveBundleFailed')}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetry(payload: Record<string, unknown>): Promise<void> {
    try {
      await createTask.mutateAsync(payload as unknown as CreateTaskRequest);
      toast.success(t('testMode.submitSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  const errorCount = (captureState?.report.networkSummary ?? []).filter(
    (item) => (item.status ?? 0) >= 400 || item.status === 0,
  ).length;

  return (
    <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
      {/* 填表态 = 文档预览放大窗同款大窗（max-w-dialog w-dialog h-dialog-screen，
          非真全屏——实机反馈第 1 条）；keepDefaultWidth=false 是 sm:max-w-md 变体类
          的官方逃生舱，消费方无变体 max-w 覆盖不了它（实机塌板实证） */}
      <DialogContent
        keepDefaultWidth={!composing}
        showCloseButton={!composing}
        data-ordo-test-mode-ui
        className={
          composing
            ? 'flex h-dialog-screen max-w-dialog w-dialog flex-col gap-0 overflow-hidden p-0'
            : 'max-h-[85vh] max-w-2xl overflow-y-auto'
        }
      >
        <DialogHeader
          className={
            composing
              ? 'flex shrink-0 flex-row items-center justify-between gap-4 border-b border-border px-6 py-3'
              : undefined
          }
        >
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="size-4" />
            {t('testMode.panelTitle')}
            {composing && elementMeta && (
              <span className="rounded-sm bg-accent-red/10 px-1.5 py-0.5 text-xs font-normal text-accent-red">
                {t('testMode.elementMode')}
              </span>
            )}
          </DialogTitle>
          {composing ? (
            <Button variant="ghost" size="icon-sm" onClick={() => setPanelOpen(false)}>
              <X className="size-4" />
            </Button>
          ) : (
            <DialogDescription>{t('testMode.idleHint')}</DialogDescription>
          )}
        </DialogHeader>

        {phase === 'idle' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <span className={cn('size-2 rounded-full', active ? 'bg-accent-red animate-pulse' : 'bg-border')} />
                {active ? t('testMode.recording') : t('testMode.notActive')}
              </div>
              {active ? (
                <Button variant="outline" size="sm" onClick={handleExit}>
                  <StopCircle className="size-3.5" />
                  {t('testMode.exit')}
                </Button>
              ) : (
                <Button size="sm" onClick={handleEnter} disabled={start.isPending}>
                  {start.isPending ? <Spinner size="sm" /> : <Bug className="size-3.5" />}
                  {t('testMode.enter')}
                </Button>
              )}
            </div>
            {active && (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => void runCapture('full')} disabled={capturing || picking}>
                  {t('testMode.captureFull')}
                </Button>
                <Button variant="outline" onClick={() => void runCapture('element')} disabled={capturing || picking}>
                  {t('testMode.captureElement')}
                </Button>
              </div>
            )}
            <QueueSection
              items={queue.data?.items ?? []}
              onRetry={handleRetry}
              onRemove={(id) => remove.mutate(id)}
              retrying={createTask.isPending}
            />
          </div>
        )}

        {composing && captureState && (
          <div className="grid min-h-0 flex-1 grid-cols-[1fr_400px] gap-4 overflow-hidden px-6 py-4">
            {/* 左栏：截图标注（大空间优先，实机反馈第 2 条） */}
            <div className="flex min-w-0 flex-col gap-2 overflow-y-auto">
              <ScreenshotAnnotator
                src={captureState.screenshotDataUrl}
                onChange={(dataUrl) => patchCapture({ annotatedDataUrl: dataUrl })}
              />
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>{captureState.report.url}</span>
                <span>
                  {t('testMode.capturedSummary', {
                    operations: captureState.report.operations.length,
                    network: captureState.report.networkSummary.length,
                  })}
                  {errorCount > 0 ? ` · ${t('testMode.errorRequests', { count: errorCount })}` : ''}
                </span>
              </div>
            </div>
            {/* 右栏：填表（定宽，内滚） */}
            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
              {elementMeta && (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="test-mode-selector">{t('testMode.elementSelector')}</Label>
                  <div className="flex gap-1.5">
                    <Input
                      id="test-mode-selector"
                      className="font-mono text-xs"
                      value={form.selector ?? elementMeta.selector}
                      onChange={(e) => setForm((prev) => ({ ...prev, selector: e.target.value }))}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(form.selector ?? elementMeta.selector)}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <Label htmlFor="test-mode-title">{t('testMode.formTitle')}</Label>
                <Input
                  id="test-mode-title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={t('testMode.formTitlePlaceholder')}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>{t('testMode.severity')}</Label>
                <div className="flex gap-1.5">
                  {SEVERITIES.map((level) => (
                    <Button
                      key={level}
                      type="button"
                      size="xs"
                      variant={form.severity === level ? 'default' : 'outline'}
                      onClick={() => setForm((prev) => ({ ...prev, severity: level }))}
                    >
                      {t(`testMode.severity_${level}`)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="test-mode-expected">{t('testMode.expectedResult')}</Label>
                <Input
                  id="test-mode-expected"
                  value={form.expectedResult ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, expectedResult: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="test-mode-actual">{t('testMode.actualResult')}</Label>
                <Input
                  id="test-mode-actual"
                  value={form.actualResult ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, actualResult: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="test-mode-steps">{t('testMode.stepsToReproduce')}</Label>
                <Textarea
                  id="test-mode-steps"
                  className="min-h-24 font-mono text-xs"
                  value={form.stepsToReproduce ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, stepsToReproduce: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="test-mode-description">{t('testMode.description')}</Label>
                <Textarea
                  id="test-mode-description"
                  className="min-h-16"
                  value={form.description ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setPhase('active')}>
                  {t('testMode.backToCapture')}
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Spinner size="sm" /> : <Send className="size-4" />}
                  {t('testMode.submit')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {phase === 'active' && (
          <div className="flex flex-col gap-3">
            {/* 操作录制门（实机反馈第 3 条）：确认开始才记，避免无关操作混入 */}
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    'size-2 rounded-full',
                    recordingOps ? 'bg-accent-red animate-pulse' : 'bg-border',
                  )}
                />
                {recordingOps
                  ? t('testMode.record.recordingN', { count: statusQuery.data?.operationCount ?? 0 })
                  : t('testMode.record.paused')}
              </div>
              {recordingOps ? (
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={recordStart.isPending}
                    onClick={() => void recordStart.mutateAsync()}
                  >
                    {t('testMode.record.restart')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={clearOps.isPending}
                    onClick={() => void clearOps.mutateAsync()}
                  >
                    {t('testMode.record.clear')}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  disabled={recordStart.isPending}
                  onClick={() => void recordStart.mutateAsync()}
                >
                  {t('testMode.record.start')}
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="size-2 animate-pulse rounded-full bg-accent-blue" />
                {t('testMode.capturedSummary', {
                  operations: statusQuery.data?.operationCount ?? 0,
                  network: statusQuery.data?.networkCount ?? 0,
                })}
              </div>
              <Button variant="outline" size="sm" onClick={handleExit}>
                <StopCircle className="size-3.5" />
                {t('testMode.exit')}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => void runCapture('full')} disabled={capturing || picking}>
                {t('testMode.captureFull')}
              </Button>
              <Button variant="outline" onClick={() => void runCapture('element')} disabled={capturing || picking}>
                {t('testMode.captureElement')}
              </Button>
            </div>
            <QueueSection
              items={queue.data?.items ?? []}
              onRetry={handleRetry}
              onRemove={(id) => remove.mutate(id)}
              retrying={createTask.isPending}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function QueueSection({
  items,
  onRetry,
  onRemove,
  retrying,
}: {
  items: Array<{ id: string; bundlePath: string; payload: Record<string, unknown>; error?: string }>;
  onRetry: (payload: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
  retrying: boolean;
}) {
  const { t } = useTranslation();
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border/60 p-2.5">
      <span className="text-xs font-medium text-muted-foreground">
        {t('testMode.queue', { count: items.length })}
      </span>
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate text-muted-foreground" title={item.bundlePath}>
            {item.bundlePath.split(/[\\/]/).pop()}
            {item.error ? ` · ${item.error}` : ''}
          </span>
          <span className="flex shrink-0 gap-1">
            <Button variant="outline" size="xs" disabled={retrying} onClick={() => onRetry(item.payload)}>
              {t('testMode.queueRetry')}
            </Button>
            <Button variant="ghost" size="xs" onClick={() => onRemove(item.id)}>
              {t('testMode.queueRemove')}
            </Button>
          </span>
        </div>
      ))}
    </div>
  );
}
