import type { Task, TaskSize } from '../../shared/types';
import { Guard } from '../guard';
export declare class Planner {
    private featuresDir;
    private guard?;
    private weightsPath;
    private weights;
    private pendingDeviations;
    private agentId;
    constructor(featuresDir: string, guard?: Guard | undefined);
    parseFeatureDoc(featurePath: string): Promise<{
        id: string;
        name: string;
        description: string;
        acceptanceCriteria: string[];
        existingTasks: Task[];
    }>;
    decompose(featurePath: string): Promise<Task[]>;
    buildDependencyGraph(tasks: Task[]): Promise<{
        taskId: string;
        dependsOn: string[];
    }[]>;
    sortByPriority(tasks: Task[]): Promise<Task[]>;
    recordDeviation(taskId: string, estimated: TaskSize, actual: TaskSize, actualHours: number): void;
    evolveIfReady(): Promise<boolean>;
    private loadWeights;
    private saveWeights;
    private _classifyTaskType;
    private _estimatePriority;
    private _estimateSize;
    private _parseTasks;
    private _topologicalSort;
    private _generateDefaultTasks;
}
//# sourceMappingURL=index.d.ts.map