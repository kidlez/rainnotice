# Feature: victory-gate

## 元数据
- 状态: designed
- 依赖: validator-agent, designer-agent
- 优先级: P0

## 需求描述
实现胜利门禁：在 Validator 全部通过后，执行额外的多维审查，防止 AI 过早宣布胜利。包含 AC 逐条验证、设计覆盖度检查、Critic 审查、边界探针和硬性门槛。

## 验收标准
- [ ] 逐条检查每个验收标准是否有测试覆盖和实现
- [ ] 检查设计文档每个章节在代码中是否有对应实现
- [ ] 运行 20 个 Critic 问题，按 5 个类别（completeness/correctness/edge_case/spec_gap/assumption）审查
- [ ] 硬性门槛：无 TODO、无 any、测试文件存在、导入可解析
- [ ] 未通过时生成 retryHints 指导修复
- [ ] maxRetries 超限后停止，避免无限循环
- [ ] 每次评估后比较 confidence，检测是否有改善

## 设计决策
- 不替代 Validator，而是在 Validator 之后增加一层判断
- Critic 问题分为 5 类，覆盖 AI 常见虚假完成模式
- hard floor: 5 项硬性要求，不可绕过
- 改善检测：如果重试后 confidence 反而下降，标记需要人工介入

## 任务清单
- [ ] TASK-001: 实现 ACVerifier（逐条验收标准验证） (developer)
- [ ] TASK-002: 实现 DesignCoverageVerifier（设计覆盖度） (developer)
- [ ] TASK-003: 实现 CriticReviewer（20 题批评审查） (developer)
- [ ] TASK-004: 实现 EdgeCaseProber（边界探针） (developer)
- [ ] TASK-005: 实现 MinimumBar（硬性门槛） (developer)
- [ ] TASK-006: 实现改善检测和 retryHints 生成 (developer)

## 变更日志
- 2026-07-05: 创建文档，状态 designed
