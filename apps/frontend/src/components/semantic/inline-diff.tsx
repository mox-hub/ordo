/**
 * InlineDiff - [AI] 文本逐段审阅件（组件规划账本 B6 · 宪法 §22.6 diff 优先律）
 *
 * AI 修改既有内容（文档 / 提示词 / 文案）的呈现位：默认 **diff 形态**（改前/改后对照）
 * 而非替换后成品；逐段接受/拒绝；「全部接受」随时可逐段回退（应用前任一段可切回拒绝，
 * 合成结果实时可预览）。
 *
 * - **零依赖词级 diff**：内部 LCS 对齐（token = 拉丁词 / 单个 CJK 字 / 标点 / 空白串），
 *   几百词规模性能足够；超大输入（单侧 > 2000 token）退化为整段替换，不做 O(n²) 硬算。
 *   纯函数 `tokenize` / `diffTextSegments` / `synthesizeAppliedText` 从本文件导出供测试与消费方复用，
 *   **禁引入 jsdiff 等外部 diff 依赖**（§22.6 承载件零依赖）。
 * - **逐段裁决**：每个变更段（连续删除+新增构成的一段）右侧出裁决小钮（✓已接受 ↔ ✕已拒绝），
 *   默认全部=接受。选钮而非「点段循环切换」的理由：二态显式钮的语义（接受=采用新增侧 /
 *   拒绝=保留原文侧）一眼可辨，三态循环（接受↔拒绝↔还原）中「还原」与「拒绝」不可区分；
 *   且整段点按与文本选中（复制）冲突。diff 形态恒定不随裁决变化——裁决只改合成结果与钮态。
 * - **应用与回退边界**：onApply 只在点击「应用修改」时发出（不随裁决自动发出）；
 *   **组件不做二次撤销态**——已应用后的回退由消费方持有原文实现（消费方在 onApply 前自行保存
 *   before，需要回退时把内容重设为保存值并重传 props 即可整体重置裁决）。本件只保证
 *   应用前裁决完备（任意组合实时可预览）。
 * - **受控纯展示 + 回调件**（§10.7）：...props 透传到根、ref 到根（React 19 ref 即普通 prop）；
 *   文案缺省为中文常量（§16），消费方经 labels 覆写接入 i18n。
 * - **快捷键**（仅组件聚焦时生效，焦点落入输入类控件自动让路）：
 *   j/k 在变更段间移动焦点，Enter 切换当前段裁决（焦点在裁决钮上走 button 原生激活，无二次劫持），
 *   a 在「全部接受 / 全部拒绝」间切换。
 * - **a11y**：容器 role="group" + aria-label（缺省「AI 修改对照」）；裁决钮 aria-label 含
 *   序数与裁决态（「第 2 处修改，已接受」）；删除/新增不只靠颜色——<del> 删除线 + <ins> 下划线
 *   附加通道（§8.5 第 4 条）。
 */
import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// 词级 diff 纯函数（零依赖 LCS）
// ---------------------------------------------------------------------------

export type DiffOpType = 'same' | 'del' | 'ins';

export interface DiffOp {
  type: DiffOpType;
  /** token 原文（含空白 token，空白串按原样保留） */
  text: string;
}

/**
 * 词法切分：拉丁词/数字串为一词、CJK（汉字/假名/谚文）逐字为词、
 * 空白串（含换行）为一个 token、其余标点逐字为词。
 * 中英混排、代码片段、全半角标点都能对齐到词粒度。
 */
const TOKEN_RE = /[A-Za-z0-9_]+|[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff]|\s+|[^\s]/g;

export function tokenize(text: string): string[] {
  return text.match(TOKEN_RE) ?? [];
}

/** LCS 硬算上限（单侧 token 数）：超过即整段替换兜底，防 O(n²) 矩阵膨胀 */
const MAX_LCS_TOKENS = 2000;

/**
 * token 级 LCS 对齐：返回顺序 ops（same / del / ins）。
 * 纯函数、零依赖；几百词规模（~500×500 矩阵）微秒级可完成。
 */
