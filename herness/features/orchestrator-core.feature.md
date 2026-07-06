# Feature: orchestrator-core

## 元数据
- 状态: designed
- 依赖: 无
- 优先级: P0

## 需求描述
实现 herness 的核心编排引擎，负责任务分派、状态跟踪、崩溃恢复、进度管理。

## 验收标准
- [ ] 能按顺序 dispatch Agent 并等待完成
- [ ] 支持崩溃后从 handoff.md 恢复
- [ ] 能生成进度报告
- [ ] 所有状态持久化到 .devkit/

## 设计决策
- 使用单文件 handoff.md 作为状态真理源，覆盖写入
- Agent 完成后在 handoff 中记录结果
- 启动时检测 handoff 状态决定新流程或恢复

## 任务清单
- [ ] TASK-001: 定义核心类型 (orchestrator)
- [ ] TASK-002: 实现 Store 层（handoff 读写） (developer)
- [ ] TASK-003: 实现 Orchestrator 调度循环 (developer)
- [ ] TASK-004: 实现崩溃恢复逻辑 (developer)
- [ ] TASK-005: 实现进度报告生成 (developer)

## 变更日志
- 2026-07-05: 创建文档，状态 draft → designed
