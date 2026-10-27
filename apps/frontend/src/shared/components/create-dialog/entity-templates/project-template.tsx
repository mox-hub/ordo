/**
 * 项目实体模板——表单值/提交/grill 访谈接管/草稿回填/建议回填/属性栏
 * （逻辑自 unified-create-dialog.tsx 原地迁移，行为不变）。
 */
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { CapsuleSelect, PropertyRow } from '@/shared/components/property-panel';
import { GrillInterview } from '@/modules/project/components/grill/grill-interview';
import { buildGrillMinutes } from '@/modules/project/components/grill/grill-minutes';
import type { GrillSummary } from '@/modules/project/hooks/use-grill';
import { ProjectSourceTabs } from './project-source-tabs';
import type {
  CreateProjectRequest,
  ProjectPriority,
  ProjectType,
  ProjectVisibility,
} from '@/modules/project/api/project-api';
import type { DocumentCategory as DocCategory } from '@/modules/document/api/document-api';
import type { DraftFields, EntityAdapter, TemplateCtx } from './types';

export interface ProjectFormValues {
  name: string;
  description: string;
  visibility: ProjectVisibility;
  priority: ProjectPriority;
}

export const DEFAULT_PROJECT: ProjectFormValues = {
  name: '', description: '', visibility: 'internal', priority: 'medium',
};

type ProjectForm = UseFormReturn<ProjectFormValues>;
const asForm = (f: UseFormReturn<Record<string, unknown>>) => f as unknown as ProjectForm;

const submitProject = async (formRef: ProjectForm, ctx: TemplateCtx) => {
  const values = formRef.getValues();
  if (!values.name.trim()) { ctx.setError(ctx.t('unifiedCreate.error.projectName')); return; }
  ctx.setError(null);
  try {
    const payload: CreateProjectRequest = {
      name: values.name,
      description: values.description || undefined,
      type: 'team' as ProjectType,
      visibility: values.visibility,
      priority: values.priority,
    };
    const resp = await ctx.mutations.createProject.mutateAsync(payload);
    if (resp?.id) {
      ctx.handleSuccess('project', resp.id);
      // 统一进项目初始化页：绑定工作区目录 + 种生契约三件套 + 下一步引导
      // （导入已有项目的接入向导入口保留在 init 页引导卡）
      ctx.navigate(`/app/projects/${resp.id}/init`);
    }
  } catch (err) {
    ctx.setError(err instanceof Error ? err.message : ctx.t('unifiedCreate.error.createFailed'));
  }
};

/** CAP-P-01 AI 代理模式：grill 摘要确认后直接创建——落需求澄清纪要文档 + 跳 init 自动挂载 */
const submitProjectFromGrill = async (summary: GrillSummary, formRef: ProjectForm, ctx: TemplateCtx) => {
  ctx.setError(null);
  try {
    const payload: CreateProjectRequest = {
      name: summary.name.trim(),
      description: summary.description.trim() || undefined,
      type: 'team' as ProjectType,
      visibility: formRef.getValues().visibility ?? 'private',
      priority: formRef.getValues().priority ?? 'medium',
    };
    const resp = await ctx.mutations.createProject.mutateAsync(payload);
    if (resp?.id) {
      // grill 产出持久化：需求澄清纪要文档（失败不阻断建项）
      try {
        await ctx.mutations.createDocument.mutateAsync({
          title: `需求澄清纪要 · ${summary.name.trim()}`,
          summary: summary.description.trim() || 'AI 需求拷问产出的澄清纪要',
          content: buildGrillMinutes(summary),
          category: 'requirement' as DocCategory,
          projectId: resp.id,
        });
      } catch { /* 纪要落库失败不阻断建项 */ }
      ctx.handleSuccess('project', resp.id);
      ctx.navigate(`/app/projects/${resp.id}/init?grilled=1`, {
        state: { grillSummary: summary },
      });
    }
  } catch (err) {
    ctx.setError(err instanceof Error ? err.message : ctx.t('unifiedCreate.error.createFailed'));
  }
};

export const projectTemplate: EntityAdapter = {
  type: 'project',
  titleField: 'name',
  defaults: DEFAULT_PROJECT,
  hasInput: (f) => {
    const v = asForm(f).getValues();
    return Boolean(v.name.trim() || v.description.trim());
  },
  submit: (f, ctx) => submitProject(asForm(f), ctx),
  applyDraft: (f, draft) => {
    const fields = draft.fields as DraftFields;
    const form = asForm(f);
    form.setValue('name', fields.title ?? '');
    if (fields.description) form.setValue('description', fields.description);
  },
  applySuggestion: (f, s) => {
    const form = asForm(f);
    const v = s.value.trim();
    if (!v) return;
    if (s.field === 'priority') form.setValue('priority', v as ProjectPriority, { shouldValidate: true });
    else if (s.field === 'title' || s.field === 'name') {
      if (!form.getValues().name) form.setValue('name', v);
    }
  },
  Properties: ({ form, ctx }) => {
    const { t } = useTranslation();
    const f = asForm(form);
    const priorityVal = f.watch('priority') ?? 'medium';
    return (
      <PropertyRow icon={<AlertCircle className="size-3.5" />} label={t('unifiedCreate.field.priority')}>
        <CapsuleSelect
          value={priorityVal}
          options={ctx.priorityOptions.map((p) => ({
            value: p.value,
            label: p.label,
            icon: <p.icon className="size-3.5" />,
          }))}
          onChange={(v) => f.setValue('priority', (v || 'medium') as ProjectPriority)}
          active
        />
      </PropertyRow>
    );
  },
  pillsProps: (f) => {
    const form = asForm(f);
    return {
      projectPriority: form.watch('priority'),
      onProjectPriorityChange: (pp: string) => form.setValue('priority', pp as ProjectPriority),
    };
  },
  renderTakeover: (ctx, helpers) => (
    <GrillInterview
      onConfirm={(summary) => void submitProjectFromGrill(summary, asForm(helpers.form), ctx)}
      onFallback={helpers.onFallback}
      confirmPending={ctx.mutations.createProject.isPending}
    />
  ),
  serializeContext: (f) => {
    const v = asForm(f).getValues();
    const parts: string[] = [];
    if (v.name.trim()) parts.push(`项目名=${v.name.trim()}`);
    if (v.description.trim()) parts.push(`描述=${v.description.trim()}`);
    return parts.join('、');
  },
};
