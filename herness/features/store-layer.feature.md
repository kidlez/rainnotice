# Feature: store-layer

## 元数据
- 状态: designed
- 依赖: 无
- 优先级: P0

## 需求描述
实现 herness 的持久化存储层，包括 handoff 读写、上下文管理、归档管理。

## 验收标准
- [ ] 支持 handoff.md 的原子读写
- [ ] 支持上下文目录的创建和读取
- [ ] 支持知识卡片的 CRUD
- [ ] 所有路径基于 .devkit/

## 设计决策
- handoff 使用 YAML 格式单文件
- 上下文按 Agent 分目录存储
- 归档使用卡片格式

## 任务清单
- [ ] TASK-001: 实现 HandoffStore (developer)
- [ ] TASK-002: 实现 ContextStore (developer)
- [ ] TASK-003: 实现 ArchiveStore (developer)
- [ ] TASK-004: 实现路径安全工具 (developer)

## 变更日志
- 2026-07-05: 创建文档，状态 designed
