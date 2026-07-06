# Feature: worktree-isolation

## 元数据
- 状态: designed
- 依赖: safety-layer
- 优先级: P1

## 需求描述
Git Worktree 隔离：每个 Agent 操作前创建独立 worktree，提供完整文件系统隔离。操作完成后自动合并或丢弃。防止并行 Agent 的文件冲突。

## 验收标准
- [ ] herness worktree create <feature> [agent] 创建隔离 worktree
- [ ] herness worktree list 列出所有 worktree
- [ ] herness worktree cleanup <id> 清理指定 worktree
- [ ] Developer.generateCodeInWorktree 自动创建→执行→合并/丢弃
- [ ] WorktreeManager.createIsolatedAgent 自动完整周期
- [ ] 每个 worktree 自动创建 git branch（herness/<agent>/<feature>-<timestamp>）
- [ ] 非 git 仓库调用时给出明确错误

## 设计决策
- worktree 目录：.herness-worktrees/<id>/
- branch 命名：herness/<agentId>/<feature>-<timestamp>
- 自动周期：create → execute → success? merge : discard → cleanup
- 状态持久化到 manifest JSON（即使进程崩溃也可手动清理）

## 任务清单
- [ ] TASK-001: 实现 WorktreeManager（create/merge/cleanup/list） (developer)
- [ ] TASK-002: 集成到 Developer.generateCodeInWorktree (developer)
- [ ] TASK-003: CLI worktree 子命令（list/create/cleanup） (developer)

## 变更日志
- 2026-07-06: 创建文档，状态 designed
