import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  addQueueItem,
  appendScreenshotChunk,
  beginScreenshotUpload,
  listQueueItems,
  removeQueueItem,
  saveBugReport,
  SCREENSHOT_CHUNK_LIMIT,
  takeScreenshotUpload,
} from './bug-report';

const SNAP_BASE = {
  capturedAt: '2026-10-25T00:00:00.000Z',
  url: 'http://localhost:5173/app/issues',
  title: '工单列表',
  network: [
    {
      id: '1',
      startedAt: '2026-10-25T00:00:00.000Z',
      request: { method: 'GET', url: 'https://api/x?token=t', headers: { authorization: 'Bearer t' } },
      response: { status: 500, statusText: '', headers: {}, mimeType: 'application/json' },
    },
  ],
  consoleLines: [{ at: '2026-10-25T00:00:01Z', level: 'error', message: 'boom' }],
  operations: [{ type: 'click' as const, at: 1, target: { tag: 'button', id: 'b', text: '提交', entity: null } }],
  environment: {
    appVersion: '1.0.0',
    shell: 'electron@44',
    os: 'win32',
    mode: 'development',
    url: 'http://localhost:5173/app/issues',
    apiBaseUrl: 'http://127.0.0.1:4300',
  },
};

const FORM = {
  title: '列表页 500',
  severity: 'high',
  expectedResult: '正常加载',
  actualResult: '500 错误',
};

describe('saveBugReport', () => {
  const dirs: string[] = [];
  function tempRoot(): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'ordo-bug-report-'));
    dirs.push(dir);
    return dir;
  }
  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('bundle 五件齐且 manifest/截图内容正确', () => {
    const root = tempRoot();
    const saved = saveBugReport(
      { form: FORM, screenshotDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==', snapshot: SNAP_BASE },
      root,
    );
    expect(saved.id).toMatch(/^bug-\d{14}-[a-z0-9]{6}$/);
    expect(existsSync(saved.bundlePath)).toBe(true);
    const manifest = JSON.parse(readFileSync(path.join(saved.bundlePath, 'manifest.json'), 'utf-8'));
    expect(manifest.formatVersion).toBe(1);
    expect(manifest.form.title).toBe('列表页 500');
    expect(manifest.networkSummary[0].status).toBe(500);
    // 截图二进制落盘
    const png = readFileSync(path.join(saved.bundlePath, 'screenshot.png'));
    expect(png.subarray(0, 4).toString('latin1')).toBe('\x89PNG');
    // HAR 脱敏
    const har = readFileSync(path.join(saved.bundlePath, 'har.json'), 'utf-8');
    expect(har).not.toContain('Bearer t');
    expect(har).toContain('***redacted***');
    expect(readFileSync(path.join(saved.bundlePath, 'console.log'), 'utf-8')).toContain('[error] boom');
    expect(JSON.parse(readFileSync(path.join(saved.bundlePath, 'operations.json'), 'utf-8'))).toHaveLength(1);
  });

  it('空标题拒绝落盘', () => {
    const root = tempRoot();
    expect(() =>
      saveBugReport(
        { form: { ...FORM, title: '  ' }, screenshotDataUrl: 'data:image/png;base64,x', snapshot: SNAP_BASE },
        root,
      ),
    ).toThrow('问题标题不能为空');
  });

  it('非 PNG dataURL 拒绝', () => {
    const root = tempRoot();
    expect(() =>
      saveBugReport({ form: FORM, screenshotDataUrl: 'data:image/jpeg;base64,x', snapshot: SNAP_BASE }, root),
    ).toThrow('image/png');
  });
});

describe('截图分块上传（绕开 desktop:command 64KB 参数守卫）', () => {
  it('begin → 分块 append → take 组装原样还原', () => {
    const { uploadId } = beginScreenshotUpload();
    // 每块带上块序号，验证顺序还原
    const payload = Array.from({ length: 5 }, (_, i) => `chunk-${i}-`).join('');
    for (let i = 0; i < payload.length; i += SCREENSHOT_CHUNK_LIMIT - 10) {
      appendScreenshotChunk(uploadId, payload.slice(i, i + SCREENSHOT_CHUNK_LIMIT - 10));
    }
    expect(takeScreenshotUpload(uploadId)).toBe(payload);
    // take 后会话即焚：重复消费报错
    expect(() => takeScreenshotUpload(uploadId)).toThrow('不存在或已过期');
  });

  it('未知会话 / 超限分块拒绝', () => {
    expect(() => appendScreenshotChunk('nope', 'x')).toThrow('不存在或已过期');
    const { uploadId } = beginScreenshotUpload();
    expect(() => appendScreenshotChunk(uploadId, 'x'.repeat(SCREENSHOT_CHUNK_LIMIT + 1))).toThrow('分块过大');
  });
});

describe('补交队列', () => {
  const dirs: string[] = [];
  function tempRoot(): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'ordo-bug-queue-'));
    dirs.push(dir);
    return dir;
  }
  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('add → list → remove 全链，持久化跨调用', () => {
    const root = tempRoot();
    const item = addQueueItem({ bundlePath: '/x/1.ordobug', payload: { title: 't' }, error: 'ECONNREFUSED' }, root);
    expect(item.id).toBeTruthy();
    expect(listQueueItems(root)).toHaveLength(1);
    // 再次调用走独立 IO，验证持久化
    expect(listQueueItems(root)[0].bundlePath).toBe('/x/1.ordobug');
    expect(listQueueItems(root)[0].error).toBe('ECONNREFUSED');

    expect(removeQueueItem(item.id, root)).toBe(true);
    expect(listQueueItems(root)).toHaveLength(0);
    expect(removeQueueItem('not-exist', root)).toBe(false);
  });

  it('队列文件缺失按空队列兜底', () => {
    const root = tempRoot();
    expect(listQueueItems(root)).toEqual([]);
  });
});
