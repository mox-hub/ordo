---
title: "CreatePanel（已降级）"
description: 已降级 - 统一创建面板作为 UI 交互模式归入各业务模块（Project/Task/Team），不再作为独立 Feature 模块
category: requirement
status:
  - deprecated
tags:
  - Feature
  - requirements
  - deprecated
version: 2.1.0
created: 2026-07-16 03:43:03
modified: 2026-07-16 03:43:34
projects: "[[APM-项目中心]]"
---

# CreatePanel（已降级）

> **本模块已降级**（v2.1.0 架构调整）
>
> 统一创建面板不是独立业务能力域，而是跨模块的 **UI 交互模式**。其需求已归入各业务模块的创建入口：
>
> - 项目创建 → [[Feat002-Project-项目管理|Project 模块]] FR-PJ-01
> - 任务创建 → [[Feat003-Task-任务|Task 模块]] FR-TK-01
> - 团队创建 → [[Feat004-Team-团队|Team 模块]] FR-TE-01
>
> 「统一创建面板」作为前端交互模式（统一入口、快捷键、命令面板风格）属于前端设计范畴，详见 `03-功能设计/design/` 下的页面设计与交互设计文档。

## 降级原因

1. CreatePanel 是 UI 交互模式，不是独立能力域
2. 原文档仅有一个标题，无实质需求内容
3. 创建能力本身归属各业务模块（Project/Task/Team），创建面板只是入口形态
4. 作为独立 Feature 模块会与各业务模块的创建 FR 重复

## 保留说明

本文件保留作为重定向锚点，避免 Obsidian 双链断裂。实际需求请查阅上述各业务模块。
