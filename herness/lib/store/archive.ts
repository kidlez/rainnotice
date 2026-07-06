import * as fs from 'fs'
import * as path from 'path'
import { KnowledgeCard } from '../../shared/types'
import { ensureDir } from '../../shared/utils/path'

export class ArchiveStore {
  readonly categories = ['knowledge', 'patterns', 'decisions'] as const

  private readonly categoryMap: Record<string, string> = {
    knowledge: 'knowledge',
    pattern: 'patterns',
    decision: 'decisions',
  }

  constructor(private devkitDir: string) {}

  async save(card: KnowledgeCard): Promise<void> {
    const catDir = this.categoryMap[card.type]
    if (!catDir) throw new Error(`Unknown card type: ${card.type}`)
    const dir = path.join(this.devkitDir, 'archive', catDir)
    ensureDir(dir)
    fs.writeFileSync(
      path.join(dir, `${card.id}.md`),
      this.serializeFrontmatter(card),
      'utf-8'
    )
  }

  async list(type?: string): Promise<KnowledgeCard[]> {
    const dirs = type
      ? [this.categoryMap[type] ?? type]
      : [...this.categories]

    const cards: KnowledgeCard[] = []
    for (const cat of dirs) {
      const dir = path.join(this.devkitDir, 'archive', cat)
      if (!fs.existsSync(dir)) continue
      for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8')
        cards.push(this.parseFrontmatter(content))
      }
    }
    return cards
  }

  async findByTags(tags: string[]): Promise<KnowledgeCard[]> {
    const all = await this.list()
    return all.filter(card =>
      tags.some(t => card.tags.includes(t))
    )
  }

  private serializeFrontmatter(card: KnowledgeCard): string {
    const lines: string[] = ['---']
    const fields: Array<[string, unknown]> = [
      ['type', card.type],
      ['id', card.id],
      ['title', card.title],
      ['tags', card.tags],
      ['source_ref', card.source_ref],
      ['created', card.created],
      ['validated', card.validated],
      ['summary', card.summary],
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
    lines.push(card.body)
    return lines.join('\n')
  }

  private parseFrontmatter(content: string): KnowledgeCard {
    const lines = content.split('\n')
    if (lines[0]?.trim() !== '---') throw new Error('Invalid frontmatter format')

    const endIdx = lines.indexOf('---', 1)
    if (endIdx === -1) throw new Error('Missing closing ---')

    const frontmatter = lines.slice(1, endIdx)
    const body = lines.slice(endIdx + 1).join('\n').trim()

    const card: Record<string, unknown> = { body }
    for (const line of frontmatter) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.includes(':')) continue
      const sep = trimmed.indexOf(':')
      const key = trimmed.slice(0, sep).trim()
      const raw = trimmed.slice(sep + 1).trim()
      if (!key) continue

      if (raw.startsWith('[') && raw.endsWith(']')) {
        card[key] = raw.slice(1, -1).split(',').map(t => t.trim()).filter(Boolean)
      } else if (raw === 'true') {
        card[key] = true
      } else if (raw === 'false') {
        card[key] = false
      } else if (raw.startsWith('"') && raw.endsWith('"')) {
        card[key] = raw.slice(1, -1)
      } else if (raw.startsWith("'") && raw.endsWith("'")) {
        card[key] = raw.slice(1, -1)
      } else {
        card[key] = raw
      }
    }
    return card as unknown as KnowledgeCard
  }
}
