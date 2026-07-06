import { AgentProgress } from '../../shared/types';
export declare class SessionMonitor {
    private devkitDir;
    constructor(devkitDir: string);
    getProgress(): AgentProgress[];
    summary(): string;
    watch(intervalMs?: number): () => void;
}
//# sourceMappingURL=index.d.ts.map