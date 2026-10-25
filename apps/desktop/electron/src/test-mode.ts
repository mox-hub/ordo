/**
 * 实机测试模式采集引擎（CAP-A-31 批 1）：webContents.debugger 抓包 + console 采集 +
 * 注入式操作录制，环形缓冲常录、「抓取」即固化快照。批 0 spike 已验证的编排红线：
 * attach 与事件监听必须先于导航就位，Network.enable 在导航后发（target 未导航前
 * sendCommand 的 promise 挂到导航才 resolve）；ErrorEvent.message 带 'Uncaught ' 前缀。
 * 采集默认全关，test_mode_start 才开（CAP-A-31 边界）。
 */
import { BrowserWindow, type Event, type WebContentsConsoleMessageEventParams } from 'electron';
import pkg from '../../package.json';
import { isDevMode } from './config';
import { logger } from './logger';
import { state } from './state';
import {
  buildEnvironmentText,
  buildStepsToReproduce,
  redactUrl,
  RingBuffer,
  type CapturedConsoleLine,
  type CapturedElementMeta,
  type CapturedNetworkEntry,
  type CapturedOperation,
  type TestModeEnvironmentInput,
} from './test-mode-core';

/** 缓冲条数上限：够覆盖一次实机验收会话，防内存无界 */
const NETWORK_LIMIT = 200;
const CONSOLE_LIMIT = 200;
const OPERATION_LIMIT = 300;
/** 操作轨迹轮询收割间隔（渲染端数组 → 主进程缓冲） */
const OP_POLL_INTERVAL_MS = 3_000;

/** capture 固化的现场快照（save 命令消费；capture 不清缓冲，支持连续抓取） */
export interface TestModeSnapshot {
  capturedAt: string;
  url: string;
  title: string;
  network: CapturedNetworkEntry[];
  consoleLines: CapturedConsoleLine[];
  operations: CapturedOperation[];
  environment: TestModeEnvironmentInput;
  /** 组件选择模式才有：被选中组件的选择器与 outerHTML */
  element?: CapturedElementMeta | null;
}

/** IPC 摘要（不含 headers——前端展示面只给脱敏后的 method/url/status） */
export interface TestModeSnapshotSummary {
  capturedAt: string;
  url: string;
  title: string;
  networkSummary: Array<{ method: string; url: string; status?: number }>;
  consoleLines: CapturedConsoleLine[];
  operations: CapturedOperation[];
  environmentText: string;
  stepsToReproduce: string;
  element?: CapturedElementMeta | null;
}

export interface TestModeStatusResult {
  active: boolean;
  startedAt: string | null;
  /** 操作轨迹录制门（用户确认「开始录制」后才记操作；网络/console 不受此门控） */
  recordingOps: boolean;
  networkCount: number;
  consoleCount: number;
  operationCount: number;
  url: string;
}

interface EngineState {
  active: boolean;
  recordingOps: boolean;
  win: BrowserWindow | null;
  startedAt: string | null;
  network: RingBuffer<CapturedNetworkEntry>;
  consoleLines: RingBuffer<CapturedConsoleLine>;
  operations: RingBuffer<CapturedOperation>;
  pollTimer: ReturnType<typeof setInterval> | null;
  requestStartedAt: Map<string, number>;
  lastSnapshot: TestModeSnapshot | null;
  /** start 期间注册的 webContents 事件解绑函数集合 */
  unbinders: Array<() => void>;
}

const engine: EngineState = {
  active: false,
  recordingOps: false,
  win: null,
  startedAt: null,
  network: new RingBuffer(NETWORK_LIMIT),
  consoleLines: new RingBuffer(CONSOLE_LIMIT),
  operations: new RingBuffer(OPERATION_LIMIT),
  pollTimer: null,
  requestStartedAt: new Map(),
  lastSnapshot: null,
  unbinders: [],
};

/**
 * 渲染端操作录制器（main world，spike 验证版扩展）：click/input 捕获阶段委托 +
 * SPA 路由钩子（pushState/replaceState/popstate），事件写 __ORDO_TEST_OPS__ 数组，
 * 主进程轮询 splice 收割。幂等标记防重复注入。
 * 操作录制受 __ORDO_TEST_RECORDING__ 门控（用户确认「开始录制」才记，避免把无关
 * 操作混进复现步骤）；同一输入框连续击键在注入端合并只留末值。
 */
