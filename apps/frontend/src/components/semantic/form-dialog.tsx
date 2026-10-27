/**
 * FormDialog - 标准化实体创建/编辑对话框（统一创建面板优化批四·第 0 步）
 *
 * 面板之外 13+ 处各自为政的创建对话框的收敛承载件：把「Dialog 骨架 + RHF+Zod
 * 校验（§13.1）+ Field 结构 + 提交态（disabled+内联 Spinner，§10.6）+ 脏表单
 * 关闭确认（§20.1 同层 AlertDialog）+ §10.8 尺寸档」一次封死，消费方只声明
 * schema、字段段与提交回调，不再手写任何骨架。
 *
 * 层规则（semantic/README）：内部组合 ui/ 原子（Button/Dialog/Spinner），不反向
 * 依赖业务模块；props 面封闭（G8）——不接 className、不透传样式、不 extends
 * HTMLAttributes；字段段经 render prop 注入（消费方持 RHF 实例渲染 FormField）。
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useForm, type DefaultValues, type FieldValues, type UseFormReturn } from 'react-hook-form';
// Form = FormProvider：FormLabel/FormMessage 等经 useFormContext 取状态，必须包裹（缺它即 null 崩）
import { Form } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export interface FormDialogProps<T extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** DialogTitle 必给（§8.5）；同时承担 DialogDescription 缺省；可传图标+文案节点 */
  title: ReactNode;
  description?: string;
  /** Zod schema：唯一校验真相源，错误文案由 schema 提供（§13.4/13.5） */
  schema: ZodType<T>;
  defaultValues: DefaultValues<T>;
  /** 提交回调：抛错由消费方自行 toast；返回即视为成功关窗 */
  onSubmit: (values: T) => Promise<void> | void;
  submitLabel: string;
  /** 外部提交中态（mutation isPending）；与内部 submitting 取或 */
  submitting?: boolean;
  /** 服务端错误呈现（Alert destructive，置字段区上方） */
  submitError?: string | null;
  /** §10.8 尺寸轴：default（实体表单基线）/ wide（多卡并排才升档） */
  size?: 'default' | 'wide';
  /** 字段段：消费方经 render prop 持 RHF 实例渲染（Field/FormField 套件） */
  fields: (form: UseFormReturn<T>) => ReactNode;
  /** 关窗前脏确认文案（缺省给通用「未保存更改」口径） */
  discardTitle?: string;
  discardDescription?: string;
}

export function FormDialog<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  onSubmit,
  submitLabel,
  submitting: externalSubmitting = false,
  submitError = null,
  size = 'default',
  fields,
  discardTitle,
  discardDescription,
}: FormDialogProps<T>) {
  const { t } = useTranslation();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const form = useForm<T>({
    // zod v4 + resolvers v6：schema 声明为 ZodType<T> 时输入侧推为 unknown，
    // resolver 落型 Resolver<unknown>——单点断言对齐（schema 契约由消费方保证）
    resolver: zodResolver(schema) as unknown as import('react-hook-form').Resolver<T>,
    defaultValues,
    mode: 'onBlur',
  });

  // 打开即重置（创建态复用同一挂载；编辑态由消费方经 key 重挂载换 defaultValues）
  useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const internalSubmitting = form.formState.isSubmitting;
  const submitting = externalSubmitting || internalSubmitting;

  /** 脏表单守卫：有未提交更改先弹确认（§20.1——AlertDialog 与 Dialog 同层串行） */
  const requestClose = (next: boolean) => {
    if (!next && form.formState.isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(next);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent size={size}>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}

          <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
              onOpenChange(false);
            })}
            className="flex flex-col gap-4"
            noValidate
          >
            {submitError && (
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertCircle className="size-3.5 shrink-0" />
                <AlertDescription className="text-xs">{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-4">{fields(form)}</div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => requestClose(false)}
                disabled={submitting}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={submitting} data-ai-action="form-dialog-submit">
                {submitting && <Spinner className="size-3 text-inherit" />}
                {submitting ? t('common.saving') : submitLabel}
              </Button>
            </DialogFooter>
          </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogTitle>
            {discardTitle ?? t('common.formDialog.unsavedTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {discardDescription ?? t('common.formDialog.unsavedDesc')}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.formDialog.keepEditing')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                form.reset(defaultValues);
                onOpenChange(false);
              }}
            >
              {t('common.formDialog.discard')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
