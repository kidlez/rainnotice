# Herness Project Rules

## Agent 开发模式

herness 自身采用 herness 方法论开发：
1. 每个 Feature 独立文档驱动
2. 每个 Agent 独立设计实现
3. 使用 sub-agent 平行开发
4. 验证通过后进入归档

## 约定

- 所有代码使用 TypeScript
- 类型定义集中在 shared/types/
- Feature 代码写在其各自目录 features/<name>/
- 运行状态在 .devkit/ 中，不提交
