# Herness

文档驱动的多 Agent 开发框架。用 Feature 文档定义需求，Agent 按阶段协同工作，每一步有验证、有回滚、可追溯。

---

## 安装与使用

```bash
# 安装（全局注册 herness 命令）
git clone <repo>
cd herness
npm install && npm run build && npm link

# 在任意项目目录使用
cd /path/to/my-project
herness init                     # 创建 features/ .devkit/ herness.json
herness new user-auth             # 创建功能文档
herness plan user-auth            # 任务拆解
herness verify user-auth --tier deep  # 三 Agent 并行验证
herness diagram user-auth         # 生成 PlantUML 图表
herness status --watch            # 实时进度监控
```

---

## 核心概念

| 概念 | 说明 | 位置 |
|------|------|------|
| **Feature 文档** | 每个功能的需求、验收标准、设计决策 | `features/<name>.feature.md` |
| **Agent** | 专职角色（规划、设计、开发、验证等），独立上下文 | `lib/<agent>/` |
| **Handoff** | Agent 间交接契约，结构化状态传递 | `.devkit/handoff.md` |
| **.devkit** | 运行时状态目录（context / archive / checkpoints / memory） | 不提交 |

### Feature 文档模板

```markdown
# Feature: <name>

## 元数据
- 状态: draft | designed | implemented | verified | archived
- 依赖: <feature-list>
- 优先级: P0 | P1 | P2

## 需求描述

## 验收标准
- [ ] <可验证的标准>

## 变更日志
- <date>: <description>
```

---

## 架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│                        Orchestrator                              │
│              调度 → 状态管理 → 崩溃恢复 → Guard 分发               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Planner  │  │ Designer │  │ Developer│  │ Validator│        │
│  │ 任务拆解 │  │ 交互访谈 │  │ 代码生成 │  │ 并行验证 │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                     │                         │                  │
│              ┌──────┤         ┌───────────────┤                  │
│              │  TestPlan      │               │                  │
│              ▼                ▼               ▼                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │PlantUML  │  │Victory   │  │Reflector │  │ Guard    │        │
│  │图表生成  │  │胜利门禁  │  │错误诊断  │  │权限矩阵  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                         安全层                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Checkpoint   │  │ Transaction  │  │  TrashBin    │          │
│  │ 快照/回滚    │  │ 自动包裹     │  │  软删除/恢复  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├──────────────────────────────────────────────────────────────────┤
│                         基础设施                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Handoff  │  │ Context  │  │ Trace    │  │ Memory   │        │
│  │ Store    │  │ Store    │  │ Store    │  │ Store    │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Archive  │  │ Hooks    │  │ Monitor  │  │ Worktree │        │
│  │ Store    │  │ Manager  │  │          │  │ Manager  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Feature 全览（17 项）

### 基础层

| ID | Feature | 说明 |
|----|---------|------|
| F-001 | **store-layer** | Handoff / Context / Archive / Trace 持久化 |
| F-002 | **orchestrator-core** | 调度引擎、崩溃恢复、进度报告、Guard 创建与分发 |

### 核心 Agent

| ID | Agent | 职责 | 关键能力 |
|----|-------|------|---------|
| F-003 | **planner-agent** | 需求拆解 + 优先级排序 | 依赖图、拓扑排序、EMA 权重进化 |
| F-004 | **designer-agent** | 交互式设计访谈 | 8 类别 × 多轮追问、TestPlan 生成 |
| F-005 | **developer-agent** | 代码 + 测试生成 | TestPlan → 测试文件、路径安全校验 |
| F-006 | **validator-agent** | 三 Agent 并行验证 | 功能 / 规范 / 安全 → 熔断 + 分层 |
| F-008 | **reflector-agent** | 错误诊断 + 修复建议 | 6 种错误分类、历史 trace 学习 |

### 质量与安全

