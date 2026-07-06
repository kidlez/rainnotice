import * as fs from 'fs'
import * as path from 'path'
import {
  ACVerification,
  CriticQuestion,
  VictoryVerdict,
  VictoryGateConfig,
  TestPlan,
  DesignArtifacts,
  ValidationReport,
} from '../../shared/types'

function walkFiles(dir: string, ext: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, ext))
    } else if (entry.name.endsWith(ext)) {
      results.push(full)
    }
  }
  return results
}

const DEFAULT_CONFIG: VictoryGateConfig = {
  requireACVerification: true,
  requireDesignCoverage: true,
  requireCriticReview: true,
  requireEdgeCaseProbing: true,
  minimumBar: [
    'no_todo_in_src',
    'all_tests_pass',
    'no_any_type_leak',
    'all_imports_resolve',
    'coverage_file_exists',
  ],
  maxRetries: 3,
}

const CRITIC_PATTERNS: Record<CriticQuestion['category'], string[]> = {
  completeness: [
    '所有验收标准是否都有对应的测试用例？',
    '设计文档中提到的每个模块都生成了代码吗？',
    '有没有文档要求但未实现的功能？',
    '接口文档提到的所有 endpoint 都实现了吗？',
  ],
  correctness: [
    '类型定义与实际生成的代码一致吗？',
    '接口返回值与设计文档的约定匹配吗？',
    '错误处理是否覆盖了所有设计文档提到的异常场景？',
  ],
  edge_case: [
    '输入为空时的行为是否定义且正确？',
    '并发请求时数据一致性是否保证？',
    '依赖不可用时的降级策略是否实现？',
    '超大输入/超时场景是否处理？',
  ],
  spec_gap: [
    '设计文档中是否有"待确认"或模糊描述？',
    '验收标准是否全部可量化验证？',
    '有没有隐含假设被写成代码但没有文档化？',
  ],
  assumption: [
    '有没有假设"用户一定已登录"但未校验？',
    '有没有假设"数据一定存在"但未处理 null？',
    '有没有硬编码的值应该从配置读取？',
    '有没有假设单线程但实际可能并发？',
  ],
}

const MINIMUM_BAR_CHECKS: Record<string, (srcDir: string) => { satisfied: boolean; detail: string }> = {
  no_todo_in_src(srcDir: string) {
    const todos: string[] = []
    if (!fs.existsSync(srcDir)) return { satisfied: true, detail: 'no src dir to check' }
    for (const file of walkFiles(srcDir, '.ts')) {
      const content = fs.readFileSync(file, 'utf-8')
      const matches = content.match(/\/\/\s*TODO/g)
      if (matches) {
        todos.push(`${path.basename(file)}: ${matches.length} TODO(s)`)
      }
    }
    return {
      satisfied: todos.length === 0,
      detail: todos.length === 0 ? 'ok' : todos.join('; '),
    }
  },

  all_tests_pass(_srcDir: string) {
    return { satisfied: true, detail: 'verified by Validator' }
  },

  no_any_type_leak(srcDir: string) {
    const anys: string[] = []
    if (!fs.existsSync(srcDir)) return { satisfied: true, detail: 'no src dir to check' }
    for (const file of walkFiles(srcDir, '.ts')) {
      const content = fs.readFileSync(file, 'utf-8')
      const matches = content.match(/: any\b/g)
      if (matches) {
        anys.push(`${path.basename(file)}: ${matches.length}`)
      }
    }
    return {
      satisfied: anys.length === 0,
      detail: anys.length === 0 ? 'ok' : `"any" found in ${anys.join(', ')}`,
    }
  },

  all_imports_resolve(_srcDir: string) {
    return { satisfied: true, detail: 'verified by tsc --noEmit' }
  },

  coverage_file_exists(srcDir: string) {
    const testDir = path.join(path.dirname(srcDir), '__tests__')
    const hasTests =
      fs.existsSync(testDir) &&
      fs.readdirSync(testDir).filter((f) => f.endsWith('.test.ts')).length > 0
    return {
      satisfied: hasTests,
      detail: hasTests ? 'ok' : 'no test files found',
    }
  },
}

export class VictoryGate {
  private retryCount = 0
  private previousVerdicts: VictoryVerdict[] = []

  constructor(
    private featuresDir: string,
    private config: VictoryGateConfig = DEFAULT_CONFIG,
  ) {}

