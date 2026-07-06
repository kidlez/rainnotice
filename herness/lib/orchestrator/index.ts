import { HandoffStore, ContextStore } from '../store'
import type { AgentId, HandoffState, OrchestratorConfig, AgentPermission, GuardReport } from '../../shared/types'
import { ensureDir } from '../../shared/utils/path'
import { Guard } from '../guard'
import * as path from 'path'
import * as fs from 'fs'

const FLOW: AgentId[] = ['planner', 'designer', 'developer', 'validator']

function parseFeatureMeta(content: string): { name: string; status: string } {
  const nameMatch = content.match(/^#\s+Feature:\s+(.+)/m)
  const statusMatch = content.match(/-\s*\S*\s*状态:\s*(\S+)/)
  return {
    name: nameMatch?.[1] ?? 'unknown',
    status: statusMatch?.[1] ?? 'unknown',
  }
}

function parseTasks(content: string): Array<{ id: string; done: boolean }> {
  const tasks: Array<{ id: string; done: boolean }> = []
  const regex = /-\s+\[([ x])\]\s+(TASK-\S+):/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(content)) !== null) {
    tasks.push({ id: m[2], done: m[1] === 'x' })
  }
  return tasks
}

export class Orchestrator {
  private config: OrchestratorConfig
  private handoffStore: HandoffStore
  private contextStore: ContextStore
  private guard: Guard

  constructor(config: OrchestratorConfig) {
    this.config = config
    const devkitPath = path.resolve(config.rootDir, config.devkitDir)
    this.handoffStore = new HandoffStore(devkitPath)
    this.contextStore = new ContextStore(devkitPath)
    const permissions = Guard.createDefaults(config.rootDir, config.devkitDir)
    this.guard = new Guard(permissions)
  }

  getGuard(): Guard {
    return this.guard
  }

  async start(): Promise<void> {
    try {
      const existing = await this.handoffStore.read()
      if (existing && existing.status !== 'completed') {
        await this.resume(existing)
      } else {
        await this.runFlow('main')
      }
      await this.generateReport()
      const reportDir = path.resolve(this.config.rootDir, this.config.devkitDir)
      const guardReport = this.guard.report()
      if (!guardReport.allClean) {
        const violationLines = guardReport.violations.map(v =>
          `[${v.agentId}] ${v.operation} on "${v.target}": ${v.reason}`
        )
        const guardLog = `# Guard Violations\n\n${violationLines.map(l => `- ${l}`).join('\n')}\n`
        fs.writeFileSync(path.join(reportDir, 'guard-report.md'), guardLog, 'utf-8')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await this.handoffStore.write({
        from: 'orchestrator',
        to: 'orchestrator',
        timestamp: new Date().toISOString(),
        status: 'failed',
        task_id: '',
        feature_id: '',
        payload: {},
        error: message,
      })
    }
  }

  private async runFlow(taskId: string): Promise<void> {
    for (const agent of FLOW) {
      await this.dispatch(agent, taskId)
      const result = await this.waitFor(agent)
      if (result.status === 'failed') {
        return
      }
    }
  }

  private async resume(state: HandoffState): Promise<void> {
    const idx = FLOW.indexOf(state.to)
    if (idx === -1) return
    const startIdx = state.status === 'completed' ? idx + 1 : idx
    for (let i = startIdx; i < FLOW.length; i++) {
      await this.dispatch(FLOW[i], state.task_id)
      const result = await this.waitFor(FLOW[i])
      if (result.status === 'failed') {
        return
      }
    }
  }

  async dispatch(agentId: AgentId, taskId: string): Promise<void> {
    await this.handoffStore.write({
      from: 'orchestrator',
      to: agentId,
      timestamp: new Date().toISOString(),
      status: 'dispatched',
      task_id: taskId,
      feature_id: '',
      payload: {},
    })
  }

  async waitFor(agentId: AgentId): Promise<HandoffState> {
    while (true) {
      const state = await this.handoffStore.read()
      if (!state) {
        throw new Error(`No handoff state found for agent ${agentId}`)
      }
      if (state.to !== agentId) {
        throw new Error(`Expected handoff for ${agentId}, got ${state.to}`)
      }
      if (state.status === 'completed' || state.status === 'failed') {
        return state
      }
      await new Promise(r => setTimeout(r, 500))
    }
  }

  async getProgress(): Promise<{ current: string; completed: string[]; pending: string[] }> {
    const completed: AgentId[] = []
    const pending: AgentId[] = []
    for (const agent of FLOW) {
      try {
        const ctx = await this.contextStore.read(agent)
        if (ctx) {
          completed.push(agent)
        } else {
          pending.push(agent)
        }
      } catch {
        pending.push(agent)
      }
    }
    const current = pending.length > 0 ? pending[0] : 'completed'
    return { current, completed, pending }
  }

  async generateReport(): Promise<string> {
    const reportDir = path.resolve(this.config.rootDir, this.config.devkitDir)
    ensureDir(reportDir)

    const lines: string[] = [
      '# Feature Development Report',
      '',
      `**Generated:** ${new Date().toISOString()}`,
      '',
      '---',
      '',
      '## Feature Status',
      '',
    ]

    for (const featurePath of this.config.features) {
      const fullPath = path.resolve(this.config.rootDir, featurePath)
      try {
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8')
          const meta = parseFeatureMeta(content)
          lines.push(`- **${meta.name}** — status: \`${meta.status}\``)
        } else {
          lines.push(`- ${featurePath} — *file not found*`)
        }
      } catch {
        lines.push(`- ${featurePath} — *error reading*`)
      }
    }

    lines.push('', '---', '', '## Agent Progress', '')
    lines.push('| Agent | Status |')
    lines.push('|-------|--------|')

    const { current, completed, pending } = await this.getProgress()

    for (const agent of FLOW) {
      if (completed.includes(agent)) {
        lines.push(`| ${agent} | ✅ completed |`)
      } else if (agent === current) {
        lines.push(`| ${agent} | 🔄 in progress |`)
      } else {
        lines.push(`| ${agent} | ⏳ pending |`)
      }
    }

    lines.push('', '---', '', '## Task Completion', '')

    for (const featurePath of this.config.features) {
      const fullPath = path.resolve(this.config.rootDir, featurePath)
      try {
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8')
          const meta = parseFeatureMeta(content)
          const tasks = parseTasks(content)
          if (tasks.length > 0) {
            lines.push(`### ${meta.name}`, '')
            lines.push('| Task | Status |')
            lines.push('|------|--------|')
            for (const t of tasks) {
              lines.push(`| ${t.id} | ${t.done ? '✅ done' : '⬜ pending'} |`)
            }
            lines.push('')
          }
        }
      } catch {
        // skip
      }
    }

    const blockers = pending.filter(a => !completed.includes(a))
    if (blockers.length > 0) {
      lines.push('---', '', '## Blockers', '')
      for (const agent of blockers) {
        lines.push(`- Agent **${agent}** has not yet completed`)
      }
    }

    lines.push('')
    const report = lines.join('\n')
    this.guard.assertWrite('orchestrator', path.join(reportDir, 'report.md'))
    fs.writeFileSync(path.join(reportDir, 'report.md'), report, 'utf-8')
    return report
  }
}
