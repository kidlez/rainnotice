---
name: herness
description: AI辅助开发方法论。Agent加载后自动按结构化流程引导用户完成需求澄清、设计、实现、验证、门禁的全过程。支持UI DSL（从octo设计JSON生成界面组件）和前后端代码生成。
compatibility: opencode
metadata:
  audience: developers
  category: development-workflow
---

# Herness — AI 辅助开发方法论

herness 是依托 opencode Agent 的开发方法论。Agent 加载本 Skill 后，自动按结构化流程引导用户完成从需求到交付的全过程。

## 触发条件

当用户表达以下意图时激活：
- "帮我做/实现/开发/写一个 XXX"
- "新建一个功能/项目 XXX"
- "设计一个 XXX 系统"
- 任何需要从需求→代码→验证的完整开发任务

## 核心原则

1. **你主导流程** — 主动追问、主动规划、主动验证
2. **用户口头描述需求** — 不需要用户预先写文档，你通过对话澄清
3. **文件系统即状态** — 所有产物写到 `features/<name>/` 目录，透明可审查
4. **阶段门禁** — 每个阶段有输入/输出契约，通过当前阶段才能进入下一阶段

---

## 工作流概览

```
接收需求 → 需求澄清 → 任务规划 → 代码实现 → 验证检查 → 胜利门禁 → 归档
```

每个阶段完成后将产物写入 `features/<name>/` 目录：

```
features/<name>/
├── .design.md       # 需求澄清阶段输出（Q&A 追溯）
├── .plan.md         # 任务规划阶段输出（任务列表+依赖图）
├── .verify.md       # 验证检查阶段输出（验证报告）
├── .gate.md         # 胜利门禁阶段输出（审查结果）
├── src/             # 代码实现阶段输出
│   ├── types.ts
│   ├── index.ts
│   └── ...
└── __tests__/       # 测试代码
    ├── xxx.test.ts
    └── xxx.func.test.ts
```

运行状态在 `.devkit/` 目录中（不入 git）：

```
.devkit/
├── handoff.md       # 当前阶段中断面状态（崩溃恢复用）
├── context/         # 上下文历史
├── archive/         # 知识归档
│   ├── knowledge/
│   ├── patterns/
│   └── decisions/
├── memory/          # Agent 跨会话持久记忆
├── checkpoints/     # 安全快照
├── trash/           # 软删除
└── traces/          # 任务执行轨迹
```

---

## 阶段 1：接收需求

当用户提出开发意图时：

1. 提取 feature 名称（kebab-case）
2. 创建目录 `features/<name>/`
3. 在 `.devkit/handoff.md` 记录起始状态
4. **不要**要求用户写 feature doc — 直接从口头描述中提取关键信息

---

## 阶段 2：需求澄清（交互式设计访谈）

> 对应原 Designer Agent（designer-agent.feature.md）。你必须通过多轮对话深挖每一个关键细节，不得跳过。

### 2.1 8 类访谈框架

按以下 8 个类别结构化提问，每个类别至少覆盖 2-3 个问题：

| 类别 | 英文标识 | 核心问题 |
|------|----------|----------|
| **范围边界** | scope | 这个功能做什么？不做什么？有哪些明确边界？ |
| **数据模型** | data_model | 涉及哪些实体？字段和类型是什么？实体间的关系？ |
| **接口契约** | interface | 有哪些 API/函数签名？输入输出是什么？ |
| **用户流程** | user_flow | 用户的完整操作路径？每一步的输入和预期结果？ |
| **边界情况** | edge_cases | 空输入、非法输入、并发冲突、超时怎么处理？ |
| **非功能需求** | non_functional | 性能、安全、可用性、可维护性有什么要求？ |
| **约束条件** | constraints | 技术栈限制？依赖的库和版本？兼容性要求？ |
| **集成依赖** | integration | 依赖哪些外部系统？数据如何流入流出？ |

