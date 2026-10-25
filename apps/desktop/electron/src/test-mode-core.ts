/**
 * 实机测试模式纯逻辑核（CAP-A-31 批 1）：脱敏、HAR 拼装、环形缓冲、复现步骤与
 * 环境文本组装、bundle manifest。零 electron 依赖，供 test-mode.ts 引擎消费并可单测。
 * 命名沿用 IPC 契约：对外字段 camelCase（见 state.ts 顶部说明）。
 */

/** 敏感头脱敏（spike 已实证的 sanitize 红线：凭证类头落盘前一律遮蔽） */
const SENSITIVE_HEADERS = new Set(['authorization', 'proxy-authorization', 'cookie', 'set-cookie']);

/** URL query 中常见凭证参数名（redactUrl 值替换用） */
const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'apikey',
  'secret',
  'signature',
  'password',
]);

const REDACTED = '***redacted***';

export function redactHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? REDACTED : value;
  }
  return out;
}

/** URL query 凭证参数值替换（路径与其余参数保留，保持可读性） */
export function redactUrl(url: string): string {
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) {
    return url;
  }
  const base = url.slice(0, queryIndex);
  const query = url.slice(queryIndex + 1);
  const redacted = query
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf('=');
      if (eq === -1) {
        return pair;
      }
      const key = pair.slice(0, eq);
      return SENSITIVE_QUERY_KEYS.has(key.toLowerCase()) ? `${key}=${REDACTED}` : pair;
    })
    .join('&');
  return `${base}?${redacted}`;
}

/** 环形缓冲：超限淘汰最旧（条数上限制，简单可测） */
export class RingBuffer<T> {
  private items: T[] = [];

  constructor(private readonly limit: number) {
    if (limit < 1) {
      throw new Error(`环形缓冲上限必须 ≥1，收到 ${limit}`);
    }
  }

  push(item: T): void {
    this.items.push(item);
    if (this.items.length > this.limit) {
      this.items.splice(0, this.items.length - this.limit);
    }
  }

  /** 快照（最旧→最新），与内部状态隔离 */
  snapshot(): T[] {
    return [...this.items];
  }

  get size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}

/** 抓包富条目（内存态，headers 原始保存；落盘经 buildMiniHar 脱敏） */
export interface CapturedNetworkEntry {
  id: string;
  startedAt: string;
  request: { method: string; url: string; headers: Record<string, unknown> };
  response?: { status: number; statusText: string; headers: Record<string, unknown>; mimeType: string };
  resourceType?: string;
  durationMs?: number;
}

export interface CapturedConsoleLine {
  at: string;
  level: string;
  message: string;
  sourceId?: string;
  lineNumber?: number;
}

/** 操作轨迹条目（渲染端注入脚本收割；entity=data-ai-entity 祖先链提取） */
export interface CapturedOperation {
  type: 'click' | 'input' | 'navigate';
  at: number;
  target?: {
    tag: string | null;
    id: string | null;
    text: string;
    entity: string | null;
  } | null;
  value?: string;
  url?: string;
}

/** 组件选择模式元数据（CSS 选择器 + 截断的 outerHTML，随 bundle 落 element.json） */
export interface CapturedElementMeta {
  selector: string;
  outerHTML?: string;
}

/** 同一输入框判定键：连续击键合并只留末值（tag/id/entity 相同即同一控件） */
function sameInputTarget(a: CapturedOperation, b: CapturedOperation): boolean {
  return (
    a.target?.tag === b.target?.tag &&
    a.target?.id === b.target?.id &&
    a.target?.entity === b.target?.entity
  );
}

/** HAR 1.2 最小合规拼装（headers 落盘前脱敏） */
export function buildMiniHar(
  entries: CapturedNetworkEntry[],
  creator: { name: string; version: string },
): { log: { version: string; creator: { name: string; version: string }; entries: unknown[] } } {
  return {
    log: {
      version: '1.2',
      creator,
      entries: entries.map((entry) => ({
        startedDateTime: entry.startedAt,
        time: entry.durationMs ?? 0,
        request: {
          method: entry.request.method,
          url: redactUrl(entry.request.url),
          headers: redactHeaders(entry.request.headers ?? {}),
          queryString: [],
          cookies: [],
          headersSize: -1,
          bodySize: -1,
        },
        response: entry.response
          ? {
              status: entry.response.status,
              statusText: entry.response.statusText,
              headers: redactHeaders(entry.response.headers ?? {}),
              content: { mimeType: entry.response.mimeType, size: -1 },
              cookies: [],
              headersSize: -1,
              bodySize: -1,
            }
          : {},
        cache: {},
        timings: { send: 0, wait: entry.durationMs ?? 0, receive: 0 },
      })),
    },
  };
}

