/**
 * AI 代写 AI 同事档案（CAP-A-18「AI 创建 AI 同事」切片，GAP-T-74）。
 *
 * 消费统一静默通道 `POST /ai/assistant/silent` 的 `member-profile-draft` 场景
 * （零新端点；server 端 prepareContext 查模型/CLI/角色候选做 grounding，postProcess
 * 做候选白名单收口——越界建议已是 null）。前端只做两件事：
 * 1. parseMemberProfileDraft：容错解析（server 白名单形状的字段兜底）；
 * 2. resolveAiModelConfigId：把「厂家+模型」建议解析成服务端创建硬校验必填的
 *    aiModelConfigId——库记录优先（AIModelConfig enabled 行）、合成 id 回落
 *    （configure-ai-step.createDefaultAgent 同款口径：GET /ai/models 对适配器
 *    模型返回 `${provider}_${model}` 合成 id，显示侧走 metadata 拼装不回查库）。
 * 红线：AI 只代写草稿，落库必须走人确认后的 POST /members（页面承接）。
 */
import { useMutation } from '@tanstack/react-query';
import { assistantApi } from '@/modules/assistant/api/assistant-api';
import { aiHubApi, type AIModel } from '@/modules/ai-hub/api/ai-hub-api';

/** 与 server sanitizeMemberProfileDraft 输出白名单同构（字段缺失/越界均为 null） */
export interface MemberProfileDraft {
  displayName: string | null;
  handle: string | null;
  title: string | null;
  description: string | null;
  personalPrompt: string | null;
  thinkingLevel: string;
  defaultCliProviderId: string | null;
  defaultExecutionRole: string | null;
  suggestedProvider: string | null;
  suggestedModel: string | null;
  tags: string[];
  rationale: { model?: string; role?: string; prompt?: string } | null;
}

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

/** 容错解析：server 已白名单收口，此处只做形状兜底（字段缺失不抛错） */
export function parseMemberProfileDraft(data: unknown): MemberProfileDraft {
  const raw = (data ?? {}) as Record<string, unknown>;
  const thinking = str(raw.thinkingLevel);
  const rationale =
    raw.rationale && typeof raw.rationale === 'object' && !Array.isArray(raw.rationale)
      ? (raw.rationale as MemberProfileDraft['rationale'])
      : null;
  return {
    displayName: str(raw.displayName),
    handle: str(raw.handle),
    title: str(raw.title),
    description: str(raw.description),
    personalPrompt: str(raw.personalPrompt),
    thinkingLevel: thinking ?? 'medium',
    defaultCliProviderId: str(raw.defaultCliProviderId),
    defaultExecutionRole: str(raw.defaultExecutionRole),
    suggestedProvider: str(raw.suggestedProvider),
    suggestedModel: str(raw.suggestedModel),
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((t): t is string => typeof t === 'string')
      : [],
    rationale,
  };
}

/**
 * 建议模型 → aiModelConfigId：精确匹配库记录（id 即模型名或 name 相等的非合成行）
 * → 该厂家首个库记录 → `${provider}_${model}` 合成 id（与 GET /ai/models 对适配器
 * 模型的合成口径同构，悬空无实害）。
 */
export async function resolveAiModelConfigId(
  provider: string,
  model: string,
): Promise<string> {
  const models: AIModel[] = await aiHubApi.getModels(provider).catch(() => []);
  const dbModel =
    models.find((m) => m.id === model) ??
    models.find((m) => m.name === model && !m.id.startsWith(`${provider}_`)) ??
    models.find((m) => !m.id.startsWith(`${provider}_`));
  return dbModel?.id ?? `${provider}_${model}`;
}

export interface SilentMemberDraftInput {
  brief: string;
  /** 重新生成时对上一稿的反馈（可空） */
  feedback?: string;
  projectId?: string;
}

export function useSilentMemberDraft() {
  return useMutation({
    mutationFn: async (input: SilentMemberDraftInput) => {
      const result = await assistantApi.silent('member-profile-draft', {
        projectId: input.projectId,
        context: {
          brief: input.brief,
          ...(input.feedback ? { feedback: input.feedback } : {}),
        },
      });
      return parseMemberProfileDraft(result.data);
    },
  });
}
