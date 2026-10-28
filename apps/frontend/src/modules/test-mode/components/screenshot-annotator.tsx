/**
 * 截图标注器（CAP-A-31 批 1）：底图 + 标注双画布，矩形/画笔/撤销/清除。
 * 每次笔画完成导出合成 PNG dataURL 回调父级（onChange），提交时直接落盘；
 * 撤销栈存底图快照（限 10 步），canvas 内部坐标为原图像素、CSS 缩放显示。
 */
import { FlaskConical, RotateCcw, Square, Trash2, PenLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Tool = 'rect' | 'pen';
const STROKE_COLOR = 'hsl(var(--accent-red))';
const STROKE_WIDTH = 3;
const UNDO_LIMIT = 10;

/**
 * canvas 2d context 不解析 CSS 变量字面量（strokeStyle 会静默回落黑色）——
 * 用临时元素经 getComputedStyle 解析成实际色值后再交给画笔。
 */
function resolveStrokeColor(cssColor: string): string {
  const probe = document.createElement('span');
  probe.style.color = cssColor;
  document.documentElement.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

export function ScreenshotAnnotator({
  src,
  onChange,
}: {
  src: string;
  /** 每次笔画完成（含初始加载）回调当前合成图 PNG dataURL */
  onChange?: (dataUrl: string) => void;
}) {
  const { t } = useTranslation();
  const baseRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const undoStack = useRef<string[]>([]);
  const toolRef = useRef<Tool>('rect');
  const drawing = useRef(false);
  const origin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tool, setTool] = useState<Tool>('rect');
  const [annotated, setAnnotated] = useState(false);

  toolRef.current = tool;

  useEffect(() => {
    const canvas = baseRef.current;
    if (!canvas) {
      return;
    }
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      undoStack.current = [];
      setAnnotated(false);
      onChange?.(canvas.toDataURL('image/png'));
    };
    img.src = src;
    // onChange 由父级以 useCallback 稳定传入；src 驱动重载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  function toCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = baseRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    return {
      x: Math.round((e.clientX - rect.left) * scale),
      y: Math.round((e.clientY - rect.top) * scale),
    };
  }

  function pushUndo(): void {
    const canvas = baseRef.current;
    if (!canvas) {
      return;
    }
    undoStack.current.push(canvas.toDataURL('image/png'));
    if (undoStack.current.length > UNDO_LIMIT) {
      undoStack.current.shift();
    }
  }

  function redrawBase(dataUrl: string): void {
    const canvas = baseRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      onChange?.(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    pushUndo();
    drawing.current = true;
    origin.current = toCanvasPoint(e);
    const ctx = baseRef.current?.getContext('2d');
    if (toolRef.current === 'pen' && ctx) {
      ctx.strokeStyle = resolveStrokeColor(STROKE_COLOR);
      ctx.lineWidth = STROKE_WIDTH;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(origin.current.x, origin.current.y);
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>): void {
    if (!drawing.current) {
      return;
    }
    const point = toCanvasPoint(e);
    const ctx = baseRef.current?.getContext('2d');
    const live = liveRef.current;
    if (toolRef.current === 'pen' && ctx) {
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      setAnnotated(true);
      return;
    }
    if (live) {
      const lctx = live.getContext('2d');
      if (lctx) {
        lctx.clearRect(0, 0, live.width, live.height);
        lctx.strokeStyle = STROKE_COLOR;
        lctx.lineWidth = STROKE_WIDTH;
        lctx.strokeRect(
          Math.min(origin.current.x, point.x),
          Math.min(origin.current.y, point.y),
          Math.abs(point.x - origin.current.x),
          Math.abs(point.y - origin.current.y),
        );
      }
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>): void {
    if (!drawing.current) {
      return;
    }
    drawing.current = false;
    const point = toCanvasPoint(e);
    const ctx = baseRef.current?.getContext('2d');
    const live = liveRef.current;
    if (toolRef.current === 'rect' && ctx && live) {
      ctx.strokeStyle = resolveStrokeColor(STROKE_COLOR);
      ctx.lineWidth = STROKE_WIDTH;
      ctx.strokeRect(
        Math.min(origin.current.x, point.x),
        Math.min(origin.current.y, point.y),
        Math.abs(point.x - origin.current.x),
        Math.abs(point.y - origin.current.y),
      );
      const lctx = live.getContext('2d');
      lctx?.clearRect(0, 0, live.width, live.height);
    }
    setAnnotated(true);
    const canvas = baseRef.current;
    onChange?.(canvas ? canvas.toDataURL('image/png') : src);
  }

  function handleUndo(): void {
    const last = undoStack.current.pop();
    if (last) {
      redrawBase(last);
    }
  }

  function handleClear(): void {
    const canvas = baseRef.current;
    if (!canvas) {
      return;
    }
    pushUndo();
    redrawBase(src);
    setAnnotated(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant={tool === 'rect' ? 'default' : 'ghost'}
          size="icon-xs"
          onClick={() => setTool('rect')}
          title={t('testMode.annotator.rect')}
        >
          <Square className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant={tool === 'pen' ? 'default' : 'ghost'}
          size="icon-xs"
          onClick={() => setTool('pen')}
          title={t('testMode.annotator.pen')}
        >
          <PenLine className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={handleUndo}
          title={t('testMode.annotator.undo')}
        >
          <RotateCcw className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={handleClear}
          title={t('testMode.annotator.clear')}
        >
          <Trash2 className="size-3.5" />
        </Button>
        {annotated && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <FlaskConical className="size-3" />
            {t('testMode.annotator.annotated')}
          </span>
        )}
      </div>
      <div className={cn('relative overflow-hidden rounded-md border border-border bg-muted/50')}>
        <canvas
          ref={baseRef}
          className="block w-full touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
        <canvas ref={liveRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>
    </div>
  );
}
