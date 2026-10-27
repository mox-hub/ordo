/**
 * 工具调用卡 —— UIMessage tool-* part 的对话内渲染（对齐 zcode 工具块形态 + 宪法 §22）。
 * 折叠头 = 状态图标（调用中/完成/失败）+ 动作标签（动词×实体组合）+ 摘要 + 计时；
 * 展开体 = 输入参数 / 结果预览（JSON 高亮、高度封顶渐隐）/ 错误信息。
 * 实体类输出渲染实体行卡（图标+标题+状态+详情跳转）；列表输出渲染结果数+样例；
 * propose_decision 输出内联决策卡（复用 DecisionCard 文法，决议走 useDecisionActions）。
 *
 * §22.5 活性可感知：运行中 live 计时（100ms tick，重试间歇累加）；
 * 状态迁移经 role="status" aria-live="polite" 播报；折叠区 inert 防焦点落入。
 * AssistantToolGroup 把连续多卡汇总为一行（计数/用时/失败数从子卡现算，§22.2）。
 */
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Flag,
  FolderKanban,
  ListTodo,
  Repeat,
  Tag,
  Target,
  Users,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { Decision } from '@/shared/decision-card/types';
import { DecisionCard } from '@/shared/decision-card/decision-card';
import { cn } from '@/lib/utils';
// 账本 G3 收编：渐进精度时长唯一口径在 @/lib/format，本地别名保留原私有函数名
import { formatLiveDuration as formatMs } from '@/lib/format';
import { Spinner } from '@/components/ui/spinner';
import { decisionKeys } from '@/modules/decision/hooks/use-decisions';
import { useDecisionActions } from '@/modules/decision/hooks/use-decision-actions';

