# Herness Agent 规范

## Agent 类型一览

| ID | 名称 | 职责 | 工具权限 |
|----|------|------|----------|
| orchestrator | 编排 Agent | 任务协调，状态管理 | 读写 handoff，查询状态 |
| planner | 规划 Agent | 需求拆解，任务规划 | 读需求文档，写任务列表 |
| designer | 设计 Agent | 技术方案设计 | 读需求+任务，写设计文档 |
| developer | 实现 Agent | 编码实现 | 读设计，写代码（限定目录） |
| validator | 验证 Agent | 测试验证 | 读代码+设计，写验证报告 |
| documenter | 文档 Agent | 文档维护 | 读所有文档，写文档 |
| archiver | 归档 Agent | 知识蒸馏 | 读所有产物，写归档 |
| reflector | 反思 Agent | 错误诊断 | 读错误+设计+traces，不写代码 |

---

## 权限矩阵（运行时强制）

Guard 层在每次 I/O 操作前校验权限。越权操作被记录。

| Agent | 可读 | 可写 | Handoff | exec | Ops上限 |
|-------|------|------|---------|------|---------|
| orchestrator | 项目根 | `.devkit/` | 读+写 | — | 500 |
| planner | `features/`, `.devkit/context/planner/` | `context/planner/` | — | — | 100 |
| designer | `features/` | — | — | — | 200 |
| developer | `features/` | `features/` | — | — | 200 |
| validator | `features/`, `.devkit/` | — | — | 可 | 300 |
| reflector | `features/`, `archive/traces/` | — | — | — | 200 |
| documenter | 项目根 | `docs/` | — | — | 100 |
| archiver | 项目根 | `archive/` | — | — | 100 |

**禁止路径：** developer 禁写 `docs/`, `lib/`, `shared/`, `.devkit/`；planner/designer/validator/reflector 禁写 `lib/`, `shared/`。

---

## Orchestrator

```yaml
---
id: orchestrator
name: 编排 Agent
version: 1.0.0
entry: lib/orchestrator/index.ts
trigger: startup / user request
input: herness.json + AGENTS.md
output: 任务完成状态
capabilities:
  - 读取和解析 herness.json
  - 管理 Agent 生命周期（dispatch, wait, review）
  - 读写 .devkit/handoff.md
  - 崩溃恢复和重入
  - 进度报告生成
  - 创建 Guard 并注入所有 Agent
  - 生成 guard-report.md（越权记录）
constraints:
  - 不直接执行实现任务
  - 不修改 features/ 下的文件
state_dir: .devkit/context/orchestrator/
---
```

### 行为规范

1. 启动时检查 `.devkit/handoff.md` 是否存在 → 存在则恢复，不存在则新流程
2. 按顺序 dispatch Agent，等待每个 Agent 完成
3. 每次 dispatch 前更新 handoff 状态
4. 所有 Agent 完成后生成最终报告

---

## Planner

```yaml
---
id: planner
name: 规划 Agent
version: 1.0.0
entry: lib/planner/index.ts
trigger: orchestrator.dispatch
input: 需求文档 / Feature 文档
output: 任务拆解列表（写入 handoff）
capabilities:
  - 需求澄清与分析
  - 任务依赖图构建
  - 工作量估算（T 恤尺码：S/M/L/XL）
  - 优先级排序（P0/P1/P2）
constraints:
  - 不编写任何代码
  - 不修改 existing 文件
state_dir: .devkit/context/planner/
---
```

### 输出格式

```
TASK-001: [P0] 定义数据模型 (S) — 依赖: 无
TASK-002: [P0] 实现核心逻辑 (M) — 依赖: TASK-001
TASK-003: [P1] 编写单元测试 (M) — 依赖: TASK-002
```

---

## Designer

```yaml
---
id: designer
name: 设计 Agent
version: 2.0.0
entry: lib/designer/index.ts
trigger: orchestrator.dispatch (planner completed)
input: 需求文档 + 任务列表
output: 含 Q&A 追溯的技术设计方案文档
capabilities:
  - 按 8 个类别生成访谈问题（scope/data_model/interface/user_flow/edge_cases/non_functional/constraints/integration）
  - 基于用户回答自动跨类别追问
  - 多轮递进式深入提问
  - 从 Q&A 推断类型定义和接口契约
  - 生成可追溯的设计文档
constraints:
  - 不编写实现代码
  - 不执行测试
  - 不跳过关键类别直接 finalize
state_dir: .devkit/context/designer/
---
```

