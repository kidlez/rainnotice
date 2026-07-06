# Herness 使用指南

## 安装

```bash
git clone <herness-repo>
cd herness
npm install && npm run build
npm link        # 全局安装 herness 命令
```

## 命令行使用（任意项目目录）

```bash
cd my-project

herness init                     # 创建 features/ .devkit/ herness.json AGENTS.md
herness new user-auth             # 创建 features/user-auth.feature.md
herness new payment               # 创建 features/payment.feature.md
herness plan user-auth            # 任务拆解
herness verify user-auth --tier light   # 快速验证（compile + typecheck + code_style）
herness verify user-auth --tier deep    # 深度验证（全量 + 安全审计）
herness status                    # 项目总览
```

## 项目目录结构（由 herness init 创建）

```
my-project/
├── features/               # Feature 文档（herness new 创建）
│   ├── user-auth.feature.md
│   └── payment.feature.md
├── .devkit/                # 运行状态（不提交）
│   ├── context/            # Agent 上下文
│   └── archive/            # 知识 + 轨迹
├── herness.json            # 框架配置
└── AGENTS.md               # 项目规则
```

## API 使用（编程方式）

同现有文档。

## 快速开始

```ts
import { Orchestrator } from './lib/orchestrator'
import { Planner } from './lib/planner'
import { Designer } from './lib/designer'
import { Developer } from './lib/executor'
import { Validator } from './lib/validator'
import { Reflector } from './lib/reflector'
import { HandoffStore, ContextStore, ArchiveStore, TraceStore } from './lib/store'
import type { OrchestratorConfig, TaskTrace } from './shared/types'
```

---

## 方式一：全自动编排

```ts
const config: OrchestratorConfig = {
  rootDir: '.',
  devkitDir: '.devkit',
  agents: {
    orchestrator: { enabled: true },
    planner: { enabled: true },
    designer: { enabled: true },
    developer: { enabled: true },
    validator: { enabled: true },
    documenter: { enabled: false },
    archiver: { enabled: false },
    reflector: { enabled: true },
  },
  features: [
    'features/my-feature.feature.md',
  ],
}

const orch = new Orchestrator(config)
// Guard 由 Orchestrator 内部创建，可通过 getGuard() 获取后注入其他 Agent:
const guard = orch.getGuard()
const developer = new Developer('features', guard)
const validator = new Validator('features', guard)
const planner = new Planner('features', guard)

await orch.start()
// 顺序执行: planner → designer → developer → validator
// 生成报告: .devkit/report.md + .devkit/guard-report.md（如有越权）
// 支持崩溃恢复: 启动时检测 handoff.md 状态
```

---

## 方式二：组件独立使用

### 1. 创建 Feature 文档

```bash
# 按模板创建
cp templates/feature.template.md features/my-feature.feature.md
```

文档内容示例：

```markdown
# Feature: user-auth

## 元数据
- 状态: draft
- 依赖: 无
- 优先级: P0

## 需求描述
实现用户登录认证功能

## 验收标准
- [ ] 用户能用邮箱+密码登录
- [ ] 登录失败返回错误信息
- [ ] 登录成功返回 token
```

### 2. Planner — 拆解任务

```ts
const planner = new Planner('features')
const tasks = await planner.decompose('my-feature.feature.md')
// [
//   { id: 'TASK-001', description: '用户能用邮箱+密码登录', priority: 'P0', size: 'M', ... },
//   { id: 'TASK-002', description: '登录失败返回错误信息', priority: 'P0', size: 'S', ... },
//   { id: 'TASK-003', description: '登录成功返回 token', priority: 'P0', size: 'S', ... },
//   { id: 'TASK-004', description: 'Verify all acceptance criteria', priority: 'P1', size: 'M', depends_on: ['TASK-001', 'TASK-002', 'TASK-003'], ... },
// ]

// 依赖图
const deps = await planner.buildDependencyGraph(tasks)
// [{ taskId: 'TASK-001', dependsOn: [] }, { taskId: 'TASK-004', dependsOn: ['TASK-001', 'TASK-002', 'TASK-003'] }]

// 按优先级排序
const sorted = await planner.sortByPriority(tasks)

// 记录执行偏差（事后）
planner.recordDeviation('TASK-001', 'M', 'L', 6.5)
planner.recordDeviation('TASK-002', 'S', 'S', 0.3)
planner.recordDeviation('TASK-003', 'S', 'M', 3.0)
await planner.evolveIfReady()
// 偏差 ≥3 条 → EMA 修正权重 → 下次预估更准
```

### 3. Designer — 交互式设计访谈

**不是一次生成，是逐条问、逐条确认：**