const RECORDER_SCRIPT = `(function () {
  if (window.__ORDO_TEST_RECORDER__) { return; }
  window.__ORDO_TEST_RECORDER__ = true;
  window.__ORDO_TEST_OPS__ = window.__ORDO_TEST_OPS__ || [];
  window.__ORDO_TEST_RECORDING__ = window.__ORDO_TEST_RECORDING__ === true;
  function describe(el) {
    if (!el || !el.closest) { return null; }
    var entity = el.closest('[data-ai-entity]');
    return {
      tag: el.tagName ? el.tagName.toLowerCase() : null,
      id: el.id || null,
      text: (el.textContent || '').trim().slice(0, 60),
      entity: entity ? entity.getAttribute('data-ai-entity') : null
    };
  }
  function push(op) {
    if (window.__ORDO_TEST_RECORDING__ !== true) { return; }
    window.__ORDO_TEST_OPS__.push(op);
  }
  window.addEventListener('click', function (e) {
    push({ type: 'click', at: Date.now(), target: describe(e.target) });
  }, true);
  window.addEventListener('input', function (e) {
    var t = e.target;
    var d = describe(t);
    var value = String((t && t.value) || '').slice(0, 120);
    var ops = window.__ORDO_TEST_OPS__;
    var last = ops[ops.length - 1];
    if (window.__ORDO_TEST_RECORDING__ === true && last && last.type === 'input' && d && last.target &&
        last.target.tag === d.tag && last.target.id === d.id && last.target.entity === d.entity) {
      last.value = value;
      last.at = Date.now();
      return;
    }
    push({ type: 'input', at: Date.now(), target: d, value: value });
  }, true);
  function recordNav(url) {
    push({ type: 'navigate', at: Date.now(), url: String(url || '') });
  }
  var push = history.pushState && history.pushState.bind(history);
  if (push) {
    history.pushState = function (s, t, url) { recordNav(url || location.href); return push(s, t, url); };
  }
  var replace = history.replaceState && history.replaceState.bind(history);
  if (replace) {
    history.replaceState = function (s, t, url) { recordNav(url || location.href); return replace(s, t, url); };
  }
  window.addEventListener('popstate', function () { recordNav(location.href); });
  window.addEventListener('hashchange', function () { recordNav(location.href); });
})()`;

/** 收割渲染端增量操作（导航/页面关闭时 executeJavaScript 会失败，静默跳过） */
async function harvestOperations(): Promise<void> {
  const win = engine.win;
  if (!win || win.isDestroyed() || !engine.active) {
    return;
  }
  try {
    const raw = await win.webContents.executeJavaScript(
      `JSON.stringify(window.__ORDO_TEST_OPS__ ? window.__ORDO_TEST_OPS__.splice(0, window.__ORDO_TEST_OPS__.length) : [])`,
      true,
    );
    const ops = JSON.parse(raw) as CapturedOperation[];
    for (const op of ops) {
      engine.operations.push(op);
    }
  } catch {
    // 导航瞬间页面 world 重建属预期，下一轮收割继续
  }
}

function findTargetWindow(): BrowserWindow | null {
  // 单窗架构（全大窗恢复批）：认证面是主窗内路由且浮动球只挂登录后的 shell 布局，
  // 旧「认证窗存在即拒绝」守卫已无对应物；未登录时 startTestMode 走 !win 报错兜底
  return (
    BrowserWindow.getAllWindows().find(
      (w) => !w.isDestroyed() && w.webContents.getType() === 'window',
    ) ?? null
  );
}

function onCdpMessage(_event: unknown, method: string, params: unknown): void {
  const p = params as {
    requestId: string;
    timestamp?: number;
    request?: { method: string; url: string; headers: Record<string, unknown> };
    response?: { status: number; statusText: string; headers: Record<string, unknown>; mimeType: string };
    type?: string;
  };
  if (method === 'Network.requestWillBeSent' && p.request) {
    if (p.request.url.startsWith('data:')) {
      return;
    }
    engine.requestStartedAt.set(p.requestId, p.timestamp ?? 0);
    engine.network.push({
      id: p.requestId,
      startedAt: new Date().toISOString(),
      request: {
        method: p.request.method,
        url: p.request.url,
        headers: p.request.headers ?? {},
      },
      resourceType: p.type,
    });
    // requestWillBeSent 环形淘汰后，对应起始时间一并清理防 Map 无界
    if (engine.requestStartedAt.size > NETWORK_LIMIT * 2) {
      engine.requestStartedAt.clear();
    }
    return;
  }
  if (method === 'Network.responseReceived' && p.response) {
    const entry = findEntry(p.requestId);
    if (entry) {
      entry.response = {
        status: p.response.status,
        statusText: p.response.statusText,
        headers: p.response.headers ?? {},
        mimeType: p.response.mimeType ?? '',
      };
      const startedAt = engine.requestStartedAt.get(p.requestId) ?? 0;
      if (startedAt && p.timestamp) {
        entry.durationMs = Math.round((p.timestamp - startedAt) * 1000);
      }
    }
    return;
  }
  if (method === 'Network.loadingFailed') {
    const entry = findEntry(p.requestId);
    if (entry) {
      entry.response = { status: 0, statusText: 'failed', headers: {}, mimeType: '' };
    }
  }
}