### 交互式设计流程

```
startInterview()              → 读 Feature 文档，生成 24 个种子问题（8 类别 × 2-3 题）
↓
getOpenQuestions()            → 返回所有未回答问题，供 AI 展示给用户
↓
answerQuestion(id, answer)    → 记录答案 → 跨类别追问（如"并发"→ 追问 edge_cases）
↓
goToNextRound()               → 追问关键类别中答案不够深入的
↓
[重复直到 isReadyToFinalize() → 所有 5 个关键类别全部覆盖]
↓
finalize()                    → 输出含完整 Q&A 追溯的设计文档
```

---

## Developer

```yaml
---
id: developer
name: 实现 Agent
version: 1.0.0
entry: lib/executor/index.ts
trigger: orchestrator.dispatch (designer completed)
input: 技术设计方案
output: 可运行代码
capabilities:
  - 根据设计文档编写 TypeScript 代码
  - 创建必要的目录和文件
  - 安装依赖（如需）
constraints:
  - 写操作限定在 features/<name>/ 目录
  - 不修改 docs/ 下的文件
  - 不修改 .agent.md 定义文件
state_dir: .devkit/context/developer/
---
```

---

## Validator

```yaml
---
id: validator
name: 验证 Agent
version: 1.0.0
entry: lib/validator/index.ts
trigger: orchestrator.dispatch (developer completed)
input: 代码 + 设计文档
output: 验证报告
capabilities:
  - 编译检查
  - 类型检查
  - 运行测试
  - lint 检查
constraints:
  - 不修改代码
  - 不修改设计
state_dir: .devkit/context/validator/
---
```

### 验证报告格式

```yaml
passed: true|false
checks:
  compile: passed|failed
  typecheck: passed|failed
  test: passed|failed|skipped
  lint: passed|failed
summary: "验证摘要"
failures:
  - check: test
    detail: "失败的测试详情"
```

---

## Documenter

```yaml
---
id: documenter
name: 文档 Agent
version: 1.0.0
entry: lib/documenter/index.ts
trigger: orchestrator.dispatch (periodic / on demand)
input: 所有产物
output: 更新后的文档
capabilities:
  - 更新 CHANGELOG
  - 更新 README
  - 生成 API 文档
  - 维护变更日志
constraints:
  - 只修改 docs/ 下的文件
state_dir: .devkit/context/documenter/
---
```

---

## Archiver

```yaml
---
id: archiver
name: 归档 Agent
version: 1.0.0
entry: lib/archiver/index.ts
trigger: orchestrator.dispatch (validator completed)
input: 所有产物 + 验证报告
output: 知识卡片
capabilities:
  - 知识蒸馏（提取可复用模式）
  - 创建 ADR（架构决策记录）
  - 清理临时文件
constraints:
  - 只写 .devkit/archive/ 目录
state_dir: .devkit/context/archiver/
---
```

---

## VictoryGate（胜利门禁）

```yaml
---
id: victory-gate
name: 胜利门禁
version: 1.0.0
entry: lib/victory-gate/index.ts
trigger: validator completed + passed
input: 设计产物 + 验证报告 + TestPlan
output: VictoryVerdict（通过/拦截 + 问题清单 + 修复提示）
capabilities:
  - AC 逐条验证（检查每个验收标准是否有测试和实现）
  - 设计覆盖度检查（设计文档章节 vs 代码文件）
  - Critic 审查（20 个批判性问题 × 5 类别）
  - 边界探针（按 feature 类型自动化）
  - 硬性门槛（无 TODO / 无 any / 测试存在 / import 可解析）
  - 改进检测（前后 confidence 对比判断重试价值）
constraints:
  - 不修改代码，不修改设计文档
  - 达到 maxRetries 后必须停止
state_dir: .devkit/context/victory-gate/
---
```
