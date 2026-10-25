/**
 * 单窗编排（2026-10-22 恢复全大窗裁决）：全应用恒用主窗（正常形态 + 系统标题栏），
 * 认证面（/login·/register·/welcome）以居中卡片呈现在同一大窗内。
 *
 * 历史：CAP-A-14 曾做「认证面紧凑小窗」双窗编排（认证窗 944×620 无边框 + WCO），
 * 实机连续暴露切窗类缺陷（登录后自动弹认证窗、窗口互踢、初始化重跑、大窗残留），
 * 于本日整体退役——切窗命令 set_compact_mode 保留为幂等 no-op（防旧前端调用报
 * 「未知命令」），前端钩子与消费方已同批移除。
 */
import { BrowserWindow, shell } from 'electron';
import net from 'node:net';
import { isDevMode } from './config';
import { logger } from './logger';
import { state } from './state';

export const FRONTEND_DEV_PORT = 5173;

export function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(200);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => resolve(false));
  });
}

/** 前端加载源：dev 优先 vite（HMR），否则 server 托管（同源免 CORS + SPA history fallback） */
export async function resolveFrontendTarget(): Promise<string> {
  if (isDevMode() && (await portInUse(FRONTEND_DEV_PORT))) {
    return `http://localhost:${FRONTEND_DEV_PORT}`;
  }
  if (state.backend) {
    return state.backend.info.apiBaseUrl;
  }
  throw new Error('无可用的前端加载源（server 未启动且开发服务器未运行）');
}

/**
 * webContents 安全基线与自愈：外链转系统浏览器、渲染进程崩溃重载（60s 内 ≥3 次
 * 熔断）、F12/Ctrl+Shift+I DevTools。
 */
export function hardenWebContents(
  win: BrowserWindow,
  onCrashReload: (win: BrowserWindow) => void,
): void {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    const backendBase = state.backend?.info.apiBaseUrl ?? '';
    const allowed = [backendBase, `http://localhost:${FRONTEND_DEV_PORT}`, 'about:blank'];
    if (allowed.some((base) => base && url.startsWith(base))) {
      return;
    }
    event.preventDefault();
    logger.warn(`拦截页内导航: ${url}（已转系统浏览器打开）`);
    void shell.openExternal(url);
  });
  let crashCount = 0;
  let crashWindowStart = 0;
  win.webContents.on('render-process-gone', (_event, details) => {
    const now = Date.now();
    if (now - crashWindowStart > 60_000) {
      crashCount = 0;
      crashWindowStart = now;
    }
    crashCount += 1;
    logger.error(`渲染进程崩溃（主窗）: ${details.reason}（窗口内第 ${crashCount} 次）`);
    if (crashCount <= 3 && !win.isDestroyed()) {
      onCrashReload(win);
    }
  });
  // F12 / Ctrl+Shift+I 随时开关 DevTools（打包版调试模式入口，命令面另有 toggle_devtools）
  win.webContents.on('before-input-event', (_event, input) => {
    const isF12 = input.type === 'keyDown' && input.key === 'F12';
    const isDevToolsChord =
      input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'i';
    if (isF12 || isDevToolsChord) {
      const wc = win.webContents;
      if (wc.isDevToolsOpened()) {
        wc.closeDevTools();
      } else {
        wc.openDevTools({ mode: 'detach' });
      }
    }
  });
}

/**
 * 认证面切窗命令的实现体（已退役）：单窗形态下认证面本就渲染在主窗内，
 * 这里保留幂等 no-op 仅作旧协议兼容。参数不消费。
 */
export async function switchAuthSurface(_enabled: boolean): Promise<void> {
  logger.info('set_compact_mode 已退役（单窗编排），调用被忽略');
}