```ts
const designer = new Designer('features')
const tasks = await planner.decompose('my-feature.feature.md')

// 第 1 轮：启动访谈，生成初始问题
const openQuestions = await designer.startInterview('my-feature.feature.md', tasks)
openQuestions.forEach(q => {
  console.log(`[${q.category}] ${q.question}`)
  console.log(`  背景: ${q.context}`)
})

// Q-001: [scope] "user-auth" 的核心功能是什么？请用一句话描述。
// Q-002: [scope] 哪些功能明确不在本期范围内？
// Q-003: [scope] 这个功能的直接用户是谁？
// Q-004: [data_model] 系统需要处理哪些核心实体？...
// Q-005: [data_model] 每个实体有哪些必须字段？...
// ...共约 24 个问题覆盖 8 个类别

// 第 1 轮：用户逐条回答
const more = designer.answerQuestion('Q-001', '用户通过邮箱和密码登录，登录后获得 JWT token')
// → Designer 分析回答中没有触发跨类别追问
const still = designer.answerQuestion('Q-004', '核心实体是 User（用户）和 Session（会话），一对多关系')
// → Designer 检测到"会话"→ 自动追问并发和数据一致性

// 第 2 轮：推进到下一轮
const round2 = designer.goToNextRound()
// 上一轮所有问题回答完毕 → 深入追问每个关键类别
// Q-Dxxx: [data_model] 数据的生命周期是什么？（创建→修改→删除→归档）
// Q-Dxxx: [interface] 接口的幂等性需要保证吗？
// ...

const { ready, missingCategories } = designer.isReadyToFinalize()
// { ready: true, missingCategories: [] }  → 5 个关键类别全部覆盖

// 最终化
const artifacts = await designer.finalize()
// artifacts.designDoc   → 包含完整 Q&A 追溯的设计文档
// artifacts.types       → 从数据模型回答推断的 TypeScript 类型
// artifacts.interview   → 所有问答记录（保留审计）
```

**8 个访谈类别：**

| 类别 | 是否关键 | 典型问题 |
|------|----------|----------|
| scope | 关键 | 核心功能是什么？排除项？用户是谁？ |
| data_model | 关键 | 核心实体？关系？必须字段？存储方式？ |
| interface | 关键 | 输入输出？错误码？鉴权模型？ |
| user_flow | 关键 | 完整操作步骤？异常流程？多用户交互？ |
| edge_cases | 关键 | 空数据？并发？依赖降级？隐含假设？ |
| non_functional | 非关键 | 性能？安全？兼容性？ |
| constraints | 非关键 | 技术栈限制？时间节点？团队能力？ |
| integration | 非关键 | 外部系统？SLA？数据格式转换？ |

**执行流程在 AI 中的体现：**

```
"根据 features/user-auth.feature.md 启动设计访谈"
→ Designer.startInterview()   → 24 个初始问题
→ AI 逐条展示给用户

"第 1 题：登录错误后怎么提示用户？[interface 类别]"
→ 用户："返回统一错误码，前端做国际化映射"

"明白，我记录一下。另外你提到了'国际化'，这个需要走什么流程？"
→ Designer 自动触发追问 → Q-Fxxx: [constraints] 代码需要支持国际化吗？

"回答第 15 题..."
→ Designer.answerQuestion('Q-015', answer)

"所有 5 个关键类别已覆盖，可以生成设计文档了"
→ Designer.finalize() → 含 Q&A 追溯的完整设计文档
```

### 4. Developer — 生成代码 + 测试文件

```ts
const developer = new Developer('features')

// generateCode 现在接受 testPlan
const result = await designer.finalize()
const files = await developer.generateCode({
  featureName: result.interview.featureName,
  types: result.types,
  modules: result.modules,
  interfaces: result.interfaces,
  testPlan: result.testPlan,  // 自动生成测试文件
})
// 产出:
//   features/user-auth/src/types.ts
//   features/user-auth/src/index.ts
//   features/user-auth/index.ts
//   features/user-auth/__tests__/user-auth.test.ts         ← 单元测试 (GIVEN-WHEN-THEN)
//   features/user-auth/__tests__/user-auth.func.test.ts    ← 功能测试 (AC 覆盖)

await developer.createFile('user-auth', 'src/auth.ts', 'export class Auth { ... }')
```

### 5. Validator — 三 Agent 并行验证 + 熔断

