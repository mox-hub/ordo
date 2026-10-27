/**
 * 文档实体模板——表单值/提交/草稿回填/建议回填/属性栏
 * （逻辑自 unified-create-dialog.tsx 原地迁移，行为不变）。
 */
import { useTranslation } from 'react-i18next';
import { Flag, User } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { Capsule, CapsuleSelect, PropertyRow } from '@/shared/components/property-panel';
import type {
  DocumentCategory as DocCategory,
  DocumentStatus,
} from '@/modules/document/api/document-api';
import type { DraftFields, EntityAdapter, TemplateCtx } from './types';

export interface DocFormValues {
  title: string;
  description: string;
  category: DocCategory;
  status: DocumentStatus;
  projectId: string;
  /** 无手动入口，仅 AI 建议（create-suggestions）回填 */
  labels: string[];
}

export const DEFAULT_DOC: DocFormValues = {
  title: '', description: '', category: 'custom', status: 'draft', projectId: '', labels: [],
};

/** 文档类目 chips = 后端 DocumentCategory 真实枚举（原 spec/meeting_notes 等假值已废；label 走 i18n） */
export const DOC_CATEGORY_OPTIONS: { value: DocCategory }[] = [
  { value: 'requirement' },
  { value: 'analysis' },
  { value: 'design' },
  { value: 'api' },
  { value: 'testing' },
  { value: 'guide' },
];

/** 文档状态（J15：原 document-new-page 侧栏状态选择并入 doc 模式；archived 不可创建不列） */
export const DOC_STATUS_OPTIONS: { value: DocumentStatus }[] = [
  { value: 'draft' },
  { value: 'reviewing' },
  { value: 'published' },
];

type DocForm = UseFormReturn<DocFormValues>;
const asForm = (f: UseFormReturn<Record<string, unknown>>) => f as unknown as DocForm;

const submitDoc = async (formRef: DocForm, ctx: TemplateCtx) => {
  const values = formRef.getValues();
  if (!values.title.trim()) { ctx.setError(ctx.t('unifiedCreate.error.docTitle')); return; }
  ctx.setError(null);
  try {
    const resp = await ctx.mutations.createDocument.mutateAsync({
      title: values.title,
      summary: values.description || undefined,
      content: '',
      category: values.category,
      projectId: values.projectId || ctx.projectId || undefined,
      tags: values.labels,
    });
    // J15：CreateDocumentDto 契约无 status（服务端默认 draft），非 draft 创建后补一次更新
    if (resp?.id && values.status && values.status !== 'draft') {
      await ctx.mutations.updateDocument.mutateAsync({
        documentId: resp.id,
        data: { status: values.status },
      });
    }
    if (resp?.id) ctx.handleSuccess('doc', resp.id);
  } catch (err) {
    ctx.setError(err instanceof Error ? err.message : ctx.t('unifiedCreate.error.createFailed'));
  }
};

export const docTemplate: EntityAdapter = {
  type: 'doc',
  titleField: 'title',
  defaults: DEFAULT_DOC,
  hasInput: (f) => {
    const v = asForm(f).getValues();
    return Boolean(v.title.trim() || v.description.trim());
  },
  submit: (f, ctx) => submitDoc(asForm(f), ctx),
  applyDraft: (f, draft) => {
    const fields = draft.fields as DraftFields;
    const form = asForm(f);
    form.setValue('title', fields.title ?? '');
    if (fields.description) form.setValue('description', fields.description);
    if (fields.category) form.setValue('category', fields.category as DocCategory);
  },
  applySuggestion: (f, s) => {
    const form = asForm(f);
    const v = s.value.trim();
    if (!v) return;
    if (s.field === 'labels') {
      form.setValue('labels', v.split(/[,，、]/).map((x) => x.trim()).filter(Boolean));
    } else if (s.field === 'title' || s.field === 'name') {
      if (!form.getValues().title) form.setValue('title', v);
    }
  },
  Properties: ({ form, ctx }) => {
    const { t } = useTranslation();
    const f = asForm(form);
    const projectVal = f.watch('projectId') || ctx.projectId || '';
    const projectOptions = ctx.projectList.map((p) => ({ value: p.id, label: p.name }));
    return (
      <>
        <PropertyRow icon={<User className="size-3.5" />} label={t('unifiedCreate.field.author')}>
          <Capsule>{t('unifiedCreate.field.me')}</Capsule>
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
      </>
    );
  },
  pillsProps: (f) => {
    const form = asForm(f);
    return {
      docCategory: form.watch('category'),
      onDocCategoryChange: (cat: DocCategory) => form.setValue('category', cat),
      docStatus: form.watch('status'),
      onDocStatusChange: (s: string) => form.setValue('status', s as DocumentStatus),
      labels: form.watch('labels'),
      onLabelsChange: (labels: string[]) => form.setValue('labels', labels),
    };
  },
  serializeContext: (f) => {
    const v = asForm(f).getValues();
    const parts: string[] = [];
    if (v.title.trim()) parts.push(`标题=${v.title.trim()}`);
    if (v.description.trim()) parts.push(`摘要=${v.description.trim()}`);
    if (v.category) parts.push(`类目=${v.category}`);
    return parts.join('、');
  },
};
