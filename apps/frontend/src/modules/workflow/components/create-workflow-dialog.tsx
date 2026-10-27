/**
 * CreateWorkflowDialog - 新建工作流（批四·FormDialog 标准化迁移件 6/8）
 *
 * 从 workflow-list-page 内联定义抽出；裸 useState → semantic/form-dialog
 * （RHF+Zod §13.1）。AI 草拟步骤（workflow-draft 静默通道）保留：草拟产物
 * steps 是表单外伴随状态（提交必需），name/description 经 form 实例回填。
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FormDialog } from '@/components/semantic/form-dialog';
import { toast } from '@/components/ui/toast';
import { useCreateWorkflow } from '../hooks/use-workflows';
import { useWorkflowDraft } from '../hooks/use-workflow-draft';

const createWorkflowSchema = z.object({
  key: z
    .string()
    .min(1, '请输入工作流 key')
    .regex(/^[a-z0-9-]+$/, 'key 只能包含小写字母、数字与连字符'),
  name: z.string().min(1, '请输入工作流名称'),
  description: z.string().optional(),
});

type CreateWorkflowValues = z.infer<typeof createWorkflowSchema>;

export interface CreateWorkflowDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateWorkflowDialog({ open, onClose }: CreateWorkflowDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateWorkflow();
  const draft = useWorkflowDraft();

  // AI 草拟伴随状态：prompt 输入与产物 steps（非表单字段，提交必需）
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSteps, setAiSteps] = useState<Array<Record<string, unknown>>>([]);

  const handleDraft = (form: UseFormReturn<CreateWorkflowValues>) => {
    if (!aiPrompt.trim() || draft.isPending) return;
    draft.mutate(
      { description: aiPrompt.trim() },
      {
        onSuccess: (result) => {
          if (!form.getValues('name')) form.setValue('name', result.name);
          if (!form.getValues('description')) form.setValue('description', result.description);
          setAiSteps(result.steps);
          toast.success(t('workflow.createDialog.drafted'));
        },
      },
    );
  };

  return (
    <FormDialog<CreateWorkflowValues>
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setAiPrompt('');
          setAiSteps([]);
          onClose();
        }
      }}
      title={t('workflow.createDialog.title')}
      description={t('workflow.createDialog.desc')}
      schema={createWorkflowSchema}
      defaultValues={{ key: '', name: '', description: '' }}
      submitLabel={t('workflow.createDialog.save')}
      submitting={create.isPending}
      onSubmit={async (values) => {
        if (aiSteps.length === 0) {
          toast.error(t('workflow.createDialog.required'));
          throw new Error('workflow-steps-required'); // 阻断关窗
        }
        try {
          const res = await create.mutateAsync({
            key: values.key.trim(),
            name: values.name.trim(),
            description: values.description?.trim() || undefined,
            definition: { version: 1, steps: aiSteps },
          });
          toast.success(t('workflow.createDialog.created'));
          navigate(`/app/workflows/${res.id}`);
        } catch (err) {
          toast.error((err as Error).message || t('workflow.createDialog.failed'));
          throw err;
        }
      }}
      fields={(form) => (
        <>
          <div className="space-y-1.5 rounded-lg border border-accent-purple/30 bg-accent-purple/5 p-3">
            <label className="flex items-center gap-1.5 text-xs font-medium text-content-text">
              <Sparkles className="size-3.5 text-accent-purple" />
              {t('workflow.createDialog.aiLabel')}
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={2}
              placeholder={t('workflow.createDialog.aiPlaceholder')}
              className="w-full resize-y rounded-lg border border-border bg-content-bg px-3 py-2 text-xs text-content-text outline-none transition-colors placeholder:text-content-text-muted focus:border-accent-blue/60"
              data-ai="workflow.aiPrompt"
            />
            <div className="flex items-center justify-between">
              <span className="text-2xs text-content-text-muted">
                {aiSteps.length > 0
                  ? t('workflow.createDialog.draftedSteps', { count: aiSteps.length })
                  : t('workflow.createDialog.aiHint')}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={draft.isPending || !aiPrompt.trim()}
                onClick={() => handleDraft(form)}
                data-ai="workflow.aiDraft"
              >
                <Sparkles
                  className={cn(
                    'mr-1 size-3 text-accent-purple',
                    draft.isPending && 'animate-pulse',
                  )}
                />
                {draft.isPending ? t('workflow.createDialog.drafting') : t('workflow.createDialog.draft')}
              </Button>
            </div>
          </div>

          <FormField
            control={form.control}
            name="key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('workflow.createDialog.keyLabel')}</FormLabel>
                <FormControl>
                  <Input placeholder="weekly-report" className="h-8 font-mono text-xs" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('workflow.createDialog.nameLabel')}</FormLabel>
                <FormControl>
                  <Input className="h-8 text-xs" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('workflow.createDialog.descLabel')}</FormLabel>
                <FormControl>
                  <Input className="h-8 text-xs" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    />
  );
}
