import * as fs from 'fs'
import * as path from 'path'
import { TaskTrace } from '../../shared/types'
import { ensureDir } from '../../shared/utils/path'

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'of', 'to', 'in', 'for', 'on', 'with', 'at',
  'by', 'this', 'that', 'it', 'be', 'as', 'are', 'was', 'were', 'been',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
  'should', 'can', 'could', 'may', 'might', 'not', 'no', 'or', 'and',
  'but', 'if', 'then', 'else', 'when', 'from',
])

export class TraceStore {
  constructor(private devkitDir: string) {}

  tracesDir(): string {
    return path.join(this.devkitDir, 'archive', 'traces')
  }

  async save(trace: TaskTrace): Promise<string> {
    const dir = this.tracesDir()
    ensureDir(dir)
    const filename = `${trace.featureId}-${trace.taskId}.md`
    const filepath = path.join(dir, filename)
    fs.writeFileSync(filepath, this.serialize(trace), 'utf-8')
    return filepath
  }

  async load(featureId: string, taskId: string): Promise<TaskTrace | null> {
    const filepath = path.join(this.tracesDir(), `${featureId}-${taskId}.md`)
    if (!fs.existsSync(filepath)) return null
    return this.deserialize(fs.readFileSync(filepath, 'utf-8'))
  }

