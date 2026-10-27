/**
 * 缺陷实体模板——表单值/提交/草稿回填/建议回填/属性栏/验收标准段
 * （逻辑自 unified-create-dialog.tsx 原地迁移，行为不变）。
 */
import { useTranslation } from 'react-i18next';
import { AlertCircle, Calendar as CalendarIcon, Flag, User } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import {
  CapsuleSelect,
  DateCapsuleField,
  PropertyPanelIcons,
  PropertyRow,
} from '@/shared/components/property-panel';
import { AcceptanceCriteriaField } from '../acceptance-criteria-field';
import type { BugSeverity, TaskPriority } from '@/modules/issue/api/issue-api';
import { cn } from '@/lib/utils';
import type { CriterionItem, DraftFields, EntityAdapter, TemplateCtx } from './types';

export interface BugFormValues {
  title: string;
  description: string;
  status: string;
  severity: BugSeverity;
  priority: TaskPriority;
  projectId: string;
  assigneeId: string;
  dueDate: string;
  /** 无手动入口，仅 AI 建议（create-suggestions）回填 */
  labels: string[];
}

export const DEFAULT_BUG: BugFormValues = {
  title: '', description: '', status: 'todo', severity: 'medium', priority: 'high',
  projectId: '', assigneeId: '', dueDate: '', labels: [],
};

/** Bug 严重度 S0–S3（status-visuals 无 severity 映射，本地维护；色用 accent token 禁原始 hex） */
export const SEVERITY_OPTIONS: { value: BugSeverity; dotClass: string }[] = [
  { value: 'critical', dotClass: 'bg-accent-red' },
  { value: 'high', dotClass: 'bg-accent-orange' },
  { value: 'medium', dotClass: 'bg-accent-yellow' },
  { value: 'low', dotClass: 'bg-accent-green' },
];

type BugForm = UseFormReturn<BugFormValues>;
const asForm = (f: UseFormReturn<Record<string, unknown>>) => f as unknown as BugForm;

const submitBug = async (formRef: BugForm, ctx: TemplateCtx) => {
  const values = formRef.getValues();
  if (!values.title.trim()) { ctx.setError(ctx.t('unifiedCreate.error.bugTitle')); return; }
  const pid = values.projectId || ctx.projectId;
  const moduleCode = ctx.resolveModuleCode(pid, 'BUG');
  ctx.setError(null);
  try {
    const criteriaItems = ctx.criteria
      .filter((c) => c.text.trim().length > 0)
      .map((c, idx) => ({ id: c.id, content: c.text.trim(), completed: c.completed, order: idx }));
    const todoItems = criteriaItems.length > 0 ? criteriaItems : undefined;
    const resp = await ctx.mutations.createTask.mutateAsync({
      projectId: pid || undefined,
      ...(moduleCode ? { moduleCode } : {}),
      title: values.title,
      description: values.description || undefined,
      priority: values.priority,
      status: values.status,
      assigneeId: values.assigneeId || undefined,
      dueDate: values.dueDate || undefined,
      tags: values.labels,
      type: 'bug',
      severity: values.severity,
      todoItems,
    });
    if (resp?.id) ctx.handleSuccess('bug', resp.id);
  } catch (err) {
    ctx.setError(err instanceof Error ? err.message : ctx.t('unifiedCreate.error.createFailed'));
  }
};

