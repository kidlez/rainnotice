# Herness Feature 规范

## Feature 生命周期

```
draft → designed → implemented → verified → archived
```

每个 Feature 必须按照这个生命周期前进，不可跳过阶段。

---

## Feature 文档模板

```markdown
# Feature: [名称]

## 元数据
- 状态: draft | designed | implemented | verified | archived
- 依赖: [前置 Feature ID 列表]
- 优先级: P0 | P1 | P2
- 负责人: [orchestrator | planner | designer | developer | validator]

## 需求描述
<!-- 一句话说明做什么 -->

## 验收标准
<!-- 逐条列出通过的判断标准 -->

## 设计决策
<!-- 关键设计选择的理由 -->

## 任务清单
- [ ] TASK-NNN: 描述 (负责人)
- [ ] TASK-NNN: 描述 (负责人)

## 变更日志
- 2026-07-05: 创建文档，状态 draft
```

---

## Feature 注册表

所有 Feature 在 `features/registry.json` 中注册：

```json
{
  "features": [
    {
      "id": "F-001",
      "name": "orchestrator-core",
      "status": "draft",
      "path": "features/orchestrator-core.feature.md",
      "depends_on": []
    }
  ],
  "meta": {
    "version": "1.0.0",
    "updated": "2026-07-05T22:00:00Z"
  }
}
```

---

## Feature 目录约定

每个 Feature 实现后，代码放在：

```
features/<name>/
├── src/           # 源代码
├── __tests__/     # 测试
└── index.ts       # 入口
```