export function diffTokens(a: string[], b: string[]): DiffOp[] {
  const m = a.length;
  const n = b.length;
  if (m === 0 && n === 0) return [];
  if (m === 0) return b.map((text) => ({ type: 'ins' as const, text }));
  if (n === 0) return a.map((text) => ({ type: 'del' as const, text }));
  if (m > MAX_LCS_TOKENS || n > MAX_LCS_TOKENS) {
    return [
      ...a.map((text) => ({ type: 'del' as const, text })),
      ...b.map((text) => ({ type: 'ins' as const, text })),
    ];
  }

  // dp[i][j] = a[i..] 与 b[j..] 的 LCS 长度（自底向上，Uint16 行矩阵）
  const width = n + 1;
  const dp = new Uint16Array((m + 1) * width);
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i * width + j] =
        a[i] === b[j]
          ? dp[(i + 1) * width + j + 1] + 1
          : Math.max(dp[(i + 1) * width + j], dp[i * width + j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      ops.push({ type: 'same', text: a[i] });
      i++;
      j++;
    } else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) {
      ops.push({ type: 'del', text: a[i] });
      i++;
    } else {
      ops.push({ type: 'ins', text: b[j] });
      j++;
    }
  }
  while (i < m) ops.push({ type: 'del', text: a[i++] });
  while (j < n) ops.push({ type: 'ins', text: b[j++] });
  return ops;
}

/** 段：unchanged = 连续未变 token；changed = 连续删除+新增构成的一个「变更段」 */
export interface DiffSegment {
  /** 渲染序（文档序，0 起），裁决数组以它为键 */
  index: number;
  type: 'unchanged' | 'changed';
  /** type=unchanged：段文本；changed 恒 '' */
  text: string;
  /** type=changed：删除侧文本（裁决=拒绝时保留的原文片段）；unchanged 恒 '' */
  removed: string;
  /** type=changed：新增侧文本（裁决=接受时采用的新文片段）；unchanged 恒 '' */
  added: string;
  /** 第 N 处修改（1 起，a11y 序数）；unchanged 恒 0 */
  ordinal: number;
}

/**
 * before/after 纯文本 → 段序列（纯函数）。
 * 空白 token（含 \n）原样进段，渲染层 whitespace-pre-wrap 保持段落结构。
 */
export function diffTextSegments(before: string, after: string): DiffSegment[] {
  const ops = diffTokens(tokenize(before), tokenize(after));
  const segments: DiffSegment[] = [];
  let unchanged = '';
  let removed = '';
  let added = '';
  let ordinal = 0;
  let index = 0;

  const flushUnchanged = () => {
    if (unchanged === '') return;
    segments.push({ index: index++, type: 'unchanged', text: unchanged, removed: '', added: '', ordinal: 0 });
    unchanged = '';
  };
  const flushChanged = () => {
    if (removed === '' && added === '') return;
    segments.push({
      index: index++,
      type: 'changed',
      text: '',
      removed,
      added,
      ordinal: ++ordinal,
    });
    removed = '';
    added = '';
  };

  for (const op of ops) {
    if (op.type === 'same') {
      flushChanged();
      unchanged += op.text;
    } else {
      flushUnchanged();
      if (op.type === 'del') removed += op.text;
      else added += op.text;
    }
  }
  flushChanged();
  flushUnchanged();
  return segments;
}

/** 裁决初始态：全部接受（unchanged 段恒 accepted=true 且不可裁决） */
export function initialDecisions(segments: DiffSegment[]): DiffDecision[] {
  return segments.map((segment) => ({
    index: segment.index,
    type: segment.type,
    accepted: true,
  }));
}

/**
 * 按裁决合成应用后文本（纯函数，appliedText 口径）：
 * unchanged 段原样；changed 段接受取新增侧（added）、拒绝取保留侧（removed），顺序拼接。
 */
export function synthesizeAppliedText(segments: DiffSegment[], decisions: DiffDecision[]): string {
  const acceptedByIndex = new Map(decisions.map((d) => [d.index, d.accepted]));
  return segments
    .map((segment) => {
      if (segment.type === 'unchanged') return segment.text;
      return acceptedByIndex.get(segment.index) === false ? segment.removed : segment.added;
    })
    .join('');
}

// ---------------------------------------------------------------------------
// 文案（缺省中文常量，§16；消费方经 labels 覆写接入 i18n）
// ---------------------------------------------------------------------------

