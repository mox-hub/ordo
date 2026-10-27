/**
 * 实体适配器注册表——主壳唯一的实体分发口（替代原六处 switch-case 五路分发）。
 * 顺序即类型切换器顺序（Ctrl+1..5）。
 */
import type { EntityAdapter } from './types';
import { taskTemplate } from './task-template';
import { bugTemplate } from './bug-template';
import { docTemplate } from './doc-template';
import { projectTemplate } from './project-template';
import { milestoneTemplate } from './milestone-template';

export const ENTITY_ADAPTERS: EntityAdapter[] = [
  taskTemplate,
  bugTemplate,
  docTemplate,
  projectTemplate,
  milestoneTemplate,
];

export const ADAPTER_BY_TYPE: Record<string, EntityAdapter> = Object.fromEntries(
  ENTITY_ADAPTERS.map((a) => [a.type, a]),
);

export { taskTemplate, bugTemplate, docTemplate, projectTemplate, milestoneTemplate };
export type { EntityAdapter };
export * from './types';
