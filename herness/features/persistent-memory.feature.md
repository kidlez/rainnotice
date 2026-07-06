# Feature: persistent-memory

## 元数据
- 状态: designed
- 依赖: introspection-trace
- 优先级: P1

## 需求描述
每个 Agent 跨会话持久记忆。启动时读取 MEMORY.md，完成时追加关键决策、修复经验、开发约定。消除冷启动问题。

## 验收标准
- [ ] 每个 Agent 在 `.devkit/memory/<agent-id>.md` 读/写记忆
- [ ] AgentMemory 类支持 append(category, content) 追加
- [ ] Planner 记住上次的权重和拆解偏好
- [ ] Developer 记住代码风格约定
- [ ] Reflector 记住已知修复模式
- [ ] 记忆自动去重（相同 category+content 不重复追加）

## 设计决策
- 记忆文件格式：YAML frontmatter + Markdown body
- 3 个标准 category：decision, convention, fix
- 读取时按 category 索引
- 每次会话结束自动 append

## 任务清单
- [ ] TASK-001: 实现 AgentMemory 类 (developer)
- [ ] TASK-002: 集成到 Planner（记住权重历史） (developer)
- [ ] TASK-003: 集成到 Developer（记住代码约定） (developer)
- [ ] TASK-004: 集成到 Reflector（记住修复模式） (developer)
