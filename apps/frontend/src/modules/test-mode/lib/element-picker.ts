/**
 * 组件选择模式（CAP-A-31 批 1 追加）：页内元素拾取 + CSS 选择器生成 + 截图裁剪。
 * 前端与被测页面同处一个 webContents，直接用 DOM capture 阶段监听实现 DevTools 式
 * 拾取：mousemove 高亮、点击选中（阻断应用自身 handler）、Esc 取消。
 * 自有 UI 用 data-ordo-test-mode-ui 标记排除，避免选中报障组件本身。
 */

export interface PickedElement {
  selector: string;
  outerHTML: string;
  rect: { x: number; y: number; width: number; height: number };
}

const OUTER_HTML_LIMIT = 4000;
const SELECTOR_DEPTH_LIMIT = 6;

function isOwnUi(el: Element): boolean {
  return !!el.closest('[data-ordo-test-mode-ui]');
}

/** 自底向上生成 CSS 选择器路径（id 短路；类取前 2 个；nth-of-type 兜底） */
function buildSelector(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.documentElement && parts.length < SELECTOR_DEPTH_LIMIT) {
    const node: Element = cur;
    let part = node.tagName.toLowerCase();
    if (node.id) {
      parts.unshift(`${part}#${node.id}`);
      break;
    }
    const classes =
      typeof node.className === 'string'
        ? node.className
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
        : [];
    if (classes.length > 0) {
      part += `.${classes.join('.')}`;
    }
    const parent = node.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
    }
    parts.unshift(part);
    cur = parent;
  }
  return parts.join(' > ');
}

function clampRect(rect: DOMRect): PickedElement['rect'] {
  const x = Math.max(0, Math.round(rect.x));
  const y = Math.max(0, Math.round(rect.y));
  const width = Math.min(Math.round(rect.width), Math.round(window.innerWidth) - x);
  const height = Math.min(Math.round(rect.height), Math.round(window.innerHeight) - y);
  return { x, y, width: Math.max(0, width), height: Math.max(0, height) };
}

/**
 * 进入组件拾取态。resolve null = Esc 取消。
 * 选中后先 scrollIntoView 居中再取 rect（滚动后视口坐标才与截图对应）。
 */
export function pickElement(): Promise<PickedElement | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.setAttribute('data-ordo-test-mode-ui', '');
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483000',
      pointerEvents: 'none',
      background: 'hsl(var(--foreground) / 0.06)',
    } satisfies Partial<CSSStyleDeclaration>);
    const box = document.createElement('div');
    Object.assign(box.style, {
      position: 'fixed',
      display: 'none',
      border: '2px solid hsl(var(--accent-red))',
      background: 'hsl(var(--accent-red) / 0.08)',
      borderRadius: '2px',
      pointerEvents: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    overlay.appendChild(box);

    const tip = document.createElement('div');
    tip.setAttribute('data-ordo-test-mode-ui', '');
    tip.textContent = document.documentElement.lang === 'en' ? 'Click to pick an element · Esc to cancel' : '点击选中组件 · Esc 取消';
    Object.assign(tip.style, {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '2147483001',
      padding: '6px 14px',
      borderRadius: '9999px',
      background: 'hsl(var(--popover))',
      color: 'hsl(var(--popover-foreground))',
      border: '1px solid hsl(var(--border))',
      fontSize: '12px',
      boxShadow: '0 1px 2px hsl(var(--foreground) / 0.12)',
    } satisfies Partial<CSSStyleDeclaration>);

    let current: Element | null = null;
    let settled = false;

    function detach(): void {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKey, true);
      overlay.remove();
      tip.remove();
    }

    function finish(result: PickedElement | null): void {
      if (settled) {
        return;
      }
      settled = true;
      detach();
      resolve(result);
    }

    function onMove(e: MouseEvent): void {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || isOwnUi(el)) {
        box.style.display = 'none';
        current = null;
        return;
      }
      current = el;
      const r = el.getBoundingClientRect();
      Object.assign(box.style, {
        display: 'block',
        left: `${r.x}px`,
        top: `${r.y}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
    }

    async function onClick(e: MouseEvent): Promise<void> {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || isOwnUi(el) || settled) {
        return;
      }
      const picked = el;
      settled = true;
      // 先解绑监听并撤高亮，再滚动居中取最终视口坐标（滚动后坐标才与截图对应）
      detach();
      picked.scrollIntoView({ block: 'center', inline: 'center' });
      await new Promise((r) => setTimeout(r, 250));
      resolve({
        selector: buildSelector(picked),
        outerHTML: picked.outerHTML.slice(0, OUTER_HTML_LIMIT),
        rect: clampRect(picked.getBoundingClientRect()),
      });
    }

    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        finish(null);
      }
    }

    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKey, true);
    document.body.append(overlay, tip);
  });
}

/** 全页截图按元素视口矩形裁剪为组件图（capturePage 返回物理像素，scale 自适应探测） */
export async function cropImageToRect(
  dataUrl: string,
  rect: PickedElement['rect'],
): Promise<string> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('截图加载失败'));
    img.src = dataUrl;
  });
  // capturePage 输出尺寸可能与 CSS 视口差一个 DPR；按实际图宽反推缩放，避免钉死 devicePixelRatio
  const scale = img.naturalWidth / Math.max(1, window.innerWidth);
  const sx = Math.round(rect.x * scale);
  const sy = Math.round(rect.y * scale);
  const sw = Math.max(1, Math.round(rect.width * scale));
  const sh = Math.max(1, Math.round(rect.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建裁剪画布');
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL('image/png');
}
