# Feature: agent-sdk

## 元数据
- 状态: designed
- 依赖: 所有 Agent
- 优先级: P0

## 需求描述
提供统一的 programmatic API，支持 `import { Planner, Designer, ... } from 'herness'`。暴露 Pipeline 类用于一键编排，对外隐藏内部路径细节。

## 验收标准
- [ ] `import { Planner, Designer, Developer, Validator, Reflector, VictoryGate, Guard, ... } from 'herness'`
- [ ] HerenessSDK 类封装常用工作流（plan → design → verify）
- [ ] 类型全部导出
- [ ] 支持 ES Module 和 CommonJS

## 设计决策
- SDK 文件在 `lib/sdk/index.ts`，在 `package.json` exports 中映射
- Pipeline 提供 `pipeline.run(featureName)` 一键执行全流程

## 任务清单
- [ ] TASK-001: 创建 lib/sdk/index.ts 统一导出 (developer)
- [ ] TASK-002: 实现 Pipeline 类（plan→design→verify→gate） (developer)
- [ ] TASK-003: 更新 package.json exports 字段 (developer)
