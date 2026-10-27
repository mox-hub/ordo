/**
 * 里程碑实体模板——表单值/提交/草稿回填/建议回填/属性栏
 * （逻辑自 unified-create-dialog.tsx 原地迁移，行为不变）。
 */
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Flag } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import {
  CapsuleSelect,
  DateCapsuleField,
  PropertyRow,
} from '@/shared/components/property-panel';
import type { CreateMilestoneRequest } from '@/modules/project/api/project-api';
import type { DraftFields, EntityAdapter, TemplateCtx } from './types';

export interface MilestoneFormValues {
  name: string;
  description: string;
  projectId: string;
  status: string;
  dueDate: string;
}

export const DEFAULT_MILESTONE: MilestoneFormValues = {
  name: '', description: '', projectId: '', status: 'planned', dueDate: '',
};

type MilestoneForm = UseFormReturn<MilestoneFormValues>;
const asForm = (f: UseFormReturn<Record<string, unknown>>) => f as unknown as MilestoneForm;

const submitMilestone = async (formRef: MilestoneForm, ctx: TemplateCtx) => {
  const values = formRef.getValues();
  if (!values.name.trim()) { ctx.setError(ctx.t('unifiedCreate.error.milestoneName')); return; }
  const pid = values.projectId || ctx.projectId;
  if (!pid) { ctx.setError(ctx.t('unifiedCreate.error.projectRequired')); return; }
  ctx.setError(null);
  try {
    const payload: CreateMilestoneRequest = {
      name: values.name,
      description: values.description || undefined,
      targetDate: values.dueDate || null,
      status: values.status,
    };
    const resp = await ctx.mutations.createMilestone.mutateAsync(payload);
    if (resp?.id) ctx.handleSuccess('milestone', resp.id);
  } catch (err) {
    ctx.setError(err instanceof Error ? err.message : ctx.t('unifiedCreate.error.createFailed'));
  }
};

export const milestoneTemplate: EntityAdapter = {
  type: 'milestone',
  titleField: 'name',
  defaults: DEFAULT_MILESTONE,
  hasInput: (f) => {
    const v = asForm(f).getValues();
    return Boolean(v.name.trim() || v.description.trim());
  },
  submit: (f, ctx) => submitMilestone(asForm(f), ctx),
  applyDraft: (f, draft) => {
    const fields = draft.fields as DraftFields;
    const form = asForm(f);
    form.setValue('name', fields.title ?? '');
    if (fields.description) form.setValue('description', fields.description);
    if (fields.dueDate) form.setValue('dueDate', fields.dueDate);
  },
  applySuggestion: (f, s) => {
    const form = asForm(f);
    const v = s.value.trim();
    if (!v) return;
    if (s.field === 'dueDate') form.setValue('dueDate', v);
    else if (s.field === 'title' || s.field === 'name') {
      if (!form.getValues().name) form.setValue('name', v);
    }
  },
  Properties: ({ form, ctx }) => {
    const { t } = useTranslation();
    const f = asForm(form);
    const projectOptions = ctx.projectList.map((p) => ({ value: p.id, label: p.name }));
    return (
      <>
        <PropertyRow icon={<Flag className="size-3.5" />} label={t('unifiedCreate.field.project')}>
          <CapsuleSelect
            value={ctx.activeProjectId}
            options={projectOptions}
            onChange={(v) => {
              f.setValue('projectId', v);
            }}
            active={!!ctx.activeProjectId}
            placeholder={t('unifiedCreate.linear.selectProject')}
          />
        </PropertyRow>
        <PropertyRow icon={<CalendarIcon className="size-3.5" />} label={t('unifiedCreate.field.targetDate')}>
          <DateCapsuleField
            value={f.watch('dueDate') ?? ''}
            onChange={(v) => f.setValue('dueDate', v)}
            placeholder={t('unifiedCreate.field.none')}
            clearLabel={t('unifiedCreate.field.clearDueDate')}
          />
        </PropertyRow>
      </>
    );
  },
  pillsProps: (f) => {
    const form = asForm(f);
    return {
      milestoneStatus: form.watch('status'),
      onMilestoneStatusChange: (ms: string) => form.setValue('status', ms),
      dueDate: form.watch('dueDate'),
      onDueDateChange: (dd: string) => form.setValue('dueDate', dd),
    };
  },
  serializeContext: (f) => {
    const v = asForm(f).getValues();
    const parts: string[] = [];
    if (v.name.trim()) parts.push(`里程碑名=${v.name.trim()}`);
    if (v.description.trim()) parts.push(`描述=${v.description.trim()}`);
    if (v.dueDate) parts.push(`目标日期=${v.dueDate}`);
    return parts.join('、');
  },
};
