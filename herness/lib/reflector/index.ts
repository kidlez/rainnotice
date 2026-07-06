import { ReflectionInput, ReflectionOutput } from '../../shared/types'
import type { AgentId } from '../../shared/types'
import { TraceStore } from '../store/trace'
import { Guard } from '../guard'

export class Reflector {
  private agentId: AgentId = 'reflector'

  constructor(
    private featuresDir: string,
    private traceStore: TraceStore,
    private guard?: Guard
  ) {}

  async reflect(input: ReflectionInput): Promise<ReflectionOutput> {
    const classified = this.classifyErrors(input.errorDetails)

    const diagnosis = this.diagnose(classified)

    const similarTraces = await this.traceStore.queryFixPatterns(classified)

    const suggestedFixes = this.generateFixes(
      classified,
      input.featureName,
      input.designDoc,
      similarTraces
    )

    const retryRecommended = this.shouldRetry(classified)

    const lessons = this.extractLessons(classified, diagnosis)

    const rootCause = this.deriveRootCause(classified, diagnosis)

    return {
      diagnosis,
      rootCause,
      suggestedFixes,
      retryRecommended,
      lessons,
    }
  }

  private classifyErrors(
    errorDetails: string[]
  ): Array<{
    type:
      | 'type_error'
      | 'missing_import'
      | 'null_reference'
      | 'syntax_error'
      | 'test_assertion'
      | 'unknown'
    detail: string
    confidence: 'high' | 'medium' | 'low'
  }> {
    if (!errorDetails || errorDetails.length === 0) return []

    return errorDetails.map((detail) => {
      const lower = detail.toLowerCase()

      if (
        /cannot find module/i.test(lower) ||
        /module.*not found/i.test(lower) ||
        /cannot find (name|module|package)/i.test(lower) ||
        /ts(2307|2304|7016)/i.test(detail)
      ) {
        return {
          type: 'missing_import',
          detail,
          confidence: 'high',
        }
      }

      if (
        /is not assignable/i.test(lower) ||
        /type.*not assignable/i.test(lower) ||
        /property.*does not exist/i.test(lower) ||
        /has no property/i.test(lower) ||
        /is not a property of/i.test(lower) ||
        /type.*not compatible/i.test(lower) ||
        /ts(2322|2339|2345|2532|2551)/i.test(detail)
      ) {
        return {
          type: 'type_error',
          detail,
          confidence: 'medium',
        }
      }

      if (
        /cannot read propert/i.test(lower) ||
        /is null/i.test(lower) ||
        /is undefined/i.test(lower) ||
        /null.*reference/i.test(lower) ||
        /cannot read.*of (null|undefined)/i.test(lower) ||
        /cannot call.*of (null|undefined)/i.test(lower) ||
        /ts(2531|2532|2533|18047)/i.test(detail)
      ) {
        return {
          type: 'null_reference',
          detail,
          confidence: 'high',
        }
      }

      if (
        /unexpected token/i.test(lower) ||
        /syntaxerror/i.test(lower) ||
        /unterminated/i.test(lower) ||
        /missing (semicolon|closing|bracket|parenthes)/i.test(lower) ||
        /ts(1005|1128|1160|1161)/i.test(detail)
      ) {
        return {
          type: 'syntax_error',
          detail,
          confidence: 'high',
        }
      }

      if (
        /expected/i.test(lower) &&
        /received/i.test(lower) ||
        /\bassert/i.test(lower) ||
        /\bexpect/i.test(lower) ||
        /assertion.*fail/i.test(lower) ||
        /expected.*but got/i.test(lower) ||
        /toBe\(\)/i.test(lower) ||
        /toEqual\(\)/i.test(lower) ||
        /snapshot.*mismatch/i.test(lower)
      ) {
        return {
          type: 'test_assertion',
          detail,
          confidence: 'medium',
        }
      }

      return {
        type: 'unknown',
        detail,
        confidence: 'low',
      }
    })
  }

  private diagnose(
    errors: Array<{ type: string; detail: string }>
  ): string {
    if (!errors || errors.length === 0) {
      return 'No errors to diagnose. All checks passed.'
    }

    const groups: Record<string, { count: number; samples: string[] }> = {}

    for (const err of errors) {
      if (!groups[err.type]) {
        groups[err.type] = { count: 0, samples: [] }
      }
      groups[err.type].count++
      if (groups[err.type].samples.length < 2) {
        groups[err.type].samples.push(err.detail)
      }
    }

    const lines: string[] = [`## Reflection Analysis`]

    lines.push('')
    lines.push('### Error Summary')
    const sorted = Object.entries(groups).sort((a, b) => b[1].count - a[1].count)
    for (const [type, group] of sorted) {
      const label = this.labelForType(type)
      lines.push(`- **${label}**: ${group.count} occurrence${group.count !== 1 ? 's' : ''}`)
    }

    lines.push('')
    lines.push('### Pattern Analysis')
    for (const [type, group] of sorted) {
      const label = this.labelForType(type)
      lines.push(`- ${label}: ${this.describePattern(type, group.count)}`)
      for (const sample of group.samples) {
        const truncated = sample.length > 120 ? sample.slice(0, 120) + '...' : sample
        lines.push(`  - \`${truncated}\``)
      }
    }

    lines.push('')
    lines.push(`### Total: ${errors.length} error(s) across ${sorted.length} categor${sorted.length === 1 ? 'y' : 'ies'}`)

    return lines.join('\n')
  }

