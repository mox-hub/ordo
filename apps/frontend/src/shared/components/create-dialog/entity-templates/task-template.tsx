/**
 * 任务实体模板——表单值/提交/草稿回填/建议回填/属性栏/验收标准段
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
import type { TaskPriority } from '@/modules/issue/api/issue-api';
import { cn } from '@/lib/utils';
import type { CriterionItem, DraftFields, EntityAdapter, TemplateCtx, VisualOption } from './types';

export interface TaskFormValues {
  title: string;
  description: string;
  status: string;
  priority: TaskPriority;
  assigneeId: string;
  dueDate: string;
  projectId: string;
  labels: string[];
}

export const DEFAULT_TASK: TaskFormValues = {
  title: '', description: '', status: 'todo', priority: 'medium',
  assigneeId: '', dueDate: '', projectId: '', labels: [],
};

type TaskForm = UseFormReturn<TaskFormValues>;
const asForm = (f: UseFormReturn<Record<string, unknown>>) => f as unknown as TaskForm;

const submitTask = async (formRef: TaskForm, ctx: TemplateCtx) => {
  const values = formRef.getValues();
  if (!values.title.trim()) { ctx.setError(ctx.t('unifiedCreate.error.taskTitle')); return; }
  const pid = values.projectId || ctx.projectId;
  const moduleCode = ctx.resolveModuleCode(pid);
  ctx.setError(null);
  try {
    const criteriaItems = ctx.criteria
      .filter((c) => c.text.trim().length > 0)
      .map((c, idx) => ({ id: c.id, content: c.text.trim(), completed: c.completed, order: idx }));
    // legacy 单子任务（折叠卡）：提交时并入 todoItems，状态/优先级等继承主任务
    const legacySubTask = ctx.subtask.open && ctx.subtask.title.trim()
      ? [{ id: `local-${Date.now()}`, content: ctx.subtask.title.trim(), completed: false, order: criteriaItems.length }]
      : [];
    const combinedTodo = [...criteriaItems, ...legacySubTask];
    const todoItems = combinedTodo.length > 0 ? combinedTodo : undefined;
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
      type: 'task',
      todoItems,
    });
    if (resp?.id) ctx.handleSuccess('task', resp.id);
  } catch (err) {
    ctx.setError(err instanceof Error ? err.message : ctx.t('unifiedCreate.error.createFailed'));
  }
};

const applyDraft = (formRef: TaskForm, fields: DraftFields, okPriority: boolean, okStatus: boolean) => {
  formRef.setValue('title', fields.title ?? '');
  if (fields.description) formRef.setValue('description', fields.description);
  if (okPriority && fields.priority) formRef.setValue('priority', fields.priority as TaskPriority);
  if (okStatus && fields.status) formRef.setValue('status', fields.status);
  if (fields.dueDate) formRef.setValue('dueDate', fields.dueDate);
  if (fields.labels?.length) formRef.setValue('labels', fields.labels);
};

export const taskTemplate: EntityAdapter = {
  type: 'task',
  titleField: 'title',
  defaults: DEFAULT_TASK,
  hasInput: (f) => {
    const v = asForm(f).getValues();
    return Boolean(v.title.trim() || v.description.trim());
  },
  submit: (f, ctx) => submitTask(asForm(f), ctx),
  applyDraft: (f, draft) => {
    const fields = draft.fields as DraftFields;
    const okPriority = Boolean(fields.priority);
    const okStatus = Boolean(fields.status);
    applyDraft(asForm(f), fields, okPriority, okStatus);
  },
  applySuggestion: (f, s) => {
    const form = asForm(f);
    const v = s.value.trim();
    if (!v) return;
    if (s.field === 'priority') form.setValue('priority', v as TaskPriority, { shouldValidate: true });
    else if (s.field === 'labels') {
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
        <PropertyRow icon={<AlertCircle className="size-3.5" />} label={t('unifiedCreate.field.priority')}>
          <CapsuleSelect
            value={priorityVal ?? ''}
            options={ctx.priorityOptions.map((p: VisualOption) => ({
              value: p.value,
              label: p.label,
              icon: <p.icon className={cn('size-3.5', p.toneClass)} />,
            }))}
            onChange={(v) => f.setValue('priority', (v || 'medium') as TaskPriority)}
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
          <DateCapsuleField
            value={dueVal}
            onChange={(v) => f.setValue('dueDate', v)}
            placeholder={t('unifiedCreate.field.none')}
            clearLabel={t('unifiedCreate.field.clearDueDate')}
          />
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
    if (v.priority) parts.push(`优先级=${v.priority}`);
    if (v.dueDate) parts.push(`截止=${v.dueDate}`);
    return parts.join('、');
  },
};
