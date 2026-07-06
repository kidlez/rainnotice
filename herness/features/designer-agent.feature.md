# Feature: designer-agent

## 元数据
- 状态: designed
- 依赖: orchestrator-core
- 优先级: P0

## 需求描述
实现交互式 Designer Agent。读 Feature 文档 → 按 8 个类别生成待澄清问题 → 用户逐条回答 → 自动追问新问题 → 所有关键类别覆盖后输出设计文档。不是一次性自动生成，而是通过多轮对话深挖每处细节。

## 验收标准
- [ ] 能按 scope/data_model/interface/user_flow/edge_cases/non_functional/constraints/integration 8 个类别生成初始问题
- [ ] 用户回答后能基于回答内容自动生成跨类别追问
- [ ] 多轮递进：每轮结束 → 检查未覆盖类别 → 生成深入追问
- [ ] 5 个关键类别全部覆盖后才能 finalize
- [ ] 生成的设计文档包含完整 Q&A 追溯记录
- [ ] 类型定义基于数据模型回答自动推断字段和类型
- [ ] 接口契约从接口类别的回答中提取

## 设计决策
- 访谈模式：startInterview → answerQuestion → goToNextRound → finalize
- 每个问题标记 category + round + resolved
- 追问逻辑：基于回答关键词跨类别触发（如提到"并发"→ 自动追问 edge_cases）
- 生成的设计文档嵌入完整 Q&A 历史，做到"每个设计决策都可追溯"

## 任务清单
- [ ] TASK-001: 实现 8 类种子问题生成 (developer)
- [ ] TASK-002: 实现跨类别追问触发 (developer)
- [ ] TASK-003: 实现多轮深入追问生成 (developer)
- [ ] TASK-004: 实现从 Q&A 提取类型定义 (developer)
- [ ] TASK-005: 实现设计文档含 Q&A 追溯 (developer)

## 变更日志
- 2026-07-05: 创建文档，状态 designed
- 2026-07-05: 重构为交互式访谈模式，8 类别多轮对话
