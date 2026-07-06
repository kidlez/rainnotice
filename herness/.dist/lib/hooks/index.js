"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookManager = void 0;
class HookManager {
    hooks;
    constructor() {
        this.hooks = new Map();
    }
    key(agentId, event) {
        return `${agentId}:${event}`;
    }
    on(agentId, event, handler) {
        const k = this.key(agentId, event);
        if (!this.hooks.has(k))
            this.hooks.set(k, []);
        this.hooks.get(k).push(handler);
    }
    off(agentId, event, handler) {
        const k = this.key(agentId, event);
        if (!handler) {
            this.hooks.delete(k);
            return;
        }
        const list = this.hooks.get(k);
        if (list) {
            this.hooks.set(k, list.filter(h => h !== handler));
        }
    }
    async fire(agentId, event, context, result) {
        const keys = [this.key(agentId, event), this.key('*', event)];
        for (const k of keys) {
            const handlers = this.hooks.get(k);
            if (!handlers)
                continue;
            for (const handler of handlers) {
                try {
                    const allowed = await handler(context, result);
                    if (allowed === false)
                        return false;
                }
                catch (err) {
                    console.error(`Hook error [${agentId}:${event}]:`, err instanceof Error ? err.message : String(err));
                }
            }
        }
        return true;
    }
    async firePreToolUse(agentId, operation, args) {
        return this.fire(agentId, 'preToolUse', {
            agentId,
            operation,
            args,
            timestamp: new Date().toISOString(),
        });
    }
    async firePostToolUse(agentId, operation, result) {
        await this.fire(agentId, 'postToolUse', {
            agentId,
            operation,
            args: {},
            timestamp: new Date().toISOString(),
        }, result);
    }
    async fireGuardViolation(agentId, violation) {
        await this.fire(agentId, 'onGuardViolation', {
            agentId,
            operation: 'guard_violation',
            args: violation,
            timestamp: violation.timestamp,
        });
    }
    async fireError(agentId, error) {
        await this.fire(agentId, 'onError', {
            agentId,
            operation: 'error',
            args: { message: error.message, stack: error.stack || '' },
            timestamp: new Date().toISOString(),
        });
    }
    count() {
        let total = 0;
        for (const list of this.hooks.values())
            total += list.length;
        return total;
    }
}
exports.HookManager = HookManager;
//# sourceMappingURL=index.js.map