/**
 * UnifiedCreateDialog - 统一创建对话框主壳（CAP-A-18 / 批二拆分）
 *
 * 位置演进：原 components/ui/unified-create-dialog（2026-09-15 迁出 ui 原子层——
 * 本组件是跨模块业务复合件，反向依赖 issue/project/document/assistant 等模块 hooks，
 * 违反「components/ui 只放 UI 原子」的放置规范；grill 引用为 shared→module 既有惯例方向，
 * 保留一条并在此注明）。
 *
 * 批二拆分（方案 docs/roadmap/统一创建面板优化方案-2026-10-27.md §四）：
 * 主壳只保留 Dialog 骨架/Header/Footer、双模式态、快捷键、脏确认与实体分发；
 * 每实体的表单值/提交/草稿回填/建议回填/属性栏/主栏特有段聚合进
 * entity-templates/*-template.tsx（EntityAdapter 注册表），主壳零 switch 分发。
 * 死件清偿：Paperclip 假按钮与 dispatchStrategy/AgentPresenceBanner（纯 UI 摆设，
 * 用户裁决移除，随执行审批链支持后回归）已删。
 *
 * 结构:
 * ┌─────────────────────────────────────────────────────────┐
 * │  Ordo  ›  [Task ▾]                    [panel][max][×]│  Header
 * ├──────────────────────────────────────────┬──────────────┤
 * │  Title (大字号)                          │ Properties   │
 * │  Description (无边框)                    │ ┌──────────┐ │
 * │  Extra fields (验收标准/三分流)           │ │ 模板属性  │ │
 * │  ── Suggestions ──                       │ └──────────┘ │
 * │                                          │ Suggestions  │
 * ├──────────────────────────────────────────┴──────────────┤
 * │  [Create more ⬜]              [Shuttle][Cancel][Create]│  Footer
 * └─────────────────────────────────────────────────────────┘
 *
 * 胶囊 (Capsule) 等原子一律取自 shared/components/property-panel（单一来源，
 * 与详情页属性面板共版，禁止在本文件重写原子）；AI 建议卡为业务组件见 ./suggestions-card。
 */
import * as React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PropsCard, SubTaskCard } from '@/shared/components/property-panel';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { useCreateProject } from '@/modules/project/hooks/use-project-mutations';
import { useProjectModules } from '@/modules/project/hooks/use-project-modules';
import { useCreateTask } from '@/modules/issue/hooks/use-project-tasks';
import { useCreateProjectMilestone } from '@/modules/project/hooks/use-project-dashboard-summary';
import { useCreateDocument, useUpdateDocument } from '@/modules/document/hooks/use-document-mutations';
import { listProjectMembers } from '@/modules/team-member/api/team-member-api';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { useAppStore } from '@/infrastructure/store/app-store';
import { EntityIcon, type EntityKind } from '@/shared/entity-icons/entity-icons';
import {
  TASK_STATUS_VISUALS,
  PRIORITY_VISUALS,
  TONE_TEXT_CLASS,
} from '@/shared/status/status-visuals';
import {
  useSilentCreateSuggestions,
  parseCreateSuggestions,
  useSilentCreateDraft,
  parseCreateDraft,
  type CreateDraft,
  type CreateSuggestion,
} from '@/modules/assistant/hooks/use-silent-ai';
import type { TaskPriority } from '@/modules/issue/api/issue-api';
import {
  X,
  Check,
  ChevronDown,
  ChevronRight,
  PanelRightClose,
  PanelRight,
  Maximize2,
  Minimize2,
  Sparkles,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { SuggestionsCard } from './suggestions-card';
import { ModeShuttleButton } from './mode-shuttle-button';
import { PropertyPillsBar } from './property-pills-bar';
import { ProjectSourceTabs } from './entity-templates/project-source-tabs';
import {
  DescriptionField,
  IconBtn,
  ProjectBreadcrumbSelector,
  TitleField,
  TypeSelector,
} from './panel-widgets';
import { ENTITY_ADAPTERS, ADAPTER_BY_TYPE, type CreateType, type TemplateCtx } from './entity-templates';

export type { CreateType } from './entity-templates';

export interface UnifiedCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: CreateType;
  projectId?: string;
  /** 打开时预置的任务负责人（成员 id，用于成员卡「派发任务」等入口） */
  defaultAssigneeId?: string;
  onSuccess?: (type: CreateType, id: string) => void;
}

