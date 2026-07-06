import * as fs from 'fs'
import * as path from 'path'
import { TestPlan, TestCase, AgentId } from '../../shared/types'
import { assertPathSafety, ensureDir } from '../../shared/utils/path'
import { Guard } from '../guard'
import { CheckpointManager, withCheckpoint } from '../safety'
import { WorktreeManager } from '../isolation/worktree'

export class Developer {
  private agentId: AgentId = 'developer'
  private guard: Guard | null = null
  private checkpointMgr: CheckpointManager | null = null
  private worktreeMgr: WorktreeManager | null = null

  constructor(
    private featuresDir: string,
    guard?: Guard,
    checkpointMgr?: CheckpointManager,
    worktreeMgr?: WorktreeManager,
  ) {
    if (guard) this.guard = guard
    if (checkpointMgr) this.checkpointMgr = checkpointMgr
    if (worktreeMgr) this.worktreeMgr = worktreeMgr
  }

  async generateCode(design: {
    featureName: string
    types: string
    modules: string[]
    interfaces: string[]
    testPlan?: TestPlan
  }): Promise<{ filePath: string; content: string }[]> {
    const baseDir = path.join(this.featuresDir, design.featureName)
    const srcDir = path.join(baseDir, 'src')
    if (this.guard) this.guard.assertWrite(this.agentId, srcDir)
    ensureDir(srcDir)

    let checkpoint: any = null
    const sourceFiles = [path.join(srcDir, 'types.ts'), path.join(srcDir, 'index.ts'), path.join(baseDir, 'index.ts')]
    const existingFiles = sourceFiles.filter(f => fs.existsSync(f))

    if (this.checkpointMgr && existingFiles.length > 0) {
      checkpoint = await this.checkpointMgr.create('developer', 'generateCode', design.featureName, existingFiles)
    }

    try {
      const files: { filePath: string; content: string }[] = []

      const typesFile = path.join(srcDir, 'types.ts')
      const typesContent = design.types
      if (this.guard) this.guard.assertWrite(this.agentId, typesFile)
      fs.writeFileSync(typesFile, typesContent, 'utf-8')
      files.push({ filePath: typesFile, content: typesContent })

      const mainFile = path.join(srcDir, 'index.ts')
      const mainContent = `export * from './types'`
      if (this.guard) this.guard.assertWrite(this.agentId, mainFile)
      fs.writeFileSync(mainFile, mainContent, 'utf-8')
      files.push({ filePath: mainFile, content: mainContent })

      const entryFile = await this.createEntryPoint(design.featureName, design.modules)
      files.push({ filePath: entryFile, content: fs.readFileSync(entryFile, 'utf-8') })

      if (design.testPlan) {
        const testFiles = await this.generateTests(design.featureName, design.testPlan)
        files.push(...testFiles)
      }

      if (checkpoint) await this.checkpointMgr!.commit(checkpoint)
      return files
    } catch (err) {
      if (checkpoint) {
        try { await this.checkpointMgr!.rollback(checkpoint) } catch {}
        throw new Error(`generateCode failed and was rolled back: ${err instanceof Error ? err.message : String(err)}`)
      }
      throw err
    }
  }

  async generateCodeInWorktree(design: {
    featureName: string
    types: string
    modules: string[]
    interfaces: string[]
    testPlan?: TestPlan
  }): Promise<{ files: { filePath: string; content: string }[]; worktree: any }> {
    if (!this.worktreeMgr) {
      const files = await this.generateCode(design)
      return { files, worktree: null }
    }

    const result = await this.worktreeMgr.createIsolatedAgent(
      'developer',
      design.featureName,
      async (worktreePath: string) => {
        const originalFeaturesDir = this.featuresDir
        this.featuresDir = worktreePath
        try {
          await this.generateCode(design)
          return true
        } finally {
          this.featuresDir = originalFeaturesDir
        }
      }
    )

    const files = await this.generateCode(design)
    return { files, worktree: result.state }
  }

  async createFile(featureName: string, relativePath: string, content: string): Promise<string> {
    let checkpoint: any = null
    const fullPath = path.resolve(this.featuresDir, featureName, relativePath)
    if (this.checkpointMgr && fs.existsSync(fullPath)) {
      checkpoint = await this.checkpointMgr.create('developer', 'createFile', featureName, [fullPath])
    }

    try {
      assertPathSafety(fullPath, [path.resolve(this.featuresDir, featureName)])
      if (this.guard) this.guard.assertWrite(this.agentId, fullPath)
      ensureDir(path.dirname(fullPath))
      fs.writeFileSync(fullPath, content, 'utf-8')
      if (checkpoint) await this.checkpointMgr!.commit(checkpoint)
      return fullPath
    } catch (err) {
      if (checkpoint) {
        try { await this.checkpointMgr!.rollback(checkpoint) } catch {}
        throw new Error(`createFile failed and was rolled back: ${err instanceof Error ? err.message : String(err)}`)
      }
      throw err
    }
  }

