/**
 * AiExecutionBadge —— 主仓类型适配转发。
 *
 * 展示实现已迁至 @mox-hub/patterns；主仓保留完整 ActiveAiExecution /
 * IssueAiExecutionState 类型出口（patterns 只持有渲染所需的最小投影）。
 */
import type { ActiveAiExecution } from '@/modules/execution/hooks/use-active-executions-map';

export { AiExecutionBadge } from '@mox-hub/patterns/components/ai-execution-badge';
export type { AiExecutionBadgeProps } from '@mox-hub/patterns/components/ai-execution-badge';
export type { ActiveAiExecution };
export type IssueAiExecutionState = ActiveAiExecution;
