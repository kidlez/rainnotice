import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { Checkpoint, TransactionOutcome, AgentId } from '../../shared/types'
import { ensureDir } from '../../shared/utils/path'

export class CheckpointManager {
  constructor(private devkitDir: string) {}

  checkpointDir(): string {
    return path.join(this.devkitDir, 'checkpoints')
  }

  async create(
    agentId: AgentId,
    operation: string,
    featureName: string,
    filePaths: string[],
  ): Promise<Checkpoint> {
    const id = `CP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const snapshotDir = path.join(this.checkpointDir(), id)
    ensureDir(snapshotDir)

    const files: Checkpoint['files'] = []

    for (const fp of filePaths) {
      if (!fs.existsSync(fp)) continue
      const content = fs.readFileSync(fp)
      const size = content.length
      const hash = this.hash(content)

      const relativeName = hash.slice(0, 8) + '-' + path.basename(fp)
      const snapshotPath = path.join(snapshotDir, relativeName)

      fs.writeFileSync(snapshotPath, content)

      files.push({
        originalPath: path.resolve(fp),
        snapshotPath: path.resolve(snapshotPath),
        size,
      })
    }

    const checkpoint: Checkpoint = {
      id,
      timestamp: new Date().toISOString(),
      agentId,
      operation,
      featureName,
      files,
      status: 'active',
    }

    fs.writeFileSync(
      path.join(snapshotDir, 'manifest.json'),
      JSON.stringify(checkpoint, null, 2),
      'utf-8',
    )

    return checkpoint
  }

  async rollback(checkpoint: Checkpoint): Promise<string[]> {
    const restored: string[] = []

    for (const file of checkpoint.files) {
      if (!fs.existsSync(file.snapshotPath)) continue
      const content = fs.readFileSync(file.snapshotPath)
      const dir = path.dirname(file.originalPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(file.originalPath, content)
      restored.push(file.originalPath)
    }

    checkpoint.status = 'rolled_back'
    const manifestPath = path.join(
      this.checkpointDir(),
      checkpoint.id,
      'manifest.json',
    )
    if (fs.existsSync(manifestPath)) {
      fs.writeFileSync(
        manifestPath,
        JSON.stringify(checkpoint, null, 2),
        'utf-8',
      )
    }

    return restored
  }

  async commit(checkpoint: Checkpoint): Promise<void> {
    checkpoint.status = 'committed'
    const manifestPath = path.join(
      this.checkpointDir(),
      checkpoint.id,
      'manifest.json',
    )
    if (fs.existsSync(manifestPath)) {
      fs.writeFileSync(
        manifestPath,
        JSON.stringify(checkpoint, null, 2),
        'utf-8',
      )
    }
  }

  async list(): Promise<Checkpoint[]> {
    const dir = this.checkpointDir()
    if (!fs.existsSync(dir)) return []

    const checkpoints: Checkpoint[] = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const manifestPath = path.join(dir, entry.name, 'manifest.json')
      if (!fs.existsSync(manifestPath)) continue
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
        checkpoints.push(manifest as Checkpoint)
      } catch {
        // skip invalid
      }
    }

    return checkpoints.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
  }

  async findForFeature(featureName: string): Promise<Checkpoint[]> {
    const all = await this.list()
    return all.filter((c) => c.featureName === featureName)
  }

  async getLatest(featureName: string): Promise<Checkpoint | null> {
    const featureCheckpoints = await this.findForFeature(featureName)
    return featureCheckpoints.length > 0 ? featureCheckpoints[0] : null
  }

  private hash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }
}
