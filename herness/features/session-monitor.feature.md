# Feature: session-monitor

## 元数据
- 状态: designed
- 依赖: introspection-trace
- 优先级: P1

## 需求描述
终端进度监控：显示当前活跃 Agent、执行耗时、通过/失败状态、trace 树。替代盲等模式。

## 验收标准
- [ ] AgentProgress 显示每个 Agent 的实时状态和耗时
- [ ] SessionMonitor.summary() 输出格式化进度表
- [ ] 支持 trace 树形展示（子 Agent → 孙 Agent）
- [ ] 兼容 CLI 的 `herness status --watch`

## 设计决策
- 终端友好，ASCII 表格
- 从 .devkit/context/ 实时读取 Agent 状态
- trace 树基于 Checkpoint 的 agentId 父子关系

## 任务清单
- [ ] TASK-001: 实现 SessionMonitor 类 (developer)
- [ ] TASK-002: 集成到 Orchestrator 的 dispatch/waitFor (developer)
- [ ] TASK-003: CLI 子命令 status --watch (developer)