### 2.2 多轮递进规则

- **第一轮**：对每个类别提 2-3 个基础问题
- **追问触发**：从用户的回答中提取关键词来跨类别追问
  - 如用户提到"并发" → 自动追问 edge_cases 类别的并发冲突问题
  - 如用户提到"数据库" → 追问 data_model 的表结构 + integration 的数据库选型
- **覆盖率检查**：每轮结束检查是否还有类别未覆盖，有则生成深入追问
- **终止条件**：以下 5 个关键类别全部覆盖后才能进入下一阶段：
  - scope
  - data_model
  - interface
  - user_flow
  - edge_cases

### 2.3 输出 .design.md

finalize 后生成如下结构的文件写入 `features/<name>/.design.md`：

```markdown
# 设计方案: <feature-name>

## Q&A 追溯

### scope (范围边界)
| # | 问题 | 回答 |
|---|------|------|
| 1 | ... | ... |

### data_model (数据模型)
...（同上表格）

### interface (接口契约)
...

### user_flow (用户流程)
...

### edge_cases (边界情况)
...

### non_functional (非功能需求)
...

### constraints (约束条件)
...

### integration (集成依赖)
...

## 类型定义
<!-- 基于 data_model 回答自动推断 -->

```typescript
// ...
```

## 接口契约
<!-- 基于 interface 回答提取 -->

## 测试计划
<!-- 基于 user_flow + edge_cases 生成 -->

## 未解决问题
<!-- 如有 -->
```

**重要**：类型定义要基于数据模型回答自动推断字段名和类型。测试计划要从用户流程和边界情况中提取测试用例。

---

## 阶段 3：任务规划

> 对应原 Planner Agent（planner-agent.feature.md + introspection-planner-evolve.feature.md）

### 3.1 任务拆解

读取 `.design.md`，按以下规则拆解：

1. 从类型定义 → 生成 `types.ts` 任务
2. 从接口契约 → 生成主逻辑实现任务
3. 从测试计划 → 生成测试文件任务
4. 从集成依赖 → 生成集成配置任务

每个任务包含：
- id: TASK-NNN
- description: 一句话描述
- priority: P0 / P1 / P2
- size: S (≤1h) / M (1-3h) / L (3-8h) / XL (>8h)
- depends_on: 依赖的任务 id 列表

### 3.2 依赖图

构建依赖图，检查：
- 无循环依赖
- 拓扑排序后生成执行顺序
- 标记并行可执行的任务组

### 3.3 自进化（可选，P2 优先级）

如果 `.devkit/context/planner/weights.json` 存在，读取历史预估偏差，用 EMA（alpha=0.3）修正当前估算。

### 3.4 输出 .plan.md

```markdown
# 任务规划: <feature-name>

## 依赖图
```
TASK-001 → TASK-002 → TASK-003
         ↗ TASK-004
```

## 任务清单
| ID | 描述 | 优先级 | 估时 | 依赖 | 状态 |
|----|------|--------|------|------|------|
| TASK-001 | 定义数据模型 types.ts | P0 | S | — | pending |
| TASK-002 | 实现核心接口 | P0 | M | TASK-001 | pending |
| TASK-003 | 编写单元测试 | P1 | M | TASK-002 | pending |
| TASK-004 | 编写功能测试 | P1 | M | TASK-002 | pending |
```

---

## 阶段 4：代码实现

> 对应原 Developer Agent（developer-agent.feature.md）

### 4.1 代码生成规则

按照 `.plan.md` 中的任务顺序实现：

1. **types.ts** — 从 `.design.md` 的类型定义生成完整的 TypeScript 接口和类型
2. **index.ts** — 实现接口契约中的函数/类
3. **__tests__/xxx.test.ts** — 单元测试，使用 GIVEN-WHEN-THEN 格式
4. **__tests__/xxx.func.test.ts** — 功能测试，覆盖完整的用户流程

