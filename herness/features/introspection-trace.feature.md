# Feature: introspection-trace

## 元数据
- 状态: designed
- 依赖: store-layer
- 优先级: P0

## 需求描述
实现任务执行轨迹记录。每个完成的任务保留输入、执行步骤、出错点和最终输出，供后续任务检索相似经验。

## 验收标准
- [ ] 支持记录完整执行轨迹（输入/步骤/错误/输出/耗时）
- [ ] 按关键词提取相似度标签
- [ ] 支持按标签检索历史轨迹
- [ ] 支持按 featureId 查询该 feature 的所有轨迹
- [ ] 存储到 .devkit/archive/traces/

## 设计决策
- 轨迹文件格式：Markdown with YAML frontmatter，与 ArchiveStore 一致
- 相似度标签从 task description 和错误信息中自动提取关键词
- 轨迹存储路径：.devkit/archive/traces/<featureId>-<taskId>.md

## 任务清单
- [ ] TASK-001: 实现 TraceStore 核心类 (developer)
- [ ] TASK-002: 实现关键词提取算法 (developer)
- [ ] TASK-003: 实现相似轨迹检索 (developer)
- [ ] TASK-004: 更新 lib/store/index.ts 导出 (developer)

## 变更日志
- 2026-07-05: 创建文档，状态 designed
