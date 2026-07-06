# Feature: planner-agent

## 元数据
- 状态: designed
- 依赖: orchestrator-core
- 优先级: P0

## 需求描述
实现 Planner Agent，负责任务拆解、依赖分析和优先级排序。

## 验收标准
- [ ] 能读取 Feature 文档并拆解为任务列表
- [ ] 任务列表包含依赖关系
- [ ] 每个任务有 T 恤尺码估算
- [ ] 按 P0/P1/P2 排序

## 设计决策
- 任务拆解结果写入 handoff 供 Orchestrator 读取
- 使用结构化 Markdown 列表作为任务表示

## 任务清单
- [ ] TASK-001: 实现任务拆解算法 (developer)
- [ ] TASK-002: 实现依赖图构建 (developer)
- [ ] TASK-003: 实现优先级排序 (developer)

## 变更日志
- 2026-07-05: 创建文档，状态 designed