/** UIMessage tool-* part 的防御性形状（ai 包类型在 jsdom 测试里不便直接引用） */
export interface AssistantToolPart {
  type: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

/** 工具卡三态（§22.5：状态迁移必须可播报） */
export type ToolPartStatus = 'running' | 'success' | 'error';

/** part 状态归一：output-error / 输出内含 error 字段 → error；有产出无错 → success；其余 running */
export function toolPartStatus(part: AssistantToolPart): ToolPartStatus {
  if (part.state === 'output-error') return 'error';
  if (part.state === 'output-available') {
    return outputError(part.output) ? 'error' : 'success';
  }
  return 'running';
}

/**
 * 决策建议工具是否独立渲染：propose_decision 的产出是「等人裁决」的一等状态
 * （宪法 §22.1），始终独立成卡，绝不折叠进工具组。
 */
export function isDecisionToolPart(part: AssistantToolPart): boolean {
  return part.toolName === 'propose_decision';
}

export interface AssistantToolCardProps extends Omit<ComponentProps<'div'>, 'children' | 'part'> {
  // part 与 HTML 全局属性 part?: string 撞名，须从基类 Omit 后才能收窄为 AssistantToolPart
  part: AssistantToolPart;
  /** 非受控初始展开态 */
  defaultOpen?: boolean;
  /** 受控展开态（传入后失败自动展开/收起不再干预） */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 本次调用开始时间（服务端毫秒时间戳）；缺省从挂载起算 */
  startedAt?: number;
  /** 最终耗时（ms），覆盖实测值；历史消息补不回计时时不传则不显示（不造假数） */
  duration?: number;
  /** 失败自动展开 / 恢复自动收起（默认开） */
  autoOpenOnError?: boolean;
  /** 参数/结果代码块封顶高度（px），超出渐隐 + 显示全部 */
  maxCodeHeight?: number;
}

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const VERB_KEYS: Record<string, string> = {
  create: 'assistant.tool.verb.create',
  update: 'assistant.tool.verb.update',
  delete: 'assistant.tool.verb.delete',
  list: 'assistant.tool.verb.list',
  get: 'assistant.tool.verb.get',
  resolve: 'assistant.tool.verb.resolve',
  archive: 'assistant.tool.verb.archive',
  deactivate: 'assistant.tool.verb.deactivate',
  propose: 'assistant.tool.verb.propose',
};

const ENTITY_KEYS: Record<string, string> = {
  task: 'assistant.tool.entity.task',
  project: 'assistant.tool.entity.project',
  project_overview: 'assistant.tool.entity.projectOverview',
  document: 'assistant.tool.entity.document',
  member: 'assistant.tool.entity.member',
  team: 'assistant.tool.entity.team',
  iteration: 'assistant.tool.entity.iteration',
  milestone: 'assistant.tool.entity.milestone',
  acceptance: 'assistant.tool.entity.acceptance',
  decision: 'assistant.tool.entity.decision',
  project_tasks: 'assistant.tool.entity.projectTasks',
  task_acceptances: 'assistant.tool.entity.taskAcceptances',
  pending_decisions: 'assistant.tool.entity.pendingDecisions',
  project_statuses: 'assistant.tool.entity.projectStatuses',
  project_roles: 'assistant.tool.entity.projectRoles',
  repositories: 'assistant.tool.entity.repositories',
};

/** 动词×实体组合显示名；未知工具回退原名 */
function toolActionLabel(toolName: string, t: TFunc): string {
  const sep = toolName.indexOf('_');
  if (sep > 0) {
    const verbKey = VERB_KEYS[toolName.slice(0, sep)];
    const entityKey = ENTITY_KEYS[toolName.slice(sep + 1)];
    if (verbKey && entityKey) return `${t(verbKey)}${t(entityKey)}`;
  }
  return toolName;
}

const ENTITY_ICONS: Record<string, LucideIcon> = {
  task: ListTodo,
  project: FolderKanban,
  document: FileText,
  member: Users,
  team: Users,
  iteration: Repeat,
  milestone: Flag,
  label: Tag,
  acceptance: Target,
};

/** 输出里的实体 ID 字段（与工具返回形状一一对应） */
const ENTITY_ID_FIELDS = [
  'issueId',
  'projectId',
  'documentId',
  'memberId',
  'teamId',
  'iterationId',
  'milestoneId',
  'labelId',
  'acceptanceId',
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function outputError(output: unknown): string | null {
  const o = asRecord(output);
  const err = o?.error;
  return typeof err === 'string' && err ? err : null;
}

/** 实体工具输出 → {icon, title, status, route}；非实体输出返回 null */
function entityView(
  toolName: string,
  output: unknown,
): { icon: LucideIcon; title: string; status?: string; route?: string } | null {
  const o = asRecord(output);
  if (!o) return null;
  let idField: string | null = null;
  let id = '';
  for (const field of ENTITY_ID_FIELDS) {
    if (typeof o[field] === 'string' && o[field]) {
      idField = field;
      id = o[field] as string;
      break;
    }
  }
  if (!idField) return null;
  const title = [o.title, o.name, o.displayName].find(
    (v): v is string => typeof v === 'string' && v.length > 0,
  );
  const status = typeof o.status === 'string' ? o.status : undefined;
  const isBug = o.type === 'bug';
  const icon =
    idField === 'issueId' && isBug
      ? Bug
      : (ENTITY_ICONS[idField.replace(/Id$/, '')] ?? ListTodo);
  let route: string | undefined;
  if (idField === 'issueId') route = isBug ? `/app/bugs/${id}` : `/app/issues/${id}`;
  else if (idField === 'projectId') route = `/app/projects/${id}`;
  else if (idField === 'documentId') route = `/app/documents/${id}`;
  else if (idField === 'memberId') route = `/app/members/${id}`;
  else if (idField === 'teamId') route = `/app/teams/${id}`;
  else if (idField === 'acceptanceId') route = `/app/acceptance/${id}`;
  if (o.deleted === true) return { icon, title: title ?? id, status, route: undefined };
  return { icon, title: title ?? id, status, route };
}

/** 列表型输出 → {count, samples}；非列表返回 null */
function listView(output: unknown): { count: number; samples: string[] } | null {
  const o = asRecord(output);
  if (!o) return null;
  const arr = Object.values(o).find((v) => Array.isArray(v)) as unknown[] | undefined;
  if (!arr) return null;
  const samples = arr
    .slice(0, 3)
    .map((item) => {
      const rec = asRecord(item);
      const title = rec
        ? ([rec.title, rec.name, rec.displayName].find(
            (v): v is string => typeof v === 'string' && v.length > 0,
          ) ?? '')
        : '';
      return title;
    })
    .filter(Boolean);
  return { count: arr.length, samples };
}

/** 输入参数摘要：取第一个有业务含义的字符串字段 */
function inputSummary(input: unknown): string | null {
  const o = asRecord(input);
  if (!o) return null;
  for (const key of ['title', 'name', 'displayName', 'question', 'issueId', 'acceptanceId', 'documentId', 'projectId']) {
    const v = o[key];
    if (typeof v === 'string' && v) return v;
  }
  return null;
}

/* ---------- 计时（§22.2/§22.5 成本一等公民 · 活性可感知） ---------- */

/**
 * 运行段秒表：running 时 live 计时（100ms tick）；暂停→重启多段累加（重试不从零重计）。
 * startedAt（服务端时间）仅在首段生效——重试段一律从当下起算，避免从旧起点重复计时；
 * 无任何实测数据时返回 null（历史消息诚实降级，不造假数）。
 */
function useStopwatch(running: boolean, startedAt?: number): number | null {
  const startRef = useRef<number | null>(null);
  const baseRef = useRef(0);
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    if (!running) {
      if (startRef.current !== null) {
        baseRef.current += Math.max(0, Date.now() - startRef.current);
        startRef.current = null;
        setMs(baseRef.current);
      }
      return;
    }
    if (startRef.current === null) {
      const firstSegment = baseRef.current === 0;
      startRef.current =
        firstSegment && startedAt !== undefined ? startedAt : Date.now();
    }
    const tick = () =>
      setMs(
        Math.max(0, baseRef.current + Date.now() - (startRef.current ?? Date.now())),
      );
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [running, startedAt]);
  return ms;
}

/* ---------- JSON 高亮（零依赖 tokenizer） ---------- */

/** 归一为 {text, json}：对象 pretty-print；JSON 字符串尝试解析；其余原样展示 */
function toText(value: unknown): { text: string; json: boolean } {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return { text: JSON.stringify(JSON.parse(trimmed), null, 2), json: true };
      } catch {
        /* 非 JSON，按普通文本展示 */
      }
    }
    return { text: value, json: false };
  }
  try {
    const s = JSON.stringify(value, null, 2);
    return s === undefined ? { text: String(value), json: false } : { text: s, json: true };
  } catch {
    return { text: String(value), json: false };
  }
}