/** 环形淘汰后 id 可能已不在缓冲，线性查找 200 条上限内开销可忽略 */
function findEntry(requestId: string): CapturedNetworkEntry | undefined {
  for (const entry of engine.network.snapshot()) {
    if (entry.id === requestId) {
      return entry;
    }
  }
  return undefined;
}

export async function startTestMode(): Promise<TestModeStatusResult> {
  if (engine.active) {
    return getTestModeStatus();
  }
  const win = findTargetWindow();
  if (!win) {
    throw new Error('未找到可用的主窗口（请登录进入主界面后再开启实机测试模式）');
  }
  const wc = win.webContents;
  try {
    wc.debugger.attach('1.3');
  } catch (err) {
    throw new Error(
      `调试器附加失败（若 DevTools 已打开请先关闭）: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  engine.active = true;
  engine.recordingOps = false;
  engine.win = win;
  engine.startedAt = new Date().toISOString();
  engine.network.clear();
  engine.consoleLines.clear();
  engine.operations.clear();
  engine.lastSnapshot = null;

  // 编排红线（spike 实证）：attach/监听先于一切导航语义就位；Network.enable 在
  // 当前已加载页面上发（主窗此时早已完成导航，promise 正常 resolve）
  wc.debugger.on('message', onCdpMessage);
  await wc.debugger.sendCommand('Network.enable');

  const unbindConsole = bindConsole(win);
  const unbindNav = bindNavigation(win);
  const unbindClosed = bindClosed(win);
  engine.unbinders = [unbindConsole, unbindNav, unbindClosed];

  // 主窗已加载页面：立即注入一次；后续每次 DOM ready 重注入（新 world 需重挂监听）
  await wc.executeJavaScript(RECORDER_SCRIPT, true).catch(() => undefined);
  engine.pollTimer = setInterval(() => void harvestOperations(), OP_POLL_INTERVAL_MS);
  logger.info(`实机测试模式已开启（url: ${wc.getURL()}）`);
  return getTestModeStatus();
}

function bindConsole(win: BrowserWindow): () => void {
  // Electron 44 新签名：单参数 Event<WebContentsConsoleMessageEventParams>（level 为字符串档位）
  const handler = (details: Event<WebContentsConsoleMessageEventParams>) => {
    engine.consoleLines.push({
      at: new Date().toISOString(),
      level: details.level,
      message: details.message,
      sourceId: details.sourceId,
      lineNumber: details.lineNumber,
    });
  };
  win.webContents.on('console-message', handler);
  return () => win.webContents.off('console-message', handler);
}

function bindNavigation(win: BrowserWindow): () => void {
  const wc = win.webContents;
  const onDomReady = () => {
    // 导航后新 world：重注入录制器；旧 world 的未收割操作随页面销毁（导航本身已记为操作）
    void wc.executeJavaScript(RECORDER_SCRIPT, true).catch(() => undefined);
    // 录制门跨导航保持：重注入默认 false，按引擎状态回写
    void wc
      .executeJavaScript(`window.__ORDO_TEST_RECORDING__ = ${engine.recordingOps}`, true)
      .catch(() => undefined);
  };
  const onNavigate = (_event: unknown, url: string) => {
    if (engine.recordingOps) {
      engine.operations.push({ type: 'navigate', at: Date.now(), url });
    }
  };
  wc.on('dom-ready', onDomReady);
  wc.on('did-navigate', onNavigate);
  return () => {
    wc.off('dom-ready', onDomReady);
    wc.off('did-navigate', onNavigate);
  };
}

function bindClosed(win: BrowserWindow): () => void {
  const onClose = () => {
    if (engine.active) {
      logger.info('主窗口关闭，实机测试模式自动停止');
      void stopTestMode();
    }
  };
  win.on('closed', onClose);
  return () => win.off('closed', onClose);
}

export async function stopTestMode(): Promise<TestModeStatusResult> {
  if (!engine.active) {
    return getTestModeStatus();
  }
  if (engine.pollTimer) {
    clearInterval(engine.pollTimer);
    engine.pollTimer = null;
  }
  for (const unbind of engine.unbinders) {
    unbind();
  }
  engine.unbinders = [];
  const win = engine.win;
  if (win && !win.isDestroyed()) {
    try {
      win.webContents.debugger.off('message', onCdpMessage);
      win.webContents.debugger.detach();
    } catch (err) {
      logger.warn(`调试器分离异常（忽略）: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  engine.active = false;
  engine.win = null;
  logger.info('实机测试模式已停止');
  return getTestModeStatus();
}

export function getTestModeStatus(): TestModeStatusResult {
  return {
    active: engine.active,
    startedAt: engine.startedAt,
    recordingOps: engine.recordingOps,
    networkCount: engine.network.size,
    consoleCount: engine.consoleLines.size,
    operationCount: engine.operations.size,
    url: engine.win && !engine.win.isDestroyed() ? engine.win.webContents.getURL() : '',
  };
}

/** 从头开始录制：清空已录操作 + 打开录制门（用户显式确认起点，无关操作不入轨迹） */
export async function startOpsRecording(): Promise<TestModeStatusResult> {
  engine.operations.clear();
  engine.recordingOps = true;
  const win = engine.win;
  if (win && !win.isDestroyed()) {
    await win.webContents
      .executeJavaScript('window.__ORDO_TEST_RECORDING__ = true', true)
      .catch(() => undefined);
  }
  logger.info('操作轨迹录制已从头开始');
  return getTestModeStatus();
}

/** 清除已录操作（不改动录制门状态，支持边录边清） */
export async function clearRecordedOps(): Promise<TestModeStatusResult> {
  engine.operations.clear();
  return getTestModeStatus();
}

/** capture：截图 + 三缓冲快照固化（不清缓冲，连续抓取可用；save 消费最近一次快照）。
 * element 为组件选择模式下渲染端选中的组件元数据（截图裁剪在渲染端 canvas 完成） */
export async function captureTestMode(
  element?: CapturedElementMeta | null,
): Promise<{
  screenshotDataUrl: string;
  summary: TestModeSnapshotSummary;
}> {
  if (!engine.active || !engine.win || engine.win.isDestroyed()) {
    throw new Error('实机测试模式未开启，无法抓取现场');
  }
  const wc = engine.win.webContents;
  const image = await wc.capturePage();
  const url = wc.getURL();
  const title = await wc.executeJavaScript(`document.title`, true).catch(() => '');
  const environment: TestModeEnvironmentInput = {
    appVersion: pkg.version,
    shell: `electron@${process.versions.electron}`,
    os: process.platform,
    mode: isDevMode() ? 'development' : 'production',
    url,
    apiBaseUrl: state.backend?.info.apiBaseUrl ?? '',
  };
  const snapshot: TestModeSnapshot = {
    capturedAt: new Date().toISOString(),
    url,
    title,
    network: engine.network.snapshot(),
    consoleLines: engine.consoleLines.snapshot(),
    operations: engine.operations.snapshot(),
    environment,
    element: element ?? null,
  };
  engine.lastSnapshot = snapshot;
  return {
    screenshotDataUrl: image.toDataURL(),
    summary: toSummary(snapshot),
  };
}

/** save：消费最近一次 capture 快照（由 bug-report.ts 落盘 bundle） */
export function consumeLastSnapshot(): TestModeSnapshot | null {
  const snapshot = engine.lastSnapshot;
  engine.lastSnapshot = null;
  return snapshot;
}

export function peekLastSnapshot(): TestModeSnapshot | null {
  return engine.lastSnapshot;
}

function toSummary(snapshot: TestModeSnapshot): TestModeSnapshotSummary {
  return {
    capturedAt: snapshot.capturedAt,
    url: snapshot.url,
    title: snapshot.title,
    networkSummary: snapshot.network.slice(-50).map((entry) => ({
      method: entry.request.method,
      url: redactUrl(entry.request.url),
      status: entry.response?.status,
    })),
    consoleLines: snapshot.consoleLines.slice(-50),
    operations: snapshot.operations,
    environmentText: buildEnvironmentText(snapshot.environment),
    stepsToReproduce: buildStepsToReproduce(snapshot.operations),
    element: snapshot.element,
  };
}
