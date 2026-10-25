/**
 * 实机测试问题单 bundle 落盘与补交队列（CAP-A-31 批 1）。
 * 本地优先架构：bundle 永远先落盘（~/.ordo/bug-reports/<id>.ordobug/ 目录，zip 化
 * 批 2），建工单只是「补交」动作——后端不可达时进队列（queue.json 跨重启持久化），
 * 报障通道可用性高于被测系统。rootDir 可注入供单测，默认壳数据目录。
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  buildManifest,
  buildMiniHar,
  generateReportId,
  type BugReportForm,
  type CapturedConsoleLine,
  type CapturedElementMeta,
  type CapturedNetworkEntry,
  type CapturedOperation,
  type PendingBugReportQueueItem,
  type TestModeEnvironmentInput,
} from './test-mode-core';

const QUEUE_FILE = 'queue.json';

export interface SaveBugReportInput {
  form: BugReportForm;
  /** 前端标注后的截图（image/png dataURL；组件选择模式为组件裁剪图） */
  screenshotDataUrl: string;
  snapshot: {
    capturedAt: string;
    url: string;
    title: string;
    network: CapturedNetworkEntry[];
    consoleLines: CapturedConsoleLine[];
    operations: CapturedOperation[];
    environment: TestModeEnvironmentInput;
    element?: CapturedElementMeta | null;
  };
}

export interface SavedBugReport {
  id: string;
  bundlePath: string;
  manifest: ReturnType<typeof buildManifest>;
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const marker = 'base64,';
  const index = dataUrl.indexOf(marker);
  if (!dataUrl.startsWith('data:image/png') || index === -1) {
    throw new Error('截图必须是 image/png dataURL');
  }
  return Buffer.from(dataUrl.slice(index + marker.length), 'base64');
}

function consoleToText(lines: CapturedConsoleLine[]): string {
  return lines
    .map((line) => `[${line.at}] [${line.level}] ${line.message}${line.sourceId ? ` (${line.sourceId}:${line.lineNumber ?? '?'})` : ''}`)
    .join('\n');
}

