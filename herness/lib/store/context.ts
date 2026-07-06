import * as fs from 'fs'
import * as path from 'path'
import { ensureDir } from '../../shared/utils/path'

export class ContextStore {
  constructor(private devkitDir: string) {}

  agentDir(agentId: string): string {
    return path.join(this.devkitDir, 'context', agentId)
  }

  async save(agentId: string, key: string, data: unknown): Promise<void> {
    const dir = this.agentDir(agentId)
    ensureDir(dir)
    fs.writeFileSync(
      path.join(dir, `${key}.json`),
      JSON.stringify(data, null, 2),
      'utf-8'
    )
  }

  async load(agentId: string, key: string): Promise<unknown | null> {
    const filePath = path.join(this.agentDir(agentId), `${key}.json`)
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  }

  async list(agentId: string): Promise<string[]> {
    const dir = this.agentDir(agentId)
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace(/\.json$/, ''))
  }

  async read(agentId: string): Promise<unknown> {
    const keys = await this.list(agentId)
    if (keys.length === 0) return null
    return this.load(agentId, keys[0])
  }
}
