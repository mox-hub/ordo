/**
 * AcceptanceFormDialog — 新建验收契约弹窗（批四·FormDialog 标准化迁移件 4/8）
 * 选择任务 + 完成契约类型（可自动推断）+ 描述；提交 POST /acceptance。
 * 裸 useState 手写校验 → semantic/form-dialog（RHF+Zod §13.1）。
 */
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { SelectField } from '@/components/ui/select-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormDialog } from '@/components/semantic/form-dialog';
import { toast } from '@/components/ui/toast';
import { useAllTasks } from '@/modules/issue/hooks/use-project-tasks';
import { useCreateAcceptance } from '../hooks/use-acceptance';
import type { CompletionType } from '../api/acceptance-api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 预选任务（任务页"生成验收契约"入口使用） */
  defaultTaskId?: string;
  onSuccess?: (acceptanceId: string) => void;
}

const COMPLETION_TYPES: Array<CompletionType | 'auto'> = [
  'auto',
  'artifact',
  'pr',
  'test_report',
  'document',
];

const acceptanceSchema = z.object({
  issueId: z.string().min(1, '请选择任务'),
  completionType: z.string(),
  title: z.string(),
  description: z.string(),
});

type AcceptanceValues = z.infer<typeof acceptanceSchema>;

export function AcceptanceFormDialog({
  open,
  onOpenChange,
  defaultTaskId,
  onSuccess,
}: Props) {
  const { t } = useTranslation();
  const { data: tasksData } = useAllTasks({ pageSize: 1000 });
  const createAcceptance = useCreateAcceptance();
  const availableTasks = (tasksData?.data ?? []).filter((task) => !!task.projectId);

  return (
    <FormDialog<AcceptanceValues>
      open={open}
      onOpenChange={onOpenChange}
      title={t('acceptance.form.title')}
      description={t('acceptance.emptyHint')}
      // key：defaultTaskId 变化时重挂载换预置（FormDialog 打开即 reset defaultValues 同效）
      schema={acceptanceSchema}
      defaultValues={{ issueId: defaultTaskId ?? '', completionType: 'auto', title: '', description: '' }}
      submitLabel={t('common.create')}
      submitting={createAcceptance.isPending}
      onSubmit={async (values) => {
        try {
          const created = await createAcceptance.mutateAsync({
            issueId: values.issueId,
            title: values.title.trim() || undefined,
            description: values.description.trim() || undefined,
            completionType: values.completionType === 'auto' ? undefined : (values.completionType as CompletionType),
          });
          toast.success(t('common.success'));
          onSuccess?.(created.id);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : String(err));
          throw err; // 失败不关窗
        }
      }}
      fields={(form) => (
        <>
          <FormField
            control={form.control}
            name="issueId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('acceptance.form.task')}</FormLabel>
                <FormControl>
                  <SelectField value={field.value} onChange={field.onChange} className="w-full">
                    <option value="">{t('acceptance.form.taskPlaceholder')}</option>
                    {availableTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </SelectField>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="completionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('acceptance.form.completionType')}</FormLabel>
                <FormControl>
                  <SelectField value={field.value} onChange={field.onChange} className="w-full">
                    {COMPLETION_TYPES.map((ty) => (
                      <option key={ty} value={ty}>
                        {ty === 'auto'
                          ? t('acceptance.form.completionTypeHint')
                          : t(`acceptance.completionType.${ty}`)}
                      </option>
                    ))}
                  </SelectField>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('acceptance.form.name')}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} />
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
                <FormLabel>{t('acceptance.form.description')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    className="min-h-20"
                  />
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