| ID | Feature | 说明 |
|----|---------|------|
| F-007 | **introspection-trace** | 执行轨迹记录、Jaccard 相似度检索、历史 fix 复用 |
| F-009 | **planner-evolve** | EMA 权重修正、预估偏差学习 |
| F-010 | **victory-gate** | AC 逐条验证、Critic 20 题审查、硬性门槛 |
| F-011 | **safety-layer** | 快照 / 回滚 / 软删除、Transaction 包装器 |
| F-016 | **worktree-isolation** | Git Worktree 文件系统隔离 |

### 扩展能力

| ID | Feature | 说明 |
|----|---------|------|
| F-012 | **agent-sdk** | 统一 API + Pipeline 一键编排 |
| F-013 | **lifecycle-hooks** | preToolUse / postToolUse / onGuardViolation / onError |
| F-014 | **session-monitor** | 终端进度表 + `--watch` 实时监控 |
| F-015 | **persistent-memory** | 每 Agent 跨会话 MEMORY.md（decision / convention / fix）|
| F-017 | **plantuml-agent** | 5 种图表生成：类图 / 时序图 / 组件图 / 用例图 / 活动图 |

---

## Agent 职责矩阵

| Agent | 读 | 写 | 执行 | 最大操作数 |
|-------|----|----|------|-----------|
| orchestrator | 项目根 | `.devkit/` | — | 500 |
| planner | `features/`, `.devkit/context/planner/` | `context/planner/` | — | 100 |
| designer | `features/` | — | — | 200 |
| developer | `features/` | `features/` | — | 200 |
| validator | `features/`, `.devkit/` | — | 可 | 300 |
| reflector | `features/`, `archive/traces/` | — | — | 200 |

**禁止路径（运行时 Guard 强制执行）：** developer 禁写 `docs/` `lib/` `shared/` `.devkit/`

---

## 验证管线

```
Validator (Orchestrator)
  │
  ├── FunctionalVerifier ─┐  unit_test | functional_test | regression_test | ac_coverage
  ├── StandardsVerifier  ─┤  compile | typecheck | lint | design_coverage | code_style
  └── SecurityVerifier  ──┘  secret_scan | dependency_audit | injection_check | permission_check
       │
       ↓ 任一 critical → AbortController.abort() → 熔断其他 → 断路器（3 次后熔断 5 分钟）
```

### 分层模式

| Tier | 检查范围 | 耗时 | 场景 |
|------|---------|------|------|
| `light` | compile + typecheck + code_style + unit_test | ~5s | CI 快速反馈 |
| `standard` | 全量 | ~20s | 日常开发 |
| `deep` | 全量 + 增强安全扫描 | ~30s | 发布前 |

---

## 胜利门禁

Validator 通过 ≠ 真正完成。VictoryGate 做 5 层审查后才放行：

```
├── AC 逐条验证   → 每个验收标准有测试 + 实现   → blocking
├── 设计覆盖度    → 设计文档每章有代码对应       → blocking
├── Critic 20 题  → completeness / correctness / edge_case / spec_gap / assumption → failed=blocking
├── 边界探针      → 按 auth/payment/data 类型定向 → 信息
└── 硬性门槛      → no_todo / no_any / tests_exist / imports_ok → blocking
```

---

## 安全体系

```
操作前：CheckpointManager.create()   → 快照原始文件
操作中：TrashBin.moveToTrash()       → 软删除（可恢复）
操作后：成功 → checkpoint.commit()   → 保留变更
        失败 → checkpoint.rollback() → 自动恢复
        关键失败 → Validator 自动触发 rollback
```

---

## PlantUML 图表

从设计产物自动生成 5 种图表，输出 `.puml` 文件直接渲染：

```
类图    ← TypeScript 接口定义 + data_model 关系推断（1:1 / 1:N / N:M）
时序图  ← user_flow 采访回答（参与者自动发现）
组件图  ← modules + interfaces + integration 外部系统
用例图  ← 验收标准
活动图  ← user_flow + edge_cases 分支逻辑
```

