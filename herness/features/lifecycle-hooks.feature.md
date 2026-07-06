# Feature: lifecycle-hooks

## 元数据
- 状态: designed
- 依赖: safety-layer
- 优先级: P0

## 需求描述
插件化的生命周期钩子。用户可注册 PreToolUse / PostToolUse / onGuardViolation / onError 回调，无需修改核心代码即可扩展行为。

## 验收标准
- [ ] HookManager 管理所有注册的钩子
- [ ] preToolUse(agentId, operation, args) → 可阻止操作
- [ ] postToolUse(agentId, operation, result) → 可记录审计
- [ ] onGuardViolation(violation) → 自定义处理
- [ ] onError(agentId, error) → 自定义错误处理
- [ ] Hook 支持异步和同步两种模式

## 设计决策
- Hook 按 agentId 和 event 两级索引
- preToolUse 返回 false 即可阻止操作执行
- HookManager 单例注入到 Orchestrator

## 任务清单
- [ ] TASK-001: 实现 HookManager 类 (developer)
- [ ] TASK-002: 集成到 Developer（preToolUse/postToolUse） (developer)
- [ ] TASK-003: 集成到 Guard（onGuardViolation） (developer)
- [ ] TASK-004: 添加 HookManager 到 Orchestrator (developer)