export interface InlineDiffLabels {
  /** 容器可访问名（role="group" 的 aria-label） */
  containerLabel: string;
  /** 变更段裁决钮可访问名（已接受态）；{ordinal} = 第几处修改 */
  segmentAccepted: string;
  /** 变更段裁决钮可访问名（已拒绝态） */
  segmentRejected: string;
  /** 无差异占位（before 与 after 一致时整件只有这一句） */
  noChanges: string;
  /** 底部动作钮：全部接受 / 全部拒绝（互为反义，显示的是按下去会变成的动作） */
  acceptAll: string;
  rejectAll: string;
  /** 预览开关（对照态钮文 / 预览态钮文）与预览区可访问名 */
  preview: string;
  backToDiff: string;
  previewRegion: string;
  /** 应用钮主文案与进度注；{total} = 变更段总数，{accepted} = 已接受数 */
  apply: string;
  applyProgress: string;
}

const DEFAULT_LABELS: InlineDiffLabels = {
  containerLabel: 'AI 修改对照',
  segmentAccepted: '第 {ordinal} 处修改，已接受',
  segmentRejected: '第 {ordinal} 处修改，已拒绝',
  noChanges: '两个版本内容一致，没有需要裁决的修改',
  acceptAll: '全部接受',
  rejectAll: '全部拒绝',
  preview: '预览合成结果',
  backToDiff: '返回对照',
  previewRegion: '应用后的合成结果预览',
  apply: '应用修改',
  applyProgress: '（{total} 处中已接受 {accepted} 处）',
};

/** 模板占位替换（{key}），未命中原样保留 */
function tpl(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}

// ---------------------------------------------------------------------------
// 裁决模型
// ---------------------------------------------------------------------------

export interface DiffDecision {
  /** 段序号（= DiffSegment.index，渲染序 0 起） */
  index: number;
  type: 'unchanged' | 'changed';
  /** unchanged 段恒 true 且不可裁决；changed 段默认 true（全部=接受） */
  accepted: boolean;
}

// ---------------------------------------------------------------------------
// 本体
// ---------------------------------------------------------------------------

export interface InlineDiffProps extends React.ComponentProps<'div'> {
  /** 原文（纯文本，\n 分段） */
  before: string;
  /** AI 改后文（纯文本，\n 分段） */
  after: string;
  /** 「应用修改」回调：按逐段裁决合成 appliedText；不随裁决自动发出 */
  onApply?: (appliedText: string) => void;
  /** 裁决变化回调（逐段切换 / 全部切换都发，携带全量段决策含未变段） */
  onSegmentChange?: (decisions: DiffDecision[]) => void;
  /** 文案覆写（缺省中文常量） */
  labels?: Partial<InlineDiffLabels>;
}