/** 字符串（后随冒号为键）、字面量与数字；其余标点不着色 */
const JSON_TOKEN_RE =
  /("(?:[^"\\]|\\.)*")(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

const TOKEN_CLASS = {
  key: 'text-content-text',
  str: 'text-accent-green',
  num: 'text-accent-orange',
  lit: 'text-accent-purple',
} as const;

function highlightJson(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = new RegExp(JSON_TOKEN_RE.source, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] && m[2]) {
      out.push(
        <span key={m.index} className={TOKEN_CLASS.key}>
          {m[1]}
        </span>,
        m[2],
      );
    } else {
      const kind = m[1] ? 'str' : /^[tfn]/.test(m[0]) ? 'lit' : 'num';
      out.push(
        <span key={m.index} className={TOKEN_CLASS[kind]}>
          {m[0]}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/* ---------- 高度封顶三段式（防巨型卡片） ---------- */

const OPEN_MAX = 640;

const CODE_CLASS =
  'relative overflow-hidden rounded-md bg-content-bg-secondary px-2 py-1.5 font-mono text-2xs leading-relaxed break-all whitespace-pre-wrap text-content-text-secondary';

/**
 * 代码块三段式：自然高 > cap+24 → 底部渐隐 + 「显示全部」；
 * 展开后 > 640px → 改内部滚动（overscroll-contain 防滚动穿透）。
 * 自然高用 ResizeObserver 实测（内容流式增长时跟随重测）。
 */
function CappedCode({ text, json, cap }: { text: string; json: boolean; cap: number }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [full, setFull] = useState(false);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const el = preRef.current;
    const inner = el?.firstElementChild;
    if (!el || !inner) return;
    const measure = () => setHeight(el.scrollHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [text]);
  const capped = height > cap + 24;
  const scroll = capped && full && height > OPEN_MAX;
  return (
    <div className="min-w-0">
      <pre
        ref={preRef}
        className={cn(CODE_CLASS, scroll && 'overflow-y-auto overscroll-contain')}
        data-capped={capped && !full ? '' : undefined}
        data-scroll={scroll ? '' : undefined}
        style={capped ? { maxHeight: full ? Math.min(height, OPEN_MAX) : cap } : undefined}
      >
        <code>{json ? highlightJson(text) : text}</code>
        {capped && !full ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-1 bottom-0 h-8 bg-gradient-to-t from-content-bg-secondary to-transparent"
          />
        ) : null}
      </pre>
      {capped ? (
        <button
          type="button"
          aria-expanded={full}
          onClick={() => setFull((v) => !v)}
          className="mt-0.5 rounded-sm px-1 py-0.5 text-2xs text-content-text-secondary transition-colors duration-fast hover:bg-accent hover:text-content-text focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/45"
        >
          {full ? '收起' : '显示全部'}
        </button>
      ) : null}
    </div>
  );
}

/** 展开体：输入参数 pretty-print + JSON 高亮（非对象原样展示） */
function InputCode({ input, cap }: { input: unknown; cap: number }) {
  const o = asRecord(input);
  if (o && Object.keys(o).length === 0) return null;
  const { text, json } = toText(input);
  if (!text) return null;
  return <CappedCode text={text} json={json} cap={cap} />;
}

/** 展开体：兜底结果预览（无实体/列表语义时才展示） */
function OutputCode({ output, cap }: { output: unknown; cap: number }) {
  const { text, json } = toText(output);
  if (!text || text === '{}') return null;
  return <CappedCode text={text} json={json} cap={cap} />;
}

/* ---------- 结果行（常显） ---------- */

/** 结果行：可读错误（红色，常显） */
function ErrorLine({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-1 break-all text-2xs text-accent-red">
      <AlertCircle className="mt-0.5 size-3 shrink-0" />
      {message}
    </p>
  );
}

/** 结果行：实体卡（图标+标题+状态+详情跳转，常显） */
function EntityRow({ toolName, output }: { toolName: string; output: unknown }) {
  const { t } = useTranslation();
  const entity = entityView(toolName, output);
  if (!entity) return null;
  const Icon = entity.icon;
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-content-bg-secondary/60 px-2 py-1 text-2xs">
      <Icon className="size-3.5 shrink-0 text-accent-purple" />
      <span className="min-w-0 flex-1 truncate font-medium text-content-text">
        {(output as { deleted?: boolean } | null)?.deleted === true
          ? t('assistant.tool.deleted')
          : entity.title}
      </span>
      {entity.status ? (
        <span className="shrink-0 rounded-sm bg-accent-blue-light px-1.5 py-0.5 text-3xs text-accent-blue">
          {entity.status}
        </span>
      ) : null}
      {entity.route ? (
        <a
          href={entity.route}
          className="shrink-0 text-accent-blue underline-offset-2 hover:underline"
        >
          {t('assistant.tool.view')}
        </a>
      ) : null}
    </div>
  );
}

