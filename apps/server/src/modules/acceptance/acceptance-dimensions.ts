/**
 * P0-3a 验收门禁判定内核：必备维度（日志 / 监控 / 依赖 / 回滚）的结构化覆盖判定。
 *
 * 背景与问题（只读调研结论）：
 * - 现有 `CompletenessAuditService.checkEngineeringCompleteness` 依赖「按技术栈命中的 checklist」，
 *   **拿不到 checklist 时直接跳过**，导致日志/监控/回滚等维度完全不被检查。
 * - 覆盖判定是纯子串双向 `includes`，脆弱、易漏判/误判。
 *
 * 本模块提供纯函数：
 *   1) `resolveRequiredDimensions`：解析某项目/技术栈的必备维度。**默认四维全必备（保守）**；
 *      可按 projectType / techStack 覆盖（`REQUIRED_DIMENSIONS_BY_PROJECT_TYPE`），不写死。
 *   2) `evaluateDimensionCoverage`：结构化判定现有验收标准是否覆盖各必备维度（category 优先 +
 *      关键词兜底），对缺失维度产出**可解释**的 finding（缺哪维、为什么、补什么、怎样算过）。
 *
 * 判定内核不读写数据库、不含业务副作用，供审计服务/接收门禁调用。
 */

export type DimensionKey = 'logging' | 'monitoring' | 'dependency' | 'rollback';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface DimensionSpec {
  key: DimensionKey;
  /** 展示名 */
  label: string;
  /** 覆盖该维度的验收标准 category 别名（归一化后 ``includes`` 匹配） */
  categoryAliases: string[];
  /** 关键词兜底（标准正文小写后 ``includes`` 匹配） */
  keywords: string[];
  /** 缺失时的严重级：四维默认 high，缺失即强阻断 */
  severity: Severity;
  /** 缺失时的补全建议 */
  suggestion: string;
  /** “怎样算通过”的可解释说明 */
  howToPass: string;
}

export const DIMENSIONS: Record<DimensionKey, DimensionSpec> = {
  logging: {
    key: 'logging',
    label: '日志',
    categoryAliases: ['日志', 'logging', 'log', '可观测性', 'observability'],
    keywords: [
      '日志',
      '结构化日志',
      'log',
      'logger',
      'logback',
      'pino',
      'winston',
    ],
    severity: 'high',
    suggestion:
      '补一条验收标准：关键路径有结构化日志、含级别与关键字段，可在故障时定位。',
    howToPass:
      '存在 category=日志（或可观测性）的标准，或正文含“日志/log/logger”等关键词。',
  },
  monitoring: {
    key: 'monitoring',
    label: '监控/告警',
    categoryAliases: [
      '监控',
      '告警',
      '可观测性',
      'monitoring',
      'alert',
      'observability',
    ],
    keywords: [
      '监控',
      '告警',
      '指标',
      'metric',
      'prometheus',
      'grafana',
      'alert',
      'sentry',
      '探针',
    ],
    severity: 'high',
    suggestion:
      '补一条验收标准：关键指标有监控与阈值告警（成功率/延迟/错误率等）。',
    howToPass:
      '存在 category=监控/告警（或可观测性）的标准，或正文含“监控/告警/指标/metric/alert”等关键词。',
  },
  dependency: {
    key: 'dependency',
    label: '依赖',
    categoryAliases: ['依赖', 'dependency', 'dependencies'],
    keywords: [
      '依赖',
      'dependency',
      'dependencies',
      '降级',
      '超时',
      '熔断',
      'circuit',
    ],
    severity: 'high',
    suggestion: '补一条验收标准：外部依赖的可用性/降级/超时/熔断有明确验证。',
    howToPass:
      '存在 category=依赖 的标准，或正文含“依赖/降级/超时/熔断/dependency”等关键词。',
  },
  rollback: {
    key: 'rollback',
    label: '回滚',
    categoryAliases: ['回滚', '发布', '部署', 'rollback', 'release', 'deploy'],
    keywords: [
      '回滚',
      'rollback',
      '回退',
      '灰度',
      '回滚方案',
      '回滚策略',
      'rollback plan',
    ],
    severity: 'high',
    suggestion:
      '补一条验收标准：上线失败可回滚（回滚步骤/触发条件/数据兼容性已验证）。',
    howToPass:
      '存在 category=回滚/发布 的标准，或正文含“回滚/回退/灰度/rollback”等关键词。',
  },
};

