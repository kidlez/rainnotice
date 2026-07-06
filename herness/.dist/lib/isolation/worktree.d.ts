import { WorktreeState, AgentId } from '../../shared/types';
export declare class WorktreeManager {
    private worktreesDir;
    private repoRoot;
    private manifests;
    constructor(repoRoot?: string);
    getRepoRoot(): string;
    create(agentId: AgentId, featureName: string, baseBranch?: string): Promise<WorktreeState>;
    merge(state: WorktreeState): Promise<boolean>;
    cleanup(state: WorktreeState): Promise<boolean>;
    list(): Promise<WorktreeState[]>;
    listActive(): Promise<WorktreeState[]>;
    listForFeature(featureName: string): Promise<WorktreeState[]>;
    createIsolatedAgent(agentId: AgentId, featureName: string, fn: (worktreePath: string) => Promise<boolean>): Promise<{
        success: boolean;
        state: WorktreeState;
    }>;
    private findGitRoot;
    private currentBranch;
    private manifestPath;
    private saveManifest;
    private loadManifests;
}
//# sourceMappingURL=worktree.d.ts.map