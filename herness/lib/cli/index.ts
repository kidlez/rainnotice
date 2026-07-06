import * as path from 'path'
import * as fs from 'fs'
import { ensureDir } from '../../shared/utils/path'
import { Planner } from '../planner'
import { Validator } from '../validator'
import { VictoryGate } from '../victory-gate'
import { SessionMonitor } from '../monitor'
import { WorktreeManager } from '../isolation/worktree'
import { PlantUMLAgent } from '../plantuml'
import type { AgentId, OrchestratorConfig, VerificationTier, Task } from '../../shared/types'

const AGENT_DEFAULTS: Record<AgentId, { enabled: boolean }> = {
  orchestrator: { enabled: true }, planner: { enabled: true }, designer: { enabled: true },
  developer: { enabled: true }, validator: { enabled: true }, documenter: { enabled: false },
  archiver: { enabled: false }, reflector: { enabled: true },
}

function detectRoot(cwd: string): string {
  let dir = path.resolve(cwd)
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'herness.json'))) return dir
    if (fs.existsSync(path.join(dir, 'features'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return path.resolve(cwd)
}

function loadConfig(rootDir: string): OrchestratorConfig {
  const configPath = path.join(rootDir, 'herness.json')
  if (fs.existsSync(configPath)) {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    return {
      rootDir,
      devkitDir: raw.devkitDir || '.devkit',
      agents: { ...AGENT_DEFAULTS, ...(raw.agents || {}) },
      features: raw.features || [],
    }
  }
  const features: string[] = []
  const featDir = path.join(rootDir, 'features')
  if (fs.existsSync(featDir)) {
    for (const f of fs.readdirSync(featDir).filter(f => f.endsWith('.feature.md'))) {
      features.push(`features/${f}`)
    }
  }
  return { rootDir, devkitDir: '.devkit', agents: AGENT_DEFAULTS, features }
}

function parseArgs(argv: string[]): { command: string; args: string[]; flags: Record<string, string> } {
  const cmd = argv[0] || 'help'
  const args: string[] = []
  const flags: Record<string, string> = {}
  let i = 1
  while (i < argv.length) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      if (eq !== -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1)
      } else {
        flags[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'
      }
    } else if (a.startsWith('-')) {
      flags[a.slice(1)] = argv[i + 1] && !argv[i + 1].startsWith('-') ? argv[++i] : 'true'
    } else {
      args.push(a)
    }
    i++
  }
  return { command: cmd, args, flags }
}

function printDivider(title: string): void {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log(`${'─'.repeat(60)}\n`)
}

