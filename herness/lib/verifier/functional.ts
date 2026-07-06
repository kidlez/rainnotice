import { execSync } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { VerificationTask, VerificationResult, VerificationSeverity, TestPlan } from '../../shared/types'

function runCommand(cwd: string, cmd: string, args: string[]): { ok: boolean; output: string } {
  try {
    const result = execSync(`${cmd} ${args.join(' ')}`, { cwd, stdio: 'pipe', timeout: 120000 })
    return { ok: true, output: result.toString() }
  } catch (e) {
    const err = e as { stderr?: Buffer; stdout?: Buffer }
    return { ok: false, output: (err.stderr || err.stdout || '').toString().slice(0, 1000) }
  }
}

function detectTestRunner(cwd: string): 'vitest' | 'jest' | null {
  if (existsSync(join(cwd, 'vitest.config.ts')) || existsSync(join(cwd, 'vitest.config.js'))) return 'vitest'
  if (existsSync(join(cwd, 'jest.config.ts')) || existsSync(join(cwd, 'jest.config.js'))) return 'jest'
  return null
}

export class FunctionalVerifier {
  constructor(private featuresDir: string) {}

  async verify(task: VerificationTask, signal?: AbortSignal): Promise<VerificationResult> {
    const start = Date.now()
    const checks: VerificationResult['checks'] = {}
    const failures: Array<{ check: string; detail: string; severity: VerificationSeverity }> = []

    for (const check of task.checks) {
      if (task.tier === 'light' && !['unit_test', 'functional_test'].includes(check)) {
        checks[check] = 'skipped'
        continue
      }
      switch (check) {
        case 'unit_test': {
          const testFile = join(task.featurePath, '__tests__', `${task.featureName}.test.ts`)
          if (!existsSync(testFile)) { checks[check] = 'skipped'; break }
          const runner = detectTestRunner(task.featurePath)
          if (!runner) { checks[check] = 'skipped'; failures.push({ check, detail: 'No test runner configured', severity: 'warning' }); break }
          const result = runCommand(task.featurePath, 'npx', [runner, 'run', `${task.featureName}.test`])
          checks[check] = result.ok ? 'passed' : 'failed'
          if (!result.ok) failures.push({ check, detail: result.output, severity: 'warning' })
          break
        }
        case 'functional_test': {
          const funcFile = join(task.featurePath, '__tests__', `${task.featureName}.func.test.ts`)
          if (!existsSync(funcFile)) { checks[check] = 'skipped'; break }
          const runner = detectTestRunner(task.featurePath)
          if (!runner) { checks[check] = 'skipped'; failures.push({ check, detail: 'No test runner configured', severity: 'warning' }); break }
          const result = runCommand(task.featurePath, 'npx', [runner, 'run', `${task.featureName}.func.test`])
          checks[check] = result.ok ? 'passed' : 'failed'
          if (!result.ok) failures.push({ check, detail: result.output, severity: 'warning' })
          break
        }
        case 'regression_test': {
          const targets = task.testPlan?.regressionTargets || []
          const regFailures: string[] = []
          for (const target of targets) {
            const targetDir = join(this.featuresDir, target)
            if (!existsSync(targetDir)) continue
            const testDir = join(targetDir, '__tests__')
            if (!existsSync(testDir)) continue
            const testFiles = readdirSync(testDir).filter(f => f.endsWith('.test.ts'))
            const runner = detectTestRunner(targetDir)
            if (!runner) continue
            for (const tf of testFiles) {
              const testName = tf.replace(/\.test\.ts$/, '')
              const result = runCommand(targetDir, 'npx', [runner, 'run', testName])
              if (!result.ok) regFailures.push(`${target}/${testName}: ${result.output.slice(0, 200)}`)
            }
          }
          checks[check] = regFailures.length === 0 ? (targets.length === 0 ? 'skipped' : 'passed') : 'failed'
          for (const rf of regFailures) failures.push({ check, detail: rf, severity: 'critical' })
          break
        }
        case 'ac_coverage': {
          const testPlan = task.testPlan
          if (!testPlan) { checks[check] = 'skipped'; break }
          const funcTests = testPlan.functionalTests.length
          const totalAC = task.designArtifacts?.interview?.featureContent
            ? (task.designArtifacts.interview.featureContent.match(/-\s*\[.?\]\s/g) || []).length
            : 0
          if (funcTests === 0) { checks[check] = 'skipped'; failures.push({ check, detail: 'No functional test cases in TestPlan', severity: 'warning' }); break }
          if (totalAC === 0) { checks[check] = 'skipped'; break }
          checks[check] = funcTests >= totalAC ? 'passed' : 'failed'
          if (funcTests < totalAC) failures.push({ check, detail: `Only ${funcTests}/${totalAC} ACs have test cases`, severity: 'warning' })
          break
        }
        default: {
          checks[check] = 'skipped'
          break
        }
      }
      if (signal?.aborted) {
        return {
          type: 'functional',
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
      type: 'functional',
      passed: allOk,
      severity,
      checks,
      failures,
      durationMs: Date.now() - start,
      aborted: false,
    }
  }
}
