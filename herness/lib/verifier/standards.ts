import { execSync } from 'child_process'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import { VerificationTask, VerificationResult, VerificationSeverity } from '../../shared/types'

function runCommand(cwd: string, cmd: string, args: string[]): { ok: boolean; output: string } {
  try {
    execSync(`${cmd} ${args.join(' ')}`, { cwd, stdio: 'pipe', timeout: 60000 })
    return { ok: true, output: '' }
  } catch (e) {
    const err = e as { stderr?: Buffer; stdout?: Buffer }
    return { ok: false, output: (err.stderr || err.stdout || '').toString().slice(0, 800) }
  }
}

function walkTsFiles(dir: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      results.push(...walkTsFiles(full))
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.func.test.ts')) {
      results.push(full)
    }
  }
  return results
}

export class StandardsVerifier {
  constructor(private featuresDir: string) {}

  async verify(task: VerificationTask, signal?: AbortSignal): Promise<VerificationResult> {
    const start = Date.now()
    const checks: VerificationResult['checks'] = {}
    const failures: Array<{ check: string; detail: string; severity: VerificationSeverity }> = []

    for (const check of task.checks) {
      if (task.tier === 'light' && !['compile', 'typecheck', 'code_style'].includes(check)) {
        checks[check] = 'skipped'
        continue
      }
      switch (check) {
        case 'compile': {
          const result = runCommand(task.featurePath, 'npx', ['tsc', '--noEmit'])
          checks[check] = result.ok ? 'passed' : 'failed'
          if (!result.ok) failures.push({ check, detail: result.output, severity: 'critical' })
          break
        }
        case 'typecheck': {
          const tsconfig = join(task.featurePath, 'tsconfig.json')
          if (!existsSync(tsconfig)) { checks[check] = 'skipped'; break }
          const result = runCommand(task.featurePath, 'npx', ['tsc', '--noEmit'])
          checks[check] = result.ok ? 'passed' : 'failed'
          if (!result.ok) failures.push({ check, detail: result.output, severity: 'critical' })
          break
        }
        case 'lint': {
          const eslintNames = ['.eslintrc', '.eslintrc.json', '.eslintrc.js', '.eslintrc.yaml', '.eslintrc.yml', 'eslint.config.js']
          const hasEslint = eslintNames.some(n => existsSync(join(task.featurePath, n)))
          if (!hasEslint) { checks[check] = 'skipped'; break }
          const result = runCommand(task.featurePath, 'npx', ['eslint', '.'])
          checks[check] = result.ok ? 'passed' : 'failed'
          if (!result.ok) failures.push({ check, detail: result.output, severity: 'warning' })
          break
        }
        case 'design_coverage': {
          const artifacts = task.designArtifacts
          if (!artifacts) { checks[check] = 'skipped'; break }
          const sections = artifacts.designDoc.match(/^##\s+(.+)/gm)
          if (!sections) { checks[check] = 'skipped'; break }
          const srcDir = join(task.featurePath, 'src')
          const missing: string[] = []
          for (const s of sections) {
            const name = s.replace(/^##\s+/, '').trim()
            if (name === '概述' || name === '任务列表' || name.startsWith('访谈')) continue
            if (name === '数据模型' || name === 'Types') {
              if (!existsSync(join(srcDir, 'types.ts'))) missing.push('数据模型/types.ts')
            } else if (name === '模块划分' || name === 'Modules') {
              if (!existsSync(join(srcDir, 'index.ts'))) missing.push('模块划分')
            }
          }
          checks[check] = missing.length === 0 ? 'passed' : 'failed'
          if (missing.length > 0) failures.push({ check, detail: `Missing: ${missing.join(', ')}`, severity: 'warning' })
          break
        }
        case 'code_style': {
          const srcDir = join(task.featurePath, 'src')
          const issues: string[] = []
          for (const file of walkTsFiles(srcDir)) {
            const content = readFileSync(file, 'utf-8')
            const todos = content.match(/\/\/\s*TODO/g)
            const anys = content.match(/:\s*any\b/g)
            const fname = basename(file)
            if (todos) issues.push(`${fname}: ${todos.length} TODO(s)`)
            if (anys) issues.push(`${fname}: ${anys.length} 'any' type(s)`)
          }
          checks[check] = issues.length === 0 ? 'passed' : 'failed'
          if (issues.length > 0) failures.push({ check, detail: issues.join('; '), severity: 'warning' })
          break
        }
        default: {
          checks[check] = 'skipped'
          break
        }
      }
      if (signal?.aborted) {
        return {
          type: 'standards',
          passed: false,
          severity: 'warning',
          checks,
          failures: [...failures, { check: '(aborted)', detail: 'Circuit breaker tripped', severity: 'warning' }],
          durationMs: Date.now() - start,
          aborted: true,
        }
      }
    }

    const allOk = Object.values(checks).every(r => r === 'passed' || r === 'skipped')
    const severity: VerificationSeverity = 
      failures.some(f => f.severity === 'critical') ? 'critical' :
      failures.length > 0 ? 'warning' : 'info'
    return {
      type: 'standards',
      passed: allOk,
      severity,
      checks,
      failures,
      durationMs: Date.now() - start,
      aborted: false,
    }
  }
}
