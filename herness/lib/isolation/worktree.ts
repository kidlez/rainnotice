import { execSync } from 'child_process'
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'
import { WorktreeState, AgentId } from '../../shared/types'

export class WorktreeManager {
  private worktreesDir: string
  private repoRoot: string
  private manifests: Map<string, WorktreeState>

  constructor(repoRoot: string = '.') {
    this.repoRoot = this.findGitRoot(repoRoot)
    this.worktreesDir = join(this.repoRoot, '.herness-worktrees')
    this.manifests = new Map()
    this.loadManifests()
  }

  getRepoRoot(): string {
    return this.repoRoot
  }

  async create(
    agentId: AgentId,
    featureName: string,
    baseBranch?: string,
  ): Promise<WorktreeState> {
    if (!existsSync(this.worktreesDir)) {
      mkdirSync(this.worktreesDir, { recursive: true })
    }

    const actualBase = baseBranch || this.currentBranch()
    const id = `${agentId}-${featureName}-${Date.now().toString(36)}`
    const branch = `herness/${agentId}/${featureName}-${Date.now().toString(36)}`
    const worktreePath = join(this.worktreesDir, id)

    try {
      execSync(`git worktree add "${worktreePath}" -b ${branch} ${actualBase}`, {
        cwd: this.repoRoot,
        stdio: 'pipe',
        timeout: 30000,
      })
    } catch (e) {
      const err = e as { stderr?: Buffer }
      const msg = (err.stderr || '').toString()
      if (msg.includes('already exists') || msg.includes('already checked out')) {
        throw new Error(`Worktree exists: ${msg.slice(0, 80)}`)
      }
      throw new Error(`Failed to create worktree: ${msg.slice(0, 120)}`)
    }

    const state: WorktreeState = {
      id,
      agentId,
      featureName,
      branch,
      worktreePath: resolve(worktreePath),
      baseBranch: actualBase,
      createdAt: new Date().toISOString(),
      status: 'active',
    }

    this.manifests.set(id, state)
    this.saveManifest(state)

    return state
  }

  async merge(state: WorktreeState): Promise<boolean> {
    try {
      const currentBranch = this.currentBranch()
      execSync(`git merge ${state.branch} --no-edit`, {
        cwd: this.repoRoot,
        stdio: 'pipe',
        timeout: 30000,
      })
      state.status = 'merged'
      this.saveManifest(state)
      return true
    } catch (e) {
      const err = e as { stderr?: Buffer }
      const msg = (err.stderr || '').toString()
      if (msg.includes('CONFLICT')) {
        try {
          execSync(`git merge --abort`, { cwd: this.repoRoot, stdio: 'pipe', timeout: 10000 })
        } catch {
          // best effort
        }
      }
      return false
    }
  }

  async cleanup(state: WorktreeState): Promise<boolean> {
    try {
      execSync(`git worktree remove "${state.worktreePath}" --force`, {
        cwd: this.repoRoot,
        stdio: 'pipe',
        timeout: 15000,
      })

      try {
        execSync(`git branch -D ${state.branch}`, {
          cwd: this.repoRoot,
          stdio: 'pipe',
          timeout: 10000,
        })
      } catch {
        // branch may not exist
      }

      state.status = 'cleaned'
      this.saveManifest(state)
      return true
    } catch (e) {
      const err = e as { stderr?: Buffer }
      const msg = (err.stderr || '').toString()
      if (msg.includes('is not a working tree')) {
        state.status = 'cleaned'
        this.saveManifest(state)
        return true
      }
      return false
    }
  }

  async list(): Promise<WorktreeState[]> {
    return [...this.manifests.values()]
  }

  async listActive(): Promise<WorktreeState[]> {
    return [...this.manifests.values()].filter((s) => s.status === 'active')
  }

  async listForFeature(featureName: string): Promise<WorktreeState[]> {
    return [...this.manifests.values()].filter((s) => s.featureName === featureName)
  }

  async createIsolatedAgent(
    agentId: AgentId,
    featureName: string,
    fn: (worktreePath: string) => Promise<boolean>,
  ): Promise<{ success: boolean; state: WorktreeState }> {
    const state = await this.create(agentId, featureName)
    const success = await fn(state.worktreePath)

    if (success) {
      await this.merge(state)
    }

    await this.cleanup(state)
    return { success, state }
  }

  private findGitRoot(cwd: string): string {
    try {
      const result = execSync('git rev-parse --show-toplevel', {
        cwd,
        stdio: 'pipe',
        timeout: 5000,
      })
      return result.toString().trim()
    } catch {
      throw new Error(`Not a git repository: ${cwd}`)
    }
  }

  private currentBranch(): string {
    try {
      const result = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.repoRoot,
        stdio: 'pipe',
        timeout: 5000,
      })
      return result.toString().trim()
    } catch {
      return 'main'
    }
  }

  private manifestPath(id: string): string {
    return join(this.worktreesDir, `${id}.json`)
  }

  private saveManifest(state: WorktreeState): void {
    const p = this.manifestPath(state.id)
    writeFileSync(p, JSON.stringify(state, null, 2), 'utf-8')
  }

  private loadManifests(): void {
    if (!existsSync(this.worktreesDir)) return
    try {
      const { readdirSync } = require('fs')
      for (const file of readdirSync(this.worktreesDir)) {
        if (!file.endsWith('.json')) continue
        try {
          const manifest = JSON.parse(readFileSync(join(this.worktreesDir, file), 'utf-8'))
          this.manifests.set(manifest.id, manifest as WorktreeState)
        } catch {
          // skip invalid
        }
      }
    } catch {
      // dir may not exist
    }
  }
}
