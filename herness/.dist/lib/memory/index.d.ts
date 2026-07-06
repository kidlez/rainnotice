import { AgentMemoryEntry, AgentId } from '../../shared/types';
export declare class AgentMemory {
    private devkitDir;
    private memoryDir;
    constructor(devkitDir: string);
    private memoryPath;
    read(agentId: AgentId): Promise<AgentMemoryEntry[]>;
    readByCategory(agentId: AgentId, category: AgentMemoryEntry['category']): Promise<AgentMemoryEntry[]>;
    append(agentId: AgentId, category: AgentMemoryEntry['category'], content: string, source?: string): Promise<void>;
    rememberDecision(agentId: AgentId, decision: string): Promise<void>;
    rememberConvention(agentId: AgentId, convention: string): Promise<void>;
    rememberFix(agentId: AgentId, fix: string): Promise<void>;
    clear(agentId: AgentId): Promise<void>;
    private shortHash;
}
//# sourceMappingURL=index.d.ts.map