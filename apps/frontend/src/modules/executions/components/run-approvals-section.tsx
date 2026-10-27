import { ShieldAlert, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/infrastructure/api-client';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { ApprovalCard } from '@/components/semantic/approval-card';
import type { ConfidenceSignal } from '@/components/semantic/ai-verdict-pill';
import type { ExecutionRunDetail } from '../api/execution-api';

type ApprovalEntry = NonNullable<ExecutionRunDetail['approvals']>[number];

type AiJudgeMeta = {
  riskLevel?: string | null;
  confidence?: number | null;
  safeToAutoApprove?: number | null;
  options?: Record<string, number>;
  optionsChoice?: string;
  advisory?: boolean;
};

/**
 * 风险档折算（消费方折算，组件只渲染档位）：自报 riskLevel → 四档信号枚举。
 * 注意风险方向与置信相反——档越高越危险：read(只读)→1 · write(写操作)→2 · high_risk(高风险)→3 ·
 * 未知→0。风险档的红/黄/蓝配色由 ApprovalCard 内置（风险方向渲染），此处只做枚举折算。
 * AI 独立定级（aiJudge.riskLevel）不改判自报基准，走下方 advisory 附注对照。
 */
const SELF_RISK_TO_SIGNAL: Record<string, ConfidenceSignal> = {
  read: 1,
  write: 2,
  high_risk: 3,
};

/** 终态处置 → 受控凭证态（approve/reject 人决；expired/cancelled 系统处置走 neutral） */
const RESOLVED_STATE: Record<string, 'approve' | 'reject' | 'neutral'> = {
  approved: 'approve',
  auto_approved: 'approve',
  rejected: 'reject',
  expired: 'neutral',
  cancelled: 'neutral',
};

const STATUS_I18N: Record<string, string> = {
  pending: 'runApprovals.statusPending',
  approved: 'runApprovals.statusApproved',
  rejected: 'runApprovals.statusRejected',
  auto_approved: 'runApprovals.statusAutoApproved',
  expired: 'runApprovals.statusExpired',
  cancelled: 'runApprovals.statusCancelled',
};

/** AI 定级附注（CAP-A-27 advisory，原样保留的既有元素）：自报偏差提示 + AI 独立定级 + 置信百分比 + 低置信标注。
 *  低置信口径 0.7 与 decision-card 的 AI_LOW_CONFIDENCE 同尺（置信语义走黄，区别于风险档配色）。 */
function AiJudgeNote({ ai, selfRiskLevel }: { ai: AiJudgeMeta; selfRiskLevel: string }) {
  const { t } = useTranslation();
  if (!ai.advisory || !ai.riskLevel) return null;
  // 自报 vs AI 独立定级不一致（MCP/CLI 审批的 riskLevel 由被审批方自报，
  // AI 判定是系统侧第二意见）——偏差提示是双轨期的核心观察位
  const riskMismatch = !!ai.riskLevel && ai.riskLevel !== selfRiskLevel;
  return (
    <>
      {riskMismatch && (
        <span
          className="flex shrink-0 items-center gap-0.5 rounded-sm bg-accent-red-light/40 px-1.5 py-0.5 text-2xs font-medium text-accent-red"
          title={t('runApprovals.riskMismatchTitle', {
            self: t(`runApprovals.risk.${selfRiskLevel}`, selfRiskLevel),
            ai: t(`runApprovals.risk.${ai.riskLevel}`, ai.riskLevel),
          })}
        >
          <Sparkles className="size-3" />
          {t('runApprovals.riskMismatch', {
            ai: t(`runApprovals.risk.${ai.riskLevel}`, ai.riskLevel),
          })}
        </span>
      )}
      <span
        className={cn(
          'flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-2xs font-medium',
          (ai.confidence ?? 1) >= 0.7
            ? 'bg-accent-purple-light/40 text-accent-purple'
            : 'bg-accent-yellow-light/40 text-accent-yellow',
        )}
        title={t('runApprovals.aiJudgeTitle')}
      >
        <Sparkles className="size-3" />
        {`AI ${t(`runApprovals.risk.${ai.riskLevel}`, ai.riskLevel)}`}
        {typeof ai.confidence === 'number' ? ` ${Math.round(ai.confidence * 100)}%` : ''}
        {(ai.confidence ?? 1) < 0.7 ? ` · ${t('runApprovals.lowConfidence')}` : ''}
      </span>
    </>
  );
}

/** 裁决落库（既有契约 POST /execution/approvals/:id/resolve，resolution: approved|rejected，不造新端点）。
 *  失败先 toast 具体原因再原样上抛——ApprovalCard 捕获后回滚待决态，两键恢复可用。 */
async function resolveApproval(id: string, action: 'approve' | 'reject'): Promise<void> {
  try {
    await api.post(`/execution/approvals/${id}/resolve`, {
      resolution: action === 'approve' ? 'approved' : 'rejected',
    });
  } catch (error) {
    toast.error('审批提交未完成：网络或服务异常，请重试');
    throw error;
  }
}

/**
 * 执行详情审批段（CAP-A-27 P0-A 展示面 → 账本 B2 操作面）：人工执行验收流产生的审批单，
 * 统一收编为 ApprovalCard 操作件——待决单可单键批准/拒绝（快捷键 + 决后收场仪式），
 * 终态单渲染为凭证行；AI 风险定级 advisory（metadata.aiJudge）只展示不改变判定权；
 * 无审批单时整段不渲染。裁决走既有 resolve 契约，落库结果由详情轮询回填。
 */
export function RunApprovalsSection({ approvals }: { approvals?: ApprovalEntry[] }) {
  const { t } = useTranslation();
  if (!approvals?.length) return null;

  // §22.1 等人一等状态三要素之三：收件箱头可计数（待决数）
  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div className="shrink-0 border-b px-4 py-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold text-muted-foreground">
        <ShieldAlert className="size-3.5" />
        {t('runApprovals.title')}
        {pendingCount > 0 && (
          <span
            title={`待审 ${pendingCount}`}
            className="rounded-sm bg-accent-yellow-light px-1 font-mono text-2xs font-semibold text-accent-yellow"
          >
            {pendingCount}
          </span>
        )}
      </div>
      <ul className="space-y-1.5">
        {approvals.map((a) => {
          const ai = (a.metadata?.aiJudge ?? null) as AiJudgeMeta | null;
          const riskSignal = SELF_RISK_TO_SIGNAL[a.riskLevel] ?? 0;
          const riskLabel = t(`runApprovals.risk.${a.riskLevel}`, a.riskLevel);
          const aiNote = ai ? <AiJudgeNote ai={ai} selfRiskLevel={a.riskLevel} /> : null;
          const resolvedState = RESOLVED_STATE[a.status];
          return (
            <li key={a.id}>
              {a.status === 'pending' || resolvedState === undefined ? (
                /* 待决单：操作件（非受控，收场仪式由卡片自管）；未知状态按待决保守呈现 */
                <ApprovalCard
                  key={`${a.id}:${a.status}`}
                  title={a.requestedAction}
                  riskSignal={riskSignal}
                  riskLabel={riskLabel}
                  riskNote={aiNote}
                  onResolve={(action) => resolveApproval(a.id, action)}
                />
              ) : (
                /* 终态单：凭证行（§22.4 第 2 拍），文案沿用既有 i18n 状态键 */
                <ApprovalCard
                  key={`${a.id}:${a.status}`}
                  title={a.requestedAction}
                  riskSignal={riskSignal}
                  riskLabel={riskLabel}
                  resolved={resolvedState}
                  resolvedLabel={t(STATUS_I18N[a.status] ?? 'runApprovals.statusPending')}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
