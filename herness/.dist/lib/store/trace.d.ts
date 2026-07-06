import { TaskTrace } from '../../shared/types';
export declare class TraceStore {
    private devkitDir;
    constructor(devkitDir: string);
    tracesDir(): string;
    save(trace: TaskTrace): Promise<string>;
    load(featureId: string, taskId: string): Promise<TaskTrace | null>;
    findByFeature(featureId: string): Promise<TaskTrace[]>;
    findSimilar(similarityTags: string[], limit?: number): Promise<TaskTrace[]>;
    queryFixPatterns(errors: Array<{
        type: string;
        detail: string;
    }>): Promise<Array<{
        fixPattern: string;
        confidence: string;
    }>>;
    extractKeywords(text: string): Promise<string[]>;
    private serialize;
    private deserialize;
    private parseBodySections;
    private parseErrors;
}
//# sourceMappingURL=trace.d.ts.map