export function InlineDiff({
  before,
  after,
  onApply,
  onSegmentChange,
  labels,
  className,
  ...rest
}: InlineDiffProps) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const segments = useMemo(() => diffTextSegments(before, after), [before, after]);
  const [decisions, setDecisions] = useState<DiffDecision[]>(() => initialDecisions(segments));
  const [previewing, setPreviewing] = useState(false);

  // 源文本变化（消费方换 before/after 或回退重传）→ 全部裁决与预览态整体重置
  // （React 认可的「渲染期按 props 变化调整 state」模式；裁决是本件自有的交互态，非受控值缓存）
  const [prevSource, setPrevSource] = useState({ before, after });
  if (prevSource.before !== before || prevSource.after !== after) {
    setPrevSource({ before, after });
    setDecisions(initialDecisions(segments));
    setPreviewing(false);
  }

  const changedSegments = segments.filter((s) => s.type === 'changed');
  const changedDecisions = decisions.filter((d) => d.type === 'changed');
  const hasChanges = changedSegments.length > 0;
  const allAccepted = changedDecisions.every((d) => d.accepted);
  const acceptedCount = changedDecisions.filter((d) => d.accepted).length;

  const appliedText = useMemo(
    () => synthesizeAppliedText(segments, decisions),
    [segments, decisions],
  );

  const emitDecisions = (next: DiffDecision[]) => {
    setDecisions(next);
    onSegmentChange?.(next);
  };

  const toggleSegment = (index: number) => {
    emitDecisions(decisions.map((d) => (d.index === index ? { ...d, accepted: !d.accepted } : d)));
  };

  /** a 键 / 底部互反钮：全接受 ↔ 全拒绝 */
  const toggleAll = () => {
    emitDecisions(
      decisions.map((d) => (d.type === 'changed' ? { ...d, accepted: !allAccepted } : d)),
    );
  };

  const handleApply = () => {
    onApply?.(appliedText);
  };

  // 快捷键仅组件聚焦时生效（keydown 只在焦点于本件内时到达根容器）；
  // 焦点在输入类控件内自动让路（不抢输入框）；修饰键组合不劫持。
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    const toggles = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[data-segment-type="changed"] button',
      ),
    );
    if (toggles.length === 0) return;
    if (event.key === 'j' || event.key === 'k') {
      event.preventDefault();
      const current = toggles.indexOf(document.activeElement as HTMLButtonElement | null);
      const next =
        event.key === 'j'
          ? Math.min(current + 1, toggles.length - 1)
          : Math.max(current - 1, 0);
      toggles[current === -1 ? 0 : next].focus();
    } else if (event.key === 'a' || event.key === 'A') {
      event.preventDefault();
      toggleAll();
    }
  };

  return (
    <div
      data-slot="inline-diff"
      data-ai-component="inline-diff"
      role="group"
      aria-label={l.containerLabel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        'rounded-lg border bg-card px-4 py-3',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
      {...rest}
    >
      <div
        data-slot="inline-diff-body"
        className="whitespace-pre-wrap break-words text-sm leading-relaxed text-content-text"
      >
        {previewing ? (
          <div data-slot="inline-diff-preview" aria-label={l.previewRegion}>
            {appliedText}
          </div>
        ) : (
          segments.map((segment) => {
            if (segment.type === 'unchanged') {
              return (
                <span
                  key={segment.index}
                  data-slot="inline-diff-segment"
                  data-segment-type="unchanged"
                >
                  {segment.text}
                </span>
              );
            }
            const accepted = decisions.find((d) => d.index === segment.index)?.accepted ?? true;
            return (
              <span
                key={segment.index}
                data-slot="inline-diff-segment"
                data-segment-type="changed"
                data-change-ordinal={segment.ordinal}
                data-accepted={accepted ? 'true' : 'false'}
              >
                {segment.removed ? (
                  // §8.5 第 4 条：删除不只靠颜色——<del> 删除线为附加通道
                  <del className="rounded-xs bg-accent-red-light/70 px-0.5 text-accent-red line-through decoration-accent-red/60">
                    {segment.removed}
                  </del>
                ) : null}
                {segment.added ? (
                  // §8.5 第 4 条：新增不只靠颜色——<ins> 下划线为附加通道
                  <ins
                    className={cn(
                      'rounded-xs bg-accent-green-light/70 px-0.5 text-accent-green underline decoration-accent-green/60',
                      segment.removed && 'ml-1',
                    )}
                  >
                    {segment.added}
                  </ins>
                ) : null}
                {/* 逐段裁决钮：显式二态（✓已接受 ↔ ✕已拒绝），icon 形状即状态（§8.5 第 4 条） */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-2xs"
                  aria-label={
                    accepted
                      ? tpl(l.segmentAccepted, { ordinal: segment.ordinal })
                      : tpl(l.segmentRejected, { ordinal: segment.ordinal })
                  }
                  aria-pressed={accepted}
                  onClick={() => toggleSegment(segment.index)}
                  className={cn(
                    'mx-1 align-middle',
                    accepted ? 'text-accent-green' : 'text-accent-red',
                  )}
                >
                  {accepted ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <X aria-hidden="true" />
                  )}
                </Button>
              </span>
            );
          })
        )}
      </div>
      {hasChanges ? (
        <div
          data-slot="inline-diff-actions"
          className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3"
        >
          <Button type="button" variant="ghost" size="xs" onClick={toggleAll}>
            {allAccepted ? l.rejectAll : l.acceptAll}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-pressed={previewing}
            onClick={() => setPreviewing((prev) => !prev)}
          >
            {previewing ? l.backToDiff : l.preview}
          </Button>
          <span className="flex-1" />
          <Button type="button" size="xs" onClick={handleApply}>
            {l.apply}
            <span className="font-normal text-content-text-muted">
              {tpl(l.applyProgress, { total: changedSegments.length, accepted: acceptedCount })}
            </span>
          </Button>
        </div>
      ) : (
        <p data-slot="inline-diff-nochanges" className="mt-2 text-xs text-content-text-muted">
          {l.noChanges}
        </p>
      )}
    </div>
  );
}
