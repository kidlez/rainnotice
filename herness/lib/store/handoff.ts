import * as fs from 'fs'
import * as path from 'path'
import { HandoffState } from '../../shared/types'
import { ensureDir } from '../../shared/utils/path'

export class HandoffStore {
  constructor(private devkitDir: string) {}

  async write(state: HandoffState): Promise<void> {
    ensureDir(this.devkitDir)
    const filePath = path.join(this.devkitDir, 'handoff.md')
    fs.writeFileSync(filePath, this.serialize(state), 'utf-8')
  }

  async read(): Promise<HandoffState | null> {
    const filePath = path.join(this.devkitDir, 'handoff.md')
    if (!fs.existsSync(filePath)) return null
    return this.deserialize(fs.readFileSync(filePath, 'utf-8'))
  }

  async clear(): Promise<void> {
    const filePath = path.join(this.devkitDir, 'handoff.md')
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }

  private serialize(state: HandoffState): string {
    const lines: string[] = []
    for (const [key, value] of Object.entries(state)) {
      if (value === undefined) continue
      if (typeof value === 'object' && value !== null) {
        lines.push(`${key}: ${JSON.stringify(value)}`)
      } else {
        lines.push(`${key}: "${String(value)}"`)
      }
    }
    return lines.join('\n') + '\n'
  }

  private deserialize(content: string): HandoffState {
    const state: Record<string, unknown> = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.includes(':')) continue
      const sep = trimmed.indexOf(':')
      const key = trimmed.slice(0, sep).trim()
      const raw = trimmed.slice(sep + 1).trim()
      if (!key) continue

      if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
        try { state[key] = JSON.parse(raw) } catch { state[key] = raw }
      } else if (raw.startsWith('"') && raw.endsWith('"')) {
        state[key] = raw.slice(1, -1)
      } else if (raw.startsWith("'") && raw.endsWith("'")) {
        state[key] = raw.slice(1, -1)
      } else {
        state[key] = raw
      }
    }
    return state as unknown as HandoffState
  }
}