### 4.2 安全约束

- **写操作限定在 `features/<name>/` 目录内**
- 不修改 `docs/`、`lib/`、`shared/`、`.devkit/` 下的文件
- 向已有文件写入前，检查是否已有内容（提示用户确认覆盖）
- 如果依赖了新的 npm 包，提示用户是否需要 `npm install`

### 4.3 测试格式

```typescript
// GIVEN: 前置条件
// WHEN: 执行操作
// THEN: 预期结果
// COVERS: AC-XXX（覆盖的验收标准）
```

---

## 阶段 5：验证检查

> 对应原 Validator Agent（validator-agent.feature.md）

### 5.1 三层并行验证

| 验证器 | 检查项 | 严重级别 |
|--------|--------|----------|
| **FunctionalVerifier** | 编译、类型检查、单元测试、功能测试、回归测试、AC 覆盖 | critical |
| **StandardsVerifier** | lint、代码规范、设计覆盖度 | warning |
| **SecurityVerifier** | 密钥扫描、依赖审计、注入检测、权限检查 | critical |

### 5.2 执行策略

1. 调用 MCP 工具 `herness_verify` 执行三 Agent 并行验证
2. 任一 Agent 发现 critical 级别问题 → 立即熔断，停止其他 Agent
3. 连续 3 次 critical 触发 → 进入断路状态（5 分钟后自动复位）
4. 按需求选择 tier：
   - **light**（快速反馈）：compile + typecheck + code_style + unit_test
   - **standard**（标准）：全量检查
   - **deep**（深度）：全量 + 依赖审计 + 回归测试

### 5.3 输出 .verify.md

```markdown
# 验证报告: <feature-name>

## 总体结果: PASSED / FAILED

## 功能验证
- compile: passed/failed
- typecheck: passed/failed
- unit_test: passed/failed
- functional_test: passed/failed
- regression: passed/failed/skipped
- ac_coverage: passed/failed

## 标准验证
- lint: passed/failed
- code_style: passed/failed
- design_coverage: passed/failed

## 安全验证
- secret_scan: passed/failed
- dependency_audit: passed/failed
- injection_check: passed/failed
- permission_check: passed/failed

## 失败详情
| 检查项 | 详情 | 严重级别 |
|--------|------|----------|
| ... | ... | ... |
```

---

## 阶段 6：胜利门禁

> 对应原 Victory Gate（victory-gate.feature.md）。Validator 全部通过后才执行。这是防止 Agent 过早宣布"做完了"的最后防线。

### 6.1 五层审查

| 层级 | 检查内容 | 硬性要求 |
|------|----------|----------|
| **AC 逐条验证** | 逐个验收标准检查是否有测试覆盖 + 实现 | 必须 |
| **设计覆盖度** | 设计文档每个章节在代码中是否有对应 | 必须 |
| **Critic 审查** | 20 个批评性问题 × 5 类别（completeness / correctness / edge_case / spec_gap / assumption） | 建议 |
| **边界探针** | 针对 feature 类型自动化探测常见边界 | 建议 |
| **硬性门槛** | 无 TODO、无 any、测试文件存在、import 可解析、无 console.log | 不可绕过 |

### 6.2 Critic 审查 5 类别

对每个类别问 4 个批判性问题：

1. **completeness** — 功能是否完整？有没有遗漏的验收标准？
2. **correctness** — 逻辑是否正确？有没有隐蔽的 bug？
3. **edge_case** — 边界情况是否已处理？空状态、超限、异常流程？
4. **spec_gap** — 需求和实现之间是否有 gap？有没有未明确的假设？
5. **assumption** — 有哪些隐含假设？假设失效时系统行为正确吗？

### 6.3 重试机制

- 未通过时生成 retryHints（具体修复方向）
- 回到阶段 4 或 5 修复后重试
- maxRetries 默认 3 次
- 每次重试后比较 confidence：下降则标记需人工介入

