import { Checkpoint, AgentId } from '../../shared/types';
export declare class CheckpointManager {
    private devkitDir;
    constructor(devkitDir: string);
    checkpointDir(): string;
    create(agentId: AgentId, operation: string, featureName: string, filePaths: string[]): Promise<Checkpoint>;
    rollback(checkpoint: Checkpoint): Promise<string[]>;
    commit(checkpoint: Checkpoint): Promise<void>;
    list(): Promise<Checkpoint[]>;
    findForFeature(featureName: string): Promise<Checkpoint[]>;
    getLatest(featureName: string): Promise<Checkpoint | null>;
    private hash;
}
//# sourceMappingURL=checkpoint.d.ts.map