```bash
herness diagram <feature>                    # 全 5 种
herness diagram <feature> --type class       # 仅类图
herness diagram <feature> --type sequence,usecase
```

---

## CLI 命令参考

```bash
herness init                              # 初始化项目（features/ .devkit/ herness.json）

herness new <name>                        # 创建 Feature 文档
herness plan <name>                       # 任务拆解 + 依赖图
herness verify [name] [--tier light|standard|deep]  # 并行验证
herness gate <name>                       # 胜利门禁

herness diagram <name> [--type class|sequence|component|usecase|activity|all]
herness worktree list | create <feature> | cleanup <id>

herness status                            # 项目总览 + Agent 状态表
herness status --watch                    # 实时进度监控（Ctrl+C 退出）
```

---

## SDK 使用

```ts
import { Planner, Designer, Developer, Validator, Pipeline, Guard } from 'herness'

const p = new Pipeline('/path/to/project')

// 任务拆解
const { tasks, sorted } = await p.plan('user-auth')

// 交互式设计访谈
const designer = new Designer('features', p.getGuard())
const questions = await designer.startInterview('user-auth.feature.md', tasks)
// ... 逐条 answerQuestion() ... → finalize()

// 三 Agent 并行验证
const report = await p.verify('user-auth', artifacts, testPlan, 'deep')
// report.results[0] → functional verifier
// report.results[1] → standards verifier
// report.results[2] → security verifier

// 胜利门禁
const verdict = await p.gate('user-auth', artifacts, report, testPlan)
if (!verdict.passed) {
  console.log(verdict.blockingIssues)   // 逐条修复
  console.log(verdict.retryHints)       // AI 可跟进的修复建议
}
```

---

## 多仓库使用

```
全局安装（一次）
  ~/node_modules/herness → <herness 源码>

项目 A
  /project-a/features/  .devkit/  herness.json    ← 完全隔离

项目 B
  /project-b/features/  .devkit/  herness.json    ← 完全隔离
```

`herness` CLI 通过 `process.cwd()` + `detectRoot()` 自动定位当前项目根目录。所有状态全落在当前项目的 `.devkit/` 下。

---

## 完整开发流程

```
1. herness init                     → 初始化项目结构
2. herness new <name>               → 创建 Feature 文档
3. herness plan <name>              → Planner 拆解任务 + 依赖图
4. Designer 交互访谈                → 8 类别 × 多轮追问 → TestPlan → 设计文档
5. herness diagram <name>           → 生成 PlantUML 图表
6. Developer.generateCode()         → src/*.ts + __tests__/*.test.ts
7. herness verify <name> --tier deep → 三 Agent 并行验证 + 回归
         ↓ 失败 → Reflector 诊断 → 修复 → 重试
         ↓ 通过
8. VictoryGate.evaluate()           → AC 逐条 + Critic 审查 + 硬性门槛
         ↓ 未通过 → retryHints → 修复 → 回到 7
         ↓ 通过
9. TraceStore.save()                → 记录执行轨迹
10. Planner.recordDeviation()       → 记录偏差 → 进化
```

---

## 项目结构

```
my-project/
├── features/                     # Feature 文档
│   ├── user-auth.feature.md
│   ├── user-auth/
│   │   ├── src/                  # 源码
│   │   ├── __tests__/            # 测试（单元 + 功能）
│   │   └── diagrams/             # PlantUML 图表
│   └── payment.feature.md
├── .devkit/                      # 运行时（不提交）
│   ├── handoff.md                # 当前交接状态
│   ├── context/<agent>/          # 每 Agent 上下文
│   ├── checkpoints/              # 快照备份
│   ├── archive/                  # 知识卡片 + traces
│   ├── memory/<agent>.md         # 跨会话记忆
│   └── trash/                    # 软删除回收
├── herness.json                  # 框架配置
└── AGENTS.md                     # 项目规则
```
