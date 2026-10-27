import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { FormDialog } from '@/components/semantic/form-dialog';
import { toast } from '@/components/ui/toast';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useCreateRegistrationInvite } from '../hooks/use-admin';
import { buildRegisterInviteLink, type RegistrationInviteItem } from '../api/admin-api';

const inviteSchema = z.object({
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  expiresInDays: z.string(),
});

type InviteValues = z.infer<typeof inviteSchema>;

/** 创建注册邀请：可选限定邮箱 + 有效期；成功后展示邀请链接
 * （批四·FormDialog 标准化迁移件 3/8——表单态走 FormDialog，结果态为互斥渲染的第二窗，共享同一 open 无缝切换） */
export function InviteCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [created, setCreated] = useState<RegistrationInviteItem | null>(null);
  const [expiresInDays, setExpiresInDays] = useState('7');
  const createInvite = useCreateRegistrationInvite();
  const { copyToClipboard, isCopied } = useCopyToClipboard({ timeout: 2000 });

  const link = created ? buildRegisterInviteLink(created.token) : '';

  return (
    <>
      <FormDialog<InviteValues>
        open={open && !created}
        onOpenChange={(next) => {
          if (!next) setCreated(null);
          onOpenChange(next);
        }}
        title={t('admin.createInvite', '邀请成员注册')}
        description={t(
          'admin.createInviteDesc',
          '生成注册邀请链接；填写邮箱时将同时发送邀请邮件（发件箱可查）。',
        )}
        schema={inviteSchema}
        defaultValues={{ email: '', expiresInDays: '7' }}
        submitLabel={t('admin.createInvite', '邀请成员注册')}
        submitting={createInvite.isPending}
        onSubmit={async (values) => {
          try {
            const invite = await createInvite.mutateAsync({
              email: values.email?.trim() || undefined,
              expiresInDays: Number(values.expiresInDays),
            });
            setExpiresInDays(values.expiresInDays);
            setCreated(invite); // 切到结果窗（FormDialog 关闭由 open&& 互斥承担）
            if (values.email?.trim()) {
              toast.success(t('admin.inviteMailQueued', '邀请邮件已加入发件箱'));
            }
          } catch (err) {
            type ApiError = { response?: { data?: { error?: { message?: string } } } };
            const apiError = err as ApiError;
            toast.error(
              apiError.response?.data?.error?.message || t('admin.inviteCreateFailed', '创建邀请失败'),
            );
            throw err; // 失败不关窗
          }
        }}
        fields={(form) => (
          <>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.inviteEmailOptional', '限定邮箱（可选）')}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="name@example.com" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    {t('admin.inviteEmailHint', '留空则任意邮箱均可凭链接注册')}
                  </p>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiresInDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.inviteExpiry', '有效期')}</FormLabel>
                  <FormControl>
                    <SelectField value={field.value} onChange={field.onChange}>
                      <SelectFieldOption value="1">1 {t('admin.days', '天')}</SelectFieldOption>
                      <SelectFieldOption value="7">7 {t('admin.days', '天')}</SelectFieldOption>
                      <SelectFieldOption value="30">30 {t('admin.days', '天')}</SelectFieldOption>
                    </SelectField>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      />

      {/* 结果态：邀请链接展示（与表单态互斥共享 open，关闭即复位） */}
      <Dialog
        open={open && !!created}
        onOpenChange={(next) => {
          if (!next) setCreated(null);
          onOpenChange(next);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.inviteCreated', '邀请已创建')}</DialogTitle>
            <DialogDescription>
              {t('admin.inviteLinkDesc', '复制以下链接发给成员，打开后即可注册。')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => copyToClipboard(link)}
            >
              {isCopied ? t('admin.copied', '已复制') : t('admin.copy', '复制')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('admin.inviteExpiresIn', {
              defaultValue: '有效期 {{days}} 天',
              days: Number(expiresInDays),
            })}
            {created?.email ? ` · ${created.email}` : ''}
          </p>
          <DialogFooter>
            <Button onClick={() => { setCreated(null); onOpenChange(false); }}>
              {t('admin.done', '完成')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
