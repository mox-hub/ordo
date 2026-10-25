/**
 * CAP-A-31 批 0 spike：实机测试模式五验证点（实验代码，验证后转正或删除）。
 *
 * ORDO_TEST_MODE_SPIKE=1 时由 main.ts 短路进入，替代常规启动：不拉后端/守护进程，
 * 自起本地 HTTP server 托管离线 spike 页，跑完五验证点后落盘证据并退出。
 * 验证点（对应能力清单 CAP-A-31 / GAP-T-71 的 spike 结论存档义务）：
 *  1. webContents.debugger attach + Network domain 抓包 → mini-HAR（含敏感头脱敏实证）
 *  2. executeJavaScript 注入操作录制（click/input）→ 轨迹 JSON
 *  3. webContents.capturePage 截图 → PNG
 *  4. data-ai-entity 沿祖先链 closest 提取
 *  5. 崩溃探测：渲染 uncaught error / unhandledrejection 捕获 + render-process-gone
 */
import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

/** 环境闸门：仅 ORDO_TEST_MODE_SPIKE=1 时生效，常规启动零影响 */
export function shouldRunTestModeSpike(): boolean {
  return process.env.ORDO_TEST_MODE_SPIKE === '1';
}

/** 敏感头脱敏（批 1 sanitize 红线的最小实证：HAR 落盘前凭证类头一律遮蔽） */
const SENSITIVE_HEADERS = new Set(['authorization', 'proxy-authorization', 'cookie', 'set-cookie']);

function redactHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? '***redacted***' : value;
  }
  return out;
}

/** 离线 spike 页：自托管于本地 HTTP server，三个按钮各承载一条验证链 */
const SPIKE_PAGE_HTML = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Ordo Test Mode Spike</title></head>
<body>
  <h1>Ordo 实机测试模式 spike</h1>
  <div id="entity-scope" data-ai-entity="project:spike-7">
    <button id="btn-fetch">发请求（带凭证头）</button>
    <button id="btn-entity">实体按钮（自身无标注）</button>
  </div>
  <input id="inp-note" placeholder="备注" />
  <button id="btn-throw">抛错</button>
  <script>
    document.getElementById('btn-fetch').addEventListener('click', function () {
      fetch('/echo?case=spike', { headers: { authorization: 'Bearer spike-secret-token' } })
        .then(function (r) { return r.json(); })
        .catch(function () {});
    });
    document.getElementById('btn-entity').addEventListener('click', function () {});
    document.getElementById('btn-throw').addEventListener('click', function () {
      setTimeout(function () { throw new Error('spike-uncaught'); }, 50);
      setTimeout(function () { Promise.reject(new Error('spike-rejection')); }, 80);
    });
  </script>
