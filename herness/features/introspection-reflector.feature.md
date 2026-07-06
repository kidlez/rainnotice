# Feature: introspection-reflector

## 元数据
- 状态: designed
- 依赖: introspection-trace, validator-agent
- 优先级: P1

## 需求描述
实现 Reflector Agent。Validator 验证失败后，Reflector 分析错误报告 + 设计文档，生成诊断和修复建议，回传给 Developer 重试。

## 验收标准
- [ ] 能解析 ValidationReport 提取关键错误
- [ ] 能从设计文档和错误信息诊断根因
- [ ] 能生成带置信度的修复建议列表
- [ ] 能判断是否值得重试
- [ ] 能将修复路径记录到 traces/

## 设计决策
- Reflector 不写代码，只输出修复方向 + 置信度
- 修复建议按文件分组，每个建议带 confidence（high/medium/low）
- 两次重试仍失败则放弃，记录 lessons
- 关键词匹配 + 历史 traces 参考来增强诊断

## 任务清单
- [ ] TASK-001: 实现错误解析器 (developer)
- [ ] TASK-002: 实现诊断引擎（按错误类型分类） (developer)
- [ ] TASK-003: 实现修复建议生成器 (developer)
- [ ] TASK-004: 实现 Reflector 主类 (developer)

## 变更日志
- 2026-07-05: 创建文档，状态 designed