```ts
const validator = new Validator('features')

// ===== 模式选择 =====
// 'light'  — CI 快速反馈（compile + typecheck + code_style + unit_test）
// 'standard' — 标准检查（全量）★默认
// 'deep' — 发布前审查（全量 + 增强检测）

const report = await validator.validate('user-auth', testPlan, designArtifacts, 'standard')
// {
//   passed: false,
//   results: [
//     {
//       type: 'functional',
//       severity: 'warning',
//       checks: { unit_test: 'passed', functional_test: 'failed', ... },
//       failures: [{ check: 'functional_test', detail: '...', severity: 'warning' }],
//       aborted: false,
//     },
//     {
//       type: 'security',
//       severity: 'critical',          // 发现密钥泄露
//       checks: { secret_scan: 'failed', ... },
//       failures: [
//         { check: 'secret_scan', detail: 'auth.ts:AWS Key (1 occurrence)', severity: 'critical' },
//       ],
//       aborted: false,
//     },
//     {
//       type: 'standards',
//       severity: 'info',
//       checks: { compile: 'passed', typecheck: 'passed', ... },
//       failures: [],
//       aborted: true,                   // 被 security 的 critical 触发熔断
//     },
//   ],
//   circuitBreaker: {
//     tripped: false,
//     tripReason: '',
//     failureCount: 1,      // 累计 1 次 critical
//     threshold: 3,          // 3 次触发断路
//     resetAfterMs: 300000,  // 5 分钟后自动复位
//   },
//   summary: 'functional: 1 failed | security: 1 failed | standards [ABORTED]: OK | regression: skipped',
// }

// ===== 熔断流程 =====
// security 发现 AWS Key → severity: 'critical'
// → Validator abort() 触发 → standards 收到 signal → 提前终止 → aborted: true
// → functional 继续执行完成（独立任务不受影响）
// → 3 次连续 critical → breaker.tripped = true → 拒绝所有新请求 → 5 分钟后复位

// ===== 断路器状态 =====
const breaker = validator.getBreakerState()
if (breaker.tripped) {
  console.log(`熔断中：${breaker.tripReason}`)
  // 等待冷却 → validator.resetBreaker() 手动复位
}

---

### 6. VictoryGate — 胜利门禁（防过早宣布胜利）

Validator 全部通过 ≠ 真正完成。VictoryGate 做多维审查：

```ts
import { VictoryGate } from './lib/victory-gate'

const gate = new VictoryGate('features')

const verdict = await gate.evaluate(
  'user-auth',           // feature 名称
  designArtifacts,       // Designer 产出的完整设计
  report,                // Validator 的验证报告
  testPlan,              // TestPlan
)

// {
//   passed: false,
//   stage: 'attempt 2/3',
//   acVerifications: [
//     { acIndex: 1, acText: '用户能用邮箱+密码登录', status: 'verified', evidence: '...' },
//     { acIndex: 2, acText: '登录失败返回错误信息', status: 'disputed', gaps: ['no test references'] },
//   ],
//   criticQuestions: [
//     { id: 'CR-001', category: 'edge_case', question: '并发请求时数据一致性是否保证？', assessment: 'failed', detail: '未检测到 null guard 或错误处理' },
//     { id: 'CR-005', category: 'assumption', question: '有没有硬编码应改成配置的？', assessment: 'flagged', detail: '代码中包含硬编码字符串' },
//   ],
//   designCoverage: { totalSections: 6, covered: 5, missing: ['接口契约'] },
//   minimumBarResults: [
//     { rule: 'no_todo_in_src', satisfied: false },
//     { rule: 'no_any_type_leak', satisfied: false },
//   ],
//   blockingIssues: [
//     'AC not verified: "登录失败返回错误信息"',
//     '[edge_case] 并发请求时数据一致性是否保证？',
//     '[correctness] 类型定义包含 "any" — 需要更具体的类型',
//     'Minimum bar failed: no_todo_in_src',
//     'Minimum bar failed: no_any_type_leak',
//   ],
//   retryHints: [
//     'AC not verified: ... → 为该 AC 添加测试用例并重新验证',
//     'Minimum bar failed: no_any_type_leak → 将 "any" 替换为具体类型',
//     'Minimum bar failed: no_todo_in_src → 完成或移除 TODO 注释',
//   ],
//   confidence: 62,
// }

// 未通过 → 按 retryHints 修复 → 重新验证 → 重新 evaluate
if (!verdict.passed && gate.getRetryCount() < 3) {
  // 修复...重新验证...再测
  const round2 = await gate.evaluate('user-auth', designArtifacts, newReport, testPlan)
}

// 3 次后仍不通过 → 强制人工介入
if (!verdict.passed && gate.getRetryCount() >= 3) {
  console.log('达到最大重试次数，需人工审查:', verdict.blockingIssues)
}
```

**VictoryGate 审查层次：**

| 层次 | 检查 | 如果失败 |
|------|------|---------|
| AC 逐条 | 每个验收标准有测试+代码 | blocking issue |
| 设计覆盖 | 设计文档每章有对应实现 | blocking issue |
| Critic 20 题 | completeness/correctness/edge_case/spec_gap/assumption | failed → blocking, flagged → 警告 |
| 边缘探针 | 按 feature 类型定向探问 | 信息，不拦截 |
| 硬性门槛 | no_todo / no_any / tests_exist / imports_ok | blocking issue |

**与 Reflector 的协作：**

```
Validor pass → VictoryGate.evaluate()
  ↓ passed → 真正完成
  ↓ failed → blockingIssues → Reflector.reflect()
    → 诊断 → 修复建议 → Developer 修复 → Validator → VictoryGate
    → 3 次后仍 failure → 停止，人工介入