</body>
</html>`;

/** 渲染端操作录制 + 错误捕获（批 1 录制器的雏形：语义描述 + data-ai-entity 实体提取） */
const RECORDER_SCRIPT = `(function () {
  window.__ordoSpike = { ops: [], errors: [] };
  function describe(el) {
    if (!el || !el.closest) return null;
    var entity = el.closest('[data-ai-entity]');
    return {
      tag: el.tagName ? el.tagName.toLowerCase() : null,
      id: el.id || null,
      text: (el.textContent || '').trim().slice(0, 60),
      entity: entity ? entity.getAttribute('data-ai-entity') : null
    };
  }
  window.addEventListener('click', function (e) {
    window.__ordoSpike.ops.push({ type: 'click', at: Date.now(), target: describe(e.target) });
  }, true);
  window.addEventListener('input', function (e) {
    window.__ordoSpike.ops.push({ type: 'input', at: Date.now(), target: describe(e.target), value: String(e.target.value || '').slice(0, 60) });
  }, true);
  window.addEventListener('error', function (e) {
    window.__ordoSpike.errors.push({ kind: 'error', message: e.message });
  });
  window.addEventListener('unhandledrejection', function (e) {
    window.__ordoSpike.errors.push({ kind: 'unhandledrejection', message: String((e.reason && e.reason.message) || e.reason) });
  });
  return 'injected';
})()`;

interface SpikeResult {
  pass: boolean;
  detail: string;
}

interface CapturedOp {
  type: string;
  at: number;
  target: { tag: string | null; id: string | null; text: string; entity: string | null } | null;
  value?: string;
}

interface CapturedError {
  kind: string;
  message: string;
}

interface HarRequest {
  url: string;
  method: string;
  headers: Record<string, unknown>;
}

interface HarResponse {
  url: string;
  status: number;
  headers: Record<string, unknown>;
}

interface HarEntry {
  request?: HarRequest;
  response?: HarResponse;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 每步超时护栏：外部 await 挂死时抛出并标注阶段，保证 spike 必然出结果 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    sleep(ms).then(() => {
      throw new Error(`阶段超时(${ms}ms): ${label}`);
    }),
  ]);
}

export async function runTestModeSpike(): Promise<void> {
  const results: Record<string, SpikeResult> = {};
  const record = (name: string, pass: boolean, detail: string): void => {
    results[name] = { pass, detail };
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: ${detail}`);
  };
  const step = (message: string): void => {
    console.log(`[spike] ${new Date().toISOString()} ${message}`);
  };
  const outDir = path.join(os.tmpdir(), 'ordo-test-mode-spike');
  fs.mkdirSync(outDir, { recursive: true });
  step('spike 启动，等待 app ready');
  await app.whenReady();

  // 离线真实请求源：Network 抓包目标与 spike 页同源，零外网依赖
  const server = http.createServer((req, res) => {
    if (req.url?.startsWith('/echo')) {
      res.writeHead(200, { 'content-type': 'application/json', 'x-spike': '1' });
      res.end(JSON.stringify({ ok: true, echo: req.url }));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(SPIKE_PAGE_HTML);
  });
  const port = await new Promise<number>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve((server.address() as net.AddressInfo).port);
    });
  });
  step(`本地 HTTP server 已监听 127.0.0.1:${port}`);

  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    show: true,
    title: 'Ordo Test Mode Spike',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  const wc = win.webContents;
  const harEntries = new Map<string, HarEntry>();
  let renderGoneReason: string | null = null;
  wc.on('render-process-gone', (_event, details) => {
    renderGoneReason = details.reason;
  });

  try {
    // 验证点 1a：debugger attach + Network domain 抓包。
    // Electron 语义坑（spike 实证）：target 未导航前 sendCommand 的 promise 挂到导航
    // 发生才 resolve——attach 与事件监听必须在 loadURL 前就位，Network.enable 在导航后发
    step('debugger attach 中');
    wc.debugger.attach('1.3');
    step('debugger attach 完成，注册事件监听');
    wc.debugger.on('message', (_event, method, params) => {
      const p = params as { requestId: string; request?: HarRequest; response?: HarResponse };
      if (method === 'Network.requestWillBeSent' && p.request) {
        harEntries.set(p.requestId, { request: p.request });
      }
      if (method === 'Network.responseReceived' && p.response) {
        const entry = harEntries.get(p.requestId);
        if (entry) {
          entry.response = p.response;
        }
      }
    });

    step(`加载 spike 页 http://127.0.0.1:${port}/spike.html`);
    await withTimeout(win.loadURL(`http://127.0.0.1:${port}/spike.html`), 15_000, 'loadURL');
    await sleep(300);
    step('spike 页加载完成，Network.enable 中');
    await withTimeout(wc.debugger.sendCommand('Network.enable'), 10_000, 'Network.enable');
    step('Network.enable 完成，注入操作录制脚本');
    await withTimeout(wc.executeJavaScript(RECORDER_SCRIPT, true), 10_000, '注入录制脚本');
    step('录制脚本已注入，驱动交互');

    await withTimeout(
      wc.executeJavaScript(`document.getElementById('btn-fetch').click(); 'ok'`),
      10_000,
      '点击 btn-fetch',
    );
    await sleep(600);
    await withTimeout(
      wc.executeJavaScript(
        `var i = document.getElementById('inp-note'); i.value = 'spike 输入'; i.dispatchEvent(new Event('input', { bubbles: true })); 'ok'`,
      ),
      10_000,
      '输入 inp-note',
    );
    await withTimeout(
      wc.executeJavaScript(`document.getElementById('btn-entity').click(); 'ok'`),
      10_000,
      '点击 btn-entity',
    );
    await withTimeout(
      wc.executeJavaScript(`document.getElementById('btn-throw').click(); 'ok'`),
      10_000,
      '点击 btn-throw',
    );
    await sleep(1200);
    step('交互驱动完成，读回录制数据');
    const captured = JSON.parse(
      await withTimeout(
        wc.executeJavaScript(`JSON.stringify(window.__ordoSpike)`),
        10_000,
        '读回录制数据',
      ),
    ) as { ops: CapturedOp[]; errors: CapturedError[] };
    step(`读回 ${captured.ops.length} ops / ${captured.errors.length} errors，截图中`);

    // 验证点 3：截图捕获
    const image = await withTimeout(wc.capturePage(), 10_000, 'capturePage');
    const pngPath = path.join(outDir, 'spike-screenshot.png');
    fs.writeFileSync(pngPath, image.toPNG());
    const pngHeader = fs.readFileSync(pngPath).subarray(0, 4);
    step('截图完成，HAR 落盘中');

    // HAR 落盘（脱敏后）
    const miniHar = {
      log: {
        version: '1.2',
        creator: { name: 'ordo-test-mode-spike', version: '0.0.1' },
        entries: [...harEntries.values()].map((entry) => ({
          startedDateTime: new Date().toISOString(),
          time: 0,
          request: entry.request
            ? {
                method: entry.request.method,
                url: entry.request.url,
                headers: redactHeaders(entry.request.headers ?? {}),
                queryString: [],
                cookies: [],
                headersSize: -1,
                bodySize: -1,
              }
            : {},
          response: entry.response
            ? {
                status: entry.response.status,
                statusText: '',
                url: entry.response.url,
                headers: redactHeaders(entry.response.headers ?? {}),
                cookies: [],
                headersSize: -1,
                bodySize: -1,
              }
            : {},
          cache: {},
          timings: { send: 0, wait: 0, receive: 0 },
        })),
      },
    };
    const harPath = path.join(outDir, 'mini-har.json');
    const opsPath = path.join(outDir, 'captured-operations.json');
    const harText = JSON.stringify(miniHar, null, 2);
    fs.writeFileSync(harPath, harText);
    fs.writeFileSync(opsPath, JSON.stringify(captured, null, 2));

    // —— 判定 ——
    const echoEntry = [...harEntries.values()].find(
      (entry) => entry.request?.url.includes('/echo') && entry.response?.status === 200,
    );
    record(
      '1.network-capture',
      Boolean(echoEntry),
      `CDP Network 抓到 ${harEntries.size} 个请求，/echo 200 ${echoEntry ? '命中' : '未命中'}`,
    );
    const redacted = harText.includes('***redacted***') && !harText.includes('spike-secret-token');
    record('1b.sanitize', redacted, `HAR 凭证头脱敏${redacted ? '生效' : '未生效'}（har: ${harPath}）`);

    const fetchClick = captured.ops.find(
      (op) => op.type === 'click' && op.target?.id === 'btn-fetch',
    );
    const inputOp = captured.ops.find(
      (op) => op.type === 'input' && op.target?.id === 'inp-note',
    );
    record(
      '2.operation-recording',
      Boolean(fetchClick && inputOp),
      `录制 ${captured.ops.length} 条操作（click=${Boolean(fetchClick)} input=${Boolean(inputOp)}；ops: ${opsPath}）`,
    );
    record(
      '3.screenshot',
      pngHeader.toString('latin1') === '\x89PNG' && fs.statSync(pngPath).size > 1000,
      `capturePage → ${pngPath}（${fs.statSync(pngPath).size} 字节）`,
    );
    const entityOp = captured.ops.find(
      (op) => op.type === 'click' && op.target?.id === 'btn-entity',
    );
    record(
      '4.entity-extraction',
      entityOp?.target?.entity === 'project:spike-7',
      `祖先链 data-ai-entity 提取=${entityOp?.target?.entity ?? 'null'}（预期 project:spike-7）`,
    );
    // Chromium 的 ErrorEvent.message 对未捕获异常带 'Uncaught ' 前缀，用 includes 判定
    const uncaught = captured.errors.find((e) => e.kind === 'error' && e.message.includes('spike-uncaught'));
    const rejection = captured.errors.find(
      (e) => e.kind === 'unhandledrejection' && e.message === 'spike-rejection',
    );
    record(
      '5a.render-error-capture',
      Boolean(uncaught && rejection),
      `渲染错误捕获：uncaught=${Boolean(uncaught)} unhandledrejection=${Boolean(rejection)}`,
    );
  } catch (err) {
    record(
      'spike.flow',
      false,
      `流程异常中断: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // 验证点 5b：渲染进程崩溃探测（放最后，窗口崩后不回卷其余验证）
  step('渲染进程崩溃注入中');
  try {
    wc.debugger.detach();
    wc.forcefullyCrashRenderer();
    await sleep(2000);
    record(
      '5b.render-process-gone',
      renderGoneReason === 'crashed',
      `render-process-gone reason=${renderGoneReason ?? 'null'}（预期 crashed）`,
    );
  } catch (err) {
    record('5b.render-process-gone', false, `崩溃注入异常: ${err instanceof Error ? err.message : String(err)}`);
  }

  const reportPath = path.join(outDir, 'spike-report.json');
  const allPass = Object.values(results).length > 0 && Object.values(results).every((r) => r.pass);
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ timestamp: new Date().toISOString(), outDir, allPass, results }, null, 2),
  );
  console.log(`\nspike ${allPass ? '全部通过' : '存在失败项'}，证据目录: ${outDir}`);
  console.log(`报告: ${reportPath}`);

  server.close();
  await sleep(300);
  app.exit(allPass ? 0 : 1);
}
