# Feature: developer-agent

## 元数据
- 状态: designed
- 依赖: orchestrator-core, designer-agent
- 优先级: P0

## 需求描述
实现 Developer Agent，根据设计文档生成 TypeScript 代码，同时根据 TestPlan 生成单元测试和功能测试文件。

## 验收标准
- [ ] 根据类型定义生成 TypeScript 代码和类型文件
- [ ] 根据 TestPlan 生成 __tests__/xxx.test.ts（单元测试）
- [ ] 根据 TestPlan 生成 __tests__/xxx.func.test.ts（功能测试）
- [ ] 生成文件使用 GIVEN-WHEN-THEN 格式
- [ ] 测试文件包含覆盖率注解（哪个 AC）
- [ ] 代码写入选定目录 features/<name>/

## 设计决策
- generateCode 接收 testPlan 可选参数
- 单元测试文件命名为 featureName.test.ts
- 功能测试文件命名为 featureName.func.test.ts
- 使用 vitest 作为默认测试框架
- 生成的测试框架包含 TODO 注释，由开发者填充具体实现

## 任务清单
- [ ] TASK-001: 实现单元测试文件生成器 (developer)
- [ ] TASK-002: 实现功能测试文件生成器 (developer)
- [ ] TASK-003: 改造 generateCode 支持 testPlan 参数 (developer)

## 变更日志
- 2026-07-05: 创建文档，状态 designed
- 2026-07-05: 新增测试文件生成能力
