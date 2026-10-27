import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { FormDialog } from '@/components/semantic/form-dialog';
import { toast } from '@/components/ui/toast';
import { useCreateAdminUser } from '../hooks/use-admin';
import type { CreateAdminUserResponse } from '../api/admin-api';

const createUserSchema = z.object({
  displayName: z.string().min(1, '请输入姓名'),
  email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
  username: z.string().optional(),
  role: z.enum(['user', 'admin']),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

/** 直接创建成员账号：系统生成随机密码，成功后一次性展示（批四·FormDialog 标准化迁移件 2/8） */
export function UserCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 创建成功（携带一次性密码，由父级弹窗展示） */
  onCreated: (res: CreateAdminUserResponse) => void;
}) {
  const { t } = useTranslation();
  const createUser = useCreateAdminUser();

  return (
    <FormDialog<CreateUserValues>
      open={open}
      onOpenChange={onOpenChange}
      title={t('admin.createUser', '创建成员账号')}
      description={t(
        'admin.createUserDesc',
        '直接生成登录账号并同步创建成员档案，初始密码由系统随机生成。',
      )}
      schema={createUserSchema}
      defaultValues={{ displayName: '', email: '', username: '', role: 'user' }}
      submitLabel={t('admin.createUser', '创建成员账号')}
      submitting={createUser.isPending}
      onSubmit={async (values) => {
        try {
          const res = await createUser.mutateAsync({
            displayName: values.displayName.trim(),
            email: values.email.trim(),
            username: values.username?.trim() || undefined,
            role: values.role,
          });
          toast.success(
            t('admin.userCreated', '账号已创建：{{name}}', { name: res.user.displayName }),
          );
          onCreated(res);
        } catch (err) {
          type ApiError = { response?: { data?: { error?: { message?: string } } } };
          const apiError = err as ApiError;
          toast.error(
            apiError.response?.data?.error?.message || t('admin.userCreateFailed', '创建账号失败'),
          );
          throw err; // 失败不关窗
        }
      }}
      fields={(form) => (
        <>
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.displayName', '姓名')} *</FormLabel>
                <FormControl>
                  <Input placeholder={t('admin.displayNamePlaceholder', '如: 张三')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.email', '邮箱')} *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="name@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.usernameOptional', '登录名（可选）')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('admin.usernamePlaceholder', '缺省由邮箱派生')} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.role', '角色')}</FormLabel>
                  <FormControl>
                    <SelectField value={field.value} onChange={field.onChange}>
                      <SelectFieldOption value="user">
                        {t('admin.roleUser', '普通成员')}
                      </SelectFieldOption>
                      <SelectFieldOption value="admin">
                        {t('admin.roleAdmin', '管理员')}
                      </SelectFieldOption>
                    </SelectField>
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
