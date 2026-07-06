import type { AgentId, HandoffState, OrchestratorConfig } from '../../shared/types';
import { Guard } from '../guard';
export declare class Orchestrator {
    private config;
    private handoffStore;
    private contextStore;
    private guard;
    constructor(config: OrchestratorConfig);
    getGuard(): Guard;
    start(): Promise<void>;
    private runFlow;
    private resume;
    dispatch(agentId: AgentId, taskId: string): Promise<void>;
    waitFor(agentId: AgentId): Promise<HandoffState>;
    getProgress(): Promise<{
        current: string;
        completed: string[];
        pending: string[];
    }>;
    generateReport(): Promise<string>;
}
//# sourceMappingURL=index.d.ts.map