/** 默认必备维度：**保守口径，四维全部必备**（不认识的项目类型也不放行）。 */
export const DEFAULT_REQUIRED_DIMENSIONS: DimensionKey[] = [
  'logging',
  'monitoring',
  'dependency',
  'rollback',
];

/**
 * 按 projectType / techStack 覆盖必备维度（可选）。未列出的键一律走 `DEFAULT_REQUIRED_DIMENSIONS`。
 * 例：某些纯前端库可放宽 monitoring —— 在此登记，避免写死到逻辑里。
 * 键可以是 projectType（backend/frontend/library/...）或 techStack（ts-node/java-spring/react/...）。
 */
export const REQUIRED_DIMENSIONS_BY_PROJECT_TYPE: Record<
  string,
  DimensionKey[]
> = {
  // 例（按需启用，默认留空以保持“四维全必备”的保守口径）：
  // library: ['logging', 'dependency', 'rollback'],
};

export interface DimensionSelector {
  projectType?: string | null;
  techStack?: string | null;
}

export interface DimensionResolution {
  dimensions: DimensionKey[];
  /** 命中的覆盖键；null = 走默认（保守四维） */
  source: string | null;
}

/** 解析必备维度。techStack 优先级高于 projectType，再回落默认四维。 */
export function resolveRequiredDimensions(
  selector?: DimensionSelector,
  overrides: Record<
    string,
    DimensionKey[]
  > = REQUIRED_DIMENSIONS_BY_PROJECT_TYPE,
): DimensionResolution {
  const keys = [selector?.techStack, selector?.projectType].filter(
    (k): k is string => typeof k === 'string' && k.length > 0,
  );
  for (const key of keys) {
    const hit = overrides[key];
    if (hit && hit.length > 0) {
      return { dimensions: [...hit], source: key };
    }
  }
  return { dimensions: [...DEFAULT_REQUIRED_DIMENSIONS], source: null };
}

export interface CriterionLike {
  content: string;
  category?: string | null;
  severity?: string | null;
}

export interface DimensionFinding {
  type: 'dimension';
  /** 稳定 id（dimension-<key>），便于去重与前端引用 */
  id: string;
  /** 缺失维度 */
  dimension: DimensionKey;
  /** 展示名（如“日志”） */
  category: string;
  /** 可解释说明：缺什么、为什么拦 */
  content: string;
  severity: Severity;
  source: string;
  suggestion: string;
  /** 怎样算通过 */
  howToPass: string;
  autoFixable: false;
}

function normalize(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase();
}

/** 单条验收标准是否覆盖某维度（category 别名优先，关键词兜底）。 */
export function criterionCoversDimension(
  criterion: CriterionLike,
  spec: DimensionSpec,
): boolean {
  const category = normalize(criterion.category);
  if (category) {
    for (const alias of spec.categoryAliases) {
      if (category.includes(normalize(alias))) return true;
    }
  }
  const content = normalize(criterion.content);
  for (const kw of spec.keywords) {
    if (content.includes(normalize(kw))) return true;
  }
  return false;
}

export interface DimensionCoverage {
  covered: DimensionKey[];
  missing: DimensionKey[];
  findings: DimensionFinding[];
}

/**
 * 结构化判定必备维度覆盖：对每个缺失维度产出可解释 finding（severity=该维度默认级）。
 * 不修改入参、不落库。
 */
export function evaluateDimensionCoverage(
  criteria: CriterionLike[],
  required: DimensionKey[] = DEFAULT_REQUIRED_DIMENSIONS,
): DimensionCoverage {
  const covered: DimensionKey[] = [];
  const missing: DimensionKey[] = [];
  const findings: DimensionFinding[] = [];
  const uniqueRequired = Array.from(new Set(required));

  for (const key of uniqueRequired) {
    const spec = DIMENSIONS[key];
    if (!spec) continue;
    const has = (criteria ?? []).some((c) => criterionCoversDimension(c, spec));
    if (has) {
      covered.push(key);
      continue;
    }
    missing.push(key);
    findings.push({
      type: 'dimension',
      id: `dimension-${key}`,
      dimension: key,
      category: spec.label,
      content: `验收标准缺少「${spec.label}」维度的覆盖：${spec.suggestion}`,
      severity: spec.severity,
      source: 'Required Dimension Gate',
      suggestion: spec.suggestion,
      howToPass: spec.howToPass,
      autoFixable: false,
    });
  }
  return { covered, missing, findings };
}
