import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { CalendarRange } from 'lucide-react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FormDialog } from '@/components/semantic/form-dialog';
import {
  useCreateIteration,
  useUpdateIteration,
} from '../hooks/use-project-tasks';
import type { IterationRef } from '../api/issue-api';

interface IterationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** 有值 = 编辑模式（PATCH /iterations/:id）；空 = 创建模式（POST /projects/:id/iterations） */
  iteration?: IterationRef | null;
  onSuccess?: (iteration: IterationRef) => void;
}

const iterationSchema = z
  .object({
    name: z.string().min(1, '迭代名称必填'),
    startDate: z.string().min(1, '开始日期必填'),
    endDate: z.string().min(1, '结束日期必填'),
  })
  .superRefine((values, ctx) => {
    if (values.endDate && values.startDate && values.endDate < values.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: '结束日期不能早于开始日期' });
    }
  });

type IterationFormValues = z.infer<typeof iterationSchema>;

/** date-only 输入值：ISO 截断到 yyyy-MM-dd（Input type="date" 形态） */
function toInputDate(value?: string | null): string {
  return value ? value.slice(0, 10) : '';
}

/**
 * 迭代创建/编辑对话框（P1-19；批四·FormDialog 标准化迁移件 5/8）。
 * 表单：名称 + 起止日期；RHF rules → Zod schema（§13.1），缓存失效与错误 toast
 * 仍收敛在 hooks（use-project-tasks.ts）。父组件以 `key={iteration?.id ?? 'new'}`
 * 挂载保证创建/编辑切换时表单重置（FormDialog 打开即 reset 同效兜底）。
 */
export function IterationFormDialog({
  open,
  onOpenChange,
  projectId,
  iteration,
  onSuccess,
}: IterationFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!iteration;
  // 缓存失效与错误 toast 收敛在 hooks（use-project-tasks.ts），成功后的关单/重置在组件内
  const createIteration = useCreateIteration(projectId);
  const updateIteration = useUpdateIteration(projectId);
  const isPending = createIteration.isPending || updateIteration.isPending;

  return (
    <FormDialog<IterationFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-accent-purple" />
          {isEdit
            ? t('project.milestonesPage.editIteration', '编辑迭代')
            : t('project.milestonesPage.newIteration', '新建迭代')}
        </span>
      }
      description={t(
        'project.milestonesPage.iterationFormDesc',
        '按日期区间划分时间段，工单可归属到迭代跟进。',
      )}
      schema={iterationSchema}
      defaultValues={{
        name: iteration?.name ?? '',
        startDate: toInputDate(iteration?.startDate),
        endDate: toInputDate(iteration?.endDate),
      }}
      submitLabel={isEdit ? t('common.save', '保存') : t('common.create', '创建')}
      submitting={isPending}
      onSubmit={async (values) => {
        const request = isEdit
          ? updateIteration.mutateAsync({
              iterationId: iteration.id,
              data: values,
            })
          : createIteration.mutateAsync(values);
        try {
          const saved = await request;
          onSuccess?.(saved);
        } catch {
          // 错误已由 hooks toast；抛出阻断 FormDialog 关窗
          throw new Error('iteration-submit-failed');
        }
      }}
      fields={(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('project.milestonesPage.iterationName', '迭代名称')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('project.milestonesPage.iterationNamePlaceholder', '例如：Sprint 1')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('project.milestonesPage.iterationStartDate', '开始日期')}</FormLabel>
                  <FormControl>
                    <Input type="date" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('project.milestonesPage.iterationEndDate', '结束日期')}</FormLabel>
                  <FormControl>
                    <Input type="date" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      )}
    />
  );
}
