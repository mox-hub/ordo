/**
 * 实机测试模式面板（CAP-A-31 批 1）：模式开关 → 抓取现场 → 标注+填表 → 生成 bug 工单。
 * 本地优先：bundle 先落盘（bug_report_save），建单失败入补交队列可重试；
 * 「0 输入成单」——复现步骤/环境由抓取现场自动预填，人工只改必要的。
 */
import { Bug, FlaskConical, Send, StopCircle } from 'lucide-react';
import { useState } from 'react';
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
import { cn } from '@/lib/utils';
import { useCreateTask } from '@/modules/issue/hooks/use-project-tasks';
import type { BugSeverity, CreateTaskRequest } from '@/modules/issue/api/issue-api';
import type { TestModeCaptureReport } from '@/shared/types/electron-api';
import { buildBugIssuePayload, testModeApi, type BugIssueForm } from '../api/test-mode-api';
import { useBugReportQueue, useTestModeCapture, useTestModeStatus, useTestModeToggle } from '../hooks/use-test-mode';
import { ScreenshotAnnotator } from './screenshot-annotator';

const SEVERITIES: BugSeverity[] = ['critical', 'high', 'medium', 'low'];

type Phase = 'idle' | 'active' | 'composing';

interface CaptureState {
  screenshotDataUrl: string;
  annotatedDataUrl: string;
  report: TestModeCaptureReport;
}

export function TestModePanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const statusQuery = useTestModeStatus({ refetchWhileActive: open });
  const { start, stop } = useTestModeToggle();
  const capture = useTestModeCapture();
  const createTask = useCreateTask();
  const { queue, remove } = useBugReportQueue({ enabled: open });

  const [phase, setPhase] = useState<Phase>('idle');
  const [captureState, setCaptureState] = useState<CaptureState | null>(null);
  const [form, setForm] = useState<BugIssueForm & { stepsToReproduce?: string }>({
    title: '',
    severity: 'medium',
  });
  const [submitting, setSubmitting] = useState(false);

  const active = statusQuery.data?.active ?? false;

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
      setCaptureState(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleCapture(): Promise<void> {
    try {
      const result = await capture.mutateAsync();
      setCaptureState({
        screenshotDataUrl: result.screenshotDataUrl,
        annotatedDataUrl: result.screenshotDataUrl,
        report: result.report,
      });
      setForm((prev) => ({ ...prev, stepsToReproduce: result.report.stepsToReproduce }));
      setPhase('composing');
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
      setCaptureState(null);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="size-4" />
            {t('testMode.panelTitle')}
          </DialogTitle>
          <DialogDescription>{t('testMode.idleHint')}</DialogDescription>
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
              <Button onClick={handleCapture} disabled={capture.isPending}>
                {capture.isPending ? <Spinner size="sm" /> : <FlaskConical className="size-4" />}
                {t('testMode.capture')}
              </Button>
            )}
            <QueueSection
              items={queue.data?.items ?? []}
              onRetry={handleRetry}
              onRemove={(id) => remove.mutate(id)}
              retrying={createTask.isPending}
            />
          </div>
        )}

        {phase === 'composing' && captureState && (
          <div className="flex flex-col gap-3">
            <ScreenshotAnnotator
              src={captureState.screenshotDataUrl}
              onChange={(dataUrl) =>
                setCaptureState((prev) => (prev ? { ...prev, annotatedDataUrl: dataUrl } : prev))
              }
            />
            <div className="flex flex-col gap-1 text-xs text-text-secondary">
              <span>{captureState.report.url}</span>
              <span>
                {t('testMode.capturedSummary', {
                  operations: captureState.report.operations.length,
                  network: captureState.report.networkSummary.length,
                })}
                {errorCount > 0 ? ` · ${t('testMode.errorRequests', { count: errorCount })}` : ''}
              </span>
            </div>
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
        )}

        {phase === 'active' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="size-2 animate-pulse rounded-full bg-accent-red" />
                {t('testMode.recording')}
                <span className="text-xs text-text-secondary">
                  {t('testMode.capturedSummary', {
                    operations: statusQuery.data?.operationCount ?? 0,
                    network: statusQuery.data?.networkCount ?? 0,
                  })}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleExit}>
                <StopCircle className="size-3.5" />
                {t('testMode.exit')}
              </Button>
            </div>
            <Button onClick={handleCapture} disabled={capture.isPending}>
              {capture.isPending ? <Spinner size="sm" /> : <FlaskConical className="size-4" />}
              {t('testMode.capture')}
            </Button>
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
      <span className="text-xs font-medium text-text-secondary">
        {t('testMode.queue', { count: items.length })}
      </span>
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate text-text-secondary" title={item.bundlePath}>
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
