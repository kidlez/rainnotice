import * as readline from 'readline'
import { execSync } from 'child_process'
import {
  ArchiveStore,
  TraceStore,
  ContextStore,
} from '../lib/store'
import { AgentMemory } from '../lib/memory'
import { CheckpointManager } from '../lib/safety/checkpoint'
import { TrashBin } from '../lib/safety/trash'
import * as fs from 'fs'
import * as path from 'path'
import {
  KnowledgeCard,
  TaskTrace,
  AgentId,
  VerificationTier,
} from '../shared/types'
import {
  OctoNode,
  OctoParseOptions,
  HernessScreen,
} from '../shared/types/ui'
import { parseOctoJSON } from './ui/octo-parser'
import { validateScreen, normalizeScreen } from './ui/dsl-validator'
import { renderPreview } from './ui/preview-renderer'
import { generateReact, generateVue } from './ui/component-generator'

type JsonRpcId = string | number | null

interface JsonRpcRequest {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
  id: JsonRpcId
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: JsonRpcId
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

interface MCPToolDef {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

interface MCPToolCall {
  name: string
  arguments: Record<string, unknown>
}

const DEVKIT = '.devkit'

const TOOLS: MCPToolDef[] = [
  {
    name: 'herness_verify',
    description: 'Run parallel verification pipeline on a feature. Returns compile, typecheck, lint, test, and security scan results.',
    inputSchema: {
      type: 'object',
      properties: {
        featureName: { type: 'string', description: 'Feature directory name under features/' },
        tier: { type: 'string', enum: ['light', 'standard', 'deep'], description: 'Verification depth tier' },
      },
      required: ['featureName'],
    },
  },
  {
    name: 'herness_run_command',
    description: 'Run a shell command in the workspace and return stdout/stderr.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
        cwd: { type: 'string', description: 'Working directory for the command' },
      },
      required: ['command'],
    },
  },
  {
    name: 'herness_checkpoint_create',
    description: 'Create a safety checkpoint (snapshot) of one or more files before a risky operation.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent ID creating the checkpoint' },
        operation: { type: 'string', description: 'Description of the operation being guarded' },
        featureName: { type: 'string', description: 'Feature name' },
        filePaths: { type: 'array', items: { type: 'string' }, description: 'Paths to files to snapshot' },
      },
      required: ['agentId', 'operation', 'featureName', 'filePaths'],
    },
  },
  {
    name: 'herness_checkpoint_rollback',
    description: 'Rollback to a previously created checkpoint, restoring all snapshot files.',
    inputSchema: {
      type: 'object',
      properties: {
        featureName: { type: 'string', description: 'Feature name. Rolls back the latest active checkpoint for this feature.' },
      },
      required: ['featureName'],
    },
  },
  {
    name: 'herness_trash_move',
    description: 'Soft-delete a file by moving it to .devkit/trash/. Can be restored later.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute or relative path to the file to delete' },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'herness_trash_restore',
    description: 'Restore a previously soft-deleted file from .devkit/trash/.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Original path of the file to restore' },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'herness_state_read',
    description: 'Read JSON state from .devkit/context/<agentId>/<key>.json.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent ID' },
        key: { type: 'string', description: 'State key name' },
      },
      required: ['agentId', 'key'],
    },
  },
  {
    name: 'herness_state_write',
    description: 'Write JSON state to .devkit/context/<agentId>/<key>.json.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent ID' },
        key: { type: 'string', description: 'State key name' },
        value: { type: 'object', description: 'JSON value to write' },
      },
      required: ['agentId', 'key', 'value'],
    },
  },
  {
    name: 'herness_archive_save',
    description: 'Save a knowledge card to .devkit/archive/.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['knowledge', 'pattern', 'decision'], description: 'Card type' },
        id: { type: 'string', description: 'Unique card ID' },
        title: { type: 'string', description: 'Card title' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for searchability' },
        source_ref: { type: 'string', description: 'Source reference' },
        summary: { type: 'string', description: 'Short summary' },
        body: { type: 'string', description: 'Full body content' },
      },
      required: ['type', 'id', 'title', 'tags', 'source_ref', 'summary', 'body'],
    },
  },
  {
    name: 'herness_archive_search',
    description: 'Search knowledge cards by tags or list all cards.',
    inputSchema: {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags to search for. If empty, returns all cards.' },
        type: { type: 'string', enum: ['knowledge', 'pattern', 'decision'], description: 'Filter by card type' },
      },
    },
  },
  {
    name: 'herness_memory_read',
    description: 'Read persistent memory for a specific agent from .devkit/memory/<agentId>.md.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent ID (e.g. planner, developer, designer, validator)' },
        category: { type: 'string', enum: ['decision', 'convention', 'fix'], description: 'Filter by category' },
      },
      required: ['agentId'],
    },
  },
  {
    name: 'herness_memory_append',
    description: 'Append an entry to an agent\'s persistent memory. Automatically deduplicates.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent ID' },
        category: { type: 'string', enum: ['decision', 'convention', 'fix'], description: 'Memory category' },
        content: { type: 'string', description: 'Memory content' },
        source: { type: 'string', description: 'Source of this memory entry' },
      },
      required: ['agentId', 'category', 'content'],
    },
  },
  {
    name: 'herness_trace_save',
    description: 'Save a task execution trace to .devkit/archive/traces/.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID' },
        featureId: { type: 'string', description: 'Feature ID' },
        input: { type: 'string', description: 'Task input/description' },
        steps: { type: 'array', items: { type: 'string' }, description: 'Execution steps' },
        errors: { type: 'array', items: { type: 'object', properties: { message: { type: 'string' }, fix: { type: 'string' } } }, description: 'Error records' },
        output: { type: 'string', description: 'Task output' },
        durationMs: { type: 'number', description: 'Duration in milliseconds' },
        similarityTags: { type: 'array', items: { type: 'string' }, description: 'Tags for similarity search' },
      },
      required: ['taskId', 'featureId', 'input', 'steps', 'errors', 'output', 'durationMs', 'similarityTags'],
    },
  },
  {
    name: 'herness_trace_search',
    description: 'Search for similar task traces using Jaccard similarity on tags.',
    inputSchema: {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags to search for' },
        limit: { type: 'number', description: 'Max results (default 5)' },
      },
      required: ['tags'],
    },
  },
  {
    name: 'herness_scan_deps',
    description: 'Scan files for risky patterns: API keys, hardcoded secrets, SQL injection, XSS, eval, path traversal.',
    inputSchema: {
      type: 'object',
      properties: {
        featureName: { type: 'string', description: 'Feature directory name to scan' },
      },
      required: ['featureName'],
    },
  },
  {
    name: 'ui_from_octo',
    description: 'Parse octo design tool JSON export into herness UI DSL. Converts raw design nodes (RECTANGLE, TEXT, LINE, etc.) into semantic UI components (button, input, heading, card, navbar, etc.) using heuristics.',
    inputSchema: {
      type: 'object',
      properties: {
        octoJson: { type: 'object', description: 'The raw octo JSON export (node tree)' },
        screenName: { type: 'string', description: 'Optional screen name override' },
        namingHints: { type: 'object', description: 'Optional map of name patterns to component types. e.g. {"btn": "button", "nav": "navbar"}' },
      },
      required: ['octoJson'],
    },
  },
  {
    name: 'ui_from_text',
    description: 'Generate herness UI DSL from natural language UI description.',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Natural language description of the UI. e.g. "A login page with centered card, username input, password input, and a blue login button"' },
        screenName: { type: 'string', description: 'Screen name (kebab-case)' },
      },
      required: ['description', 'screenName'],
    },
  },
  {
    name: 'ui_dsl_validate',
    description: 'Validate a herness UI DSL screen object. Returns errors and warnings.',
    inputSchema: {
      type: 'object',
      properties: {
        screen: { type: 'object', description: 'The HernessScreen object to validate' },
      },
      required: ['screen'],
    },
  },
  {
    name: 'ui_dsl_preview',
    description: 'Generate a standalone HTML preview file from a herness UI DSL screen. Returns the file path.',
    inputSchema: {
      type: 'object',
      properties: {
        screen: { type: 'object', description: 'The HernessScreen object to render' },
        outputPath: { type: 'string', description: 'Optional output file path. Defaults to features/<name>/preview.html' },
      },
      required: ['screen'],
    },
  },
  {
    name: 'ui_dsl_to_react',
    description: 'Generate React (TSX) component files from a herness UI DSL screen.',
    inputSchema: {
      type: 'object',
      properties: {
        screen: { type: 'object', description: 'The HernessScreen object' },
        outputDir: { type: 'string', description: 'Output directory. Defaults to features/<name>/src/' },
      },
      required: ['screen'],
    },
  },
  {
    name: 'ui_dsl_to_vue',
    description: 'Generate Vue (SFC) component files from a herness UI DSL screen.',
    inputSchema: {
      type: 'object',
      properties: {
        screen: { type: 'object', description: 'The HernessScreen object' },
        outputDir: { type: 'string', description: 'Output directory. Defaults to features/<name>/src/' },
      },
      required: ['screen'],
    },
  },
]

