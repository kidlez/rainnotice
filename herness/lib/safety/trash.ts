import * as fs from 'fs'
import * as path from 'path'
import { TrashEntry } from '../../shared/types'
import { ensureDir } from '../../shared/utils/path'

export class TrashBin {
  private trashDir: string

  constructor(private devkitDir: string) {
    this.trashDir = path.join(devkitDir, 'trash')
  }

  async moveToTrash(filePath: string): Promise<TrashEntry | null> {
    if (!fs.existsSync(filePath)) return null

    ensureDir(this.trashDir)

    const stat = fs.statSync(filePath)
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const trashName = `${id}-${path.basename(filePath)}`
    const trashPath = path.join(this.trashDir, trashName)

    fs.copyFileSync(filePath, trashPath)

    if (stat.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true })
    } else {
      fs.unlinkSync(filePath)
    }

    const entry: TrashEntry = {
      originalPath: path.resolve(filePath),
      trashPath: path.resolve(trashPath),
      deletedAt: new Date().toISOString(),
      size: stat.size,
    }

    fs.writeFileSync(
      path.join(this.trashDir, `${id}.json`),
      JSON.stringify(entry, null, 2),
      'utf-8',
    )

    return entry
  }

  async restore(filePath: string): Promise<string | null> {
    if (!fs.existsSync(this.trashDir)) return null

    const entries = await this.list()
    const entry = entries.find((e) => e.originalPath === path.resolve(filePath))

    if (!entry || !fs.existsSync(entry.trashPath)) return null

    const destDir = path.dirname(entry.originalPath)
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

    fs.copyFileSync(entry.trashPath, entry.originalPath)
    fs.unlinkSync(entry.trashPath)

    const metaFile = path.join(
      this.trashDir,
      path.basename(entry.trashPath).split('-')[0] + '.json',
    )
    if (fs.existsSync(metaFile)) fs.unlinkSync(metaFile)

    return entry.originalPath
  }

  async list(): Promise<TrashEntry[]> {
    if (!fs.existsSync(this.trashDir)) return []

    const entries: TrashEntry[] = []
    for (const file of fs.readdirSync(this.trashDir)) {
      if (!file.endsWith('.json')) continue
      try {
        const content = JSON.parse(
          fs.readFileSync(path.join(this.trashDir, file), 'utf-8'),
        )
        entries.push(content as TrashEntry)
      } catch {
        // skip
      }
    }

    return entries.sort(
      (a, b) =>
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime(),
    )
  }

  async purge(olderThanHours: number = 24): Promise<number> {
    if (!fs.existsSync(this.trashDir)) return 0

    const cutoff = Date.now() - olderThanHours * 3600 * 1000
    let removed = 0

    for (const file of fs.readdirSync(this.trashDir)) {
      const full = path.join(this.trashDir, file)
      const stat = fs.statSync(full)
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(full)
        removed++
      }
    }

    for (const file of fs.readdirSync(this.trashDir)) {
      if (file.endsWith('.json')) {
        const metaPath = path.join(this.trashDir, file)
        const trashFile = metaPath.replace('.json', '')
        if (!fs.existsSync(trashFile)) {
          fs.unlinkSync(metaPath)
        }
      }
    }

    return removed
  }
}
