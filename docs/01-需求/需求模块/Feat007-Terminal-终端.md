---
title: "Terminal 模块需求说明"
description: 定义 Terminal 模块在 v2 平台化路线下作为 Local Runtime 受控命令执行与输出证据提供者的职责
category: requirement
status:
  - draft
tags:
  - Terminal
  - Feature
  - requirements
  - execution
version: 2.0.0
created: 2026-07-15 06:40:44
modified: 2026-07-16 04:25:19
projects: "[[APM-项目中心]]"
---

# Terminal 模块需求说明

## 1. 模块定位

在 v2 路线下，Terminal 模块不应再被定义为“应用内终端模拟器”。

Terminal 模块的核心定位是：

> 平台中围绕本地命令执行、输出采集、风险治理和结果证据化，为 Task 执行和 Runtime 提供受控命令能力的执行提供者。

它服务的重点不是终端 UI 体验，而是：

- 让外部 Agent 和人类成员能围绕任务执行本地命令
- 让命令输出进入 `ExecutionRun`
- 让高风险命令被治理和审批

## 2. 模块目标

### 2.1 第一目标

提供项目上下文内可控的命令执行能力：

- 指定工作目录
- 执行命令
- 输出回传
- 失败可定位

### 2.2 第二目标

把命令输出变成结构化执行证据，而不是只停留在终端文本流。

### 2.3 第三目标

让命令执行进入统一的审批、审计和回放体系。

## 3. Phase 1 范围

Phase 1 中，Terminal 模块必须先服务：

- Runtime 发起的任务级命令执行
- 项目工作区内的命令运行
- 输出采集与执行事件回传
- 少量人工查看和复核入口

Phase 1 不以“多标签终端工作台”为目标，而以“任务执行闭环中的命令执行提供者”为目标。

## 4. 核心职责

### 4.1 命令执行边界控制

Terminal 模块必须确保命令执行发生在项目允许的工作区和 Provider 边界内。

至少包括：

- 工作目录校验
- Shell / 进程调用方式约束
- 环境变量注入策略
- 超时与终止机制

### 4.2 命令输出采集

Terminal 模块必须采集：

- 标准输出
- 标准错误
- 退出码
- 执行耗时
- 中断状态

这些输出应能回写到执行记录，而不只是停留在前端面板。

### 4.3 命令风险分级

Terminal 模块必须为命令建立基本风险分级。

建议至少区分：

- 只读命令：如 `ls` `dir` `cat` `rg` `git status`
- 低风险命令：如本地测试、构建、lint
- 高风险命令：如删除文件、覆盖写入、环境变更、脚本执行

### 4.4 输出证据化

Terminal 模块必须支持将命令输出沉淀为：

- 执行日志
- 结构化错误摘要
- 测试结果摘要
- 产物引用

## 5. 核心功能需求

### FR-TR-01 命令执行

Terminal 模块必须支持在指定项目工作区内执行命令。

最小输入建议：

- `projectId`
- `taskId`
- `executionRunId`
- `cwd`
- `command`
- `args`

### FR-TR-02 输出流与结果回传

Terminal 模块必须支持命令输出的流式回传和最终结果收口。

至少包括：

- 运行中输出事件
- 完成事件
- 失败事件
- 中断事件

### FR-TR-03 命令级审批

Terminal 模块必须支持命令执行进入审批门。

Phase 1 建议：

- 明显只读命令默认允许
- 写文件、删文件、环境变更类命令默认审批
- 可执行脚本和批处理命令按项目策略治理

### FR-TR-04 命令结果回写

Terminal 模块必须支持将命令结果回写到任务和执行记录。

至少包括：

- 执行是否成功
- 关键输出摘要
- 错误摘要
- 退出码
- 产物路径引用

### FR-TR-05 命令失败与重试

Terminal 模块必须支持：

- 标记命令失败
- 提供失败摘要
- 允许在新审批或新执行下重试

说明：

- Phase 1 不要求复杂自动重试编排
- 但必须保留失败可追溯性

### FR-TR-06 人工查看入口

Terminal 模块应支持控制面查看执行中的命令和输出摘要。

说明：

- Phase 1 只要求可查看，不追求完整 IDE 级终端体验

## 6. 与 Runtime 和执行模型的关系

Terminal 模块与以下对象强关联：

- `Runtime`
- `ExecutionRun`
- `ExecutionStep`
- `ApprovalRequest`
- `ExecutionEvidence`

说明：

- Terminal 的本地执行能力由 Runtime Provider 层承载
- 控制面主要负责查看、审批和回放

## 7. 数据模型要求

Terminal 模块至少需要以下方向的模型：

- `TerminalExecutionRecord`
- `TerminalOutputChunk`
- `TerminalCommandPolicy`

可考虑的扩展字段：

- `cwd`
- `shell`
- `commandLine`
- `exitCode`
- `durationMs`
- `riskLevel`

## 8. Phase 1 非目标

Terminal 模块在 Phase 1 暂不要求：

- 全功能终端工作台
- 多窗口复杂终端管理
- 长生命周期交互式 shell 托管
- 跨项目共享命令历史中心

## 9. GWT 验收场景

### 正常流

Given 外部 Agent 围绕某个任务发起测试或构建命令  
When Runtime 在项目工作区中执行命令  
Then 平台应流式记录输出，并在结束后回写执行结果和摘要

### 异常流

Given 外部 Agent 请求执行高风险命令  
When 平台未收到审批通过结果  
Then 命令不得执行，并应在 `ExecutionRun` 中记录阻塞原因

### 边界流

Given 某条命令输出很长、执行时间较长且中途被人工终止  
When 用户查看执行记录  
Then 系统应能展示部分输出、终止状态和可追溯的中断记录

## 10. 关联文档

- [[产品需求文档-v2|PRD]]
- [[Feat003-Task-任务|Task 模块需求]]
- [[执行审批模型-v1|执行与审批模型]]
- [[控制平面-本地运行时-v1|控制面与本地执行面架构]]
- [[本地运行时通信协议-v1|Local Runtime 通信协议]]
