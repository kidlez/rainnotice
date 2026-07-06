import { ReflectionInput, ReflectionOutput } from '../../shared/types';
import { TraceStore } from '../store/trace';
import { Guard } from '../guard';
export declare class Reflector {
    private featuresDir;
    private traceStore;
    private guard?;
    private agentId;
    constructor(featuresDir: string, traceStore: TraceStore, guard?: Guard | undefined);
    reflect(input: ReflectionInput): Promise<ReflectionOutput>;
    private classifyErrors;
    private diagnose;
    private generateFixes;
    private shouldRetry;
    private extractLessons;
    private deriveRootCause;
    private labelForType;
    private describePattern;
    private extractFilePath;
}
//# sourceMappingURL=index.d.ts.map