  async evaluate(
    featureName: string,
    designArtifacts: DesignArtifacts,
    validationReport: ValidationReport,
    testPlan?: TestPlan,
  ): Promise<VictoryVerdict> {
    this.retryCount++

    const featurePath = path.join(this.featuresDir, featureName)
    const srcDir = path.join(featurePath, 'src')
    const featureContent = this.readFeatureDoc(featureName)

    const acVerifications = this.config.requireACVerification
      ? this.verifyAcceptanceCriteria(featureContent, testPlan, featurePath)
      : []

    const designCoverage = this.config.requireDesignCoverage
      ? this.checkDesignCoverage(designArtifacts, srcDir)
      : { totalSections: 0, covered: 0, missing: [] }

    const criticQuestions = this.config.requireCriticReview
      ? this.runCriticReview(featureContent, designArtifacts, srcDir)
      : []

    const edgeCasesChecked = this.config.requireEdgeCaseProbing
      ? this.probeEdgeCases(featureContent, srcDir)
      : []

    const minimumBarResults = this.config.minimumBar.map((rule) => {
      const checker = MINIMUM_BAR_CHECKS[rule]
      if (!checker) return { rule, satisfied: false }
      const result = checker(srcDir)
      return { rule, satisfied: result.satisfied }
    })

    const blockingIssues: string[] = []

    for (const ac of acVerifications) {
      if (ac.status === 'unverified') {
        blockingIssues.push(`AC not verified: "${ac.acText.slice(0, 60)}"`)
      }
    }

    if (!validationReport.passed) {
      blockingIssues.push(`Validation failed: ${validationReport.failures.map(f => f.check).join(', ')}`)
    }

    if (designCoverage.missing.length > 0) {
      blockingIssues.push(`Design sections not covered: ${designCoverage.missing.join(', ')}`)
    }

    const criticalQuestions = criticQuestions.filter((q) => q.assessment === 'failed')
    for (const q of criticalQuestions) {
      blockingIssues.push(`[${q.category}] ${q.question}`)
    }

    for (const bar of minimumBarResults) {
      if (!bar.satisfied) {
        blockingIssues.push(`Minimum bar failed: ${bar.rule}`)
      }
    }

    const retryHints: string[] = []

    if (this.retryCount < this.config.maxRetries) {
      for (const issue of blockingIssues) {
        const hint = this.generateRetryHint(issue, featureContent, designArtifacts)
        if (hint) retryHints.push(hint)
      }
    }

    if (this.retryCount >= this.config.maxRetries) {
      blockingIssues.push(`Max retries (${this.config.maxRetries}) exceeded`)
      retryHints.push(
        `已达到最大重试次数 ${this.config.maxRetries}。建议手动审查 blockingIssues。`,
      )
    }

    const totalChecks =
      acVerifications.length +
      criticQuestions.length +
      minimumBarResults.length
    const failedChecks = blockingIssues.length
    const confidence = totalChecks > 0
      ? Math.round(((totalChecks - failedChecks) / totalChecks) * 100)
      : 0

    const verdict: VictoryVerdict = {
      passed: blockingIssues.length === 0,
      stage: `attempt ${this.retryCount}/${this.config.maxRetries}`,
      acVerifications,
      criticQuestions,
      designCoverage,
      edgeCasesChecked,
      minimumBarResults,
      blockingIssues,
      retryHints,
      confidence,
    }

    this.previousVerdicts.push(verdict)

    if (!verdict.passed && this.retryCount <= this.config.maxRetries) {
      const improved = this.hasImproved(verdict)
      if (!improved) {
        verdict.blockingIssues.push('No improvement from previous attempt — consider manual intervention')
      }
    }

    return verdict
  }

  getRetryCount(): number {
    return this.retryCount
  }

  getPreviousVerdicts(): VictoryVerdict[] {
    return [...this.previousVerdicts]
  }

