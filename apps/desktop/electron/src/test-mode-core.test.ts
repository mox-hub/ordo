import { describe, expect, it } from 'vitest';
import {
  buildEnvironmentText,
  buildManifest,
  buildMiniHar,
  buildStepsToReproduce,
  generateReportId,
  redactHeaders,
  redactUrl,
  RingBuffer,
  type CapturedNetworkEntry,
  type CapturedOperation,
} from './test-mode-core';

describe('redactHeaders', () => {
  it('遮蔽凭证类头，普通头保留', () => {
    const out = redactHeaders({
      authorization: 'Bearer secret-token',
      cookie: 'sid=1',
      'content-type': 'application/json',
      'x-workspace-id': 'ws1',
    });
    expect(out.authorization).toBe('***redacted***');
    expect(out.cookie).toBe('***redacted***');
    expect(out['content-type']).toBe('application/json');
    expect(out['x-workspace-id']).toBe('ws1');
    expect(JSON.stringify(out)).not.toContain('secret-token');
  });

  it('键名大小写不敏感', () => {
    expect(redactHeaders({ Authorization: 'x' }).Authorization).toBe('***redacted***');
  });
});

describe('redactUrl', () => {
  it('凭证参数值替换，其余保留', () => {
    expect(redactUrl('https://a.b/c?token=abc&page=2')).toBe(
      'https://a.b/c?token=***redacted***&page=2',
    );
    expect(redactUrl('https://a.b/c')).toBe('https://a.b/c');
    expect(redactUrl('https://a.b/c?access_token=x&flag')).toBe(
      'https://a.b/c?access_token=***redacted***&flag',
    );
  });
});

describe('RingBuffer', () => {
  it('超限淘汰最旧，快照与内部隔离', () => {
    const buf = new RingBuffer<number>(3);
    for (const n of [1, 2, 3, 4, 5]) {
      buf.push(n);
    }
    expect(buf.snapshot()).toEqual([3, 4, 5]);
    expect(buf.size).toBe(3);
    const snap = buf.snapshot();
    snap.push(99);
    expect(buf.size).toBe(3);
  });

  it('clear 后为空；上限 <1 抛错', () => {
    const buf = new RingBuffer<string>(2);
    buf.push('a');
    buf.clear();
    expect(buf.size).toBe(0);
    expect(() => new RingBuffer(0)).toThrow();
  });
});

function entry(partial: Partial<CapturedNetworkEntry>): CapturedNetworkEntry {
  return {
    id: '1',
    startedAt: '2026-10-25T00:00:00.000Z',
    request: { method: 'GET', url: 'https://api.example.com/x?token=secret', headers: { authorization: 'Bearer t' } },
    ...partial,
  };
}

describe('buildMiniHar', () => {
  it('HAR 1.2 结构合规且 headers/url 已脱敏', () => {
    const har = buildMiniHar(
      [
        entry({
          response: { status: 200, statusText: 'OK', headers: { 'set-cookie': 'sid' }, mimeType: 'application/json' },
          durationMs: 42,
        }),
      ],
      { name: 'test', version: '1' },
    );
    expect(har.log.version).toBe('1.2');
    expect(har.log.creator).toEqual({ name: 'test', version: '1' });
    const harText = JSON.stringify(har);
    expect(harText).not.toContain('Bearer t');
    expect(harText).not.toContain('token=secret');
    expect(harText).toContain('token=***redacted***');
    const harEntry = har.log.entries[0] as { response: { status: number; content: { mimeType: string } }; time: number };
    expect(harEntry.response.status).toBe(200);
    expect(harEntry.response.content.mimeType).toBe('application/json');
    expect(harEntry.time).toBe(42);
  });

  it('无响应条目 response 为空对象', () => {
    const har = buildMiniHar([entry({})], { name: 't', version: '1' });
    expect((har.log.entries[0] as { response: unknown }).response).toEqual({});
  });
});

