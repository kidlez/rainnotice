import * as fs from 'fs'
import * as path from 'path'
import { AgentProgress, AgentId } from '../../shared/types'

const ALL_AGENTS: AgentId[] = [
  'planner', 'designer', 'developer', 'validator', 'reflector',
]

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

function statusIcon(status: string): string {
  switch (status) {
    case 'completed': return '✓'
    case 'failed': return '✗'
    case 'aborted': return '⊘'
    case 'running': return '⟳'
    default: return '○'
  }
}

export class SessionMonitor {
  constructor(private devkitDir: string) {}

  getProgress(): AgentProgress[] {
    const contextDir = path.join(this.devkitDir, 'context')
    const progress: AgentProgress[] = []

    for (const agentId of ALL_AGENTS) {
      const agentContextDir = path.join(contextDir, agentId)
      const p: AgentProgress = {
        agentId,
        status: 'idle',
        durationMs: 0,
        checks: {},
        subAgents: [],
      }

      if (fs.existsSync(agentContextDir)) {
        const files = fs.readdirSync(agentContextDir).filter(f => f.endsWith('.json'))
        if (files.length > 0) {
          const latest = files[files.length - 1]
          const stat = fs.statSync(path.join(agentContextDir, latest))
          try {
            const data = JSON.parse(fs.readFileSync(path.join(agentContextDir, latest), 'utf-8'))
            p.status = data.status || 'completed'
            p.startedAt = data.startedAt
            p.completedAt = data.completedAt
            p.durationMs = data.durationMs || (Date.now() - stat.birthtimeMs)
            p.checks = data.checks || {}
            p.subAgents = data.subAgents || []
          } catch {
            p.status = 'completed'
            p.durationMs = Date.now() - stat.birthtimeMs
          }
        }
      }

      const handoffPath = path.join(this.devkitDir, 'handoff.md')
      if (fs.existsSync(handoffPath)) {
        const content = fs.readFileSync(handoffPath, 'utf-8')
        if (content.includes(`to: ${agentId}`) && content.includes('dispatched')) {
          if (p.status === 'idle') p.status = 'running'
        }
      }

      progress.push(p)
    }

    return progress
  }

  summary(): string {
    const progress = this.getProgress()
    const lines: string[] = [
      '┌─ Session Monitor ──────────────────────────────────────┐',
    ]

    for (const p of progress) {
      const icon = statusIcon(p.status)
      const name = p.agentId.padEnd(14)
      const status = p.status.padEnd(10)
      const time = formatDuration(p.durationMs)
      const checkEntries = Object.entries(p.checks)
      const checkStr = checkEntries.length > 0
        ? '  checks: ' + checkEntries.map(([k, v]) => `${k}=${v}`).join(', ')
        : ''

      lines.push(`│ ${icon} ${name} ${status} ${time.padStart(8)}${checkStr}`)
    }

    const completed = progress.filter(p => p.status === 'completed').length
    const total = progress.length
    lines.push('├────────────────────────────────────────────────────────┤')
    lines.push(`│ Total: ${completed}/${total} completed                         │`)
    lines.push('└────────────────────────────────────────────────────────┘')

    return lines.join('\n')
  }

  watch(intervalMs: number = 2000): () => void {
    let running = true
    const tick = () => {
      if (!running) return
      console.clear()
      console.log(this.summary())
      if (running) setTimeout(tick, intervalMs)
    }
    tick()
    return () => { running = false }
  }
}