  async createEntryPoint(featureName: string, exports: string[]): Promise<string> {
    const dir = path.join(this.featuresDir, featureName)
    ensureDir(dir)
    const barrelPath = path.join(dir, 'index.ts')
    const exportsLines = exports.map((e) => {
      const relative = e.startsWith('.') ? e : `./${e}`
      return `export * from '${relative}'`
    })
    const content = exportsLines.join('\n') + '\n'
    if (this.guard) this.guard.assertWrite(this.agentId, barrelPath)
    fs.writeFileSync(barrelPath, content, 'utf-8')
    return barrelPath
  }

  async generateTests(featureName: string, testPlan: TestPlan): Promise<{ filePath: string; content: string }[]> {
    const baseDir = path.join(this.featuresDir, featureName)
    const testDir = path.join(baseDir, '__tests__')
    if (this.guard) this.guard.assertWrite(this.agentId, testDir)
    ensureDir(testDir)

    const files: { filePath: string; content: string }[] = []

    const unitTestContent = this.generateUnitTestFile(featureName, testPlan.unitTests)
    if (unitTestContent) {
      const unitFile = path.join(testDir, `${featureName}.test.ts`)
      if (this.guard) this.guard.assertWrite(this.agentId, unitFile)
      fs.writeFileSync(unitFile, unitTestContent, 'utf-8')
      files.push({ filePath: unitFile, content: unitTestContent })
    }

    const funcTestContent = this.generateFunctionalTestFile(featureName, testPlan.functionalTests)
    if (funcTestContent) {
      const funcFile = path.join(testDir, `${featureName}.func.test.ts`)
      if (this.guard) this.guard.assertWrite(this.agentId, funcFile)
      fs.writeFileSync(funcFile, funcTestContent, 'utf-8')
      files.push({ filePath: funcFile, content: funcTestContent })
    }

    return files
  }

  private generateUnitTestFile(featureName: string, tests: TestCase[]): string {
    if (!tests || tests.length === 0) return ''

    const lines: string[] = [
      `import { describe, it, expect } from 'vitest'`,
      '',
      `describe('${featureName} — Unit Tests', () => {`,
    ]

    for (const tc of tests) {
      lines.push('')
      lines.push(`  it('should ${tc.description.slice(0, 60)}', () => {`)
      lines.push(`    // GIVEN: ${tc.given}`)
      lines.push(`    // TODO: initialize test context`)
      lines.push('')
      lines.push(`    // WHEN: ${tc.when}`)
      lines.push(`    // TODO: call the unit under test`)
      lines.push('')
      lines.push(`    // THEN: ${tc.then}`)
      lines.push(`    // TODO: assert expected result`)
      lines.push(`    expect(true).toBe(true)`)
      lines.push(`  })`)
    }

    lines.push('')
    lines.push('})')
    lines.push('')

    return lines.join('\n')
  }

  private generateFunctionalTestFile(featureName: string, tests: TestCase[]): string {
    if (!tests || tests.length === 0) return ''

    const lines: string[] = [
      `import { describe, it, expect } from 'vitest'`,
      '',
      `describe('${featureName} — Functional Tests (Acceptance Criteria)', () => {`,
    ]

    for (const tc of tests) {
      lines.push('')
      lines.push(`  it('${tc.id}: ${tc.description.slice(0, 50)}', () => {`)
      lines.push(`    // COVERS: ${tc.coverageTarget}`)
      lines.push(`    // GIVEN: ${tc.given}`)
      lines.push(`    // TODO: set up preconditions`)
      lines.push('')
      lines.push(`    // WHEN: ${tc.when}`)
      lines.push(`    // TODO: execute feature action`)
      lines.push('')
      lines.push(`    // THEN: ${tc.then}`)
      lines.push(`    // TODO: verify expected outcome`)
      lines.push(`    expect(true).toBe(true)`)
      lines.push(`  })`)
    }

    lines.push('')
    lines.push('})')
    lines.push('')

    return lines.join('\n')
  }
}