export function saveBugReport(
  input: SaveBugReportInput,
  rootDir?: string,
): SavedBugReport {
  if (!input.form.title.trim()) {
    throw new Error('问题标题不能为空');
  }
  const root = rootDir ?? path.join(process.env.ORDO_DATA_DIR ?? '', 'bug-reports');
  const id = generateReportId();
  const bundlePath = path.join(root, `${id}.ordobug`);
  fs.mkdirSync(bundlePath, { recursive: true });

  const manifest = buildManifest({
    id,
    createdAt: input.snapshot.capturedAt,
    form: input.form,
    // spread 转 Record：具名接口类型无 index signature，不能直接赋 Record<string, string>
    environment: { ...input.snapshot.environment },
    networkEntries: input.snapshot.network,
    consoleLines: input.snapshot.consoleLines,
    operations: input.snapshot.operations,
    element: input.snapshot.element,
  });

  fs.writeFileSync(path.join(bundlePath, 'screenshot.png'), dataUrlToBuffer(input.screenshotDataUrl));
  fs.writeFileSync(
    path.join(bundlePath, 'har.json'),
    JSON.stringify(
      buildMiniHar(input.snapshot.network, { name: 'ordo-desktop-test-mode', version: '1' }),
      null,
      2,
    ),
  );
  fs.writeFileSync(path.join(bundlePath, 'console.log'), consoleToText(input.snapshot.consoleLines));
  fs.writeFileSync(
    path.join(bundlePath, 'operations.json'),
    JSON.stringify(input.snapshot.operations, null, 2),
  );
  if (manifest.files.element && manifest.element) {
    fs.writeFileSync(
      path.join(bundlePath, manifest.files.element),
      JSON.stringify(manifest.element, null, 2),
    );
  }
  fs.writeFileSync(path.join(bundlePath, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { id, bundlePath, manifest };
}

// ---------- 截图分块上传（desktop:command IPC 面有 64KB 参数守卫，标注后截图
// dataURL 常达数 MB——先分块进主进程，save 只传 uploadId） ----------

interface ScreenshotUpload {
  chunks: string[];
  createdAt: number;
}

const SCREENSHOT_UPLOAD_TTL_MS = 600_000;
/** 单块上限（字符）：给 64KB 守卫留余量（args 包裹层 + JSON 转义膨胀） */
export const SCREENSHOT_CHUNK_LIMIT = 48_000;

const screenshotUploads = new Map<string, ScreenshotUpload>();

export function beginScreenshotUpload(): { uploadId: string } {
  const uploadId = `shot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  screenshotUploads.set(uploadId, { chunks: [], createdAt: Date.now() });
  // 顺手清残留：中断的上传会话 10 分钟后过期
  for (const [key, upload] of screenshotUploads) {
    if (Date.now() - upload.createdAt > SCREENSHOT_UPLOAD_TTL_MS) {
      screenshotUploads.delete(key);
    }
  }
  return { uploadId };
}

export function appendScreenshotChunk(uploadId: string, chunk: string): { received: number } {
  const upload = screenshotUploads.get(uploadId);
  if (!upload) {
    throw new Error('截图上传会话不存在或已过期');
  }
  if (chunk.length > SCREENSHOT_CHUNK_LIMIT) {
    throw new Error('截图分块过大');
  }
  upload.chunks.push(chunk);
  return { received: upload.chunks.length };
}

/** 组装并移除上传会话（save 消费；失败不再残留内存） */
export function takeScreenshotUpload(uploadId: string): string {
  const upload = screenshotUploads.get(uploadId);
  if (!upload) {
    throw new Error('截图上传会话不存在或已过期');
  }
  screenshotUploads.delete(uploadId);
  return upload.chunks.join('');
}

// ---------- 补交队列（queue.json；简单全量读写，条目量级为个位数） ----------

interface QueueFile {
  version: 1;
  items: PendingBugReportQueueItem[];
}

function queuePath(rootDir: string): string {
  return path.join(rootDir, 'bug-reports', QUEUE_FILE);
}

function readQueue(rootDir: string): QueueFile {
  try {
    const raw = fs.readFileSync(queuePath(rootDir), 'utf-8');
    const parsed = JSON.parse(raw) as QueueFile;
    if (parsed.version === 1 && Array.isArray(parsed.items)) {
      return parsed;
    }
  } catch {
    // 文件缺失/损坏按空队列兜底（本地缓存不设门禁）
  }
  return { version: 1, items: [] };
}

function writeQueue(rootDir: string, file: QueueFile): void {
  fs.mkdirSync(path.dirname(queuePath(rootDir)), { recursive: true });
  fs.writeFileSync(queuePath(rootDir), JSON.stringify(file, null, 2));
}

export function addQueueItem(
  item: Omit<PendingBugReportQueueItem, 'id' | 'createdAt'> & { id?: string },
  rootDir?: string,
): PendingBugReportQueueItem {
  const root = rootDir ?? path.join(process.env.ORDO_DATA_DIR ?? '', 'bug-reports');
  const full: PendingBugReportQueueItem = {
    ...item,
    id: item.id ?? generateReportId(),
    createdAt: new Date().toISOString(),
  };
  const file = readQueue(root);
  file.items.push(full);
  writeQueue(root, file);
  return full;
}

export function listQueueItems(rootDir?: string): PendingBugReportQueueItem[] {
  const root = rootDir ?? path.join(process.env.ORDO_DATA_DIR ?? '', 'bug-reports');
  return readQueue(root).items;
}

export function removeQueueItem(id: string, rootDir?: string): boolean {
  const root = rootDir ?? path.join(process.env.ORDO_DATA_DIR ?? '', 'bug-reports');
  const file = readQueue(root);
  const before = file.items.length;
  file.items = file.items.filter((item) => item.id !== id);
  if (file.items.length !== before) {
    writeQueue(root, file);
    return true;
  }
  return false;
}
