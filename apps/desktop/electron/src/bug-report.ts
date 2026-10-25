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
  type CapturedNetworkEntry,
  type CapturedOperation,
  type PendingBugReportQueueItem,
  type TestModeEnvironmentInput,
} from './test-mode-core';

const QUEUE_FILE = 'queue.json';

export interface SaveBugReportInput {
  form: BugReportForm;
  /** 前端标注后的截图（image/png dataURL） */
  screenshotDataUrl: string;
  snapshot: {
    capturedAt: string;
    url: string;
    title: string;
    network: CapturedNetworkEntry[];
    consoleLines: CapturedConsoleLine[];
    operations: CapturedOperation[];
    environment: TestModeEnvironmentInput;
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
  fs.writeFileSync(path.join(bundlePath, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { id, bundlePath, manifest };
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
