import * as path from 'path'
import type { AgentId, AgentPermission, Violation, GuardReport } from '../../shared/types'
import { isWithinDir } from '../../shared/utils/path'

export class Guard {
  private permissions: Map<AgentId, AgentPermission>
  private violations: Violation[]
  private opCounts: Map<AgentId, number>

  constructor(permissions: AgentPermission[]) {
    this.permissions = new Map()
    this.violations = []
    this.opCounts = new Map()

    for (const p of permissions) {
      this.permissions.set(p.agentId, p)
      this.opCounts.set(p.agentId, 0)
    }
  }

  assertRead(agentId: AgentId, targetPath: string): void {
    const perm = this.getPermission(agentId)
    this.checkOpLimit(agentId, perm)

    const resolved = path.resolve(targetPath)

    for (const forbidden of perm.forbiddenPaths) {
      if (isWithinDir(resolved, path.resolve(forbidden))) {
        this.recordViolation(agentId, 'read', targetPath, `forbidden path "${forbidden}"`)
        return
      }
    }

    for (const allowed of perm.readPaths) {
      if (isWithinDir(resolved, path.resolve(allowed))) {
        this.bump(agentId)
        return
      }
    }

    this.recordViolation(agentId, 'read', targetPath, 'no matching read path')
  }

  assertWrite(agentId: AgentId, targetPath: string): void {
    const perm = this.getPermission(agentId)
    this.checkOpLimit(agentId, perm)

    const resolved = path.resolve(targetPath)

    for (const forbidden of perm.forbiddenPaths) {
      if (isWithinDir(resolved, path.resolve(forbidden))) {
        this.recordViolation(agentId, 'write', targetPath, `forbidden path "${forbidden}"`)
        return
      }
    }

    for (const allowed of perm.writePaths) {
      if (isWithinDir(resolved, path.resolve(allowed))) {
        this.bump(agentId)
        return
      }
    }

    this.recordViolation(agentId, 'write', targetPath, 'no matching write path')
  }

  assertExec(agentId: AgentId): void {
    const perm = this.getPermission(agentId)

    if (!perm.canExec) {
      this.recordViolation(agentId, 'exec', 'child_process', 'exec not allowed')
    }

    this.checkOpLimit(agentId, perm)
    this.bump(agentId)
  }

  assertHandoffRead(agentId: AgentId): void {
    const perm = this.getPermission(agentId)

    if (!perm.canReadHandoff) {
      this.recordViolation(agentId, 'handoff_read', 'handoff.md', 'handoff read not allowed')
    }

    this.checkOpLimit(agentId, perm)
    this.bump(agentId)
  }

  assertHandoffWrite(agentId: AgentId): void {
    const perm = this.getPermission(agentId)

    if (!perm.canWriteHandoff) {
      this.recordViolation(agentId, 'handoff_write', 'handoff.md', 'handoff write not allowed')
    }

    this.checkOpLimit(agentId, perm)
    this.bump(agentId)
  }

  getOpCount(agentId: AgentId): number {
    return this.opCounts.get(agentId) || 0
  }

  getViolations(): Violation[] {
    return [...this.violations]
  }

  getViolationsFor(agentId: AgentId): Violation[] {
    return this.violations.filter((v) => v.agentId === agentId)
  }

  report(): GuardReport {
    const allClean = this.violations.length === 0
    const totalOps: Record<string, number> = {}
    for (const [id, count] of this.opCounts) {
      totalOps[id] = count
    }

    return {
      violations: [...this.violations],
      totalOps: totalOps as Record<AgentId, number>,
      allClean,
    }
  }

  reset(): void {
    this.violations = []
  }

  getPermission(agentId: AgentId): AgentPermission {
    const perm = this.permissions.get(agentId)
    if (!perm) {
      throw new Error(`No permissions registered for agent "${agentId}"`)
    }
    return perm
  }

