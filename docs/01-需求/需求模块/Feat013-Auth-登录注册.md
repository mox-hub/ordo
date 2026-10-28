---
title: "Auth 模块需求说明"
description: 定义 Auth 模块在 v2 平台化路线下作为用户身份、会话、API Token 与权限控制基础安全层的职责，含人类认证与外部 Agent 凭证
category: requirement
status:
  - active
tags:
  - Auth
  - Feature
  - requirements
  - security
version: 2.1.0
created: 2026-05-29 05:54:09
modified: 2026-07-16 04:20:53
projects: "[[APM-项目中心]]"
---

# Auth 模块需求说明

> 本文档从 v1「功能技术说明书」升级为 v2 统一规范需求文档。
> v2 关键变化：补充 API Token 机制（支撑 Phase 1 CLI Agent 接入主线）、对齐角色-等级权限模型、明确 Phase 1 认证方式收敛。

## 1. 模块定位

Auth 模块是所有功能模块的安全基础。

Auth 模块的核心定位是：

> 平台中负责用户身份认证、会话管理、API Token 签发与权限控制的基础安全层，同时为外部 Agent 接入提供凭证机制。

Auth 模块为 Project、Task、Team、Runtime、Plugin、Integration 等所有模块提供：

- 统一的身份与主体信息
- 认证与凭证机制（人类 + 外部 Agent）
- 会话与权限控制基础

### 1.1 模块功能约束范围

1. 用户管理（账号、个人信息、偏好）
2. 人类认证（本地密码 + 会话）
3. API Token 管理（服务外部 Agent / CLI 接入）
4. 会话管理（JWT / Session）
5. 权限控制基础（RBAC + 与角色-等级模型衔接）
6. 安全治理（限流、失败锁定、审计）

### 1.2 与其他模块的边界

- Auth 模块**承载**身份认证与凭证签发，是所有模块的安全入口。
- Auth 模块**不承载**项目内角色与权限矩阵的具体定义（由 Project 权限模型承载），只提供 RBAC 基础与 `hasPermission` 能力。
- Auth 模块**不承载**外部 Agent 的角色映射决策（由 AI Hub + 外部 AI 协议承载），只签发凭证并验证身份。
- Auth 模块是**基础安全层**：被所有业务模块依赖，自身不依赖业务模块。

## 2. 模块目标

### 2.1 第一目标

提供统一的认证与授权机制，支撑人类用户与外部 Agent 两类主体。

### 2.2 第二目标

以 RBAC 为基础，为各模块提供细粒度权限控制能力（`hasPermission`）。

### 2.3 第三目标

为 Phase 1 CLI Agent 接入主线提供 API Token 凭证机制，使外部 Agent 可凭 Token 可信接入。

## 3. Phase 1 范围

Phase 1 中，Auth 模块必须先服务：

- 本地账号注册与密码登录（人类用户）
- API Token 签发与管理（外部 Agent / CLI 接入）
- JWT 会话管理
- RBAC 基础权限检查
- 基础安全治理（限流、失败锁定、审计）

Phase 1 认证方式收敛：

- ✅ 本地账号密码（人类）
- ✅ API Token（Agent / CLI / 程序化接入）
- ❌ SSO / OAuth2（Phase 2，企业场景）
- ❌ MFA / OTP（Phase 2）

## 4. 模块依赖

### 4.1 依赖模块

- [Feat001-Core-核心](Feat001-Core-核心.md)

### 4.2 被依赖模块

Auth 是基础安全层，被几乎所有模块依赖：

- [Feat002-Project-项目管理](Feat002-Project-项目管理.md)
- [Feat003-Task-任务](Feat003-Task-任务.md)
- [Feat004-Team-团队](Feat004-Team-团队.md)
- [Feat014-Runtime-本地运行时](Feat014-Runtime-本地运行时.md)
- [Feat010-AIHub-人工智能](Feat010-AIHub-人工智能.md)
- [Feat008-Plugin-插件](Feat008-Plugin-插件.md)
- [Feat009-Integration-外部链接](Feat009-Integration-外部链接.md)

## 5. 核心职责

### 5.1 用户与身份管理

Auth 模块负责维护用户身份信息：

