# Feature: introspection-planner-evolve

## 元数据
- 状态: designed
- 依赖: introspection-trace, planner-agent
- 优先级: P2

## 需求描述
Planner 从历史 traces 中学习，渐进修正任务拆解策略。记录预估 vs 实际偏差，积累足够样本后调整权重参数。

## 验收标准
- [ ] Planner 能加载和保存 PlannerWeights
- [ ] 每次任务完成后记录预估偏差
- [ ] 积累 N ≥ 10 个样本后触发权重修正
- [ ] 权重文件存于 .devkit/context/planner/weights.json
- [ ] 修正后偏差缩小

## 设计决策
- 初始权重为枚举默认值（即 Planner 现有启发式规则等价）
- 偏差 = |预估工作量(S/M/L/XL) - 实际耗时小时数|
- 修正算法：指数移动平均，alpha=0.3
- 每次完成一个 feature 的所有任务后计算一次偏差
- 不改变 Planner 的接口，只内部读取 weights 影响估算

## 任务清单
- [ ] TASK-001: 实现 PlannerWeights 加载/保存 (developer)
- [ ] TASK-002: 实现偏差记录 (developer)
- [ ] TASK-003: 实现 EMA 权重修正算法 (developer)
- [ ] TASK-004: 改造 Planner._estimateSize 读取权重 (developer)
- [ ] TASK-005: 改造 Planner._estimatePriority 读取权重 (developer)

## 变更日志
- 2026-07-05: 创建文档，状态 designed
