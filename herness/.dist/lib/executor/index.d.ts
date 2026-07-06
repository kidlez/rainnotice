import { TestPlan } from '../../shared/types';
import { Guard } from '../guard';
import { CheckpointManager } from '../safety';
import { WorktreeManager } from '../isolation/worktree';
export declare class Developer {
    private featuresDir;
    private agentId;
    private guard;
    private checkpointMgr;
    private worktreeMgr;
    constructor(featuresDir: string, guard?: Guard, checkpointMgr?: CheckpointManager, worktreeMgr?: WorktreeManager);
    generateCode(design: {
        featureName: string;
        types: string;
        modules: string[];
        interfaces: string[];
        testPlan?: TestPlan;
    }): Promise<{
        filePath: string;
        content: string;
    }[]>;
    generateCodeInWorktree(design: {
        featureName: string;
        types: string;
        modules: string[];
        interfaces: string[];
        testPlan?: TestPlan;
    }): Promise<{
        files: {
            filePath: string;
            content: string;
        }[];
        worktree: any;
    }>;
    createFile(featureName: string, relativePath: string, content: string): Promise<string>;
    createEntryPoint(featureName: string, exports: string[]): Promise<string>;
    generateTests(featureName: string, testPlan: TestPlan): Promise<{
        filePath: string;
        content: string;
    }[]>;
    private generateUnitTestFile;
    private generateFunctionalTestFile;
}
//# sourceMappingURL=index.d.ts.map