function toShortPlan(tasks: Task[]): string {
  return tasks.map((t: Task) => {
    const deps = t.depends_on.length ? ` (→ ${t.depends_on.join(', ')})` : ''
    return `  ${t.id} [${t.priority}][${t.size}] ${t.description.slice(0, 50)}${deps}`
  }).join('\n')
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export async function main(argv: string[]): Promise<void> {
  const { command, args, flags } = parseArgs(argv)
  const cwd = process.cwd()
  const rootDir = detectRoot(cwd)

  switch (command) {
    case 'init': {
      console.log(`Initializing herness in ${rootDir}`)
      const dirs = ['features', '.devkit/context', '.devkit/archive/traces', '.devkit/archive/knowledge', '.devkit/archive/patterns', '.devkit/archive/decisions']
      for (const d of dirs) {
        const full = path.join(rootDir, d)
        if (!fs.existsSync(full)) {
          fs.mkdirSync(full, { recursive: true })
          console.log(`  created ${d}/`)
        }
      }
      const configPath = path.join(rootDir, 'herness.json')
      if (!fs.existsSync(configPath)) {
        const config = {
          rootDir: '.',
          devkitDir: '.devkit',
          agents: {
            orchestrator: { enabled: true }, planner: { enabled: true },
            designer: { enabled: true }, developer: { enabled: true },
            validator: { enabled: true }, reflector: { enabled: true },
            documenter: { enabled: false }, archiver: { enabled: false },
          },
          features: [],
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
        console.log('  created herness.json')
      }
      const agentsPath = path.join(rootDir, 'AGENTS.md')
      if (!fs.existsSync(agentsPath)) {
        fs.writeFileSync(agentsPath, '# Herness Rules\n\nFeature 文档在 features/，状态在 .devkit/。\n', 'utf-8')
        console.log('  created AGENTS.md')
      }
      console.log('\nDone. Use `herness new <name>` to create a feature.\n')
      break
    }

    case 'new': {
      const name = args[0]
      if (!name) { console.log('Usage: herness new <feature-name>'); process.exit(1) }
      const featureDir = path.join(rootDir, 'features')
      if (!fs.existsSync(featureDir)) fs.mkdirSync(featureDir, { recursive: true })
      const featurePath = path.join(featureDir, `${name}.feature.md`)
      if (fs.existsSync(featurePath)) { console.log(`Feature "${name}" already exists.`); break }
      const template = `# Feature: ${name}\n\n## 元数据\n- 状态: draft\n- 依赖: 无\n- 优先级: P0\n\n## 需求描述\n\n\n## 验收标准\n- [ ] \n\n## 变更日志\n- ${new Date().toISOString().slice(0, 10)}: 创建文档\n`
      fs.writeFileSync(featurePath, template, 'utf-8')
      const configPath = path.join(rootDir, 'herness.json')
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        const entry = `features/${name}.feature.md`
        if (!config.features.includes(entry)) {
          config.features.push(entry)
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
        }
      }
      console.log(`Created features/${name}.feature.md`)
      break
    }

    case 'plan': {
      const name = args[0]
      if (!name) { console.log('Usage: herness plan <feature-name>'); process.exit(1) }
      const planner = new Planner(path.join(rootDir, 'features'))
      const tasks = await planner.decompose(`${name}.feature.md`)
      const sorted = await planner.sortByPriority(tasks)
      printDivider(`Task Plan: ${name}`)
      console.log(toShortPlan(sorted))
      console.log(`\n  Total: ${sorted.length} tasks\n`)
      break
    }

    case 'verify': {
      const tier = (flags.t || flags.tier || 'standard') as VerificationTier
      const name = args[0]
      const validator = new Validator(path.join(rootDir, 'features'))
      if (name) {
        printDivider(`Verify: ${name} [${tier}]`)
        const report = await validator.validate(name, undefined, undefined, tier)
        for (const r of report.results) {
          const status = r.aborted ? 'ABORTED' : r.passed ? 'PASS' : 'FAIL'
          const icon = r.aborted ? '⊘' : r.passed ? '✓' : '✗'
          console.log(`\n  ${icon} ${r.type} [${r.severity}] ${status} (${formatDuration(r.durationMs)})`)
          for (const [check, result] of Object.entries(r.checks)) {
            const mark = result === 'passed' ? '✓' : result === 'failed' ? '✗' : '−'
            console.log(`    ${mark} ${check}`)
          }
          for (const f of r.failures) {
            console.log(`      → ${f.check}: ${f.detail.slice(0, 120)}`)
          }
        }
        if (report.circuitBreaker.tripped) {
          console.log(`\n  ⚡ BREAKER TRIPPED: ${report.circuitBreaker.tripReason}`)
        }
        console.log(`\n  ${report.passed ? '✓ ALL PASSED' : '✗ FAILURES'} (${formatDuration(report.totalDurationMs)})\n`)
      } else {
        const config = loadConfig(rootDir)
        console.log(`${config.features.length} feature(s) found. Run \`herness verify <name>\` to verify one.\n`)
      }
      break
    }

    case 'gate': {
      const name = args[0]
      if (!name) { console.log('Usage: herness gate <feature-name>'); process.exit(1) }
      const featurePath = path.join(rootDir, 'features', `${name}.feature.md`)
      if (!fs.existsSync(featurePath)) { console.log(`Feature "${name}" not found.`); process.exit(1) }
      printDivider(`Victory Gate: ${name}`)
      console.log('  VictoryGate requires design artifacts and validation report.')
      console.log('  Run design and verify steps first. See docs/USAGE.md for programmatic usage.\n')
      break
    }

    case 'worktree': {
      const sub = args[0] || 'list'
      const wm = new WorktreeManager(rootDir)

      switch (sub) {
        case 'list': {
          const worktrees = await wm.list()
          if (worktrees.length === 0) {
            console.log('No worktrees.\n')
          } else {
            printDivider('Worktrees')
            for (const wt of worktrees) {
              const icon = wt.status === 'active' ? '●' : wt.status === 'merged' ? '✓' : '○'
              console.log(`  ${icon} ${wt.id}`)
              console.log(`      agent: ${wt.agentId}  feature: ${wt.featureName}`)
              console.log(`      branch: ${wt.branch}  base: ${wt.baseBranch}`)
              console.log(`      path: ${wt.worktreePath}`)
              console.log(`      status: ${wt.status}  created: ${wt.createdAt}`)
              console.log('')
            }
          }
          break
        }

        case 'create': {
          const feature = args[1]
          const agent = (args[2] || 'developer') as AgentId
          if (!feature) { console.log('Usage: herness worktree create <feature> [agent]'); break }
          const state = await wm.create(agent, feature)
          console.log(`Created worktree: ${state.id}`)
          console.log(`  Branch: ${state.branch}`)
          console.log(`  Path:   ${state.worktreePath}\n`)
          break
        }

        case 'cleanup': {
          const id = args[1]
          if (!id) { console.log('Usage: herness worktree cleanup <id>'); break }
          const worktrees = await wm.list()
          const wt = worktrees.find(w => w.id === id)
          if (!wt) { console.log(`Worktree "${id}" not found.`); break }
          const ok = await wm.cleanup(wt)
          console.log(ok ? `Cleaned up ${id}` : `Failed to clean up ${id}`)
          break
        }

        case 'cleanup-all': {
          const worktrees = await wm.listActive()
          for (const wt of worktrees) {
            const ok = await wm.cleanup(wt)
            console.log(`${ok ? '✓' : '✗'} ${wt.id}`)
          }
          console.log(`Cleaned up ${worktrees.length} worktree(s)\n`)
          break
        }

        default: {
          console.log('Usage: herness worktree <list|create|cleanup|cleanup-all>')
          break
        }
      }
      break
    }

    case 'diagram': {
      const name = args[0]
      if (!name) { console.log('Usage: herness diagram <feature> [--type class|sequence|component|usecase|activity|all]'); break }
      const typeArg = flags.type || flags.t || 'all'
      const types = typeArg === 'all'
        ? ['class', 'sequence', 'component', 'usecase', 'activity'] as any[]
        : typeArg.split(',').map(s => s.trim())

      const agent = new PlantUMLAgent(path.join(rootDir, 'features'))
      // Need design artifacts - read from .devkit
      const devkitDir = path.join(rootDir, '.devkit')
      const designPath = path.join(devkitDir, 'context', 'designer', 'artifacts.json')
      if (!fs.existsSync(designPath)) {
        console.log('No design artifacts found. Run design first.')
        break
      }
      const artifacts = JSON.parse(fs.readFileSync(designPath, 'utf-8'))
      const outputs = await agent.generate(name, artifacts, types as any)

      printDivider(`Diagrams: ${name}`)
      for (const o of outputs) {
        console.log(`  ${o.type.padEnd(12)} ${o.name}`)
        console.log(`            ${o.description}`)
        console.log(`            ${o.filePath}`)
        console.log('')
      }
      break
    }

    case 'status': {
      const watch = flags.w || flags.watch
      const devkitDir = path.join(rootDir, '.devkit')
      const monitor = new SessionMonitor(devkitDir)

      if (watch) {
        console.log('Session Monitor (Ctrl+C to stop)...')
        const stop = monitor.watch(2000)
        process.on('SIGINT', () => { stop(); process.exit(0) })
        break
      }

      console.log(monitor.summary())
      console.log('')

      const featDir = path.join(rootDir, 'features')
      const featureFiles = fs.existsSync(featDir)
        ? fs.readdirSync(featDir).filter(f => f.endsWith('.feature.md'))
        : []
      for (const fp of featureFiles) {
        const full = path.join(featDir, fp)
        const content = fs.readFileSync(full, 'utf-8')
        const nameMatch = content.match(/^#\s+Feature:\s+(.+)/m)
        const statusMatch = content.match(/-\s*\S*\s*状态:\s*(\S+)/)
        console.log(`  ${statusMatch?.[1] || 'draft'} — ${nameMatch?.[1] || fp.replace('.feature.md', '')}`)
      }
      console.log('')
      break
    }

    case 'help':
    default: {
      console.log(`
Herness — Document-driven multi-agent development framework

Commands:
  herness init                  Initialize herness in current directory
  herness new <name>            Create a new feature document
  herness plan <name>           Analyze and decompose tasks
  herness verify [name] [--tier light|standard|deep]
                                 Run parallel verification
  herness gate <name>           Run victory gate
  herness worktree list          List all worktrees
  herness worktree create <feature> [agent]
                                  Create isolated worktree
  herness worktree cleanup <id>  Remove a worktree
  herness diagram <name> [--type class|sequence|all]
                                 Generate PlantUML diagrams
  herness status [-w|--watch]   Show project + agent status (watch mode)

Examples:
  cd my-project
  herness init
  herness new user-auth
  herness plan user-auth
  herness verify user-auth --tier light
  herness status --watch
`)
      break
    }
  }
}