  async findByFeature(featureId: string): Promise<TaskTrace[]> {
    const dir = this.tracesDir()
    if (!fs.existsSync(dir)) return []
    const prefix = `${featureId}-`
    const traces: TaskTrace[] = []
    for (const file of fs.readdirSync(dir).filter(f => f.startsWith(prefix) && f.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8')
      const trace = this.deserialize(content)
      if (trace) traces.push(trace)
    }
    return traces
  }

  async findSimilar(similarityTags: string[], limit: number = 5): Promise<TaskTrace[]> {
    const dir = this.tracesDir()
    if (!fs.existsSync(dir)) return []

    const tagSet = new Set(similarityTags)
    const scored: Array<{ trace: TaskTrace; score: number }> = []

    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8')
      const trace = this.deserialize(content)
      if (!trace || trace.similarityTags.length === 0) continue

      const traceSet = new Set(trace.similarityTags)
      const intersection = new Set([...tagSet].filter(t => traceSet.has(t)))
      const union = new Set([...tagSet, ...traceSet])

      if (union.size === 0) continue
      const score = intersection.size / union.size
      if (score > 0) {
        scored.push({ trace, score })
      }
    }

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, limit).map(s => s.trace)
  }

  async queryFixPatterns(
    errors: Array<{ type: string; detail: string }>
  ): Promise<Array<{ fixPattern: string; confidence: string }>> {
    const results: Array<{ fixPattern: string; confidence: string }> = []

    for (const error of errors) {
      const keywords = await this.extractKeywords(error.detail)
      const similar = await this.findSimilar(keywords, 3)
      for (const trace of similar) {
        for (const e of trace.errors) {
          if (e.fix && !results.some(r => r.fixPattern === e.fix)) {
            results.push({ fixPattern: e.fix, confidence: 'medium' })
          }
        }
      }

      if (error.type) {
        const allTraces = await this.findSimilar([error.type], 3)
        for (const trace of allTraces) {
          for (const e of trace.errors) {
            if (e.fix && !results.some(r => r.fixPattern === e.fix)) {
              results.push({ fixPattern: e.fix, confidence: 'low' })
            }
          }
        }
      }
    }

    return results
  }

  async extractKeywords(text: string): Promise<string[]> {
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length >= 3 && !STOPWORDS.has(w))
    const freq = new Map<string, number>()
    for (const w of words) {
      freq.set(w, (freq.get(w) || 0) + 1)
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([w]) => w)
  }

  private serialize(trace: TaskTrace): string {
    const lines: string[] = ['---']
    const fields: Array<[string, unknown]> = [
      ['taskId', trace.taskId],
      ['featureId', trace.featureId],
      ['durationMs', trace.durationMs],
      ['timestamp', trace.timestamp],
      ['similarityTags', trace.similarityTags],
    ]
    for (const [key, value] of fields) {
      if (Array.isArray(value)) {
        lines.push(`${key}: [${value.join(', ')}]`)
      } else if (typeof value === 'string') {
        lines.push(`${key}: "${value}"`)
      } else if (typeof value === 'boolean' || typeof value === 'number') {
        lines.push(`${key}: ${value}`)
      }
    }
    lines.push('---')
    lines.push('')
    lines.push('## Input')
    lines.push(trace.input)
    lines.push('')
    lines.push('## Steps')
    for (const step of trace.steps) {
      lines.push(`- ${step}`)
    }
    lines.push('')
    lines.push('## Output')
    lines.push(trace.output)
    if (trace.errors.length > 0) {
      lines.push('')
      lines.push('## Errors')
      for (const err of trace.errors) {
        lines.push(`- message: ${err.message}`)
        lines.push(`  fix: ${err.fix}`)
      }
    }
    return lines.join('\n')
  }

  private deserialize(content: string): TaskTrace | null {
    const lines = content.split('\n')
    if (lines[0]?.trim() !== '---') return null

    const endIdx = lines.indexOf('---', 1)
    if (endIdx === -1) return null

    const frontmatterLines = lines.slice(1, endIdx)
    const body = lines.slice(endIdx + 1).join('\n').trim()

    const fm: Record<string, unknown> = {}
    for (const line of frontmatterLines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.includes(':')) continue
      const sep = trimmed.indexOf(':')
      const key = trimmed.slice(0, sep).trim()
      const raw = trimmed.slice(sep + 1).trim()
      if (!key) continue

      if (raw.startsWith('[') && raw.endsWith(']')) {
        fm[key] = raw.slice(1, -1).split(',').map(t => t.trim()).filter(Boolean)
      } else if (raw === 'true') {
        fm[key] = true
      } else if (raw === 'false') {
        fm[key] = false
      } else if (raw.startsWith('"') && raw.endsWith('"')) {
        fm[key] = raw.slice(1, -1)
      } else if (raw.startsWith("'") && raw.endsWith("'")) {
        fm[key] = raw.slice(1, -1)
      } else if (/^-?\d+(\.\d+)?$/.test(raw)) {
        fm[key] = parseFloat(raw)
      } else {
        fm[key] = raw
      }
    }

    const sections = this.parseBodySections(body)

    return {
      taskId: fm['taskId'] as string,
      featureId: fm['featureId'] as string,
      input: sections.input || '',
      steps: sections.steps || [],
      errors: sections.errors || [],
      output: sections.output || '',
      durationMs: fm['durationMs'] as number,
      timestamp: fm['timestamp'] as string,
      similarityTags: fm['similarityTags'] as string[],
    }
  }

  private parseBodySections(body: string): {
    input?: string
    steps?: string[]
    output?: string
    errors?: Array<{ message: string; fix: string }>
  } {
    const result: ReturnType<TraceStore['parseBodySections']> = {}
    const parts = body.split(/\n(?=## )/)
    for (const part of parts) {
      const sectionLines = part.split('\n')
      const header = sectionLines[0].trim()
      const content = sectionLines.slice(1).join('\n').trim()

      if (header === '## Input') {
        result.input = content
      } else if (header === '## Steps') {
        result.steps = content.split('\n')
          .map(l => l.replace(/^-\s*/, '').trim())
          .filter(Boolean)
      } else if (header === '## Output') {
        result.output = content
      } else if (header === '## Errors') {
        result.errors = this.parseErrors(content)
      }
    }
    return result
  }

  private parseErrors(content: string): Array<{ message: string; fix: string }> {
    const errors: Array<{ message: string; fix: string }> = []
    let current: { message: string; fix: string } | null = null

    for (const line of content.split('\n')) {
      if (line.startsWith('- message:')) {
        if (current) errors.push(current)
        current = { message: line.replace(/^-\s*message:\s*/, '').trim(), fix: '' }
      } else if (line.trim().startsWith('fix:') && current) {
        current.fix = line.replace(/^\s*fix:\s*/, '').trim()
      }
    }
    if (current) errors.push(current)

    return errors
  }
}
