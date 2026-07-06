import { AgentId, HookEvent, HookContext, HookHandler, ToolUseResult, Violation } from '../../shared/types';
export declare class HookManager {
    private hooks;
    constructor();
    private key;
    on(agentId: AgentId | '*', event: HookEvent, handler: HookHandler): void;
    off(agentId: AgentId | '*', event: HookEvent, handler?: HookHandler): void;
    fire(agentId: AgentId, event: HookEvent, context: HookContext, result?: ToolUseResult): Promise<boolean>;
    firePreToolUse(agentId: AgentId, operation: string, args: Record<string, unknown>): Promise<boolean>;
    firePostToolUse(agentId: AgentId, operation: string, result: ToolUseResult): Promise<void>;
    fireGuardViolation(agentId: AgentId, violation: Violation): Promise<void>;
    fireError(agentId: AgentId, error: Error): Promise<void>;
    count(): number;
}
//# sourceMappingURL=index.d.ts.map