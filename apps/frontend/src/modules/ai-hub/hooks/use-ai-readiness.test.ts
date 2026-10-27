/**
 * AI 就绪度推导单测（CAP-A-18 三件套 ③悬浮提醒，GAP-T-72 测试义务）：
 * 四态边界——零可用厂家 / 有厂家无内置模型 / 内置模型指向厂家失效或实测失败 / 全就绪，
 * 以及「有 Key 未实测（disconnected）不算不可用」的后端口径对齐。
 */
import { describe, expect, it } from 'vitest';
import { deriveAiReadiness, type AiReadinessProviderInput } from './use-ai-readiness';

const provider = (over: Partial<AiReadinessProviderInput> = {}): AiReadinessProviderInput => ({
  provider: 'glm',
  enabled: true,
  hasApiKey: true,
  status: 'connected',
  ...over,
});

describe('deriveAiReadiness 四态边界（GAP-T-72）', () => {
  it('零厂家 / 全部无 Key / 全部禁用 → unavailable（内置 AI 完全不可用）', () => {
    expect(deriveAiReadiness([], { provider: 'glm', model: 'glm-4' })).toBe('unavailable');
    expect(
      deriveAiReadiness([provider({ hasApiKey: false })], null),
    ).toBe('unavailable');
    expect(
      deriveAiReadiness([provider({ enabled: false })], null),
    ).toBe('unavailable');
  });

  it('有可用厂家但未设内置模型 → unconfigured（静默回落，口径缺失）', () => {
    expect(deriveAiReadiness([provider()], null)).toBe('unconfigured');
    expect(deriveAiReadiness([provider()], {})).toBe('unconfigured');
    expect(deriveAiReadiness([provider()], { provider: 'glm', model: null })).toBe(
      'unconfigured',
    );
  });

  it('内置模型指向的厂家已禁用/清 Key → unconfigured（回落口径缺失）', () => {
    expect(
      deriveAiReadiness([provider({ provider: 'glm' }), provider({ provider: 'openai', enabled: false })], {
        provider: 'openai',
        model: 'gpt-4o',
      }),
    ).toBe('unconfigured');
    expect(
      deriveAiReadiness(
        [
          provider({ provider: 'glm' }),
          provider({ provider: 'openai', hasApiKey: false }),
        ],
        { provider: 'openai', model: 'gpt-4o' },
      ),
    ).toBe('unconfigured');
  });

  it('内置模型指向厂家 status=error（最近实测失败）→ unverified', () => {
    expect(
      deriveAiReadiness([provider({ status: 'error' })], {
        provider: 'glm',
        model: 'glm-4',
      }),
    ).toBe('unverified');
  });

  it('内置模型指向可用厂家 → ready', () => {
    expect(
      deriveAiReadiness([provider()], { provider: 'glm', model: 'glm-4' }),
    ).toBe('ready');
  });

  it('有 Key 但从未实测（disconnected）不算不可用——与后端适配器装载口径一致', () => {
    expect(
      deriveAiReadiness([provider({ status: 'disconnected' })], {
        provider: 'glm',
        model: 'glm-4',
      }),
    ).toBe('ready');
  });
});