/** 结果行：列表样例（结果数 + 前 3 条标题，常显） */
function ListSamples({ output }: { output: unknown }) {
  const { t } = useTranslation();
  const list = listView(output);
  if (!list) return null;
  return (
    <div className="space-y-0.5 text-2xs text-content-text-secondary">
      <p>{t('assistant.tool.resultCount', { count: list.count })}</p>
      {list.samples.map((sample) => (
        <p key={sample} className="truncate pl-2 text-content-text-muted">
          · {sample}
        </p>
      ))}
    </div>
  );
}

/* ---------- 决策建议内联卡 ---------- */

/** propose_decision 完整输出 → 内联决策卡（落库后失效待决缓存，顶部 strip 同步） */
function ProposedDecisionInline({ output }: { output: unknown }) {
  const o = asRecord(output) ?? {};
  const proposalId = typeof o.proposalId === 'string' ? o.proposalId : '';
  const kind = o.kind as Decision['kind'] | undefined;
  const title = typeof o.title === 'string' ? o.title : '';
  // 输出不含渲染决策卡所需字段时回退普通工具卡
  if (!proposalId || !kind || !title) return null;

  return <ProposedDecisionCard o={o} proposalId={proposalId} kind={kind} title={title} />;
}

function ProposedDecisionCard({
  o,
  proposalId,
  kind,
  title,
}: {
  o: Record<string, unknown>;
  proposalId: string;
  kind: Decision['kind'];
  title: string;
}) {
  const qc = useQueryClient();
  const { handleAction, busyId } = useDecisionActions();

  // 提案落库后失效待决缓存：顶部「待你决定」strip 与消息流内联卡同步
  useEffect(() => {
    void qc.invalidateQueries({ queryKey: decisionKeys.all });
  }, [proposalId, qc]);

  const decision: Decision = {
    id: `${kind}:${proposalId}`,
    kind,
    sourceId: proposalId,
    status: 'pending',
    title,
    detail: typeof o.detail === 'string' ? o.detail : undefined,
    urgency: 'advisory',
    projectId: typeof o.projectId === 'string' ? o.projectId : undefined,
    proposer: { type: 'ai_agent', id: 'main-assistant' },
    payload: (asRecord(o.payload) ?? {}) as Record<string, unknown>,
    createdAt:
      typeof o.createdAt === 'string' ? o.createdAt : new Date(0).toISOString(),
  };

  return (
    <div className="w-full" data-ai-component="assistant.tool-decision">
      <DecisionCard
        decision={decision}
        onAction={handleAction}
        busy={busyId === decision.id}
      />
    </div>
  );
}

