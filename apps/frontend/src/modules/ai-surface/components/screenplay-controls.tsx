/**
 * ScreenplayControls —— 主仓站清单适配层。
 *
 * 回放控制条已迁至 @mox-hub/patterns；本文件把 PIPELINE_STAGES 映射成
 * patterns 需要的 stageNumber/to/labelFallback 三段投影。
 */
import type { ComponentProps } from 'react';
import { ScreenplayControls as PatternScreenplayControls } from '@mox-hub/patterns/components/screenplay-controls';
import type { ScreenplayStage } from '@mox-hub/patterns/components/screenplay-controls';
import { PIPELINE_STAGES } from '@/shared/layout/pipeline-stages';

export { formatReplayClock } from '@mox-hub/patterns/components/screenplay-controls';
export type {
  ScreenplayPlayerView,
  ScreenplayStage,
} from '@mox-hub/patterns/components/screenplay-controls';

const STAGES: ScreenplayStage[] = PIPELINE_STAGES.map((stage) => ({
  stageNumber: stage.stageNumber,
  to: stage.to,
  labelFallback: stage.labelFallback,
}));

export type ScreenplayControlsProps = Omit<
  ComponentProps<typeof PatternScreenplayControls>,
  'stages'
>;

export function ScreenplayControls(props: ScreenplayControlsProps) {
  return <PatternScreenplayControls {...props} stages={STAGES} />;
}
