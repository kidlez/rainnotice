import type { AgentId, AgentPermission, Violation, GuardReport } from '../../shared/types';
export declare class Guard {
    private permissions;
    private violations;
    private opCounts;
    constructor(permissions: AgentPermission[]);
    assertRead(agentId: AgentId, targetPath: string): void;
    assertWrite(agentId: AgentId, targetPath: string): void;
    assertExec(agentId: AgentId): void;
    assertHandoffRead(agentId: AgentId): void;
    assertHandoffWrite(agentId: AgentId): void;
    getOpCount(agentId: AgentId): number;
    getViolations(): Violation[];
    getViolationsFor(agentId: AgentId): Violation[];
    report(): GuardReport;
    reset(): void;
    getPermission(agentId: AgentId): AgentPermission;
    private checkOpLimit;
    private bump;
    private recordViolation;
    static createDefaults(rootDir: string, devkitDir: string): AgentPermission[];
}
//# sourceMappingURL=index.d.ts.map