function send(res: JsonRpcResponse): void {
  process.stdout.write(JSON.stringify(res) + '\n')
}

function success(id: JsonRpcId, result: unknown): void {
  send({ jsonrpc: '2.0', id, result })
}

function error(id: JsonRpcId, code: number, message: string, data?: unknown): void {
  send({ jsonrpc: '2.0', id, error: { code, message, data } })
}

let stores: {
  archive: ArchiveStore
  trace: TraceStore
  context: ContextStore
  memory: AgentMemory
  checkpoint: CheckpointManager
  trash: TrashBin
} | null = null

function getStores() {
  if (!stores) {
    stores = {
      archive: new ArchiveStore(DEVKIT),
      trace: new TraceStore(DEVKIT),
      context: new ContextStore(DEVKIT),
      memory: new AgentMemory(DEVKIT),
      checkpoint: new CheckpointManager(DEVKIT),
      trash: new TrashBin(DEVKIT),
    }
  }
  return stores
}

async function handleToolCall(tool: MCPToolCall): Promise<unknown> {
  const s = getStores()
  const args = tool.arguments

  switch (tool.name) {
    case 'herness_verify': {
      const featureName = args.featureName as string
      const tier = (args.tier as VerificationTier) || 'standard'
      const featurePath = `features/${featureName}`
      const fs = await import('fs')
      const path = await import('path')

      const checks: Record<string, string> = {}

      if (tier === 'light' || tier === 'standard' || tier === 'deep') {
        try {
          const cmd = `npx tsc --noEmit --project tsconfig.json 2>&1`
          execSync(cmd, { cwd: process.cwd(), stdio: 'pipe', timeout: 60000 })
          checks['compile'] = 'passed'; checks['typecheck'] = 'passed'
        } catch (e) {
          const msg = (e as { stderr?: Buffer; stdout?: Buffer }).stderr?.toString() || (e as { stdout?: Buffer }).stdout?.toString() || ''
          if (msg.includes('error TS')) {
            checks['compile'] = 'failed'; checks['typecheck'] = 'failed'
            checks['_compile_error'] = msg.slice(0, 500)
          } else {
            checks['compile'] = 'failed'; checks['typecheck'] = 'failed'
            checks['_compile_error'] = msg.slice(0, 500)
          }
        }
      }

      if (tier === 'standard' || tier === 'deep') {
        try {
          execSync(`npx eslint "${featurePath}/**/*.ts" --format json 2>&1`, {
            cwd: process.cwd(), stdio: 'pipe', timeout: 30000,
          })
          checks['lint'] = 'passed'
        } catch {
          checks['lint'] = 'failed'
        }
      }

      return { featureName, tier, passed: Object.values(checks).every(v => v === 'passed'), checks }
    }

    case 'herness_run_command': {
      const command = args.command as string
      const cwd = (args.cwd as string) || process.cwd()
      try {
        const stdout = execSync(command, { cwd, stdio: 'pipe', timeout: 120000 })
        return { exitCode: 0, stdout: stdout.toString(), stderr: '' }
      } catch (e) {
        const err = e as { stdout?: Buffer; stderr?: Buffer; status?: number }
        return {
          exitCode: err.status || 1,
          stdout: err.stdout?.toString() || '',
          stderr: err.stderr?.toString() || '',
        }
      }
    }

    case 'herness_checkpoint_create': {
      const chk = await s.checkpoint.create(
        args.agentId as AgentId,
        args.operation as string,
        args.featureName as string,
        (args.filePaths as string[]).map(p => `${process.cwd()}/${p}`),
      )
      return { id: chk.id, files: chk.files.length, status: chk.status }
    }

    case 'herness_checkpoint_rollback': {
      const latest = await s.checkpoint.getLatest(args.featureName as string)
      if (!latest) throw new Error(`No checkpoint found for feature: ${args.featureName}`)
      const restored = await s.checkpoint.rollback(latest)
      return { restored: restored.length, files: restored }
    }

    case 'herness_trash_move': {
      const entry = await s.trash.moveToTrash(args.filePath as string)
      if (!entry) return { moved: false, reason: 'file not found' }
      return { moved: true, entry }
    }

    case 'herness_trash_restore': {
      const restored = await s.trash.restore(args.filePath as string)
      return { restored: restored != null, path: restored }
    }

    case 'herness_state_read': {
      const value = await s.context.load(args.agentId as string, args.key as string)
      return { found: value !== null, value }
    }

    case 'herness_state_write': {
      await s.context.save(args.agentId as string, args.key as string, args.value)
      return { written: true }
    }

    case 'herness_archive_save': {
      await s.archive.save({
        type: args.type as KnowledgeCard['type'],
        id: args.id as string,
        title: args.title as string,
        tags: args.tags as string[],
        source_ref: args.source_ref as string,
        summary: args.summary as string,
        body: args.body as string,
        created: new Date().toISOString(),
        validated: false,
      } as KnowledgeCard)
      return { saved: true, id: args.id }
    }

    case 'herness_archive_search': {
      const cards = args.tags && (args.tags as string[]).length > 0
        ? await s.archive.findByTags(args.tags as string[])
        : await s.archive.list(args.type as string | undefined)
      return { count: cards.length, cards: cards.map(c => ({ id: c.id, type: c.type, title: c.title, tags: c.tags, source_ref: c.source_ref, summary: c.summary })) }
    }

    case 'herness_memory_read': {
      const entries = args.category
        ? await s.memory.readByCategory(args.agentId as AgentId, args.category as 'decision' | 'convention' | 'fix')
        : await s.memory.read(args.agentId as AgentId)
      return { agentId: args.agentId, count: entries.length, entries }
    }

    case 'herness_memory_append': {
      await s.memory.append(
        args.agentId as AgentId,
        args.category as 'decision' | 'convention' | 'fix',
        args.content as string,
        (args.source as string) || 'mcp',
      )
      return { appended: true }
    }

    case 'herness_trace_save': {
      const trace: TaskTrace = {
        taskId: args.taskId as string,
        featureId: args.featureId as string,
        input: args.input as string,
        steps: args.steps as string[],
        errors: (args.errors as Array<{ message: string; fix: string }>) || [],
        output: args.output as string,
        durationMs: args.durationMs as number,
        timestamp: new Date().toISOString(),
        similarityTags: args.similarityTags as string[],
      }
      const filepath = await s.trace.save(trace)
      return { saved: true, filepath }
    }

    case 'herness_trace_search': {
      const limit = (args.limit as number) || 5
      const traces = await s.trace.findSimilar(args.tags as string[], limit)
      return { count: traces.length, traces: traces.map(t => ({ taskId: t.taskId, featureId: t.featureId, durationMs: t.durationMs, similarityTags: t.similarityTags, input: t.input.slice(0, 200) })) }
    }

    case 'herness_scan_deps': {
      const { execSync } = await import('child_process')
      const { existsSync, readFileSync } = await import('fs')
      const { join } = await import('path')
      const dir = join(process.cwd(), 'features', args.featureName as string)
      const findings: Array<{ file: string; line: number; pattern: string; severity: string }> = []

      const SECRET_PATTERNS = [
        { regex: /(?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*['"][^'"]+['"]/gi, name: 'hardcoded_secret' },
        { regex: /sk-[a-zA-Z0-9]{20,}/g, name: 'openai_key' },
        { regex: /AKIA[0-9A-Z]{16}/g, name: 'aws_access_key' },
        { regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g, name: 'private_key' },
        { regex: /gh[pousr]_[A-Za-z0-9_]{36,}/g, name: 'github_token' },
        { regex: /(?:mongodb|postgres|mysql|redis):\/\/[^:\s]+:[^@\s]+@/g, name: 'db_connection_string' },
      ]
      const RISK_PATTERNS = [
        { regex: /\.exec\s*\(/g, name: 'child_process_exec' },
        { regex: /eval\s*\(/g, name: 'eval_call' },
        { regex: /\bany\b(?!\s*;)/g, name: 'any_type' },
      ]

      function scanDir(d: string) {
        if (!existsSync(d)) return
        const entries = require('fs').readdirSync(d, { withFileTypes: true })
        for (const entry of entries) {
          const fp = join(d, entry.name)
          if (entry.isDirectory()) { scanDir(fp); continue }
          if (!entry.name.match(/\.(ts|tsx|js|jsx)$/)) continue
          try {
            const content = readFileSync(fp, 'utf-8')
            const lines = content.split('\n')
            for (let i = 0; i < lines.length; i++) {
              for (const p of SECRET_PATTERNS) {
                p.regex.lastIndex = 0
                if (p.regex.test(lines[i])) {
                  findings.push({ file: fp.replace(process.cwd(), '').replace(/\\/g, '/'), line: i + 1, pattern: p.name, severity: 'critical' })
                }
              }
              for (const p of RISK_PATTERNS) {
                p.regex.lastIndex = 0
                if (p.regex.test(lines[i])) {
                  findings.push({ file: fp.replace(process.cwd(), '').replace(/\\/g, '/'), line: i + 1, pattern: p.name, severity: 'warning' })
                }
              }
            }
          } catch { /* skip unreadable */ }
        }
      }

      scanDir(dir)
      return { featureName: args.featureName, findingsCount: findings.length, findings }
    }

    case 'ui_from_octo': {
      const octoJson = args.octoJson as OctoNode
      const screenName = (args.screenName as string) || undefined
      const namingHints = args.namingHints as Record<string, unknown> | undefined
      const opts: OctoParseOptions = {}
      if (namingHints) {
        opts.namingHints = {}
        for (const [k, v] of Object.entries(namingHints)) {
          if (typeof v === 'string') (opts.namingHints as Record<string, string>)[k] = v
        }
      }
      const screen = parseOctoJSON(octoJson, opts)
      if (screenName) screen.name = screenName
      const validation = validateScreen(screen)
      return {
        screen,
        validation: { valid: validation.valid, errorCount: validation.errors.length, errors: validation.errors.slice(0, 10) },
        componentCount: countComponents(screen),
      }
    }

    case 'ui_from_text': {
      const desc = args.description as string
      const screenName = (args.screenName as string) || 'untitled'
      const screen = parseTextToScreen(desc, screenName)
      const validation = validateScreen(screen)
      return {
        screen,
        validation: { valid: validation.valid, errorCount: validation.errors.length, errors: validation.errors.slice(0, 10) },
        componentCount: countComponents(screen),
      }
    }

    case 'ui_dsl_validate': {
      const screen = args.screen as HernessScreen
      const result = validateScreen(screen)
      return { valid: result.valid, errors: result.errors }
    }

    case 'ui_dsl_preview': {
      const screen = normalizeScreen(args.screen as HernessScreen)
      const html = renderPreview(screen)
      const outPath = (args.outputPath as string) || `features/${screen.name}/preview.html`
      const dir = path.dirname(outPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(outPath, html, 'utf-8')
      return { written: outPath, size: html.length, screen: screen.name }
    }

    case 'ui_dsl_to_react': {
      const screen = normalizeScreen(args.screen as HernessScreen)
      const outDir = (args.outputDir as string) || `features/${screen.name}/src`
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
      const files = generateReact(screen)
      const written: string[] = []
      for (let i = 0; i < files.length; i++) {
        const fname = i === 0 ? `${screen.name}.tsx` : `${screen.name}-${i}.tsx`
        const fp = path.join(outDir, fname)
        fs.writeFileSync(fp, files[i], 'utf-8')
        written.push(fp)
      }
      return { written, count: written.length }
    }

    case 'ui_dsl_to_vue': {
      const screen = normalizeScreen(args.screen as HernessScreen)
      const outDir = (args.outputDir as string) || `features/${screen.name}/src`
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
      const files = generateVue(screen)
      const written: string[] = []
      for (let i = 0; i < files.length; i++) {
        const fname = i === 0 ? `${screen.name}.vue` : `${screen.name}-${i}.vue`
        const fp = path.join(outDir, fname)
        fs.writeFileSync(fp, files[i], 'utf-8')
        written.push(fp)
      }
      return { written, count: written.length }
    }

    default:
      throw new Error(`Unknown tool: ${tool.name}`)
  }
}

function countComponents(screen: HernessScreen): number {
  let count = 0
  function walk(nodes: HernessScreen['children']) {
    for (const n of nodes) {
      if (n.type !== 'screen') count++
      if (n.children) walk(n.children)
    }
  }
  walk(screen.children)
  return count
}

interface TextParseHint {
  pattern: RegExp
  build: (match: RegExpMatchArray) => HernessScreen['children'][0]
}

const TEXT_PARSE_HINTS: TextParseHint[] = [
  {
    pattern: /登录|login|sign\s*in/i,
    build: () => ({
      type: 'container', props: {}, layout: { direction: 'column', align: 'center', gap: 24, padding: 40 },
      children: [
        { type: 'heading', props: { text: '登录', level: 2 }, style: { fontSize: 24, fontWeight: 600 } },
        { type: 'input', props: { name: 'username', placeholder: '请输入用户名' }, style: { width: 320 } },
        { type: 'input', props: { name: 'password', placeholder: '请输入密码' }, style: { width: 320 } },
        { type: 'button', props: { text: '登录' }, style: { width: 320, backgroundColor: '#1890ff', borderRadius: 4, height: 40 } },
      ],
    }),
  },
  {
    pattern: /注册|register|sign\s*up/i,
    build: () => ({
      type: 'form', props: {}, layout: { direction: 'column', gap: 16, padding: 32 },
      children: [
        { type: 'heading', props: { text: '注册', level: 2 } },
        { type: 'input', props: { name: 'username', placeholder: '用户名' } },
        { type: 'input', props: { name: 'email', placeholder: '邮箱' } },
        { type: 'input', props: { name: 'password', placeholder: '密码' } },
        { type: 'input', props: { name: 'confirmPassword', placeholder: '确认密码' } },
        { type: 'button', props: { text: '注册' } },
      ],
    }),
  },
  {
    pattern: /表格|列表|table|list|data\s*grid/i,
    build: () => ({
      type: 'table', props: { rows: 5 }, layout: { direction: 'column' },
      children: [],
    }),
  },
  {
    pattern: /导航|navbar|header|页面顶部|顶部栏/i,
    build: () => ({
      type: 'navbar', props: {}, layout: { direction: 'row', align: 'center', gap: 16, padding: 12 },
      children: [
        { type: 'heading', props: { text: 'Logo', level: 3 }, style: { fontSize: 18 } },
        { type: 'link', props: { text: '首页', to: '/' } },
        { type: 'link', props: { text: '关于', to: '/about' } },
      ],
    }),
  },
  {
    pattern: /仪表盘|dashboard|管理后台|后台/i,
    build: () => ({
      type: 'container', props: {}, layout: { direction: 'row', align: 'stretch' },
      children: [
        { type: 'sidebar', props: {}, layout: { direction: 'column', gap: 8, padding: 16 }, style: { width: 240, backgroundColor: '#001529' },
          children: [
            { type: 'text', props: { content: 'Dashboard' }, style: { color: '#fff', fontSize: 18 } },
            { type: 'divider', props: {} },
            { type: 'link', props: { text: '概览', to: '/overview' } },
            { type: 'link', props: { text: '用户管理', to: '/users' } },
          ] },
        { type: 'container', props: {}, layout: { direction: 'column', gap: 16, padding: 24 },
          children: [
            { type: 'heading', props: { text: '概览', level: 1 } },
            { type: 'card', props: {}, layout: { direction: 'column', padding: 24 },
              children: [{ type: 'text', props: { content: '欢迎使用管理后台' } }] },
          ] },
      ],
    }),
  },
  {
    pattern: /表单|form|提交/i,
    build: () => ({
      type: 'form', props: {}, layout: { direction: 'column', gap: 16, padding: 24 },
      children: [
        { type: 'heading', props: { text: '表单', level: 2 } },
        { type: 'input', props: { name: 'field1', placeholder: '请输入' } },
        { type: 'button', props: { text: '提交' } },
      ],
    }),
  },
]

function parseTextToScreen(desc: string, screenName: string): HernessScreen {
  const matched = TEXT_PARSE_HINTS.find(h => h.pattern.test(desc))
  const screen: HernessScreen = {
    name: screenName,
    title: screenName,
    layout: 'fullscreen',
    children: [],
  }

  if (matched) {
    screen.children = [matched.build(matched.pattern.exec(desc)!)]
  } else {
    screen.children = [{
      type: 'container', props: {}, layout: { direction: 'column', gap: 16, padding: 24 },
      children: [
        { type: 'heading', props: { text: screenName, level: 1 } },
        { type: 'text', props: { content: desc } },
      ],
    }]
    screen.layout = 'centered'
  }

  const centering = /\b居中|center|centered\b/i
  if (centering.test(desc)) {
    screen.layout = 'centered'
  }

  const fullscreen = /\b全屏|full\s*screen|铺满|占满\b/i
  if (fullscreen.test(desc)) {
    screen.layout = 'fullscreen'
  }

  const sidebar = /\b侧边栏|sidebar|左侧导航\b/i
  if (sidebar.test(desc)) {
    screen.layout = 'sidebar'
  }

  return screen
}

async function handleMessage(msg: JsonRpcRequest): Promise<void> {
  try {
    if (msg.method === 'initialize') {
      success(msg.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'herness', version: '0.1.0' },
      })
    } else if (msg.method === 'notifications/initialized') {
      // no response needed
    } else if (msg.method === 'tools/list') {
      success(msg.id, { tools: TOOLS })
    } else if (msg.method === 'tools/call') {
      const params = msg.params as { name: string; arguments?: Record<string, unknown> } | undefined
      if (!params) throw new Error('Missing params')
      const tool: MCPToolCall = { name: params.name, arguments: params.arguments || {} }
      const result = await handleToolCall(tool)
      success(msg.id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] })
    } else {
      error(msg.id, -32601, `Method not found: ${msg.method}`)
    }
  } catch (e) {
    error(msg.id, -32000, (e as Error).message)
  }
}

process.stderr.write('[herness-mcp] server starting\n')

const rl = readline.createInterface({ input: process.stdin })
rl.on('line', (line: string) => {
  try {
    const msg = JSON.parse(line) as JsonRpcRequest
    handleMessage(msg)
  } catch {
    // silently skip malformed input
  }
})

process.on('uncaughtException', (e) => {
  process.stderr.write(`[herness-mcp] uncaught exception: ${e.message}\n`)
})
