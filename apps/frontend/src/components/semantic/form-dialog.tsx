/**
 * FormDialog —— 主仓 i18n 适配层。
 *
 * 对话框/RHF/Zod 实现已迁至 @mox-hub/patterns；本文件只注入 react-i18next
 * 文案，业务调用方 API 不变。
 */
import { useTranslation } from 'react-i18next';
import type { FieldValues } from 'react-hook-form';
import {
  FormDialog as PatternFormDialog,
  type FormDialogProps,
} from '@mox-hub/patterns/components/form-dialog';

export type { FormDialogProps } from '@mox-hub/patterns/components/form-dialog';

export function FormDialog<T extends FieldValues>(props: FormDialogProps<T>) {
  const { t } = useTranslation();
  return (
    <PatternFormDialog
      {...props}
      labels={{
        cancel: t('common.cancel'),
        saving: t('common.saving'),
        unsavedTitle: t('common.formDialog.unsavedTitle'),
        unsavedDesc: t('common.formDialog.unsavedDesc'),
        keepEditing: t('common.formDialog.keepEditing'),
        discard: t('common.formDialog.discard'),
        ...props.labels,
      }}
    />
  );
}
