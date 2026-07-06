export { Orchestrator } from '../orchestrator';
export { Planner } from '../planner';
export { Designer } from '../designer';
export { Developer } from '../executor';
export { Validator } from '../validator';
export { VictoryGate } from '../victory-gate';
export { Reflector } from '../reflector';
export { Guard } from '../guard';
export { HandoffStore, ContextStore, ArchiveStore, TraceStore, } from '../store';
export { CheckpointManager, withCheckpoint, TrashBin, } from '../safety';
export type { AgentId, AgentStatus, FeatureStatus, Priority, TaskSize, HandoffState, Task, FeatureDoc, TestCase, TestPlan, ValidationReport, RegressionReport, VerificationTask, VerificationResult, ParallelVerificationReport, CircuitBreakerState, KnowledgeCard, TaskTrace, ReflectionInput, ReflectionOutput, PlannerWeights, DesignQuestion, DesignInterview, DesignArtifacts, VictoryVerdict, VictoryGateConfig, Checkpoint, TransactionOutcome, TrashEntry, GuardReport, Violation, AgentPermission, OrchestratorConfig, VerificationTier, VerificationType, VerificationSeverity, HookEvent, HookContext, HookHandler, AgentMemoryEntry, AgentProgress, } from '../../shared/types';
import { Planner } from '../planner';
import { Designer } from '../designer';
import { Guard } from '../guard';
import { VerificationTier } from '../../shared/types';
export declare class Pipeline {
    private featuresDir;
    private devkitDir;
    private guard;
    private checkpointMgr;
    constructor(rootDir?: string, devkitDir?: string);
    getGuard(): Guard;
    plan(featureName: string): Promise<{
        tasks: import("../../shared/types").Task[];
        sorted: import("../../shared/types").Task[];
        planner: Planner;
    }>;
    design(featureName: string, tasks: any[]): Promise<{
        questions: import("../../shared/types").DesignQuestion[];
        designer: Designer;
    }>;
    verify(featureName: string, designArtifacts?: any, testPlan?: any, tier?: VerificationTier): Promise<import("../../shared/types").ParallelVerificationReport>;
    gate(featureName: string, designArtifacts: any, report: any, testPlan?: any): Promise<import("../../shared/types").VictoryVerdict>;
}
export declare function createPipeline(rootDir?: string): Pipeline;
//# sourceMappingURL=index.d.ts.map