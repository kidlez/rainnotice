# Feature: validator-agent

## 元数据
- 状态: designed
- 依赖: orchestrator-core, designer-agent
- 优先级: P0

## 需求描述
三 Agent 并行验证管线 + 熔断机制 + 模型分层：
- FunctionalVerifier：单元测试、功能测试、回归测试、AC 覆盖
- StandardsVerifier：编译、类型检查、lint、设计覆盖、代码规范
- SecurityVerifier：密钥扫描、依赖审计、注入检测、权限检查
- 并行执行，任一 Agent 发现致命问题立即熔断其他
- 按需分层：light（快速）/ standard（标准）/ deep（深度）

## 验收标准
- [ ] 三个 Verifier 并行执行，互不阻塞
- [ ] 熔断机制：critical 发现时 abort 其他 Agent
- [ ] 3 次连续 critical 触发断路，5 分钟后自动复位
- [ ] light 模式只跑基础检查（compile + typecheck + code_style + unit_test）
- [ ] standard/deep 模式全量检查
- [ ] 每个检查项标记 severity（info/warning/critical）
- [ ] 被 abort 的 Agent 结果标记 aborted: true + 原因记录

## 设计决策
- AbortController 原生支持，兼容 Node.js 内置
- 断路器阈值 3 次，窗口 5 分钟（防止无限重试）
- light 模式用于 CI 快速反馈，deep 模式用于发布前审查
- security 的 key leak 和 injection 定为 critical（不可绕过）

## 任务清单
- [ ] TASK-001: 实现 FunctionalVerifier（单元+功能+回归+AC） (developer)
- [ ] TASK-002: 实现 StandardsVerifier（编译+类型+lint+设计覆盖） (developer)
- [ ] TASK-003: 实现 SecurityVerifier（密钥+依赖+注入+权限） (developer)
- [ ] TASK-004: 实现 Validator 并行编排器 + AbortController 熔断 (developer)
- [ ] TASK-005: 实现 CircuitBreaker 状态机 (developer)
- [ ] TASK-006: 实现 Tier 分层配置 (developer)

## 变更日志
- 2026-07-05: 创建文档，状态 designed
- 2026-07-05: 重构为三 Agent 并行管线
- 2026-07-05: 新增熔断机制 + 模型分层
