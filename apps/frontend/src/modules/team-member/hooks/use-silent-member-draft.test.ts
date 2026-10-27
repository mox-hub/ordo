/**
 * AI 代写档案 hook 纯函数单测（CAP-A-18 AI 创建 AI 同事切片，GAP-T-74）：
 * parseMemberProfileDraft 容错解析（server 白名单形状的字段兜底）+
 * resolveAiModelConfigId 三级解析（精确 id → name 匹配库记录 → 合成 id 回落，
 * configure-ai-step.createDefaultAgent 同款口径）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.hoisted(() => vi.fn());
vi.mock('@/infrastructure/api-client', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

import {
  parseMemberProfileDraft,
  resolveAiModelConfigId,
} from './use-silent-member-draft';

describe('parseMemberProfileDraft 容错解析', () => {
  it('完整草稿：字段透传，tags 只留字符串', () => {
    expect(
      parseMemberProfileDraft({
        displayName: '评审官老王',
        handle: 'reviewer-laowang',
        title: '资深代码评审',
        description: '严格但给建设性意见',
        personalPrompt: '## 职责\n只评审不改码',
        thinkingLevel: 'high',
        defaultCliProviderId: 'claude-code',
        defaultExecutionRole: 'reviewer',
        suggestedProvider: 'glm',
        suggestedModel: 'glm-4.7',
        tags: ['review', 1, 'quality'],
        rationale: { model: '上下文长' },
      }),
    ).toEqual({
      displayName: '评审官老王',
      handle: 'reviewer-laowang',
      title: '资深代码评审',
      description: '严格但给建设性意见',
      personalPrompt: '## 职责\n只评审不改码',
      thinkingLevel: 'high',
      defaultCliProviderId: 'claude-code',
      defaultExecutionRole: 'reviewer',
      suggestedProvider: 'glm',
      suggestedModel: 'glm-4.7',
      tags: ['review', 'quality'],
      rationale: { model: '上下文长' },
    });
  });

  it('空对象/垃圾输入：槽位全 null、thinkingLevel 回落 medium、不抛错', () => {
    const empty = parseMemberProfileDraft({});
    expect(empty.displayName).toBeNull();
    expect(empty.handle).toBeNull();
    expect(empty.thinkingLevel).toBe('medium');
    expect(empty.tags).toEqual([]);
    expect(empty.rationale).toBeNull();
    expect(parseMemberProfileDraft(null)).toEqual(empty);
    expect(parseMemberProfileDraft('garbage')).toEqual(empty);
  });
});

describe('resolveAiModelConfigId 三级解析（服务端 aiModelConfigId 硬校验的前置）', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('精确 id 匹配库记录', async () => {
    getMock.mockResolvedValue([
      { id: 'glm-4.7', name: 'GLM-4.7', provider: 'glm', enabled: true },
    ]);
    await expect(resolveAiModelConfigId('glm', 'glm-4.7')).resolves.toBe(
      'glm-4.7',
    );
  });

  it('name 匹配非合成行（id 是 cuid 的库记录）', async () => {
    getMock.mockResolvedValue([
      { id: 'cuid-abc', name: 'glm-4.7', provider: 'glm', enabled: true },
    ]);
    await expect(resolveAiModelConfigId('glm', 'glm-4.7')).resolves.toBe(
      'cuid-abc',
    );
  });

  it('无匹配模型 → 该厂家首个库记录兜底', async () => {
    getMock.mockResolvedValue([
      { id: 'cuid-first', name: 'glm-4-air', provider: 'glm', enabled: true },
    ]);
    await expect(resolveAiModelConfigId('glm', 'glm-9')).resolves.toBe(
      'cuid-first',
    );
  });

  it('零库记录 → 合成 id 回落（GET /ai/models 适配器模型同构口径）', async () => {
    getMock.mockResolvedValue([
      { id: 'glm_glm-9', name: 'glm-9', provider: 'glm', enabled: true },
    ]);
    await expect(resolveAiModelConfigId('glm', 'glm-9')).resolves.toBe(
      'glm_glm-9',
    );
  });

  it('getModels 失败 → 合成 id 回落（不阻塞创建）', async () => {
    getMock.mockRejectedValue(new Error('network down'));
    await expect(resolveAiModelConfigId('glm', 'glm-9')).resolves.toBe(
      'glm_glm-9',
    );
  });
});
