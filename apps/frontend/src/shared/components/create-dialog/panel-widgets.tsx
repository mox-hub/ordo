/**
 * 创建面板壳级公共件——Header 窗控/类型选择器/项目面包屑、主栏标题与描述输入。
 * 从 unified-create-dialog.tsx 原地迁出；标题/描述经 adapter 驱动（titleField 名
 * 由注册表给出），消灭原五路 switch。
 */
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Edit3,
  Eye,
  Flag,
  Sparkles,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { AutoSizeTextarea } from '@/shared/components/property-panel';
import { MarkdownView } from '@/shared/components/markdown-view';
import { EntityIcon } from '@/shared/entity-icons/entity-icons';
import { cn } from '@/lib/utils';
import type { EntityAdapter, CreateType } from './entity-templates';

type AnyForm = UseFormReturn<Record<string, unknown>>;

/** 主栏标题输入（大字号无边框，面板 h1 语义档 text-2xl，§3.1 九档内合法） */
export function TitleField({ adapter, form }: { adapter: EntityAdapter; form: AnyForm }) {
  const { t } = useTranslation();
  return (
    <AutoSizeTextarea
      autoFocus
      rows={1}
      placeholder={t(`unifiedCreate.placeholder.${adapter.type}`)}
      className="w-full text-2xl font-semibold placeholder:text-muted-foreground/50 resize-none leading-tight focus-visible:ring-0"
      {...form.register(adapter.titleField)}
    />
  );
}

/** 主栏描述输入（无边框填充态；最大化时支持 Markdown 预览切换） */
export function DescriptionField({
  form,
  type,
  maximized,
  descPreview,
  onTogglePreview,
}: {
  form: AnyForm;
  type: CreateType;
  maximized?: boolean;
  descPreview?: boolean;
  onTogglePreview?: () => void;
}) {
  const { t } = useTranslation();
  const ph = t(`unifiedCreate.descHint.${type}`);
  const currentDesc = form.watch('description');
  return (
    <div className="flex-1 min-h-24 flex flex-col gap-1.5">
      {maximized && (
        <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/30 pb-1">
          <span className="font-medium text-foreground/70">
            {t('unifiedCreate.linear.description')} (Markdown)
          </span>
          <button
            type="button"
            onClick={onTogglePreview}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {descPreview ? (
              <>
                <Edit3 className="size-3" />
                <span>{t('unifiedCreate.edit')}</span>
              </>
            ) : (
              <>
                <Eye className="size-3" />
                <span>{t('unifiedCreate.preview')}</span>
              </>
            )}
          </button>
        </div>
      )}
      {maximized && descPreview ? (
        <div className="flex-1 min-h-28 rounded-lg border border-border/40 bg-muted/10 p-3 overflow-y-auto text-xs">
          {String(currentDesc ?? '').trim() ? (
            <MarkdownView content={String(currentDesc)} />
          ) : (
            <span className="text-muted-foreground/50">{t('unifiedCreate.previewEmpty')}</span>
          )}
        </div>
      ) : (
        <FillTextarea
          placeholder={ph}
          className="w-full text-xs font-normal leading-relaxed text-foreground/80 placeholder:text-muted-foreground/50 focus-visible:ring-0 flex-1 min-h-24 resize-none"
          {...form.register('description')}
        />
      )}
    </div>
  );
}

export function FillTextarea(props: React.ComponentProps<'textarea'>) {
  return (
    <Textarea
      {...props}
      className={cn(
        'field-sizing-fixed h-full bg-transparent dark:bg-transparent [background-color:transparent] !border-0 shadow-none px-2.5 py-2 rounded-md focus-visible:ring-0 focus-visible:border-transparent resize',
        props.className,
      )}
    />
  );
}

/** Header 窗控图标钮（属性栏开合/最大化/关闭） */
export function IconBtn({
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'size-7 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-foreground',
        active && 'bg-accent text-foreground',
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** 面包屑内的实体类型选择器（Ctrl+1..5 同序） */
export function TypeSelector({
  typeOrder,
  typeKinds,
  activeType,
  onChange,
}: {
  typeOrder: CreateType[];
  typeKinds: Record<CreateType, { kind: string | null }>;
  activeType: CreateType;
  onChange: (t: CreateType) => void;
}) {
  const { t } = useTranslation();
  const meta = typeKinds[activeType];
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button className="inline-flex items-center gap-1.5 px-1.5 py-1 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" />
        }
      >
        {meta.kind
          ? <EntityIcon entity={meta.kind as never} size="sm" />
          : <Sparkles className="size-3.5 text-accent-purple" />}
        <span>{t(`unifiedCreate.labels.${activeType}`)}</span>
        <ChevronDown className="size-3 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="p-1 w-44">
        <div className="flex flex-col gap-0.5">
          {typeOrder.map((ty, i) => {
            const M = typeKinds[ty];
            return (
              <button
                key={ty}
                type="button"
                onClick={() => onChange(ty)}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors text-left',
                  activeType === ty ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                )}
              >
                {M.kind
                  ? <EntityIcon entity={M.kind as never} size="sm" />
                  : <Sparkles className="size-3.5 text-accent-purple" />}
                <span className="font-medium flex-1">{t(`unifiedCreate.labels.${ty}`)}</span>
                {activeType === ty && <Check className="size-3 text-primary" />}
                <span className="text-3xs text-muted-foreground">{i + 1}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** 面包屑项目选择器（预置/切换项目，写全部实体表单） */
export function ProjectBreadcrumbSelector({
  projectId,
  projectList,
  onSelect,
}: {
  projectId: string;
  projectList: Array<{ id: string; name: string }>;
  onSelect: (pid: string) => void;
}) {
  const { t } = useTranslation();
  const current = projectList.find((p) => p.id === projectId);
  if (projectList.length === 0) return null;
  return (
    <>
      <Popover>
        <PopoverTrigger
          render={
            <button className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors max-w-36 truncate" />
          }
        >
          <Flag className="size-3 text-muted-foreground shrink-0" />
          <span className="truncate">{current?.name || t('unifiedCreate.linear.selectProject')}</span>
          <ChevronDown className="size-2.5 opacity-50 shrink-0" />
        </PopoverTrigger>
        <PopoverContent align="start" className="p-1 w-52 max-h-60 overflow-y-auto">
          <div className="flex flex-col gap-0.5">
            {projectList.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                className={cn(
                  'flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-colors text-left',
                  projectId === p.id ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted',
                )}
              >
                <span className="truncate flex-1">{p.name}</span>
                {projectId === p.id && <Check className="size-3 text-primary ml-1 shrink-0" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <ChevronRight className="size-3 opacity-40 shrink-0" />
    </>
  );
}
