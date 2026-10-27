/**
 * TeamCreateDialog - 新建团队弹窗（批四·FormDialog 标准化迁移件 1/8）
 *
 * 从 teams-page 抽出：名称（自动生成 slug）+ Slug 双字段表单。
 * 批四迁移：裸 useState 手写校验 → semantic/form-dialog（RHF+Zod §13.1 +
 * 提交态 §10.6 + 脏确认 §20.1 + §10.8 尺寸档），业务逻辑（slug 自动生成、
 * 错误 toast）保持不变。
 */
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FormDialog } from '@/components/semantic/form-dialog';
import { toast } from '@/components/ui/toast';
import { useCreateTeam } from '../hooks';

const createTeamSchema = z.object({
  name: z.string().min(1, '请输入团队名称'),
  slug: z
    .string()
    .min(1, '请输入 Slug')
    .regex(/^[a-z0-9-]+$/, 'Slug 只能包含小写字母、数字与连字符'),
});

type CreateTeamValues = z.infer<typeof createTeamSchema>;

export interface TeamCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamCreateDialog({ open, onOpenChange }: TeamCreateDialogProps) {
  const { t } = useTranslation();
  const createTeam = useCreateTeam();

  return (
    <FormDialog<CreateTeamValues>
      open={open}
      onOpenChange={onOpenChange}
      title={t('teams.create.title', '新建团队')}
      description={t('teams.create.description', '团队可跨项目共享，便于统一管理成员与项目绑定。')}
      schema={createTeamSchema}
      defaultValues={{ name: '', slug: '' }}
      submitLabel={t('teams.create.submit', '创建团队')}
      submitting={createTeam.isPending}
      onSubmit={async (values) => {
        try {
          await createTeam.mutateAsync({ name: values.name, slug: values.slug });
          toast.success(t('teams.create.success', '团队已创建'));
        } catch (err) {
          type ApiError = { response?: { data?: { error?: { message?: string } } } };
          const apiError = err as ApiError;
          toast.error(apiError.response?.data?.error?.message || t('teams.create.failed', '创建团队失败'));
          throw err; // 阻断 FormDialog 关窗（失败不假装成功）
        }
      }}
      fields={(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('teams.create.name', '团队名称')} *</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('teams.create.namePlaceholder', '如: 核心研发团队')}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      // 名称 → slug 自动生成（用户已手改 slug 时不再覆盖）
                      if (!form.getValues('slug')) {
                        const auto = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-+|-+$/g, '');
                        form.setValue('slug', auto, { shouldValidate: form.formState.isSubmitted });
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug *</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('teams.create.slugPlaceholder', '如: core-team')}
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
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
