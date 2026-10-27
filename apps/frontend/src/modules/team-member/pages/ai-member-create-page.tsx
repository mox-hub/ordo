/**
 * 「AI 创建 AI 同事」专属页面（CAP-A-18 切片，GAP-T-74）——A-18 主卡
 * 「统一创建面板双界面：手动 × AI 代理平行」在 AI 员工实体上的完整实例。
 *
 * 三段式一页流：描述（一句话）→ AI 代写（静默场景 member-profile-draft，零新端点）
 * → 确认（草稿分卡，逐字段可编辑、每条建议带 AI 依据，人确认后才创建）。
 *
 * 红线与降级（方案 docs/roadmap/内置AI引导与AI员工创建方案-2026-10-26.md §二）：
 * - AI 只代写草稿，创建走 POST /members 服务端硬校验（aiModelConfigId 必填，
 *   页面以「库记录优先、合成 id 回落」解析）；
 * - 内置 AI 完全不可用（就绪度 L1）→ 诚实降级：手动创建入口 + AI 配置入口；
 * - AI 未给出的槽位（null）→ 标「AI 未给出，请手动补」；显示名/模型缺失阻止创建。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bot, ChevronRight, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  SelectField,
  SelectFieldOption,
} from '@/components/ui/select-field';
import { toast } from '@/components/ui/toast';
import { PageShell } from '@/components/semantic/page-shell';
import { SubPageToolbar } from '@/components/semantic/sub-page-toolbar';
import { useAiReadiness } from '@/modules/ai-hub/hooks/use-ai-readiness';
import {
  MEMBER_THINKING_LEVELS,
  type ThinkingLevel,
} from '@/shared/member/types';
import { useCreateMember } from '../hooks';
import {
  resolveAiModelConfigId,
  useSilentMemberDraft,
  type MemberProfileDraft,
} from '../hooks/use-silent-member-draft';

/** 确认阶段的可编辑表单态（草稿 → 本地副本，用户改动只落这里，不回写草稿） */
interface DraftFormState {
  displayName: string;
  handle: string;
  title: string;
  description: string;
  personalPrompt: string;
  provider: string;
  model: string;
  cliProvider: string;
  executionRole: string;
  thinkingLevel: ThinkingLevel;
}

const toForm = (draft: MemberProfileDraft): DraftFormState => ({
  displayName: draft.displayName ?? '',
  handle: draft.handle ?? '',
  title: draft.title ?? '',
  description: draft.description ?? '',
  personalPrompt: draft.personalPrompt ?? '',
  provider: draft.suggestedProvider ?? '',
  model: draft.suggestedModel ?? '',
  cliProvider: draft.defaultCliProviderId ?? '',
  executionRole: draft.defaultExecutionRole ?? '',
  thinkingLevel: (draft.thinkingLevel as ThinkingLevel) ?? 'medium',
});

/** AI 未给出的槽位提示（草稿 null → 输入框留空 + 行内说明，六问⑤：用户永远能继续） */
function NotGivenHint() {
  const { t } = useTranslation();
  return (
    <p className="mt-1 flex items-center gap-1 text-3xs text-muted-foreground">
      <TriangleAlert className="size-3 shrink-0" />
      {t('aiMemberCreate.aiNotGiven')}
    </p>
  );
}

/** 分卡字段行：label + 编辑控件 + 可选「AI 依据」 */
function DraftField({
  label,
  children,
  rationale,
  missing,
}: {
  label: string;
  children: React.ReactNode;
  rationale?: string | null;
  missing?: boolean;
}) {
  return (
    <div className="min-w-0">
      <Label className="mb-1">{label}</Label>
      {children}
      {missing ? <NotGivenHint /> : null}
      {rationale ? (
        <p className="mt-1 text-3xs leading-relaxed text-muted-foreground">
          {rationale}
        </p>
      ) : null}
    </div>
  );
}

