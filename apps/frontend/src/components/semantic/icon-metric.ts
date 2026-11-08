// ordo-ui 迁移转发层（M4，2026-11-08）：组件源码唯一真相在 @mox-hub/ui（mox-hub/ordo-ui 私有仓，
// GitHub Packages 分发）。本文件为兼容 per-file 引用的纯 re-export shim——禁在此实现任何逻辑；
// 新增/修改 UI 组件一律进 @mox-hub/ui（registry + 护栏），防漂移门禁：
// apps/frontend/scripts/check-ui-forwarding.mjs。
export * from '@mox-hub/ui/components/icon-metric'