```

```ts
const traceStore = new TraceStore('.devkit')
const reflector = new Reflector('features', traceStore)

if (!report.passed) {
  const input = {
    featureName: 'user-auth',
    failedChecks: report.failures.map(f => f.check),
    errorDetails: report.failures.map(f => f.detail),
    designDoc: design.designDoc,
    taskDescription: '实现用户登录认证功能',
  }

  const reflection = await reflector.reflect(input)
  // {
  //   diagnosis: '## Reflection Analysis\n\n### Error Summary\n- **Type Error**: 2 occurrences...',
  //   rootCause: 'Type definition drift — 2 type error(s) indicate...',
  //   suggestedFixes: [
  //     { file: 'user-auth/src/types.ts', description: 'Check type definitions...', confidence: 'medium' },
  //     { file: 'user-auth/package.json', description: 'Install missing...', confidence: 'high' },
  //   ],
  //   retryRecommended: true,
  //   lessons: ['Type definitions need better alignment with the design spec...'],
  // }

  if (reflection.retryRecommended) {
    // 按 suggestedFixes 修复代码，然后重新验证
  }
}
```

---

## 方式四：轨迹记录与经验复用

```ts
const traceStore = new TraceStore('.devkit')

// 任务完成后记录轨迹
const trace: TaskTrace = {
  taskId: 'TASK-001',
  featureId: 'user-auth',
  input: '实现用户可用邮箱+密码登录',
  steps: [
    '创建 types.ts 定义 AuthService 接口',
    '实现 auth.ts 登录逻辑',
    '运行编译检查 — 失败：缺少 @types/bcrypt',
    '添加 @types/bcrypt — 重新编译通过',
  ],
  errors: [
    { message: 'Cannot find module "bcrypt"', fix: 'npm install --save-dev @types/bcrypt' },
  ],
  output: 'features/user-auth/src/auth.ts',
  durationMs: 360000,
  timestamp: new Date().toISOString(),
  similarityTags: ['auth', 'login', 'password', 'bcrypt', 'types'],
}

await traceStore.save(trace)

// 后续新任务：查找相似经验
const keywords = await traceStore.extractKeywords('实现用户注册，需要密码加密和类型定义')
// ['user', 'register', 'password', 'encryption', 'type', 'definition']

const similar = await traceStore.findSimilar(keywords, 3)
// 返回之前 auth 任务的轨迹 → 复用 fix 经验
```

---

## 方式五：状态持久化（崩溃恢复）

```ts
const handoffStore = new HandoffStore('.devkit')
const contextStore = new ContextStore('.devkit')

// Orchestrator 每次 dispatch 写入 handoff
await handoffStore.write({
  from: 'orchestrator',
  to: 'developer',
  timestamp: new Date().toISOString(),
  status: 'dispatched',
  task_id: 'TASK-001',
  feature_id: 'user-auth',
  payload: {},
})

// 崩溃后重启 → Orchestrator.start() 自动检测
const state = await handoffStore.read()
// state.status === 'dispatched' → 从 developer 阶段恢复

// Agent 各自的上下文
await contextStore.save('developer', 'state', { currentTask: 'TASK-001' })
await contextStore.save('validator', 'report', report)
```

---

## 完整一次开发流程

```
1. 写 Feature 文档              → features/xxx.feature.md
2. planner.decompose()          → 任务列表
3. designer.startInterview()    → 24 个初始问题（多轮交互）
   designer.generateTestPlan()  → TestPlan（测试前置设计）
   designer.finalize()          → 含 Q&A 追溯 + 测试计划的设计文档
4. developer.generateCode()     → src/*.ts + __tests__/*.test.ts（含测试文件）
5. validator.validate()         → compile + typecheck + unit_test + functional_test + regression
   ↓ 通过
6. victoryGate.evaluate()       → AC逐条 + 设计覆盖 + Critic审查 + 硬性门槛
   ↓ 未通过
7. reflector.reflect()          → 诊断 + 修复建议
   ↓ retry
8. 修复 → 回到 5 → 6
   ↓ 通过
9. traceStore.save()            → 记录轨迹
10. planner.recordDeviation()    → 记录偏差
11. planner.evolveIfReady()     → 策略进化
```

`tsc --noEmit` 零错误，所有模块可独立使用、可组合编排。