export function AiMemberCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state: readinessState } = useAiReadiness();
  const generate = useSilentMemberDraft();
  const createMember = useCreateMember();

  const [stage, setStage] = useState<'brief' | 'generating' | 'confirm'>('brief');
  const [brief, setBrief] = useState('');
  const [feedback, setFeedback] = useState('');
  const [draft, setDraft] = useState<MemberProfileDraft | null>(null);
  const [form, setForm] = useState<DraftFormState | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const patch = (next: Partial<DraftFormState>) =>
    setForm((prev) => (prev ? { ...prev, ...next } : prev));

  const startGenerate = (regenerateFeedback?: string) => {
    if (!brief.trim()) return;
    setSubmitError(null);
    setStage('generating');
    generate.mutate(
      { brief: brief.trim(), ...(regenerateFeedback ? { feedback: regenerateFeedback.trim() } : {}) },
      {
        onSuccess: (result) => {
          setDraft(result);
          setForm(toForm(result));
          setFeedback('');
          setStage('confirm');
        },
        onError: () => setStage('brief'),
      },
    );
  };

  const submit = async () => {
    if (!form) return;
    if (!form.displayName.trim() || !form.provider.trim() || !form.model.trim()) {
      setSubmitError(t('aiMemberCreate.missingRequired'));
      return;
    }
    setSubmitError(null);
    try {
      const aiModelConfigId = await resolveAiModelConfigId(
        form.provider.trim(),
        form.model.trim(),
      );
      const member = await createMember.mutateAsync({
        type: 'ai_agent',
        displayName: form.displayName.trim(),
        ...(form.handle.trim() ? { handle: form.handle.trim() } : {}),
        ...(form.title.trim() ? { title: form.title.trim() } : {}),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        ...(form.personalPrompt.trim()
          ? { personalPrompt: form.personalPrompt.trim() }
          : {}),
        thinkingLevel: form.thinkingLevel,
        ...(form.cliProvider.trim()
          ? { defaultCliProviderId: form.cliProvider.trim() }
          : {}),
        ...(form.executionRole.trim()
          ? { defaultExecutionRole: form.executionRole.trim() }
          : {}),
        ...(draft?.tags.length ? { tags: draft.tags } : {}),
        aiModelConfigId,
        // 溯源：这份档案由 AI 代写、人确认（rationale 随 metadata 留档可查）
        metadata: { origin: 'ai-member-draft', ...(draft?.rationale ?? {}) },
      });
      toast.success(t('aiMemberCreate.createdToast'));
      navigate(`/app/members/${member.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : t('aiMemberCreate.generateFailed'),
      );
    }
  };

  return (
    // L1 阅读档母版分发宽度（F1.4）：页面自不手写 max-w，padding 交还内容区自管
    <PageShell aiPage="team-member.ai-create" variant="reading" padded={false}>
      <SubPageToolbar
        aiId="team-member.ai-create"
        onBack={() => navigate('/app/members')}
        backLabel={t('common.back', 'Back')}
        breadcrumbs={[
          { label: t('members.title', 'Members'), to: '/app/members' },
          { label: t('aiMemberCreate.title') },
        ]}
      />

      {/* L1 诚实降级：内置 AI 完全不可用时代写不可用，给两条出路（配置 / 手动） */}
      {readinessState === 'unavailable' ? (
        <div className="px-6 py-6">
          <div className="rounded-lg border border-accent-orange/40 bg-accent-orange/5 p-4">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-accent-orange" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {t('aiHub.readiness.unavailableTitle')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('aiMemberCreate.manualFallback')}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => navigate('/app/settings/ai')}>
                    {t('aiHub.readiness.goConfigure')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/app/members?create=member&memberType=ai_agent')}
                  >
                    {t('aiMemberCreate.openManual')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 px-6 py-6">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <Bot className="size-5 text-primary" />
              {t('aiMemberCreate.title')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('aiMemberCreate.subtitle')}
            </p>
          </div>

          {stage === 'brief' ? (
              <div className="space-y-3">
                <Label htmlFor="ai-member-brief">
                  {t('aiMemberCreate.briefLabel')}
                </Label>
              <Textarea
                id="ai-member-brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder={t('aiMemberCreate.briefPlaceholder')}
                rows={3}
              />
              {generate.isError ? (
                <p className="flex items-center gap-1.5 rounded-md bg-accent-red-light/50 p-2.5 text-xs text-accent-red" role="alert">
                  <TriangleAlert className="size-3.5 shrink-0" />
                  <span className="min-w-0 break-all">
                    {generate.error instanceof Error
                      ? generate.error.message
                      : t('aiMemberCreate.generateFailed')}
                  </span>
                </p>
              ) : null}
              <Button
                disabled={!brief.trim() || generate.isPending}
                onClick={() => startGenerate()}
              >
                {generate.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    {t('aiMemberCreate.generating')}
                  </>
                ) : (
                  t('aiMemberCreate.generate')
                )}
              </Button>
            </div>
          ) : null}

          {stage === 'generating' ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              <Spinner className="shrink-0" />
              {t('aiMemberCreate.generating')}
            </div>
          ) : null}

          {stage === 'confirm' && form && draft ? (
            <>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                {t('aiMemberCreate.confirmHint')}
              </div>

              {/* 身份卡 */}
              <section className="space-y-4 rounded-lg border border-border p-4">
                <h2 className="text-sm font-semibold">{t('aiMemberCreate.sectionIdentity')}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DraftField label={t('aiMemberCreate.fieldDisplayName')} missing={!form.displayName.trim()}>
                    <Input
                      value={form.displayName}
                      onChange={(e) => patch({ displayName: e.target.value })}
                    />
                  </DraftField>
                  <DraftField label={t('aiMemberCreate.fieldHandle')} missing={!form.handle.trim()}>
                    <Input
                      value={form.handle}
                      onChange={(e) => patch({ handle: e.target.value })}
                    />
                  </DraftField>
                  <DraftField label={t('aiMemberCreate.fieldTitle')}>
                    <Input
                      value={form.title}
                      onChange={(e) => patch({ title: e.target.value })}
                    />
                  </DraftField>
                  <DraftField label={t('aiMemberCreate.fieldDescription')}>
                    <Input
                      value={form.description}
                      onChange={(e) => patch({ description: e.target.value })}
                    />
                  </DraftField>
                </div>
              </section>

              {/* 模型卡：建议 + 依据，可直接改（落库前由 resolveAiModelConfigId 解析） */}
              <section className="space-y-4 rounded-lg border border-border p-4">
                <h2 className="text-sm font-semibold">{t('aiMemberCreate.sectionModel')}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DraftField
                    label={t('aiMemberCreate.fieldProvider')}
                    missing={!form.provider.trim()}
                    rationale={draft.rationale?.model ?? null}
                  >
                    <Input
                      value={form.provider}
                      onChange={(e) => patch({ provider: e.target.value })}
                    />
                  </DraftField>
                  <DraftField label={t('aiMemberCreate.fieldModel')} missing={!form.model.trim()}>
                    <Input
                      value={form.model}
                      onChange={(e) => patch({ model: e.target.value })}
                    />
                  </DraftField>
                </div>
              </section>

              {/* 提示词卡 */}
              <section className="space-y-3 rounded-lg border border-border p-4">
                <h2 className="text-sm font-semibold">{t('aiMemberCreate.sectionPrompt')}</h2>
                <DraftField
                  label={t('aiMemberCreate.fieldDescription')}
                  rationale={draft.rationale?.prompt ?? null}
                >
                  <Textarea
                    value={form.personalPrompt}
                    onChange={(e) => patch({ personalPrompt: e.target.value })}
                    rows={6}
                  />
                </DraftField>
              </section>

              {/* 执行卡 */}
              <section className="space-y-4 rounded-lg border border-border p-4">
                <h2 className="text-sm font-semibold">{t('aiMemberCreate.sectionExecution')}</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <DraftField
                    label={t('aiMemberCreate.fieldCliProvider')}
                    missing={!form.cliProvider.trim()}
                    rationale={draft.rationale?.role ?? null}
                  >
                    <Input
                      value={form.cliProvider}
                      onChange={(e) => patch({ cliProvider: e.target.value })}
                    />
                  </DraftField>
                  <DraftField label={t('aiMemberCreate.fieldExecutionRole')}>
                    <Input
                      value={form.executionRole}
                      onChange={(e) => patch({ executionRole: e.target.value })}
                    />
                  </DraftField>
                  <DraftField label={t('aiMemberCreate.fieldThinkingLevel')}>
                    <div className="w-full">
                      <SelectField
                        value={form.thinkingLevel}
                        onChange={(e) =>
                          patch({ thinkingLevel: e.target.value as ThinkingLevel })
                        }
                      >
                        {MEMBER_THINKING_LEVELS.map((level) => (
                          <SelectFieldOption key={level.value} value={level.value}>
                            {level.label}
                          </SelectFieldOption>
                        ))}
                      </SelectField>
                    </div>
                  </DraftField>
                </div>
              </section>

              {submitError ? (
                <p className="rounded-md bg-accent-red-light/50 p-3 text-xs text-accent-red" role="alert">
                  {submitError}
                </p>
              ) : null}

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={t('aiMemberCreate.feedbackPlaceholder')}
                  />
                  <Button
                    variant="outline"
                    disabled={generate.isPending}
                    onClick={() => startGenerate(feedback)}
                  >
                    {t('aiMemberCreate.regenerate')}
                  </Button>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => navigate('/app/members?create=member&memberType=ai_agent')}>
                    {t('aiMemberCreate.openManual')}
                  </Button>
                  <Button
                    disabled={createMember.isPending}
                    onClick={() => void submit()}
                    data-ai-action="team-member.ai-create.submit"
                  >
                    {createMember.isPending ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        {t('aiMemberCreate.submitting')}
                      </>
                    ) : (
                      <>
                        {t('aiMemberCreate.submit')}
                        <ChevronRight className="ml-1 size-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </PageShell>
  );
}
