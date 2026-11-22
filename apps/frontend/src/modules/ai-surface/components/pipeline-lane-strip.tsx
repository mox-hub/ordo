/**
 * PipelineLaneStrip —— 主仓取数/router 适配层。
 *
 * 泳道渲染本体已迁至 @mox-hub/patterns（PipelineLaneStripView 直接 re-export）；
 * 本文件保留 usePipelineLanes 取数与 navigate 跳站。
 */
import { useNavigate } from 'react-router-dom';
import { PipelineLaneStripView } from '@mox-hub/patterns/components/pipeline-lane-strip';
import type { PipelineLane } from '@mox-hub/patterns/components/pipeline-lane-strip';
import { usePipelineLanes } from '../hooks/use-pipeline-lanes';

export { PipelineLaneStripView } from '@mox-hub/patterns/components/pipeline-lane-strip';
export type { PipelineLane, PipelineLaneStripViewProps } from '@mox-hub/patterns/components/pipeline-lane-strip';

export function PipelineLaneStrip() {
  const navigate = useNavigate();
  const { lanes, isPending, isError } = usePipelineLanes();

  const openStage = (lane: PipelineLane) => {
    navigate(lane.to);
  };

  return (
    <PipelineLaneStripView
      lanes={lanes}
      scopeNote="全部项目"
      // 拓扑/取数状态如实报：未就绪时破折号是"还没取到"，不是"没有"
      statusNote={
        isError ? '部分站取数失败（破折号=未取到）' : isPending ? '正在取数…' : '取自各站既有服务'
      }
      onOpenStage={openStage}
    />
  );
}
