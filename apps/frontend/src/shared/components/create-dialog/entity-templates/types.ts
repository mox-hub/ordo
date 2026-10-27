/**
 * 实体模板契约（统一创建面板优化批二）
 *
 * 主壳（unified-create-dialog.tsx）只保留：Dialog 骨架/Header/Footer、双模式态、
 * 快捷键、脏确认；每实体的表单值/提交/草稿回填/建议回填/属性栏/主栏特有段
 * 全部聚合进各自的 *-template.tsx（EntityAdapter 实现），经 index.ts 注册表
 * 消灭主壳内的五路 switch 分发。
 */
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { NavigateFunction } from 'react-router-dom';
import type { Member } from '@/modules/team-member/types';
import type { BugSeverity, TaskPriority } from '@/modules/issue/api/issue-api';
import type { CreateDraft, CreateSuggestion } from '@/modules/assistant/hooks/use-silent-ai';

export type CreateType = 'task' | 'bug' | 'doc' | 'project' | 'milestone';

/** mutation 最小面（模板只依赖 mutateAsync/isPending；请求形状由各模板负责拼对） */
export interface MutationLike<TRes = { id?: string } | null | undefined> {
  // any 而非 unknown/泛型：真实 UseMutationResult 的请求参数是具体 DTO，
  // 逆变形下只有 any 能让「壳的真实 mutation」赋进「模板侧的宽松面」；
  // 请求形状的正确性由各模板的 submit 实现负责（类型断言边界集中在此）。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutateAsync: (req: any) => Promise<TRes>;
  isPending: boolean;
}

/** 属性胶囊/右栏共用的选项形状（从 status-visuals 派生，壳统一构建） */
export interface VisualOption {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  toneClass?: string;
  spin?: boolean;
}

/** 验收标准项（CAP-B-01/B-02，task/bug 共用，状态在壳） */
export interface CriterionItem {
  id: string;
  text: string;
  completed: boolean;
}

/** 模板运行时依赖：壳持有、按渲染现算后传入（模板不自行拉数据/建 mutation） */
export interface TemplateCtx {
  t: (key: string, opts?: Record<string, unknown>) => string;
  /** 入口预置项目（Dock 全局入口无页面上下文时缺省） */
  projectId?: string;
  /** 表单所选或预置的项目（里程碑创建绑它，P0 修复口径） */
  activeProjectId: string;
  projectList: Array<{ id: string; name: string }>;
  members: Member[];
  statusOptions: VisualOption[];
  priorityOptions: VisualOption[];
  maximized: boolean;
  /** task/bug：验收标准列表（壳持有，跨模式存续） */
  criteria: CriterionItem[];
  setCriteria: Dispatch<SetStateAction<CriterionItem[]>>;
  onOpenAcceptance: () => void;
  /** task：折叠子任务卡（legacy 单子任务，提交时并入 todoItems） */
  subtask: { open: boolean; title: string; desc: string };
  mutations: {
    createTask: MutationLike;
    createProject: MutationLike;
    createDocument: MutationLike;
    updateDocument: MutationLike<unknown>;
    createMilestone: MutationLike;
  };
  resolveModuleCode: (pid: string | undefined, fallback?: string) => string | undefined;
  handleSuccess: (type: CreateType, id: string) => void;
  setError: (msg: string | null) => void;
  navigate: NavigateFunction;
}

/**
 * 实体适配器：把「一个可创建实体」的全部差异聚合在一处。
 * 表单实例仍由壳创建（数量固定、便于 reset/预置/连续创建），模板经 form 参数读写。
 */
export interface EntityAdapter {
  type: CreateType;
  /** 标题字段名（task/bug/doc = title；project/milestone = name） */
  titleField: 'title' | 'name';
  defaults: object;
  submit: (form: UseFormReturn<Record<string, unknown>>, ctx: TemplateCtx) => Promise<void>;
  /** AI 草稿字段回填（非法枚举值忽略，保持表单缺省） */
  applyDraft: (form: UseFormReturn<Record<string, unknown>>, draft: CreateDraft) => void;
  /** 静默建议回填（title/name 仅在空值时补） */
  applySuggestion: (
    form: UseFormReturn<Record<string, unknown>>,
    s: CreateSuggestion,
    ctx: TemplateCtx,
  ) => void;
  /** 是否有未提交输入（脏确认守卫；子任务/验收标准由壳并入） */
  hasInput: (form: UseFormReturn<Record<string, unknown>>) => boolean;
  /** 主栏实体特有字段段（标题/描述由壳统一渲染） */
  ExtraMain?: React.FC<{ form: UseFormReturn<Record<string, unknown>>; ctx: TemplateCtx }>;
  /** 右属性栏内容 */
  Properties: React.FC<{ form: UseFormReturn<Record<string, unknown>>; ctx: TemplateCtx }>;
  /**
   * 实体接管主栏（project 的 grill 访谈分支）；返回 null 表示无接管。
   * 接管态下壳隐藏提交按钮（以 grillHint 文案替代），提交由接管面板自行驱动。
   * helpers.form = 该实体的当前表单实例（接管面板提交时读取缺省字段）。
   */
  renderTakeover?: (
    ctx: TemplateCtx,
    helpers: { onFallback: () => void; form: UseFormReturn<Record<string, unknown>> },
  ) => ReactNode | null;
  /** 横向属性胶囊栏的实体段（壳合并公共段后传给 PropertyPillsBar） */
  pillsProps: (form: UseFormReturn<Record<string, unknown>>, ctx: TemplateCtx) => Record<string, unknown>;
  /** 生成中携带已填字段作 AI 上下文（批三 serializeContext） */
  serializeContext?: (form: UseFormReturn<Record<string, unknown>>, ctx: TemplateCtx) => string;
}

/** AI 草稿字段缺省形状（与 use-silent-ai 的 CreateDraft['fields'] 对齐的最小面） */
export interface DraftFields {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  severity?: string;
  dueDate?: string;
  category?: string;
  labels?: string[];
}
