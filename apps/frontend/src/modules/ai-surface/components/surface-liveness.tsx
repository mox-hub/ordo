/**
 * SurfaceLiveness —— 主仓实时数据 hook 适配层。
 *
 * 展示实现已迁至 @mox-hub/patterns；本文件把 useSurfaceFreshness 的三事实
 * 投影成 props，保留既有断连/新鲜度语义。
 */
import { SurfaceLiveness as PatternSurfaceLiveness } from '@mox-hub/patterns/components/surface-liveness';
import { useSurfaceFreshness } from '../hooks/use-surface-feed';

export function SurfaceLiveness() {
  const { connected, lastEventAt, staleDropped } = useSurfaceFreshness();
  return (
    <PatternSurfaceLiveness
      connected={connected}
      lastEventAt={lastEventAt}
      staleDropped={staleDropped}
    />
  );
}