export const bugTemplate: EntityAdapter = {
  type: 'bug',
  titleField: 'title',
  defaults: DEFAULT_BUG,
  hasInput: (f) => {
    const v = asForm(f).getValues();
    return Boolean(v.title.trim() || v.description.trim());
  },
  submit: (f, ctx) => submitBug(asForm(f), ctx),
  applyDraft: (f, draft) => {
    const fields = draft.fields as DraftFields;
    const form = asForm(f);
    const okSeverity = ['critical', 'high', 'medium', 'low'].includes(fields.severity ?? '');
    form.setValue('title', fields.title ?? '');
    if (fields.description) form.setValue('description', fields.description);
    if (okSeverity && fields.severity) form.setValue('severity', fields.severity as BugSeverity);
    if (fields.priority) form.setValue('priority', fields.priority as TaskPriority);
    if (fields.status) form.setValue('status', fields.status);
    if (fields.dueDate) form.setValue('dueDate', fields.dueDate);
    if (fields.labels?.length) form.setValue('labels', fields.labels);
  },
  applySuggestion: (f, s) => {
    const form = asForm(f);
    const v = s.value.trim();
    if (!v) return;
    if (s.field === 'labels') {
      form.setValue('labels', v.split(/[,，、]/).map((x) => x.trim()).filter(Boolean));
    } else if (s.field === 'dueDate') form.setValue('dueDate', v);
    else if (s.field === 'title' || s.field === 'name') {
      if (!form.getValues().title) form.setValue('title', v);
    }
  },
  ExtraMain: ({ form, ctx }) => {
    const criteria = ctx.criteria as CriterionItem[];
    return (
      <AcceptanceCriteriaField
        criteria={criteria}
        onChange={ctx.setCriteria}
        titleValue={String(asForm(form).watch('title') ?? '')}
        descValue={String(asForm(form).watch('description') ?? '')}
        maximized={ctx.maximized}
      />
    );
  },
  Properties: ({ form, ctx }) => {
    const { t } = useTranslation();
    const f = asForm(form);
    const statusVal: string = f.watch('status') ?? 'todo';
    const severityVal: string = f.watch('severity') ?? 'medium';
    const priorityVal = f.watch('priority');
    const assigneeVal: string = f.watch('assigneeId');
    const projectVal: string = f.watch('projectId') || ctx.projectId || '';
    const dueVal: string = f.watch('dueDate');
    const statusOpt = ctx.statusOptions.find((s) => s.value === statusVal);
    const StatusIcon = statusOpt?.icon ?? PropertyPanelIcons.Circle;
    const memberOptions = ctx.members.map((m) => ({ value: m.id, label: m.displayName }));
    const projectOptions = ctx.projectList.map((p) => ({ value: p.id, label: p.name }));
    return (
      <>
        <PropertyRow icon={<StatusIcon className={cn('size-3.5', statusOpt?.toneClass, statusOpt?.spin && 'animate-spin')} />} label={t('unifiedCreate.field.status')}>
          <CapsuleSelect
            value={statusVal}
            options={ctx.statusOptions.map((s) => ({
              value: s.value,
              label: s.label,
              icon: <s.icon className={cn('size-3.5', s.toneClass, s.spin && 'animate-spin')} />,
            }))}
            onChange={(v) => f.setValue('status', v || 'todo')}
            active
          />
        </PropertyRow>
        <PropertyRow icon={<AlertCircle className="size-3.5" />} label={t('unifiedCreate.field.severity')}>
          <CapsuleSelect
            value={severityVal}
            options={SEVERITY_OPTIONS.map((s) => ({
              value: s.value,
              label: t(`unifiedCreate.severity.${s.value}`),
              icon: <span className={cn('inline-block size-2.5 rounded-full', s.dotClass)} />,
            }))}
            onChange={(v) => f.setValue('severity', (v || 'medium') as BugSeverity)}
            active={!!severityVal}
          />
        </PropertyRow>
        <PropertyRow icon={<AlertCircle className="size-3.5" />} label={t('unifiedCreate.field.priority')}>
          <CapsuleSelect
            value={priorityVal ?? ''}
            options={ctx.priorityOptions.map((p) => ({
              value: p.value,
              label: p.label,
              icon: <p.icon className={cn('size-3.5', p.toneClass)} />,
            }))}
            onChange={(v) => f.setValue('priority', (v || 'high') as TaskPriority)}
            active={!!priorityVal}
          />
        </PropertyRow>
        <PropertyRow icon={<User className="size-3.5" />} label={t('unifiedCreate.field.assignee')}>
          <CapsuleSelect
            value={assigneeVal ?? ''}
            options={memberOptions}
            onChange={(v) => f.setValue('assigneeId', v)}
            active={!!assigneeVal}
            placeholder={t('unifiedCreate.linear.unassigned')}
          />
        </PropertyRow>
        <PropertyRow icon={<Flag className="size-3.5" />} label={t('unifiedCreate.field.project')}>
          <CapsuleSelect
            value={projectVal}
            options={projectOptions}
            onChange={(v) => f.setValue('projectId', v)}
            active={!!projectVal}
            placeholder={t('unifiedCreate.linear.noProject')}
          />
        </PropertyRow>
        <PropertyRow icon={<CalendarIcon className="size-3.5" />} label={t('unifiedCreate.field.dueDate')}>
          <DateCapsuleField value={dueVal} onChange={(v) => f.setValue('dueDate', v)} placeholder={t('unifiedCreate.field.none')} clearLabel={t('unifiedCreate.field.clearDueDate')} />
        </PropertyRow>
      </>
    );
  },
  pillsProps: (f, ctx) => {
    const form = asForm(f);
    return {
      status: form.watch('status'),
      onStatusChange: (st: string) => form.setValue('status', st),
      priority: form.watch('priority'),
      onPriorityChange: (pr: TaskPriority) => form.setValue('priority', pr),
      assigneeId: form.watch('assigneeId'),
      onAssigneeChange: (aid: string) => form.setValue('assigneeId', aid),
      dueDate: form.watch('dueDate'),
      onDueDateChange: (dd: string) => form.setValue('dueDate', dd),
      labels: form.watch('labels'),
      onLabelsChange: (labels: string[]) => form.setValue('labels', labels),
      severity: form.watch('severity'),
      onSeverityChange: (sv: BugSeverity) => form.setValue('severity', sv),
      statusOptions: ctx.statusOptions,
      priorityOptions: ctx.priorityOptions,
      members: ctx.members,
      onOpenAcceptance: ctx.onOpenAcceptance,
      acceptanceCount: ctx.criteria.length,
    };
  },
  serializeContext: (f) => {
    const v = asForm(f).getValues();
    const parts: string[] = [];
    if (v.title.trim()) parts.push(`标题=${v.title.trim()}`);
    if (v.description.trim()) parts.push(`描述=${v.description.trim()}`);
    if (v.severity) parts.push(`严重度=${v.severity}`);
    if (v.priority) parts.push(`优先级=${v.priority}`);
    if (v.dueDate) parts.push(`截止=${v.dueDate}`);
    return parts.join('、');
  },
};
