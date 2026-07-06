# Feature: plantuml-agent

## 元数据
- 状态: designed
- 依赖: designer-agent
- 优先级: P1

## 需求描述
PlantUML 图表生成 Agent。从设计产物（类型定义、模块划分、用户流程、验收标准、边界情况）自动生成 5 种 PlantUML 图。独立 Agent，专精图表生成。

## 验收标准
- [ ] 类图：从 TypeScript 接口定义 + 数据模型关系生成
- [ ] 时序图：从用户流程访谈回答生成
- [ ] 组件图：从模块划分 + 接口契约生成
- [ ] 用例图：从验收标准生成
- [ ] 活动图：从用户流程 + 边界情况生成分支逻辑
- [ ] CLI：herness diagram <feature> [--type class|sequence|all]
- [ ] 生成的 .puml 文件存入 features/<name>/diagrams/

## 设计决策
- 5 种图表类型，每种独立生成方法
- PlantUML 语法：@startuml / @enduml，纯文本输出
- 关系推断：从 data_model 采访答案中解析 1:1/1:N/N:M
- 参与者发现：从 integration 采访答案中提取外部系统
- 每个 diagram 输出带说明文本（接口数、模块数、步骤数）

## 任务清单
- [ ] TASK-001: 实现 class diagram 生成器（接口→类图+关系） (developer)
- [ ] TASK-002: 实现 sequence diagram 生成器（用户流程→时序图） (developer)
- [ ] TASK-003: 实现 component diagram 生成器（模块→组件图） (developer)
- [ ] TASK-004: 实现 usecase diagram 生成器（AC→用例图） (developer)
- [ ] TASK-005: 实现 activity diagram 生成器（流程+边界→活动图） (developer)
- [ ] TASK-006: CLI 集成 (developer)

## 变更日志
- 2026-07-06: 创建文档，状态 designed
