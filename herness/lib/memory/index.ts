import * as fs from 'fs'
import * as path from 'path'
import { AgentMemoryEntry, AgentId } from '../../shared/types'
import { ensureDir } from '../../shared/utils/path'

export class AgentMemory {
  private memoryDir: string

  constructor(private devkitDir: string) {
    this.memoryDir = path.join(devkitDir, 'memory')
  }

  private memoryPath(agentId: AgentId): string {
    return path.join(this.memoryDir, `${agentId}.md`)
  }

  async read(agentId: AgentId): Promise<AgentMemoryEntry[]> {
    const file = this.memoryPath(agentId)
    if (!fs.existsSync(file)) return []

    const content = fs.readFileSync(file, 'utf-8')
    const entries: AgentMemoryEntry[] = []

    const blocks = content.split(/\n(?=### )/)
    for (const block of blocks) {
      const lines = block.split('\n')
      const header = lines[0]
      if (!header || !header.startsWith('### ')) continue

      const metaMatch = header.match(/###\s+\[(\w+)\]\s+(.+)/)
      if (!metaMatch) continue

      const category = metaMatch[1] as AgentMemoryEntry['category']
      const title = metaMatch[2]

      const body = lines.slice(1).join('\n').trim()

      const timestampMatch = body.match(/- Timestamp:\s*(.+)/)
      const sourceMatch = body.match(/- Source:\s*(.+)/)

      entries.push({
        category,
        content: `${title}\n${body}`,
        timestamp: timestampMatch?.[1] || '',
        source: sourceMatch?.[1] || 'unknown',
      })
    }

    return entries
  }

  async readByCategory(agentId: AgentId, category: AgentMemoryEntry['category']): Promise<AgentMemoryEntry[]> {
    const all = await this.read(agentId)
    return all.filter(e => e.category === category)
  }

  async append(agentId: AgentId, category: AgentMemoryEntry['category'], content: string, source: string = 'auto'): Promise<void> {
    ensureDir(this.memoryDir)
    const file = this.memoryPath(agentId)

    const existing = await this.read(agentId)
    const hash = this.shortHash(content)
    const duplicate = existing.some(e =>
      e.category === category && this.shortHash(e.content) === hash
    )
    if (duplicate) return

    const timestamp = new Date().toISOString()
    const block = [
      '',
      `### [${category}] ${content.split('\n')[0].slice(0, 60)}`,
      content,
      `- Timestamp: ${timestamp}`,
      `- Source: ${source}`,
    ].join('\n')

    if (fs.existsSync(file)) {
      fs.appendFileSync(file, block + '\n', 'utf-8')
    } else {
      fs.writeFileSync(file, `# ${agentId} Memory\n${block}\n`, 'utf-8')
    }
  }

  async rememberDecision(agentId: AgentId, decision: string): Promise<void> {
    await this.append(agentId, 'decision', decision, 'manual')
  }

  async rememberConvention(agentId: AgentId, convention: string): Promise<void> {
    await this.append(agentId, 'convention', convention, 'auto')
  }

  async rememberFix(agentId: AgentId, fix: string): Promise<void> {
    await this.append(agentId, 'fix', fix, 'reflector')
  }

  async clear(agentId: AgentId): Promise<void> {
    const file = this.memoryPath(agentId)
    if (fs.existsSync(file)) fs.unlinkSync(file)
  }

  private shortHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash |= 0
    }
    return String(hash)
  }
}