describe('buildStepsToReproduce', () => {
  it('三类操作规则拼接，点击带实体标注', () => {
    const ops: CapturedOperation[] = [
      { type: 'navigate', at: 1, url: 'http://x/issues' },
      { type: 'click', at: 2, target: { tag: 'button', id: 'b1', text: '提交', entity: 'issue:42' } },
      { type: 'input', at: 3, target: { tag: 'input', id: 'title', text: '', entity: null }, value: '标题' },
    ];
    expect(buildStepsToReproduce(ops)).toBe(
      [
        '1. [导航] http://x/issues',
        '2. [点击] 提交（关联实体 issue:42）',
        '3. [输入] title = "标题"',
      ].join('\n'),
    );
  });

  it('超 50 条截断并注明省略', () => {
    const ops: CapturedOperation[] = Array.from({ length: 60 }, (_, i) => ({
      type: 'click' as const,
      at: i,
      target: { tag: 'button', id: `b${i}`, text: String(i), entity: null },
    }));
    const text = buildStepsToReproduce(ops);
    expect(text).toContain('更早的 10 条操作已省略');
    expect(text).toContain('50. [点击] 59');
    expect(text).not.toContain('1. [点击] 0');
  });

  it('同一输入框连续击键合并只留末值，跨控件/导航不打断合并边界', () => {
    const input = (at: number, id: string, value: string): CapturedOperation => ({
      type: 'input',
      at,
      target: { tag: 'input', id, text: '', entity: null },
      value,
    });
    const ops: CapturedOperation[] = [
      input(1, 'title', '测'),
      input(2, 'title', '测试'),
      input(3, 'desc', 'a'),
      input(4, 'title', '测试文'),
      { type: 'click', at: 5, target: { tag: 'button', id: 'ok', text: '确定', entity: null } },
      input(6, 'title', '最终'),
      input(7, 'title', '最终值'),
    ];
    const text = buildStepsToReproduce(ops);
    expect(text).toContain('1. [输入] title = "测试"');
    expect(text).toContain('2. [输入] desc = "a"');
    expect(text).toContain('3. [输入] title = "测试文"');
    expect(text).toContain('5. [输入] title = "最终值"');
    expect(text).not.toContain('"测"');
    expect(text.split('\n').filter((line) => line.includes('[输入] title'))).toHaveLength(3);
  });
});

describe('buildEnvironmentText / buildManifest / generateReportId', () => {
  it('环境文本逐行组装', () => {
    const text = buildEnvironmentText({
      appVersion: '1.0.0',
      shell: 'electron@44',
      os: 'win32',
      mode: 'development',
      url: 'http://localhost:5173/app',
      apiBaseUrl: 'http://127.0.0.1:4300',
    });
    expect(text).toContain('应用版本: 1.0.0');
    expect(text).toContain('页面: http://localhost:5173/app');
  });

  it('manifest 汇总与文件清单固定', () => {
    const manifest = buildManifest({
      id: 'bug-1',
      createdAt: '2026-10-25T00:00:00.000Z',
      form: { title: 't', severity: 'high' },
      environment: { os: 'win32' },
      networkEntries: [entry({})],
      consoleLines: [{ at: '', level: 'error', message: 'boom' }],
      operations: [],
    });
    expect(manifest.formatVersion).toBe(1);
    expect(manifest.files).toEqual({
      screenshot: 'screenshot.png',
      har: 'har.json',
      console: 'console.log',
      operations: 'operations.json',
    });
    expect(manifest.networkSummary[0]).toEqual({
      method: 'GET',
      url: 'https://api.example.com/x?token=***redacted***',
      status: undefined,
    });
    expect(manifest.operationCount).toBe(0);
  });

  it('组件选择模式：manifest 带 element 元数据与 element.json 文件项', () => {
    const manifest = buildManifest({
      id: 'bug-2',
      createdAt: '2026-10-25T00:00:00.000Z',
      form: { title: 't', severity: 'high' },
      environment: { os: 'win32' },
      networkEntries: [],
      consoleLines: [],
      operations: [],
      element: { selector: 'div > button#submit', outerHTML: '<button id="submit">提交</button>' },
    });
    expect(manifest.files.element).toBe('element.json');
    expect(manifest.element?.selector).toBe('div > button#submit');
  });

  it('报告 id 形如 bug-<14位时间戳>-<6位随机>', () => {
    expect(generateReportId()).toMatch(/^bug-\d{14}-[a-z0-9]{6}$/);
  });
});