type AnyForm = UseFormReturn<Record<string, unknown>>;

// ============================================================================
// Main component
// ============================================================================

export function UnifiedCreateDialog({
  open, onOpenChange, defaultType = 'task', projectId, defaultAssigneeId, onSuccess,
}: UnifiedCreateDialogProps) {
  const [activeType, setActiveType] = useState<CreateType>(defaultType);
  const [error, setError] = useState<string | null>(null);

  // layout state
  const [showProps, setShowProps] = useState(false);
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [createMore, setCreateMore] = useState(false);

  // subtask state（task 折叠子任务卡，提交时并入 todoItems）
  const [subOpen, setSubOpen] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [subDesc, setSubDesc] = useState('');

  // 🎯 验收标准列表状态（CAP-B-01/B-02 治理闭环；task/bug 共用）
  const [criteria, setCriteria] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  // 放大态：描述 Markdown 预览模式切换
  const [descPreview, setDescPreview] = useState(false);

  // AI 代理：自然语言描述 → create-draft 草稿 → 人确认后落库
  const [aiPrompt, setAiPrompt] = useState('');
  // 顶级双界面（CAP-A-18）：manual=结构化表单 / ai=自然语言草稿，平级切换
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [draft, setDraft] = useState<CreateDraft | null>(null);
  // Esc/关闭时的脏表单保护
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const openAssistantWithDraft = useAppStore((s) => s.openAssistantWithDraft);
  // 连续创建：重置后焦点回归标题输入框
  const mainColRef = useRef<HTMLDivElement>(null);

  // forms（实例由壳创建——reset/预置/连续创建需要跨实体操作；模板经 adapter 读写）
  const taskForm = useForm<Record<string, unknown>>({ defaultValues: ADAPTER_BY_TYPE.task.defaults as Record<string, unknown> });
  const bugForm = useForm<Record<string, unknown>>({ defaultValues: ADAPTER_BY_TYPE.bug.defaults as Record<string, unknown> });
  const docForm = useForm<Record<string, unknown>>({ defaultValues: ADAPTER_BY_TYPE.doc.defaults as Record<string, unknown> });
  const projectForm = useForm<Record<string, unknown>>({ defaultValues: ADAPTER_BY_TYPE.project.defaults as Record<string, unknown> });
  const milestoneForm = useForm<Record<string, unknown>>({ defaultValues: ADAPTER_BY_TYPE.milestone.defaults as Record<string, unknown> });
  const forms = useMemo<Record<CreateType, AnyForm>>(() => ({
    task: taskForm, bug: bugForm, doc: docForm, project: projectForm, milestone: milestoneForm,
  }), [taskForm, bugForm, docForm, projectForm, milestoneForm]);

  const adapter = ADAPTER_BY_TYPE[activeType];
  const activeForm = forms[activeType];

  // data hooks
  const { data: projectListResp } = useProjectList();
  const projectList = useMemo(() => projectListResp?.items ?? [], [projectListResp]);
  const createTask = useCreateTask();
  const createProject = useCreateProject();

  // 里程碑创建绑定表单所选项目（原绑死 projectId prop——Dock 全局入口无 prop 时提交必炸）
  const milestoneProjectId = String(milestoneForm.watch('projectId') || '') || projectId || '';
  const createMilestone = useCreateProjectMilestone(milestoneProjectId || undefined);
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();

  const { t } = useTranslation();
  // 状态/优先级选项派生自 status-visuals 注册表（批2：禁本地枚举与原始色，label 走 i18n）
  const statusOptions = useMemo(() => Object.entries(TASK_STATUS_VISUALS).map(([value, v]) => ({
    value,
    label: t(v.labelKey),
    icon: v.icon,
    toneClass: TONE_TEXT_CLASS[v.tone],
    spin: value === 'in_progress',
  })), [t]);
  const priorityOptions = useMemo(() => PRIORITY_ORDER.map((value) => {
    const v = PRIORITY_VISUALS[value];
    return { value, label: t(v.labelKey), icon: v.icon, toneClass: TONE_TEXT_CLASS[v.tone] };
  }), [t]);

  // 项目来源分流（v2 纪要切片 1）：导入已有项目 → 创建后进档案页接入向导考古
  // CAP-P-01：ai = AI 代理模式，grill 连续追问澄清需求后确认创建。
  // （project 域的 UI 模式态，因影响 Footer 提交按钮与主栏接管而由壳持有）
  const navigate = useNavigate();
  const [projectSource, setProjectSource] = useState<'scratch' | 'existing' | 'ai'>('scratch');

  const activeProjectId = (() => {
    const fromForm = forms.task.watch('projectId')
      || forms.bug.watch('projectId')
      || forms.milestone.watch('projectId')
      || forms.doc.watch('projectId')
      || '';
    return String(fromForm || projectId || '');
  })();

  const { data: projectModules = [] } = useProjectModules(activeProjectId);

  // members（批二：裸 Promise + 死 loading 态收敛为 useQuery）
  const { data: members = [] } = useQuery({
    queryKey: ['create-dialog-members', activeProjectId],
    queryFn: () => listProjectMembers(activeProjectId),
    enabled: !!activeProjectId,
    staleTime: 30_000,
  });

  useEffect(() => { setActiveType(defaultType); }, [defaultType]);
  // 成员卡「派发任务」等入口：打开时预置负责人
  useEffect(() => {
    if (open && defaultAssigneeId) {
      forms.task.setValue('assigneeId', defaultAssigneeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultAssigneeId]);
  useEffect(() => {
    if (!projectId) return;
    forms.task.setValue('projectId', projectId);
    forms.bug.setValue('projectId', projectId);
    forms.doc.setValue('projectId', projectId);
    forms.milestone.setValue('projectId', projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const reset = useCallback(() => {
    for (const a of ENTITY_ADAPTERS) forms[a.type].reset(a.defaults as never);
    setSubOpen(false);
    setSubTitle('');
    setSubDesc('');
    setAiPrompt('');
    setDraft(null);
    setError(null);
    setCriteria([]);
    setDescPreview(false);
     
  }, [forms]);

  const handleClose = () => {
    onOpenChange(false);
    setMode('manual');
    setTimeout(reset, 150);
  };

  /** 是否有未提交输入（Esc/关闭守卫用；事件回调内调用，非渲染期） */
  const hasUnsavedInput = () => {
    if (mode === 'ai') return Boolean(aiPrompt.trim() || draft);
    return Boolean(
      ENTITY_ADAPTERS.some((a) => a.hasInput(forms[a.type]))
      || (subOpen && subTitle.trim())
      || criteria.some((c) => c.text.trim().length > 0),
    );
  };

  /** 关闭请求：有未提交输入先弹确认，防误触丢草稿 */
  const requestClose = () => {
    if (hasUnsavedInput()) {
      setConfirmDiscard(true);
      return;
    }
    handleClose();
  };

  const handleSuccess = (type: CreateType, id: string) => {
    onSuccess?.(type, id);
    toast.success(t('unifiedCreate.success', { type: t(`unifiedCreate.labels.${type}`) }));
    if (createMore) {
      reset();
      // 连续创建补完（CAP-A-18 批4）：重置后重套唤起预置、来源状态复位、焦点回归标题
      if (projectId) {
        forms.task.setValue('projectId', projectId);
        forms.bug.setValue('projectId', projectId);
        forms.doc.setValue('projectId', projectId);
        forms.milestone.setValue('projectId', projectId);
      }
      if (defaultAssigneeId) forms.task.setValue('assigneeId', defaultAssigneeId);
      setProjectSource('scratch');
      setCriteria([]);
      setDescPreview(false);
      requestAnimationFrame(() => {
        mainColRef.current?.querySelector('textarea')?.focus();
      });
    } else {
      handleClose();
    }
  };

  const resolveModuleCode = (pid: string | undefined, fallback = 'TASK'): string | undefined => {
    if (!pid) return undefined;
    return projectModules[0]?.code ?? fallback;
  };

  // 模板运行时上下文（壳持有的共享依赖，渲染期现算）
  const ctx: TemplateCtx = useMemo(() => ({
    t,
    projectId,
    activeProjectId,
    projectList,
    members,
    statusOptions,
    priorityOptions,
    maximized,
    criteria,
    setCriteria,
    onOpenAcceptance: () => {
      if (criteria.length === 0) {
        setCriteria([{ id: `crit-${Date.now()}`, text: '', completed: false }]);
      }
    },
    subtask: { open: subOpen, title: subTitle, desc: subDesc },
    mutations: { createTask, createProject, createDocument, updateDocument, createMilestone },
    resolveModuleCode,
    handleSuccess,
    setError,
    navigate,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [t, projectId, activeProjectId, projectList, members, statusOptions, priorityOptions,
    maximized, criteria, subOpen, subTitle, subDesc, createTask, createProject, createDocument,
    updateDocument, createMilestone, projectModules, createMore, onSuccess, navigate]);

  // ── AI 代理草稿流（CAP-A-18 双界面）──
  const silentCreateDraft = useSilentCreateDraft();

  const generateDraft = async () => {
    const text = aiPrompt.trim();
    if (!text) { setError(t('unifiedCreate.error.prompt')); return; }
    setError(null);
    setDraft(null);
    try {
      const res = await silentCreateDraft.mutateAsync({
        prompt: text,
        typeHint: activeType,
        projectId: activeProjectId || undefined,
      });
      const parsed = parseCreateDraft(res.data);
      if (!parsed) throw new Error(t('unifiedCreate.error.noDraft'));
      setDraft(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unifiedCreate.error.aiFailed'));
    }
  };

  /** 确认草稿：按草稿类型回填对应表单后复用手动提交流（同一校验、同一成功链路） */
  const confirmCreateDraft = () => {
    if (!draft) return;
    ADAPTER_BY_TYPE[draft.type].applyDraft(forms[draft.type], draft);
    setActiveType(draft.type);
    setMode('manual');
    void ADAPTER_BY_TYPE[draft.type].submit(forms[draft.type], ctx);
  };

  /** 草稿回填手动表单继续精修（不落库） */
  const editDraftManually = () => {
    if (!draft) return;
    ADAPTER_BY_TYPE[draft.type].applyDraft(forms[draft.type], draft);
    setActiveType(draft.type);
    setDraft(null);
    setMode('manual');
  };

  // ── 静默 AI 建议卡（创建面板场景 create-suggestions）──
  const silentSuggestions = useSilentCreateSuggestions();

  const fetchSuggestions = async (): Promise<CreateSuggestion[]> => {
    const res = await silentSuggestions.mutateAsync({
      type: activeType,
      fields: activeForm.getValues() as unknown as Record<string, unknown>,
      projectId: activeProjectId || undefined,
    });
    const parsed = parseCreateSuggestions(res.data);
    if (parsed.length === 0) throw new Error(t('unifiedCreate.error.suggestionFailed'));
    return parsed;
  };

  const applySuggestion = (s: CreateSuggestion) => {
    adapter.applySuggestion(activeForm, s, ctx);
  };

  const handleSubmit = () => {
    if (mode === 'ai') {
      // AI 代理界面：有草稿 → 确认创建；无草稿 → 生成草稿
      if (draft) { confirmCreateDraft(); return; }
      void generateDraft();
      return;
    }
    // grill 接管态：提交由访谈摘要确认卡驱动，不走手动表单
    if (adapter.renderTakeover && activeType === 'project' && projectSource === 'ai') return;
    void adapter.submit(activeForm, ctx);
  };

  const isSubmitting =
    createTask.isPending || createProject.isPending
    || createMilestone.isPending || createDocument.isPending;

  // ── Form state helpers（footer 提交钮 disabled 面）
  const taskTitle = useWatch({ control: taskForm.control, name: 'title' }) ?? '';
  const bugTitle = useWatch({ control: bugForm.control, name: 'title' }) ?? '';
  const docTitle = useWatch({ control: docForm.control, name: 'title' }) ?? '';
  const projectName = useWatch({ control: projectForm.control, name: 'name' }) ?? '';
  const milestoneName = useWatch({ control: milestoneForm.control, name: 'name' }) ?? '';
  const titleWatches: Record<CreateType, string> = {
    task: String(taskTitle), bug: String(bugTitle), doc: String(docTitle),
    project: String(projectName), milestone: String(milestoneName),
  };
  const currentTitle = titleWatches[activeType];

  // ── Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const TYPE_ORDER = ENTITY_ADAPTERS.map((a) => a.type);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); requestClose(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleSubmit(); return; }
      if ((e.ctrlKey || e.metaKey) && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const idx = Number(e.key) - 1;
        if (idx < TYPE_ORDER.length) setActiveType(TYPE_ORDER[idx]);
        return;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeType, createMore, mode, draft]);

  // ── Sizing classes: 普通态 720px，放大态适度 1040px × 760px（§20.9 窗口二态制）
  const dialogSizeClass = maximized
    ? 'w-[min(96vw,1040px)] h-[min(84vh,760px)]'
    : 'w-[min(96vw,720px)]';

  // ── 接管态（project grill）：主栏整体换访谈面板，Footer 提交钮以 hint 替代
  const takeoverActive = mode === 'manual' && activeType === 'project' && projectSource === 'ai';

  // ── Render ─────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // base-ui 自身 Esc/遮罩关闭也走脏检查守卫
        if (!o) requestClose();
      }}
    >
      <DialogContent
        className={cn(
          'overflow-hidden p-0 gap-0 border border-border/70 bg-card/95 backdrop-blur-xl shadow-xs transition-all duration-slow',
          dialogSizeClass,
        )}
        keepDefaultWidth={false}
        showCloseButton={false}
        style={maximized ? undefined : { maxHeight: 'calc(100vh - 48px)' }}
      >
        <DialogTitle className="sr-only">
          {mode === 'ai' ? t('unifiedCreate.mode.ai') : t(`unifiedCreate.title.${activeType}`)}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t(`unifiedCreate.descHint.${activeType}`)}
        </DialogDescription>

        {/* ──────────── Header ──────────── */}
        <div className="flex items-center justify-between px-4 h-11 shrink-0 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
            <span className="px-1 rounded-sm hover:bg-accent hover:text-foreground transition-colors cursor-pointer shrink-0">
              Ordo
            </span>
            <ChevronRight className="size-3 opacity-40 shrink-0" />
            <ProjectBreadcrumbSelector
              projectId={activeProjectId}
              projectList={projectList}
              onSelect={(pid) => {
                forms.task.setValue('projectId', pid);
                forms.bug.setValue('projectId', pid);
                forms.doc.setValue('projectId', pid);
                forms.milestone.setValue('projectId', pid);
              }}
            />
            <TypeSelector
              typeOrder={ENTITY_ADAPTERS.map((a) => a.type)}
              typeKinds={TYPE_META}
              activeType={activeType}
              onChange={setActiveType}
            />
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <IconBtn
              active={showProps}
              onClick={() => setShowProps((v) => !v)}
              title={showProps ? t('unifiedCreate.iconTips.hideProps') : t('unifiedCreate.iconTips.showProps')}
            >
              {showProps ? <PanelRightClose className="size-3.5" /> : <PanelRight className="size-3.5" />}
            </IconBtn>
            <IconBtn
              active={maximized}
              onClick={() => setMaximized((v) => !v)}
              title={maximized ? t('unifiedCreate.iconTips.restore') : t('unifiedCreate.iconTips.maximize')}
            >
              {maximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </IconBtn>
            <IconBtn onClick={requestClose} title={t('unifiedCreate.iconTips.close')}>
              <X className="size-3.5" />
            </IconBtn>
          </div>
        </div>

        {/* ──────────── Body ──────────── */}
        <div className="flex overflow-hidden flex-1 min-h-0" style={{ minHeight: 320 }}>
          {/* ── Main ── */}
          <div ref={mainColRef} className="flex-1 min-w-0 overflow-y-auto flex flex-col">
            <div className="p-5 pb-3 flex flex-col gap-3.5 flex-1 min-h-0 w-full transition-all">
              {error && (
                <Alert variant="destructive" className="py-2 text-xs">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              {/* AI 代理界面：自然语言 → 草稿确认卡（CAP-A-18 顶级双界面） */}
              {mode === 'ai' ? (
                <AiPromptPanel
                  aiPrompt={aiPrompt}
                  onPromptChange={setAiPrompt}
                  draft={draft}
                  generating={silentCreateDraft.isPending}
                  onGenerate={() => void generateDraft()}
                  onConfirm={confirmCreateDraft}
                  onEditManually={editDraftManually}
                  submitting={isSubmitting}
                />
              ) : takeoverActive ? (
                /* CAP-P-01：AI 代理模式——grill 连续追问澄清需求后确认创建 */
                adapter.renderTakeover!(ctx, { onFallback: () => setProjectSource('scratch'), form: activeForm })
              ) : (
                <>
                  {/* 项目立项来源三分流（CAP-A-18 / CAP-P-01 切片 0 断链接通）：
                      scratch 手动表单（下方既有字段）/ ai 切 Grill 访谈；existing 尚无专属 UI 暂不露出 */}
                  {activeType === 'project' && (
                    <ProjectSourceTabs
                      value={projectSource}
                      onChange={setProjectSource}
                      sources={['scratch', 'ai']}
                    />
                  )}

                  {/* Title / Description（adapter 驱动字段名） */}
                  <TitleField adapter={adapter} form={activeForm} />
                  <DescriptionField
                    form={activeForm}
                    type={activeType}
                    maximized={maximized}
                    descPreview={descPreview}
                    onTogglePreview={() => setDescPreview((v) => !v)}
                  />

                  {/* 实体特有主栏段（task/bug 验收标准等） */}
                  {adapter.ExtraMain && <adapter.ExtraMain form={activeForm} ctx={ctx} />}

                  {/* 横向属性胶囊栏（下沉单行极简药丸，随实体动态组合） */}
                  <PropertyPillsBar
                    activeType={activeType}
                    projectId={activeProjectId}
                    projectList={projectList}
                    onProjectChange={(pid) => {
                      forms.task.setValue('projectId', pid);
                      forms.bug.setValue('projectId', pid);
                      forms.doc.setValue('projectId', pid);
                      forms.milestone.setValue('projectId', pid);
                    }}
                    {...(adapter.pillsProps(activeForm, ctx) as Record<string, never>)}
                  />
                </>
              )}
            </div>

            {/* Sub-task block (matches reference: collapsible card at bottom of main) */}
            {(mode === 'manual' && activeType === 'task') && (
              <div className="mt-auto">
                <SubTaskCard
                  open={subOpen}
                  onOpen={() => setSubOpen(true)}
                  onClose={() => { setSubOpen(false); setSubTitle(''); setSubDesc(''); }}
                  title={subTitle}
                  desc={subDesc}
                  onTitleChange={setSubTitle}
                  onDescChange={setSubDesc}
                />
              </div>
            )}
          </div>

          {/* ── Properties panel ── */}
          {showProps && mode === 'manual' && (
            <aside className={cn(
              "shrink-0 px-3 pb-3 pt-1 overflow-y-auto border-l border-border/30 transition-all",
              maximized ? "w-72 bg-muted/10 px-4" : "w-52.5 bg-transparent"
            )}>
              <PropsCard
                title={t('unifiedCreate.properties')}
                collapsed={propsCollapsed}
                onToggleCollapse={() => setPropsCollapsed((v) => !v)}
              >
                <adapter.Properties form={activeForm} ctx={ctx} />
              </PropsCard>

              <div className="mt-3">
                <SuggestionsCard
                  collapsed={suggestionsCollapsed}
                  onToggle={() => setSuggestionsCollapsed((v) => !v)}
                  onFetch={fetchSuggestions}
                  onApply={applySuggestion}
                />
              </div>
            </aside>
          )}
        </div>

        {/* ──────────── Footer ──────────── */}
        <div className="flex items-center justify-between gap-3 px-5 h-13 shrink-0 border-t border-border/50 bg-muted/15">
          {/* 左侧：连续创建 */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition-colors">
              <span>{t('unifiedCreate.createMore')}</span>
              <Switch checked={createMore} onCheckedChange={setCreateMore} />
            </label>
          </div>

          {/* 右侧：模式穿梭、取消与提交主按钮 */}
          <div className="flex items-center gap-2.5">
            {/* 智能体穿梭模式按钮（采用系统默认 AI 紫色配色与呼吸感） */}
            <ModeShuttleButton
              mode={mode}
              onToggle={() => {
                const next = mode === 'manual' ? 'ai' : 'manual';
                setMode(next);
                if (next === 'manual') setDraft(null);
              }}
              disabled={isSubmitting}
            />

            <Button variant="ghost" size="sm" onClick={requestClose} disabled={isSubmitting}>
              {t('unifiedCreate.cancel')}
            </Button>

            {takeoverActive ? (
              <span className="text-xs text-muted-foreground">
                {t('unifiedCreate.projectSource.grillHint')}
              </span>
            ) : mode === 'ai' ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const text = aiPrompt.trim();
                    if (!text) { setError(t('unifiedCreate.error.prompt')); return; }
                    setError(null);
                    openAssistantWithDraft(`请帮我创建：${text}`);
                    handleClose();
                    toast.success(t('unifiedCreate.aiPanel.forwardedToast'));
                  }}
                  disabled={isSubmitting || silentCreateDraft.isPending}
                  title={t('unifiedCreate.aiPanel.fallbackTitle')}
                >
                  {t('unifiedCreate.aiPanel.fallback')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting || silentCreateDraft.isPending || !aiPrompt.trim()}
                  data-ai-action="generate-draft"
                >
                  {silentCreateDraft.isPending ? (
                    <>
                      <Spinner className="size-3 text-inherit" />
                      <span role="status" aria-live="polite">{t('unifiedCreate.aiPanel.parsing')}</span>
                    </>
                  ) : draft ? (
                    <>
                      <Check className="size-3" />
                      {t('unifiedCreate.aiPanel.confirm')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3" />
                      {t('unifiedCreate.aiPanel.generate')}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || !currentTitle.trim()}
                aria-label={t(`unifiedCreate.title.${activeType}`)}
                data-ai-action={`create-${activeType}`}
                className="gap-1.5 font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="size-3 text-inherit" />
                    {t('unifiedCreate.creating')}
                  </>
                ) : (
                  <>
                    <Plus className="size-3" />
                    <span>{t(`unifiedCreate.title.${activeType}`)}</span>
                    <kbd
                      aria-hidden="true"
                      className="inline-flex items-center px-1 py-0.5 rounded-sm bg-primary-foreground/20 text-3xs font-mono opacity-80 ml-0.5"
                    >
                      Ctrl ↵
                    </kbd>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* 脏表单退出确认（批4：防 Esc/遮罩误触丢草稿；§20.1 浮层串行——AlertDialog 同层叠加） */}
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('unifiedCreate.discard.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('unifiedCreate.discard.desc')}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('unifiedCreate.discard.keep')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                handleClose();
              }}
            >
              {t('unifiedCreate.discard.discard')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

/** AI 界面：提示条 + 自然语言输入 + 草稿确认卡 */
function AiPromptPanel({
  aiPrompt, onPromptChange, draft, generating, onGenerate, onConfirm, onEditManually, submitting,
}: {
  aiPrompt: string;
  onPromptChange: (v: string) => void;
  draft: CreateDraft | null;
  generating: boolean;
  onGenerate: () => void;
  onConfirm: () => void;
  onEditManually: () => void;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-purple" />
        <span>{t('unifiedCreate.aiPanel.hint')}</span>
      </div>
      <Textarea
        value={aiPrompt}
        onChange={(e) => onPromptChange(e.target.value)}
        rows={5}
        autoFocus
        placeholder={t('unifiedCreate.aiPanel.inputPlaceholder')}
        className="flex-1 resize-none rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus-visible:ring-0 focus-visible:border-primary/50"
      />
      {draft && (
        <div
          className="rounded-lg border border-border overflow-hidden"
          data-testid="create-draft-card"
        >
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/40">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <EntityIcon entity={DRAFT_ENTITY_KIND[draft.type]} size="sm" />
              {t('unifiedCreate.aiPanel.draftBadge', { type: t(`unifiedCreate.labels.${draft.type}`) })}
            </span>
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating}
              className="text-3xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {t('unifiedCreate.aiPanel.regen')}
            </button>
          </div>
          <div className="p-3 flex flex-col gap-1.5 text-xs">
            <div>
              <span className="text-muted-foreground">{t('unifiedCreate.aiPanel.fieldTitle')}：</span>
              <span className="font-medium text-foreground">{draft.fields.title}</span>
            </div>
            {draft.fields.description && (
              <div>
                <span className="text-muted-foreground">{t('unifiedCreate.aiPanel.fieldDesc')}：</span>
                <span className="text-foreground/80">{draft.fields.description}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              {draft.fields.priority && <span>{t('unifiedCreate.aiPanel.fieldPriority')} {draft.fields.priority}</span>}
              {draft.fields.severity && <span>{t('unifiedCreate.aiPanel.fieldSeverity')} {draft.fields.severity}</span>}
              {draft.fields.dueDate && <span>{t('unifiedCreate.aiPanel.fieldDue')} {draft.fields.dueDate}</span>}
              {draft.fields.category && <span>{t('unifiedCreate.aiPanel.fieldCategory')} {draft.fields.category}</span>}
              {draft.fields.labels?.length ? <span>{t('unifiedCreate.aiPanel.fieldLabels')} {draft.fields.labels.join('、')}</span> : null}
            </div>
          </div>
          <div className="px-3 pb-3 flex gap-2">
            <Button size="sm" onClick={onConfirm} disabled={submitting}>
              <Check className="size-3" />
              {t('unifiedCreate.aiPanel.confirm')}
            </Button>
            <Button size="sm" variant="ghost" onClick={onEditManually} disabled={submitting}>
              {t('unifiedCreate.aiPanel.editManually')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 类型切换器元数据（实体图标注册表映射；文案一律 unifiedCreate.* i18n） */
const TYPE_META: Record<CreateType, { kind: EntityKind | null }> = {
  task: { kind: 'issue' },
  bug: { kind: 'bug' },
  doc: { kind: 'document' },
  project: { kind: 'project' },
  milestone: { kind: 'milestone' },
};

/** 优先级选项展示序（取 PRIORITY_VISUALS 四档；urgent 为项目侧叫法不入创建面板） */
const PRIORITY_ORDER: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

/** 草稿类型 → entity-icons 实体（task/doc 与注册表 kind 名不同） */
const DRAFT_ENTITY_KIND: Record<CreateDraft['type'], EntityKind> = {
  task: 'issue',
  bug: 'bug',
  doc: 'document',
  project: 'project',
  milestone: 'milestone',
};
