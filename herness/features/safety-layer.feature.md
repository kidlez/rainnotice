# Feature: safety-layer

## 元数据
- 状态: designed
- 依赖: store-layer
- 优先级: P0

## 需求描述
异常检测与自动回滚止损机制。AI 执行操作前自动创建快照，执行失败或触发 critical 告警时自动回滚到操作前状态。包含软删除（TrashBin）防止误删数据无法恢复。

## 验收标准
- [ ] 文件写入前自动 checkpoint（保存原始内容）
- [ ] 操作失败时自动 rollback（恢复 checkpoint 中的文件）
- [ ] Validator critical 触发时自动调用 rollback
- [ ] 软删除：删除文件前移到 .devkit/trash/ 并记录元数据
- [ ] TrashBin 支持 restore（恢复被删文件）
- [ ] TrashBin 支持 purge（清理过期文件，默认 24h）
- [ ] 每个 checkpoint 记录 agentId + operation + timestamp 可审计

## 设计决策
- Checkpoint 存储原始文件 SHA-256 哈希确保完整性
- 快照存储在 .devkit/checkpoints/<id>/ 下按 id 隔离
- Transaction 模式：create → execute → commit | rollback
- Developer.createFile 只在文件已存在时做 checkpoint（新建文件无回滚必要）
- Validator critical 时自动回滚到该 feature 的最新 active checkpoint

## 任务清单
- [ ] TASK-001: 实现 CheckpointManager（快照/回滚/提交/列表） (developer)
- [ ] TASK-002: 实现 withCheckpoint 事务包装器 (developer)
- [ ] TASK-003: 实现 TrashBin（软删除+恢复+清理） (developer)
- [ ] TASK-004: 集成到 Developer.generateCode + createFile (developer)
- [ ] TASK-005: 集成到 Validator（critical 时自动回滚） (developer)

## 变更日志
- 2026-07-06: 创建文档，状态 designed