### 6.4 输出 .gate.md

```markdown
# 门禁审查: <feature-name>

## 最终裁决: PASSED / FAILED / NEEDS_HUMAN

## AC 验证
| AC | 描述 | 状态 | 证据 | 缺失 |
|----|------|------|------|------|
| ... | ... | verified/unverified/disputed | ... | ... |

## 设计覆盖度
- 设计章节: 5, 已覆盖: 4, 缺失: ["non_functional"]

## Critic 审查
| # | 类别 | 问题 | 评估 |
|---|------|------|------|
| 1 | completeness | ... | passed/flagged/failed |

## 硬性门槛
- 无 TODO: passed/failed
- 无 any: passed/failed
- 测试文件: passed/failed
- import 可解析: passed/failed

## Confidence: 0.85
```

---

## 阶段 7：归档

> 对应原 Archiver（introspection-trace.feature.md + persistent-memory.feature.md）

### 7.1 知识蒸馏

gate 通过后：

1. 从 `.design.md` 提取设计模式 → 存入 `.devkit/archive/patterns/`
2. 从 `.plan.md` 提取决策理由 → 存入 `.devkit/archive/decisions/`
3. 从 `.verify.md` + `.gate.md` 提取经验 → 存入 `.devkit/archive/knowledge/`
4. 记录任务轨迹到 `.devkit/archive/traces/`（输入/步骤/错误/输出/耗时）

### 7.2 记忆更新

在每个 Agent 的 `MEMORY.md` 追加关键经验：

- **decision** — 重要设计决策及理由
- **convention** — 代码风格约定
- **fix** — 已知修复模式

自动去重（相同 category + content 不重复追加）。

### 7.3 清理

- 标记 feature 状态为 archived
- 运行状态文件保留在 .devkit/ 中

---

## 崩溃恢复

如果会话中断，下次启动时：

1. 读取 `.devkit/handoff.md` 判断当前阶段
2. 如果 `status: running` 且 `to: validator` → 从验证阶段恢复
3. 如果 `status: dispatched` 且 `to: developer` → 从实现阶段恢复
4. 所有状态已持久化到文件，无数据丢失风险

---

## MCP 工具

以下 MCP 工具由 herness MCP Server 提供，Agent 在需要时调用：

| 工具名 | 用途 |
|--------|------|
| `herness_verify` | 执行三层并行验证，返回验证报告 |
| `herness_safety_checkpoint` | 创建文件快照 |
| `herness_safety_rollback` | 回滚到快照 |
| `herness_safety_trash` | 软删除文件 |
| `herness_state_read` | 读取 .devkit/ 状态 |
| `herness_state_write` | 写入 .devkit/ 状态 |
| `herness_archive_save` | 保存知识卡片 |
| `herness_archive_search` | 搜索知识卡片 |
| `herness_memory_read` | 读取 Agent 持久记忆 |
| `herness_memory_append` | 追加 Agent 记忆 |
| `herness_trace_save` | 保存任务轨迹 |
| `herness_trace_search` | 搜索相似轨迹 |

---

## 特性清理

当用户需要清理时，支持以下操作：

| 场景 | 操作 |
|------|------|
| Feature 完成 | gate 通过 → 知识蒸馏到 archive → 标记 archived |
| 中途放弃 | 用户说"不做了" → 移入 `.devkit/trash/` → 7 天后自动清除 |
| 手动清理 | `rm -rf features/<name>/` 直接删除（文件系统可见） |

---

## 安全检查表

在每次进入下一阶段前，检查以下安全约束：

- 代码是否写在了限定目录？（features/<name>/）
- 是否有密钥硬编码？（secret scan）
- 是否有 `eval` / `child_process.exec` 等危险调用？（injection check）
- 是否有 `any` 类型？（硬性门槛）
- 是否有 TODO 注释？（硬性门槛）