- 用户注册（本地账号）
- 用户信息管理（显示名、头像、时区、偏好）
- 用户启停（启用 / 禁用账号）
- 用户主体类型标识（为三类主体模型预留）

### 5.2 人类认证

Auth 模块负责人类用户的认证：

- 本地账号密码登录
- 密码安全存储（加盐哈希，不明文）
- 会话建立（JWT / Session）
- 登出与会话过期

### 5.3 API Token 管理

Auth 模块负责 API Token 的全生命周期管理（Phase 1 核心，见 [第 7 章](#7-api-token-管理)）：

- Token 签发（PM 为外部 Agent / CLI 接入签发）
- Token 作用域（项目级范围限制）
- Token 撤销与轮换
- Token 验证

### 5.4 会话管理

Auth 模块负责会话生命周期：

- 会话创建（登录 / Token 验证后）
- 会话维持（JWT 过期与刷新）
- 强制注销
- 会话审计（IP、UserAgent、最后活跃时间）

### 5.5 权限控制基础

Auth 模块提供 RBAC 基础能力：

- 角色分配（`RoleAssignment`，全局 / 项目级）
- `hasPermission(user, resource, action)` 统一权限检查入口
- 与角色-等级权限模型衔接（角色定义职责，等级定义放权程度）

### 5.6 安全治理

Auth 模块负责基础安全防护：

- 登录失败限流（防暴力破解）
- 失败锁定
- 敏感操作审计
- 凭证安全存储

## 6. 用户与身份模型

### 6.1 用户主体

Auth 管理的用户主体（与平台三类主体模型对齐）：

| 主体类型 | Auth 职责 | Phase 1 |
|---------|----------|---------|
| `human` | 本地账号注册、密码认证、会话管理 | ✅ |
| `external_agent` | API Token 签发、身份验证（不建账号）| ✅ |
| `platform_ai_member` | 预留字段，生命周期 Phase 2/3 | 预留 |

说明：外部 Agent 不创建人类账号，通过 API Token 接入，其身份映射由 AI Hub 承载（见 AI Hub 第 8 章）。

### 6.2 用户注册

- 本地注册：用户名 + 密码 + 可选邮箱
- Phase 1 不支持从企业目录导入（SSO Phase 2）

### 6.3 用户信息字段

- `username`（唯一）
- `displayName`
- `email`（可选）
- `avatarUrl`
- `timezone`
- `isActive`

## 7. API Token 管理

> Phase 1 核心能力。CLI Agent 接入主线（codex / claude-code）的认证基础。

### 7.1 Token 用途

API Token 用于：

- 外部 Agent（CLI Provider）接入平台
- Runtime 注册认证
- 程序化 API 调用（未来 Integration / Plugin）

### 7.2 Token 签发

- PM 或有权限者为外部 Agent 签发 Token
- Token 绑定项目级作用域（`projectScope`）
- Token 关联主体身份（`subjectType = external_agent`）
- Token 记录来源（`identitySource = cli / api / mcp / plugin`）

### 7.3 Token 作用域

- Token 必须绑定项目范围，禁止跨项目使用
- Token 可配置允许的权限范围（`permissionProfile`）
- Token 验证时校验作用域与项目边界

### 7.4 Token 撤销与轮换

- 支持撤销 Token（立即失效）
- 支持轮换 Token（签发新 Token，旧 Token 宽限期后失效）
- 撤销与轮换进入审计

### 7.5 Token 安全

- Token 加密存储（哈希，不明文存原值）
- 签发时仅展示一次完整 Token
- Token 使用记录审计（哪些执行用了哪个 Token）

## 8. 认证机制

### 8.1 本地密码认证（Phase 1）

- 用户名 + 密码登录
- 密码加盐哈希存储（bcrypt / argon2）
- 登录成功签发 JWT
- 支持「记住我」调整会话时长

### 8.2 API Token 认证（Phase 1）

- 外部 Agent / Runtime 凭 API Token 接入
- Token 通过请求头（`Authorization: Bearer <token>`）传递
- Token 验证后建立 Agent 会话（不建立人类会话）

### 8.3 会话管理

- 人类会话：JWT（含过期时间、刷新机制）
- Agent 会话：Token 验证后建立，无人类 Session 记录
- 支持强制注销（人类会话）
- 会话审计（IP、UserAgent、最后活跃）

### 8.4 非目标（认证）

- SSO / OAuth2（Phase 2，企业 IdP 集成）
- MFA / OTP（Phase 2）
- 生物认证（不在路线图）

## 9. 权限控制基础

> 与 [[角色级权限模型-v1|角色-等级-权限模型]] 对齐。Auth 提供 RBAC 基础，具体权限矩阵由 Project 承载。

### 9.1 RBAC 基础

Auth 维护 `RoleAssignment`（角色分配）：

| scope | 说明 | 示例 |
|-------|------|------|
| `global` | 全局角色 | 平台管理员 |
| `project` | 项目级角色 | 项目 Owner / Maintainer / Contributor / Viewer |

### 9.2 预置角色（全局）

- `admin`：平台管理员
- `user`：普通用户

项目级角色（Owner / Maintainer / Contributor / Viewer）由 Project 模块定义和管理（见 Project 第 8 章）。

### 9.3 权限检查入口

Auth 提供统一权限检查能力：

```
hasPermission(user, resource, action) → boolean
```

- 被所有业务模块调用
- 结合 `RoleAssignment` 与资源所属项目判断
- 权限矩阵的具体规则由 Project / Task / Git / Runtime 等模块定义

### 9.4 与角色-等级权限模型的关系

- **角色**（role）：定义职责，由 Project 级角色承载
- **等级**（level）：定义放权程度，由 AI Hub 在 Agent 映射时确定
- Auth 只提供 RBAC 基础（角色分配 + 权限检查），不定义角色与等级的具体语义

## 10. 安全治理

### 10.1 登录安全

- 登录失败限流（如单 IP / 单账号短时间多次失败后锁定）
- 失败锁定（账号临时锁定，需等待或重置）
- 登录失败告警（异常登录尝试）

### 10.2 凭证安全

- 密码加盐哈希存储，不明文
- API Token 哈希存储，签发时仅展示一次
- 敏感凭证不落明文日志（对齐 Core 第 4.3 日志脱敏）

### 10.3 审计

- 登录 / 登出 / 失败登录记录审计
- Token 签发 / 撤销 / 轮换记录审计
- 权限变更记录审计
- 敏感操作（项目删除、权限修改、插件管理）强制审计

### 10.4 会话安全

- JWT 过期与刷新机制
- 支持强制注销（踢出可疑会话）
- 会话 IP / UserAgent 异常检测（Phase 2 增强）

## 11. AI 协作能力

> Auth 为外部 Agent 接入提供凭证基础，是 Agent Surface 的安全入口。

### 11.1 Auth 对 Agent 接入的支撑

- 签发 API Token 供 CLI Agent（codex / claude-code）接入
- Token 验证后，Agent 身份交由 AI Hub 映射（subjectType / mappedRole / mappedLevel）
- Token 作用域约束 Agent 的项目边界

### 11.2 Auth 不承载的 Agent 能力

- 不做 Agent 角色映射决策（由 AI Hub 承载）
- 不做 Agent 权限审批（由 Project 权限模型 + 审批门承载）
- 不管理 Agent 执行（由 AI Hub + Runtime 承载）

### 11.3 Agent 凭证与人类凭证的隔离

- Agent 使用 API Token，不使用人类账号
- Agent Token 验证后建立 Agent 会话，与人类 Session 分离
- Agent 的所有操作通过 Token 可追溯到签发者（PM）

### 11.4 平台内 AI 成员的边界

- Phase 1：仅预留 `platform_ai_member` 主体类型字段
- Phase 2/3：演进到正式 AI 成员时，扩展 Auth 支撑其身份与凭证

## 12. 事件与通知

> 与 [[Feat001-Core-核心|Core 事件总线]] 和 [[Feat006-Notification-消息中心|Notification 模块]] 对齐。

### 12.1 Auth 级领域事件

Auth 模块必须发布以下领域事件：

| 事件 | 触发时机 | 典型订阅方 |
|------|---------|-----------|
| `user.registered` | 用户注册 | Notification |
| `user.login` | 登录成功 | 审计 |
| `user.login_failed` | 登录失败 | 审计、安全告警 |
| `user.logout` | 登出 | 审计 |
| `user.updated` | 用户信息变更 | Notification |
| `user.disabled` | 账号禁用 | Notification、审计 |
| `token.issued` | API Token 签发 | 审计 |
| `token.revoked` | API Token 撤销 | 审计、Notification（签发者）|
| `role.assignment_changed` | 角色分配变更 | Notification、审计 |

### 12.2 安全告警

- 异常登录尝试（多次失败、异地登录）触发安全告警
- Token 异常使用（作用域越权尝试）触发告警
- 安全告警通知相关用户与 admin

## 13. 核心功能需求

### FR-AUTH-01 用户注册与导入

Auth 模块必须支持：

- 本地用户注册（用户名 + 密码 + 可选邮箱）
- 用户信息管理（显示名、头像、时区、偏好）
- 用户启停（启用 / 禁用账号）

Phase 1 不支持从企业目录导入（SSO Phase 2）。

### FR-AUTH-02 本地认证

Auth 模块必须支持：

- 用户名 + 密码登录
- 密码加盐哈希存储
- 登录成功签发 JWT
- 登出与会话过期

### FR-AUTH-03 API Token 管理

Auth 模块必须支持（Phase 1 核心）：

- 为外部 Agent 签发 API Token
- Token 绑定项目级作用域
- Token 撤销与轮换
- Token 验证（Agent / Runtime 接入认证）
- Token 安全存储（哈希，不明文）

### FR-AUTH-04 会话管理

Auth 模块必须支持：

- JWT 会话管理（人类用户）
- Agent 会话（Token 验证后建立，与人类 Session 分离）
- 强制注销
- 会话审计（IP、UserAgent、最后活跃）

### FR-AUTH-05 RBAC 权限基础

Auth 模块必须支持：

- 角色分配（`RoleAssignment`，全局 / 项目级）
- `hasPermission(user, resource, action)` 统一权限检查
- 与角色-等级权限模型衔接

### FR-AUTH-06 资源权限检查

Auth 模块必须支持：

- 在访问项目、任务、配置、插件管理等接口时统一权限验证
- 为插件调用添加权限过滤（插件 + 用户双重校验）
- 跨项目访问隔离

### FR-AUTH-07 安全治理

Auth 模块必须支持：

- 登录失败限流（防暴力破解）
- 失败锁定
- 敏感操作审计
- 凭证安全存储

### FR-AUTH-08 Auth 级事件与通知

Auth 模块必须：

- 发布 Auth 级领域事件（见 [第 12 章](#12-事件与通知)）
- 接入 Notification 模块
- 安全告警正确分发

## 14. 接口设计

### 14.1 认证接口

- `POST /api/auth/register`：本地用户注册
- `POST /api/auth/login`：本地账号登录（返回 JWT）
- `POST /api/auth/logout`：注销当前会话
- `GET /api/auth/me`：获取当前登录用户信息与角色

### 14.2 用户接口

- `GET /api/users/:id`：获取指定用户信息（需权限）
- `PATCH /api/users/me`：更新当前用户信息

### 14.3 Token 接口

- `POST /api/tokens`：签发 API Token（需权限）
- `GET /api/tokens`：查询 Token 列表（不返回完整 Token）
- `DELETE /api/tokens/:id`：撤销 Token
- `POST /api/tokens/:id/rotate`：轮换 Token

### 14.4 权限接口

- `GET /api/auth/permissions`：查询当前用户权限（供前端 / Agent 判断）

## 15. 数据模型要求

> 与 [[数据模型-User-Auth|User/Auth 模型]] 对齐。

### 15.1 核心对象

| 实体 | 用途 |
|------|------|
| `User` | 系统用户 |
| `Session` | 登录会话（人类）|
| `RoleAssignment` | 角色分配（全局 / 项目级）|
| `ApiToken` | API Token（Agent / CLI 凭证）|
| `OAuth2Provider` | OAuth2 Provider 配置（Phase 2）|
| `OAuth2Account` | 外部 IdP 账号绑定（Phase 2）|

### 15.2 User 建议字段

- `id`
- `username`（唯一）
- `displayName`
- `email`（可选，唯一）
- `passwordHash`（加盐哈希）
- `authProvider`（local / oauth2 / mixed）
- `avatarUrl`
- `timezone`
- `isActive`
- `createdAt`
- `updatedAt`

### 15.3 Session 建议字段

- `id`
- `userId`
- `createdAt`
- `expiresAt`
- `lastActiveAt`
- `ipAddress`
- `userAgent`
- `metadata`

### 15.4 RoleAssignment 建议字段

- `id`
- `userId`
- `scopeType`（global / project）
- `projectId`（scope 为 project 时必填）
- `role`（admin / user / 项目级角色）
- `createdAt`

### 15.5 ApiToken 建议字段（Phase 1 新增）

- `id`
- `name`（Token 名称/描述）
- `tokenHash`（哈希存储，不明文）
- `subjectType`（external_agent）
- `subjectId`（关联的 Agent 身份）
- `identitySource`（cli / api / mcp / plugin）
- `projectScope`（项目级作用域）
- `permissionProfile`（允许的权限范围）
- `issuedBy`（签发者 userId）
- `status`（active / revoked / expired）
- `expiresAt`
- `lastUsedAt`
- `createdAt`
- `revokedAt`

### 15.6 关系建议

- `User 1 - N Session`
- `User 1 - N RoleAssignment`
- `User 1 - N ApiToken`（签发者关系）
- `ApiToken N - 1 Project`（作用域）

## 16. Phase 1 非目标

Auth 模块在 Phase 1 暂不要求：

- SSO / OAuth2（企业 IdP 集成，Azure AD / Okta）
- MFA / OTP（多因素认证）
- 生物认证
- 企业目录导入（LDAP / AD）
- 复杂权限策略引擎
- 会话 IP 异常检测（基础审计有，智能检测 Phase 2）

## 17. GWT 验收场景

### 17.1 正常流：人类登录

```
Given 有效用户名密码与可用 JWT 配置
When 调用登录接口
Then 返回 access token（JWT）、用户信息与角色
  And 登录成功记录审计
```

### 17.2 异常流：认证失败

```
Given 错误凭据或未授权请求
When 调用认证接口
Then 返回明确鉴权错误与可读提示
  And 失败记录审计与限流计数
```

### 17.3 边界流：限流与过期

```
Given 连续登录尝试、空凭据或过期 token
When 发起认证流程
Then 系统按限流/校验/过期策略稳定处理
  And 超过失败阈值触发账号锁定
```

### 17.4 API Token 签发与接入

```
Given PM 为外部 Agent 签发 API Token（绑定项目 P）
When Agent 凭 Token 通过 CLI 接入
Then Token 验证通过，建立 Agent 会话
  And Agent 身份交由 AI Hub 映射角色与等级
  And Token 使用记录审计
```

### 17.5 Token 作用域约束

```
Given Agent A 持有项目 P 的 Token
When A 尝试访问项目 Q 的资源
Then 访问被拒绝（Token 作用域越权）
  And 记录安全告警
```

### 17.6 Token 撤销

```
Given PM 撤销了 Agent A 的 Token
When A 再次凭该 Token 接入
Then 认证失败（Token 已失效）
  And 撤销记录审计并通知签发者
```

### 17.7 权限检查

```
Given 用户 U 是项目 P 的 Viewer
When U 调用任务创建接口
Then hasPermission 返回 false
  And 接口返回权限不足错误
```

### 17.8 暴力破解防护

```
Given 单 IP 短时间内多次登录失败
When 失败次数超过阈值
Then 触发 IP 限流与账号锁定
  And 记录安全告警通知 admin
```

## 18. 待确认问题

1. JWT 刷新机制（refresh token）是否在 Phase 1 实现，还是仅 access token 过期重登
2. API Token 默认有效期（长期 vs 90 天轮换，需确认安全策略）
3. Token 权限范围（`permissionProfile`）是否在 Phase 1 支持细粒度配置，还是仅项目级绑定
4. 失败锁定阈值与锁定时长（需确认安全策略默认值）
5. Phase 2 SSO/OAuth2 是否需要 Phase 1 预留数据模型（OAuth2Provider/OAuth2Account 表是否先建）
