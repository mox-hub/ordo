import { describe, expect, it } from 'vitest';
import {
  DIMENSIONS,
  DEFAULT_REQUIRED_DIMENSIONS,
  criterionCoversDimension,
  evaluateDimensionCoverage,
  resolveRequiredDimensions,
} from './acceptance-dimensions';
import type { DimensionKey } from './acceptance-dimensions';

describe('resolveRequiredDimensions 必备维度解析', () => {
  it('无 selector → 默认四维全必备（保守）', () => {
    const r = resolveRequiredDimensions();
    expect(r.source).toBeNull();
    expect(r.dimensions).toEqual(DEFAULT_REQUIRED_DIMENSIONS);
    expect(r.dimensions).toHaveLength(4);
  });

  it('不认识的项目类型 → 仍走默认四维（不放行）', () => {
    const r = resolveRequiredDimensions({
      projectType: 'quantum-mesh',
      techStack: 'unknown',
    });
    expect(r.source).toBeNull();
    expect(r.dimensions).toEqual(DEFAULT_REQUIRED_DIMENSIONS);
  });

  it('techStack 覆盖优先于 projectType', () => {
    const overrides: Record<string, DimensionKey[]> = {
      react: ['logging'],
      frontend: ['logging', 'rollback'],
    };
    const r = resolveRequiredDimensions(
      { projectType: 'frontend', techStack: 'react' },
      overrides,
    );
    expect(r.source).toBe('react');
    expect(r.dimensions).toEqual(['logging']);
  });

  it('projectType 覆盖生效', () => {
    const overrides: Record<string, DimensionKey[]> = {
      library: ['logging', 'dependency', 'rollback'],
    };
    const r = resolveRequiredDimensions({ projectType: 'library' }, overrides);
    expect(r.source).toBe('library');
    expect(r.dimensions).toEqual(['logging', 'dependency', 'rollback']);
  });
});

describe('criterionCoversDimension 覆盖判定', () => {
  it('category 命中别名（含“可观测性”覆盖日志）', () => {
    expect(
      criterionCoversDimension(
        { content: '随便', category: '日志' },
        DIMENSIONS.logging,
      ),
    ).toBe(true);
    expect(
      criterionCoversDimension(
        { content: '随便', category: '可观测性' },
        DIMENSIONS.logging,
      ),
    ).toBe(true);
  });

  it('关键词兜底（大小写不敏感）', () => {
    expect(
      criterionCoversDimension(
        { content: '关键路径输出 Structured LOG' },
        DIMENSIONS.logging,
      ),
    ).toBe(true);
    expect(
      criterionCoversDimension(
        { content: '配置 Prometheus 指标与告警' },
        DIMENSIONS.monitoring,
      ),
    ).toBe(true);
  });

  it('不相关标准不误判', () => {
    expect(
      criterionCoversDimension(
        { content: '页面能正常加载', category: '功能' },
        DIMENSIONS.rollback,
      ),
    ).toBe(false);
  });
});

describe('evaluateDimensionCoverage 结构化判定', () => {
  it('零标准 → 四维全缺，全部 high 强阻断，且可解释', () => {
    const r = evaluateDimensionCoverage([], DEFAULT_REQUIRED_DIMENSIONS);
    expect(r.missing).toEqual(DEFAULT_REQUIRED_DIMENSIONS);
    expect(r.covered).toHaveLength(0);
    expect(r.findings).toHaveLength(4);
    for (const f of r.findings) {
      expect(f.type).toBe('dimension');
      expect(f.severity).toBe('high');
      expect(f.suggestion.length).toBeGreaterThan(0);
      expect(f.howToPass.length).toBeGreaterThan(0);
    }
  });

  it('四维都被覆盖 → 无 finding', () => {
    const criteria = [
      { content: '关键路径输出结构化日志', category: '日志' },
      { content: '配置指标监控与阈值告警', category: '监控' },
      { content: '外部依赖降级与超时已验证', category: '依赖' },
      { content: '上线失败可一键回滚', category: '回滚' },
    ];
    const r = evaluateDimensionCoverage(criteria, DEFAULT_REQUIRED_DIMENSIONS);
    expect(r.missing).toHaveLength(0);
    expect(r.findings).toHaveLength(0);
  });

  it('只覆盖日志 → 缺监控/依赖/回滚三项', () => {
    const r = evaluateDimensionCoverage(
      [{ content: '打日志', category: '日志' }],
      DEFAULT_REQUIRED_DIMENSIONS,
    );
    expect(r.covered).toEqual(['logging']);
    expect(r.missing).toEqual(['monitoring', 'dependency', 'rollback']);
    expect(r.findings.map((f) => f.dimension)).toEqual([
      'monitoring',
      'dependency',
      'rollback',
    ]);
  });

  it('可观测性 category 同时覆盖日志与监控', () => {
    const r = evaluateDimensionCoverage(
      [{ content: '接入可观测性平台', category: '可观测性' }],
      ['logging', 'monitoring'],
    );
    expect(r.missing).toHaveLength(0);
  });

  it('尊重自定义必备维度集合（覆盖机制可用）', () => {
    const r = evaluateDimensionCoverage(
      [{ content: '打日志', category: '日志' }],
      ['logging', 'rollback'],
    );
    expect(r.missing).toEqual(['rollback']);
  });
});
