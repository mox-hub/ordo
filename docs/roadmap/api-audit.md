---
title: "API 完成度与 e2e 覆盖审计"
description: "生成：2026-10-25T09:54:32.082Z | 事实来源：openapi.json + apps/server/test/*.e2e-spec.ts | 命令：`pnpm api:audit`"
category: roadmap
status: reference
version: 1.0.0
created: 2026-10-28
modified: 2026-10-28
---
# API 完成度与 e2e 覆盖审计

> 生成：2026-10-25T09:54:32.082Z　|　事实来源：openapi.json + apps/server/test/*.e2e-spec.ts　|　命令：`pnpm api:audit`

**Endpoint 总数 547，e2e 已覆盖 530（96.9%），未覆盖 17**

| 模块(tag) | 总数 | 已覆盖 | 覆盖率 |
|-----------|------|--------|--------|
| Projects | 30 | 30 | 100% |
| Acceptance | 29 | 29 | 100% |
| Git | 25 | 25 | 100% |
| AI Hub | 24 | 21 | 88% |
| Execution | 21 | 21 | 100% |
| Tasks | 19 | 19 | 100% |
| Teams | 18 | 18 | 100% |
| Runtime | 18 | 16 | 89% |
| Members | 15 | 15 | 100% |
| Releases | 14 | 14 | 100% |
| Auth | 13 | 13 | 100% |
| Document Task Links | 12 | 12 | 100% |
| Metadata | 11 | 11 | 100% |
| Plugins | 11 | 11 | 100% |
| Document Authors & Reviewers | 10 | 10 | 100% |
| Profile | 10 | 10 | 100% |
| workflows | 10 | 10 | 100% |
| Prompts | 10 | 0 | 0% |
| Task Assignees | 9 | 9 | 100% |
| Documents | 9 | 9 | 100% |
| Workspaces | 9 | 9 | 100% |
| AI Assistant | 8 | 8 | 100% |
| Document Sections | 8 | 8 | 100% |
| Memory | 8 | 8 | 100% |
| Integration | 8 | 8 | 100% |
| Integration / Linear | 8 | 8 | 100% |
| Decisions | 7 | 7 | 100% |
| CLI Dispatch | 7 | 6 | 86% |
| Document Versions | 7 | 7 | 100% |
| Document Storage | 7 | 7 | 100% |
| Document Tags | 7 | 7 | 100% |
| Collaboration | 7 | 7 | 100% |
| Admin | 7 | 7 | 100% |
| Integration / GitHub | 7 | 7 | 100% |
| Task Templates | 6 | 6 | 100% |
| Users | 6 | 6 | 100% |
| Document Folders | 6 | 6 | 100% |
| Document Approvals | 6 | 6 | 100% |
| MCP Servers | 6 | 6 | 100% |
| CLI Providers | 6 | 6 | 100% |
| Skills | 6 | 6 | 100% |
| Project Roles | 6 | 6 | 100% |
| Activities | 5 | 5 | 100% |
| Mentions | 5 | 5 | 100% |
| Document References (Source) | 5 | 5 | 100% |
| Notification | 5 | 5 | 100% |
| Playbook | 5 | 5 | 100% |
| OAuth2 | 4 | 4 | 100% |
| Project Modules | 4 | 4 | 100% |
| Contract | 4 | 4 | 100% |
| IssueType | 4 | 4 | 100% |
| Document References | 4 | 4 | 100% |
| Iterations | 3 | 3 | 100% |
| Documents MDX | 3 | 3 | 100% |
| Subscriptions | 3 | 3 | 100% |
| Config | 3 | 3 | 100% |
| MCP Server | 3 | 3 | 100% |
| Environment | 3 | 3 | 100% |
| Dashboard | 3 | 3 | 100% |
| Health | 2 | 2 | 100% |
| Invites | 2 | 2 | 100% |
| Document Sync | 2 | 2 | 100% |
| Mail | 2 | 2 | 100% |
| Search | 1 | 0 | 0% |
| Office | 1 | 1 | 100% |

## 未覆盖 endpoint（测试缺口清单）

- [ ] `GET /_api/ai/issues/:p/prompt-preview`（CLI Dispatch）
- [ ] `POST /_api/runtime/local-daemon/start`（Runtime）
- [ ] `POST /_api/runtime/local-daemon/stop`（Runtime）
- [ ] `GET /_api/ai/quick-judge/settings`（AI Hub）
- [ ] `PUT /_api/ai/quick-judge/settings`（AI Hub）
- [ ] `GET /_api/ai/quick-judge/logs`（AI Hub）
- [ ] `GET /_api/search`（Search）
- [ ] `GET /_api/prompts/system`（Prompts）
- [ ] `GET /_api/prompts/system/:p`（Prompts）
- [ ] `GET /_api/prompts/config`（Prompts）
- [ ] `PUT /_api/prompts/config`（Prompts）
- [ ] `GET /_api/prompts/usage-stats`（Prompts）
- [ ] `GET /_api/prompts/templates`（Prompts）
- [ ] `POST /_api/prompts/templates`（Prompts）
- [ ] `POST /_api/prompts/templates/preview`（Prompts）
- [ ] `PUT /_api/prompts/templates/:p`（Prompts）
- [ ] `DELETE /_api/prompts/templates/:p`（Prompts）