  private verifyAcceptanceCriteria(
    featureContent: string,
    testPlan: TestPlan | undefined,
    featurePath: string,
  ): ACVerification[] {
    const acSection = featureContent.match(/##\s*验收标准\s*\n([\s\S]*?)(?=\n##|$)/)
    if (!acSection) return []

    const acLines = acSection[1]
      .split('\n')
      .filter((l) => l.match(/-\s*\[.?\]\s/))
      .map((l) => l.replace(/-\s*\[.?\]\s*/, '').trim())

    return acLines.map((ac, index) => {
      const evidence: string[] = []
      const gaps: string[] = []

      const hasTestCoverage =
        testPlan?.functionalTests.some(
          (t) =>
            t.coverageTarget.includes(ac.slice(0, 20)) ||
            ac.toLowerCase().includes(t.description.toLowerCase().slice(0, 20)),
        ) ||
        testPlan?.unitTests.some(
          (t) =>
            t.coverageTarget.includes(ac.slice(0, 20)) ||
            ac.toLowerCase().includes(t.description.toLowerCase().slice(0, 20)),
        )

      if (hasTestCoverage) {
        evidence.push('test case found in TestPlan')
      } else {
        gaps.push('no test case covers this AC')
      }

      const testDir = path.join(featurePath, '__tests__')
      if (fs.existsSync(testDir)) {
        const testFiles = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.ts'))
        for (const tf of testFiles) {
          const content = fs.readFileSync(path.join(testDir, tf), 'utf-8')
          if (content.toLowerCase().includes(ac.toLowerCase().slice(0, 20))) {
            evidence.push(`referenced in ${tf}`)
          }
        }
        if (evidence.length === 0) {
          gaps.push('no test file references this AC')
        }
      } else {
        gaps.push('no __tests__ directory exists')
      }

      const status: ACVerification['status'] =
        evidence.length >= 2
          ? 'verified'
          : evidence.length === 1
            ? 'disputed'
            : 'unverified'

      return {
        acIndex: index + 1,
        acText: ac,
        status,
        evidence: evidence.join('; '),
        gaps,
      }
    })
  }

  private checkDesignCoverage(
    artifacts: DesignArtifacts,
    srcDir: string,
  ): { totalSections: number; covered: number; missing: string[] } {
    const sections = artifacts.designDoc.match(/^##\s+(.+)/gm)
    if (!sections) return { totalSections: 0, covered: 0, missing: [] }

    const sectionNames = sections
      .map((s) => s.replace(/^##\s+/, '').trim())
      .filter((s) => !['概述', 'Overview', '任务列表', 'Task Breakdown'].includes(s) && !s.startsWith('访谈'))

    const missing: string[] = []

    for (const section of sectionNames) {
      let found = false

      if (section === '数据模型' || section === 'Types') {
        found = fs.existsSync(path.join(srcDir, 'types.ts'))
      } else if (section === '模块划分' || section === 'Modules') {
        found = fs.existsSync(path.join(srcDir, 'index.ts'))
      } else if (section === '接口契约' || section === 'Interfaces') {
        found = this.searchInDir(srcDir, /export\s+(interface|type|class)\s+\w+/)
      } else {
        found = true
      }

      if (!found) {
        missing.push(section)
      }
    }

    return {
      totalSections: sectionNames.length,
      covered: sectionNames.length - missing.length,
      missing,
    }
  }

  private runCriticReview(
    featureContent: string,
    artifacts: DesignArtifacts,
    srcDir: string,
  ): CriticQuestion[] {
    const questions: CriticQuestion[] = []
    let id = 0

    for (const [category, patterns] of Object.entries(CRITIC_PATTERNS)) {
      for (const pattern of patterns) {
        id++
        let assessment: CriticQuestion['assessment'] = 'passed'
        let detail = ''

        switch (category) {
          case 'completeness':
            detail = '检查中'
            if (!fs.existsSync(srcDir)) {
              assessment = 'failed'
              detail = 'src 目录不存在 — 代码可能未生成'
            } else {
              const files = this.walkFiles(srcDir, '.ts')
              if (files.length === 0) {
                assessment = 'failed'
                detail = 'src 目录为空 — 没有代码文件'
              } else {
                assessment = 'flagged'
                detail = `${files.length} 个 .ts 文件`
              }
            }
            break

          case 'correctness': {
            const typesFile = path.join(srcDir, 'types.ts')
            if (fs.existsSync(typesFile)) {
              const content = fs.readFileSync(typesFile, 'utf-8')
              const hasUnknown = content.includes(': unknown')
              const hasAny = content.includes(': any')
              if (hasUnknown && hasAny) {
                assessment = 'failed'
                detail = '类型定义包含 "unknown" 和 "any" — 不够明确'
              } else if (hasAny) {
                assessment = 'failed'
                detail = '类型定义包含 "any" — 需要更具体的类型'
              } else if (hasUnknown) {
                assessment = 'flagged'
                detail = '类型定义使用 "unknown" — 可接受但需确认'
              } else {
                assessment = 'passed'
                detail = '类型定义具体明确'
              }
            } else {
              assessment = 'failed'
              detail = 'types.ts 不存在'
            }
            break
          }

          case 'edge_case': {
            const allSrc = this.readAllSrc(srcDir)
            const hasNullGuard = allSrc.includes('if (') || allSrc.includes('?.')
            const hasErrorHandle = allSrc.includes('catch') || allSrc.includes('try {')
            if (hasNullGuard && hasErrorHandle) {
              assessment = 'flagged'
              detail = '检测到 null guard 和 try-catch，需确认覆盖度'
            } else {
              assessment = 'failed'
              detail = '未检测到 null guard 或错误处理 — 可能遗漏边界情况'
            }
            break
          }

          case 'spec_gap': {
            const unresolved = artifacts.interview?.questions?.filter(
              (q) => !q.resolved,
            )
            if (unresolved && unresolved.length > 0) {
              assessment = 'failed'
              detail = `仍有 ${unresolved.length} 个设计问题未确认`
            } else {
              assessment = 'passed'
              detail = '所有设计问题已确认'
            }
            break
          }

          case 'assumption': {
            const allSrc = this.readAllSrc(srcDir)
            const hasHardcoded = /\bconst\s+\w+\s*=\s*['"`][^'"`]{3,}['"`]/.test(allSrc)
            if (hasHardcoded) {
              assessment = 'flagged'
              detail = '代码中包含硬编码字符串 — 可能有隐含假设'
            } else {
              assessment = 'passed'
              detail = '未发现明显硬编码'
            }
            break
          }
        }

        questions.push({
          id: `CR-${String(id).padStart(3, '0')}`,
          category: category as CriticQuestion['category'],
          question: pattern,
          assessment,
          detail,
        })
      }
    }

    return questions
  }

  private probeEdgeCases(featureContent: string, srcDir: string): string[] {
    const cases: string[] = []
    const lower = featureContent.toLowerCase()

    if (/登录|login|auth|认证|授权/i.test(lower)) {
      cases.push('Edge: 错误密码多次尝试后被锁定？')
      cases.push('Edge: token 过期后的刷新流程？')
      cases.push('Edge: 跨设备同时登录的行为？')
    }

    if (/支付|payment|交易|transaction/i.test(lower)) {
      cases.push('Edge: 重复提交同一笔支付？')
      cases.push('Edge: 支付超时但实际已扣款？')
      cases.push('Edge: 金额精度和货币转换？')
    }

    if (/数据|data|列表|list/i.test(lower)) {
      cases.push('Edge: 空列表/零数据的展示？')
      cases.push('Edge: 10000+ 条数据的性能？')
      cases.push('Edge: 网络断开时的本地缓存？')
    }

    if (/文件|file|上传|upload|下载|download/i.test(lower)) {
      cases.push('Edge: 超大文件（1GB+）的处理？')
      cases.push('Edge: 上传中断后的断点续传？')
      cases.push('Edge: 文件类型过滤和恶意文件检测？')
    }

    return cases
  }

  private readFeatureDoc(featureName: string): string {
    const featurePath = path.join(this.featuresDir, `${featureName}.feature.md`)
    if (!fs.existsSync(featurePath)) {
      const altPath = path.join(this.featuresDir, featureName, `${featureName}.feature.md`)
      if (fs.existsSync(altPath)) return fs.readFileSync(altPath, 'utf-8')
    }
    if (fs.existsSync(featurePath)) return fs.readFileSync(featurePath, 'utf-8')
    return ''
  }

  private readAllSrc(srcDir: string): string {
    if (!fs.existsSync(srcDir)) return ''
    return this.walkFiles(srcDir, '.ts')
      .map((f) => fs.readFileSync(f, 'utf-8'))
      .join('\n')
  }

  private walkFiles(dir: string, ext: string): string[] {
    const results: string[] = []
    if (!fs.existsSync(dir)) return results
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...this.walkFiles(full, ext))
      } else if (entry.name.endsWith(ext)) {
        results.push(full)
      }
    }
    return results
  }

  private searchInDir(dir: string, pattern: RegExp): boolean {
    for (const file of this.walkFiles(dir, '.ts')) {
      if (pattern.test(fs.readFileSync(file, 'utf-8'))) return true
    }
    return false
  }

  private generateRetryHint(
    issue: string,
    _featureContent: string,
    _artifacts: DesignArtifacts,
  ): string {
    if (issue.includes('AC not verified')) {
      return issue + ' → 为该 AC 添加测试用例并重新验证'
    }
    if (issue.includes('any')) {
      return issue + ' → 将 "any" 替换为具体类型'
    }
    if (issue.includes('TODO')) {
      return issue + ' → 完成或移除 TODO 注释'
    }
    if (issue.includes('coverage')) {
      return issue + ' → 确保 __tests__/ 目录有测试文件'
    }
    if (issue.includes('unknown')) {
      return issue + ' → 考虑用更具体的类型替换 unknown'
    }
    if (issue.includes('Max retries')) {
      return issue + ' → 停止自动重试，人工介入'
    }
    return issue + ' → 人工审查并修复'
  }

  private hasImproved(current: VictoryVerdict): boolean {
    if (this.previousVerdicts.length < 2) return true
    const prev = this.previousVerdicts[this.previousVerdicts.length - 2]
    return current.confidence >= prev.confidence
  }
}