/** 操作轨迹 → 复现步骤文本（规则拼接，批 2 由 AI 起草接手升级） */
export function buildStepsToReproduce(operations: CapturedOperation[]): string {
  // 同一输入框的连续击键合并为一条（只留末值）——注入端已合并，这里兜底跨收割边界的散键
  const merged: CapturedOperation[] = [];
  for (const op of operations) {
    const last = merged[merged.length - 1];
    if (op.type === 'input' && last?.type === 'input' && sameInputTarget(last, op)) {
      merged[merged.length - 1] = op;
      continue;
    }
    merged.push(op);
  }
  const steps = merged.slice(-50);
  const lines = steps.map((op, index) => {
    const n = index + 1;
    if (op.type === 'navigate') {
      return `${n}. [导航] ${op.url ?? '(未知地址)'}`;
    }
    if (op.type === 'input') {
      const label = op.target?.text || op.target?.id || op.target?.tag || '输入框';
      return `${n}. [输入] ${label} = "${op.value ?? ''}"`;
    }
    const label = op.target?.text || op.target?.id || op.target?.tag || '未知元素';
    const entity = op.target?.entity ? `（关联实体 ${op.target.entity}）` : '';
    return `${n}. [点击] ${label}${entity}`;
  });
  const omitted = operations.length - steps.length;
  const head = omitted > 0 ? `（更早的 ${omitted} 条操作已省略，完整轨迹见 bundle）\n` : '';
  return head + lines.join('\n');
}

export interface TestModeEnvironmentInput {
  appVersion: string;
  shell: string;
  os: string;
  mode: string;
  url: string;
  apiBaseUrl: string;
}

/** 环境快照 → bugEnvironment 文本（工单 bugEnvironment 字段与 manifest 共用） */
export function buildEnvironmentText(env: TestModeEnvironmentInput): string {
  return [
    `应用版本: ${env.appVersion}`,
    `壳: ${env.shell}`,
    `系统: ${env.os}`,
    `运行模式: ${env.mode}`,
    `页面: ${env.url}`,
    `后端: ${env.apiBaseUrl || '(未知)'}`,
  ].join('\n');
}

export interface BugReportForm {
  title: string;
  description?: string;
  severity: string;
  expectedResult?: string;
  actualResult?: string;
  stepsToReproduce?: string;
}

/** bundle manifest（格式 v1：目录形态 <id>.ordobug/，zip 化批 2） */
export interface BugReportManifest {
  formatVersion: 1;
  id: string;
  createdAt: string;
  form: BugReportForm;
  environment: Record<string, string>;
  files: {
    screenshot: string;
    har: string;
    console: string;
    operations: string;
    /** 组件选择模式才有：CSS 选择器 + outerHTML */
    element?: string;
  };
  element?: CapturedElementMeta;
  networkSummary: Array<{ method: string; url: string; status?: number }>;
  operationCount: number;
}

export function buildManifest(input: {
  id: string;
  createdAt: string;
  form: BugReportForm;
  environment: Record<string, string>;
  networkEntries: CapturedNetworkEntry[];
  consoleLines: CapturedConsoleLine[];
  operations: CapturedOperation[];
  element?: CapturedElementMeta | null;
}): BugReportManifest {
  return {
    formatVersion: 1,
    id: input.id,
    createdAt: input.createdAt,
    form: input.form,
    environment: input.environment,
    files: {
      screenshot: 'screenshot.png',
      har: 'har.json',
      console: 'console.log',
      operations: 'operations.json',
      ...(input.element ? { element: 'element.json' } : {}),
    },
    ...(input.element ? { element: input.element } : {}),
    networkSummary: input.networkEntries.map((entry) => ({
      method: entry.request.method,
      url: redactUrl(entry.request.url),
      status: entry.response?.status,
    })),
    operationCount: input.operations.length,
  };
}

/** 补交队列条目（建单失败落队列，恢复后重试；queue.json 持久化跨重启） */
export interface PendingBugReportQueueItem {
  id: string;
  bundlePath: string;
  /** POST /issues 请求体（原样重放） */
  payload: Record<string, unknown>;
  error?: string;
  createdAt: string;
}

export function generateReportId(now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `bug-${stamp}-${rand}`;
}