/* ---------- 主组件 ---------- */

/** 折叠体三态样式：hover bg-accent + focus ring（§8.1），时长白名单 duration-fast（§7.1） */
const HEAD_INTERACTION_CLASS =
  'transition-colors duration-fast hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/45';

/** 工具调用折叠卡（对齐 zcode：默认收起一行，点开看输入/输出；失败自动展开） */
export function AssistantToolCard({
  part,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  startedAt,
  duration,
  autoOpenOnError = true,
  maxCodeHeight = 220,
  className,
  ...rootProps
}: AssistantToolCardProps) {
  const { t } = useTranslation();
  const bodyId = useId();
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };

  const status = toolPartStatus(part);

  // 失败自动展开 / 恢复运行或成功自动收起：渲染期比对 prevStatus（§22.5）。
  // autoOpened 标记「当前展开来自自动干预」；用户手动切换过（userToggled）或受控 open 传入时不再自动干预。
  const [prevStatus, setPrevStatus] = useState(status);
  const [autoOpened, setAutoOpened] = useState(false);
  const [userToggled, setUserToggled] = useState(false);
  // 展开体懒挂载：首次展开才渲染内容（收起的卡不背隐藏 DOM 重量，§21 渲染期开销），收起后保留以便 inert 生效
  const [everOpened, setEverOpened] = useState(open);
  if (open && !everOpened) {
    setEverOpened(true);
  }
  if (status !== prevStatus) {
    setPrevStatus(status);
    if (openProp === undefined && autoOpenOnError) {
      if (status === 'error' && !userToggled && !openState) {
        setOpenState(true);
        setAutoOpened(true);
      } else if (prevStatus === 'error' && autoOpened && !userToggled) {
        setOpenState(false);
        setAutoOpened(false);
      }
    }
  }

  const elapsed = useStopwatch(status === 'running', startedAt);
  const ms = status === 'running' ? elapsed : (duration ?? elapsed);

  const toolName =
    typeof part.toolName === 'string' && part.toolName
      ? part.toolName
      : part.type.slice('tool-'.length);
  const state = part.state ?? 'input-available';
  const error = state === 'output-error' ? part.errorText : outputError(part.output);
  const done = status === 'success';

  // 决策建议卡：完整输出 → 内联 DecisionCard；残缺输出走普通折叠卡
  const out = asRecord(part.output) ?? {};
  const canInlineDecision =
    toolName === 'propose_decision' &&
    done &&
    typeof out.proposalId === 'string' &&
    !!out.proposalId &&
    typeof out.kind === 'string' &&
    !!out.kind &&
    typeof out.title === 'string' &&
    !!out.title;
  if (canInlineDecision) {
    return <ProposedDecisionInline output={part.output} />;
  }

  const actionLabel = toolActionLabel(toolName, t as unknown as TFunc);
  const entity = done ? entityView(toolName, part.output) : null;
  const list = done && !entity ? listView(part.output) : null;
  const summary = done
    ? (entity?.title ??
      (list ? t('assistant.tool.resultCount', { count: list.count }) : null))
    : inputSummary(part.input);
  const hasBody = part.input !== undefined || part.output !== undefined || !!error;
  const hasAlwaysVisible = !!error || !!entity || !!list;

  // §22.5：状态迁移经 live region 播报（中文，不带句号）
  const announce =
    status === 'running'
      ? `${actionLabel} 运行中`
      : status === 'success'
        ? `${actionLabel} 已完成`
        : `${actionLabel} 失败`;

  return (
    <div
      {...rootProps}
      className={cn(
        'w-full overflow-hidden rounded-lg border border-border bg-background/40',
        className,
      )}
      data-ai-component="assistant.tool-card"
      data-tool-state={state}
      data-tool-status={status}
      data-open={open || undefined}
    >
      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>
      <button
        type="button"
        onClick={() => {
          if (!hasBody) return;
          // 手动接管：此后自动开合不再干预
          setUserToggled(true);
          setAutoOpened(false);
          setOpen(!open);
        }}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-2xs',
          HEAD_INTERACTION_CLASS,
        )}
        aria-expanded={open}
        aria-controls={hasBody ? bodyId : undefined}
      >
        {done ? (
          <CheckCircle2 className="size-3.5 shrink-0 text-accent-green" />
        ) : error ? (
          <XCircle className="size-3.5 shrink-0 text-accent-red" />
        ) : (
          <Spinner size="sm" className="size-3.5 shrink-0 text-accent-blue" />
        )}
        <span className="shrink-0 font-medium text-content-text">{actionLabel}</span>
        {summary ? (
          <span className="min-w-0 flex-1 truncate text-content-text-muted">{summary}</span>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        {ms !== null ? (
          <span className="shrink-0 font-mono text-3xs tabular-nums text-content-text-muted">
            {formatMs(Math.max(0, ms))}
          </span>
        ) : null}
        {hasBody ? (
          open ? (
            <ChevronDown className="size-3 shrink-0 text-content-text-muted" />
          ) : (
            <ChevronRight className="size-3 shrink-0 text-content-text-muted" />
          )
        ) : null}
      </button>
      {/* 结果常显（对齐 zcode：结果一眼可见，输入默认折叠） */}
      {error ? (
        <div className="px-2.5 pb-1.5">
          <ErrorLine message={error} />
        </div>
      ) : null}
      {entity ? (
        <div className="px-2.5 pb-1.5">
          <EntityRow toolName={toolName} output={part.output} />
        </div>
      ) : null}
      {list ? (
        <div className="px-2.5 pb-1.5">
          <ListSamples output={part.output} />
        </div>
      ) : null}
      {hasBody ? (
        // 折叠区 inert（§22.5：禁焦点落入不可见区），hidden 收起
        <div
          id={bodyId}
          inert={!open}
          hidden={!open}
          className="space-y-1.5 border-t border-border/60 px-2.5 py-1.5"
        >
          {everOpened && part.input !== undefined ? (
            <InputCode input={part.input} cap={maxCodeHeight} />
          ) : null}
          {everOpened && !hasAlwaysVisible && part.output !== undefined ? (
            <OutputCode output={part.output} cap={maxCodeHeight} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- 多卡汇总（连续工具卡的组行） ---------- */

export interface AssistantToolGroupProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** 连续的 AssistantToolCard 列表；汇总行从子卡 props 现算（§22.2：成员只声明自身值，禁预汇总） */
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** 多卡汇总：一行「已用 N 个工具 · 用时 · M 失败」，点开得卡片列表（默认收起） */
export function AssistantToolGroup({
  children,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  className,
  ...rootProps
}: AssistantToolGroupProps) {
  const bodyId = useId();
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };

  // 从子卡元素 props 现算汇总
  const childProps = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => (child as ReactElement<AssistantToolCardProps>).props);
  const parts = childProps
    .map((props) => props.part)
    .filter((p): p is AssistantToolPart => !!p);
  const statuses = parts.map(toolPartStatus);
  const running = statuses.some((s) => s === 'running');
  const failed = statuses.filter((s) => s === 'error').length;

  // 运行中：组秒表从最早起算的运行中子卡开始 live 计时；终态：全员有 duration 则现算求和
  const since = childProps.reduce<number | undefined>((min, props) => {
    const p = props.part;
    if (
      p &&
      toolPartStatus(p) === 'running' &&
      typeof props.startedAt === 'number' &&
      (min === undefined || props.startedAt < min)
    ) {
      return props.startedAt;
    }
    return min;
  }, undefined);
  const measured = useStopwatch(running, since);
  const allFinished = childProps.length > 0 && childProps.every((p) => typeof p.duration === 'number');
  const sum = allFinished
    ? childProps.reduce((total, p) => total + (p.duration ?? 0), 0)
    : null;
  const ms = running ? measured : (sum ?? measured);

  if (parts.length === 0) return <>{children}</>;

  return (
    <div
      {...rootProps}
      className={cn(
        'w-full overflow-hidden rounded-lg border border-border bg-background/40',
        className,
      )}
      data-ai-component="assistant.tool-group"
      data-open={open || undefined}
    >
      <span role="status" aria-live="polite" className="sr-only">
        {running
          ? '正在调用工具'
          : `已用 ${parts.length} 个工具${failed > 0 ? `，${failed} 个失败` : ''}`}
      </span>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={bodyId}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-2xs',
          HEAD_INTERACTION_CLASS,
        )}
      >
        {running ? (
          <Spinner size="sm" className="size-3.5 shrink-0 text-accent-blue" />
        ) : (
          <Wrench className="size-3.5 shrink-0 text-content-text-muted" />
        )}
        <span className="min-w-0 flex-1 truncate text-content-text">
          {running ? '正在调用工具…' : `已用 ${parts.length} 个工具`}
        </span>
        {failed > 0 ? (
          <span className="shrink-0 text-2xs text-accent-red">{failed} 个失败</span>
        ) : null}
        {ms !== null ? (
          <span className="shrink-0 font-mono text-3xs tabular-nums text-content-text-muted">
            {formatMs(Math.max(0, ms))}
          </span>
        ) : null}
        {open ? (
          <ChevronDown className="size-3 shrink-0 text-content-text-muted" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-content-text-muted" />
        )}
      </button>
      <div
        id={bodyId}
        inert={!open}
        hidden={!open}
        className="ml-3 space-y-1 border-l border-border/60 py-1 pl-2"
      >
        {children}
      </div>
    </div>
  );
}