  private checkOpLimit(agentId: AgentId, perm: AgentPermission): void {
    const count = this.opCounts.get(agentId) || 0
    if (count >= perm.maxFileOps) {
      this.recordViolation(
        agentId,
        'write',
        '(any)',
        `exceeded max operations (${perm.maxFileOps})`,
      )
    }
  }

  private bump(agentId: AgentId): void {
    this.opCounts.set(agentId, (this.opCounts.get(agentId) || 0) + 1)
  }

  private recordViolation(
    agentId: AgentId,
    operation: Violation['operation'],
    target: string,
    reason: string,
  ): void {
    this.violations.push({
      agentId,
      operation,
      target,
      reason,
      timestamp: new Date().toISOString(),
    })
  }

  static createDefaults(rootDir: string, devkitDir: string): AgentPermission[] {
    const absRoot = path.resolve(rootDir)
    const absDevkit = path.resolve(devkitDir)

    return [
      {
        agentId: 'orchestrator',
        readPaths: [absRoot],
        writePaths: [absDevkit],
        forbiddenPaths: [],
        canReadHandoff: true,
        canWriteHandoff: true,
        maxFileOps: 500,
        canExec: false,
      },
      {
        agentId: 'planner',
        readPaths: [path.join(absRoot, 'features'), path.join(absDevkit, 'context', 'planner')],
        writePaths: [path.join(absDevkit, 'context', 'planner')],
        forbiddenPaths: [path.join(absRoot, 'lib'), path.join(absRoot, 'shared')],
        canReadHandoff: false,
        canWriteHandoff: false,
        maxFileOps: 100,
        canExec: false,
      },
      {
        agentId: 'designer',
        readPaths: [path.join(absRoot, 'features')],
        writePaths: [],
        forbiddenPaths: [path.join(absRoot, 'lib'), path.join(absRoot, 'shared')],
        canReadHandoff: false,
        canWriteHandoff: false,
        maxFileOps: 200,
        canExec: false,
      },
      {
        agentId: 'developer',
        readPaths: [path.join(absRoot, 'features')],
        writePaths: [path.join(absRoot, 'features')],
        forbiddenPaths: [
          path.join(absRoot, 'docs'),
          path.join(absRoot, 'lib'),
          path.join(absRoot, 'shared'),
          absDevkit,
        ],
        canReadHandoff: false,
        canWriteHandoff: false,
        maxFileOps: 200,
        canExec: false,
      },
      {
        agentId: 'validator',
        readPaths: [path.join(absRoot, 'features'), absDevkit],
        writePaths: [],
        forbiddenPaths: [
          path.join(absRoot, 'lib'),
          path.join(absRoot, 'shared'),
        ],
        canReadHandoff: false,
        canWriteHandoff: false,
        maxFileOps: 300,
        canExec: true,
      },
      {
        agentId: 'reflector',
        readPaths: [
          path.join(absRoot, 'features'),
          path.join(absDevkit, 'archive', 'traces'),
        ],
        writePaths: [],
        forbiddenPaths: [
          path.join(absRoot, 'lib'),
          path.join(absRoot, 'shared'),
        ],
        canReadHandoff: false,
        canWriteHandoff: false,
        maxFileOps: 200,
        canExec: false,
      },
      {
        agentId: 'documenter',
        readPaths: [absRoot],
        writePaths: [path.join(absRoot, 'docs')],
        forbiddenPaths: [
          path.join(absRoot, 'lib'),
          path.join(absRoot, 'features'),
          path.join(absRoot, 'shared'),
        ],
        canReadHandoff: false,
        canWriteHandoff: false,
        maxFileOps: 100,
        canExec: false,
      },
      {
        agentId: 'archiver',
        readPaths: [absRoot],
        writePaths: [path.join(absDevkit, 'archive')],
        forbiddenPaths: [
          path.join(absRoot, 'lib'),
          path.join(absRoot, 'features'),
          path.join(absRoot, 'docs'),
        ],
        canReadHandoff: false,
        canWriteHandoff: false,
        maxFileOps: 100,
        canExec: false,
      },
    ]
  }
}