  private generateFixes(
    errors: Array<{ type: string; detail: string; confidence: string }>,
    featureName: string,
    designDoc: string,
    similarTraces: Array<{ fixPattern: string; confidence: string }>
  ): Array<{ file: string; description: string; confidence: 'high' | 'medium' | 'low' }> {
    const fixes: Array<{ file: string; description: string; confidence: 'high' | 'medium' | 'low' }> = []

    const seen = new Set<string>()

    for (const error of errors) {
      switch (error.type) {
        case 'missing_import': {
          const pkgMatch = error.detail.match(/['"](\S+)['"]/)
          const pkgName = pkgMatch?.[1] || 'unknown'
          const isTypePackage = pkgName.startsWith('@types/')

          if (isTypePackage) {
            fixes.push({
              file: `${featureName}/package.json`,
              description: `Install missing type declarations: \`npm install --save-dev ${pkgName}\``,
              confidence: 'high',
            })
          } else {
            const parsedFile = this.extractFilePath(error.detail, featureName)
            fixes.push({
              file: parsedFile || `${featureName}/src/index.ts`,
              description: `Add import statement for '${pkgName}' or verify the module is installed`,
              confidence: error.confidence === 'high' ? 'high' : 'medium',
            })
          }
          break
        }

        case 'type_error': {
          const parsedFile = this.extractFilePath(error.detail, featureName)
          fixes.push({
            file: parsedFile || `${featureName}/src/types.ts`,
            description: `Check type definitions against the design document. Ensure all interfaces and return types match the specification.`,
            confidence: 'medium',
          })
          break
        }

        case 'null_reference': {
          const parsedFile = this.extractFilePath(error.detail, featureName)
          fixes.push({
            file: parsedFile || `${featureName}/src/index.ts`,
            description: `Add null guard or optional chaining before accessing the property. Consider adding a runtime check or default value.`,
            confidence: 'medium',
          })
          break
        }

        case 'syntax_error': {
          const parsedFile = this.extractFilePath(error.detail, featureName)
          fixes.push({
            file: parsedFile || `${featureName}/src/index.ts`,
            description: `Fix syntax error. Check for missing brackets, semicolons, or unexpected tokens near the reported location.`,
            confidence: 'high',
          })
          break
        }

        case 'test_assertion': {
          fixes.push({
            file: `${featureName}/src/__tests__`,
            description: `Review test expectations against the design document's acceptance criteria. Update test assertions to match expected behavior.`,
            confidence: 'medium',
          })
          break
        }

        case 'unknown': {
          fixes.push({
            file: `${featureName}/src`,
            description: `Review the failing code for issues. Consider running individual checks to isolate the problem.`,
            confidence: 'low',
          })
          break
        }
      }
    }

    for (const trace of similarTraces) {
      const key = trace.fixPattern.slice(0, 80)
      if (seen.has(key)) continue
      seen.add(key)

      fixes.push({
        file: `${featureName}/src`,
        description: `[From similar trace] ${trace.fixPattern}`,
        confidence: trace.confidence === 'high' ? 'high' : trace.confidence === 'medium' ? 'medium' : 'low',
      })
    }

    return fixes
  }

  private shouldRetry(errors: Array<{ type: string; confidence: string }>): boolean {
    if (!errors || errors.length === 0) return false
    if (errors.length >= 10) return false

    const unknownCount = errors.filter(e => e.type === 'unknown').length
    if (unknownCount > 0) return false

    const highOrMedium = errors.filter(
      e => e.confidence === 'high' || e.confidence === 'medium'
    ).length

    return highOrMedium > errors.length / 2
  }

  private extractLessons(
    errors: Array<{ type: string; detail: string }>,
    diagnosis: string
  ): string[] {
    if (!errors || errors.length === 0) {
      return ['All checks passed — no regressions to report.']
    }

    const lessons: string[] = []
    const typeCounts = new Map<string, number>()

    for (const err of errors) {
      typeCounts.set(err.type, (typeCounts.get(err.type) || 0) + 1)
    }

    if (typeCounts.has('type_error')) {
      const count = typeCounts.get('type_error')!
      lessons.push(
        count > 1
          ? `Type definitions need better alignment with the design spec — ${count} type errors suggest the implementation drifted from the documented interfaces.`
          : `Verify type definitions match the design spec — a type error indicates a mismatch between implementation and documented interfaces.`
      )
    }

    if (typeCounts.has('null_reference')) {
      lessons.push(
        `Guard against nullable values with optional chaining (?.) or null-checks before property access.`
      )
    }

    if (typeCounts.has('missing_import')) {
      lessons.push(
        `Ensure all dependencies are installed and imported before referencing them in code.`
      )
    }

    if (typeCounts.has('test_assertion')) {
      lessons.push(
        `Test assertions should be derived directly from acceptance criteria to avoid expectations that diverge from the design.`
      )
    }

    if (typeCounts.has('syntax_error')) {
      lessons.push(
        `Verify syntax after code generation — automated syntax errors suggest the template or generation logic needs review.`
      )
    }

    if (typeCounts.has('unknown')) {
      lessons.push(
        `Investigate uncategorized errors to improve classification rules for future reflection cycles.`
      )
    }

    if (lessons.length === 0) {
      lessons.push(`Review the diagnosis for patterns that can inform future development cycles.`)
    }

    while (lessons.length > 3) {
      lessons.pop()
    }

    return lessons
  }

  private deriveRootCause(
    errors: Array<{ type: string; detail: string }>,
    diagnosis: string
  ): string {
    if (!errors || errors.length === 0) {
      return 'No failures — root cause analysis not applicable.'
    }

    const typeCounts = new Map<string, number>()
    for (const err of errors) {
      typeCounts.set(err.type, (typeCounts.get(err.type) || 0) + 1)
    }

    const sorted = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])
    const dominant = sorted[0]

    switch (dominant[0]) {
      case 'type_error':
        return `Type definition drift — ${dominant[1]} type error(s) indicate the implementation's types deviate from the design specification.`
      case 'missing_import':
        return `Missing dependencies — ${dominant[1]} import error(s) suggest dependencies or type declarations were not installed.`
      case 'null_reference':
        return `Unhandled nullability — ${dominant[1]} null reference error(s) indicate missing guards for optional or nullable values.`
      case 'syntax_error':
        return `Syntax issues — ${dominant[1]} syntax error(s) suggest malformed code generation or manual editing errors.`
      case 'test_assertion':
        return `Misaligned expectations — ${dominant[1]} test assertion failure(s) indicate tests don't match the current implementation or acceptance criteria.`
      case 'unknown':
        return `Unclassified failures — ${dominant[1]} uncategorized error(s) require manual investigation.`
      default:
        return `Multiple failure categories — ${sorted.length} distinct error types detected across ${errors.length} total errors.`
    }
  }

