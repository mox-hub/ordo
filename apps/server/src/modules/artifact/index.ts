/**
 * artifact 模块公开入口。
 *
 * 跨模块（如 execution 自动登记执行产物）只允许从这里取服务——边界规则
 * `modules-deep-import-between-modules` 禁止深挖 `modules/<x>/` 内部文件，
 * 公开面约定为 `*.module.ts` 或本 `index.ts`。
 */
export { ArtifactRegistryService } from './artifact-registry.service';
