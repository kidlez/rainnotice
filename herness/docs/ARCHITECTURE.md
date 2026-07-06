# Herness 框架架构设计

## 设计哲学

```
每位 Agent 是一位专家，每份文档是一个契约，每次迭代是一次验证。
```

### 核心原则

1. **文档驱动** — 所有设计、决策、规范以文档为 Truth Source。代码是文档的产物。
2. **职责孤立** — 每个 Agent 只有一种职责，Agent 间通过结构化文档通信，不共享上下文。
3. **阶段门禁** — 工作流分为明确阶段，每个阶段有输入契约和输出产物，通过门禁才能进入下一阶段。
4. **可重入** — 所有状态持久化到磁盘，支持在任何节点崩溃后恢复。
5. **知识蒸馏** — 完成的工作自动归档为可复用知识，供后续开发参考。

---

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                     Orchestrator                        │
│  协调 - 调度 - 状态管理 - 崩溃恢复                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Planner  │  │ Designer │  │ Developer│  │Validator│ │
│  │ 规划拆解 │  │ 详细设计 │  │ 编码实现 │  │ 验证审查 │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                                                         │
│  ┌──────────┐  ┌──────────┐                             │
│  │Documenter│  │ Archiver │                             │
│  │ 文档维护 │  │ 归档蒸馏 │                             │
│  └──────────┘  └──────────┘                             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                     Store Layer                         │
│  .devkit/handoff.md  .devkit/context/  .devkit/archive/ │
└─────────────────────────────────────────────────────────┘
```

### 三层架构

| 层级 | 组件 | 职责 |
|------|------|------|
| **编排层** | Orchestrator | 任务分派、状态跟踪、崩溃恢复、进度管理 |
| **执行层** | 6 个专业 Agent | 各司其职，独立完成子任务 |
| **存储层** | Store | 结构化状态持久化、上下文归档 |

---

## Agent 模型

### Agent 定义规范

每个 Agent 由一份 `.agent.md` 文件定义：

```yaml
---
id: planner
name: 规划 Agent
version: 1.0.0
description: 负责需求分析和任务分解
trigger: orchestrator.dispatch
input: 需求文档 / 设计文档
output: 任务拆解列表
capabilities:
  - 需求澄清与分析
  - 任务依赖图构建
  - 工作量估算
  - 优先级排序
constraints:
  - 不编写任何代码
  - 不修改任何文件
  - 不执行任何测试
state_dir: .devkit/context/planner/
---
```

### Agent 通信契约

Agent 间通过 `handoff.md` 交换信息：

```yaml
---
from: orchestrator
to: planner
timestamp: 2026-07-05T22:00:00Z
status: dispatched
payload:
  task_id: TASK-001
  input_ref: docs/requirements/auth.feature.md
  context:
    - docs/ARCHITECTURE.md
    - docs/AGENTS.md
---
```

### Agent 生命周期

```
IDLE → DISPATCHED → RUNNING → COMPLETED → REVIEWED
                  → RUNNING → FAILED   → REDISPATCHED
```

---

## Feature 模型

每个 Feature 由一份 `.feature.md` 文件定义：

```markdown
# Feature: feature-name

## 元数据
- 状态: [draft|designed|implemented|verified|archived]
- 依赖: [feature-list]
- 优先级: [P0|P1|P2]

## 需求描述

## 设计决策

## 任务清单
- [ ] TASK-001: 任务描述 (负责人: planner)
- [ ] TASK-002: 任务描述 (负责人: developer)

## 验证标准

## 变更日志
```

---

## Workflow 模型

### 标准开发流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 需求澄清阶段 │────>│ 设计阶段     │────>│ 实现阶段     │
│ (Planner)   │     │ (Designer)  │     │ (Developer)  │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 归档阶段     │<────│ 验证阶段     │<────│             │
│ (Archiver)  │     │ (Validator) │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 每个阶段的输入/输出

| 阶段 | Agent | 输入 | 输出 | 门禁条件 |
|------|-------|------|------|----------|
| 需求澄清 | Planner | 用户需求 | 需求确认清单 | 用户确认通过 |
| 设计 | Designer | 需求确认清单 | 技术设计方案 | 用户确认通过 |
| 实现 | Developer | 技术设计方案 | 可运行代码 | 编译通过 |
| 验证 | Validator | 代码 + 设计 | 验证报告 | 所有用例通过 |
| 归档 | Archiver | 所有产物 | 知识卡片 | 验证通过 |

---

## 状态管理

### 持久化结构

```
.devkit/
├── handoff.md          # 当前交接状态（单文件，覆盖写入）
├── context/            # Agent 上下文历史
│   ├── planner/        # Planner 的历史
│   ├── designer/
│   ├── developer/
│   ├── validator/
│   ├── documenter/
│   └── archiver/
└── archive/            # 已完成知识卡片
    ├── knowledge/      # 技术知识
    ├── patterns/       # 设计模式
    └── decisions/      # 架构决策记录 (ADR)
```

### 卡片格式

```yaml
---
type: knowledge|pattern|decision
id: K-001
title: 知识卡片标题
tags: [tag1, tag2]
source_ref: feature/auth.feature.md
created: 2026-07-05
validated: true
summary: 核心内容摘要
body: |
  详细内容...
---
```

---

## 安全模型

1. **Agent 权限隔离** — 每个 Agent 只能访问其声明的 `capabilities` 范围内的资源
2. **文件系统沙箱** — Developer Agent 的写操作限定在 `features/<name>/` 目录内
3. **状态审计** — 所有 handoff 操作记录时间戳和校验和
4. **门禁审查** — 验证不通过不得进入归档阶段

---

## 技术选型

| 层 | 技术 | 理由 |
|----|------|------|
| 语言 | TypeScript (Node.js) | 与开放生态一致，类型安全 |
| 状态存储 | 文件系统 (JSON + Markdown) | 零依赖，可读可审计 |
| Agent 通信 | 结构化 Handoff 文件 | 解耦，可追溯 |
| 配置 | herness.json | 单一配置入口 |
| 模板 | EJS (可选) | 轻量文档生成 |

---

## 文件结构总览

```
herness/
├── agents/               # Agent 定义文件 (*.agent.md)
├── features/             # Feature 定义文件 (*.feature.md)
├── workflows/            # 工作流定义文件 (*.workflow.md)
├── lib/                  # 核心库
│   ├── orchestrator/     # 编排引擎
│   ├── planner/          # 规划逻辑
│   ├── executor/         # 执行引擎
│   ├── validator/        # 验证引擎
│   └── store/            # 持久化层
├── docs/                 # 文档
├── templates/            # 模板文件
├── shared/               # 共享代码
│   ├── types/            # 类型定义
│   └── utils/            # 工具函数
├── .devkit/              # 运行时状态（不提交）
│   ├── context/          # Agent 上下文
│   └── archive/          # 知识归档
├── herness.json          # 框架配置
└── AGENTS.md             # 根配置
```
