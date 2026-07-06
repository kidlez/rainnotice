import { AgentId, HookEvent, HookContext, HookHandler, ToolUseResult, Violation } from '../../shared/types'

export class HookManager {
  private hooks: Map<string, HookHandler[]>

  constructor() {
    this.hooks = new Map()
  }

  private key(agentId: AgentId | '*', event: HookEvent): string {
    return `${agentId}:${event}`
  }

  on(agentId: AgentId | '*', event: HookEvent, handler: HookHandler): void {
    const k = this.key(agentId, event)
    if (!this.hooks.has(k)) this.hooks.set(k, [])
    this.hooks.get(k)!.push(handler)
  }

  off(agentId: AgentId | '*', event: HookEvent, handler?: HookHandler): void {
    const k = this.key(agentId, event)
    if (!handler) {
      this.hooks.delete(k)
      return
    }
    const list = this.hooks.get(k)
    if (list) {
      this.hooks.set(k, list.filter(h => h !== handler))
    }
  }

  async fire(agentId: AgentId, event: HookEvent, context: HookContext, result?: ToolUseResult): Promise<boolean> {
    const keys = [this.key(agentId, event), this.key('*', event)]
    for (const k of keys) {
      const handlers = this.hooks.get(k)
      if (!handlers) continue
      for (const handler of handlers) {
        try {
          const allowed = await handler(context, result)
          if (allowed === false) return false
        } catch (err) {
          console.error(`Hook error [${agentId}:${event}]:`, err instanceof Error ? err.message : String(err))
        }
      }
    }
    return true
  }

  async firePreToolUse(agentId: AgentId, operation: string, args: Record<string, unknown>): Promise<boolean> {
    return this.fire(agentId, 'preToolUse', {
      agentId,
      operation,
      args,
      timestamp: new Date().toISOString(),
    })
  }

  async firePostToolUse(agentId: AgentId, operation: string, result: ToolUseResult): Promise<void> {
    await this.fire(agentId, 'postToolUse', {
      agentId,
      operation,
      args: {},
      timestamp: new Date().toISOString(),
    }, result)
  }

  async fireGuardViolation(agentId: AgentId, violation: Violation): Promise<void> {
    await this.fire(agentId, 'onGuardViolation', {
      agentId,
      operation: 'guard_violation',
      args: violation as unknown as Record<string, unknown>,
      timestamp: violation.timestamp,
    })
  }

  async fireError(agentId: AgentId, error: Error): Promise<void> {
    await this.fire(agentId, 'onError', {
      agentId,
      operation: 'error',
      args: { message: error.message, stack: error.stack || '' },
      timestamp: new Date().toISOString(),
    })
  }

  count(): number {
    let total = 0
    for (const list of this.hooks.values()) total += list.length
    return total
  }
}