  private labelForType(type: string): string {
    switch (type) {
      case 'type_error':
        return 'Type Error'
      case 'missing_import':
        return 'Missing Import'
      case 'null_reference':
        return 'Null Reference'
      case 'syntax_error':
        return 'Syntax Error'
      case 'test_assertion':
        return 'Test Assertion'
      case 'unknown':
        return 'Unknown Error'
      default:
        return type.replace(/_/g, ' ')
    }
  }

  private describePattern(type: string, count: number): string {
    switch (type) {
      case 'type_error':
        return count > 1
          ? `Multiple type mismatches detected. The implementation's type annotations may need to be aligned with the design document's interface definitions.`
          : `A type mismatch suggests the implementation does not conform to the expected interface.`
      case 'missing_import':
        return `Module or type definition not found. Ensure the dependency is listed in package.json and imported correctly.`
      case 'null_reference':
        return `Code attempted to access a property on a null or undefined value. Add guards before the access.`
      case 'syntax_error':
        return `The code has invalid syntax. Check for missing delimiters or unexpected characters.`
      case 'test_assertion':
        return `Test assertions did not match the actual output. Verify expectations against the acceptance criteria.`
      case 'unknown':
        return `Errors that do not match known patterns. Manual investigation may be required.`
      default:
        return `Error pattern detected across ${count} occurrence(s).`
    }
  }

  private extractFilePath(
    errorDetail: string,
    featureName: string
  ): string | null {
    const pathPatterns = [
      /(?:^|\s)\(?(\S+\.(?:ts|tsx|js|jsx))\(\d+[,:]\d+\)/,
      /at\s+(?:Object\.)?<anonymous>\s*\((\S+\.(?:ts|tsx|js|jsx)):\d+:\d+\)/,
      /(?:^|\s)(\S+\/(?:\S+\/)*\S+\.(?:ts|tsx|js|jsx))\b/,
      /in\s+(\S+\.(?:ts|tsx|js|jsx))/,
    ]

    for (const pattern of pathPatterns) {
      const match = errorDetail.match(pattern)
      if (match?.[1]) {
        const filePath = match[1]
        if (filePath.includes(featureName)) {
          return filePath.slice(filePath.indexOf(featureName))
        }
        if (filePath.startsWith('src/') || filePath.startsWith('lib/')) {
          return `${featureName}/${filePath}`
        }
        return filePath
      }
    }

    return null
  }
}
